"""Gera o DT04 (medidas de referência), seção 23.3 do documento de requisitos.

Uso: python3 gerar_dt04.py [pasta de saída]

Conteúdo: os perfis e as medições dos casos CC15, CC16 e CC17 (seção 13.8), usados no TE11,
e a verificação do CC18 (erro de unidade) com os dados do CC15.

Cálculos da seção 13.6:
- RCE = cintura / altura, exibida com 2 casas.
- %G pela fórmula da Marinha em polegadas (cm / 2,54), log de base 10, exibido com 1 casa.
- Massa gorda = peso x %G / 100. Massa magra = peso - massa gorda. Exibidas com 1 casa.
- Masculino: cintura maior que o pescoço, senão a medição é rejeitada (VE27).
O programa confere os resultados com a seção 13.8 e para com erro se algo divergir.
"""
import csv
import math
import sys
from datetime import date
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter as L

DATA = date(2026, 11, 16)

# Perfil (sexo, altura) e medição (peso, pescoço, cintura, quadril). CC17 usa o perfil do CC15,
# porque a seção 13.8 só define cintura e pescoço para ele.
CASOS = [
    {"caso": "CC15", "sexo": "Masculino", "altura": 178, "peso": 80, "pescoco": 40, "cintura": 87, "quadril": None},
    {"caso": "CC16", "sexo": "Feminino", "altura": 165, "peso": 60, "pescoco": 33, "cintura": 73, "quadril": 99},
    {"caso": "CC17", "sexo": "Masculino", "altura": 178, "peso": 80, "pescoco": 40, "cintura": 40, "quadril": None},
]

# Seção 13.8: resultado esperado
ESPERADO = {
    "CC15": {"resultado": "aceita", "rce": 0.49, "gordura": 16.5, "massa_gorda": 13.2, "massa_magra": 66.8},
    "CC16": {"resultado": "aceita", "rce": 0.44, "gordura": 28.2, "massa_gorda": 16.9, "massa_magra": 43.1},
    "CC17": {"resultado": "rejeitada", "rce": None, "gordura": None, "massa_gorda": None, "massa_magra": None},
}
CC18_ERRADO = 23.0   # CC15 aplicado em centímetros direto na fórmula em polegadas
FAIXAS = [(0.40, "sem rótulo"), (0.50, "sem risco aumentado"), (0.60, "risco aumentado")]


def faixa(rce):
    for limite, nome in FAIXAS:
        if rce < limite:
            return nome
    return "risco ainda maior"


def gordura(sexo, altura, pescoco, cintura, quadril, converter=True):
    k = 2.54 if converter else 1
    if sexo == "Masculino":
        return 86.010 * math.log10((cintura - pescoco) / k) - 70.041 * math.log10(altura / k) + 36.76
    return 163.205 * math.log10((cintura + quadril - pescoco) / k) - 97.684 * math.log10(altura / k) - 78.387


def calcular(c):
    if c["sexo"] == "Masculino":
        aceita = c["cintura"] > c["pescoco"]
    else:
        aceita = c["quadril"] is not None and c["cintura"] + c["quadril"] > c["pescoco"]
    if not aceita:
        return {"resultado": "rejeitada", "rce": None, "faixa": None, "gordura": None,
                "massa_gorda": None, "massa_magra": None}
    rce = round(c["cintura"] / c["altura"], 2)
    g = gordura(c["sexo"], c["altura"], c["pescoco"], c["cintura"], c["quadril"])
    mg = c["peso"] * g / 100
    return {"resultado": "aceita", "rce": rce, "faixa": faixa(rce), "gordura": round(g, 1),
            "massa_gorda": round(mg, 1), "massa_magra": round(c["peso"] - mg, 1)}


def conferir():
    erros = []
    for c in CASOS:
        r, e = calcular(c), ESPERADO[c["caso"]]
        for k, v in e.items():
            if r[k] != v:
                erros.append(f"{c['caso']} {k}: calculado {r[k]}, esperado {v}")
    cc15 = CASOS[0]
    errado = round(gordura(cc15["sexo"], cc15["altura"], cc15["pescoco"], cc15["cintura"], None,
                           converter=False), 1)
    if errado != CC18_ERRADO:
        erros.append(f"CC18: sem conversão deu {errado}, esperado cerca de {CC18_ERRADO}")
    if erros:
        raise SystemExit("Diverge da seção 13.8:\n" + "\n".join(erros))
    return errado


def br(v, casas=None):
    if v is None:
        return ""
    if casas is not None:
        return f"{v:.{casas}f}".replace(".", ",")
    return str(v)


CSV_COLS = ["Caso", "Sexo", "Altura (cm)", "Data", "Peso (kg)", "Pescoço (cm)", "Cintura (cm)",
            "Quadril (cm)", "Resultado esperado", "Relação cintura-estatura", "Faixa da RCE",
            "Gordura (%)", "Massa gorda (kg)", "Massa magra (kg)", "Observação"]
OBS = {
    "CC15": "Perfil masculino completo. O quadril não é pedido na fórmula masculina",
    "CC16": "Perfil feminino completo, com quadril (RB22)",
    "CC17": "Rejeitada porque a cintura não é maior que o pescoço (VE27). Nada é gravado",
}


def gravar_csv(pasta, errado):
    with open(pasta / "DT04_casos_v1.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(CSV_COLS)
        for c in CASOS:
            r = calcular(c)
            w.writerow([c["caso"], c["sexo"], c["altura"], DATA.strftime("%d/%m/%Y"), c["peso"],
                        c["pescoco"], c["cintura"], br(c["quadril"]), r["resultado"], br(r["rce"], 2),
                        r["faixa"] or "", br(r["gordura"], 1), br(r["massa_gorda"], 1),
                        br(r["massa_magra"], 1), OBS[c["caso"]]])
        w.writerow([])
        w.writerow(["CC18", "Com os dados do CC15, aplicar centímetros direto na fórmula em polegadas daria",
                    br(errado, 1) + "%", "O app precisa mostrar 16,5%, nunca esse valor"])


def gravar_xlsx(pasta):
    fonte, negrito = Font(name="Arial", size=10), Font(name="Arial", size=10, bold=True)
    titulo = Font(name="Arial", size=12, bold=True)
    fundo = PatternFill("solid", start_color="F0EFEC")
    verde = PatternFill("solid", start_color="E5F4E4")
    entrada = Font(name="Arial", size=10, color="0000FF")
    wb = Workbook()

    ins = wb.active
    ins.title = "Instruções"
    ins["A1"] = "DT04, medidas de referência"
    linhas = [
        ("Dado de referência", "DT04, medidas de referência (seção 23.3)"),
        ("Usado em", "TE11 (seção 23.5): casos CC15 a CC18 da seção 13.8"),
        ("Como usar no TE11", "Para cada caso, configurar o perfil (sexo e altura), registrar a medição e "
                              "comparar a tela de medidas com as colunas Esperado. Trocar o método principal "
                              "entre relação cintura-estatura e fórmula clássica: os dois valores continuam "
                              "na tela e só o destaque muda (RB25)"),
        ("Um caso por vez", "O app tem um único perfil, então cada caso é testado sozinho"),
        ("CC17", "Usa o perfil do CC15, porque a seção 13.8 só define cintura e pescoço"),
        ("CC18", "Não tem medição própria: confere que os dados do CC15 dão 16,5%, e não 23,0%"),
        ("Aba Casos", "Texto azul = dado de entrada. As colunas Calculado usam as fórmulas da seção 13.6, "
                      "e a coluna Confere compara com os valores copiados da seção 13.8"),
        ("Data das medições", DATA.strftime("%d/%m/%Y")),
    ]
    for i, (a, b) in enumerate([("Campo", "Valor")] + linhas, start=3):
        ins.cell(i, 1, a)
        ins.cell(i, 2, b).alignment = Alignment(wrap_text=True, vertical="top")
    ins.column_dimensions["A"].width = 24
    ins.column_dimensions["B"].width = 100

    ws = wb.create_sheet("Casos")
    ws["A1"] = "Casos CC15 a CC17: entrada, calculado e esperado"
    cab = ["Caso", "Sexo", "Altura (cm)", "Data", "Peso (kg)", "Pescoço (cm)", "Cintura (cm)", "Quadril (cm)",
           "Calculado: medição", "Calculado: RCE", "Calculado: faixa da RCE", "Calculado: %G sem arredondar",
           "Calculado: gordura (%)", "Calculado: massa gorda (kg)", "Calculado: massa magra (kg)",
           "Esperado: medição", "Esperado: RCE", "Esperado: gordura (%)", "Esperado: massa gorda (kg)",
           "Esperado: massa magra (kg)", "Confere"]
    ws.append([])
    ws.append(cab)
    for i, c in enumerate(CASOS, start=4):
        e = ESPERADO[c["caso"]]
        ws.append([c["caso"], c["sexo"], c["altura"], DATA, c["peso"], c["pescoco"], c["cintura"], c["quadril"]])
        aceita = (f'=IF(B{i}="Masculino",IF(G{i}>F{i},"aceita","rejeitada"),'
                  f'IF(AND(H{i}<>"",G{i}+H{i}>F{i}),"aceita","rejeitada"))')
        ws[f"I{i}"] = aceita
        ws[f"J{i}"] = f'=IF(I{i}="aceita",ROUND(G{i}/C{i},2),"")'
        ws[f"K{i}"] = (f'=IF(J{i}="","",IF(J{i}<0.4,"sem rótulo",IF(J{i}<0.5,"sem risco aumentado",'
                       f'IF(J{i}<0.6,"risco aumentado","risco ainda maior"))))')
        ws[f"L{i}"] = (f'=IF(I{i}<>"aceita","",IF(B{i}="Masculino",'
                       f'86.01*LOG10((G{i}-F{i})/2.54)-70.041*LOG10(C{i}/2.54)+36.76,'
                       f'163.205*LOG10((G{i}+H{i}-F{i})/2.54)-97.684*LOG10(C{i}/2.54)-78.387))')
        ws[f"M{i}"] = f'=IF(L{i}="","",ROUND(L{i},1))'
        ws[f"N{i}"] = f'=IF(L{i}="","",ROUND(E{i}*L{i}/100,1))'
        ws[f"O{i}"] = f'=IF(L{i}="","",ROUND(E{i}-E{i}*L{i}/100,1))'
        for col, k in zip("PQRST", ["resultado", "rce", "gordura", "massa_gorda", "massa_magra"]):
            ws[f"{col}{i}"] = e[k]
        partes = [f'I{i}=P{i}'] + [f'IF({b}{i}="",{a}{i}="",{a}{i}={b}{i})'
                                    for a, b in zip("JMNO", "QRST")]
        ws[f"U{i}"] = f'=IF(AND({",".join(partes)}),"sim","não")'
        ws[f"U{i}"].fill = verde
        for col in "CEFGH":
            ws[f"{col}{i}"].font = entrada
        ws[f"D{i}"].number_format = "dd/mm/yyyy"
        for col in "JQ":
            ws[f"{col}{i}"].number_format = "0.00"
        for col in "MNORST":
            ws[f"{col}{i}"].number_format = "0.0"
        ws[f"L{i}"].number_format = "0.000"
    fim = 3 + len(CASOS)

    r = fim + 2
    ws.cell(r, 1, "Proteção contra erro de unidade (CC18), com os dados do CC15")
    ws.cell(r + 1, 1, "Sem converter para polegadas")
    ws.cell(r + 1, 2, "=ROUND(86.01*LOG10(G4-F4)-70.041*LOG10(C4)+36.76,1)")
    ws.cell(r + 1, 3, "Esperado (seção 13.8)")
    ws.cell(r + 1, 4, CC18_ERRADO)
    ws.cell(r + 2, 1, "Com conversão (o que o app mostra)")
    ws.cell(r + 2, 2, "=M4")
    ws.cell(r + 2, 3, "Esperado (seção 13.8)")
    ws.cell(r + 2, 4, 16.5)
    ws.cell(r + 3, 1, "Confere")
    ws.cell(r + 3, 2, f'=IF(AND(B{r + 1}=D{r + 1},B{r + 2}=D{r + 2}),"sim","não")')
    ws.cell(r + 3, 2).fill = verde
    for rr in (r + 1, r + 2):
        for cc in (2, 4):
            ws.cell(rr, cc).number_format = "0.0"
    ws.cell(r + 5, 1, "Os valores esperados foram copiados da seção 13.8 do documento de requisitos.")

    for row in ws.iter_rows():
        for c in row:
            if c.font != entrada:
                c.font = fonte
    for c in ws[3]:
        c.font, c.fill = negrito, fundo
        c.alignment = Alignment(wrap_text=True, vertical="top")
    ws["A1"].font = titulo
    ws.cell(r, 1).font = negrito
    ins["A1"].font = titulo
    for c in ins[3]:
        if c.value:
            c.font, c.fill = negrito, fundo
    ws.column_dimensions["A"].width = 34
    for j in range(2, 22):
        ws.column_dimensions[L(j)].width = 13
    ws.column_dimensions["K"].width = 20
    ws.row_dimensions[3].height = 42
    ws.freeze_panes = "B4"
    wb.active = 1
    wb.save(pasta / "DT04_medidas_v1.xlsx")


def main():
    pasta = Path(sys.argv[1] if len(sys.argv) > 1 else "/home/claude/dt01/saida_dt04")
    pasta.mkdir(parents=True, exist_ok=True)
    errado = conferir()
    gravar_csv(pasta, errado)
    gravar_xlsx(pasta)
    for c in CASOS:
        print(c["caso"], calcular(c))
    print("CC18 sem conversão:", errado)
    print("Conferido em Python: CC15 a CC18 coincidem com a seção 13.8")


if __name__ == "__main__":
    main()

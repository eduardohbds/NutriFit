"""Gera o DT03 (semana de referência), seção 23.3 do documento de requisitos.

Uso: python3 gerar_dt03.py [pasta de saída]

Conteúdo fixo, definido pela seção 23.3:
- Segunda: supino reto com 1 série de aquecimento e 5 de trabalho, de RIR 0, 1, 2, 3 e 4.
- Quarta: remada curvada com 4 séries de RIR 0, 1, 2 e 3, e rosca direta com 3 séries de RIR 1, 2 e 3.
Carga e repetições não mudam a contagem e são valores de exemplo. O RIR cai ao longo das séries,
como num treino real; a ordem não muda o resultado.

O XLSX tem a aba Esperado, que recalcula a tabela da seção 23.4 por fórmulas e confere com os
valores do documento. O programa também confere em Python e para com erro se algo divergir.
"""
import csv
import sys
from datetime import date
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter as L

SEGUNDA, QUARTA = date(2026, 11, 16), date(2026, 11, 18)
GRUPOS = ["Peitoral", "Tríceps", "Ombro anterior", "Costas", "Bíceps"]

# Seção 18.4: grupos diretos (D) e indiretos (I)
CATALOGO = {
    "Supino Reto": {"Peitoral": "D", "Tríceps": "I", "Ombro anterior": "I"},
    "Remada Curvada": {"Costas": "D", "Bíceps": "I"},
    "Rosca Direta": {"Bíceps": "D"},
}
PESOS = {"Fracionado": (1, 0.5), "Total": (1, 1), "Direto": (1, 0)}   # RB15: (direto, indireto)
LIMIARES = [3, 2]

# Seção 23.4: resultado esperado (limiar, método) -> valores na ordem de GRUPOS
ESPERADO = {
    (3, "Fracionado"): [4, 2, 2, 4, 5],
    (3, "Total"): [4, 4, 4, 4, 7],
    (3, "Direto"): [4, 0, 0, 4, 3],
    (2, "Fracionado"): [3, 1.5, 1.5, 3, 3.5],
    (2, "Total"): [3, 3, 3, 3, 5],
    (2, "Direto"): [3, 0, 0, 3, 2],
}

# (sessão, data, rotina, exercício, tipo, técnica, carga, repetições, RIR)
SERIES = [
    (1, SEGUNDA, "Segunda", "Supino Reto", "aquecimento", "aquecimento", 40, 12, None),
    (1, SEGUNDA, "Segunda", "Supino Reto", "trabalho", "", 60, 10, 4),
    (1, SEGUNDA, "Segunda", "Supino Reto", "trabalho", "", 60, 10, 3),
    (1, SEGUNDA, "Segunda", "Supino Reto", "trabalho", "", 60, 10, 2),
    (1, SEGUNDA, "Segunda", "Supino Reto", "trabalho", "", 60, 10, 1),
    (1, SEGUNDA, "Segunda", "Supino Reto", "trabalho", "", 60, 9, 0),
    (2, QUARTA, "Quarta", "Remada Curvada", "trabalho", "", 50, 12, 3),
    (2, QUARTA, "Quarta", "Remada Curvada", "trabalho", "", 50, 12, 2),
    (2, QUARTA, "Quarta", "Remada Curvada", "trabalho", "", 50, 11, 1),
    (2, QUARTA, "Quarta", "Remada Curvada", "trabalho", "", 50, 10, 0),
    (2, QUARTA, "Quarta", "Rosca Direta", "trabalho", "", 25, 12, 3),
    (2, QUARTA, "Quarta", "Rosca Direta", "trabalho", "", 25, 11, 2),
    (2, QUARTA, "Quarta", "Rosca Direta", "trabalho", "", 25, 10, 1),
]

# Ficha da semana no formato canônico (seção 11), para importar antes de registrar as sessões
FICHA_COLS = ["Rotina", "Dia", "Ordem", "Grupo", "Exercício", "Séries", "Meta", "Carga",
              "Técnica", "Descanso", "Unilateral", "Observações"]
FICHA = [
    ["Segunda", "Segunda", 1, "", "Supino Reto", 6, "12/10/10/10/10/10", "40/60/60/60/60/60",
     "aquecimento/-/-/-/-/-", "", "Não", "1 série de aquecimento e 5 de trabalho"],
    ["Quarta", "Quarta", 1, "", "Remada Curvada", 4, "12", "50", "", "", "Não", ""],
    ["Quarta", "Quarta", 2, "", "Rosca Direta", 3, "12", "25", "", "", "Não", ""],
]

HIST_COLS = ["Data", "Sessão", "Rotina", "Exercício", "Série", "Tipo", "Técnica", "Carga",
             "Repetições", "Tempo em segundos", "RIR", "Classificação"]


def historico():
    linhas, contador = [], {}
    for sessao, data, rotina, ex, tipo, tec, carga, reps, rir in SERIES:
        contador[(sessao, ex)] = contador.get((sessao, ex), 0) + 1
        classe = "sem classificação" if rir is None else ("válida" if rir <= 3 else "não válida")
        linhas.append([data, sessao, rotina, ex, contador[(sessao, ex)], tipo, tec, carga, reps,
                       None, rir, classe])
    return linhas


def calcular_em_python():
    """Cálculo independente das fórmulas da planilha, para conferir a seção 23.4."""
    res = {}
    for lim in LIMIARES:
        validas = {ex: sum(1 for s in SERIES if s[3] == ex and s[4] == "trabalho"
                           and s[8] is not None and s[8] <= lim) for ex in CATALOGO}
        for metodo, (pd_, pi) in PESOS.items():
            res[(lim, metodo)] = [
                sum(validas[ex] * {"D": pd_, "I": pi}.get(CATALOGO[ex].get(g), 0) for ex in CATALOGO)
                for g in GRUPOS]
    return res


def fmt(v):
    if v is None or v == "":
        return ""
    if isinstance(v, date):
        return v.strftime("%d/%m/%Y")
    if isinstance(v, float):
        return f"{v:g}".replace(".", ",")
    return str(v)


def gravar_csv(pasta):
    def escreve(nome, cab, linhas):
        with open(pasta / nome, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f, delimiter=";")
            w.writerow(cab)
            for l in linhas:
                w.writerow([fmt(v) for v in l])
    escreve("DT03_ficha_v1.csv", FICHA_COLS, FICHA)
    escreve("DT03_historico_v1.csv", HIST_COLS, historico())
    escreve("DT03_esperado_v1.csv", ["Limiar", "Método"] + GRUPOS,
            [[lim, met] + [float(v) if isinstance(v, float) else v for v in vals]
             for (lim, met), vals in ESPERADO.items()])


def gravar_xlsx(pasta):
    fonte, negrito = Font(name="Arial", size=10), Font(name="Arial", size=10, bold=True)
    titulo = Font(name="Arial", size=12, bold=True)
    fundo = PatternFill("solid", start_color="F0EFEC")
    verde = PatternFill("solid", start_color="E5F4E4")
    wb = Workbook()

    ins = wb.active
    ins.title = "Instruções"
    ins["A1"] = "DT03, semana de referência (versão 1 do formato)"
    texto = [
        ("Dado de referência", "DT03, semana de referência (seção 23.3)"),
        ("Usado em", "TE03 e casos CC01 a CC06 (seções 13.8 e 23.5)"),
        ("Semana", "Segunda 16/11/2026 a domingo 22/11/2026"),
        ("Unidade de carga", "kg"),
        ("Como usar no TE03", "Importar a aba Ficha, registrar as séries da aba Histórico nas duas sessões "
                              "e comparar a tela da semana com a aba Esperado, nos 3 métodos e nos limiares 3 e 2"),
        ("Aba Esperado", "Recalcula a tabela da seção 23.4 por fórmulas e confere com os valores do documento"),
        ("Carga e repetições", "Valores de exemplo. Não mudam a contagem de séries válidas"),
        ("Classificação no Histórico", "Pelo limiar padrão 3. Com limiar 2, a série de RIR 3 passa a não válida"),
    ]
    for i, (a, b) in enumerate([("Campo", "Valor")] + texto, start=3):
        ins.cell(i, 1, a)
        ins.cell(i, 2, b).alignment = Alignment(wrap_text=True, vertical="top")
    ins.column_dimensions["A"].width = 28
    ins.column_dimensions["B"].width = 95

    cat = wb.create_sheet("Catálogo")
    cat.append(["Exercício", "Grupos diretos", "Grupos indiretos"])
    for ex, papeis in CATALOGO.items():
        cat.append([ex, ", ".join(g for g, p in papeis.items() if p == "D"),
                    ", ".join(g for g, p in papeis.items() if p == "I") or "nenhum"])
    for col, w in zip("ABC", (20, 22, 26)):
        cat.column_dimensions[col].width = w

    fi = wb.create_sheet("Ficha")
    fi.append(FICHA_COLS)
    for l in FICHA:
        fi.append([v if v != "" else None for v in l])
    for i, w in enumerate([10, 10, 7, 7, 18, 7, 18, 20, 24, 9, 10, 38], start=1):
        fi.column_dimensions[L(i)].width = w

    hi = wb.create_sheet("Histórico")
    hi.append(HIST_COLS)
    for l in historico():
        hi.append(l)
    for row in hi.iter_rows(min_row=2, max_col=1):
        row[0].number_format = "dd/mm/yyyy"
    for i, w in enumerate([12, 8, 10, 16, 7, 12, 12, 7, 11, 17, 6, 18], start=1):
        hi.column_dimensions[L(i)].width = w
    n_hist = hi.max_row

    es = wb.create_sheet("Esperado")
    es["A1"] = "Resultado esperado da semana de referência (seção 23.4)"
    es["A1"].font = titulo
    h = f"'Histórico'!"

    # Bloco 1: séries válidas por exercício e limiar
    es["A3"] = "Séries válidas por exercício"
    es["A4"], es["B4"], es["C4"] = "Exercício", 3, 2
    es["D4"] = "(cabeçalho = limiar de RIR)"
    linhas_ex = {}
    for i, ex in enumerate(CATALOGO, start=5):
        es.cell(i, 1, ex)
        for c in (2, 3):
            col = L(c)
            es.cell(i, c, f'=COUNTIFS({h}$D$2:$D${n_hist},$A{i},{h}$F$2:$F${n_hist},"trabalho",'
                          f'{h}$K$2:$K${n_hist},"<="&{col}$4)')
        linhas_ex[ex] = i
    ex_ini, ex_fim = 5, 4 + len(CATALOGO)

    # Bloco 2: papel de cada grupo (D = direto, I = indireto), da seção 18.4
    r0 = ex_fim + 2
    es.cell(r0, 1, "Papel do grupo em cada exercício (seção 18.4)")
    es.cell(r0 + 1, 1, "Exercício")
    for j, g in enumerate(GRUPOS, start=2):
        es.cell(r0 + 1, j, g)
    for i, ex in enumerate(CATALOGO, start=r0 + 2):
        es.cell(i, 1, ex)
        for j, g in enumerate(GRUPOS, start=2):
            es.cell(i, j, CATALOGO[ex].get(g))
    pap_ini, pap_fim = r0 + 2, r0 + 1 + len(CATALOGO)

    # Bloco 3: pesos por método (RB15)
    r1 = pap_fim + 2
    es.cell(r1, 1, "Peso por método (RB15)")
    es.cell(r1 + 1, 1, "Método"); es.cell(r1 + 1, 2, "Direto"); es.cell(r1 + 1, 3, "Indireto")
    linha_metodo = {}
    for i, (m, (pd_, pi)) in enumerate(PESOS.items(), start=r1 + 2):
        es.cell(i, 1, m); es.cell(i, 2, pd_); es.cell(i, 3, pi)
        linha_metodo[m] = i

    # Bloco 4: cálculo e conferência com a seção 23.4
    r2 = r1 + 2 + len(PESOS) + 1
    es.cell(r2, 1, "Séries válidas por grupo: calculado e esperado")
    cab = ["Limiar", "Método"] + [f"{g} (calculado)" for g in GRUPOS] + \
          [f"{g} (seção 23.4)" for g in GRUPOS] + ["Confere"]
    for j, t in enumerate(cab, start=1):
        es.cell(r2 + 1, j, t)
    for i, ((lim, met), vals) in enumerate(ESPERADO.items(), start=r2 + 2):
        es.cell(i, 1, lim); es.cell(i, 2, met)
        col_validas = "B" if lim == 3 else "C"
        lm = linha_metodo[met]
        for j, g in enumerate(GRUPOS):
            pc = L(2 + j)
            es.cell(i, 3 + j,
                    f"=SUMPRODUCT(${col_validas}${ex_ini}:${col_validas}${ex_fim},"
                    f"(${pc}${pap_ini}:${pc}${pap_fim}=\"D\")*$B${lm}+(${pc}${pap_ini}:${pc}${pap_fim}=\"I\")*$C${lm})")
            es.cell(i, 3 + len(GRUPOS) + j, vals[j])
        calc = f"{L(3)}{i}:{L(2 + len(GRUPOS))}{i}"
        espe = f"{L(3 + len(GRUPOS))}{i}:{L(2 + 2 * len(GRUPOS))}{i}"
        es.cell(i, 3 + 2 * len(GRUPOS), f'=IF(SUMPRODUCT(--({calc}={espe}))={len(GRUPOS)},"sim","não")')
    r_fim = r2 + 1 + len(ESPERADO)
    es.cell(r_fim + 2, 1, "Os valores da seção 23.4 foram copiados do documento de requisitos. "
                          "A coluna Confere compara cada linha com o cálculo.")

    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for c in row:
                if c.font != titulo:
                    c.font = fonte
    for ws, linhas_cab in ((ins, [3]), (cat, [1]), (fi, [1]), (hi, [1]),
                           (es, [4, r0 + 1, r1 + 1, r2 + 1])):
        for r in linhas_cab:
            for c in ws[r]:
                if c.value is not None:
                    c.font, c.fill = negrito, fundo
    for c in (es["A3"], es.cell(r0, 1), es.cell(r1, 1), es.cell(r2, 1)):
        c.font = negrito
    for i in range(r2 + 2, r_fim + 1):
        es.cell(i, 3 + 2 * len(GRUPOS)).fill = verde
    ins["A1"].font = titulo
    es.column_dimensions["A"].width = 30
    for j in range(2, 4 + 2 * len(GRUPOS)):
        es.column_dimensions[L(j)].width = 14
    wb.active = 4
    wb.save(pasta / "DT03_semana_referencia_v1.xlsx")


def main():
    pasta = Path(sys.argv[1] if len(sys.argv) > 1 else "/home/claude/dt01/saida_dt03")
    pasta.mkdir(parents=True, exist_ok=True)
    calculado = calcular_em_python()
    divergencias = [k for k in ESPERADO if calculado[k] != ESPERADO[k]]
    if divergencias:
        raise SystemExit(f"Diverge da seção 23.4: {divergencias}")
    gravar_csv(pasta)
    gravar_xlsx(pasta)
    print("Conferido em Python: os 6 casos coincidem com a seção 23.4")
    print(len(SERIES), "séries gravadas em", pasta)


if __name__ == "__main__":
    main()

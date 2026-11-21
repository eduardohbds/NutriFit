"""Gera o DT02 (histórico de dois anos) a partir do DT01, seção 23.3 do documento de requisitos.

Uso: python3 gerar_dt02.py [caminho do DT01_ficha_v1.csv] [pasta de saída]

O resultado é sempre o mesmo, porque a semente é fixa. O formato é o da parte Histórico
da exportação (seção 11.5), com classificação pelo limiar padrão de série válida (RIR <= 3).

Modelo de geração (proposta, ajustável nas constantes abaixo):
- Período: 104 semanas, de segunda 18/11/2024 a domingo 15/11/2026.
- Frequência: cada dia da ficha é treinado com uma chance própria (segunda mais, sexta menos).
- Pausas: 2 semanas no fim de cada ano e 1 semana em julho, sem treino.
- Semana leve a cada 10 semanas: carga 15% menor e RIR mais alto.
- Sessão parcial: em 8% das sessões, 1 ou 2 exercícios ficam sem série (pulados).
- Carga: progride de uma carga inicial a uma final ao longo dos 2 anos, arredondada ao passo do
  equipamento. Exercícios com peso corporal ficam sem carga.
- RIR: maior nas primeiras séries e menor nas últimas. Meta "falha" sempre tem RIR 0 (RB09).
- Séries por tempo e cardio ficam sem RIR e sem classificação (RB11).
"""
import csv
import math
import random
import sys
from datetime import date, timedelta
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill

SEMENTE = 2026
INICIO = date(2024, 11, 18)          # segunda-feira
SEMANAS = 104
LIMIAR_VALIDA = 3                     # RB12, padrão do app

DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]
CHANCE_DIA = {"Segunda": 0.78, "Terça": 0.71, "Quarta": 0.65, "Quinta": 0.61, "Sexta": 0.45}
SEMANAS_PAUSA = {date(2024, 12, 23), date(2024, 12, 30), date(2025, 7, 14),
                 date(2025, 12, 22), date(2025, 12, 29), date(2026, 7, 13)}
INTERVALO_SEMANA_LEVE = 10
CHANCE_PARCIAL = 0.08

# Nome na ficha original -> nome no catálogo (o que a importação resolve, seção 11.8 e 18.4)
NOME_CATALOGO = {"Corrida ou Esteira": "Corrida", "Reverse Wrist Curl": "Rosca de Punho Inversa"}

# Carga inicial, carga final e passo, em kg. None = peso corporal (sem carga).
CARGAS = {
    "Supino Reto": (60, 80, 2.5),
    "Supino Inclinado com Halteres": (22, 30, 2),
    "Cross Over": (15, 25, 2.5),
    "Paralelas": None,
    "Tríceps Pulley": (25, 37.5, 2.5),
    "Tríceps Testa com Barra": (25, 35, 2.5),
    "Barra Fixa": None,
    "Remada Curvada": (50, 70, 2.5),
    "Pulldown": (50, 70, 2.5),
    "Remada na Máquina": (45, 65, 2.5),
    "Rosca Direta": (25, 35, 2.5),
    "Rosca Alternada": (12, 18, 2),
    "Desenvolvimento com Barra": (35, 50, 2.5),
    "Elevação Lateral": (8, 12, 1),
    "Elevação Frontal": (10, 15, 2.5),
    "Encolhimento com Halteres": (26, 36, 2),
    "Rosca de Punho": (20, 30, 2.5),
    "Rosca de Punho Inversa": (12.5, 20, 2.5),
    "Agachamento Livre": (70, 100, 2.5),
    "Leg Press": (160, 240, 10),
    "Cadeira Extensora": (40, 60, 5),
    "Cadeira Flexora": (35, 50, 5),
    "Panturrilha em Pé": (60, 90, 5),
    "Lunges (Passadas)": (10, 16, 2),
    "Corrida": None,
    "Prancha": None,
    "Abdominais Crunch": None,
    "Flexões de Braço": None,
    "Elevação de Pernas": None,
    "Elevação Frontal com Halteres": (8, 12, 1),
}

# Repetições até a falha na primeira série: início e fim dos 2 anos
FALHA_REPS = {"Barra Fixa": (6, 11), "Rosca Direta": (10, 12), "Encolhimento com Halteres": (14, 16)}

COLUNAS = ["Data", "Sessão", "Rotina", "Exercício", "Série", "Tipo", "Técnica", "Carga",
           "Repetições", "Tempo em segundos", "RIR", "Classificação"]


def ler_dt01(caminho):
    with open(caminho, encoding="utf-8-sig", newline="") as f:
        linhas = list(csv.DictReader(f, delimiter=";"))
    ficha = {d: [] for d in DIAS}
    for l in linhas:
        ficha[l["Dia"]].append({
            "exercicio": NOME_CATALOGO.get(l["Exercício"], l["Exercício"]),
            "series": int(l["Séries"]),
            "meta": l["Meta"],
            "ordem": int(l["Ordem"]),
        })
    for d in ficha:
        ficha[d].sort(key=lambda e: e["ordem"])
    return linhas, ficha


def progresso(semana):
    """Fração do ganho de carga já alcançado: rápido no começo, mais lento depois."""
    return math.log1p(4 * semana / (SEMANAS - 1)) / math.log1p(4)


def arredonda(valor, passo):
    return round(round(valor / passo) * passo, 2)


def gerar(ficha):
    # Duas sequências aleatórias separadas: a agenda (quais dias têm treino e quais exercícios
    # são pulados) não muda quando o modelo das séries muda, e vice-versa.
    agenda = random.Random(SEMENTE)
    rnd = random.Random(SEMENTE + 1)
    registros, sessao, semana_apos_pausa = [], 0, False
    for s in range(SEMANAS):
        segunda = INICIO + timedelta(weeks=s)
        sorteios = [(agenda.random(), agenda.random(), agenda.choice([1, 2]),
                     agenda.randrange(1, 6), agenda.randrange(1, 5)) for _ in DIAS]
        if segunda in SEMANAS_PAUSA:
            semana_apos_pausa = True
            continue
        leve = s > 0 and s % INTERVALO_SEMANA_LEVE == 0
        fator = 0.85 if leve else (0.95 if semana_apos_pausa else 1.0)
        semana_apos_pausa = False
        for i, dia in enumerate(DIAS):
            vai, parcial, quantos, pula1, pula2 = sorteios[i]
            if vai > CHANCE_DIA[dia]:
                continue
            sessao += 1
            data = segunda + timedelta(days=i)
            exercicios = list(ficha[dia])
            if parcial < CHANCE_PARCIAL:
                for pos in [pula1, pula2][:quantos]:
                    exercicios.pop(min(pos, len(exercicios) - 1))
            for ex in exercicios:
                registros.extend(series_do_exercicio(rnd, ex, s, fator, leve, data, sessao, dia))
    return registros, sessao


def series_do_exercicio(rnd, ex, semana, fator, leve, data, sessao, dia):
    nome, n, meta = ex["exercicio"], ex["series"], ex["meta"]
    carga_cfg = CARGAS[nome]
    carga = None
    if carga_cfg:
        inicio, fim, passo = carga_cfg
        tendencia = inicio + (fim - inicio) * progresso(semana)
        carga = max(passo, arredonda(tendencia * fator * rnd.uniform(0.98, 1.02), passo))
    saida = []
    for k in range(1, n + 1):
        linha = {"Data": data, "Sessão": sessao, "Rotina": dia, "Exercício": nome, "Série": k,
                 "Tipo": "trabalho", "Técnica": "", "Carga": carga, "Repetições": None,
                 "Tempo em segundos": None, "RIR": None, "Classificação": "sem classificação"}
        if meta.endswith("min") or meta.endswith("s"):
            alvo = int(meta[:-3]) * 60 if meta.endswith("min") else int(meta[:-1])
            if nome == "Prancha":
                alvo = 45 + 30 * progresso(semana)
            linha["Tempo em segundos"] = max(20, int(round(alvo * rnd.uniform(0.85, 1.1))))
        elif meta == "falha":
            r0, r1 = FALHA_REPS[nome]
            base = r0 + (r1 - r0) * progresso(semana) + (2 if leve else 0)
            linha["Repetições"] = max(1, int(round(base - 1.5 * (k - 1) + rnd.uniform(-1, 1))))
            linha["RIR"] = 0
        else:
            alvo = int(meta)
            media = 2.6 - 1.3 * (k - 1) / max(1, n - 1) + (2 if leve else 0)
            rir = min(5, max(0, int(round(rnd.gauss(media, 1.0)))))
            reps = alvo + rnd.choice([-2, -1, 0, 0, 0, 1]) - (1 if k == n and rir == 0 else 0)
            linha["Repetições"] = max(1, reps)
            linha["RIR"] = rir
        if linha["RIR"] is not None:
            linha["Classificação"] = "válida" if linha["RIR"] <= LIMIAR_VALIDA else "não válida"
        saida.append(linha)
    return saida


def num_br(v):
    if v is None:
        return ""
    if isinstance(v, float) and not v.is_integer():
        return f"{v:.2f}".rstrip("0").rstrip(".").replace(".", ",")
    return str(int(v))


def gravar_csv(registros, pasta, resumo):
    with open(pasta / "DT02_historico_v1.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(COLUNAS)
        for r in registros:
            w.writerow([r["Data"].strftime("%d/%m/%Y"), r["Sessão"], r["Rotina"], r["Exercício"],
                        r["Série"], r["Tipo"], r["Técnica"], num_br(r["Carga"]),
                        num_br(r["Repetições"]), num_br(r["Tempo em segundos"]),
                        num_br(r["RIR"]), r["Classificação"]])
    with open(pasta / "DT02_instrucoes_v1.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Campo", "Valor"])
        w.writerows(instrucoes())
        w.writerow([])
        w.writerow(["Resumo", "Valor"])
        w.writerows(resumo)


def instrucoes():
    return [
        ("Formato", "Parte Histórico da exportação, seção 11.5 do documento de requisitos"),
        ("Versão do formato", "1"),
        ("Unidade de carga", "kg"),
        ("Dado de referência", "DT02, histórico de dois anos (seção 23.3)"),
        ("Origem", "Gerado por programa (gerar_dt02.py, semente fixa) a partir da ficha DT01"),
        ("Usado em", "RNF01 a RNF03 e RNF06 (seção 23.8)"),
        ("Classificação", f"Pelo limiar padrão de série válida: RIR menor ou igual a {LIMIAR_VALIDA} (RB12)"),
        ("Carga vazia", "Exercício com peso corporal"),
        ("Tempo em segundos", "Preenchido só em séries por tempo e cardio, que não têm RIR (RB11)"),
        ("Nomes", "Corrida e Rosca de Punho Inversa são os nomes do catálogo para "
                  "Corrida ou Esteira e Reverse Wrist Curl da ficha original"),
    ]


def gravar_xlsx(registros, linhas_dt01, pasta):
    fonte = Font(name="Arial", size=10)
    negrito = Font(name="Arial", size=10, bold=True)
    titulo = Font(name="Arial", size=12, bold=True)
    fundo = PatternFill("solid", start_color="F0EFEC")
    topo = Alignment(vertical="top", wrap_text=True)
    wb = Workbook()

    ins = wb.active
    ins.title = "Instruções"
    ins["A1"] = "DT02, histórico de dois anos (versão 1 do formato)"
    ins["A1"].font = titulo
    r = 3
    for campo, valor in [("Campo", "Valor")] + instrucoes():
        ins.cell(r, 1, campo).font = fonte
        ins.cell(r, 2, valor).font = fonte
        ins.cell(r, 2).alignment = topo
        r += 1
    for c in (ins.cell(3, 1), ins.cell(3, 2)):
        c.font, c.fill = negrito, fundo
    r += 1
    ins.cell(r, 1, "Resumo (calculado da aba Histórico)").font = negrito
    ins.cell(r, 1).fill = fundo
    ins.cell(r, 2, "Valor").font = negrito
    ins.cell(r, 2).fill = fundo
    h = "'Histórico'!"
    formulas = [
        ("Linhas do histórico", f"=COUNTA({h}A:A)-1", "0"),
        ("Sessões", f"=MAX({h}B:B)", "0"),
        ("Primeira data", f"=MIN({h}A:A)", "dd/mm/yyyy"),
        ("Última data", f"=MAX({h}A:A)", "dd/mm/yyyy"),
        ("Séries de trabalho", f'=COUNTIF({h}F:F,"trabalho")', "#,##0"),
        ("Séries com RIR", f"=COUNT({h}K:K)", "#,##0"),
        ("Válidas", f'=COUNTIF({h}L:L,"válida")', "#,##0"),
        ("Não válidas", f'=COUNTIF({h}L:L,"não válida")', "#,##0"),
        ("Sem classificação", f'=COUNTIF({h}L:L,"sem classificação")', "#,##0"),
    ]
    for rot, f, fmt in formulas:
        r += 1
        ins.cell(r, 1, rot).font = fonte
        c = ins.cell(r, 2, f)
        c.font, c.number_format = fonte, fmt
        c.alignment = Alignment(horizontal="left")
    ins.column_dimensions["A"].width = 36
    ins.column_dimensions["B"].width = 90

    fi = wb.create_sheet("Ficha")
    cols_ficha = list(linhas_dt01[0].keys())
    fi.append(cols_ficha)
    for l in linhas_dt01:
        valores = dict(l)
        valores["Exercício"] = NOME_CATALOGO.get(l["Exercício"], l["Exercício"])
        valores["Observações"] = ""
        fi.append([int(valores[c]) if c in ("Ordem", "Séries") else (valores[c] or None)
                   for c in cols_ficha])

    hi = wb.create_sheet("Histórico")
    hi.append(COLUNAS)
    for reg in registros:
        hi.append([reg[c] if reg[c] != "" else None for c in COLUNAS])
    for row in hi.iter_rows(min_row=2, min_col=1, max_col=1):
        row[0].number_format = "dd/mm/yyyy"
    for row in hi.iter_rows(min_row=2, min_col=8, max_col=8):
        row[0].number_format = "0.0#"

    for ws, larguras in ((fi, [11, 11, 8, 8, 32, 8, 9, 8, 10, 10, 11, 20]),
                         (hi, [12, 9, 11, 32, 7, 10, 9, 8, 12, 18, 6, 18])):
        for c in ws[1]:
            c.font, c.fill = negrito, fundo
        for row in ws.iter_rows(min_row=2):
            for c in row:
                c.font = fonte
        for i, w in enumerate(larguras):
            ws.column_dimensions[chr(65 + i)].width = w
        ws.freeze_panes = "A2"
        ws.auto_filter.ref = ws.dimensions
    wb.active = 2
    wb.save(pasta / "DT02_historico_v1.xlsx")


def main():
    dt01 = Path(sys.argv[1] if len(sys.argv) > 1 else "/home/claude/dt01/saida/DT01_ficha_v1.csv")
    pasta = Path(sys.argv[2] if len(sys.argv) > 2 else "/home/claude/dt01/saida_dt02")
    pasta.mkdir(parents=True, exist_ok=True)
    linhas_dt01, ficha = ler_dt01(dt01)
    registros, sessoes = gerar(ficha)
    trabalho = sum(1 for r in registros if r["Tipo"] == "trabalho")
    com_rir = [r for r in registros if r["RIR"] is not None]
    resumo = [
        ("Linhas do histórico", len(registros)),
        ("Sessões", sessoes),
        ("Primeira data", registros[0]["Data"].strftime("%d/%m/%Y")),
        ("Última data", registros[-1]["Data"].strftime("%d/%m/%Y")),
        ("Séries de trabalho", trabalho),
        ("Séries com RIR", len(com_rir)),
        ("Válidas", sum(r["Classificação"] == "válida" for r in registros)),
        ("Não válidas", sum(r["Classificação"] == "não válida" for r in registros)),
        ("Sem classificação", sum(r["Classificação"] == "sem classificação" for r in registros)),
    ]
    gravar_csv(registros, pasta, resumo)
    gravar_xlsx(registros, linhas_dt01, pasta)
    for k, v in resumo:
        print(f"{k}: {v}")


if __name__ == "__main__":
    main()

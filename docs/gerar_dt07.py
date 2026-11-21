"""Gera o DT07 (aparelhos de teste), seção 23.3 do documento de requisitos.

Uso: python3 gerar_dt07.py [pasta de saída]

O DT07 não é um arquivo de dados: são os dois aparelhos Android. Esta planilha serve para
registrar os aparelhos, conferir os requisitos RNF28 e RNF29 e dividir os testes entre eles.
As datas de lançamento do Android vêm de endoflife.date e bayton.org (consulta em 21/11/2026).
"""
import sys
from datetime import date
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

VERSOES = [  # versão, nome, nível de API, lançamento
    ("11", "Red Velvet Cake", 30, date(2020, 9, 8)),
    ("12", "Snow Cone", 31, date(2021, 10, 4)),
    ("12L", "Snow Cone v2", 32, date(2022, 3, 7)),
    ("13", "Tiramisu", 33, date(2022, 8, 15)),
    ("14", "Upside Down Cake", 34, date(2023, 10, 4)),
    ("15", "Vanilla Ice Cream", 35, date(2024, 9, 3)),
    ("16", "Baklava", 36, date(2025, 6, 10)),
    ("17", "Cinnamon Bun", 37, date(2026, 6, 16)),
]

TESTES = [  # teste, aparelho, preparo, apaga dados, observação
    ("RNF01 a RNF03, RNF06 e RNF07: desempenho com 2 anos de histórico", "1",
     "DT02 carregado por programa de teste na instalação de teste", "não",
     "A importação não lê histórico (seção 11.1)"),
    ("TE01: registro sem internet", "1", "Modo avião", "não", "Cronometrar cada série"),
    ("TE02: 20 interrupções forçadas", "1", "Instalação de teste", "não", "Fechar à força depois de 5 séries"),
    ("TE03: semana de referência", "1", "DT03 na instalação de teste", "não", ""),
    ("TE04 e CR13: importar a imagem da ficha", "1", "Câmera ou imagem do DT01, aceite da IA", "não", ""),
    ("TE05 e TE06: ida e volta e ficha visual", "1", "DT01 na instalação de teste", "não", "Abrir o CSV no Excel em português"),
    ("TE07, TE08 e CR01 a CR14: IA", "1", "DT01 e DT03 na instalação de teste, data do aparelho em 22/11/2026", "não",
     "Ver o DT06"),
    ("TE10: primeiro uso", "1", "Instalação de teste sem dados", "não", "Fazer antes dos demais testes da instalação"),
    ("TE11: medidas", "1", "Um caso do DT04 por vez", "não", ""),
    ("RNF15 a RNF19 e UX01 a UX12: telas e execução", "1",
     "Uma sessão real de treino quando a tela de execução mudar (seção 23.2)", "não",
     "Na instalação de uso, com treino real, e não com dados de teste"),
    ("RNF24 a RNF27: acessibilidade", "1", "Fonte do sistema no máximo, leitor de tela do sistema e os dois temas", "não", ""),
    ("SEG12 e EA18: bloqueio do app", "1", "Biometria ou PIN configurado no aparelho", "não", ""),
    ("TE09: troca de aparelho", "2", "Backup feito no aparelho 1. App sem dados no aparelho 2, com a mesma "
     "identificação no serviço de backup", "não", "Comparar os totais com os da cópia (RNF10)"),
    ("CE60 e EA20: reinstalação com backup", "2", "App reinstalado sem dados", "não", ""),
    ("TE12: apagar todos os dados", "2", "Com e sem internet", "sim", "Nunca no aparelho de uso diário"),
    ("RNF28 e RNF29: outra tela e outra versão", "2", "Rodar TE01 a TE12 de novo", "não",
     "Vale se o aparelho 2 tiver tela e versão do Android diferentes das do aparelho 1"),
]


def main():
    pasta = Path(sys.argv[1] if len(sys.argv) > 1 else "/home/claude/dt01/saida_dt07")
    pasta.mkdir(parents=True, exist_ok=True)
    fonte, negrito = Font(name="Arial", size=10), Font(name="Arial", size=10, bold=True)
    titulo = Font(name="Arial", size=12, bold=True)
    azul = Font(name="Arial", size=10, color="0000FF")
    fundo = PatternFill("solid", start_color="F0EFEC")
    amarelo = PatternFill("solid", start_color="F9EEDA")
    quebra = Alignment(wrap_text=True, vertical="top")
    wb = Workbook()

    ins = wb.active
    ins.title = "Instruções"
    ins["A1"] = "DT07, aparelhos de teste (seção 23.3)"
    notas = [
        ("O que é", "Os dois aparelhos Android dos testes: o de uso diário e um segundo, para a restauração (TE09). "
                    "Usados nos níveis N3 e N4 (seção 23.2)"),
        ("Como preencher", "Na aba Aparelhos, preencha as células em amarelo, com texto azul. As colunas de conferência "
                           "são calculadas"),
        ("Dados de teste", "Os dados de referência (DT02 a DT06) nunca entram na instalação do app que guarda o seu "
                           "treino real. Eles vão para uma instalação de teste separada, cuja forma fica para o "
                           "documento de arquitetura (seção 28)"),
        ("Aparelho 2", "Recebe os testes que apagam ou substituem dados: restauração, reinstalação e apagar tudo"),
        ("Cobertura do RNF28 e do RNF29", "A seção 23.8 pede o conjunto TE em uma tela pequena e em uma grande, e em "
                                         "versões diferentes do Android. Escolha um aparelho 2 que difira do 1 nos dois"),
        ("Últimos 5 anos", "A conferência do RNF28 conta a partir da data de hoje, então o resultado muda com o tempo. "
                           "O piso exato da versão fica para a arquitetura (RNF28)"),
        ("Fonte das datas", "endoflife.date/android e bayton.org/android/android-versions, consultados em 21/11/2026"),
    ]
    for i, (a, b) in enumerate([("Campo", "Valor")] + notas, start=3):
        ins.cell(i, 1, a); ins.cell(i, 2, b).alignment = quebra
    for c in ins[3]:
        c.font, c.fill = negrito, fundo
    ins.column_dimensions["A"].width = 28
    ins.column_dimensions["B"].width = 105

    ve = wb.create_sheet("Versões do Android")
    ve.append(["Versão", "Nome", "Nível de API", "Lançamento", "Lançada nos últimos 5 anos (hoje)"])
    for i, (v, n, api, d) in enumerate(VERSOES, start=2):
        ve.append([v, n, api, d, f'=IF(D{i}>=EDATE(TODAY(),-60),"sim","não")'])
        ve.cell(i, 4).number_format = "dd/mm/yyyy"
    fim_v = 1 + len(VERSOES)
    ve.cell(fim_v + 2, 1, "Fonte: endoflife.date/android e bayton.org/android/android-versions (consulta em 21/11/2026)")
    for c in ve[1]:
        c.font, c.fill = negrito, fundo
    for col, w in zip("ABCDE", (10, 20, 12, 14, 30)):
        ve.column_dimensions[col].width = w

    ap = wb.create_sheet("Aparelhos")
    ap.append(["Campo", "Aparelho 1 (uso diário)", "Aparelho 2 (restauração)", "Exemplo", "Como ver no celular", "Requisito"])
    campos = [
        ("Marca e modelo", "entrada", "Galaxy A54", "Configurações, Sobre o telefone", ""),
        ("Versão do Android", "versao", "15", "Configurações, Sobre o telefone. O caminho muda conforme a marca", "RNF28"),
        ("Lançamento da versão", "formula_lanc", "", "Calculado pela aba Versões do Android", ""),
        ("Versão lançada nos últimos 5 anos", "formula_5anos", "", "Calculado", "RNF28"),
        ("Tamanho da tela (polegadas)", "entrada", "6,4", "Ficha técnica do modelo", "RNF29"),
        ("Tela de 5 a 7 polegadas", "formula_tela", "", "Calculado", "RNF29"),
        ("Espaço livre (GB)", "entrada", "40", "Configurações, Armazenamento", "CE61"),
        ("Biometria ou PIN configurado", "simnao", "sim", "Configurações, Segurança", "SEG12"),
        ("Câmera funcionando", "simnao", "sim", "Abrir a câmera", "INT05, CR13"),
        ("Leitor de tela do sistema testado", "simnao", "sim", "Configurações, Acessibilidade", "RNF25"),
        ("Fonte do sistema no máximo testada", "simnao", "sim", "Configurações, Tela ou Acessibilidade", "RNF24"),
        ("Temas claro e escuro testados", "simnao", "sim", "Configurações, Tela", "RNF27"),
        ("Identificação no serviço de backup", "entrada", "a definir", "Definida na arquitetura (AR02)", "RF17, RF18"),
    ]
    dv_v = DataValidation(type="list", formula1=f"='Versões do Android'!$A$2:$A${fim_v}", allow_blank=True)
    dv_s = DataValidation(type="list", formula1='"sim,não"', allow_blank=True)
    ap.add_data_validation(dv_v); ap.add_data_validation(dv_s)
    linha = {}
    for i, (nome, tipo, ex, como, req) in enumerate(campos, start=2):
        ap.cell(i, 1, nome); ap.cell(i, 4, ex); ap.cell(i, 5, como); ap.cell(i, 6, req)
        linha[nome] = i
        for col in ("B", "C"):
            cel = ap[f"{col}{i}"]
            if tipo in ("entrada", "versao", "simnao"):
                cel.fill, cel.font = amarelo, azul
                if tipo == "versao":
                    dv_v.add(cel.coordinate)
                if tipo == "simnao":
                    dv_s.add(cel.coordinate)
    rv, rl, rt = linha["Versão do Android"], linha["Lançamento da versão"], linha["Tamanho da tela (polegadas)"]
    tabela_v, tabela_d = f"'Versões do Android'!$A$2:$A${fim_v}", f"'Versões do Android'!$D$2:$D${fim_v}"
    for col in ("B", "C"):
        ap[f"{col}{rl}"] = f'=IF({col}{rv}="","",IFERROR(INDEX({tabela_d},MATCH({col}{rv}&"",{tabela_v},0)),"versão fora da tabela"))'
        ap[f"{col}{rl}"].number_format = "dd/mm/yyyy"
        ap[f"{col}{rl + 1}"] = f'=IF({col}{rl}="","",IF(ISNUMBER({col}{rl}),IF({col}{rl}>=EDATE(TODAY(),-60),"sim","não"),"não"))'
        ap[f"{col}{rt + 1}"] = f'=IF({col}{rt}="","",IF(AND({col}{rt}>=5,{col}{rt}<=7),"sim","não"))'
    r = 2 + len(campos) + 1
    ap.cell(r, 1, "Cobertura dos dois aparelhos (seção 23.8)").font = negrito
    ap.cell(r + 1, 1, "Versões do Android diferentes")
    ap.cell(r + 1, 2, f'=IF(OR(B{rv}="",C{rv}=""),"",IF(B{rv}&""<>C{rv}&"","sim","não"))')
    ap.cell(r + 2, 1, "Telas com pelo menos 0,5 polegada de diferença")
    ap.cell(r + 2, 2, f'=IF(OR(B{rt}="",C{rt}=""),"",IF(ABS(B{rt}-C{rt})>=0.5,"sim","não"))')
    ap.cell(r + 2, 5, "Proposta: o documento pede uma tela pequena e uma grande, sem dizer a diferença mínima")
    ap.cell(r + 3, 1, "Os dois aparelhos atendem RNF28 e RNF29")
    ap.cell(r + 3, 2, f'=IF(COUNTIF(B{rl + 1}:C{rl + 1},"sim")+COUNTIF(B{rt + 1}:C{rt + 1},"sim")=4,"sim",'
                      f'IF(COUNTBLANK(B{rv}:C{rv})+COUNTBLANK(B{rt}:C{rt})>0,"","não"))')
    for c in ap[1]:
        c.font, c.fill = negrito, fundo
    for col, w in zip("ABCDEF", (38, 24, 24, 14, 52, 12)):
        ap.column_dimensions[col].width = w
    ap.freeze_panes = "B2"

    te = wb.create_sheet("Testes por aparelho")
    te.append(["Teste", "Aparelho", "Preparo", "Apaga ou substitui dados", "Observação", "Feito"])
    dv_f = DataValidation(type="list", formula1='"sim,não"', allow_blank=True)
    te.add_data_validation(dv_f)
    for i, t in enumerate(TESTES, start=2):
        te.append(list(t))
        te.cell(i, 6).fill = amarelo
        dv_f.add(f"F{i}")
    fim_t = 1 + len(TESTES)
    te.cell(fim_t + 2, 1, "Testes feitos")
    te.cell(fim_t + 2, 2, f'=COUNTIF(F2:F{fim_t},"sim")&" de "&COUNTA(A2:A{fim_t})')
    for c in te[1]:
        c.font, c.fill = negrito, fundo
    for col, w in zip("ABCDEF", (52, 10, 50, 14, 48, 8)):
        te.column_dimensions[col].width = w
    te.freeze_panes = "A2"

    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for cell in row:
                if cell.font.bold:
                    continue
                entrada = ws.title == "Aparelhos" and str(cell.fill.start_color.rgb).endswith("F9EEDA")
                cell.font = azul if entrada else fonte
                if ws.title != "Versões do Android":
                    cell.alignment = quebra
    for ws in (ins,):
        ws["A1"].font = titulo
    wb.active = 2
    wb.save(pasta / "DT07_aparelhos_v1.xlsx")
    print("gravado em", pasta / "DT07_aparelhos_v1.xlsx")


if __name__ == "__main__":
    main()

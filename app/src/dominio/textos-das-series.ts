import type { SeriePlanejada } from './ficha';

// Os mesmos textos da planilha (seção 11.3), no caminho de volta: valor único quando as séries são
// iguais, ou lista por barra com um valor por série.
export interface TextosDasSeries {
  quantidade: number;
  meta: string;
  carga: string | null;
  tecnica: string | null;
  descanso: string | null;
}

// Minutos só a partir de 2 min e em minutos cheios, para a Prancha continuar "60s" e o cardio "30min".
function textoDoTempo(segundos: number): string {
  return segundos >= 120 && segundos % 60 === 0 ? `${segundos / 60}min` : `${segundos}s`;
}

function textoDaMeta({ tipo, minimo, maximo, segundos }: SeriePlanejada['meta']): string {
  if (tipo === 'falha') return 'falha';
  if (tipo === 'faixa') return `${minimo}-${maximo}`;
  if (tipo === 'tempo') return textoDoTempo(segundos ?? 0);
  return String(minimo);
}

const compactar = (valores: string[]): string =>
  valores.every((valor) => valor === valores[0]) ? valores[0] : valores.join('/');

// Nenhuma série com valor: o campo fica nulo. Com valor em só algumas, `vazio` ocupa o lugar das
// outras; só o traço da técnica volta a ser lido pela planilha.
function textoOpcional(valores: (string | null)[], vazio: string): string | null {
  if (valores.every((valor) => valor === null)) return null;
  return compactar(valores.map((valor) => valor ?? vazio));
}

const quilosComVirgula = (gramas: number): string => String(gramas / 1000).replace('.', ',');

export function textosDasSeries(series: SeriePlanejada[]): TextosDasSeries {
  return {
    quantidade: series.length,
    meta: compactar(series.map((s) => textoDaMeta(s.meta))),
    carga: textoOpcional(
      series.map((s) => (s.carga ? quilosComVirgula(s.carga.gramas) : null)),
      '',
    ),
    tecnica: textoOpcional(
      series.map((s) => s.tecnica),
      '-',
    ),
    descanso: textoOpcional(
      series.map((s) => (s.descansoSegundos === null ? null : String(s.descansoSegundos))),
      '',
    ),
  };
}

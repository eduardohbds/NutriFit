import { ErroDeValidacao } from './erro-de-validacao';
import type { TipoDeMeta } from './ficha';

const ESPERADO = 'repetições (10), faixa (8-12), falha ou tempo (60s, 30min)';
const REPETICOES = /^(\d+)$/;
const FAIXA = /^(\d+)-(\d+)$/;
const TEMPO = /^(\d+)(s|min)$/;

// Meta de uma série (seção 11.2): repetições (10), faixa (8-12), até a falha ou tempo (60s, 30min).
// Texto que não é nenhuma dessas formas não vira meta.
export class MetaDeSerie {
  private constructor(
    readonly tipo: TipoDeMeta,
    readonly minimo: number | null,
    readonly maximo: number | null,
    readonly segundos: number | null,
  ) {}

  static deTexto(texto: string): MetaDeSerie {
    const meta = MetaDeSerie.interpretar(texto.trim().toLowerCase());
    if (!meta) throw new ErroDeValidacao('meta', ESPERADO, texto);
    return meta;
  }

  private static interpretar(texto: string): MetaDeSerie | null {
    if (texto === 'falha') return new MetaDeSerie('falha', null, null, null);
    const repeticoes = REPETICOES.exec(texto);
    if (repeticoes) return MetaDeSerie.repeticoes(Number(repeticoes[1]));
    const faixa = FAIXA.exec(texto);
    if (faixa) return MetaDeSerie.faixa(Number(faixa[1]), Number(faixa[2]));
    const tempo = TEMPO.exec(texto);
    if (tempo) return MetaDeSerie.tempo(Number(tempo[1]), tempo[2] === 'min' ? 60 : 1);
    return null;
  }

  private static repeticoes(quantidade: number): MetaDeSerie | null {
    return quantidade >= 1 ? new MetaDeSerie('repeticoes', quantidade, null, null) : null;
  }

  private static faixa(minimo: number, maximo: number): MetaDeSerie | null {
    return minimo >= 1 && minimo < maximo ? new MetaDeSerie('faixa', minimo, maximo, null) : null;
  }

  private static tempo(quantidade: number, segundosPorUnidade: number): MetaDeSerie | null {
    if (quantidade < 1) return null;
    return new MetaDeSerie('tempo', null, null, quantidade * segundosPorUnidade);
  }
}

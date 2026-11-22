import { Carga } from '../../src/dominio/carga';
import type { SeriePlanejada } from '../../src/dominio/ficha';
import { textosDasSeries } from '../../src/dominio/textos-das-series';
import { GeradorDeIdentificadorSequencial } from '../dubles/gerador-de-identificador-sequencial';

const gerador = new GeradorDeIdentificadorSequencial();

function serie(resto: Partial<Omit<SeriePlanejada, 'id'>> = {}): SeriePlanejada {
  return {
    id: gerador.gerar(),
    meta: { tipo: 'repeticoes', minimo: 10, maximo: null, segundos: null },
    carga: null,
    tecnica: null,
    descansoSegundos: null,
    ...resto,
  };
}

function comMeta(meta: SeriePlanejada['meta']): SeriePlanejada {
  return serie({ meta });
}

describe('textosDasSeries (seção 11.3, o caminho de volta da planilha)', () => {
  it('séries iguais viram um valor único, e campo sem valor vira nulo', () => {
    const series = [serie(), serie(), serie(), serie()];

    expect(textosDasSeries(series)).toEqual({
      quantidade: 4,
      meta: '10',
      carga: null,
      tecnica: null,
      descanso: null,
    });
  });

  it.each([
    [{ tipo: 'repeticoes', minimo: 12, maximo: null, segundos: null }, '12'],
    [{ tipo: 'faixa', minimo: 8, maximo: 12, segundos: null }, '8-12'],
    [{ tipo: 'falha', minimo: null, maximo: null, segundos: null }, 'falha'],
    [{ tipo: 'tempo', minimo: null, maximo: null, segundos: 60 }, '60s'],
    [{ tipo: 'tempo', minimo: null, maximo: null, segundos: 45 }, '45s'],
    [{ tipo: 'tempo', minimo: null, maximo: null, segundos: 1800 }, '30min'],
    [{ tipo: 'tempo', minimo: null, maximo: null, segundos: 120 }, '2min'],
  ] as const)('escreve a meta %j como %s', (meta, texto) => {
    expect(textosDasSeries([comMeta({ ...meta })]).meta).toBe(texto);
  });

  it('metas diferentes viram uma lista por barra, na ordem das séries', () => {
    const series = [
      comMeta({ tipo: 'repeticoes', minimo: 12, maximo: null, segundos: null }),
      comMeta({ tipo: 'repeticoes', minimo: 10, maximo: null, segundos: null }),
      comMeta({ tipo: 'repeticoes', minimo: 8, maximo: null, segundos: null }),
      comMeta({ tipo: 'falha', minimo: null, maximo: null, segundos: null }),
    ];

    expect(textosDasSeries(series).meta).toBe('12/10/8/falha');
  });

  it('a carga sai em quilos, com vírgula, e a lista segue a ordem das séries', () => {
    const uma = [serie({ carga: Carga.deQuilos(60) }), serie({ carga: Carga.deQuilos(60) })];
    const varias = [
      serie({ carga: Carga.deQuilos(60) }),
      serie({ carga: Carga.deQuilos(62.5) }),
      serie({ carga: Carga.deQuilos(65) }),
    ];

    expect(textosDasSeries(uma).carga).toBe('60');
    expect(textosDasSeries(varias).carga).toBe('60/62,5/65');
  });

  it('o descanso sai em segundos, e o zero do bi-set é mantido', () => {
    const igual = [serie({ descansoSegundos: 90 }), serie({ descansoSegundos: 90 })];
    const diferente = [90, 90, 90, 120].map((descansoSegundos) => serie({ descansoSegundos }));
    const zero = [serie({ descansoSegundos: 0 }), serie({ descansoSegundos: 0 })];

    expect(textosDasSeries(igual).descanso).toBe('90');
    expect(textosDasSeries(diferente).descanso).toBe('90/90/90/120');
    expect(textosDasSeries(zero).descanso).toBe('0');
  });

  it('a técnica usa o traço para a série sem técnica, e fica nula quando nenhuma tem', () => {
    const tecnicas = ['aquecimento', null, null, null];
    const comAquecimento = tecnicas.map((tecnica) => serie({ tecnica }));
    const semTecnica = [serie(), serie()];
    const todasIguais = [serie({ tecnica: 'drop-set' }), serie({ tecnica: 'drop-set' })];

    expect(textosDasSeries(comAquecimento).tecnica).toBe('aquecimento/-/-/-');
    expect(textosDasSeries(semTecnica).tecnica).toBeNull();
    expect(textosDasSeries(todasIguais).tecnica).toBe('drop-set');
  });
});

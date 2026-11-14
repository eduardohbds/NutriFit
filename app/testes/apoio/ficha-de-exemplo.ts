import { Carga } from '../../src/dominio/carga';
import type { Ficha, NovaVersaoDaFicha } from '../../src/dominio/ficha';
import type { Identificador } from '../../src/dominio/identificador';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import { GeradorDeIdentificadorSequencial } from '../dubles/gerador-de-identificador-sequencial';

// Monta fichas e versões com identificadores sequenciais, para testes legíveis.
export class FabricaDeFichas {
  private readonly ids = new GeradorDeIdentificadorSequencial();

  constructor(private readonly exercicioId: Identificador) {}

  ficha(): Ficha {
    return {
      id: this.ids.gerar(),
      nome: 'ABC',
      situacao: 'inativa',
      origem: 'manual',
      criadaEm: InstanteUtc.de('2026-11-10T16:45:00.000Z'),
    };
  }

  // Cada versão tem uma rotina com um item e `series` séries, com a carga em kg informada.
  versao(opcoes: {
    series: number;
    cargaEmQuilos: number;
    motivo?: string | null;
  }): NovaVersaoDaFicha {
    const series = Array.from({ length: opcoes.series }, () => ({
      id: this.ids.gerar(),
      meta: { tipo: 'faixa' as const, minimo: 8, maximo: 12, segundos: null },
      carga: Carga.deQuilos(opcoes.cargaEmQuilos),
      tecnica: null,
      descansoSegundos: 90,
    }));
    return {
      id: this.ids.gerar(),
      autor: 'usuario',
      criadaEm: InstanteUtc.de('2026-11-11T10:00:00.000Z'),
      motivo: opcoes.motivo ?? null,
      resumo: null,
      rotinas: [
        {
          id: this.ids.gerar(),
          nome: 'Treino A',
          diaDaSemana: 1,
          itens: [
            {
              id: this.ids.gerar(),
              exercicioId: this.exercicioId,
              grupoSequencia: null,
              unilateral: false,
              travado: false,
              observacoes: null,
              series,
            },
          ],
        },
      ],
    };
  }
}

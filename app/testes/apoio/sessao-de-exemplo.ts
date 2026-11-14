import { Carga } from '../../src/dominio/carga';
import { Identificador } from '../../src/dominio/identificador';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import type { NovaSessao, NovoExercicioDaSessao, SerieExecutada } from '../../src/dominio/sessao';

// Identificadores de sessão numa faixa própria, para não se confundirem com os da ficha.
export class FabricaDeSessoes {
  private proximo = 0x5000;

  constructor(private readonly exercicioId: Identificador) {}

  private id(): Identificador {
    const sufixo = (this.proximo++).toString(16).padStart(12, '0');
    return Identificador.de(`00000000-0000-7000-8000-${sufixo}`);
  }

  sessao(vinculo: {
    fichaId: Identificador;
    versaoId: Identificador;
    rotinaId: Identificador;
  }): NovaSessao {
    return {
      id: this.id(),
      inicio: InstanteUtc.de('2026-11-12T09:00:00.000Z'),
      fim: null,
      ...vinculo,
      situacao: 'em_andamento',
      observacao: null,
    };
  }

  exercicio(): NovoExercicioDaSessao {
    return { id: this.id(), exercicioId: this.exercicioId, itemOrigemId: null, observacoes: null };
  }

  serie(opcoes: { cargaEmQuilos: number; repeticoes: number; rir: number }): SerieExecutada {
    return {
      id: this.id(),
      tipo: 'trabalho',
      carga: Carga.deQuilos(opcoes.cargaEmQuilos),
      repeticoes: opcoes.repeticoes,
      repeticoesOutroLado: null,
      segundos: null,
      segundosOutroLado: null,
      rir: opcoes.rir,
      tecnica: null,
      concluidaEm: InstanteUtc.de('2026-11-12T09:05:00.000Z'),
      removidaEm: null,
    };
  }
}

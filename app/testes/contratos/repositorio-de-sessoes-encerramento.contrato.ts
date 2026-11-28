import type { RepositorioDeSessoes } from '../../src/aplicacao/portas/repositorio-de-sessoes';
import type { Identificador } from '../../src/dominio/identificador';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import { FabricaDeSessoes } from '../apoio/sessao-de-exemplo';

export interface CenarioDoEncerramento {
  sessoes: RepositorioDeSessoes;
  // Exercício que já existe no armazenamento; o SQLite exige o vínculo (seção 18.6).
  exercicioId: Identificador;
}

const FIM = InstanteUtc.de('2026-11-12T10:30:00.000Z');

// Roda contra o falso em memória e contra o adaptador SQLite: os dois precisam passar (RT05).
export function contratoDoEncerramentoDeSessao(nome: string, criar: () => CenarioDoEncerramento) {
  describe(`contrato de encerrarSessao: ${nome}`, () => {
    async function aberta() {
      const { sessoes, exercicioId } = criar();
      const fabrica = new FabricaDeSessoes(exercicioId);
      const nova = (inicio: string) => ({
        ...fabrica.sessao({ fichaId: null, versaoId: null, rotinaId: null }),
        inicio: InstanteUtc.de(inicio),
      });
      const exercicio = fabrica.exercicio();
      const sessao = nova('2026-11-12T09:00:00.000Z');
      await sessoes.iniciarSessaoComExercicios(sessao, [exercicio]);
      const serie = fabrica.serie({ cargaEmQuilos: 40, repeticoes: 10, rir: 2 });
      await sessoes.registrarSerie(exercicio.id, serie);
      return { sessoes, sessao, exercicio, serie, nova, fabrica };
    }

    it.each(['concluida', 'parcial', 'descartada'] as const)(
      'encerra como %s com o fim dado e não toca nos exercícios nem nas séries',
      async (situacao) => {
        const { sessoes, sessao, exercicio, serie } = await aberta();

        await sessoes.encerrarSessao(sessao.id, situacao, FIM);

        const lida = await sessoes.buscarSessao(sessao.id);
        expect(lida?.situacao).toBe(situacao);
        expect(lida?.fim?.iso).toBe(FIM.iso);
        expect(lida?.inicio.iso).toBe(sessao.inicio.iso);
        expect(lida?.exercicios.map((e) => e.id.valor)).toEqual([exercicio.id.valor]);
        expect(lida?.exercicios[0].series.map((s) => s.id.valor)).toEqual([serie.id.valor]);
      },
    );

    it('a sessão encerrada deixa de ser a sessão em andamento', async () => {
      const { sessoes, sessao } = await aberta();

      await sessoes.encerrarSessao(sessao.id, 'concluida', FIM);

      expect(await sessoes.buscarSessaoEmAndamento()).toBeNull();
    });

    it('só encerra a sessão em andamento: uma já encerrada falha e nada muda', async () => {
      const { sessoes, sessao } = await aberta();
      await sessoes.encerrarSessao(sessao.id, 'concluida', FIM);

      const outraVez = sessoes.encerrarSessao(
        sessao.id,
        'descartada',
        InstanteUtc.de('2026-11-12T11:00:00.000Z'),
      );

      await expect(outraVez).rejects.toThrow();
      const lida = await sessoes.buscarSessao(sessao.id);
      expect(lida?.situacao).toBe('concluida');
      expect(lida?.fim?.iso).toBe(FIM.iso);
    });

    it('uma sessão que não existe falha', async () => {
      const { sessoes, fabrica } = await aberta();
      const inexistente = fabrica.sessao({ fichaId: null, versaoId: null, rotinaId: null }).id;

      await expect(sessoes.encerrarSessao(inexistente, 'concluida', FIM)).rejects.toThrow();
    });

    it('o histórico do exercício ignora a sessão descartada e mantém as demais (FI-4)', async () => {
      const { sessoes, sessao, exercicio, nova, fabrica } = await aberta();
      const parcial = nova('2026-11-13T09:00:00.000Z');
      const parcialExercicio = fabrica.exercicio();
      await sessoes.iniciarSessaoComExercicios(parcial, [parcialExercicio]);
      await sessoes.registrarSerie(
        parcialExercicio.id,
        fabrica.serie({ cargaEmQuilos: 50, repeticoes: 8, rir: 1 }),
      );
      await sessoes.encerrarSessao(parcial.id, 'parcial', FIM);
      await sessoes.encerrarSessao(sessao.id, 'descartada', FIM);

      const historico = await sessoes.seriesDosExercicios([exercicio.exercicioId]);

      expect(historico.map((item) => item.sessaoId.valor)).toEqual([parcial.id.valor]);
      expect((await sessoes.buscarSessao(sessao.id))?.exercicios[0].series).toHaveLength(1);
    });
  });
}

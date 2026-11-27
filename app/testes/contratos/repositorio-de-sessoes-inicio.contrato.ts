import type { RepositorioDeFichas } from '../../src/aplicacao/portas/repositorio-de-fichas';
import type { RepositorioDeSessoes } from '../../src/aplicacao/portas/repositorio-de-sessoes';
import type { Identificador } from '../../src/dominio/identificador';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import type { NovaSessao, SituacaoDaSessao } from '../../src/dominio/sessao';
import { FabricaDeFichas } from '../apoio/ficha-de-exemplo';
import { FabricaDeSessoes } from '../apoio/sessao-de-exemplo';

export interface CenarioDoInicioDeSessao {
  fichas: RepositorioDeFichas;
  sessoes: RepositorioDeSessoes;
  // Exercício que já existe no armazenamento; o SQLite exige o vínculo (seção 18.6).
  exercicioId: Identificador;
}

// Roda contra o falso em memória e contra o adaptador SQLite: os dois precisam passar (RT05).
export function contratoDoInicioDeSessao(nome: string, criar: () => CenarioDoInicioDeSessao) {
  describe(`contrato de iniciarSessaoComExercicios e buscarSessaoEmAndamento: ${nome}`, () => {
    async function iniciar() {
      const { fichas, sessoes, exercicioId } = criar();
      const fabricaDeFichas = new FabricaDeFichas(exercicioId);
      const ficha = fabricaDeFichas.ficha();
      const versao = await fichas.criarFicha(
        ficha,
        fabricaDeFichas.versao({ series: 1, cargaEmQuilos: 40 }),
      );
      const item = versao.rotinas[0].itens[0];
      const fabrica = new FabricaDeSessoes(exercicioId);
      const sessao = (situacao: SituacaoDaSessao, inicio = '2026-11-12T09:00:00.000Z') => ({
        ...fabrica.sessao({
          fichaId: ficha.id,
          versaoId: versao.id,
          rotinaId: versao.rotinas[0].id,
        }),
        situacao,
        inicio: InstanteUtc.de(inicio),
      });
      const exercicio = () => ({ ...fabrica.exercicio(), itemOrigemId: item.id });
      return { sessoes, item, sessao, exercicio };
    }

    it('grava a sessão e os exercícios na ordem dada, com o item de origem e sem séries', async () => {
      const { sessoes, item, sessao, exercicio } = await iniciar();
      const nova: NovaSessao = sessao('em_andamento');
      const [primeiro, segundo, terceiro] = [exercicio(), exercicio(), exercicio()];

      await sessoes.iniciarSessaoComExercicios(nova, [primeiro, segundo, terceiro]);

      const lida = await sessoes.buscarSessao(nova.id);
      expect(lida?.situacao).toBe('em_andamento');
      expect(lida?.fichaId?.valor).toBe(nova.fichaId?.valor);
      expect(lida?.versaoId?.valor).toBe(nova.versaoId?.valor);
      expect(lida?.rotinaId?.valor).toBe(nova.rotinaId?.valor);
      expect(lida?.exercicios.map((e) => e.id.valor)).toEqual(
        [primeiro, segundo, terceiro].map((e) => e.id.valor),
      );
      expect(lida?.exercicios[0].itemOrigemId?.valor).toBe(item.id.valor);
      expect(lida?.exercicios.every((e) => e.series.length === 0)).toBe(true);
    });

    it('uma sessão sem exercícios grava só a sessão', async () => {
      const { sessoes, sessao } = await iniciar();
      const nova = sessao('em_andamento');

      await sessoes.iniciarSessaoComExercicios(nova, []);

      expect((await sessoes.buscarSessao(nova.id))?.exercicios).toEqual([]);
    });

    it('com um identificador de exercício repetido tudo falha e nada fica gravado', async () => {
      const { sessoes, sessao, exercicio } = await iniciar();
      const nova = sessao('em_andamento');
      const repetido = exercicio();

      await expect(
        sessoes.iniciarSessaoComExercicios(nova, [repetido, exercicio(), repetido]),
      ).rejects.toThrow();

      expect(await sessoes.buscarSessao(nova.id)).toBeNull();
      expect(await sessoes.buscarSessaoEmAndamento()).toBeNull();
    });

    it('sem nenhuma sessão, buscarSessaoEmAndamento devolve nulo', async () => {
      const { sessoes } = await iniciar();

      expect(await sessoes.buscarSessaoEmAndamento()).toBeNull();
    });

    it('buscarSessaoEmAndamento devolve a sessão com os exercícios', async () => {
      const { sessoes, sessao, exercicio } = await iniciar();
      const nova = sessao('em_andamento');
      const unico = exercicio();
      await sessoes.iniciarSessaoComExercicios(nova, [unico]);

      const emAndamento = await sessoes.buscarSessaoEmAndamento();

      expect(emAndamento?.id.valor).toBe(nova.id.valor);
      expect(emAndamento?.exercicios.map((e) => e.id.valor)).toEqual([unico.id.valor]);
    });

    it.each(['concluida', 'parcial', 'descartada'] as const)(
      'sessão %s não é sessão em andamento',
      async (situacao) => {
        const { sessoes, sessao } = await iniciar();
        await sessoes.iniciarSessao(sessao(situacao));

        expect(await sessoes.buscarSessaoEmAndamento()).toBeNull();
      },
    );

    it('com mais de uma em andamento, devolve a de início mais recente', async () => {
      const { sessoes, sessao } = await iniciar();
      const antiga = sessao('em_andamento', '2026-11-10T09:00:00.000Z');
      const recente = sessao('em_andamento', '2026-11-12T09:00:00.000Z');
      const meio = sessao('em_andamento', '2026-11-11T09:00:00.000Z');
      for (const s of [antiga, recente, meio]) await sessoes.iniciarSessao(s);

      expect((await sessoes.buscarSessaoEmAndamento())?.id.valor).toBe(recente.id.valor);
    });
  });
}

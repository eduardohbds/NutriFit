import type { RepositorioDeSessoes } from '../../src/aplicacao/portas/repositorio-de-sessoes';
import type { Identificador } from '../../src/dominio/identificador';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import { idsDasSeries, registrarSessao, serieDeTrabalho } from '../apoio/historico-de-exemplo';

export interface CenarioDeHistorico {
  sessoes: RepositorioDeSessoes;
  // Dois exercícios que já existem no armazenamento; o SQLite exige o vínculo (seção 18.6).
  exercicios: [Identificador, Identificador];
}

// Roda contra o falso em memória e contra o adaptador SQLite: os dois precisam passar (RT05).
export function contratoDeHistoricoDeSessoes(nome: string, criar: () => CenarioDeHistorico) {
  describe(`contrato de seriesDosExercicios do RepositorioDeSessoes: ${nome}`, () => {
    it('devolve as séries de todas as sessões só dos exercícios pedidos', async () => {
      const { sessoes, exercicios } = criar();
      const [a, b] = exercicios;
      const a1 = serieDeTrabalho(60);
      const a2 = serieDeTrabalho(62.5);
      const b1 = serieDeTrabalho(55);
      await registrarSessao(sessoes, a, '2026-11-10T09:00:00.000Z', [a1]);
      await registrarSessao(sessoes, b, '2026-11-11T09:00:00.000Z', [b1]);
      await registrarSessao(sessoes, a, '2026-11-12T09:00:00.000Z', [a2]);

      const deA = idsDasSeries(await sessoes.seriesDosExercicios([a]));
      const deB = idsDasSeries(await sessoes.seriesDosExercicios([b]));
      expect(deA).toEqual([a1.id.valor, a2.id.valor]);
      expect(deB).toEqual([b1.id.valor]);
      expect(await sessoes.seriesDosExercicios([a, b])).toHaveLength(3);
    });

    it('cada série vem com a sessão e o exercício a que pertence', async () => {
      const { sessoes, exercicios } = criar();
      const [a] = exercicios;
      const a1 = serieDeTrabalho(60);
      const { sessaoId } = await registrarSessao(sessoes, a, '2026-11-10T09:00:00.000Z', [a1]);

      expect(await sessoes.seriesDosExercicios([a])).toEqual([
        { sessaoId, exercicioId: a, serie: a1 },
      ]);
    });

    it('não devolve a série antiga de uma correção, só a corrigida', async () => {
      const { sessoes, exercicios } = criar();
      const [a] = exercicios;
      const original = serieDeTrabalho(60);
      const outra = serieDeTrabalho(62.5);
      const corrigida = serieDeTrabalho(65);
      await registrarSessao(sessoes, a, '2026-11-10T09:00:00.000Z', [original, outra]);

      const em = InstanteUtc.de('2026-11-10T10:00:00.000Z');
      await sessoes.corrigirSerie(original.id, corrigida, em);

      const ids = idsDasSeries(await sessoes.seriesDosExercicios([a]));
      expect(ids).toEqual([corrigida.id.valor, outra.id.valor]);
    });

    it('vem em ordem cronológica das sessões e, dentro de cada uma, na ordem de registro', async () => {
      const { sessoes, exercicios } = criar();
      const [a] = exercicios;
      const tarde = serieDeTrabalho(70);
      const cedo1 = serieDeTrabalho(60);
      const cedo2 = serieDeTrabalho(62.5);
      await registrarSessao(sessoes, a, '2026-11-13T09:00:00.000Z', [tarde]);
      await registrarSessao(sessoes, a, '2026-11-12T09:00:00.000Z', [cedo1, cedo2]);

      const ids = idsDasSeries(await sessoes.seriesDosExercicios([a]));
      expect(ids).toEqual([cedo1.id.valor, cedo2.id.valor, tarde.id.valor]);
    });

    it('devolve lista vazia para nenhum exercício e para exercício sem sessões', async () => {
      const { sessoes, exercicios } = criar();
      const [a, b] = exercicios;
      await registrarSessao(sessoes, a, '2026-11-10T09:00:00.000Z', [serieDeTrabalho(60)]);

      expect(await sessoes.seriesDosExercicios([])).toEqual([]);
      expect(await sessoes.seriesDosExercicios([b])).toEqual([]);
    });
  });
}

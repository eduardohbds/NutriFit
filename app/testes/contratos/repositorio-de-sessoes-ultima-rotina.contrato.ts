import type { RepositorioDeFichas } from '../../src/aplicacao/portas/repositorio-de-fichas';
import type { RepositorioDeSessoes } from '../../src/aplicacao/portas/repositorio-de-sessoes';
import type { Ficha, VersaoDaFicha } from '../../src/dominio/ficha';
import type { Identificador } from '../../src/dominio/identificador';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import type { NovaSessao, SituacaoDaSessao } from '../../src/dominio/sessao';
import { FabricaDeFichas } from '../apoio/ficha-de-exemplo';
import { FabricaDeSessoes } from '../apoio/sessao-de-exemplo';

export interface CenarioDaUltimaRotina {
  fichas: RepositorioDeFichas;
  sessoes: RepositorioDeSessoes;
  // Exercício que já existe no armazenamento; o SQLite exige o vínculo (seção 18.6).
  exercicioId: Identificador;
}

// Roda contra o falso em memória e contra o adaptador SQLite: os dois precisam passar (RT05).
export function contratoDaUltimaRotinaConcluida(nome: string, criar: () => CenarioDaUltimaRotina) {
  describe(`contrato de ultimaRotinaConcluida do RepositorioDeSessoes: ${nome}`, () => {
    async function iniciar() {
      const { fichas, sessoes, exercicioId } = criar();
      const fabricaDeFichas = new FabricaDeFichas(exercicioId);
      const ficha = fabricaDeFichas.ficha();
      const v1 = await fichas.criarFicha(
        ficha,
        fabricaDeFichas.versao({ series: 1, cargaEmQuilos: 40 }),
      );
      const v2 = await fichas.salvarNovaVersao(
        ficha.id,
        fabricaDeFichas.versao({ series: 2, cargaEmQuilos: 40 }),
      );
      const fabrica = new FabricaDeSessoes(exercicioId);
      const sessao = (
        de: Ficha,
        versao: VersaoDaFicha,
        situacao: SituacaoDaSessao,
        fim: string | null,
        comRotina = true,
      ): NovaSessao => ({
        ...fabrica.sessao({
          fichaId: de.id,
          versaoId: versao.id,
          rotinaId: comRotina ? versao.rotinas[0].id : null,
        }),
        situacao,
        fim: fim === null ? null : InstanteUtc.de(fim),
      });
      return { fichas, sessoes, fabricaDeFichas, fichas2: { ficha, v1, v2 }, sessao };
    }

    it('sem nenhuma sessão devolve nulo', async () => {
      const { sessoes, fichas2 } = await iniciar();

      expect(await sessoes.ultimaRotinaConcluida(fichas2.ficha.id)).toBeNull();
    });

    it('devolve a rotina da sessão concluída', async () => {
      const { sessoes, fichas2, sessao } = await iniciar();
      await sessoes.iniciarSessao(
        sessao(fichas2.ficha, fichas2.v1, 'concluida', '2026-11-10T10:00:00.000Z'),
      );

      const rotina = await sessoes.ultimaRotinaConcluida(fichas2.ficha.id);

      expect(rotina).toEqual(fichas2.v1.rotinas[0].id);
    });

    it('com várias concluídas devolve a de maior fim, e não a gravada por último', async () => {
      const { sessoes, fichas2, sessao } = await iniciar();
      await sessoes.iniciarSessao(
        sessao(fichas2.ficha, fichas2.v2, 'concluida', '2026-11-12T10:00:00.000Z'),
      );
      await sessoes.iniciarSessao(
        sessao(fichas2.ficha, fichas2.v1, 'concluida', '2026-11-10T10:00:00.000Z'),
      );

      const rotina = await sessoes.ultimaRotinaConcluida(fichas2.ficha.id);

      expect(rotina).toEqual(fichas2.v2.rotinas[0].id);
    });

    it('em empate de fim, vale a sessão gravada depois', async () => {
      const { sessoes, fichas2, sessao } = await iniciar();
      const fim = '2026-11-10T10:00:00.000Z';
      await sessoes.iniciarSessao(sessao(fichas2.ficha, fichas2.v1, 'concluida', fim));
      await sessoes.iniciarSessao(sessao(fichas2.ficha, fichas2.v2, 'concluida', fim));

      const rotina = await sessoes.ultimaRotinaConcluida(fichas2.ficha.id);

      expect(rotina).toEqual(fichas2.v2.rotinas[0].id);
    });

    it.each(['em_andamento', 'parcial', 'descartada'] as const)(
      'sessão %s não conta, mesmo mais recente que a concluída',
      async (situacao) => {
        const { sessoes, fichas2, sessao } = await iniciar();
        await sessoes.iniciarSessao(
          sessao(fichas2.ficha, fichas2.v1, 'concluida', '2026-11-10T10:00:00.000Z'),
        );
        await sessoes.iniciarSessao(
          sessao(fichas2.ficha, fichas2.v2, situacao, '2026-11-12T10:00:00.000Z'),
        );

        const rotina = await sessoes.ultimaRotinaConcluida(fichas2.ficha.id);

        expect(rotina).toEqual(fichas2.v1.rotinas[0].id);
      },
    );

    it('sessão concluída sem rotina não conta', async () => {
      const { sessoes, fichas2, sessao } = await iniciar();
      await sessoes.iniciarSessao(
        sessao(fichas2.ficha, fichas2.v1, 'concluida', '2026-11-10T10:00:00.000Z'),
      );
      await sessoes.iniciarSessao(
        sessao(fichas2.ficha, fichas2.v2, 'concluida', '2026-11-12T10:00:00.000Z', false),
      );

      const rotina = await sessoes.ultimaRotinaConcluida(fichas2.ficha.id);

      expect(rotina).toEqual(fichas2.v1.rotinas[0].id);
    });

    it('só conta as sessões da ficha pedida', async () => {
      const { fichas, sessoes, fabricaDeFichas, fichas2, sessao } = await iniciar();
      const outra = fabricaDeFichas.ficha();
      const versaoDaOutra = await fichas.criarFicha(
        outra,
        fabricaDeFichas.versao({ series: 1, cargaEmQuilos: 50 }),
      );
      await sessoes.iniciarSessao(
        sessao(outra, versaoDaOutra, 'concluida', '2026-11-14T10:00:00.000Z'),
      );

      expect(await sessoes.ultimaRotinaConcluida(fichas2.ficha.id)).toBeNull();
      expect(await sessoes.ultimaRotinaConcluida(outra.id)).toEqual(versaoDaOutra.rotinas[0].id);
    });

    it('só lê: consultar não grava nada', async () => {
      const { sessoes, fichas2, sessao } = await iniciar();
      const concluida = sessao(fichas2.ficha, fichas2.v1, 'concluida', '2026-11-10T10:00:00.000Z');
      await sessoes.iniciarSessao(concluida);

      await sessoes.ultimaRotinaConcluida(fichas2.ficha.id);

      expect(await sessoes.buscarSessao(concluida.id)).toEqual({ ...concluida, exercicios: [] });
    });
  });
}

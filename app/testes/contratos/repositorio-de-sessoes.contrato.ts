import type { RepositorioDeFichas } from '../../src/aplicacao/portas/repositorio-de-fichas';
import type { RepositorioDeSessoes } from '../../src/aplicacao/portas/repositorio-de-sessoes';
import { Identificador } from '../../src/dominio/identificador';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import { FabricaDeFichas } from '../apoio/ficha-de-exemplo';
import { FabricaDeSessoes } from '../apoio/sessao-de-exemplo';

export interface CenarioDeSessoes {
  fichas: RepositorioDeFichas;
  sessoes: RepositorioDeSessoes;
  // Exercício que já existe no armazenamento; o SQLite exige o vínculo (seção 18.6).
  exercicioId: Identificador;
}

// Roda contra o falso em memória e contra o adaptador SQLite: os dois precisam passar (RT05).
export function contratoDoRepositorioDeSessoes(nome: string, criar: () => CenarioDeSessoes) {
  describe(`contrato do RepositorioDeSessoes: ${nome}`, () => {
    async function iniciar() {
      const { fichas, sessoes, exercicioId } = criar();
      const fabricaDeFichas = new FabricaDeFichas(exercicioId);
      const ficha = fabricaDeFichas.ficha();
      await fichas.criarFicha(ficha, fabricaDeFichas.versao({ series: 3, cargaEmQuilos: 60 }));
      const versao2 = await fichas.salvarNovaVersao(
        ficha.id,
        fabricaDeFichas.versao({ series: 4, cargaEmQuilos: 62.5 }),
      );
      const fabrica = new FabricaDeSessoes(exercicioId);
      const sessao = fabrica.sessao({
        fichaId: ficha.id,
        versaoId: versao2.id,
        rotinaId: versao2.rotinas[0].id,
      });
      await sessoes.iniciarSessao(sessao);
      return { fichas, sessoes, fabricaDeFichas, fabrica, ficha, versao2, sessao };
    }

    it('guarda a sessão, o exercício e as séries registradas, na ordem de registro', async () => {
      const { sessoes, fabrica, sessao } = await iniciar();
      const exercicio = fabrica.exercicio();
      const primeira = fabrica.serie({ cargaEmQuilos: 60, repeticoes: 10, rir: 3 });
      const segunda = fabrica.serie({ cargaEmQuilos: 60, repeticoes: 9, rir: 2 });

      await sessoes.adicionarExercicio(sessao.id, exercicio);
      await sessoes.registrarSerie(exercicio.id, primeira);
      await sessoes.registrarSerie(exercicio.id, segunda);

      expect(await sessoes.buscarSessao(sessao.id)).toEqual({
        ...sessao,
        exercicios: [{ ...exercicio, series: [primeira, segunda] }],
      });
    });

    it('a sessão continua apontando para a versão 2 quando a ficha passa para a versão 3 (RB04)', async () => {
      const { fichas, sessoes, fabricaDeFichas, ficha, versao2, sessao } = await iniciar();

      const versao3 = await fichas.salvarNovaVersao(
        ficha.id,
        fabricaDeFichas.versao({ series: 5, cargaEmQuilos: 65 }),
      );

      const guardada = await sessoes.buscarSessao(sessao.id);
      expect(versao3.numero).toBe(3);
      expect(guardada?.versaoId).toEqual(versao2.id);
      expect(guardada?.versaoId).not.toEqual(versao3.id);
    });

    it('corrigir uma série mostra a corrigida e guarda a original, só marcada como removida', async () => {
      const { sessoes, fabrica, sessao } = await iniciar();
      const exercicio = fabrica.exercicio();
      const original = fabrica.serie({ cargaEmQuilos: 60, repeticoes: 10, rir: 3 });
      const corrigida = fabrica.serie({ cargaEmQuilos: 62.5, repeticoes: 8, rir: 3 });
      const instante = InstanteUtc.de('2026-11-12T09:10:00.000Z');
      await sessoes.adicionarExercicio(sessao.id, exercicio);
      await sessoes.registrarSerie(exercicio.id, original);

      await sessoes.corrigirSerie(original.id, corrigida, instante);

      const [guardado] = (await sessoes.buscarSessao(sessao.id))?.exercicios ?? [];
      expect(guardado.series).toEqual([{ ...original, removidaEm: instante }, corrigida]);
      expect(guardado.series.filter((s) => s.removidaEm === null)).toEqual([corrigida]);
    });

    it('alterar o objeto devolvido não muda a sessão guardada', async () => {
      const { sessoes, fabrica, sessao } = await iniciar();
      const exercicio = fabrica.exercicio();
      await sessoes.adicionarExercicio(sessao.id, exercicio);
      await sessoes.registrarSerie(
        exercicio.id,
        fabrica.serie({ cargaEmQuilos: 60, repeticoes: 10, rir: 3 }),
      );

      const devolvida = await sessoes.buscarSessao(sessao.id);
      devolvida?.exercicios[0].series.pop();
      if (devolvida) devolvida.observacao = 'adulterada';

      const guardada = await sessoes.buscarSessao(sessao.id);
      expect(guardada?.exercicios[0].series).toHaveLength(1);
      expect(guardada?.observacao).toBeNull();
    });

    it('registrar série num exercício de sessão que não existe falha sem gravar nada', async () => {
      const { sessoes, fabrica, sessao } = await iniciar();
      const inexistente = Identificador.de('00000000-0000-7000-8000-00000000ffff');

      await expect(
        sessoes.registrarSerie(
          inexistente,
          fabrica.serie({ cargaEmQuilos: 60, repeticoes: 10, rir: 3 }),
        ),
      ).rejects.toThrow(/exercício da sessão/i);
      expect((await sessoes.buscarSessao(sessao.id))?.exercicios).toEqual([]);
    });
  });
}

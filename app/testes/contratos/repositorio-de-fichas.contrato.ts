import { FabricaDeFichas } from '../apoio/ficha-de-exemplo';
import type { RepositorioDeFichas } from '../../src/aplicacao/portas/repositorio-de-fichas';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { Identificador } from '../../src/dominio/identificador';

export interface CenarioDeFichas {
  repositorio: RepositorioDeFichas;
  // Exercício que já existe no armazenamento; o SQLite exige o vínculo (seção 18.6).
  exercicioId: Identificador;
}

// Roda contra o falso em memória e contra o adaptador SQLite: os dois precisam passar (RT05).
export function contratoDoRepositorioDeFichas(nome: string, criar: () => CenarioDeFichas) {
  describe(`contrato do RepositorioDeFichas: ${nome}`, () => {
    function iniciar() {
      const { repositorio, exercicioId } = criar();
      return { repositorio, fabrica: new FabricaDeFichas(exercicioId) };
    }

    it('criar a ficha grava a versão 1 com o conteúdo inteiro', async () => {
      const { repositorio, fabrica } = iniciar();
      const ficha = fabrica.ficha();
      const primeira = fabrica.versao({ series: 3, cargaEmQuilos: 60 });

      const gravada = await repositorio.criarFicha(ficha, primeira);

      expect(gravada).toEqual({ ...primeira, fichaId: ficha.id, numero: 1 });
      expect(await repositorio.listarVersoes(ficha.id)).toEqual([gravada]);
    });

    it('salvar uma alteração cria a versão seguinte e mantém a anterior idêntica (RB02)', async () => {
      const { repositorio, fabrica } = iniciar();
      const ficha = fabrica.ficha();
      const versao1 = await repositorio.criarFicha(
        ficha,
        fabrica.versao({ series: 3, cargaEmQuilos: 60 }),
      );

      const versao2 = await repositorio.salvarNovaVersao(
        ficha.id,
        fabrica.versao({ series: 4, cargaEmQuilos: 62.5, motivo: 'subi a carga' }),
      );

      expect(versao2.numero).toBe(2);
      expect(versao2.motivo).toBe('subi a carga');
      expect(await repositorio.listarVersoes(ficha.id)).toEqual([versao1, versao2]);
    });

    it('três alterações deixam quatro versões, cada uma com o seu conteúdo (RB02)', async () => {
      const { repositorio, fabrica } = iniciar();
      const ficha = fabrica.ficha();
      const gravadas = [
        await repositorio.criarFicha(ficha, fabrica.versao({ series: 1, cargaEmQuilos: 40 })),
      ];
      for (const series of [2, 3, 4]) {
        gravadas.push(
          await repositorio.salvarNovaVersao(
            ficha.id,
            fabrica.versao({ series, cargaEmQuilos: 40 + series }),
          ),
        );
      }

      const versoes = await repositorio.listarVersoes(ficha.id);

      expect(versoes.map((v) => v.numero)).toEqual([1, 2, 3, 4]);
      expect(versoes.map((v) => v.rotinas[0].itens[0].series.length)).toEqual([1, 2, 3, 4]);
      expect(versoes).toEqual(gravadas);
    });

    it('a versão atual é a de maior número', async () => {
      const { repositorio, fabrica } = iniciar();
      const ficha = fabrica.ficha();
      await repositorio.criarFicha(ficha, fabrica.versao({ series: 1, cargaEmQuilos: 40 }));
      const ultima = await repositorio.salvarNovaVersao(
        ficha.id,
        fabrica.versao({ series: 2, cargaEmQuilos: 45 }),
      );

      expect(await repositorio.buscarVersaoAtual(ficha.id)).toEqual(ultima);
    });

    it('alterar o objeto devolvido não muda a versão guardada', async () => {
      const { repositorio, fabrica } = iniciar();
      const ficha = fabrica.ficha();
      const devolvida = await repositorio.criarFicha(
        ficha,
        fabrica.versao({ series: 2, cargaEmQuilos: 50 }),
      );

      devolvida.rotinas[0].nome = 'adulterado';
      devolvida.rotinas[0].itens[0].series.pop();

      const [guardada] = await repositorio.listarVersoes(ficha.id);
      expect(guardada.rotinas[0].nome).toBe('Treino A');
      expect(guardada.rotinas[0].itens[0].series).toHaveLength(2);
    });

    it('listar as fichas devolve só as fichas, na ordem de criação, sem versões', async () => {
      const { repositorio, fabrica } = iniciar();
      const primeira = fabrica.ficha();
      const segunda = { ...fabrica.ficha(), nome: 'Treino B', situacao: 'arquivada' as const };
      await repositorio.criarFicha(primeira, fabrica.versao({ series: 1, cargaEmQuilos: 40 }));
      await repositorio.criarFicha(segunda, fabrica.versao({ series: 2, cargaEmQuilos: 45 }));

      const fichas = await repositorio.listarFichas();

      expect(fichas).toEqual([primeira, segunda]);
    });

    it('listar as fichas sem nenhuma gravada devolve lista vazia', async () => {
      const { repositorio } = iniciar();

      expect(await repositorio.listarFichas()).toEqual([]);
    });

    it('salvar uma versão nova não duplica nem muda a ficha listada', async () => {
      const { repositorio, fabrica } = iniciar();
      const ficha = fabrica.ficha();
      await repositorio.criarFicha(ficha, fabrica.versao({ series: 1, cargaEmQuilos: 40 }));
      const versao2 = fabrica.versao({ series: 2, cargaEmQuilos: 45 });
      await repositorio.salvarNovaVersao(ficha.id, versao2);

      expect(await repositorio.listarFichas()).toEqual([ficha]);
    });

    describe('situação da ficha (US-009a)', () => {
      async function gravar(
        repositorio: RepositorioDeFichas,
        fabrica: FabricaDeFichas,
        situacao: 'ativa' | 'inativa' | 'arquivada',
      ) {
        const ficha = { ...fabrica.ficha(), situacao };
        await repositorio.criarFicha(ficha, fabrica.versao({ series: 1, cargaEmQuilos: 40 }));
        return ficha;
      }
      const situacoes = async (repositorio: RepositorioDeFichas) =>
        (await repositorio.listarFichas()).map((ficha) => ficha.situacao);

      it('ativar uma ficha deixa a que estava ativa como inativa (SL09)', async () => {
        const { repositorio, fabrica } = iniciar();
        await gravar(repositorio, fabrica, 'ativa');
        const outra = await gravar(repositorio, fabrica, 'inativa');

        await repositorio.ativarFicha(outra.id);

        expect(await situacoes(repositorio)).toEqual(['inativa', 'ativa']);
      });

      it('ativar não mexe nas fichas arquivadas, só troca a ativa anterior', async () => {
        const { repositorio, fabrica } = iniciar();
        await gravar(repositorio, fabrica, 'arquivada');
        await gravar(repositorio, fabrica, 'ativa');
        const alvo = await gravar(repositorio, fabrica, 'inativa');

        await repositorio.ativarFicha(alvo.id);

        expect(await situacoes(repositorio)).toEqual(['arquivada', 'inativa', 'ativa']);
      });

      it('ativar sem nenhuma ficha ativa só marca a escolhida', async () => {
        const { repositorio, fabrica } = iniciar();
        const alvo = await gravar(repositorio, fabrica, 'inativa');

        await repositorio.ativarFicha(alvo.id);

        expect(await situacoes(repositorio)).toEqual(['ativa']);
      });

      it('ativar uma ficha que não existe falha com ErroDeValidacao e não altera nada', async () => {
        const { repositorio, fabrica } = iniciar();
        await gravar(repositorio, fabrica, 'ativa');
        const inexistente = Identificador.de('00000000-0000-7000-8000-00000000ffff');

        await expect(repositorio.ativarFicha(inexistente)).rejects.toBeInstanceOf(ErroDeValidacao);

        expect(await situacoes(repositorio)).toEqual(['ativa']);
      });

      it('arquivar muda só a situação: a ficha e as versões continuam guardadas (RB04)', async () => {
        const { repositorio, fabrica } = iniciar();
        const ficha = await gravar(repositorio, fabrica, 'ativa');
        await repositorio.salvarNovaVersao(
          ficha.id,
          fabrica.versao({ series: 2, cargaEmQuilos: 45 }),
        );
        const versoesAntes = await repositorio.listarVersoes(ficha.id);

        await repositorio.arquivarFicha(ficha.id);

        expect(await repositorio.listarFichas()).toEqual([{ ...ficha, situacao: 'arquivada' }]);
        expect(await repositorio.listarVersoes(ficha.id)).toEqual(versoesAntes);
      });

      it('arquivar uma ficha que não existe falha com ErroDeValidacao', async () => {
        const { repositorio } = iniciar();
        const inexistente = Identificador.de('00000000-0000-7000-8000-00000000ffff');

        await expect(repositorio.arquivarFicha(inexistente)).rejects.toBeInstanceOf(
          ErroDeValidacao,
        );
      });
    });

    it('salvar versão de uma ficha que não existe falha sem gravar nada', async () => {
      const { repositorio, fabrica } = iniciar();
      const inexistente = Identificador.de('00000000-0000-7000-8000-00000000ffff');

      await expect(
        repositorio.salvarNovaVersao(inexistente, fabrica.versao({ series: 1, cargaEmQuilos: 40 })),
      ).rejects.toThrow(/ficha/i);
      expect(await repositorio.listarVersoes(inexistente)).toEqual([]);
      expect(await repositorio.buscarVersaoAtual(inexistente)).toBeNull();
    });
  });
}

import { FabricaDeFichas } from '../apoio/ficha-de-exemplo';
import type { RepositorioDeFichas } from '../../src/aplicacao/portas/repositorio-de-fichas';
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

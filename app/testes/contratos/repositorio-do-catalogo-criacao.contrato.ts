import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { NovoExercicio } from '../../src/dominio/exercicio';
import { Identificador } from '../../src/dominio/identificador';
import type { CenarioDeLeituraDoCatalogo } from './repositorio-do-catalogo-leitura.contrato';

const NOVO: NovoExercicio = {
  id: Identificador.de('00000000-0000-7000-8000-000000000d01'),
  nome: 'Remada Unilateral',
  unilateral: true,
  equipamento: 'Halter',
  grupos: { diretos: ['Costas'], indiretos: ['Bíceps'] },
};

// Roda contra o falso em memória e contra o adaptador SQLite: os dois precisam passar (RT05).
export function contratoDeCriacaoNoCatalogo(nome: string, criar: () => CenarioDeLeituraDoCatalogo) {
  describe(`contrato de criarExercicio do RepositorioDoCatalogo: ${nome}`, () => {
    it('grava o exercício ativo, de origem usuario, com os grupos e sem sinônimos', async () => {
      const { repositorio, semear } = criar();
      semear([]);

      await repositorio.criarExercicio(NOVO);

      expect(await repositorio.listarExercicios()).toEqual([
        {
          id: NOVO.id,
          nome: 'Remada Unilateral',
          situacao: 'ativo',
          origem: 'usuario',
          unilateral: true,
          equipamento: 'Halter',
          sinonimos: [],
          gruposDiretos: ['Costas'],
          gruposIndiretos: ['Bíceps'],
        },
      ]);
    });

    it('grupo fora da lista fixa falha e não grava o exercício', async () => {
      const { repositorio, semear } = criar();
      semear([]);

      const erro = await repositorio
        .criarExercicio({ ...NOVO, grupos: { diretos: ['Costas', 'Cérebro'], indiretos: [] } })
        .then(
          () => undefined,
          (e: unknown) => e,
        );

      expect(erro).toBeInstanceOf(ErroDeValidacao);
      expect(await repositorio.listarExercicios()).toEqual([]);
    });
  });
}

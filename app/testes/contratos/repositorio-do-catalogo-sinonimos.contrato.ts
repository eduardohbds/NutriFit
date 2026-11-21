import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { ExercicioDoCatalogo } from '../../src/dominio/exercicio';
import { Identificador } from '../../src/dominio/identificador';
import type { CenarioDeLeituraDoCatalogo } from './repositorio-do-catalogo-leitura.contrato';

const PUNHO: ExercicioDoCatalogo = {
  id: Identificador.de('00000000-0000-7000-8000-000000000f01'),
  nome: 'Rosca de Punho Inversa',
  situacao: 'ativo',
  origem: 'inicial',
  unilateral: false,
  equipamento: null,
  sinonimos: [],
  gruposDiretos: ['Antebraço'],
  gruposIndiretos: [],
};

// Roda contra o falso em memória e contra o adaptador SQLite: os dois precisam passar (RT05).
export function contratoDeSinonimosNoCatalogo(
  nome: string,
  criar: () => CenarioDeLeituraDoCatalogo,
) {
  describe(`contrato de adicionarSinonimo do RepositorioDoCatalogo: ${nome}`, () => {
    it('grava o sinônimo do exercício e o devolve na leitura', async () => {
      const { repositorio, semear } = criar();
      semear([PUNHO]);

      await repositorio.adicionarSinonimo(PUNHO.id, 'Reverse Wrist Curl');

      const [lido] = await repositorio.listarExercicios();
      expect(lido?.sinonimos).toEqual(['Reverse Wrist Curl']);
    });

    it('repetir o mesmo texto no mesmo exercício não muda nada e não falha', async () => {
      const { repositorio, semear } = criar();
      semear([PUNHO]);
      await repositorio.adicionarSinonimo(PUNHO.id, 'Reverse Wrist Curl');

      await repositorio.adicionarSinonimo(PUNHO.id, 'Reverse Wrist Curl');

      const [lido] = await repositorio.listarExercicios();
      expect(lido?.sinonimos).toEqual(['Reverse Wrist Curl']);
    });

    it('exercício que não existe falha com ErroDeValidacao e não grava nada', async () => {
      const { repositorio, semear } = criar();
      semear([PUNHO]);
      const inexistente = Identificador.de('00000000-0000-7000-8000-000000000f99');

      const erro = await repositorio.adicionarSinonimo(inexistente, 'Reverse Wrist Curl').then(
        () => undefined,
        (e: unknown) => e,
      );

      expect(erro).toBeInstanceOf(ErroDeValidacao);
      const [lido] = await repositorio.listarExercicios();
      expect(lido?.sinonimos).toEqual([]);
    });
  });
}

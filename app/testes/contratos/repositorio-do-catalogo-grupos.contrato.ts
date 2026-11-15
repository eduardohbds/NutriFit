import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { ExercicioDoCatalogo } from '../../src/dominio/exercicio';
import { Identificador } from '../../src/dominio/identificador';
import type { CenarioDeLeituraDoCatalogo } from './repositorio-do-catalogo-leitura.contrato';

const SUPINO: ExercicioDoCatalogo = {
  id: Identificador.de('00000000-0000-7000-8000-000000000c01'),
  nome: 'Supino Reto',
  situacao: 'ativo',
  origem: 'inicial',
  unilateral: false,
  equipamento: 'Banco',
  sinonimos: ['Bench Press'],
  gruposDiretos: ['Peitoral'],
  gruposIndiretos: ['Tríceps', 'Ombro anterior'],
};

// Roda contra o falso em memória e contra o adaptador SQLite: os dois precisam passar (RT05).
export function contratoDeGruposDoCatalogo(nome: string, criar: () => CenarioDeLeituraDoCatalogo) {
  describe(`contrato de gravarGrupos do RepositorioDoCatalogo: ${nome}`, () => {
    function iniciar() {
      const cenario = criar();
      cenario.semear([SUPINO]);
      const ler = async () => (await cenario.repositorio.listarExercicios())[0];
      return { ...cenario, ler };
    }

    it('troca os grupos diretos e indiretos por inteiro', async () => {
      const { repositorio, ler } = iniciar();

      await repositorio.gravarGrupos(SUPINO.id, { diretos: ['Costas'], indiretos: ['Bíceps'] });

      const lido = await ler();
      expect(lido.gruposDiretos).toEqual(['Costas']);
      expect(lido.gruposIndiretos).toEqual(['Bíceps']);
    });

    it('lista vazia remove todos os grupos do exercício', async () => {
      const { repositorio, ler } = iniciar();

      await repositorio.gravarGrupos(SUPINO.id, { diretos: [], indiretos: [] });

      const lido = await ler();
      expect([lido.gruposDiretos, lido.gruposIndiretos]).toEqual([[], []]);
    });

    it('não altera nome, sinônimos, equipamento nem situação', async () => {
      const { repositorio, ler } = iniciar();

      await repositorio.gravarGrupos(SUPINO.id, { diretos: ['Costas'], indiretos: [] });

      expect(await ler()).toMatchObject({
        nome: 'Supino Reto',
        sinonimos: ['Bench Press'],
        equipamento: 'Banco',
        situacao: 'ativo',
        origem: 'inicial',
      });
    });

    it('grupo fora da lista fixa falha e deixa os grupos antigos como estavam', async () => {
      const { repositorio, ler } = iniciar();

      await expect(
        repositorio.gravarGrupos(SUPINO.id, { diretos: ['Costas'], indiretos: ['Pescoço'] }),
      ).rejects.toBeInstanceOf(ErroDeValidacao);

      const lido = await ler();
      expect(lido.gruposDiretos).toEqual(['Peitoral']);
      expect([...lido.gruposIndiretos].sort()).toEqual(['Ombro anterior', 'Tríceps']);
    });

    it('exercício que não existe falha sem gravar nada', async () => {
      const { repositorio } = iniciar();
      const inexistente = Identificador.de('00000000-0000-7000-8000-00000000ffff');

      await expect(
        repositorio.gravarGrupos(inexistente, { diretos: ['Costas'], indiretos: [] }),
      ).rejects.toBeInstanceOf(ErroDeValidacao);
    });
  });
}

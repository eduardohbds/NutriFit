import type { RepositorioDoCatalogo } from '../../src/aplicacao/portas/repositorio-do-catalogo';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { ExercicioDoCatalogo } from '../../src/dominio/exercicio';
import { Identificador } from '../../src/dominio/identificador';
import type { CenarioDeLeituraDoCatalogo } from './repositorio-do-catalogo-leitura.contrato';

function exercicio(sufixo: string, nome: string, sinonimos: string[] = []): ExercicioDoCatalogo {
  return {
    id: Identificador.de(`00000000-0000-7000-8000-000000000${sufixo}`),
    nome,
    situacao: 'ativo',
    origem: 'inicial',
    unilateral: false,
    equipamento: null,
    sinonimos,
    gruposDiretos: ['Bíceps'],
    gruposIndiretos: [],
  };
}

const MANTIDO = exercicio('b01', 'Rosca Direta');
const DESCARTADO = exercicio('b02', 'Rosca Bíceps');
const OUTRO = exercicio('b03', 'Remada Curvada');
const ABSORVIDO = exercicio('b04', 'Rosca Barra');
const INEXISTENTE = Identificador.de('00000000-0000-7000-8000-000000000b99');

const valores = (ids: Identificador[]) => ids.map((id) => id.valor);
const ordenados = (...ids: Identificador[]) => valores(ids).sort();

async function exigirRecusaSemAlterar(
  repositorio: RepositorioDoCatalogo,
  mantido: Identificador,
  descartado: Identificador,
) {
  const antes = await repositorio.listarExercicios();
  const erro = await repositorio.mesclarExercicios(mantido, descartado).then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroDeValidacao);
  expect(await repositorio.listarExercicios()).toEqual(antes);
}

// Roda contra o falso em memória e contra o adaptador SQLite: os dois precisam passar (RT05).
export function contratoDeMesclagemNoCatalogo(
  nome: string,
  criar: () => CenarioDeLeituraDoCatalogo,
) {
  describe(`contrato de mesclarExercicios do RepositorioDoCatalogo: ${nome}`, () => {
    it('arquiva o descartado, mantém o mantido ativo e liga os dois como equivalentes', async () => {
      const { repositorio, semear } = criar();
      semear([MANTIDO, DESCARTADO]);

      await repositorio.mesclarExercicios(MANTIDO.id, DESCARTADO.id);

      expect(await repositorio.situacaoDoExercicio(DESCARTADO.id)).toBe('arquivado');
      expect(await repositorio.situacaoDoExercicio(MANTIDO.id)).toBe('ativo');
      for (const id of [MANTIDO.id, DESCARTADO.id]) {
        const familia = await repositorio.exerciciosEquivalentes(id);
        expect(familia[0]?.valor).toBe(MANTIDO.id.valor);
        expect(valores(familia).sort()).toEqual(ordenados(MANTIDO.id, DESCARTADO.id));
      }
    });

    it('o nome do descartado vira sinônimo do mantido', async () => {
      const { repositorio, semear } = criar();
      semear([MANTIDO, DESCARTADO]);

      await repositorio.mesclarExercicios(MANTIDO.id, DESCARTADO.id);

      const lidos = await repositorio.listarExercicios();
      const mantido = lidos.find((e) => e.id.valor === MANTIDO.id.valor);
      expect(mantido?.sinonimos).toEqual(['Rosca Bíceps']);
    });

    it('não repete o sinônimo quando o nome do descartado já era sinônimo do mantido', async () => {
      const { repositorio, semear } = criar();
      semear([exercicio('b01', 'Rosca Direta', ['Rosca Bíceps']), DESCARTADO]);

      await repositorio.mesclarExercicios(MANTIDO.id, DESCARTADO.id);

      const lidos = await repositorio.listarExercicios();
      const mantido = lidos.find((e) => e.id.valor === MANTIDO.id.valor);
      expect(mantido?.sinonimos).toEqual(['Rosca Bíceps']);
    });

    it('um exercício nunca mesclado é equivalente só a si mesmo', async () => {
      const { repositorio, semear } = criar();
      semear([MANTIDO, DESCARTADO, OUTRO]);
      await repositorio.mesclarExercicios(MANTIDO.id, DESCARTADO.id);

      expect(valores(await repositorio.exerciciosEquivalentes(OUTRO.id))).toEqual([OUTRO.id.valor]);
    });

    it('mesclar quem já recebeu mesclagens liga todos ao novo mantido', async () => {
      const { repositorio, semear } = criar();
      semear([MANTIDO, DESCARTADO, ABSORVIDO]);
      await repositorio.mesclarExercicios(DESCARTADO.id, ABSORVIDO.id);

      await repositorio.mesclarExercicios(MANTIDO.id, DESCARTADO.id);

      const esperado = ordenados(MANTIDO.id, DESCARTADO.id, ABSORVIDO.id);
      for (const id of [MANTIDO.id, DESCARTADO.id, ABSORVIDO.id]) {
        const familia = await repositorio.exerciciosEquivalentes(id);
        expect(familia[0]?.valor).toBe(MANTIDO.id.valor);
        expect(valores(familia).sort()).toEqual(esperado);
      }
    });

    it('recusa, sem gravar, o mesmo exercício nos dois lados', async () => {
      const { repositorio, semear } = criar();
      semear([MANTIDO, DESCARTADO]);

      await exigirRecusaSemAlterar(repositorio, MANTIDO.id, MANTIDO.id);
    });

    it('recusa, sem gravar, um mantido ou um descartado que não existe', async () => {
      const { repositorio, semear } = criar();
      semear([MANTIDO, DESCARTADO]);

      await exigirRecusaSemAlterar(repositorio, MANTIDO.id, INEXISTENTE);
      await exigirRecusaSemAlterar(repositorio, INEXISTENTE, DESCARTADO.id);
    });

    it('recusa, sem gravar, um descartado que já foi mesclado', async () => {
      const { repositorio, semear } = criar();
      semear([MANTIDO, DESCARTADO, OUTRO]);
      await repositorio.mesclarExercicios(MANTIDO.id, DESCARTADO.id);

      await exigirRecusaSemAlterar(repositorio, OUTRO.id, DESCARTADO.id);
    });

    it('recusa, sem gravar, um mantido que já foi mesclado em outro', async () => {
      const { repositorio, semear } = criar();
      semear([MANTIDO, DESCARTADO, OUTRO]);
      await repositorio.mesclarExercicios(MANTIDO.id, DESCARTADO.id);

      await exigirRecusaSemAlterar(repositorio, DESCARTADO.id, OUTRO.id);
    });
  });
}

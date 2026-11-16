import { EditarGruposDoExercicio } from '../../src/aplicacao/casos-de-uso/editar-grupos-do-exercicio';
import { ListarExerciciosDoCatalogo } from '../../src/aplicacao/casos-de-uso/listar-exercicios-do-catalogo';
import type { ExercicioDoCatalogo } from '../../src/dominio/exercicio';
import { CATALOGO_INICIAL } from '../casos-de-referencia/catalogo-inicial';
import { GeradorDeIdentificadorSequencial } from '../dubles/gerador-de-identificador-sequencial';
import { RepositorioDoCatalogoEmMemoria } from '../dubles/repositorio-do-catalogo-em-memoria';

// Catálogo inicial da seção 18.4 no falso em memória, com os casos de uso reais da tela.
export function catalogoInicialParaTela() {
  const gerador = new GeradorDeIdentificadorSequencial();
  const repositorio = new RepositorioDoCatalogoEmMemoria();
  const exercicios: ExercicioDoCatalogo[] = CATALOGO_INICIAL.map((e) => ({
    id: gerador.gerar(),
    nome: e.nome,
    situacao: 'ativo',
    origem: 'inicial',
    unilateral: e.unilateral,
    equipamento: null,
    sinonimos: e.sinonimos,
    gruposDiretos: e.gruposDiretos,
    gruposIndiretos: e.gruposIndiretos,
  }));
  repositorio.semearCatalogo(exercicios);
  return {
    repositorio,
    listarExercicios: new ListarExerciciosDoCatalogo(repositorio),
    editarGrupos: new EditarGruposDoExercicio(repositorio),
  };
}

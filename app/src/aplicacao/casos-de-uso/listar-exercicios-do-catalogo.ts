import type { ExercicioDoCatalogo } from '../../dominio/exercicio';
import { compararPorNome } from '../../dominio/texto-de-busca';
import type { RepositorioDoCatalogo } from '../portas/repositorio-do-catalogo';

// Catálogo para a tela: só os ativos, em ordem de nome, com os grupos também em ordem. Os
// arquivados continuam no banco e no histórico, mas saem das escolhas (seção 18.6).
export class ListarExerciciosDoCatalogo {
  constructor(private readonly catalogo: RepositorioDoCatalogo) {}

  async executar(): Promise<ExercicioDoCatalogo[]> {
    const todos = await this.catalogo.listarExercicios();
    return todos
      .filter((exercicio) => exercicio.situacao === 'ativo')
      .map((exercicio) => ({
        ...exercicio,
        gruposDiretos: [...exercicio.gruposDiretos].sort(compararPorNome),
        gruposIndiretos: [...exercicio.gruposIndiretos].sort(compararPorNome),
      }))
      .sort((a, b) => compararPorNome(a.nome, b.nome));
  }
}

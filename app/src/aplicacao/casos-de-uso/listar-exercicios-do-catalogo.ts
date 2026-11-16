import type { ExercicioDoCatalogo } from '../../dominio/exercicio';
import type { RepositorioDoCatalogo } from '../portas/repositorio-do-catalogo';

// Compara sem acento nem maiúscula; String.normalize evita depender de Intl no aparelho.
function chaveDeOrdem(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function porNome(a: string, b: string): number {
  const x = chaveDeOrdem(a);
  const y = chaveDeOrdem(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

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
        gruposDiretos: [...exercicio.gruposDiretos].sort(porNome),
        gruposIndiretos: [...exercicio.gruposIndiretos].sort(porNome),
      }))
      .sort((a, b) => porNome(a.nome, b.nome));
  }
}

import type { ExercicioDoCatalogo } from '../../dominio/exercicio';
import { chaveDeBusca, compararPorNome } from '../../dominio/texto-de-busca';
import type { RepositorioDoCatalogo } from '../portas/repositorio-do-catalogo';

function corresponde(exercicio: ExercicioDoCatalogo, chave: string): boolean {
  return [exercicio.nome, ...exercicio.sinonimos].some((n) => chaveDeBusca(n).includes(chave));
}

export class BuscarExercicios {
  constructor(private readonly catalogo: RepositorioDoCatalogo) {}

  // Só os ativos (os arquivados saem das escolhas, seção 18.6), por parte do nome ou de qualquer
  // sinônimo; texto vazio devolve todos, para a tela usar a mesma chamada ao abrir.
  async executar(texto: string): Promise<ExercicioDoCatalogo[]> {
    const chave = chaveDeBusca(texto);
    const todos = await this.catalogo.listarExercicios();
    return todos
      .filter((e) => e.situacao === 'ativo' && corresponde(e, chave))
      .sort((a, b) => compararPorNome(a.nome, b.nome));
  }
}

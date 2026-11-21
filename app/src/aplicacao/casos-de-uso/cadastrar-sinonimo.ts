import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type { Identificador } from '../../dominio/identificador';
import { chaveDeBusca } from '../../dominio/texto-de-busca';
import type { RepositorioDoCatalogo } from '../portas/repositorio-do-catalogo';

export interface PedidoDeSinonimo {
  exercicioId: Identificador;
  texto: string;
}

export class CadastrarSinonimo {
  constructor(private readonly catalogo: RepositorioDoCatalogo) {}

  // Repetir um sinônimo, mesmo com outra caixa, acento ou espaços nas pontas, não muda nada: a porta
  // só enxerga igualdade exata, então a comparação normalizada fica aqui.
  async executar(pedido: PedidoDeSinonimo): Promise<void> {
    const texto = pedido.texto.trim();
    if (texto === '') throw new ErroDeValidacao('sinonimo', 'texto não vazio', pedido.texto);
    const todos = await this.catalogo.listarExercicios();
    const atual = todos.find((e) => e.id.valor === pedido.exercicioId.valor);
    const chave = chaveDeBusca(texto);
    if (atual?.sinonimos.some((s) => chaveDeBusca(s) === chave)) return;
    await this.catalogo.adicionarSinonimo(pedido.exercicioId, texto);
  }
}

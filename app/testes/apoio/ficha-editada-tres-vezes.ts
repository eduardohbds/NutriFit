import type { ItemPedido, PedidoDeFicha } from '../../src/aplicacao/casos-de-uso/salvar-ficha';
import { fichasParaTela } from './fichas-de-tela';

export const NOME_DA_FICHA_EDITADA = 'Treino com histórico';

// Uma ficha criada e editada 3 vezes, ou seja, com 4 versões:
//   1: Supino; 2: Supino e Remada (incluí a remada); 3: Supino com 60 kg (subi a carga);
//   4: só o Supino com 60 kg (tirei a remada).
export async function fichaEditadaTresVezes() {
  const pronto = await fichasParaTela();
  const supino = pronto.ids.get('Supino Reto')!;
  const remada = pronto.ids.get('Remada Curvada')!;
  const item = (ordem: number, id: typeof supino, carga: string | null): ItemPedido => ({
    ordem,
    exercicioId: id,
    grupo: null,
    unilateral: false,
    observacoes: null,
    listas: { quantidade: 3, meta: '10', carga, tecnica: null, descanso: null },
  });
  const pedido = (itens: ItemPedido[], motivo?: string, fichaId?: PedidoDeFicha['fichaId']) => ({
    fichaId,
    motivo,
    nome: NOME_DA_FICHA_EDITADA,
    rotinas: [{ nome: 'Treino A', diaDaSemana: null, itens }],
  });
  const primeira = await pronto.salvarFicha.executar(pedido([item(1, supino, null)]));
  const { fichaId } = primeira;
  const itens2 = [item(1, supino, null), item(2, remada, null)];
  await pronto.salvarFicha.executar(pedido(itens2, 'incluí remada', fichaId));
  const itens3 = [item(1, supino, '60'), item(2, remada, null)];
  await pronto.salvarFicha.executar(pedido(itens3, 'subi a carga', fichaId));
  await pronto.salvarFicha.executar(pedido([item(1, supino, '60')], 'tirei a remada', fichaId));
  return { ...pronto, fichaId, supino, remada };
}

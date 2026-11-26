import { EscolherTreinoDoDia } from '../../src/aplicacao/casos-de-uso/escolher-treino-do-dia';
import type { PedidoDeFicha } from '../../src/aplicacao/casos-de-uso/salvar-ficha';
import type { Identificador } from '../../src/dominio/identificador';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import { RelogioFixo } from '../dubles/relogio-fixo';
import { RepositorioDeSessoesEmMemoria } from '../dubles/repositorio-de-sessoes-em-memoria';
import { fichasParaTela } from './fichas-de-tela';
import { FabricaDeSessoes } from './sessao-de-exemplo';

// Novembro de 2026: 9 é segunda, 11 é quarta, 14 é sábado e 15 é domingo.
export const QUARTA = '2026-11-11T12:00:00.000Z';
export const SABADO = '2026-11-14T12:00:00.000Z';

// As fichas de referência em memória, sem sessões, e o caso de uso com um relógio fixo.
export async function inicioParaTela(hoje = QUARTA) {
  const pronto = await fichasParaTela();
  const sessoes = new RepositorioDeSessoesEmMemoria();
  const fabrica = new FabricaDeSessoes(pronto.ids.get('Supino Reto')!);
  const escolherTreinoDoDia = new EscolherTreinoDoDia(
    pronto.fichas,
    sessoes,
    new RelogioFixo(hoje),
  );
  return { ...pronto, sessoes, fabrica, escolherTreinoDoDia };
}

export type InicioParaTela = Awaited<ReturnType<typeof inicioParaTela>>;

// Ficha por rotação com Treino A, B e C, já ativa.
export async function ativarRotacao(inicio: InicioParaTela): Promise<Identificador> {
  const supino = inicio.ids.get('Supino Reto')!;
  const rotinas = ['Treino A', 'Treino B', 'Treino C'].map((nome) => ({
    nome,
    diaDaSemana: null,
    itens: [
      {
        ordem: 1,
        exercicioId: supino,
        grupo: null,
        unilateral: false,
        observacoes: null,
        listas: { quantidade: 3, meta: '10', carga: null, tecnica: null, descanso: null },
      },
    ],
  }));
  const pedido: PedidoDeFicha = { nome: 'Rotação ABC', rotinas };
  const { fichaId } = await inicio.salvarFicha.executar(pedido);
  await inicio.ativarFicha.executar(fichaId);
  return fichaId;
}

export async function registrarSessaoConcluida(
  inicio: InicioParaTela,
  fichaId: Identificador,
  nomeDaRotina: string,
  fim = '2026-11-10T10:00:00.000Z',
) {
  const versao = (await inicio.fichas.buscarVersaoAtual(fichaId))!;
  const rotina = versao.rotinas.find((r) => r.nome === nomeDaRotina)!;
  await inicio.sessoes.iniciarSessao({
    ...inicio.fabrica.sessao({ fichaId, versaoId: versao.id, rotinaId: rotina.id }),
    situacao: 'concluida',
    fim: InstanteUtc.de(fim),
  });
}

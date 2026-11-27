import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type { Rotina } from '../../dominio/ficha';
import type { Identificador } from '../../dominio/identificador';
import type { InstanteUtc } from '../../dominio/instante-utc';
import type { Sessao } from '../../dominio/sessao';
import { textosDasSeries, type TextosDasSeries } from '../../dominio/textos-das-series';
import type { RepositorioDeFichas } from '../portas/repositorio-de-fichas';
import type { RepositorioDeSessoes } from '../portas/repositorio-de-sessoes';
import type { RepositorioDoCatalogo } from '../portas/repositorio-do-catalogo';

export interface ExercicioDaSessaoParaTela {
  id: Identificador;
  exercicioId: Identificador;
  nome: string;
  ordem: number;
  // O planejado, no texto da planilha, da versão usada na época; nulo se o exercício não veio da ficha.
  listas: TextosDasSeries | null;
}

export interface SessaoParaTela {
  sessaoId: Identificador;
  inicio: InstanteUtc;
  // Nulos no treino livre (SL18).
  fichaNome: string | null;
  rotinaNome: string | null;
  versaoNumero: number | null;
  exercicios: ExercicioDaSessaoParaTela[];
}

interface OrigemDaSessao {
  fichaNome: string | null;
  versaoNumero: number | null;
  rotina: Rotina | null;
}

const SEM_FICHA: OrigemDaSessao = { fichaNome: null, versaoNumero: null, rotina: null };

// A sessão em andamento para a tela, só leitura (RB02, FI-4). O planejado vem da versão que a
// sessão guardou, e não da atual: editar a ficha depois não muda o treino em curso (RB04, CE05).
export class LerSessaoEmAndamento {
  constructor(
    private readonly sessoes: RepositorioDeSessoes,
    private readonly fichas: RepositorioDeFichas,
    private readonly catalogo: RepositorioDoCatalogo,
  ) {}

  async executar(): Promise<SessaoParaTela | null> {
    const sessao = await this.sessoes.buscarSessaoEmAndamento();
    if (!sessao) return null;
    const origem = await this.origemDaSessao(sessao);
    const exercicios = await this.catalogo.listarExercicios();
    const nomes = new Map(exercicios.map((e) => [e.id.valor, e.nome]));
    return {
      sessaoId: sessao.id,
      inicio: sessao.inicio,
      fichaNome: origem.fichaNome,
      rotinaNome: origem.rotina?.nome ?? null,
      versaoNumero: origem.versaoNumero,
      exercicios: sessao.exercicios.map((e, posicao) => {
        const nome = nomes.get(e.exercicioId.valor);
        if (nome === undefined) {
          throw new ErroDeValidacao('exercício', 'exercício do catálogo', e.exercicioId.valor);
        }
        const item = origem.rotina?.itens.find((i) => i.id.valor === e.itemOrigemId?.valor);
        const listas = item ? textosDasSeries(item.series) : null;
        return { id: e.id, exercicioId: e.exercicioId, nome, ordem: posicao + 1, listas };
      }),
    };
  }

  private async origemDaSessao(sessao: Sessao): Promise<OrigemDaSessao> {
    if (!sessao.fichaId || !sessao.versaoId) return SEM_FICHA;
    const ficha = (await this.fichas.listarFichas()).find(
      (f) => f.id.valor === sessao.fichaId?.valor,
    );
    const versoes = await this.fichas.listarVersoes(sessao.fichaId);
    const versao = versoes.find((v) => v.id.valor === sessao.versaoId?.valor);
    const rotina = versao?.rotinas.find((r) => r.id.valor === sessao.rotinaId?.valor) ?? null;
    return { fichaNome: ficha?.nome ?? null, versaoNumero: versao?.numero ?? null, rotina };
  }
}

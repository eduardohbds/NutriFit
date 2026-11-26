import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type { Ficha, Rotina } from '../../dominio/ficha';
import type { Identificador } from '../../dominio/identificador';
import type { Relogio } from '../portas/relogio';
import type { RepositorioDeFichas } from '../portas/repositorio-de-fichas';
import type { RepositorioDeSessoes } from '../portas/repositorio-de-sessoes';

export interface RotinaDoDia {
  id: Identificador;
  nome: string;
  diaDaSemana: number | null;
  quantidadeDeExercicios: number;
}

interface FichaDoDia {
  fichaId: Identificador;
  fichaNome: string;
  versao: number;
  rotinas: RotinaDoDia[];
}

export type TreinoDoDia =
  // O treino de hoje, com as rotinas da ficha para o usuário escolher outra (nenhuma versão nasce).
  | (FichaDoDia & { situacao: 'sugerido'; sugerida: RotinaDoDia })
  // Ficha por dia da semana sem rotina hoje (CE01): aviso e todas as rotinas para escolher.
  | (FichaDoDia & { situacao: 'sem_rotina_hoje'; diaDaSemana: number })
  // Nenhuma ficha ativa (CE02, SL18).
  | { situacao: 'sem_ficha_ativa' };

const resumoDa = (rotina: Rotina): RotinaDoDia => ({
  id: rotina.id,
  nome: rotina.nome,
  diaDaSemana: rotina.diaDaSemana,
  quantidadeDeExercicios: rotina.itens.length,
});

// Sugere o treino de hoje da ficha ativa: pelo dia da semana, quando a ficha é por dia, ou pela
// rotação, que avança a partir da última sessão concluída e não do calendário. Só lê: escolher
// outra rotina não cria versão nenhuma (RB02, FI-4).
export class EscolherTreinoDoDia {
  constructor(
    private readonly fichas: RepositorioDeFichas,
    private readonly sessoes: RepositorioDeSessoes,
    private readonly relogio: Relogio,
  ) {}

  async executar(): Promise<TreinoDoDia> {
    const ficha = (await this.fichas.listarFichas()).find((f) => f.situacao === 'ativa');
    if (!ficha) return { situacao: 'sem_ficha_ativa' };
    const atual = await this.fichas.buscarVersaoAtual(ficha.id);
    if (!atual) throw new ErroDeValidacao('ficha', 'ficha com ao menos uma versão', ficha.id.valor);
    const base = { fichaId: ficha.id, fichaNome: ficha.nome, versao: atual.numero };
    const rotinas = atual.rotinas.map(resumoDa);
    const porDia = typeof atual.rotinas[0]?.diaDaSemana === 'number';
    if (porDia || rotinas.length === 0) return this.porDia({ ...base, rotinas });
    return this.porRotacao(ficha, { ...base, rotinas });
  }

  private porDia(ficha: FichaDoDia): TreinoDoDia {
    const hoje = this.relogio.diaDaSemana();
    const sugerida = ficha.rotinas.find((rotina) => rotina.diaDaSemana === hoje);
    if (!sugerida) return { ...ficha, situacao: 'sem_rotina_hoje', diaDaSemana: hoje };
    return { ...ficha, situacao: 'sugerido', sugerida };
  }

  // A seguinte à da última sessão concluída, na ordem da versão atual; depois da última, a
  // primeira. Sem sessão, ou se o nome dela sumiu da versão atual, a primeira.
  private async porRotacao(ficha: Ficha, dia: FichaDoDia): Promise<TreinoDoDia> {
    const ultimoId = await this.sessoes.ultimaRotinaConcluida(ficha.id);
    const nome = ultimoId ? await this.nomeDaRotina(ficha.id, ultimoId) : null;
    const indice = dia.rotinas.findIndex((rotina) => rotina.nome === nome);
    return {
      ...dia,
      situacao: 'sugerido',
      sugerida: dia.rotinas[(indice + 1) % dia.rotinas.length],
    };
  }

  // O identificador da rotina vale na versão usada na época; o nome sai das versões da ficha.
  private async nomeDaRotina(
    fichaId: Identificador,
    rotinaId: Identificador,
  ): Promise<string | null> {
    const versoes = await this.fichas.listarVersoes(fichaId);
    const rotinas = versoes.flatMap((versao) => versao.rotinas);
    return rotinas.find((rotina) => rotina.id.valor === rotinaId.valor)?.nome ?? null;
  }
}

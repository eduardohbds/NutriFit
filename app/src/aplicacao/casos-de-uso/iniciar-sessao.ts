import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type { Rotina, VersaoDaFicha } from '../../dominio/ficha';
import type { Identificador } from '../../dominio/identificador';
import type { NovaSessao, NovoExercicioDaSessao } from '../../dominio/sessao';
import type { GeradorDeIdentificador } from '../portas/gerador-de-identificador';
import type { Relogio } from '../portas/relogio';
import type { RepositorioDeFichas } from '../portas/repositorio-de-fichas';
import type { RepositorioDeSessoes } from '../portas/repositorio-de-sessoes';

export type ResultadoDoInicio =
  // A sessão nasceu em andamento; `exerciciosDaSessao` na ordem da rotina.
  | { iniciada: true; sessaoId: Identificador; exerciciosDaSessao: Identificador[] }
  // Já havia uma sessão em andamento (CE03): nada foi criado, e a tela de retomar usa este id.
  | { iniciada: false; motivo: 'ja_em_andamento'; sessaoId: Identificador };

// Começa o treino de uma rotina da versão atual da ficha ativa. A sessão guarda a versão usada na
// época (RB04, CE05) e nada da ficha é tocado (RB02, FI-4). Sessão e exercícios entram pelo método
// atômico da porta: ou tudo, ou nada (RNF08).
export class IniciarSessao {
  constructor(
    private readonly fichas: RepositorioDeFichas,
    private readonly sessoes: RepositorioDeSessoes,
    private readonly relogio: Relogio,
    private readonly gerador: GeradorDeIdentificador,
  ) {}

  async executar(rotinaId: Identificador): Promise<ResultadoDoInicio> {
    const { fichaId, versao, rotina } = await this.rotinaDaFichaAtiva(rotinaId);
    const emAndamento = await this.sessoes.buscarSessaoEmAndamento();
    if (emAndamento) {
      return { iniciada: false, motivo: 'ja_em_andamento', sessaoId: emAndamento.id };
    }
    const sessao: NovaSessao = {
      id: this.gerador.gerar(),
      inicio: this.relogio.agora(),
      fim: null,
      fichaId,
      versaoId: versao.id,
      rotinaId: rotina.id,
      situacao: 'em_andamento',
      observacao: null,
    };
    const exercicios = rotina.itens.map((item): NovoExercicioDaSessao => ({
      id: this.gerador.gerar(),
      exercicioId: item.exercicioId,
      itemOrigemId: item.id,
      observacoes: null,
    }));
    await this.sessoes.iniciarSessaoComExercicios(sessao, exercicios);
    return { iniciada: true, sessaoId: sessao.id, exerciciosDaSessao: exercicios.map((e) => e.id) };
  }

  private async rotinaDaFichaAtiva(
    rotinaId: Identificador,
  ): Promise<{ fichaId: Identificador; versao: VersaoDaFicha; rotina: Rotina }> {
    const ficha = (await this.fichas.listarFichas()).find((f) => f.situacao === 'ativa');
    if (!ficha) {
      throw new ErroDeValidacao('ficha ativa', 'ficha ativa para iniciar o treino', 'nenhuma');
    }
    const versao = await this.fichas.buscarVersaoAtual(ficha.id);
    const rotina = versao?.rotinas.find((r) => r.id.valor === rotinaId.valor);
    if (!versao || !rotina) {
      throw new ErroDeValidacao('rotina', 'rotina da versão atual da ficha ativa', rotinaId.valor);
    }
    return { fichaId: ficha.id, versao, rotina };
  }
}

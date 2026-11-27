// Único lugar que conhece todos os adaptadores e os liga às portas (AGENTS.md seção 3).
import Constants from 'expo-constants';

import { abrirBancoDrizzleDoAparelho } from '../adaptadores/sqlite/banco-drizzle-do-aparelho';
import { RepositorioDeSessoesSqlite } from '../adaptadores/sqlite/repositorio-de-sessoes-sqlite';
import { RepositorioDeFichasSqlite } from '../adaptadores/sqlite/repositorio-de-fichas-sqlite';
import { RepositorioDoCatalogoSqlite } from '../adaptadores/sqlite/repositorio-do-catalogo-sqlite';
import { ConexaoDoBancoExpo } from '../adaptadores/sqlite/conexao-do-banco-expo';
import { EsquemaDoBancoExpo } from '../adaptadores/sqlite/esquema-do-banco-expo';
import { GeradorUuidV7 } from '../adaptadores/sistema/gerador-uuid-v7';
import { CopiaDoBancoEmArquivo } from '../adaptadores/sistema/copia-do-banco-em-arquivo';
import { RegistroDeFalhasEmArquivo } from '../adaptadores/sistema/registro-de-falhas-em-arquivo';
import { RelogioDoSistema } from '../adaptadores/sistema/relogio-do-sistema';
import { AbrirBanco } from '../aplicacao/casos-de-uso/abrir-banco';
import { ConfigurarConexao } from '../aplicacao/casos-de-uso/configurar-conexao';
import { ArquivarFicha } from '../aplicacao/casos-de-uso/arquivar-ficha';
import { AtivarFicha } from '../aplicacao/casos-de-uso/ativar-ficha';
import { BuscarExercicios } from '../aplicacao/casos-de-uso/buscar-exercicios';
import { CompararVersoes } from '../aplicacao/casos-de-uso/comparar-versoes';
import { DuplicarFicha } from '../aplicacao/casos-de-uso/duplicar-ficha';
import { EscolherTreinoDoDia } from '../aplicacao/casos-de-uso/escolher-treino-do-dia';
import { IniciarSessao } from '../aplicacao/casos-de-uso/iniciar-sessao';
import { HistoricoDaFicha } from '../aplicacao/casos-de-uso/historico-da-ficha';
import { EditarGruposDoExercicio } from '../aplicacao/casos-de-uso/editar-grupos-do-exercicio';
import { LerFichaParaEdicao } from '../aplicacao/casos-de-uso/ler-ficha-para-edicao';
import { ListarExerciciosDoCatalogo } from '../aplicacao/casos-de-uso/listar-exercicios-do-catalogo';
import { ListarFichas } from '../aplicacao/casos-de-uso/listar-fichas';
import { MigrarBanco } from '../aplicacao/casos-de-uso/migrar-banco';
import { RegistrarFalha } from '../aplicacao/casos-de-uso/registrar-falha';
import { RestaurarVersao } from '../aplicacao/casos-de-uso/restaurar-versao';
import { SalvarFicha } from '../aplicacao/casos-de-uso/salvar-ficha';

const versaoApp = Constants.expoConfig?.version ?? '0.0.0';
const NOME_DO_BANCO = 'nutrifit.db';

export const registrarFalha = new RegistrarFalha(
  new RegistroDeFalhasEmArquivo(),
  new RelogioDoSistema(),
  versaoApp,
);

const conexao = new ConexaoDoBancoExpo(NOME_DO_BANCO);
const migrarBanco = new MigrarBanco(
  new CopiaDoBancoEmArquivo(NOME_DO_BANCO),
  new EsquemaDoBancoExpo(NOME_DO_BANCO),
  registrarFalha,
);

export const abrirBanco = new AbrirBanco(conexao, migrarBanco, new ConfigurarConexao(conexao));

// As telas só existem depois de o GuardaDoBanco abrir e migrar o banco; por isso a conexão dos
// repositórios abre sob demanda, na primeira tela que os usa, e é reaproveitada.
let bancoDoAparelho: ReturnType<typeof abrirBancoDrizzleDoAparelho> | null = null;
let repositorioDoCatalogo: RepositorioDoCatalogoSqlite | null = null;
let repositorioDeFichas: RepositorioDeFichasSqlite | null = null;
let repositorioDeSessoes: RepositorioDeSessoesSqlite | null = null;

// Uma só conexão síncrona para todos os repositórios das telas.
function banco(): ReturnType<typeof abrirBancoDrizzleDoAparelho> {
  bancoDoAparelho ??= abrirBancoDrizzleDoAparelho(NOME_DO_BANCO);
  return bancoDoAparelho;
}

function catalogo(): RepositorioDoCatalogoSqlite {
  repositorioDoCatalogo ??= new RepositorioDoCatalogoSqlite(banco());
  return repositorioDoCatalogo;
}

function sessoes(): RepositorioDeSessoesSqlite {
  repositorioDeSessoes ??= new RepositorioDeSessoesSqlite(banco());
  return repositorioDeSessoes;
}

function fichas(): RepositorioDeFichasSqlite {
  repositorioDeFichas ??= new RepositorioDeFichasSqlite(banco());
  return repositorioDeFichas;
}

export function casosDoCatalogo(): {
  listarExercicios: ListarExerciciosDoCatalogo;
  editarGrupos: EditarGruposDoExercicio;
} {
  return {
    listarExercicios: new ListarExerciciosDoCatalogo(catalogo()),
    editarGrupos: new EditarGruposDoExercicio(catalogo()),
  };
}

export function casosDeFichas(): {
  buscarExercicios: BuscarExercicios;
  listarFichas: ListarFichas;
  lerFichaParaEdicao: LerFichaParaEdicao;
  salvarFicha: SalvarFicha;
  ativarFicha: AtivarFicha;
  duplicarFicha: DuplicarFicha;
  arquivarFicha: ArquivarFicha;
  historicoDaFicha: HistoricoDaFicha;
  restaurarVersao: RestaurarVersao;
  compararVersoes: CompararVersoes;
} {
  return {
    buscarExercicios: new BuscarExercicios(catalogo()),
    listarFichas: new ListarFichas(fichas()),
    lerFichaParaEdicao: new LerFichaParaEdicao(fichas(), catalogo()),
    salvarFicha: new SalvarFicha(fichas(), catalogo(), new GeradorUuidV7(), new RelogioDoSistema()),
    ativarFicha: new AtivarFicha(fichas()),
    duplicarFicha: new DuplicarFicha(fichas(), new GeradorUuidV7(), new RelogioDoSistema()),
    arquivarFicha: new ArquivarFicha(fichas()),
    historicoDaFicha: new HistoricoDaFicha(fichas()),
    restaurarVersao: new RestaurarVersao(fichas(), new GeradorUuidV7(), new RelogioDoSistema()),
    compararVersoes: new CompararVersoes(fichas(), catalogo()),
  };
}

// A tela inicial: o treino de hoje pelo relógio do aparelho (RB16), a ficha lida para mostrá-lo e o
// início da sessão, que ainda não tem botão (US-013d).
export function casosDoInicio(): {
  escolherTreinoDoDia: EscolherTreinoDoDia;
  lerFichaParaEdicao: LerFichaParaEdicao;
  iniciarSessao: IniciarSessao;
} {
  return {
    escolherTreinoDoDia: new EscolherTreinoDoDia(fichas(), sessoes(), new RelogioDoSistema()),
    lerFichaParaEdicao: new LerFichaParaEdicao(fichas(), catalogo()),
    iniciarSessao: new IniciarSessao(
      fichas(),
      sessoes(),
      new RelogioDoSistema(),
      new GeradorUuidV7(),
    ),
  };
}

// Único lugar que conhece todos os adaptadores e os liga às portas (AGENTS.md seção 3).
import Constants from 'expo-constants';

import { abrirBancoDrizzleDoAparelho } from '../adaptadores/sqlite/banco-drizzle-do-aparelho';
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
import { BuscarExercicios } from '../aplicacao/casos-de-uso/buscar-exercicios';
import { EditarGruposDoExercicio } from '../aplicacao/casos-de-uso/editar-grupos-do-exercicio';
import { LerFichaParaEdicao } from '../aplicacao/casos-de-uso/ler-ficha-para-edicao';
import { ListarExerciciosDoCatalogo } from '../aplicacao/casos-de-uso/listar-exercicios-do-catalogo';
import { ListarFichas } from '../aplicacao/casos-de-uso/listar-fichas';
import { MigrarBanco } from '../aplicacao/casos-de-uso/migrar-banco';
import { RegistrarFalha } from '../aplicacao/casos-de-uso/registrar-falha';
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

// Uma só conexão síncrona para todos os repositórios das telas.
function banco(): ReturnType<typeof abrirBancoDrizzleDoAparelho> {
  bancoDoAparelho ??= abrirBancoDrizzleDoAparelho(NOME_DO_BANCO);
  return bancoDoAparelho;
}

function catalogo(): RepositorioDoCatalogoSqlite {
  repositorioDoCatalogo ??= new RepositorioDoCatalogoSqlite(banco());
  return repositorioDoCatalogo;
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
} {
  return {
    buscarExercicios: new BuscarExercicios(catalogo()),
    listarFichas: new ListarFichas(fichas()),
    lerFichaParaEdicao: new LerFichaParaEdicao(fichas(), catalogo()),
    salvarFicha: new SalvarFicha(fichas(), catalogo(), new GeradorUuidV7(), new RelogioDoSistema()),
  };
}

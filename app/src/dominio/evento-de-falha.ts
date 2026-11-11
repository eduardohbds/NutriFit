import { ErroDeValidacao } from './erro-de-validacao';
import type { InstanteUtc } from './instante-utc';

export type NivelDeFalha = 'erro' | 'aviso';

export interface DadosDoEventoDeFalha {
  quando: InstanteUtc;
  nivel: NivelDeFalha;
  onde: string;
  codigo: string;
  campo?: string | null;
  esperado?: string | null;
  versaoApp: string;
}

// Nomes de código (RegistrarMedicao, VALOR_INVALIDO, cintura): sem espaço nem pontuação,
// para que texto livre, como um comando ou um valor digitado, não caiba nesses campos.
const IDENTIFICADOR = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const VERSAO = /^\d+\.\d+\.\d+$/;
const TAMANHO_MAXIMO_DO_ESPERADO = 120;

function exigir(condicao: boolean, campo: string, esperado: string, recebido: unknown) {
  if (!condicao) throw new ErroDeValidacao(campo, esperado, recebido);
}

function validar(dados: DadosDoEventoDeFalha) {
  exigir(dados.nivel === 'erro' || dados.nivel === 'aviso', 'nivel', 'erro ou aviso', dados.nivel);
  exigir(IDENTIFICADOR.test(dados.onde), 'onde', 'nome de código', dados.onde);
  exigir(IDENTIFICADOR.test(dados.codigo), 'codigo', 'nome de código', dados.codigo);
  exigir(
    dados.campo == null || IDENTIFICADOR.test(dados.campo),
    'campo',
    'nome de código',
    dados.campo,
  );
  const esperado = dados.esperado ?? '';
  exigir(
    esperado.length <= TAMANHO_MAXIMO_DO_ESPERADO && !/[\r\n]/.test(esperado),
    'esperado',
    `uma linha de até ${TAMANHO_MAXIMO_DO_ESPERADO} caracteres`,
    dados.esperado,
  );
  exigir(VERSAO.test(dados.versaoApp), 'versaoApp', 'versão no formato 1.2.3', dados.versaoApp);
}

// Uma linha do registro local de falhas (RNF36). Só estes campos existem; valor recebido,
// texto de comando, medida e credencial nunca entram (SEG13, arquitetura 11.1).
export class EventoDeFalha {
  private constructor(private readonly dados: Required<DadosDoEventoDeFalha>) {}

  static criar(dados: DadosDoEventoDeFalha): EventoDeFalha {
    validar(dados);
    // Copia campo a campo: qualquer outra chave do objeto recebido fica de fora.
    return new EventoDeFalha({
      quando: dados.quando,
      nivel: dados.nivel,
      onde: dados.onde,
      codigo: dados.codigo,
      campo: dados.campo ?? null,
      esperado: dados.esperado ?? null,
      versaoApp: dados.versaoApp,
    });
  }

  paraJson(): string {
    return JSON.stringify({ ...this.dados, quando: this.dados.quando.iso });
  }
}

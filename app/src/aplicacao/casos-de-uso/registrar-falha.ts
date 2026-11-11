import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import { EventoDeFalha, type NivelDeFalha } from '../../dominio/evento-de-falha';
import type { Relogio } from '../portas/relogio';
import type { RegistroDeFalhas } from '../portas/registro-de-falhas';

export interface FalhaOcorrida {
  onde: string;
  erro: unknown;
  codigo?: string;
  nivel?: NivelDeFalha;
}

// Transforma qualquer erro numa linha do registro local. Mensagem e valor recebido do erro
// nunca são lidos: podem conter comando, medida ou credencial (SEG13).
export class RegistrarFalha {
  constructor(
    private readonly registro: RegistroDeFalhas,
    private readonly relogio: Relogio,
    private readonly versaoApp: string,
  ) {}

  async executar(falha: FalhaOcorrida): Promise<void> {
    try {
      await this.registro.registrar(this.criarEvento(falha));
    } catch (erroDoRegistro) {
      this.avisarNoConsole(erroDoRegistro);
    }
  }

  private criarEvento({ onde, erro, codigo, nivel = 'erro' }: FalhaOcorrida): EventoDeFalha {
    const base = { quando: this.relogio.agora(), nivel, onde, versaoApp: this.versaoApp };
    if (erro instanceof ErroDeValidacao) {
      const { campo, esperado } = erro;
      return EventoDeFalha.criar({ ...base, codigo: codigo ?? 'VALOR_INVALIDO', campo, esperado });
    }
    return EventoDeFalha.criar({ ...base, codigo: codigo ?? 'ERRO_INESPERADO' });
  }

  // Sem onde gravar, o aviso vai para o console de depuração, ainda sem o detalhe original.
  private avisarNoConsole(erroDoRegistro: unknown) {
    const codigo =
      erroDoRegistro instanceof ErroDeValidacao ? 'EVENTO_INVALIDO' : 'REGISTRO_INDISPONIVEL';
    console.error(
      JSON.stringify({ nivel: 'erro', onde: 'RegistrarFalha', codigo, versaoApp: this.versaoApp }),
    );
  }
}

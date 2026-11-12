import type { CopiaDoBanco } from '../../src/aplicacao/portas/copia-do-banco';
import type { EsquemaDoBanco, TotaisDoBanco } from '../../src/aplicacao/portas/esquema-do-banco';

// Um banco falso que implementa as duas portas da migração sobre o mesmo estado, para que
// "voltar à cópia" tenha efeito visível. `chamadas` guarda a ordem em que as portas foram usadas.
export class BancoEmMemoria {
  conteudo = 'versao-anterior';
  totais: TotaisDoBanco = { series: 0, sessoes: 0 };
  readonly chamadas: string[] = [];
  falharAoCopiar = false;
  falharAoRestaurar = false;
  // Roda no meio da migração: pode alterar `conteudo`/`totais` ou lançar erro.
  aoMigrar: () => void = () => {
    this.conteudo = 'versao-seguinte';
  };

  private cópia: { conteudo: string; totais: TotaisDoBanco } | null = null;

  readonly copia: CopiaDoBanco = {
    existe: async () => this.cópia !== null,
    criar: async () => {
      this.chamadas.push('copiar');
      if (this.falharAoCopiar) throw new Error('sem espaço');
      this.cópia = { conteudo: this.conteudo, totais: { ...this.totais } };
    },
    restaurar: async () => {
      this.chamadas.push('restaurar');
      if (this.falharAoRestaurar) throw new Error('cópia ilegível');
      if (!this.cópia) throw new Error('sem cópia');
      this.conteudo = this.cópia.conteudo;
      this.totais = { ...this.cópia.totais };
    },
    descartar: async () => {
      this.chamadas.push('descartar');
      this.cópia = null;
    },
  };

  readonly esquema: EsquemaDoBanco = {
    contarTotais: async () => ({ ...this.totais }),
    migrar: async () => {
      this.chamadas.push('migrar');
      this.aoMigrar();
    },
  };
}

import type { CopiaDoBanco } from '../portas/copia-do-banco';
import type { EsquemaDoBanco, TotaisDoBanco } from '../portas/esquema-do-banco';
import type { RegistrarFalha } from './registrar-falha';

// migrado: tudo certo; revertido: a migração falhou e o banco voltou à cópia;
// nao_migrado: não foi possível fazer a cópia, então nada foi tentado.
export type SituacaoDaMigracao = 'migrado' | 'revertido' | 'nao_migrado';

const ONDE = 'MigrarBanco';

function mesmosTotais(a: TotaisDoBanco, b: TotaisDoBanco): boolean {
  return a.series === b.series && a.sessoes === b.sessoes;
}

// Copia o banco, migra e só apaga a cópia quando os totais de séries e sessões batem; do
// contrário volta à cópia (arquitetura 7.3). Nada aqui lê valores do banco além das contagens.
export class MigrarBanco {
  constructor(
    private readonly copia: CopiaDoBanco,
    private readonly esquema: EsquemaDoBanco,
    private readonly registrarFalha: RegistrarFalha,
  ) {}

  async executar(): Promise<{ situacao: SituacaoDaMigracao }> {
    const antes = await this.esquema.contarTotais();
    if (!(await this.copiar())) return { situacao: 'nao_migrado' };
    const falha = await this.migrar(antes);
    if (falha) {
      await this.voltarParaACopia(falha.erro, falha.codigo);
      return { situacao: 'revertido' };
    }
    await this.descartarCopia();
    return { situacao: 'migrado' };
  }

  private async copiar(): Promise<boolean> {
    try {
      await this.copia.criar();
      return true;
    } catch (erro) {
      await this.registrarFalha.executar({ onde: ONDE, erro, codigo: 'COPIA_FALHOU' });
      return false;
    }
  }

  private async migrar(antes: TotaisDoBanco) {
    try {
      await this.esquema.migrar();
      const depois = await this.esquema.contarTotais();
      if (mesmosTotais(antes, depois)) return null;
      return { erro: new Error('totais divergentes'), codigo: 'TOTAIS_DIVERGENTES' };
    } catch (erro) {
      return { erro, codigo: 'MIGRACAO_FALHOU' };
    }
  }

  // Se nem a volta funciona, a cópia fica onde está e o erro sobe: seguir com o banco
  // pela metade arriscaria séries já concluídas (FI-1).
  private async voltarParaACopia(erro: unknown, codigo: string) {
    try {
      await this.copia.restaurar();
    } catch (erroDaVolta) {
      await this.registrarFalha.executar({
        onde: ONDE,
        erro: erroDaVolta,
        codigo: 'RESTAURACAO_FALHOU',
      });
      throw erroDaVolta;
    }
    await this.registrarFalha.executar({ onde: ONDE, erro, codigo });
  }

  // A migração já deu certo; uma cópia que sobra só ocupa espaço, então vira aviso.
  private async descartarCopia() {
    try {
      await this.copia.descartar();
    } catch (erro) {
      await this.registrarFalha.executar({
        onde: ONDE,
        erro,
        codigo: 'COPIA_NAO_APAGADA',
        nivel: 'aviso',
      });
    }
  }
}

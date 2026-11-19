import type { RepositorioDeAcoesDaIA } from '../../src/aplicacao/portas/repositorio-de-acoes-da-ia';
import type { AcaoDaIA } from '../../src/dominio/acao-da-ia';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { Identificador } from '../../src/dominio/identificador';

// Cópia na entrada e na saída: quem recebe um objeto não consegue alterar o que está guardado.
export class RepositorioDeAcoesDaIAEmMemoria implements RepositorioDeAcoesDaIA {
  private readonly acoes = new Map<string, AcaoDaIA>();

  async registrar(acao: AcaoDaIA): Promise<void> {
    this.acoes.set(acao.id.valor, { ...acao });
  }

  async desfazer(id: Identificador): Promise<void> {
    const acao = this.acoes.get(id.valor);
    if (!acao) throw new ErroDeValidacao('ação da IA', 'ação existente', id.valor);
    acao.desfeita = true;
  }

  async buscar(id: Identificador): Promise<AcaoDaIA | null> {
    const acao = this.acoes.get(id.valor);
    return acao ? { ...acao } : null;
  }
}

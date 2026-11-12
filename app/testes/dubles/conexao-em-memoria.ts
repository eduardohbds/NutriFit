import type { ConexaoDoBanco } from '../../src/aplicacao/portas/conexao-do-banco';

// Falso da conexão: começa com os valores de fábrica do SQLite (sem WAL, sincronização normal,
// chaves estrangeiras desligadas) e guarda se há escrita pendente no -wal, como um app que foi
// fechado à força deixa.
export class ConexaoEmMemoria implements ConexaoDoBanco {
  aberta = false;
  walPendente = false;
  readonly pragmas = new Map<string, string | number>([
    ['journal_mode', 'delete'],
    ['synchronous', 1],
    ['foreign_keys', 0],
  ]);

  async abrir() {
    this.aberta = true;
  }
  async fechar() {
    this.aberta = false;
    this.walPendente = false;
  }
  async definirPragma(nome: string, valor: string | number) {
    this.pragmas.set(nome, valor);
  }
  async lerPragma(nome: string) {
    return this.pragmas.get(nome) ?? '';
  }
}

// Substitui o módulo de plataforma expo-file-system nos testes (AGENTS.md seção 7): arquivos
// ficam num Map, com a mesma API de File e Paths que o adaptador usa.
export const arquivosEmMemoria = new Map<string, string>();

export const Paths = { document: { uri: 'file:///documentos/' } };

export class File {
  readonly uri: string;

  constructor(pasta: { uri: string }, nome: string) {
    this.uri = `${pasta.uri}${nome}`;
  }

  get exists() {
    return arquivosEmMemoria.has(this.uri);
  }

  create() {
    if (this.exists) throw new Error(`arquivo já existe: ${this.uri}`);
    arquivosEmMemoria.set(this.uri, '');
  }

  get parentDirectory() {
    return { create: () => undefined };
  }

  copy(destino: { uri: string }) {
    if (!this.exists) throw new Error(`arquivo inexistente: ${this.uri}`);
    arquivosEmMemoria.set(destino.uri, arquivosEmMemoria.get(this.uri) ?? '');
  }

  delete() {
    arquivosEmMemoria.delete(this.uri);
  }

  async text() {
    if (!this.exists) throw new Error(`arquivo inexistente: ${this.uri}`);
    return arquivosEmMemoria.get(this.uri) ?? '';
  }

  async write(conteudo: string, opcoes: { append?: boolean } = {}) {
    const anterior = opcoes.append ? (arquivosEmMemoria.get(this.uri) ?? '') : '';
    arquivosEmMemoria.set(this.uri, anterior + conteudo);
  }
}

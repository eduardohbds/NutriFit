// Conexão aberta com o banco do aparelho. A porta é mínima: só o que a configuração e o
// ciclo abrir/fechar precisam; as consultas ficam nos adaptadores de repositório.
export interface ConexaoDoBanco {
  abrir(): Promise<void>;
  // Fecha a conexão e deixa o arquivo do banco completo, sem escrita pendente no -wal.
  fechar(): Promise<void>;
  definirPragma(nome: string, valor: string | number): Promise<void>;
  lerPragma(nome: string): Promise<string | number>;
}

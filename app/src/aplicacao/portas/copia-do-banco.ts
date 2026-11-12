// Cópia do arquivo do banco numa pasta interna, feita antes de uma migração (arquitetura 7.3).
export interface CopiaDoBanco {
  existe(): Promise<boolean>;
  criar(): Promise<void>;
  // Devolve o banco ao estado da cópia; falha se não houver cópia.
  restaurar(): Promise<void>;
  descartar(): Promise<void>;
}

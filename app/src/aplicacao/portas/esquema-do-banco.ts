export interface TotaisDoBanco {
  series: number;
  sessoes: number;
}

export interface EsquemaDoBanco {
  // Banco sem tabelas (primeira abertura) devolve zeros.
  contarTotais(): Promise<TotaisDoBanco>;
  migrar(): Promise<void>;
}

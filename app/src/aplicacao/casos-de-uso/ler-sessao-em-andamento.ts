import type { Identificador } from '../../dominio/identificador';
import type { InstanteUtc } from '../../dominio/instante-utc';
import type { TextosDasSeries } from '../../dominio/textos-das-series';
import type { RepositorioDeFichas } from '../portas/repositorio-de-fichas';
import type { RepositorioDeSessoes } from '../portas/repositorio-de-sessoes';
import type { RepositorioDoCatalogo } from '../portas/repositorio-do-catalogo';

export interface ExercicioDaSessaoParaTela {
  id: Identificador;
  exercicioId: Identificador;
  nome: string;
  ordem: number;
  // O planejado, no texto da planilha, da versão usada na época; nulo se o exercício não veio da ficha.
  listas: TextosDasSeries | null;
}

export interface SessaoParaTela {
  sessaoId: Identificador;
  inicio: InstanteUtc;
  // Nulos no treino livre (SL18).
  fichaNome: string | null;
  rotinaNome: string | null;
  versaoNumero: number | null;
  exercicios: ExercicioDaSessaoParaTela[];
}

// Esqueleto do Red (US-013d1): a regra entra no Green.
export class LerSessaoEmAndamento {
  constructor(
    private readonly sessoes: RepositorioDeSessoes,
    private readonly fichas: RepositorioDeFichas,
    private readonly catalogo: RepositorioDoCatalogo,
  ) {}

  async executar(): Promise<SessaoParaTela | null> {
    void this.sessoes;
    void this.fichas;
    void this.catalogo;
    throw new Error('não implementado');
  }
}

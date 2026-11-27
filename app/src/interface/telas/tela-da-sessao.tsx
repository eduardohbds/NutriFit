import type { LerSessaoEmAndamento } from '../../aplicacao/casos-de-uso/ler-sessao-em-andamento';

export interface PropsDaTelaDaSessao {
  lerSessaoEmAndamento: LerSessaoEmAndamento;
}

// Esqueleto do Red (US-013d1): a tela entra no Green.
export function TelaDaSessao(props: PropsDaTelaDaSessao) {
  void props;
  return null;
}

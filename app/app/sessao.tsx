import { casosDaSessao } from '../src/composicao';
import { TelaDaSessao } from '../src/interface/telas/tela-da-sessao';

// Rota fina: a tela de verdade fica em src/interface (AGENTS.md seção 3).
export default function Sessao() {
  const { lerSessaoEmAndamento } = casosDaSessao();
  return <TelaDaSessao lerSessaoEmAndamento={lerSessaoEmAndamento} />;
}

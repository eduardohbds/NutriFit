import { casosDeFichas } from '../src/composicao';
import { TelaDasFichas } from '../src/interface/telas/tela-das-fichas';

// Rota fina: a tela de verdade fica em src/interface (AGENTS.md seção 3).
export default function Fichas() {
  const { listarFichas, lerFichaParaEdicao, buscarExercicios } = casosDeFichas();
  return (
    <TelaDasFichas
      listarFichas={listarFichas}
      lerFichaParaEdicao={lerFichaParaEdicao}
      buscarExercicios={buscarExercicios}
    />
  );
}

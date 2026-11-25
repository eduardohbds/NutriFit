import { casosDeFichas } from '../src/composicao';
import { TelaDasFichas } from '../src/interface/telas/tela-das-fichas';

// Rota fina: a tela de verdade fica em src/interface (AGENTS.md seção 3).
export default function Fichas() {
  const casos = casosDeFichas();
  return (
    <TelaDasFichas
      listarFichas={casos.listarFichas}
      lerFichaParaEdicao={casos.lerFichaParaEdicao}
      buscarExercicios={casos.buscarExercicios}
      salvarFicha={casos.salvarFicha}
      ativarFicha={casos.ativarFicha}
      duplicarFicha={casos.duplicarFicha}
      arquivarFicha={casos.arquivarFicha}
      historicoDaFicha={casos.historicoDaFicha}
      restaurarVersao={casos.restaurarVersao}
    />
  );
}

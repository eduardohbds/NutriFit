import { casosDoCatalogo } from '../src/composicao';
import { TelaDoCatalogo } from '../src/interface/telas/tela-do-catalogo';

// Rota fina: a tela de verdade fica em src/interface (AGENTS.md seção 3).
export default function Catalogo() {
  const { listarExercicios, editarGrupos } = casosDoCatalogo();
  return <TelaDoCatalogo listarExercicios={listarExercicios} editarGrupos={editarGrupos} />;
}

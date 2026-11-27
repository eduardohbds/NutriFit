import { casosDoInicio } from '../src/composicao';
import { TelaInicial } from '../src/interface/telas/tela-inicial';

// Rota fina: a tela de verdade fica em src/interface (AGENTS.md seção 3).
export default function Inicio() {
  const { escolherTreinoDoDia, lerFichaParaEdicao, iniciarSessao } = casosDoInicio();
  return (
    <TelaInicial
      escolherTreinoDoDia={escolherTreinoDoDia}
      lerFichaParaEdicao={lerFichaParaEdicao}
      iniciarSessao={iniciarSessao}
    />
  );
}

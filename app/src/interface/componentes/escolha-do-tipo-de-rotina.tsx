import { Text, View } from 'react-native';

import type { TipoDeRotina } from '../../aplicacao/rascunho-da-ficha';
import { textos } from '../textos';
import { BotaoDeAcao } from './botao-de-acao';

export interface PropsDaEscolhaDoTipoDeRotina {
  aoEscolher: (tipo: TipoDeRotina) => void;
  aoCancelar: () => void;
}

// Todas as rotinas de uma ficha se identificam do mesmo jeito (RB01), por isso o tipo é escolhido
// uma vez, antes de abrir o editor da ficha nova.
export function EscolhaDoTipoDeRotina({ aoEscolher, aoCancelar }: PropsDaEscolhaDoTipoDeRotina) {
  return (
    <View>
      <Text>{textos.fichas.escolherTipoDeRotina}</Text>
      <BotaoDeAcao
        rotulo={textos.fichas.tipoPorDia}
        nome={textos.fichas.tipoPorDia}
        aoTocar={() => aoEscolher('dia-da-semana')}
      />
      <BotaoDeAcao
        rotulo={textos.fichas.tipoPorRotacao}
        nome={textos.fichas.tipoPorRotacao}
        aoTocar={() => aoEscolher('rotacao')}
      />
      <BotaoDeAcao
        rotulo={textos.fichas.cancelarNovaFicha}
        nome={textos.fichas.cancelarNovaFicha}
        aoTocar={aoCancelar}
      />
    </View>
  );
}

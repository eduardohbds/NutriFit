import { Pressable, StyleSheet, Text } from 'react-native';

export interface PropsDoBotaoDeAcao {
  rotulo: string;
  // Nome para quem usa leitor de tela, com a ficha, a rotina ou a linha a que o botão se refere.
  nome: string;
  aoTocar: () => void;
}

export function BotaoDeAcao({ rotulo, nome, aoTocar }: PropsDoBotaoDeAcao) {
  return (
    <Pressable role="button" aria-label={nome} onPress={aoTocar} style={estilos.botao}>
      <Text>{rotulo}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: { paddingVertical: 6 },
});

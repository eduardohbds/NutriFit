import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RegistrarFalha } from '../../aplicacao/casos-de-uso/registrar-falha';
import { textos } from '../textos';

export interface PropsDaTelaDeErro {
  erro: Error;
  tentarDeNovo: () => void;
  registrarFalha: RegistrarFalha;
}

// Erro inesperado (CE62): mensagem simples, sem detalhe técnico, e um caminho para tentar de novo.
export function TelaDeErro({ erro, tentarDeNovo, registrarFalha }: PropsDaTelaDeErro) {
  useEffect(() => {
    // executar nunca rejeita: se o registro falhar, ele mesmo avisa no console.
    void registrarFalha.executar({ onde: 'Interface', erro });
  }, [erro, registrarFalha]);

  return (
    <View style={estilos.tela}>
      <Text style={estilos.mensagem}>{textos.erroInesperado.mensagem}</Text>
      <Pressable role="button" onPress={tentarDeNovo} style={estilos.botao}>
        <Text>{textos.erroInesperado.tentarDeNovo}</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16 },
  mensagem: { fontSize: 16, textAlign: 'center' },
  botao: { paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderRadius: 8 },
});

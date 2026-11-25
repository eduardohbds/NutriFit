import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { EntradaDoHistorico } from '../../aplicacao/casos-de-uso/historico-da-ficha';
import { formatarDataEHora } from '../formatacao';
import { textos } from '../textos';
import { BotaoDeAcao } from './botao-de-acao';

export interface PropsDoHistoricoDaFichaAberta {
  nome: string;
  entradas: EntradaDoHistorico[];
  // Mensagem do que acabou de acontecer, como "Versão 5 criada: restaurada a versão 2".
  mensagem: string | null;
  // Sem esta função o histórico só lê, sem botão Restaurar.
  aoRestaurar?: (numero: number) => void;
  aoVoltar: () => void;
}

// As versões da mais recente para a mais antiga. Restaurar uma versão anterior pede confirmação,
// dizendo quantas mudanças posteriores deixam de valer (CE16); nada é apagado (FL04, FI-4).
export function HistoricoDaFichaAberta({
  nome,
  entradas,
  mensagem,
  aoRestaurar,
  aoVoltar,
}: PropsDoHistoricoDaFichaAberta) {
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const atual = Math.max(...entradas.map((entrada) => entrada.numero));
  const confirmar = (numero: number) => {
    setConfirmando(null);
    aoRestaurar?.(numero);
  };

  return (
    <ScrollView>
      <BotaoDeAcao
        rotulo={textos.fichas.voltarParaFicha}
        nome={textos.fichas.voltarParaFicha}
        aoTocar={aoVoltar}
      />
      <Text style={estilos.titulo}>{textos.fichas.tituloDoHistorico(nome)}</Text>
      {mensagem !== null && <Text>{mensagem}</Text>}
      {confirmando !== null && (
        <ConfirmacaoDeRestauracao
          numero={confirmando}
          posteriores={atual - confirmando}
          aoConfirmar={() => confirmar(confirmando)}
          aoCancelar={() => setConfirmando(null)}
        />
      )}
      {[...entradas].reverse().map((entrada) => (
        <VersaoDoHistorico
          key={entrada.numero}
          entrada={entrada}
          aoRestaurar={
            aoRestaurar && entrada.podeRestaurar ? () => setConfirmando(entrada.numero) : undefined
          }
        />
      ))}
    </ScrollView>
  );
}

interface PropsDaVersaoDoHistorico {
  entrada: EntradaDoHistorico;
  aoRestaurar?: () => void;
}

function VersaoDoHistorico({ entrada, aoRestaurar }: PropsDaVersaoDoHistorico) {
  return (
    <View style={estilos.versao}>
      <Text style={estilos.numero}>{textos.fichas.versao(entrada.numero)}</Text>
      <Text>{textos.fichas.autorDaVersao(entrada.autor)}</Text>
      <Text>{textos.fichas.dataDaVersao(formatarDataEHora(entrada.criadaEm))}</Text>
      {entrada.motivo !== null && <Text>{textos.fichas.motivoDaVersao(entrada.motivo)}</Text>}
      <Text>{entrada.resumo}</Text>
      {aoRestaurar && (
        <BotaoDeAcao
          rotulo={textos.fichas.restaurar}
          nome={textos.fichas.restaurarVersao(entrada.numero)}
          aoTocar={aoRestaurar}
        />
      )}
    </View>
  );
}

interface PropsDaConfirmacao {
  numero: number;
  posteriores: number;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

function ConfirmacaoDeRestauracao({
  numero,
  posteriores,
  aoConfirmar,
  aoCancelar,
}: PropsDaConfirmacao) {
  return (
    <View style={estilos.versao}>
      <Text>{textos.fichas.confirmarRestauracao(numero, posteriores)}</Text>
      <BotaoDeAcao
        rotulo={textos.fichas.confirmarRestauracaoBotao}
        nome={textos.fichas.confirmarRestauracaoBotao}
        aoTocar={aoConfirmar}
      />
      <Pressable role="button" aria-label={textos.fichas.cancelarRestauracao} onPress={aoCancelar}>
        <Text>{textos.fichas.cancelarRestauracao}</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 20, fontWeight: '600', padding: 16 },
  versao: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  numero: { fontSize: 16 },
});

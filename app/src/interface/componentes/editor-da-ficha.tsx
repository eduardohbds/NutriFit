import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { BuscarExercicios } from '../../aplicacao/casos-de-uso/buscar-exercicios';
import {
  comExercicio,
  comTexto,
  type CampoDeSeries,
  type ItemEmEdicao,
  type RascunhoDaFicha,
  type RotinaEmEdicao,
} from '../../aplicacao/rascunho-da-ficha';
import { textos } from '../textos';
import { EscolhaDeExercicio } from './escolha-de-exercicio';

const CAMPOS: CampoDeSeries[] = ['quantidade', 'meta', 'carga', 'tecnica', 'descanso'];

interface Linha {
  rotina: number;
  item: number;
}

export interface PropsDoEditorDaFicha {
  rascunho: RascunhoDaFicha;
  buscarExercicios: BuscarExercicios;
  aoMudar: (rascunho: RascunhoDaFicha) => void;
  aoCancelar: () => void;
}

// Edita um rascunho em memória: nada é gravado aqui (RB02, FI-4). Gravar é da US-007c3.
export function EditorDaFicha({
  rascunho,
  buscarExercicios,
  aoMudar,
  aoCancelar,
}: PropsDoEditorDaFicha) {
  const [escolhendo, setEscolhendo] = useState<Linha | null>(null);

  if (escolhendo) {
    const escolher = (exercicio: Parameters<typeof comExercicio>[3]) => {
      aoMudar(comExercicio(rascunho, escolhendo.rotina, escolhendo.item, exercicio));
      setEscolhendo(null);
    };
    return (
      <EscolhaDeExercicio
        buscarExercicios={buscarExercicios}
        aoEscolher={escolher}
        aoVoltar={() => setEscolhendo(null)}
      />
    );
  }

  return (
    <ScrollView>
      <Pressable role="button" aria-label={textos.fichas.cancelarEdicao} onPress={aoCancelar}>
        <Text>{textos.fichas.cancelarEdicao}</Text>
      </Pressable>
      <Text style={estilos.titulo}>{rascunho.nome}</Text>
      {rascunho.rotinas.map((rotina, indice) => (
        <RotinaEditavel
          key={rotina.nome}
          rotina={rotina}
          aoTrocar={(item) => setEscolhendo({ rotina: indice, item })}
          aoDigitar={(item, campo, texto) =>
            aoMudar(comTexto(rascunho, indice, item, campo, texto))
          }
        />
      ))}
    </ScrollView>
  );
}

interface PropsDaRotinaEditavel {
  rotina: RotinaEmEdicao;
  aoTrocar: (item: number) => void;
  aoDigitar: (item: number, campo: CampoDeSeries, texto: string) => void;
}

function RotinaEditavel({ rotina, aoTrocar, aoDigitar }: PropsDaRotinaEditavel) {
  return (
    <View style={estilos.rotina}>
      <Text style={estilos.nome}>{rotina.nome}</Text>
      {rotina.itens.map((item, posicao) => (
        <LinhaEditavel
          key={posicao}
          rotina={rotina.nome}
          ordem={posicao + 1}
          item={item}
          aoTrocar={() => aoTrocar(posicao)}
          aoDigitar={(campo, texto) => aoDigitar(posicao, campo, texto)}
        />
      ))}
    </View>
  );
}

interface PropsDaLinhaEditavel {
  rotina: string;
  ordem: number;
  item: ItemEmEdicao;
  aoTrocar: () => void;
  aoDigitar: (campo: CampoDeSeries, texto: string) => void;
}

function LinhaEditavel({ rotina, ordem, item, aoTrocar, aoDigitar }: PropsDaLinhaEditavel) {
  return (
    <View style={estilos.linha}>
      <Text>{textos.fichas.exercicio(ordem, item.exercicioNome)}</Text>
      <Pressable
        role="button"
        aria-label={textos.fichas.trocarExercicio(rotina, ordem)}
        onPress={aoTrocar}
      >
        <Text>{textos.fichas.trocarExercicio(rotina, ordem)}</Text>
      </Pressable>
      {CAMPOS.map((campo) => (
        <View key={campo}>
          <Text>{textos.fichas.campo[campo]}</Text>
          <TextInput
            aria-label={textos.fichas.rotuloDoCampo(textos.fichas.campo[campo], rotina, ordem)}
            value={item.textos[campo]}
            onChangeText={(texto) => aoDigitar(campo, texto)}
            style={estilos.campo}
          />
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 20, fontWeight: '600', padding: 16 },
  rotina: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  nome: { fontSize: 16 },
  linha: { paddingVertical: 8 },
  campo: { borderWidth: 1, padding: 6 },
});

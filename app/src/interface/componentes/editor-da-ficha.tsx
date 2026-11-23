import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import type { BuscarExercicios } from '../../aplicacao/casos-de-uso/buscar-exercicios';
import {
  comExercicio,
  comGrupo,
  comNome,
  comObservacoes,
  comTexto,
  comUnilateral,
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

// O que o usuário pode mudar numa linha; cada função devolve o rascunho novo à tela.
interface EdicoesDaLinha {
  trocar: () => void;
  digitar: (campo: CampoDeSeries, texto: string) => void;
  grupo: (texto: string) => void;
  observacoes: (texto: string) => void;
  unilateral: (valor: boolean) => void;
}

export interface PropsDoEditorDaFicha {
  rascunho: RascunhoDaFicha;
  buscarExercicios: BuscarExercicios;
  aviso: string | null;
  aoMudar: (rascunho: RascunhoDaFicha) => void;
  // Sem esta função não há botão de salvar.
  aoSalvar?: (motivo: string) => void;
  aoCancelar: () => void;
}

// Edita um rascunho em memória: nada é gravado aqui (RB02, FI-4). Quem grava é a tela, pelo
// SalvarFicha, quando o usuário toca em Salvar.
export function EditorDaFicha({
  rascunho,
  buscarExercicios,
  aviso,
  aoMudar,
  aoSalvar,
  aoCancelar,
}: PropsDoEditorDaFicha) {
  const [escolhendo, setEscolhendo] = useState<Linha | null>(null);
  const [motivo, setMotivo] = useState('');

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

  const edicoesDe = (rotina: number, item: number): EdicoesDaLinha => ({
    trocar: () => setEscolhendo({ rotina, item }),
    digitar: (campo, texto) => aoMudar(comTexto(rascunho, rotina, item, campo, texto)),
    grupo: (texto) => aoMudar(comGrupo(rascunho, rotina, item, texto)),
    observacoes: (texto) => aoMudar(comObservacoes(rascunho, rotina, item, texto)),
    unilateral: (valor) => aoMudar(comUnilateral(rascunho, rotina, item, valor)),
  });

  return (
    <ScrollView>
      <Pressable role="button" aria-label={textos.fichas.cancelarEdicao} onPress={aoCancelar}>
        <Text>{textos.fichas.cancelarEdicao}</Text>
      </Pressable>
      <TextInput
        aria-label={textos.fichas.nomeDaFicha}
        value={rascunho.nome}
        onChangeText={(nome) => aoMudar(comNome(rascunho, nome))}
        style={estilos.titulo}
      />
      {aviso !== null && <Text>{aviso}</Text>}
      {rascunho.rotinas.map((rotina, indice) => (
        <RotinaEditavel
          key={rotina.nome}
          rotina={rotina}
          edicoesDe={(item) => edicoesDe(indice, item)}
        />
      ))}
      <TextInput
        aria-label={textos.fichas.motivo}
        value={motivo}
        onChangeText={setMotivo}
        style={estilos.campo}
      />
      {aoSalvar && (
        <Pressable role="button" aria-label={textos.fichas.salvar} onPress={() => aoSalvar(motivo)}>
          <Text>{textos.fichas.salvar}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

interface PropsDaRotinaEditavel {
  rotina: RotinaEmEdicao;
  edicoesDe: (item: number) => EdicoesDaLinha;
}

function RotinaEditavel({ rotina, edicoesDe }: PropsDaRotinaEditavel) {
  return (
    <View style={estilos.rotina}>
      <Text style={estilos.nome}>{rotina.nome}</Text>
      {rotina.itens.map((item, posicao) => (
        <LinhaEditavel
          key={posicao}
          rotina={rotina.nome}
          ordem={posicao + 1}
          item={item}
          edicoes={edicoesDe(posicao)}
        />
      ))}
    </View>
  );
}

interface PropsDaLinhaEditavel {
  rotina: string;
  ordem: number;
  item: ItemEmEdicao;
  edicoes: EdicoesDaLinha;
}

const rotuloDe = (campo: string, rotina: string, ordem: number) =>
  textos.fichas.rotuloDoCampo(campo, rotina, ordem);

function LinhaEditavel({ rotina, ordem, item, edicoes }: PropsDaLinhaEditavel) {
  return (
    <View style={estilos.linha}>
      <Text>{textos.fichas.exercicio(ordem, item.exercicioNome)}</Text>
      <Pressable
        role="button"
        aria-label={textos.fichas.trocarExercicio(rotina, ordem)}
        onPress={edicoes.trocar}
      >
        <Text>{textos.fichas.trocarExercicio(rotina, ordem)}</Text>
      </Pressable>
      {CAMPOS.map((campo) => (
        <View key={campo}>
          <Text>{textos.fichas.campo[campo]}</Text>
          <TextInput
            aria-label={rotuloDe(textos.fichas.campo[campo], rotina, ordem)}
            value={item.textos[campo]}
            onChangeText={(texto) => edicoes.digitar(campo, texto)}
            style={estilos.campo}
          />
        </View>
      ))}
      <Text>{textos.fichas.campo.grupo}</Text>
      <TextInput
        aria-label={rotuloDe(textos.fichas.campo.grupo, rotina, ordem)}
        value={item.grupo}
        onChangeText={edicoes.grupo}
        style={estilos.campo}
      />
      <Text>{textos.fichas.campo.unilateral}</Text>
      <Switch
        aria-label={rotuloDe(textos.fichas.campo.unilateral, rotina, ordem)}
        value={item.unilateral}
        onValueChange={edicoes.unilateral}
      />
      <Text>{textos.fichas.campo.observacoes}</Text>
      <TextInput
        aria-label={rotuloDe(textos.fichas.campo.observacoes, rotina, ordem)}
        value={item.observacoes}
        onChangeText={edicoes.observacoes}
        style={estilos.campo}
      />
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

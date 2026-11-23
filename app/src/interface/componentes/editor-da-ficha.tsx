import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import type { BuscarExercicios } from '../../aplicacao/casos-de-uso/buscar-exercicios';
import {
  comExercicio,
  comGrupo,
  comLinhaMovida,
  comLinhaNova,
  comNome,
  comRotinaMovida,
  comRotinaNova,
  comRotinaRenomeada,
  comObservacoes,
  comTexto,
  comUnilateral,
  podeIncluirRotina,
  semLinha,
  semRotina,
  type CampoDeSeries,
  type ItemEmEdicao,
  type RascunhoDaFicha,
  type RotinaEmEdicao,
} from '../../aplicacao/rascunho-da-ficha';
import { textos } from '../textos';
import { BotaoDeAcao } from './botao-de-acao';
import { EscolhaDeExercicio } from './escolha-de-exercicio';

const CAMPOS: CampoDeSeries[] = ['quantidade', 'meta', 'carga', 'tecnica', 'descanso'];

// A linha a trocar, ou `item` nulo quando a escolha é de uma linha nova no fim da rotina.
interface Escolha {
  rotina: number;
  item: number | null;
}

// O que o usuário pode mudar numa rotina; subir e descer faltam na primeira e na última.
interface EdicoesDaRotina {
  renomear: (nome: string) => void;
  subir?: () => void;
  descer?: () => void;
  remover: () => void;
  adicionarLinha: () => void;
}

// O que o usuário pode mudar numa linha; cada função devolve o rascunho novo à tela.
interface EdicoesDaLinha {
  trocar: () => void;
  digitar: (campo: CampoDeSeries, texto: string) => void;
  grupo: (texto: string) => void;
  observacoes: (texto: string) => void;
  unilateral: (valor: boolean) => void;
  // Ausentes na primeira linha (subir) e na última (descer), que não têm para onde ir.
  subir?: () => void;
  descer?: () => void;
  remover: () => void;
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
  const [escolhendo, setEscolhendo] = useState<Escolha | null>(null);
  const [motivo, setMotivo] = useState('');

  if (escolhendo) {
    const escolher = (exercicio: Parameters<typeof comExercicio>[3]) => {
      const { rotina, item } = escolhendo;
      aoMudar(
        item === null
          ? comLinhaNova(rascunho, rotina, exercicio)
          : comExercicio(rascunho, rotina, item, exercicio),
      );
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

  const edicoesDe = (rotina: number, item: number, ultimo: number): EdicoesDaLinha => ({
    trocar: () => setEscolhendo({ rotina, item }),
    digitar: (campo, texto) => aoMudar(comTexto(rascunho, rotina, item, campo, texto)),
    grupo: (texto) => aoMudar(comGrupo(rascunho, rotina, item, texto)),
    observacoes: (texto) => aoMudar(comObservacoes(rascunho, rotina, item, texto)),
    unilateral: (valor) => aoMudar(comUnilateral(rascunho, rotina, item, valor)),
    subir: item > 0 ? () => aoMudar(comLinhaMovida(rascunho, rotina, item, -1)) : undefined,
    descer: item < ultimo ? () => aoMudar(comLinhaMovida(rascunho, rotina, item, 1)) : undefined,
    remover: () => aoMudar(semLinha(rascunho, rotina, item)),
  });

  const edicoesDaRotina = (rotina: number): EdicoesDaRotina => ({
    renomear: (nome) => aoMudar(comRotinaRenomeada(rascunho, rotina, nome)),
    subir: rotina > 0 ? () => aoMudar(comRotinaMovida(rascunho, rotina, -1)) : undefined,
    descer:
      rotina < rascunho.rotinas.length - 1
        ? () => aoMudar(comRotinaMovida(rascunho, rotina, 1))
        : undefined,
    remover: () => aoMudar(semRotina(rascunho, rotina)),
    adicionarLinha: () => setEscolhendo({ rotina, item: null }),
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
          key={indice}
          rotina={rotina}
          posicao={indice + 1}
          edicoes={edicoesDaRotina(indice)}
          edicoesDe={(item) => edicoesDe(indice, item, rotina.itens.length - 1)}
        />
      ))}
      {podeIncluirRotina(rascunho) && (
        <BotaoDeAcao
          rotulo={textos.fichas.novaRotina}
          nome={textos.fichas.novaRotina}
          aoTocar={() => aoMudar(comRotinaNova(rascunho))}
        />
      )}
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
  posicao: number;
  edicoes: EdicoesDaRotina;
  edicoesDe: (item: number) => EdicoesDaLinha;
}

function RotinaEditavel({ rotina, posicao, edicoes, edicoesDe }: PropsDaRotinaEditavel) {
  return (
    <View style={estilos.rotina}>
      <TextInput
        aria-label={textos.fichas.nomeDaRotina(posicao)}
        value={rotina.nome}
        onChangeText={edicoes.renomear}
        style={estilos.nome}
      />
      <View style={estilos.movimentos}>
        {edicoes.subir && (
          <BotaoDeAcao
            rotulo={textos.fichas.subir}
            nome={textos.fichas.subirRotina(rotina.nome)}
            aoTocar={edicoes.subir}
          />
        )}
        {edicoes.descer && (
          <BotaoDeAcao
            rotulo={textos.fichas.descer}
            nome={textos.fichas.descerRotina(rotina.nome)}
            aoTocar={edicoes.descer}
          />
        )}
        <BotaoDeAcao
          rotulo={textos.fichas.remover}
          nome={textos.fichas.removerRotina(rotina.nome)}
          aoTocar={edicoes.remover}
        />
      </View>
      {rotina.itens.map((item, posicao) => (
        <LinhaEditavel
          key={posicao}
          rotina={rotina.nome}
          ordem={posicao + 1}
          item={item}
          edicoes={edicoesDe(posicao)}
        />
      ))}
      <BotaoDeAcao
        rotulo={textos.fichas.adicionar}
        nome={textos.fichas.adicionarLinha(rotina.nome)}
        aoTocar={edicoes.adicionarLinha}
      />
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
      <View style={estilos.movimentos}>
        {edicoes.subir && (
          <BotaoDeAcao
            rotulo={textos.fichas.subir}
            nome={textos.fichas.subirLinha(rotina, ordem)}
            aoTocar={edicoes.subir}
          />
        )}
        {edicoes.descer && (
          <BotaoDeAcao
            rotulo={textos.fichas.descer}
            nome={textos.fichas.descerLinha(rotina, ordem)}
            aoTocar={edicoes.descer}
          />
        )}
        <BotaoDeAcao
          rotulo={textos.fichas.remover}
          nome={textos.fichas.removerLinha(rotina, ordem)}
          aoTocar={edicoes.remover}
        />
      </View>
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
  nome: { fontSize: 16, borderWidth: 1, padding: 6 },
  linha: { paddingVertical: 8 },
  campo: { borderWidth: 1, padding: 6 },
  movimentos: { flexDirection: 'row', gap: 12 },
});

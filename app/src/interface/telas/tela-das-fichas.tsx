import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type {
  FichaParaEdicao,
  ItemParaEdicao,
  LerFichaParaEdicao,
} from '../../aplicacao/casos-de-uso/ler-ficha-para-edicao';
import type { BuscarExercicios } from '../../aplicacao/casos-de-uso/buscar-exercicios';
import type { FichaDaLista, ListarFichas } from '../../aplicacao/casos-de-uso/listar-fichas';
import { rascunhoDaFicha, type RascunhoDaFicha } from '../../aplicacao/rascunho-da-ficha';
import { EditorDaFicha } from '../componentes/editor-da-ficha';
import { textos } from '../textos';

export interface PropsDaTelaDasFichas {
  listarFichas: ListarFichas;
  lerFichaParaEdicao: LerFichaParaEdicao;
  // Sem a busca de exercícios a tela fica só de leitura: a edição precisa do catálogo.
  buscarExercicios?: BuscarExercicios;
}

export function TelaDasFichas({
  listarFichas,
  lerFichaParaEdicao,
  buscarExercicios,
}: PropsDaTelaDasFichas) {
  const [fichas, setFichas] = useState<FichaDaLista[] | null>(null);
  const [aberta, setAberta] = useState<FichaParaEdicao | null>(null);
  const [rascunho, setRascunho] = useState<RascunhoDaFicha | null>(null);
  const [erro, setErro] = useState<unknown>(null);

  useEffect(() => {
    listarFichas.executar().then(setFichas, (falha: unknown) => setErro(falha));
  }, [listarFichas]);

  // A falha ao ler chega ao limite de erro, que registra e avisa (nunca engolir).
  if (erro) throw erro;

  const abrir = (id: FichaDaLista['id']) => {
    lerFichaParaEdicao.executar(id).then(setAberta, (falha: unknown) => setErro(falha));
  };

  if (aberta && rascunho && buscarExercicios) {
    return (
      <EditorDaFicha
        rascunho={rascunho}
        buscarExercicios={buscarExercicios}
        aoMudar={setRascunho}
        aoCancelar={() => setRascunho(null)}
      />
    );
  }
  if (aberta) {
    const editar = buscarExercicios ? () => setRascunho(rascunhoDaFicha(aberta)) : undefined;
    return <FichaAberta ficha={aberta} aoVoltar={() => setAberta(null)} aoEditar={editar} />;
  }
  return <ListaDeFichas fichas={fichas ?? []} aoAbrir={abrir} />;
}

interface PropsDaLista {
  fichas: FichaDaLista[];
  aoAbrir: (id: FichaDaLista['id']) => void;
}

function ListaDeFichas(props: PropsDaLista) {
  return (
    <ScrollView>
      <Text style={estilos.titulo}>{textos.fichas.titulo}</Text>
      {props.fichas.map((ficha) => (
        <Pressable
          key={ficha.id.valor}
          role="button"
          aria-label={textos.fichas.abrirFicha(ficha.nome)}
          onPress={() => props.aoAbrir(ficha.id)}
          style={estilos.linha}
        >
          <Text style={estilos.nome}>{ficha.nome}</Text>
          <Text>{textos.fichas.situacao[ficha.situacao as 'ativa' | 'inativa']}</Text>
          <Text>{textos.fichas.versao(ficha.versaoAtual)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const nomeDoDia = (dia: number): string => textos.fichas.diasDaSemana[dia - 1];

interface PropsDaFichaAberta {
  ficha: FichaParaEdicao;
  aoVoltar: () => void;
  aoEditar?: () => void;
}

function FichaAberta(props: PropsDaFichaAberta) {
  return (
    <ScrollView>
      <Pressable role="button" aria-label={textos.fichas.voltar} onPress={props.aoVoltar}>
        <Text>{textos.fichas.voltar}</Text>
      </Pressable>
      {props.aoEditar && (
        <Pressable role="button" aria-label={textos.fichas.editar} onPress={props.aoEditar}>
          <Text>{textos.fichas.editar}</Text>
        </Pressable>
      )}
      <Text style={estilos.titulo}>{props.ficha.nome}</Text>
      {props.ficha.rotinas.map((rotina) => (
        <View key={rotina.nome} style={estilos.linha}>
          <Text style={estilos.nome}>{rotina.nome}</Text>
          {rotina.diaDaSemana !== null && (
            <Text>{textos.fichas.diaDaSemana(nomeDoDia(rotina.diaDaSemana))}</Text>
          )}
          {rotina.itens.map((item) => (
            <LinhaDaFicha key={item.ordem} item={item} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function LinhaDaFicha({ item }: { item: ItemParaEdicao }) {
  const { listas } = item;
  return (
    <View style={estilos.item}>
      <Text>{textos.fichas.exercicio(item.ordem, item.exercicioNome)}</Text>
      {item.grupo !== null && <Text>{textos.fichas.grupo(item.grupo)}</Text>}
      <Text>{textos.fichas.series(listas.quantidade)}</Text>
      <Text>{textos.fichas.meta(listas.meta)}</Text>
      {listas.carga !== null && <Text>{textos.fichas.carga(listas.carga)}</Text>}
      {listas.tecnica !== null && <Text>{textos.fichas.tecnica(listas.tecnica)}</Text>}
      {listas.descanso !== null && <Text>{textos.fichas.descanso(listas.descanso)}</Text>}
      {item.unilateral && <Text>{textos.fichas.unilateral}</Text>}
      {item.observacoes !== null && <Text>{textos.fichas.observacoes(item.observacoes)}</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 20, fontWeight: '600', padding: 16 },
  linha: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  nome: { fontSize: 16 },
  item: { paddingVertical: 6 },
});

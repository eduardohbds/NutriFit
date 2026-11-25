import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type {
  FichaParaEdicao,
  ItemParaEdicao,
  LerFichaParaEdicao,
} from '../../aplicacao/casos-de-uso/ler-ficha-para-edicao';
import type { BuscarExercicios } from '../../aplicacao/casos-de-uso/buscar-exercicios';
import type { ArquivarFicha } from '../../aplicacao/casos-de-uso/arquivar-ficha';
import type { AtivarFicha } from '../../aplicacao/casos-de-uso/ativar-ficha';
import type { DuplicarFicha } from '../../aplicacao/casos-de-uso/duplicar-ficha';
import type {
  ComparacaoDeVersoes,
  CompararVersoes,
} from '../../aplicacao/casos-de-uso/comparar-versoes';
import type {
  EntradaDoHistorico,
  HistoricoDaFicha,
} from '../../aplicacao/casos-de-uso/historico-da-ficha';
import type { RestaurarVersao } from '../../aplicacao/casos-de-uso/restaurar-versao';
import type { SalvarFicha } from '../../aplicacao/casos-de-uso/salvar-ficha';
import type { FichaDaLista, ListarFichas } from '../../aplicacao/casos-de-uso/listar-fichas';
import {
  rascunhoDaFicha,
  rascunhoDeFichaNova,
  type RascunhoDaFicha,
  type TipoDeRotina,
} from '../../aplicacao/rascunho-da-ficha';
import { ComparacaoDeVersoesAberta } from '../componentes/comparacao-de-versoes-aberta';
import { EditorDaFicha } from '../componentes/editor-da-ficha';
import { EscolhaDoTipoDeRotina } from '../componentes/escolha-do-tipo-de-rotina';
import { HistoricoDaFichaAberta } from '../componentes/historico-da-ficha-aberta';
import { ListaDeFichas, type AcoesDaLista } from '../componentes/lista-de-fichas';
import { textos } from '../textos';
import { salvarRascunho } from './salvar-rascunho';

export interface PropsDaTelaDasFichas {
  listarFichas: ListarFichas;
  lerFichaParaEdicao: LerFichaParaEdicao;
  // Sem a busca de exercícios a tela fica só de leitura: a edição precisa do catálogo.
  buscarExercicios?: BuscarExercicios;
  // Sem o SalvarFicha a edição não oferece o botão de salvar.
  salvarFicha?: SalvarFicha;
  // Sem estes casos de uso a lista não oferece o botão correspondente.
  ativarFicha?: AtivarFicha;
  duplicarFicha?: DuplicarFicha;
  arquivarFicha?: ArquivarFicha;
  // Sem o histórico a ficha aberta não oferece Histórico; sem a restauração o histórico só lê.
  historicoDaFicha?: HistoricoDaFicha;
  restaurarVersao?: RestaurarVersao;
  // Sem a comparação o histórico não oferece escolher versões.
  compararVersoes?: CompararVersoes;
}

export function TelaDasFichas({
  listarFichas,
  lerFichaParaEdicao,
  buscarExercicios,
  salvarFicha,
  ativarFicha,
  duplicarFicha,
  arquivarFicha,
  historicoDaFicha,
  restaurarVersao,
  compararVersoes,
}: PropsDaTelaDasFichas) {
  const [fichas, setFichas] = useState<FichaDaLista[] | null>(null);
  const [aberta, setAberta] = useState<FichaParaEdicao | null>(null);
  const [rascunho, setRascunho] = useState<RascunhoDaFicha | null>(null);
  const [historico, setHistorico] = useState<EntradaDoHistorico[] | null>(null);
  const [comparacao, setComparacao] = useState<ComparacaoDeVersoes | null>(null);
  const [mensagemDoHistorico, setMensagemDoHistorico] = useState<string | null>(null);
  const [escolhendoTipo, setEscolhendoTipo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [versaoSalva, setVersaoSalva] = useState<number | null>(null);
  const [erro, setErro] = useState<unknown>(null);

  const carregarFichas = useCallback(() => {
    listarFichas.executar().then(setFichas, (falha: unknown) => setErro(falha));
  }, [listarFichas]);
  useEffect(carregarFichas, [carregarFichas]);

  // A falha ao ler chega ao limite de erro, que registra e avisa (nunca engolir).
  if (erro) throw erro;

  const abrir = (id: FichaDaLista['id']) => {
    lerFichaParaEdicao.executar(id).then(setAberta, (falha: unknown) => setErro(falha));
  };

  const salvar = (motivo: string) => {
    if (!rascunho || !salvarFicha) return;
    salvarRascunho(salvarFicha, lerFichaParaEdicao, rascunho, motivo).then(
      (resultado) => {
        if ('aviso' in resultado) {
          setAviso(resultado.aviso);
          return;
        }
        setAberta(resultado.ficha);
        setRascunho(null);
        setAviso(null);
        setVersaoSalva(resultado.numero);
        carregarFichas();
      },
      (falha: unknown) => setErro(falha),
    );
  };
  // Ativar, duplicar e arquivar só mudam situação ou inserem (FI-4); a lista é lida de novo depois,
  // e a falha chega ao limite de erro.
  const mudar = (acao: Promise<unknown>) => {
    acao.then(carregarFichas, (falha: unknown) => setErro(falha));
  };
  const abrirHistorico = (ficha: FichaParaEdicao) => {
    historicoDaFicha
      ?.executar(ficha.fichaId)
      .then(setHistorico, (falha: unknown) => setErro(falha));
  };
  // Restaurar só insere uma versão nova (FL04, RB02): depois a ficha, o histórico e a lista são
  // lidos de novo, e a tela fica no histórico mostrando a versão criada.
  const restaurar = (ficha: FichaParaEdicao, numero: number) => {
    if (!restaurarVersao || !historicoDaFicha) return;
    const { fichaId } = ficha;
    restaurarVersao
      .executar({ fichaId, numero })
      .then(async (resultado) => {
        setAberta(await lerFichaParaEdicao.executar(fichaId));
        setHistorico(await historicoDaFicha.executar(fichaId));
        setMensagemDoHistorico(textos.fichas.versaoRestaurada(resultado.versao.numero, numero));
        carregarFichas();
      })
      .catch((falha: unknown) => setErro(falha));
  };
  const comparar = (ficha: FichaParaEdicao, primeira: number, segunda: number) => {
    const { fichaId } = ficha;
    compararVersoes
      ?.executar({ fichaId, numeroA: primeira, numeroB: segunda })
      .then(setComparacao, (falha: unknown) => setErro(falha));
  };
  const cancelar = () => {
    setRascunho(null);
    setAviso(null);
  };

  if (rascunho && buscarExercicios) {
    return (
      <EditorDaFicha
        rascunho={rascunho}
        buscarExercicios={buscarExercicios}
        aviso={aviso}
        aoMudar={setRascunho}
        aoSalvar={salvarFicha ? salvar : undefined}
        aoCancelar={cancelar}
      />
    );
  }
  if (escolhendoTipo) {
    const escolher = (tipo: TipoDeRotina) => {
      setRascunho(rascunhoDeFichaNova(tipo));
      setEscolhendoTipo(false);
    };
    return (
      <EscolhaDoTipoDeRotina aoEscolher={escolher} aoCancelar={() => setEscolhendoTipo(false)} />
    );
  }
  if (aberta && comparacao) {
    return (
      <ComparacaoDeVersoesAberta comparacao={comparacao} aoVoltar={() => setComparacao(null)} />
    );
  }
  if (aberta && historico) {
    const voltarParaFicha = () => {
      setHistorico(null);
      setMensagemDoHistorico(null);
    };
    return (
      <HistoricoDaFichaAberta
        nome={aberta.nome}
        entradas={historico}
        mensagem={mensagemDoHistorico}
        aoRestaurar={restaurarVersao ? (numero) => restaurar(aberta, numero) : undefined}
        aoComparar={compararVersoes ? (a, b) => comparar(aberta, a, b) : undefined}
        aoVoltar={voltarParaFicha}
      />
    );
  }
  if (aberta) {
    const editar = buscarExercicios ? () => setRascunho(rascunhoDaFicha(aberta)) : undefined;
    const voltar = () => {
      setAberta(null);
      setVersaoSalva(null);
    };
    return (
      <FichaAberta
        ficha={aberta}
        versaoSalva={versaoSalva}
        aoVoltar={voltar}
        aoEditar={editar}
        aoAbrirHistorico={historicoDaFicha ? () => abrirHistorico(aberta) : undefined}
      />
    );
  }
  const podeCriar = buscarExercicios && salvarFicha;
  const acoes: AcoesDaLista = {
    nova: podeCriar ? () => setEscolhendoTipo(true) : undefined,
    ativar: ativarFicha && ((ficha) => mudar(ativarFicha.executar(ficha.id))),
    duplicar: duplicarFicha && ((ficha) => mudar(duplicarFicha.executar(ficha.id))),
    arquivar: arquivarFicha && ((ficha) => mudar(arquivarFicha.executar(ficha.id))),
  };
  return <ListaDeFichas fichas={fichas ?? []} aoAbrir={abrir} acoes={acoes} />;
}

const nomeDoDia = (dia: number): string => textos.fichas.diasDaSemana[dia - 1];

interface PropsDaFichaAberta {
  ficha: FichaParaEdicao;
  aoVoltar: () => void;
  aoEditar?: () => void;
  aoAbrirHistorico?: () => void;
  versaoSalva: number | null;
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
      {props.aoAbrirHistorico && (
        <Pressable
          role="button"
          aria-label={textos.fichas.historico}
          onPress={props.aoAbrirHistorico}
        >
          <Text>{textos.fichas.historico}</Text>
        </Pressable>
      )}
      <Text style={estilos.titulo}>{props.ficha.nome}</Text>
      {props.versaoSalva !== null && <Text>{textos.fichas.versaoSalva(props.versaoSalva)}</Text>}
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

import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ConcluirSerieDaSessao } from '../../aplicacao/casos-de-uso/concluir-serie-da-sessao';
import type {
  ExercicioDaSessaoParaTela,
  LerSessaoEmAndamento,
  SessaoParaTela,
} from '../../aplicacao/casos-de-uso/ler-sessao-em-andamento';
import type { PrepararSerie, SerieSugerida } from '../../aplicacao/casos-de-uso/preparar-serie';
import type { SerieExecutada } from '../../dominio/sessao';
import { FormularioDaSerie } from '../componentes/formulario-da-serie';
import { formatarDataEHora } from '../formatacao';
import { textos } from '../textos';

export interface PropsDaTelaDaSessao {
  lerSessaoEmAndamento: LerSessaoEmAndamento;
  // Sem os dois a tela fica só de leitura.
  prepararSerie?: PrepararSerie;
  concluirSerie?: ConcluirSerieDaSessao;
}

interface Lida {
  sessao: SessaoParaTela | null;
  // A série sugerida de cada exercício, na ordem; lida junto, para o formulário já nascer preenchido.
  sugeridas: SerieSugerida[];
}

async function carregar(ler: LerSessaoEmAndamento, preparar?: PrepararSerie): Promise<Lida> {
  const sessao = await ler.executar();
  if (!sessao || !preparar) return { sessao, sugeridas: [] };
  const sugeridas = await Promise.all(
    sessao.exercicios.map((e) =>
      preparar.executar({
        exercicioId: e.exercicioId,
        sessaoId: sessao.sessaoId,
        posicao: e.series.length + 1,
        planejadas: e.planejadas,
      }),
    ),
  );
  return { sessao, sugeridas };
}

// O treino em andamento: a rotina e os exercícios como a versão da época os planejou, as séries
// já registradas e o formulário da próxima. A ficha só é lida (RB02, FI-4).
export function TelaDaSessao({
  lerSessaoEmAndamento,
  prepararSerie,
  concluirSerie,
}: PropsDaTelaDaSessao) {
  const [lida, setLida] = useState<Lida | null>(null);
  const [erro, setErro] = useState<unknown>(null);
  const recarregar = useCallback(() => {
    carregar(lerSessaoEmAndamento, prepararSerie)
      .then(setLida)
      .catch((falha: unknown) => setErro(falha));
  }, [lerSessaoEmAndamento, prepararSerie]);
  useEffect(recarregar, [recarregar]);

  // A falha ao ler chega ao limite de erro, que registra e avisa (nunca engolir).
  if (erro) throw erro;
  if (!lida) return null;
  if (!lida.sessao) return <SemSessao />;
  return <SessaoAberta lida={lida} concluirSerie={concluirSerie} aoGravar={recarregar} />;
}

function SemSessao() {
  return (
    <View>
      <Text>{textos.sessao.nenhuma}</Text>
      <Link href="/">{textos.sessao.voltarAoInicio}</Link>
    </View>
  );
}

interface PropsDaSessaoAberta {
  lida: Lida;
  concluirSerie?: ConcluirSerieDaSessao;
  aoGravar: () => void;
}

function SessaoAberta({ lida, concluirSerie, aoGravar }: PropsDaSessaoAberta) {
  const sessao = lida.sessao!;
  const treinoLivre = sessao.fichaNome === null && sessao.rotinaNome === null;
  return (
    <ScrollView>
      <Text style={estilos.titulo}>{textos.sessao.titulo}</Text>
      {treinoLivre && <Text>{textos.sessao.treinoLivre}</Text>}
      {sessao.fichaNome !== null && <Text>{textos.sessao.ficha(sessao.fichaNome)}</Text>}
      {sessao.rotinaNome !== null && <Text>{textos.sessao.rotina(sessao.rotinaNome)}</Text>}
      <Text>{textos.sessao.iniciadoEm(formatarDataEHora(sessao.inicio))}</Text>
      {sessao.exercicios.map((exercicio, posicao) => (
        <ExercicioAberto
          key={exercicio.id.valor}
          exercicio={exercicio}
          sugerida={lida.sugeridas[posicao] ?? null}
          concluirSerie={concluirSerie}
          aoGravar={aoGravar}
        />
      ))}
    </ScrollView>
  );
}

interface PropsDoExercicioAberto {
  exercicio: ExercicioDaSessaoParaTela;
  sugerida: SerieSugerida | null;
  concluirSerie?: ConcluirSerieDaSessao;
  aoGravar: () => void;
}

function ExercicioAberto({ exercicio, sugerida, concluirSerie, aoGravar }: PropsDoExercicioAberto) {
  return (
    <View style={estilos.item}>
      <Text>{textos.fichas.exercicio(exercicio.ordem, exercicio.nome)}</Text>
      {exercicio.listas && <Text>{textos.fichas.resumoDaLinha(exercicio.listas)}</Text>}
      {exercicio.series.map((serie, indice) => (
        <Text key={serie.id.valor}>{textoDaSerie(indice + 1, serie)}</Text>
      ))}
      {concluirSerie && (
        <FormularioDaSerie
          key={exercicio.series.length}
          exercicioDaSessaoId={exercicio.id}
          nome={exercicio.nome}
          unilateral={exercicio.unilateral}
          sugerida={sugerida}
          concluirSerie={concluirSerie}
          aoGravar={aoGravar}
        />
      )}
    </View>
  );
}

function textoDaSerie(numero: number, serie: SerieExecutada): string {
  const quilos = serie.carga?.emQuilos();
  const carga = quilos === undefined ? null : String(quilos).replace('.', ',');
  return textos.sessao.serieRegistrada(
    numero,
    carga,
    serie.repeticoes ?? serie.segundos,
    serie.rir,
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 20, fontWeight: '600', padding: 16 },
  item: { paddingVertical: 4 },
});

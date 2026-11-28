import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type {
  LerSessaoEmAndamento,
  SessaoParaTela,
} from '../../aplicacao/casos-de-uso/ler-sessao-em-andamento';
import { formatarDataEHora } from '../formatacao';
import { textos } from '../textos';

export interface PropsDaTelaDaSessao {
  lerSessaoEmAndamento: LerSessaoEmAndamento;
}

// O treino em andamento: a rotina e os exercícios como a versão da época os planejou. Só lê
// (RB02, FI-4); o registro de séries entra na US-013d2.
export function TelaDaSessao({ lerSessaoEmAndamento }: PropsDaTelaDaSessao) {
  const [lida, setLida] = useState<{ sessao: SessaoParaTela | null } | null>(null);
  const [erro, setErro] = useState<unknown>(null);

  useEffect(() => {
    lerSessaoEmAndamento
      .executar()
      .then((sessao) => setLida({ sessao }))
      .catch((falha: unknown) => setErro(falha));
  }, [lerSessaoEmAndamento]);

  // A falha ao ler chega ao limite de erro, que registra e avisa (nunca engolir).
  if (erro) throw erro;
  if (!lida) return null;
  return lida.sessao ? <SessaoAberta sessao={lida.sessao} /> : <SemSessao />;
}

function SemSessao() {
  return (
    <View>
      <Text>{textos.sessao.nenhuma}</Text>
      <Link href="/">{textos.sessao.voltarAoInicio}</Link>
    </View>
  );
}

function SessaoAberta({ sessao }: { sessao: SessaoParaTela }) {
  const treinoLivre = sessao.fichaNome === null && sessao.rotinaNome === null;
  return (
    <ScrollView>
      <Text style={estilos.titulo}>{textos.sessao.titulo}</Text>
      {treinoLivre && <Text>{textos.sessao.treinoLivre}</Text>}
      {sessao.fichaNome !== null && <Text>{textos.sessao.ficha(sessao.fichaNome)}</Text>}
      {sessao.rotinaNome !== null && <Text>{textos.sessao.rotina(sessao.rotinaNome)}</Text>}
      <Text>{textos.sessao.iniciadoEm(formatarDataEHora(sessao.inicio))}</Text>
      {sessao.exercicios.map((exercicio) => (
        <View key={exercicio.id.valor} style={estilos.item}>
          <Text>{textos.fichas.exercicio(exercicio.ordem, exercicio.nome)}</Text>
          {exercicio.listas && <Text>{textos.fichas.resumoDaLinha(exercicio.listas)}</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 20, fontWeight: '600', padding: 16 },
  item: { paddingVertical: 4 },
});

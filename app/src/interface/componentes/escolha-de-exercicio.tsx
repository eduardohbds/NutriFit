import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import type { BuscarExercicios } from '../../aplicacao/casos-de-uso/buscar-exercicios';
import type { ExercicioEscolhido } from '../../aplicacao/rascunho-da-ficha';
import type { ExercicioDoCatalogo } from '../../dominio/exercicio';
import { textos } from '../textos';

export interface PropsDaEscolhaDeExercicio {
  buscarExercicios: BuscarExercicios;
  aoEscolher: (exercicio: ExercicioEscolhido) => void;
  aoVoltar: () => void;
}

// Só os exercícios ativos do catálogo, por parte do nome ou de qualquer sinônimo (RB35).
export function EscolhaDeExercicio({
  buscarExercicios,
  aoEscolher,
  aoVoltar,
}: PropsDaEscolhaDeExercicio) {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<ExercicioDoCatalogo[] | null>(null);
  const [erro, setErro] = useState<unknown>(null);

  useEffect(() => {
    let atual = true;
    buscarExercicios.executar(busca).then(
      (achados) => {
        if (atual) setResultados(achados);
      },
      (falha: unknown) => setErro(falha),
    );
    return () => {
      atual = false;
    };
  }, [buscarExercicios, busca]);

  // A falha ao ler o catálogo chega ao limite de erro, que registra e avisa (nunca engolir).
  if (erro) throw erro;

  return (
    <ScrollView>
      <Pressable role="button" aria-label={textos.fichas.voltarParaEdicao} onPress={aoVoltar}>
        <Text>{textos.fichas.voltarParaEdicao}</Text>
      </Pressable>
      <TextInput
        aria-label={textos.fichas.buscarExercicio}
        value={busca}
        onChangeText={setBusca}
        style={estilos.busca}
      />
      {resultados?.length === 0 && <Text>{textos.fichas.semResultado}</Text>}
      {resultados?.map((exercicio) => (
        <Pressable
          key={exercicio.id.valor}
          role="button"
          aria-label={textos.fichas.escolherExercicio(exercicio.nome)}
          onPress={() => aoEscolher({ id: exercicio.id, nome: exercicio.nome })}
          style={estilos.opcao}
        >
          <Text>{exercicio.nome}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  busca: { borderWidth: 1, margin: 16, padding: 8 },
  opcao: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
});

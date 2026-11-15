import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { EditarGruposDoExercicio } from '../../aplicacao/casos-de-uso/editar-grupos-do-exercicio';
import type { ListarExerciciosDoCatalogo } from '../../aplicacao/casos-de-uso/listar-exercicios-do-catalogo';
import type { ExercicioDoCatalogo } from '../../dominio/exercicio';
import { EditorDeGrupos } from '../componentes/editor-de-grupos';
import { textos } from '../textos';

export interface PropsDaTelaDoCatalogo {
  listarExercicios: ListarExerciciosDoCatalogo;
  editarGrupos: EditarGruposDoExercicio;
}

export function TelaDoCatalogo({ listarExercicios, editarGrupos }: PropsDaTelaDoCatalogo) {
  const [exercicios, setExercicios] = useState<ExercicioDoCatalogo[]>([]);
  const [editando, setEditando] = useState<ExercicioDoCatalogo | null>(null);
  const [erro, setErro] = useState<unknown>(null);

  const carregar = useCallback(() => {
    listarExercicios.executar().then(setExercicios, (falha: unknown) => setErro(falha));
  }, [listarExercicios]);
  useEffect(carregar, [carregar]);

  // A falha ao ler o catálogo chega ao limite de erro, que registra e avisa (nunca engolir).
  if (erro) throw erro;

  if (editando) {
    return (
      <ScrollView>
        <Text style={estilos.titulo}>{editando.nome}</Text>
        <EditorDeGrupos
          exercicio={editando}
          editarGrupos={editarGrupos}
          aoSalvar={() => {
            setEditando(null);
            carregar();
          }}
          aoCancelar={() => setEditando(null)}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView>
      <Text style={estilos.titulo}>{textos.catalogo.titulo}</Text>
      {exercicios.map((exercicio) => (
        <Pressable
          key={exercicio.id.valor}
          role="button"
          aria-label={textos.catalogo.editarGrupos(exercicio.nome)}
          onPress={() => setEditando(exercicio)}
          style={estilos.linha}
        >
          <Text style={estilos.nome}>{exercicio.nome}</Text>
          <GruposDoExercicio exercicio={exercicio} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

function GruposDoExercicio({ exercicio }: { exercicio: ExercicioDoCatalogo }) {
  const { gruposDiretos, gruposIndiretos } = exercicio;
  if (gruposDiretos.length === 0 && gruposIndiretos.length === 0)
    return <Text>{textos.catalogo.semGrupos}</Text>;
  return (
    <View>
      {gruposDiretos.length > 0 && <Text>{textos.catalogo.diretos(gruposDiretos)}</Text>}
      {gruposIndiretos.length > 0 && <Text>{textos.catalogo.indiretos(gruposIndiretos)}</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 20, fontWeight: '600', padding: 16 },
  linha: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  nome: { fontSize: 16 },
});

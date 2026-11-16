import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { EditarGruposDoExercicio } from '../../aplicacao/casos-de-uso/editar-grupos-do-exercicio';
import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type { ExercicioDoCatalogo } from '../../dominio/exercicio';
import { GRUPOS_MUSCULARES } from '../../dominio/grupo-muscular';
import { textos } from '../textos';

export interface PropsDoEditorDeGrupos {
  exercicio: ExercicioDoCatalogo;
  editarGrupos: EditarGruposDoExercicio;
  aoSalvar: () => void;
  aoCancelar: () => void;
}

function alternar(lista: string[], grupo: string): string[] {
  return lista.includes(grupo) ? lista.filter((g) => g !== grupo) : [...lista, grupo];
}

// Oferece só os 16 grupos fixos. Um grupo marcado num papel trava o outro: a regra VE20 também é
// barrada no caso de uso, e aqui a tela só evita o erro.
export function EditorDeGrupos({
  exercicio,
  editarGrupos,
  aoSalvar,
  aoCancelar,
}: PropsDoEditorDeGrupos) {
  const [diretos, setDiretos] = useState(exercicio.gruposDiretos);
  const [indiretos, setIndiretos] = useState(exercicio.gruposIndiretos);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pedeConfirmacao, setPedeConfirmacao] = useState(false);
  const [erroInesperado, setErroInesperado] = useState<unknown>(null);

  // Falha que não é de validação vai para o limite de erro, que registra e avisa (nunca engolir).
  if (erroInesperado) throw erroInesperado;

  async function salvar(confirmouSemGrupos: boolean) {
    setAviso(null);
    try {
      const resultado = await editarGrupos.executar({
        exercicioId: exercicio.id,
        gruposDiretos: diretos,
        gruposIndiretos: indiretos,
        confirmouSemGrupos,
      });
      if (resultado.salvo) aoSalvar();
      else setPedeConfirmacao(true);
    } catch (erro) {
      if (!(erro instanceof ErroDeValidacao)) return setErroInesperado(erro);
      setAviso(textos.validacao.recusado(String(erro.recebido), erro.esperado));
    }
  }

  return (
    <View style={estilos.editor}>
      {GRUPOS_MUSCULARES.map((grupo) => (
        <View key={grupo} style={estilos.linha}>
          <Text style={estilos.grupo}>{grupo}</Text>
          <Pressable
            role="button"
            aria-label={textos.catalogo.marcarDireto(grupo)}
            disabled={indiretos.includes(grupo)}
            aria-selected={diretos.includes(grupo)}
            onPress={() => setDiretos(alternar(diretos, grupo))}
            style={[estilos.botao, diretos.includes(grupo) && estilos.marcado]}
          >
            <Text>Direto</Text>
          </Pressable>
          <Pressable
            role="button"
            aria-label={textos.catalogo.marcarIndireto(grupo)}
            disabled={diretos.includes(grupo)}
            aria-selected={indiretos.includes(grupo)}
            onPress={() => setIndiretos(alternar(indiretos, grupo))}
            style={[estilos.botao, indiretos.includes(grupo) && estilos.marcado]}
          >
            <Text>Indireto</Text>
          </Pressable>
        </View>
      ))}
      {aviso && <Text style={estilos.aviso}>{aviso}</Text>}
      {pedeConfirmacao ? (
        <View>
          <Text>{textos.catalogo.confirmarSemGrupos}</Text>
          <Pressable role="button" onPress={() => void salvar(true)} style={estilos.botao}>
            <Text>{textos.catalogo.salvarSemGrupos}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable role="button" onPress={() => void salvar(false)} style={estilos.botao}>
          <Text>{textos.catalogo.salvar}</Text>
        </Pressable>
      )}
      <Pressable role="button" onPress={aoCancelar} style={estilos.botao}>
        <Text>{textos.catalogo.cancelar}</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  editor: { gap: 8, padding: 16 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grupo: { flex: 1 },
  botao: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 8 },
  marcado: { backgroundColor: '#cde' },
  aviso: { color: '#a00' },
});

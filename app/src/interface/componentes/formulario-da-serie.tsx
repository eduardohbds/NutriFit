import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { ConcluirSerieDaSessao } from '../../aplicacao/casos-de-uso/concluir-serie-da-sessao';
import type { SerieSugerida } from '../../aplicacao/casos-de-uso/preparar-serie';
import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type { Identificador } from '../../dominio/identificador';
import { textos } from '../textos';
import { BotaoDeAcao } from './botao-de-acao';

export interface PropsDoFormularioDaSerie {
  exercicioDaSessaoId: Identificador;
  nome: string;
  unilateral: boolean;
  sugerida: SerieSugerida | null;
  concluirSerie: ConcluirSerieDaSessao;
  aoGravar: () => void;
}

interface Campos {
  carga: string;
  repeticoes: string;
  repeticoesOutroLado: string;
  rir: string;
}

// Campo do ErroDeValidacao → campo da tela.
const CAMPO_DA_TELA: Record<string, keyof Campos> = {
  carga: 'carga',
  repetições: 'repeticoes',
  'repetições do outro lado': 'repeticoesOutroLado',
  rir: 'rir',
};

function camposIniciais(sugerida: SerieSugerida | null): Campos {
  const quilos = sugerida?.carga?.emQuilos();
  return {
    carga: quilos === undefined ? '' : String(quilos).replace('.', ','),
    repeticoes: String(sugerida?.repeticoes ?? ''),
    repeticoesOutroLado: String(sugerida?.repeticoesOutroLado ?? ''),
    rir: String(sugerida?.rir?.valor ?? ''),
  };
}

// O que a tela mostra depois de tocar em Concluir: nada, o campo recusado ou o aviso de espaço.
type Situacao =
  | { tipo: 'livre' }
  | { tipo: 'invalido'; campo: keyof Campos | null; aviso: string }
  | { tipo: 'sem_espaco' };

const LIVRE: Situacao = { tipo: 'livre' };

// O formulário da próxima série do exercício: tudo em texto, só o caso de uso valida. O que foi
// digitado fica na tela se a série não é gravada (campo inválido, sem espaço), para tentar de novo.
export function FormularioDaSerie(props: PropsDoFormularioDaSerie) {
  const { nome, unilateral, sugerida } = props;
  const [campos, setCampos] = useState(() => camposIniciais(sugerida));
  const [situacao, setSituacao] = useState<Situacao>(LIVRE);
  const [falha, setFalha] = useState<unknown>(null);
  // A falha inesperada chega ao limite de erro, que registra e avisa (nunca engolir).
  if (falha) throw falha;

  const concluir = () =>
    tentarConcluir(props, campos).then(setSituacao, (erro: unknown) => setFalha(erro));
  const campo = (chave: keyof Campos, rotulo: string) => (
    <CampoDaSerie
      rotulo={rotulo}
      valor={campos[chave]}
      invalido={situacao.tipo === 'invalido' && situacao.campo === chave}
      aoMudar={(texto) => setCampos((atuais) => ({ ...atuais, [chave]: texto }))}
    />
  );
  return (
    <View>
      {campo('carga', textos.sessao.campoCarga(nome))}
      {campo('repeticoes', textos.sessao.campoRepeticoes(nome))}
      {unilateral && campo('repeticoesOutroLado', textos.sessao.campoRepeticoesOutroLado(nome))}
      {campo('rir', textos.sessao.campoRir(nome))}
      {situacao.tipo === 'invalido' && <Text>{situacao.aviso}</Text>}
      {situacao.tipo === 'sem_espaco' && <Text>{textos.sessao.semEspaco}</Text>}
      <BotaoDeAcao
        rotulo={textos.sessao.concluir}
        nome={textos.sessao.concluirSerie(nome)}
        aoTocar={concluir}
      />
    </View>
  );
}

interface PropsDoCampoDaSerie {
  rotulo: string;
  valor: string;
  invalido: boolean;
  aoMudar: (texto: string) => void;
}

function CampoDaSerie({ rotulo, valor, invalido, aoMudar }: PropsDoCampoDaSerie) {
  return (
    <TextInput
      aria-label={rotulo}
      aria-invalid={invalido}
      value={valor}
      onChangeText={aoMudar}
      style={invalido ? estilos.invalido : estilos.campo}
    />
  );
}

async function tentarConcluir(
  { exercicioDaSessaoId, concluirSerie, aoGravar }: PropsDoFormularioDaSerie,
  campos: Campos,
): Promise<Situacao> {
  try {
    const entrada = { tipo: 'trabalho' as const, ...campos };
    const resultado = await concluirSerie.executar({ exercicioDaSessaoId, entrada });
    if (!resultado.gravada) return { tipo: 'sem_espaco' };
    aoGravar();
    return LIVRE;
  } catch (erro) {
    if (!(erro instanceof ErroDeValidacao)) throw erro;
    const recebido = String(erro.recebido) === '' ? '(vazio)' : String(erro.recebido);
    const aviso = textos.sessao.erroDoCampo(erro.campo, recebido, erro.esperado);
    return { tipo: 'invalido', campo: CAMPO_DA_TELA[erro.campo] ?? null, aviso };
  }
}

const estilos = StyleSheet.create({
  campo: { borderWidth: 1, borderColor: '#999', padding: 6, marginVertical: 2 },
  invalido: { borderWidth: 2, borderColor: '#c00', padding: 6, marginVertical: 2 },
});

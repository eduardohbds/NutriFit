import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type {
  CelulaDaLinha,
  ComparacaoDeVersoes,
  LinhaDaComparacao,
  RotinaDaComparacao,
} from '../../aplicacao/casos-de-uso/comparar-versoes';
import { textos } from '../textos';
import { BotaoDeAcao } from './botao-de-acao';

export interface PropsDaComparacaoDeVersoesAberta {
  comparacao: ComparacaoDeVersoes;
  aoVoltar: () => void;
}

// As duas versões em colunas: a menor à esquerda. As linhas iguais aparecem sem marca; as
// adicionadas, removidas e alteradas (com os campos) levam marca e fundo de cor. Só leitura (FI-4).
export function ComparacaoDeVersoesAberta({
  comparacao,
  aoVoltar,
}: PropsDaComparacaoDeVersoesAberta) {
  return (
    <ScrollView>
      <BotaoDeAcao
        rotulo={textos.fichas.voltarParaHistorico}
        nome={textos.fichas.voltarParaHistorico}
        aoTocar={aoVoltar}
      />
      <Text style={estilos.titulo}>
        {textos.fichas.tituloDaComparacao(comparacao.de, comparacao.para)}
      </Text>
      <View style={estilos.cabecalho}>
        <Text style={estilos.coluna}>{textos.fichas.versao(comparacao.de)}</Text>
        <Text style={estilos.coluna}>{textos.fichas.versao(comparacao.para)}</Text>
      </View>
      {comparacao.rotinas.map((rotina, indice) => (
        <RotinaComparada key={indice} rotina={rotina} />
      ))}
    </ScrollView>
  );
}

function tituloDaRotina(rotina: RotinaDaComparacao): string {
  if (rotina.situacao === 'adicionada') return textos.fichas.rotinaAdicionada(rotina.nome);
  if (rotina.situacao === 'removida') return textos.fichas.rotinaRemovida(rotina.nome);
  return rotina.nome;
}

function RotinaComparada({ rotina }: { rotina: RotinaDaComparacao }) {
  // A numeração de cada lado conta só as linhas que existem naquele lado.
  let antes = 0;
  let depois = 0;
  return (
    <View style={estilos.rotina}>
      <Text style={estilos.nomeDaRotina}>{tituloDaRotina(rotina)}</Text>
      {rotina.linhas.map((linha, indice) => {
        if (linha.antes) antes += 1;
        if (linha.depois) depois += 1;
        return (
          <LinhaLadoALado
            key={indice}
            linha={linha}
            posicaoAntes={linha.antes ? antes : null}
            posicaoDepois={linha.depois ? depois : null}
          />
        );
      })}
    </View>
  );
}

const fundoDa = (tipo: LinhaDaComparacao['tipo']) => estilos[`fundo_${tipo}`];

function marcaDa(linha: LinhaDaComparacao): string | null {
  if (linha.tipo === 'adicionada') return textos.fichas.marcaAdicionada;
  if (linha.tipo === 'removida') return textos.fichas.marcaRemovida;
  if (linha.tipo === 'alterada') return textos.fichas.marcaAlterada(linha.campos);
  return null;
}

interface PropsDaLinhaLadoALado {
  linha: LinhaDaComparacao;
  posicaoAntes: number | null;
  posicaoDepois: number | null;
}

function LinhaLadoALado({ linha, posicaoAntes, posicaoDepois }: PropsDaLinhaLadoALado) {
  const marca = marcaDa(linha);
  return (
    <View style={[estilos.linha, fundoDa(linha.tipo)]}>
      <View style={estilos.cabecalho}>
        <Celula celula={linha.antes} posicao={posicaoAntes} />
        <Celula celula={linha.depois} posicao={posicaoDepois} />
      </View>
      {marca !== null && <Text style={estilos.marca}>{marca}</Text>}
    </View>
  );
}

function Celula({ celula, posicao }: { celula: CelulaDaLinha | null; posicao: number | null }) {
  if (!celula || posicao === null) {
    return (
      <View style={estilos.coluna}>
        <Text>{textos.fichas.semLinha}</Text>
      </View>
    );
  }
  return (
    <View style={estilos.coluna}>
      <Text>{textos.fichas.exercicio(posicao, celula.exercicioNome)}</Text>
      <Text>{textos.fichas.resumoDaLinha(celula.listas)}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 20, fontWeight: '600', padding: 16 },
  cabecalho: { flexDirection: 'row' },
  coluna: { flex: 1, paddingHorizontal: 16, paddingVertical: 4 },
  rotina: { paddingVertical: 8, borderBottomWidth: 1 },
  nomeDaRotina: { fontSize: 16, paddingHorizontal: 16 },
  linha: { paddingVertical: 6 },
  marca: { paddingHorizontal: 16, fontWeight: '600' },
  fundo_igual: {},
  fundo_adicionada: { backgroundColor: '#d9f2dd' },
  fundo_removida: { backgroundColor: '#f8d7da' },
  fundo_alterada: { backgroundColor: '#fff3cd' },
});

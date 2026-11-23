import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { FichaDaLista } from '../../aplicacao/casos-de-uso/listar-fichas';
import { textos } from '../textos';
import { BotaoDeAcao } from './botao-de-acao';

export interface AcoesDaLista {
  nova?: () => void;
  ativar?: (ficha: FichaDaLista) => void;
  duplicar?: (ficha: FichaDaLista) => void;
  // Chamada só depois de o usuário confirmar o arquivamento.
  arquivar?: (ficha: FichaDaLista) => void;
}

export interface PropsDaListaDeFichas {
  fichas: FichaDaLista[];
  aoAbrir: (id: FichaDaLista['id']) => void;
  acoes: AcoesDaLista;
}

export function ListaDeFichas({ fichas, aoAbrir, acoes }: PropsDaListaDeFichas) {
  const [arquivando, setArquivando] = useState<FichaDaLista | null>(null);

  const confirmar = (ficha: FichaDaLista) => {
    setArquivando(null);
    acoes.arquivar?.(ficha);
  };

  return (
    <ScrollView>
      <Text style={estilos.titulo}>{textos.fichas.titulo}</Text>
      {acoes.nova && (
        <BotaoDeAcao
          rotulo={textos.fichas.novaFicha}
          nome={textos.fichas.novaFicha}
          aoTocar={acoes.nova}
        />
      )}
      {arquivando && (
        <ConfirmacaoDeArquivamento
          ficha={arquivando}
          aoConfirmar={() => confirmar(arquivando)}
          aoCancelar={() => setArquivando(null)}
        />
      )}
      {fichas.map((ficha) => (
        <LinhaDaLista
          key={ficha.id.valor}
          ficha={ficha}
          aoAbrir={() => aoAbrir(ficha.id)}
          aoAtivar={acoes.ativar && (() => acoes.ativar?.(ficha))}
          aoDuplicar={acoes.duplicar && (() => acoes.duplicar?.(ficha))}
          aoArquivar={acoes.arquivar && (() => setArquivando(ficha))}
        />
      ))}
    </ScrollView>
  );
}

interface PropsDaLinhaDaLista {
  ficha: FichaDaLista;
  aoAbrir: () => void;
  aoAtivar?: () => void;
  aoDuplicar?: () => void;
  aoArquivar?: () => void;
}

function LinhaDaLista({ ficha, aoAbrir, aoAtivar, aoDuplicar, aoArquivar }: PropsDaLinhaDaLista) {
  return (
    <View testID={`ficha-${ficha.id.valor}`} style={estilos.linha}>
      <Pressable role="button" aria-label={textos.fichas.abrirFicha(ficha.nome)} onPress={aoAbrir}>
        <Text style={estilos.nome}>{ficha.nome}</Text>
        <Text>{textos.fichas.situacao[ficha.situacao as 'ativa' | 'inativa']}</Text>
        <Text>{textos.fichas.versao(ficha.versaoAtual)}</Text>
      </Pressable>
      <View style={estilos.acoes}>
        {aoAtivar && ficha.situacao !== 'ativa' && (
          <BotaoDeAcao
            rotulo={textos.fichas.ativar}
            nome={textos.fichas.ativarFicha(ficha.nome)}
            aoTocar={aoAtivar}
          />
        )}
        {aoDuplicar && (
          <BotaoDeAcao
            rotulo={textos.fichas.duplicar}
            nome={textos.fichas.duplicarFicha(ficha.nome)}
            aoTocar={aoDuplicar}
          />
        )}
        {aoArquivar && (
          <BotaoDeAcao
            rotulo={textos.fichas.arquivar}
            nome={textos.fichas.arquivarFicha(ficha.nome)}
            aoTocar={aoArquivar}
          />
        )}
      </View>
    </View>
  );
}

interface PropsDaConfirmacao {
  ficha: FichaDaLista;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

// Arquivar tira a ficha das escolhas; as versões e as sessões continuam guardadas (RB04, FI-4).
function ConfirmacaoDeArquivamento({ ficha, aoConfirmar, aoCancelar }: PropsDaConfirmacao) {
  return (
    <View style={estilos.linha}>
      <Text>{textos.fichas.confirmarArquivar(ficha.nome)}</Text>
      <BotaoDeAcao
        rotulo={textos.fichas.confirmarArquivamento}
        nome={textos.fichas.confirmarArquivamento}
        aoTocar={aoConfirmar}
      />
      <BotaoDeAcao
        rotulo={textos.fichas.cancelarArquivamento}
        nome={textos.fichas.cancelarArquivamento}
        aoTocar={aoCancelar}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 20, fontWeight: '600', padding: 16 },
  linha: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  nome: { fontSize: 16 },
  acoes: { flexDirection: 'row', gap: 12, paddingTop: 8 },
});

import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type {
  EscolherTreinoDoDia,
  TreinoDoDia,
} from '../../aplicacao/casos-de-uso/escolher-treino-do-dia';
import type { IniciarSessao } from '../../aplicacao/casos-de-uso/iniciar-sessao';
import type {
  FichaParaEdicao,
  LerFichaParaEdicao,
  RotinaParaEdicao,
} from '../../aplicacao/casos-de-uso/ler-ficha-para-edicao';
import type { Identificador } from '../../dominio/identificador';
import { BotaoDeAcao } from '../componentes/botao-de-acao';
import { textos } from '../textos';

export interface PropsDaTelaInicial {
  escolherTreinoDoDia: EscolherTreinoDoDia;
  lerFichaParaEdicao: LerFichaParaEdicao;
  // Sem ele a tela fica só de leitura, sem o botão Iniciar treino (US-013d1).
  iniciarSessao?: IniciarSessao;
}

type TreinoComFicha = Exclude<TreinoDoDia, { situacao: 'sem_ficha_ativa' }>;

// Abre direto no treino de hoje (RF01): a rotina sugerida, ou o aviso do dia sem rotina (CE01), ou
// as opções de quem não tem ficha ativa (CE02, SL18). Só lê: escolher outra rotina muda o que a tela
// mostra e não grava nada (RB02, FI-4).
export function TelaInicial({
  escolherTreinoDoDia,
  lerFichaParaEdicao,
  iniciarSessao,
}: PropsDaTelaInicial) {
  const roteador = useRouter();
  const [treino, setTreino] = useState<TreinoDoDia | null>(null);
  const [ficha, setFicha] = useState<FichaParaEdicao | null>(null);
  const [escolhida, setEscolhida] = useState<number | null>(null);
  const [erro, setErro] = useState<unknown>(null);
  const [jaEmAndamento, setJaEmAndamento] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      const decidido = await escolherTreinoDoDia.executar();
      if (decidido.situacao !== 'sem_ficha_ativa') {
        setFicha(await lerFichaParaEdicao.executar(decidido.fichaId));
      }
      setTreino(decidido);
    };
    carregar().catch((falha: unknown) => setErro(falha));
  }, [escolherTreinoDoDia, lerFichaParaEdicao]);

  // Já havendo sessão em andamento nada é criado e a tela oferece abri-la (CE03); a falha chega ao
  // limite de erro, que registra e avisa (nunca engolir).
  const iniciar =
    iniciarSessao &&
    ((rotinaId: Identificador) => {
      iniciarSessao
        .executar(rotinaId)
        .then((resultado) =>
          resultado.iniciada ? roteador.push('/sessao') : setJaEmAndamento(true),
        )
        .catch((falha: unknown) => setErro(falha));
    });

  if (erro) throw erro;
  if (!treino) return null;
  return (
    <ScrollView>
      <Text style={estilos.titulo}>{textos.inicio.titulo}</Text>
      {treino.situacao === 'sem_ficha_ativa' ? (
        <SemFichaAtiva />
      ) : (
        <TreinoDeHoje
          treino={treino}
          ficha={ficha}
          escolhida={escolhida}
          aoEscolher={setEscolhida}
          aoIniciar={iniciar}
          jaEmAndamento={jaEmAndamento}
        />
      )}
      <Link href="/catalogo">{textos.catalogo.abrir}</Link>
      <Link href="/fichas">{textos.fichas.abrir}</Link>
    </ScrollView>
  );
}

interface PropsDoTreinoDeHoje {
  treino: TreinoComFicha;
  ficha: FichaParaEdicao | null;
  escolhida: number | null;
  aoEscolher: (indice: number) => void;
  // Sem ele não há botão Iniciar treino (US-013d1).
  aoIniciar?: (rotinaId: Identificador) => void;
  jaEmAndamento: boolean;
}

function TreinoDeHoje(props: PropsDoTreinoDeHoje) {
  const { treino, ficha, escolhida, aoEscolher, aoIniciar, jaEmAndamento } = props;
  const sugerida = treino.situacao === 'sugerido' ? treino.rotinas.indexOf(treino.sugerida) : -1;
  const mostrada = escolhida ?? (sugerida >= 0 ? sugerida : null);
  const rotina = mostrada === null ? undefined : ficha?.rotinas[mostrada];
  return (
    <View>
      <Text>{textos.inicio.fichaAtiva(treino.fichaNome)}</Text>
      {treino.situacao === 'sem_rotina_hoje' && (
        <Text>
          {textos.inicio.semRotinaHoje(textos.fichas.diasDaSemana[treino.diaDaSemana - 1])}
        </Text>
      )}
      {rotina && <RotinaDoDia rotina={rotina} sugerida={mostrada === sugerida} />}
      {rotina && aoIniciar && mostrada !== null && (
        <BotaoDeAcao
          rotulo={textos.inicio.iniciarTreino}
          nome={textos.inicio.iniciarTreino}
          aoTocar={() => aoIniciar(treino.rotinas[mostrada].id)}
        />
      )}
      {jaEmAndamento && <TreinoEmAndamento />}
      <Text style={estilos.subtitulo}>{textos.inicio.escolherOutra}</Text>
      {treino.rotinas.map((outra, indice) => (
        <BotaoDeAcao
          key={outra.id.valor}
          rotulo={textos.inicio.verRotina(outra.nome)}
          nome={textos.inicio.verRotina(outra.nome)}
          aoTocar={() => aoEscolher(indice)}
        />
      ))}
    </View>
  );
}

function TreinoEmAndamento() {
  return (
    <View>
      <Text>{textos.inicio.jaEmAndamento}</Text>
      <Link href="/sessao">{textos.inicio.abrirEmAndamento}</Link>
    </View>
  );
}

function RotinaDoDia({ rotina, sugerida }: { rotina: RotinaParaEdicao; sugerida: boolean }) {
  return (
    <View style={estilos.rotina}>
      <Text>{sugerida ? textos.inicio.sugerido : textos.inicio.escolhida}</Text>
      <Text style={estilos.nome}>{rotina.nome}</Text>
      {rotina.diaDaSemana !== null && (
        <Text>{textos.fichas.diaDaSemana(textos.fichas.diasDaSemana[rotina.diaDaSemana - 1])}</Text>
      )}
      {rotina.itens.map((item) => (
        <View key={item.ordem} style={estilos.item}>
          <Text>{textos.fichas.exercicio(item.ordem, item.exercicioNome)}</Text>
          <Text>{textos.fichas.resumoDaLinha(item.listas)}</Text>
        </View>
      ))}
    </View>
  );
}

// Importar, pedir à IA e treino livre ainda não existem (E-10, E-11 e US-040): aparecem
// desativados, e só criar ficha leva a algum lugar.
function SemFichaAtiva() {
  const desativadas = [
    textos.inicio.importarFicha,
    textos.inicio.pedirParaIa,
    textos.inicio.treinoLivre,
  ];
  return (
    <View>
      <Text>{textos.inicio.semFichaAtiva}</Text>
      <Link href="/fichas">{textos.inicio.criarFicha}</Link>
      {desativadas.map((nome) => (
        <Pressable
          key={nome}
          role="button"
          aria-label={nome}
          accessibilityState={{ disabled: true }}
          disabled
          style={estilos.desativada}
        >
          <Text>{nome}</Text>
          <Text>{textos.inicio.emBreve}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 20, fontWeight: '600', padding: 16 },
  subtitulo: { fontSize: 16, paddingTop: 12 },
  rotina: { paddingVertical: 8 },
  nome: { fontSize: 18, fontWeight: '600' },
  item: { paddingVertical: 4 },
  desativada: { paddingVertical: 8, opacity: 0.5 },
});

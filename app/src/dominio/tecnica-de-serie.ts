import { ErroDeValidacao } from './erro-de-validacao';
import { chaveDeBusca } from './texto-de-busca';

// Técnicas aceitas na ficha (seção 11.2); o traço, ou nada, é a série sem técnica.
export const TECNICAS = [
  'aquecimento',
  'drop-set',
  'rest-pause',
  'repetições parciais',
  'negativa',
  'isometria',
  'cluster',
] as const;

// Aceita sem diferenciar caixa nem acento e devolve o nome da lista, para a ficha guardar sempre
// a mesma grafia.
export function lerTecnica(texto: string | null): string | null {
  const chave = texto === null ? '' : chaveDeBusca(texto);
  if (chave === '' || chave === '-') return null;
  const tecnica = TECNICAS.find((t) => chaveDeBusca(t) === chave);
  if (!tecnica) throw new ErroDeValidacao('técnica', `${TECNICAS.join(', ')} ou -`, texto);
  return tecnica;
}

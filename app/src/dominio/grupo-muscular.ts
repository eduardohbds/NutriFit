import { ErroDeValidacao } from './erro-de-validacao';
import type { GruposDoExercicio } from './exercicio';

// Lista fixa de 16 grupos (seção 18.3); o usuário escolhe entre eles e não cria grupos novos.
// Os nomes são os da migração 0001.
export const GRUPOS_MUSCULARES: readonly string[] = [
  'Peitoral',
  'Costas',
  'Trapézio',
  'Ombro anterior',
  'Ombro lateral',
  'Ombro posterior',
  'Bíceps',
  'Tríceps',
  'Antebraço',
  'Abdômen',
  'Lombar',
  'Quadríceps',
  'Posterior de coxa',
  'Glúteos',
  'Adutores',
  'Panturrilha',
];

const LISTA_ESPERADA = `um dos 16 grupos: ${GRUPOS_MUSCULARES.join(', ')}`;

function exigirDaLista(campo: string, nomes: string[]): void {
  for (const nome of nomes)
    if (!GRUPOS_MUSCULARES.includes(nome)) throw new ErroDeValidacao(campo, LISTA_ESPERADA, nome);
}

function exigirSemRepeticao(campo: string, nomes: string[]): void {
  const vistos = new Set<string>();
  for (const nome of nomes) {
    if (vistos.has(nome)) throw new ErroDeValidacao(campo, 'cada grupo uma vez só', nome);
    vistos.add(nome);
  }
}

// Valida os dois papéis juntos (VE20, seção 13.3): só grupos da lista, sem repetição, nenhum grupo
// nos dois papéis, e grupos indiretos exigem pelo menos um direto.
export function validarGruposDoExercicio(
  diretos: string[],
  indiretos: string[],
): GruposDoExercicio {
  exigirDaLista('gruposDiretos', diretos);
  exigirDaLista('gruposIndiretos', indiretos);
  exigirSemRepeticao('gruposDiretos', diretos);
  exigirSemRepeticao('gruposIndiretos', indiretos);
  const nosDois = indiretos.find((nome) => diretos.includes(nome));
  if (nosDois !== undefined)
    throw new ErroDeValidacao(
      'gruposIndiretos',
      'grupo só como direto ou indireto, nunca nos dois',
      nosDois,
    );
  if (indiretos.length > 0 && diretos.length === 0)
    throw new ErroDeValidacao(
      'gruposIndiretos',
      'pelo menos um grupo direto junto dos indiretos',
      indiretos.join(', '),
    );
  return { diretos: [...diretos], indiretos: [...indiretos] };
}

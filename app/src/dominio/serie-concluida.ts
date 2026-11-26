import { Carga } from './carga';
import { lerCargaEmQuilos } from './carga-planejada';
import { ErroDeValidacao } from './erro-de-validacao';
import type { MetaDeSerie } from './meta-de-serie';
import { Rir } from './rir';
import type { TipoDeSerie } from './sessao';

// O que a tela digita, sempre em texto: só `concluirSerie` valida (US-013a).
export interface EntradaDaSerie {
  tipo: TipoDeSerie;
  carga?: string;
  repeticoes?: string;
  repeticoesOutroLado?: string;
  segundos?: string;
  segundosOutroLado?: string;
  rir?: string;
}

export interface DadosDaSerie {
  tipo: TipoDeSerie;
  carga: Carga | null;
  repeticoes: number | null;
  repeticoesOutroLado: number | null;
  segundos: number | null;
  segundosOutroLado: number | null;
  rir: Rir | null;
}

const INTEIRO = /^\d+$/;
const POR_REPETICOES: TipoDeSerie[] = ['trabalho', 'aquecimento'];

// Valida a série digitada na ordem carga, repetições ou segundos, RIR: o primeiro campo inválido é o
// que o erro aponta, para a tela destacá-lo (RB09). Só a regra, sem tela nem banco.
export function concluirSerie(entrada: EntradaDaSerie): DadosDaSerie {
  const carga = lerCargaEmQuilos(entrada.carga ?? null);
  const porRepeticoes = POR_REPETICOES.includes(entrada.tipo);
  return {
    tipo: entrada.tipo,
    carga: carga === null ? null : Carga.deQuilos(carga),
    repeticoes: porRepeticoes ? inteiro('repetições', entrada.repeticoes) : null,
    repeticoesOutroLado: porRepeticoes
      ? inteiroOpcional('repetições do outro lado', entrada.repeticoesOutroLado)
      : null,
    segundos: porRepeticoes ? null : inteiro('segundos', entrada.segundos),
    segundosOutroLado: porRepeticoes
      ? null
      : inteiroOpcional('segundos do outro lado', entrada.segundosOutroLado),
    rir: lerRir(entrada),
  };
}

// RIR obrigatório só na série de trabalho por repetições (RB09, RB11); nos outros tipos, se vier
// informado, é validado e guardado.
function lerRir({ tipo, rir }: EntradaDaSerie): Rir | null {
  const informado = (rir ?? '').trim() !== '';
  if (tipo !== 'trabalho' && !informado) return null;
  return Rir.deTexto(rir ?? '');
}

// Série de trabalho com meta "falha" já vem com RIR 0 (RB10).
export function rirInicial(tipo: TipoDeSerie, meta: MetaDeSerie | null): Rir | null {
  return tipo === 'trabalho' && meta?.tipo === 'falha' ? Rir.de(0) : null;
}

function inteiro(campo: string, texto: string | undefined): number {
  const limpo = (texto ?? '').trim();
  if (!INTEIRO.test(limpo) || Number(limpo) < 1) {
    throw new ErroDeValidacao(campo, 'inteiro maior ou igual a 1', texto ?? '');
  }
  return Number(limpo);
}

function inteiroOpcional(campo: string, texto: string | undefined): number | null {
  return (texto ?? '').trim() === '' ? null : inteiro(campo, texto);
}

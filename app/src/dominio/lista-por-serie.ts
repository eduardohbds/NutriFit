import { ErroDeValidacao } from './erro-de-validacao';

// Notação da seção 11.3: um valor vale para todas as séries; a lista separada por barra traz
// exatamente um valor por série (RB06). Valor vazio dentro da lista não vale.
export function listaPorSerie(campo: string, texto: string, quantidade: number): string[] {
  const valores = texto.split('/').map((valor) => valor.trim());
  if (valores.every((valor) => valor !== '')) {
    if (valores.length === 1) return Array<string>(quantidade).fill(valores[0]);
    if (valores.length === quantidade) return valores;
  }
  const todas = `um valor para todas as séries ou exatamente ${quantidade} valores`;
  const esperado = `${todas} separados por barra, um por série`;
  throw new ErroDeValidacao(campo, esperado, texto);
}

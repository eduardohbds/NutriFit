// O armazenamento do aparelho está cheio: a gravação não aconteceu e pode ser repetida (CE61).
export class ErroDeEspacoInsuficiente extends Error {
  constructor() {
    super('espaço insuficiente no aparelho');
    this.name = 'ErroDeEspacoInsuficiente';
  }
}

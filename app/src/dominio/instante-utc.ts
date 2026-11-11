import { ErroDeValidacao } from './erro-de-validacao';

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// Datas ficam em ISO 8601 UTC no banco; o fuso do aparelho só entra na exibição e na semana (RB16).
export class InstanteUtc {
  private constructor(readonly iso: string) {}

  static de(iso: string): InstanteUtc {
    if (!ISO_UTC.test(iso) || !InstanteUtc.existe(iso)) {
      throw new ErroDeValidacao('instante', 'AAAA-MM-DDTHH:mm:ss.sssZ (UTC)', iso);
    }
    return new InstanteUtc(iso);
  }

  // O Date normaliza datas como 30/02 para outro dia; se o texto muda, a data não existe.
  private static existe(iso: string): boolean {
    const data = new Date(iso);
    return !Number.isNaN(data.getTime()) && data.toISOString() === iso;
  }
}

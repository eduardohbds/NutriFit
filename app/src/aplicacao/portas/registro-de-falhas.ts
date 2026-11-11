import type { EventoDeFalha } from '../../dominio/evento-de-falha';

export interface RegistroDeFalhas {
  registrar(evento: EventoDeFalha): Promise<void>;
  // Linhas JSON na ordem em que foram gravadas, para o próprio usuário inspecionar.
  lerLinhas(): Promise<string[]>;
}

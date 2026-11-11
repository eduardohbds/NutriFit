import type { RegistroDeFalhas } from '../../src/aplicacao/portas/registro-de-falhas';
import type { EventoDeFalha } from '../../src/dominio/evento-de-falha';

export class RegistroDeFalhasEmMemoria implements RegistroDeFalhas {
  private readonly linhas: string[] = [];
  falharAoGravar = false;

  async registrar(evento: EventoDeFalha): Promise<void> {
    if (this.falharAoGravar) throw new Error('armazenamento indisponível');
    this.linhas.push(evento.paraJson());
  }

  async lerLinhas(): Promise<string[]> {
    return [...this.linhas];
  }
}

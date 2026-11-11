import { File, Paths } from 'expo-file-system';

import type { RegistroDeFalhas } from '../../aplicacao/portas/registro-de-falhas';
import type { EventoDeFalha } from '../../dominio/evento-de-falha';

// Arquivo próprio, fora do banco: não entra na cópia de backup (especificação 17.2) e
// sobrevive quando uma migração volta o banco à cópia (US-001c).
const NOME_DO_ARQUIVO = 'registro-de-falhas.jsonl';

export class RegistroDeFalhasEmArquivo implements RegistroDeFalhas {
  async registrar(evento: EventoDeFalha): Promise<void> {
    const arquivo = this.arquivo();
    if (!arquivo.exists) arquivo.create();
    await arquivo.write(`${evento.paraJson()}\n`, { append: true });
  }

  async lerLinhas(): Promise<string[]> {
    const arquivo = this.arquivo();
    if (!arquivo.exists) return [];
    return (await arquivo.text()).split('\n').filter((linha) => linha.length > 0);
  }

  private arquivo() {
    return new File(Paths.document, NOME_DO_ARQUIVO);
  }
}

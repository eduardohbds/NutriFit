import { File, Paths } from 'expo-file-system';

import type { CopiaDoBanco } from '../../aplicacao/portas/copia-do-banco';

// O expo-sqlite guarda os bancos em SQLite/ dentro da pasta de documentos. A cópia vai para
// uma pasta interna própria, fora do banco e do backup. O arquivo precisa estar fechado.
export class CopiaDoBancoEmArquivo implements CopiaDoBanco {
  private readonly banco: File;
  private readonly copia: File;

  constructor(nomeDoBanco: string) {
    this.banco = new File(Paths.document, `SQLite/${nomeDoBanco}`);
    this.copia = new File(Paths.document, `copias-de-migracao/${nomeDoBanco}`);
  }

  async existe(): Promise<boolean> {
    return this.copia.exists;
  }

  async criar(): Promise<void> {
    this.copia.parentDirectory.create({ idempotent: true, intermediates: true });
    if (this.copia.exists) this.copia.delete();
    this.banco.copy(this.copia);
  }

  async restaurar(): Promise<void> {
    if (!this.copia.exists) throw new Error('não há cópia do banco para restaurar');
    if (this.banco.exists) this.banco.delete();
    this.copia.copy(this.banco);
  }

  async descartar(): Promise<void> {
    if (this.copia.exists) this.copia.delete();
  }
}

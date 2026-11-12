import type { CopiaDoBanco } from '../../src/aplicacao/portas/copia-do-banco';

export interface CenarioDeCopia {
  copia: CopiaDoBanco;
  lerBanco: () => Promise<string>;
  gravarBanco: (conteudo: string) => Promise<void>;
}

export function contratoDaCopiaDoBanco(nome: string, criar: () => Promise<CenarioDeCopia>) {
  describe(`contrato da porta CopiaDoBanco: ${nome}`, () => {
    it('não existe cópia antes de criar e passa a existir depois', async () => {
      const { copia } = await criar();
      expect(await copia.existe()).toBe(false);
      await copia.criar();
      expect(await copia.existe()).toBe(true);
    });

    it('restaurar devolve o banco ao conteúdo de quando a cópia foi criada', async () => {
      const { copia, lerBanco, gravarBanco } = await criar();
      await gravarBanco('antes');
      await copia.criar();
      await gravarBanco('pela-metade');
      await copia.restaurar();
      expect(await lerBanco()).toBe('antes');
      expect(await copia.existe()).toBe(true);
    });

    it('descartar apaga só a cópia e deixa o banco como está', async () => {
      const { copia, lerBanco, gravarBanco } = await criar();
      await gravarBanco('atual');
      await copia.criar();
      await copia.descartar();
      expect(await copia.existe()).toBe(false);
      expect(await lerBanco()).toBe('atual');
    });

    it('restaurar sem cópia falha e não mexe no banco', async () => {
      const { copia, lerBanco, gravarBanco } = await criar();
      await gravarBanco('atual');
      await expect(copia.restaurar()).rejects.toThrow();
      expect(await lerBanco()).toBe('atual');
    });
  });
}

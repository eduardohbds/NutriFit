import type { EsquemaDoBanco } from '../../src/aplicacao/portas/esquema-do-banco';

export function contratoDoEsquemaDoBanco(nome: string, criar: () => EsquemaDoBanco) {
  describe(`contrato da porta EsquemaDoBanco: ${nome}`, () => {
    it('um banco sem tabelas tem zero séries e zero sessões', async () => {
      expect(await criar().contarTotais()).toEqual({ series: 0, sessoes: 0 });
    });

    it('migrar um banco vazio mantém os totais em zero e pode repetir sem erro', async () => {
      const esquema = criar();
      await esquema.migrar();
      await esquema.migrar();
      expect(await esquema.contarTotais()).toEqual({ series: 0, sessoes: 0 });
    });
  });
}

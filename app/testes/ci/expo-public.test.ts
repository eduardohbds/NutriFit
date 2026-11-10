import { criarPastaTemporaria, rodar } from './ajudas';

describe('nenhuma variável EXPO_PUBLIC_ carrega segredo (AGENTS.md seção 8)', () => {
  it('o código atual do app só usa as variáveis públicas permitidas', () => {
    const r = rodar('node', ['scripts/verificar-expo-public.js']);
    expect(r.status).toBe(0);
  });

  it.each(['EXPO_PUBLIC_API_KEY', 'EXPO_PUBLIC_IA_API_KEY', 'EXPO_PUBLIC_SENHA'])(
    'reprova %s e mostra o nome da variável',
    (nome) => {
      const pasta = criarPastaTemporaria({ 'x.ts': `const v = process.env.${nome};\n` });
      const r = rodar('node', ['scripts/verificar-expo-public.js', pasta]);
      expect(r.status).not.toBe(0);
      expect(r.saida).toContain(nome);
    },
  );

  it.each(['EXPO_PUBLIC_WORKER_URL', 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'])('aceita %s', (nome) => {
    const pasta = criarPastaTemporaria({ 'x.ts': `const v = process.env.${nome};\n` });
    const r = rodar('node', ['scripts/verificar-expo-public.js', pasta]);
    expect(r.status).toBe(0);
  });
});

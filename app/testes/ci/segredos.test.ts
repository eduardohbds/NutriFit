import { criarPastaTemporaria, rodar } from './ajudas';

// O segredo falso é montado em pedaços para o gitleaks não acusar este próprio arquivo.
const tokenFalso = 'gh' + 'p_' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8';

describe('gitleaks reprova segredo commitado', () => {
  it('reprova uma pasta com um token do GitHub e mostra a regra violada', () => {
    const pasta = criarPastaTemporaria({ 'config.ts': `export const t = "${tokenFalso}";\n` });
    const r = rodar('node', ['scripts/gitleaks.js', pasta]);
    expect(r.status).not.toBe(0);
    expect(r.saida).toContain('github-pat');
  });

  it('aprova uma pasta sem segredos', () => {
    const pasta = criarPastaTemporaria({ 'ola.ts': 'export const ola = "mundo";\n' });
    const r = rodar('node', ['scripts/gitleaks.js', pasta]);
    expect(r.status).toBe(0);
  });
});

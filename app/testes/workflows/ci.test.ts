import { lerWorkflow } from './ajudas';

const ci = lerWorkflow('ci.yml');

describe('workflow de CI (ci.yml) executa o mesmo npm run ci', () => {
  it('dispara em push e em pull request', () => {
    expect(ci).toMatch(/^on:\s*$/m);
    expect(ci).toMatch(/^\s+push:/m);
    expect(ci).toMatch(/^\s+pull_request:/m);
  });

  it('não dispara em tag de versão (quem gera o APK é o apk.yml)', () => {
    expect(ci).not.toMatch(/tags:/);
  });

  it('instala as dependências travadas com npm ci dentro de app/', () => {
    expect(ci).toMatch(/working-directory:\s*app/);
    expect(ci).toMatch(/run:\s*npm ci/);
  });

  it('baixa o gitleaks 8.30.1 para app/.ferramentas antes do CI', () => {
    expect(ci).toContain('8.30.1');
    expect(ci).toContain('.ferramentas');
    expect(ci.indexOf('gitleaks')).toBeLessThan(ci.indexOf('npm run ci'));
  });

  it('roda exatamente npm run ci', () => {
    expect(ci).toMatch(/run:\s*npm run ci\s*$/m);
  });

  it('tem permissão mínima de leitura do repositório', () => {
    expect(ci).toMatch(/permissions:\s*\n\s+contents:\s*read/);
  });
});

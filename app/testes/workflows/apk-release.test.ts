import { lerWorkflow, linhasDeComando } from './ajudas';

const apk = lerWorkflow('apk.yml');

// Texto de um job: da linha `  nome:` até o próximo job (recuo de dois espaços) ou o fim.
function trechoDoJob(nome: string): string {
  const linhas = apk.split('\n');
  const inicio = linhas.findIndex((linha) => linha === `  ${nome}:`);
  if (inicio < 0) return '';
  const fim = linhas.findIndex((linha, i) => i > inicio && /^ {2}\S/.test(linha));
  return linhas.slice(inicio, fim < 0 ? undefined : fim).join('\n');
}

const release = trechoDoJob('release');

describe('workflow do APK publica o APK assinado numa Release do GitHub (US-044)', () => {
  it('um job release roda só depois do job apk ter gerado o artefato', () => {
    expect(release).toMatch(/needs:\s*apk/);
    expect(release).toMatch(/uses:\s*actions\/download-artifact@/);
  });

  it('cria a Release com o nome da tag e anexa o APK, pública e sem rascunho', () => {
    expect(release).toContain('gh release create');
    expect(release).toContain('github.ref_name');
    expect(release).toContain('.apk');
    expect(release).not.toContain('--draft');
  });

  it('numa tag repetida, atualiza o anexo da Release em vez de falhar ou duplicar', () => {
    expect(release).toContain('gh release view');
    expect(release).toContain('gh release upload');
    expect(release).toContain('--clobber');
  });

  it('a escrita no repositório fica só no job release; o resto continua só lendo', () => {
    expect(apk).toMatch(/^permissions:\s*\n\s+contents:\s*read/m);
    expect(release).toMatch(/permissions:\s*\n\s+contents:\s*write/);
    expect(trechoDoJob('apk')).not.toContain('contents: write');
    expect((apk.match(/contents:\s*write/g) ?? []).length).toBe(1);
  });

  it('o job release não usa os segredos do keystore e nenhum comando dele imprime segredo', () => {
    expect(release).not.toContain('ANDROID_KEY');
    const comandos = linhasDeComando(release).join('\n');
    expect(comandos).not.toContain('secrets.');
    expect(comandos).not.toMatch(/\b(printenv|set -x|set -o xtrace)\b/);
    expect(comandos).not.toMatch(/(^|\s)env(\s|$)/m);
    expect(release).toMatch(/env:\s*\n\s+GH_TOKEN:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/);
  });
});

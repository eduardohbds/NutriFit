import { lerWorkflow, linhasDeComando } from './ajudas';

const apk = lerWorkflow('apk.yml');
const segredos = [
  'ANDROID_KEYSTORE_BASE64',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD',
];

describe('workflow do APK (apk.yml) gera o APK de release assinado em tag', () => {
  it('dispara só em tag de versão, nunca em push de branch', () => {
    expect(apk).toMatch(/tags:\s*\n\s+-\s*['"]?v\*/);
    expect(apk).not.toMatch(/branches:/);
  });

  it.each(segredos)('usa o segredo %s do GitHub', (nome) => {
    expect(apk).toContain(`secrets.${nome}`);
  });

  it('só repassa segredos por env, nunca dentro de um comando run', () => {
    const comRun = linhasDeComando(apk).filter((linha) => linha.includes('secrets.'));
    expect(comRun).toEqual([]);
    expect(apk).toMatch(/env:/);
  });

  it('não imprime variáveis nem liga o eco de comandos', () => {
    const comandos = linhasDeComando(apk).join('\n');
    expect(comandos).not.toMatch(/\b(printenv|set -x|set -o xtrace)\b/);
    expect(comandos).not.toMatch(/(^|\s)env(\s|$)/m);
    for (const nome of segredos) {
      expect(comandos).not.toMatch(new RegExp(`echo[^\\n]*\\$\\{?${nome}`));
    }
  });

  it('grava o keystore fora da pasta do repositório', () => {
    expect(apk).toContain('RUNNER_TEMP');
    expect(apk).not.toMatch(/app\/android\/\S*\.jks/);
  });

  it('compila o release e publica o APK como artefato', () => {
    expect(apk).toContain('assembleRelease');
    expect(apk).toMatch(/uses:\s*actions\/upload-artifact@/);
    expect(apk).toContain('.apk');
  });

  it('tem permissão mínima de leitura do repositório', () => {
    expect(apk).toMatch(/permissions:\s*\n\s+contents:\s*read/);
  });
});

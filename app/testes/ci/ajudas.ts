import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

export const raizApp = path.resolve(__dirname, '../..');

export function rodar(
  comando: string,
  args: string[],
  opcoes: { entrada?: string; env?: Record<string, string> } = {},
) {
  const r = spawnSync(comando, args, {
    cwd: raizApp,
    encoding: 'utf8',
    input: opcoes.entrada,
    env: { ...process.env, ...opcoes.env },
  });
  return { status: r.status, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

export function criarPastaTemporaria(arquivos: Record<string, string>) {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'nutrifit-ci-'));
  for (const [nome, conteudo] of Object.entries(arquivos)) {
    fs.writeFileSync(path.join(pasta, nome), conteudo);
  }
  return pasta;
}

import fs from 'fs';
import path from 'path';

const pastaWorkflows = path.resolve(__dirname, '../../../.github/workflows');

// Arquivo ausente vira texto vazio: o teste falha pela asserção, não por erro de leitura.
export function lerWorkflow(nome: string): string {
  const caminho = path.join(pastaWorkflows, nome);
  return fs.existsSync(caminho) ? fs.readFileSync(caminho, 'utf8') : '';
}

// Linhas que executam comandos (blocos `run:`), para checar que nenhum segredo é escrito nelas.
export function linhasDeComando(workflow: string): string[] {
  const linhas = workflow.split('\n');
  const comandos: string[] = [];
  let dentroDeRun = false;
  let recuoRun = 0;
  for (const linha of linhas) {
    const recuo = linha.length - linha.trimStart().length;
    const ehRun = /^\s*(- )?run:/.test(linha);
    if (ehRun) {
      dentroDeRun = true;
      recuoRun = recuo;
      comandos.push(linha);
      continue;
    }
    if (dentroDeRun && linha.trim() !== '' && recuo <= recuoRun) dentroDeRun = false;
    if (dentroDeRun) comandos.push(linha);
  }
  return comandos;
}

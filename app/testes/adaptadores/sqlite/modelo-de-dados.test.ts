import fs from 'fs';
import path from 'path';

import { raizApp, rodar } from '../../ci/ajudas';

const documento = path.resolve(raizApp, '../docs/modelo-de-dados.md');

describe('diagrama ER gerado do esquema', () => {
  it('docs/modelo-de-dados.md está em dia com o último snapshot do drizzle-kit', () => {
    const r = rodar('node', ['scripts/gerar-modelo-de-dados.js', '--conferir']);
    expect(r.saida).toBe('');
    expect(r.status).toBe(0);
  });

  it('o diagrama é Mermaid e mostra os vínculos obrigatórios da seção 18.6', () => {
    const texto = fs.existsSync(documento) ? fs.readFileSync(documento, 'utf8') : '';
    expect(texto).toContain('erDiagram');
    for (const vinculo of [
      'exercicio_sessao ||--o{ serie_executada',
      'sessao ||--o{ exercicio_sessao',
      'item ||--o{ serie_planejada',
      'rotina ||--o{ item',
      'versao_ficha ||--o{ rotina',
      'serie_executada ||--o{ etapa_drop_set',
    ]) {
      expect(texto).toContain(vinculo);
    }
  });
});

import {
  AGORA,
  IDENTIFICADOR_INEXISTENTE as INEXISTENTE,
  abrirBancoMigrado,
  criarFichaComSerie,
  criarSessaoComSerie,
  inserir,
} from '../../apoio/banco-sqlite';

const TABELAS_DO_MODELO = [
  'acao_ia',
  'copia_backup',
  'etapa_drop_set',
  'exercicio',
  'exercicio_grupo',
  'exercicio_sessao',
  'exercicio_sinonimo',
  'ficha',
  'grupo_muscular',
  'item',
  'medicao_corporal',
  'meta_semanal',
  'perfil',
  'rotina',
  'serie_executada',
  'serie_planejada',
  'sessao',
  'versao_ficha',
];

const GRUPOS_DA_SECAO_18_3 = [
  'Abdômen',
  'Adutores',
  'Antebraço',
  'Bíceps',
  'Costas',
  'Glúteos',
  'Lombar',
  'Ombro anterior',
  'Ombro lateral',
  'Ombro posterior',
  'Panturrilha',
  'Peitoral',
  'Posterior de coxa',
  'Quadríceps',
  'Trapézio',
  'Tríceps',
];

const RECUSA_DE_VINCULO = /FOREIGN KEY constraint failed/;
const RECUSA_DE_REGRA = /constraint failed/;

describe('migração inicial em banco vazio', () => {
  it('cria todas as tabelas do modelo aprovado', () => {
    const banco = abrirBancoMigrado();
    const tabelas = banco
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%' ORDER BY name",
      )
      .all()
      .map((linha) => (linha as { name: string }).name);
    expect(tabelas).toEqual(TABELAS_DO_MODELO);
  });

  it('já traz os 16 grupos musculares da seção 18.3', () => {
    const banco = abrirBancoMigrado();
    const nomes = banco
      .prepare('SELECT nome FROM grupo_muscular ORDER BY nome')
      .all()
      .map((linha) => (linha as { nome: string }).nome);
    expect([...nomes].sort()).toEqual([...GRUPOS_DA_SECAO_18_3].sort());
  });
});

describe('vínculos obrigatórios (seção 18.6)', () => {
  it('recusa série executada sem exercício da sessão', () => {
    const banco = abrirBancoMigrado();
    expect(() =>
      inserir(banco, 'serie_executada', {
        exercicio_sessao_id: INEXISTENTE,
        posicao: 1,
        tipo: 'trabalho',
        concluida_em: AGORA,
      }),
    ).toThrow(RECUSA_DE_VINCULO);
  });

  it('recusa exercício da sessão sem sessão', () => {
    const banco = abrirBancoMigrado();
    const { exercicio } = criarFichaComSerie(banco);
    expect(() =>
      inserir(banco, 'exercicio_sessao', {
        sessao_id: INEXISTENTE,
        exercicio_id: exercicio,
        posicao: 1,
      }),
    ).toThrow(RECUSA_DE_VINCULO);
  });

  it('recusa série planejada sem item', () => {
    const banco = abrirBancoMigrado();
    expect(() =>
      inserir(banco, 'serie_planejada', { item_id: INEXISTENTE, posicao: 1, meta_tipo: 'falha' }),
    ).toThrow(RECUSA_DE_VINCULO);
  });

  it('recusa item sem rotina', () => {
    const banco = abrirBancoMigrado();
    const { exercicio } = criarFichaComSerie(banco);
    expect(() =>
      inserir(banco, 'item', { rotina_id: INEXISTENTE, exercicio_id: exercicio, posicao: 2 }),
    ).toThrow(RECUSA_DE_VINCULO);
  });

  it('recusa rotina sem versão da ficha', () => {
    const banco = abrirBancoMigrado();
    expect(() =>
      inserir(banco, 'rotina', { versao_id: INEXISTENTE, nome: 'Treino B', posicao: 1 }),
    ).toThrow(RECUSA_DE_VINCULO);
  });

  it('aceita a cadeia completa da ficha à série planejada e da sessão à série executada', () => {
    const banco = abrirBancoMigrado();
    const { exercicio } = criarFichaComSerie(banco);
    expect(() => criarSessaoComSerie(banco, exercicio)).not.toThrow();
  });
});

describe('treino livre (SL18)', () => {
  it('aceita sessão sem ficha, sem versão e sem rotina', () => {
    const banco = abrirBancoMigrado();
    const sessao = inserir(banco, 'sessao', { inicio: AGORA, situacao: 'em_andamento' });
    const linha = banco
      .prepare('SELECT ficha_id, versao_id, rotina_id FROM sessao WHERE id = ?')
      .get(sessao);
    expect(linha).toEqual({ ficha_id: null, versao_id: null, rotina_id: null });
  });

  it('recusa sessão com versão e sem ficha', () => {
    const banco = abrirBancoMigrado();
    const { versao } = criarFichaComSerie(banco);
    expect(() =>
      inserir(banco, 'sessao', { inicio: AGORA, situacao: 'em_andamento', versao_id: versao }),
    ).toThrow(RECUSA_DE_REGRA);
  });
});

describe('etapa de drop-set (arquitetura 7.2)', () => {
  it('aceita etapa de uma série executada', () => {
    const banco = abrirBancoMigrado();
    const { serie } = criarSessaoComSerie(banco, criarFichaComSerie(banco).exercicio);
    expect(() =>
      inserir(banco, 'etapa_drop_set', {
        serie_executada_id: serie,
        posicao: 1,
        carga_gramas: 40000,
        repeticoes: 8,
      }),
    ).not.toThrow();
  });

  it('recusa etapa sem série executada', () => {
    const banco = abrirBancoMigrado();
    expect(() =>
      inserir(banco, 'etapa_drop_set', {
        serie_executada_id: INEXISTENTE,
        posicao: 1,
        carga_gramas: 40000,
        repeticoes: 8,
      }),
    ).toThrow(RECUSA_DE_VINCULO);
  });
});

describe('regras do banco aprovadas para o modelo', () => {
  it('permite só uma ficha ativa', () => {
    const banco = abrirBancoMigrado();
    criarFichaComSerie(banco);
    expect(() =>
      inserir(banco, 'ficha', {
        nome: 'Outra',
        situacao: 'ativa',
        origem: 'manual',
        criada_em: AGORA,
      }),
    ).toThrow(RECUSA_DE_REGRA);
    expect(() =>
      inserir(banco, 'ficha', {
        nome: 'Antiga',
        situacao: 'inativa',
        origem: 'manual',
        criada_em: AGORA,
      }),
    ).not.toThrow();
  });

  it('recusa dois números de versão iguais na mesma ficha', () => {
    const banco = abrirBancoMigrado();
    const { ficha } = criarFichaComSerie(banco);
    expect(() =>
      inserir(banco, 'versao_ficha', {
        ficha_id: ficha,
        numero: 1,
        autor: 'usuario',
        criada_em: AGORA,
      }),
    ).toThrow(RECUSA_DE_REGRA);
  });

  it.each([[-1], [6]])('recusa RIR %p na série executada', (rir) => {
    const banco = abrirBancoMigrado();
    const { serie } = criarSessaoComSerie(banco, criarFichaComSerie(banco).exercicio);
    expect(() =>
      banco.prepare('UPDATE serie_executada SET rir = ? WHERE id = ?').run(rir, serie),
    ).toThrow(RECUSA_DE_REGRA);
  });

  it('recusa carga negativa na série executada', () => {
    const banco = abrirBancoMigrado();
    const { serie } = criarSessaoComSerie(banco, criarFichaComSerie(banco).exercicio);
    expect(() =>
      banco.prepare('UPDATE serie_executada SET carga_gramas = -1 WHERE id = ?').run(serie),
    ).toThrow(RECUSA_DE_REGRA);
  });

  it('recusa medição corporal sem nenhuma medida', () => {
    const banco = abrirBancoMigrado();
    expect(() => inserir(banco, 'medicao_corporal', { data: AGORA })).toThrow(RECUSA_DE_REGRA);
    expect(() =>
      inserir(banco, 'medicao_corporal', { data: AGORA, cintura_mm: 850 }),
    ).not.toThrow();
  });

  it('permite um único perfil', () => {
    const banco = abrirBancoMigrado();
    inserir(banco, 'perfil', {});
    expect(() => inserir(banco, 'perfil', {})).toThrow(RECUSA_DE_REGRA);
  });

  it('permite uma meta semanal por grupo, com valor maior ou igual a zero', () => {
    const banco = abrirBancoMigrado();
    const { id: grupo } = banco
      .prepare("SELECT id FROM grupo_muscular WHERE nome = 'Peitoral'")
      .get() as {
      id: string;
    };
    expect(() => inserir(banco, 'meta_semanal', { grupo_id: grupo, valor_centesimos: -1 })).toThrow(
      RECUSA_DE_REGRA,
    );
    inserir(banco, 'meta_semanal', { grupo_id: grupo, valor_centesimos: 1050 });
    expect(() =>
      inserir(banco, 'meta_semanal', { grupo_id: grupo, valor_centesimos: 900 }),
    ).toThrow(RECUSA_DE_REGRA);
  });
});

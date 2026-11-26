import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { MetaDeSerie } from '../../src/dominio/meta-de-serie';
import { concluirSerie, rirInicial } from '../../src/dominio/serie-concluida';

function erroDe(construir: () => unknown): ErroDeValidacao {
  try {
    construir();
  } catch (erro) {
    return erro as ErroDeValidacao;
  }
  throw new Error('esperava um erro e nada foi lançado');
}

describe('concluirSerie: série de trabalho por repetições (RB09)', () => {
  it('com carga, repetições e RIR devolve os dados da série prontos', () => {
    const dados = concluirSerie({ tipo: 'trabalho', carga: '62,5', repeticoes: '10', rir: '2' });

    expect(dados.tipo).toBe('trabalho');
    expect(dados.carga?.gramas).toBe(62500);
    expect(dados.repeticoes).toBe(10);
    expect(dados.rir?.valor).toBe(2);
    expect(dados.segundos).toBeNull();
    expect(dados.repeticoesOutroLado).toBeNull();
    expect(dados.segundosOutroLado).toBeNull();
  });

  it.each(['', '  '])('sem RIR ("%s") a conclusão é recusada, com erro no campo rir', (rir) => {
    const erro = erroDe(() => concluirSerie({ tipo: 'trabalho', repeticoes: '10', rir }));

    expect(erro).toBeInstanceOf(ErroDeValidacao);
    expect(erro).toMatchObject({ campo: 'rir', recebido: rir });
    expect(erro.esperado).toBe('inteiro de 0 a 5');
  });

  it('sem o campo RIR na entrada também é recusada', () => {
    const erro = erroDe(() => concluirSerie({ tipo: 'trabalho', carga: '60', repeticoes: '10' }));

    expect(erro).toMatchObject({ campo: 'rir' });
  });

  it.each(['6', '-1', '2,5', 'abc'])('RIR "%s" é recusado com o valor recebido', (rir) => {
    const erro = erroDe(() => concluirSerie({ tipo: 'trabalho', repeticoes: '10', rir }));

    expect(erro).toMatchObject({ campo: 'rir', recebido: rir });
  });

  it('série sem carga (peso corporal) é aceita', () => {
    const dados = concluirSerie({ tipo: 'trabalho', carga: '', repeticoes: '12', rir: '1' });

    expect(dados.carga).toBeNull();
  });

  it('o RIR 5 vale como 5', () => {
    expect(concluirSerie({ tipo: 'trabalho', repeticoes: '8', rir: '5' }).rir?.valor).toBe(5);
  });

  it('trabalho só com segundos, sem repetições, é recusado no campo repetições', () => {
    const erro = erroDe(() => concluirSerie({ tipo: 'trabalho', segundos: '60', rir: '2' }));

    expect(erro).toMatchObject({ campo: 'repetições', recebido: '' });
  });
});

describe('concluirSerie: aquecimento, tempo e cardio não pedem RIR (RB11)', () => {
  it('aquecimento por repetições, sem RIR, conclui com RIR vazio', () => {
    const dados = concluirSerie({ tipo: 'aquecimento', carga: '20', repeticoes: '15' });

    expect(dados.tipo).toBe('aquecimento');
    expect(dados.repeticoes).toBe(15);
    expect(dados.rir).toBeNull();
  });

  it('série por tempo, sem RIR, conclui com os segundos', () => {
    const dados = concluirSerie({ tipo: 'tempo', segundos: '60' });

    expect(dados.segundos).toBe(60);
    expect(dados.repeticoes).toBeNull();
    expect(dados.rir).toBeNull();
  });

  it('cardio, sem RIR, conclui com os segundos', () => {
    const dados = concluirSerie({ tipo: 'cardio', segundos: '1800' });

    expect(dados.segundos).toBe(1800);
    expect(dados.rir).toBeNull();
  });

  it('o RIR informado nesses tipos é validado e guardado', () => {
    const dados = concluirSerie({ tipo: 'aquecimento', repeticoes: '15', rir: '4' });

    expect(dados.rir?.valor).toBe(4);
  });

  it('o RIR informado e inválido nesses tipos também é recusado', () => {
    const erro = erroDe(() => concluirSerie({ tipo: 'aquecimento', repeticoes: '15', rir: '9' }));

    expect(erro).toMatchObject({ campo: 'rir', recebido: '9' });
  });

  it.each(['tempo', 'cardio'] as const)('%s sem segundos é recusado no campo segundos', (tipo) => {
    const erro = erroDe(() => concluirSerie({ tipo }));

    expect(erro).toMatchObject({ campo: 'segundos', recebido: '' });
  });

  it('aquecimento sem repetições é recusado no campo repetições', () => {
    const erro = erroDe(() => concluirSerie({ tipo: 'aquecimento', carga: '20' }));

    expect(erro).toMatchObject({ campo: 'repetições', recebido: '' });
  });
});

describe('concluirSerie: valores inválidos dizem o campo, o valor e o formato (VE)', () => {
  it.each(['-1', 'abc', '10kg', '1,2,3'])('carga "%s" é recusada', (carga) => {
    const erro = erroDe(() =>
      concluirSerie({ tipo: 'trabalho', carga, repeticoes: '10', rir: '2' }),
    );

    expect(erro).toBeInstanceOf(ErroDeValidacao);
    expect(erro).toMatchObject({ campo: 'carga', recebido: carga });
    expect(erro.esperado).toMatch(/número maior ou igual a 0/);
  });

  it.each(['-3', 'abc', '1,5', '0', '10x', ''])('repetições "%s" são recusadas', (repeticoes) => {
    const erro = erroDe(() => concluirSerie({ tipo: 'trabalho', repeticoes, rir: '2' }));

    expect(erro).toBeInstanceOf(ErroDeValidacao);
    expect(erro).toMatchObject({ campo: 'repetições', recebido: repeticoes });
    expect(erro.esperado).toBe('inteiro maior ou igual a 1');
  });

  it.each(['-60', 'abc', '0', '1,5', ''])('segundos "%s" são recusados', (segundos) => {
    const erro = erroDe(() => concluirSerie({ tipo: 'tempo', segundos }));

    expect(erro).toMatchObject({ campo: 'segundos', recebido: segundos });
    expect(erro.esperado).toBe('inteiro maior ou igual a 1');
  });

  it('o primeiro campo inválido, na ordem carga, repetições e RIR, é o que o erro aponta', () => {
    const erro = erroDe(() =>
      concluirSerie({ tipo: 'trabalho', carga: 'x', repeticoes: 'y', rir: 'z' }),
    );

    expect(erro).toMatchObject({ campo: 'carga' });
  });

  it('espaços nas pontas são tolerados', () => {
    const dados = concluirSerie({
      tipo: 'trabalho',
      carga: ' 60 ',
      repeticoes: ' 10 ',
      rir: ' 2 ',
    });

    expect(dados.carga?.gramas).toBe(60000);
    expect(dados.repeticoes).toBe(10);
    expect(dados.rir?.valor).toBe(2);
  });
});

describe('concluirSerie: unilateral guarda o outro lado e conta uma série (RB19)', () => {
  it('repetições e segundos do outro lado são opcionais', () => {
    const dados = concluirSerie({ tipo: 'trabalho', repeticoes: '10', rir: '2' });

    expect(dados.repeticoesOutroLado).toBeNull();
    expect(dados.segundosOutroLado).toBeNull();
  });

  it('com o outro lado informado, devolve os dois valores', () => {
    const dados = concluirSerie({
      tipo: 'trabalho',
      carga: '12',
      repeticoes: '10',
      repeticoesOutroLado: '9',
      rir: '2',
    });

    expect(dados.repeticoes).toBe(10);
    expect(dados.repeticoesOutroLado).toBe(9);
  });

  it('segundos do outro lado valem para série por tempo', () => {
    const dados = concluirSerie({ tipo: 'tempo', segundos: '30', segundosOutroLado: '28' });

    expect(dados.segundosOutroLado).toBe(28);
  });

  it.each([
    ['repeticoesOutroLado', 'repetições do outro lado'],
    ['segundosOutroLado', 'segundos do outro lado'],
  ] as const)('%s inválido é recusado no campo "%s"', (chave, campo) => {
    const tipo = chave === 'segundosOutroLado' ? 'tempo' : 'trabalho';
    const base = tipo === 'tempo' ? { segundos: '30' } : { repeticoes: '10', rir: '2' };
    const erro = erroDe(() => concluirSerie({ tipo, ...base, [chave]: '-2' }));

    expect(erro).toMatchObject({ campo, recebido: '-2' });
  });
});

describe('rirInicial: o RIR que a série já traz preenchido', () => {
  it('meta "falha" em série de trabalho vem com RIR 0', () => {
    expect(rirInicial('trabalho', MetaDeSerie.deTexto('falha'))?.valor).toBe(0);
  });

  it.each(['10', '8-12', '60s'])('meta "%s" vem sem RIR', (texto) => {
    expect(rirInicial('trabalho', MetaDeSerie.deTexto(texto))).toBeNull();
  });

  it('sem meta vem sem RIR', () => {
    expect(rirInicial('trabalho', null)).toBeNull();
  });

  it.each(['aquecimento', 'tempo', 'cardio'] as const)(
    'meta "falha" em série de %s não preenche RIR',
    (tipo) => {
      expect(rirInicial(tipo, MetaDeSerie.deTexto('falha'))).toBeNull();
    },
  );
});

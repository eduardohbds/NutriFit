import { AtivarFicha } from '../../src/aplicacao/casos-de-uso/ativar-ficha';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { SituacaoDaFicha } from '../../src/dominio/ficha';
import { Identificador } from '../../src/dominio/identificador';
import { FabricaDeFichas } from '../apoio/ficha-de-exemplo';
import { RepositorioDeFichasEmMemoria } from '../dubles/repositorio-de-fichas-em-memoria';

const EXERCICIO = Identificador.de('00000000-0000-7000-8000-0000000f1001');

function iniciar() {
  const fichas = new RepositorioDeFichasEmMemoria();
  const fabrica = new FabricaDeFichas(EXERCICIO);
  const gravar = async (nome: string, situacao: SituacaoDaFicha) => {
    const ficha = { ...fabrica.ficha(), nome, situacao };
    await fichas.criarFicha(ficha, fabrica.versao({ series: 1, cargaEmQuilos: 40 }));
    return ficha;
  };
  const situacoes = async () => (await fichas.listarFichas()).map((f) => f.situacao);
  return { caso: new AtivarFicha(fichas), gravar, situacoes };
}

describe('AtivarFicha (US-009a, SL09)', () => {
  it('marca a ficha escolhida como ativa e a outra deixa de ser ativa', async () => {
    const { caso, gravar, situacoes } = iniciar();
    await gravar('Treino A', 'ativa');
    const treinoB = await gravar('Treino B', 'inativa');

    await caso.executar(treinoB.id);

    expect(await situacoes()).toEqual(['inativa', 'ativa']);
  });

  it('ativar a ficha que já está ativa não muda nada e não falha', async () => {
    const { caso, gravar, situacoes } = iniciar();
    const treinoA = await gravar('Treino A', 'ativa');
    await gravar('Treino B', 'inativa');

    await caso.executar(treinoA.id);

    expect(await situacoes()).toEqual(['ativa', 'inativa']);
  });

  it('recusa a ficha arquivada, dizendo o valor recebido e o formato esperado, sem alterar nada', async () => {
    const { caso, gravar, situacoes } = iniciar();
    await gravar('Treino A', 'ativa');
    const antiga = await gravar('Treino Antigo', 'arquivada');

    const erro = await caso.executar(antiga.id).then(
      () => undefined,
      (e: unknown) => e,
    );

    expect(erro).toBeInstanceOf(ErroDeValidacao);
    expect((erro as ErroDeValidacao).campo).toBe('ficha');
    expect((erro as ErroDeValidacao).recebido).toBe('arquivada');
    expect((erro as ErroDeValidacao).esperado).toMatch(/ativa ou inativa/);
    expect(await situacoes()).toEqual(['ativa', 'arquivada']);
  });

  it('recusa a ficha que não existe com ErroDeValidacao', async () => {
    const { caso } = iniciar();
    const inexistente = Identificador.de('00000000-0000-7000-8000-00000000ffff');

    await expect(caso.executar(inexistente)).rejects.toBeInstanceOf(ErroDeValidacao);
  });
});

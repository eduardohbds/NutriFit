import { ListarFichas } from '../../src/aplicacao/casos-de-uso/listar-fichas';
import type { Ficha, SituacaoDaFicha } from '../../src/dominio/ficha';
import { Identificador } from '../../src/dominio/identificador';
import { FabricaDeFichas } from '../apoio/ficha-de-exemplo';
import { RepositorioDeFichasEmMemoria } from '../dubles/repositorio-de-fichas-em-memoria';

const EXERCICIO = Identificador.de('00000000-0000-7000-8000-0000000d1001');

function iniciar() {
  const fichas = new RepositorioDeFichasEmMemoria();
  const fabrica = new FabricaDeFichas(EXERCICIO);
  const gravar = async (nome: string, situacao: SituacaoDaFicha, versoes = 1) => {
    const ficha: Ficha = { ...fabrica.ficha(), nome, situacao };
    await fichas.criarFicha(ficha, fabrica.versao({ series: 1, cargaEmQuilos: 40 }));
    for (let i = 1; i < versoes; i++) {
      const versao = fabrica.versao({ series: 1, cargaEmQuilos: 40 + i });
      await fichas.salvarNovaVersao(ficha.id, versao);
    }
    return ficha;
  };
  return { caso: new ListarFichas(fichas), gravar };
}

describe('ListarFichas (US-007c1)', () => {
  it('sem nenhuma ficha devolve lista vazia', async () => {
    const { caso } = iniciar();

    expect(await caso.executar()).toEqual([]);
  });

  it('devolve nome, situação e o número da versão atual de cada ficha', async () => {
    const { caso, gravar } = iniciar();
    const treino = await gravar('Treino A', 'inativa', 3);

    const [lida] = await caso.executar();

    expect(lida).toEqual({ id: treino.id, nome: 'Treino A', situacao: 'inativa', versaoAtual: 3 });
  });

  it('põe a ficha ativa primeiro e ordena as demais pelo nome, sem diferenciar acento nem caixa', async () => {
    const { caso, gravar } = iniciar();
    await gravar('Zeta', 'inativa');
    await gravar('árvore', 'inativa');
    await gravar('Beta', 'ativa');

    const nomes = (await caso.executar()).map((f) => f.nome);

    expect(nomes).toEqual(['Beta', 'árvore', 'Zeta']);
  });

  it('a ficha arquivada sai das escolhas, mas continua guardada', async () => {
    const { caso, gravar } = iniciar();
    await gravar('Antiga', 'arquivada');
    await gravar('Atual', 'inativa');

    const nomes = (await caso.executar()).map((f) => f.nome);

    expect(nomes).toEqual(['Atual']);
  });
});

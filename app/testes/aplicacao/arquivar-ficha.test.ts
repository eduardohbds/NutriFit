import { ArquivarFicha } from '../../src/aplicacao/casos-de-uso/arquivar-ficha';
import { ListarFichas } from '../../src/aplicacao/casos-de-uso/listar-fichas';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { SituacaoDaFicha } from '../../src/dominio/ficha';
import { Identificador } from '../../src/dominio/identificador';
import { FabricaDeFichas } from '../apoio/ficha-de-exemplo';
import { RepositorioDeFichasEmMemoria } from '../dubles/repositorio-de-fichas-em-memoria';

const EXERCICIO = Identificador.de('00000000-0000-7000-8000-0000000f2001');

function iniciar() {
  const fichas = new RepositorioDeFichasEmMemoria();
  const fabrica = new FabricaDeFichas(EXERCICIO);
  const gravar = async (nome: string, situacao: SituacaoDaFicha) => {
    const ficha = { ...fabrica.ficha(), nome, situacao };
    await fichas.criarFicha(ficha, fabrica.versao({ series: 1, cargaEmQuilos: 40 }));
    await fichas.salvarNovaVersao(ficha.id, fabrica.versao({ series: 2, cargaEmQuilos: 45 }));
    return ficha;
  };
  return { fichas, gravar, caso: new ArquivarFicha(fichas), lista: new ListarFichas(fichas) };
}

describe('ArquivarFicha (US-009a, RB04)', () => {
  it('a ficha arquivada some das escolhas, mas ela e as versões continuam guardadas', async () => {
    const { fichas, gravar, caso, lista } = iniciar();
    const antiga = await gravar('Treino Antigo', 'inativa');
    await gravar('Treino Atual', 'inativa');
    const versoesAntes = await fichas.listarVersoes(antiga.id);

    await caso.executar(antiga.id);

    expect((await lista.executar()).map((f) => f.nome)).toEqual(['Treino Atual']);
    expect((await fichas.listarFichas()).map((f) => f.nome)).toContain('Treino Antigo');
    expect(await fichas.listarVersoes(antiga.id)).toEqual(versoesAntes);
  });

  it('arquivar a ficha ativa deixa o app sem ficha ativa', async () => {
    const { fichas, gravar, caso } = iniciar();
    const ativa = await gravar('Treino A', 'ativa');
    await gravar('Treino B', 'inativa');

    await caso.executar(ativa.id);

    const situacoes = (await fichas.listarFichas()).map((f) => f.situacao);
    expect(situacoes).toEqual(['arquivada', 'inativa']);
  });

  it('arquivar a ficha que já está arquivada não muda nada e não falha', async () => {
    const { fichas, gravar, caso } = iniciar();
    const antiga = await gravar('Treino Antigo', 'arquivada');

    await caso.executar(antiga.id);

    expect((await fichas.listarFichas()).map((f) => f.situacao)).toEqual(['arquivada']);
  });

  it('recusa a ficha que não existe com ErroDeValidacao', async () => {
    const { caso } = iniciar();
    const inexistente = Identificador.de('00000000-0000-7000-8000-00000000ffff');

    await expect(caso.executar(inexistente)).rejects.toBeInstanceOf(ErroDeValidacao);
  });
});

import { SalvarFicha, type PedidoDeFicha } from '../../src/aplicacao/casos-de-uso/salvar-ficha';
import {
  comExercicio,
  comLinhaNova,
  comNome,
  comRotinaNova,
  pedidoDoRascunho,
  rascunhoDeFichaNova,
} from '../../src/aplicacao/rascunho-da-ficha';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { Identificador } from '../../src/dominio/identificador';
import { fichasParaTela } from '../apoio/fichas-de-tela';
import { GeradorDeIdentificadorSequencial } from '../dubles/gerador-de-identificador-sequencial';
import { RelogioFixo } from '../dubles/relogio-fixo';
import { RepositorioDeFichasEmMemoria } from '../dubles/repositorio-de-fichas-em-memoria';

describe('rascunhoDeFichaNova (US-007d4)', () => {
  it('nasce vazio: sem identificador, sem nome e sem rotinas, com o tipo de rotina escolhido', () => {
    expect(rascunhoDeFichaNova('dia-da-semana')).toEqual({
      fichaId: null,
      nome: '',
      tipoDeRotina: 'dia-da-semana',
      rotinas: [],
    });
    expect(rascunhoDeFichaNova('rotacao').tipoDeRotina).toBe('rotacao');
  });

  it('a primeira rotina segue o tipo: Segunda (dia 1) por dia da semana, Treino A por rotação', () => {
    const porDia = comRotinaNova(rascunhoDeFichaNova('dia-da-semana'));
    const porRotacao = comRotinaNova(rascunhoDeFichaNova('rotacao'));

    expect(porDia.rotinas).toEqual([{ nome: 'Segunda', diaDaSemana: 1, itens: [] }]);
    expect(porRotacao.rotinas).toEqual([{ nome: 'Treino A', diaDaSemana: null, itens: [] }]);
  });

  it('o pedido da ficha nova não leva identificador, para o SalvarFicha criar a ficha', () => {
    const rascunho = comNome(rascunhoDeFichaNova('rotacao'), 'Treino novo');

    const pedido = pedidoDoRascunho(rascunho, '');

    expect(pedido.fichaId).toBeUndefined();
    expect(pedido.nome).toBe('Treino novo');
    expect(pedido.rotinas).toEqual([]);
  });

  it('a ficha montada passa pelo SalvarFicha, nasce inativa e grava a versão 1', async () => {
    const pronto = await fichasParaTela();
    const fichas = new RepositorioDeFichasEmMemoria();
    const salvar = new SalvarFicha(
      fichas,
      pronto.catalogo,
      new GeradorDeIdentificadorSequencial(),
      new RelogioFixo(),
    );
    const supino = { id: pronto.ids.get('Supino Reto')!, nome: 'Supino Reto' };
    const montado = comLinhaNova(
      comRotinaNova(comNome(rascunhoDeFichaNova('dia-da-semana'), '  Treino novo ')),
      0,
      supino,
    );

    const { fichaId, versao } = await salvar.executar(pedidoDoRascunho(montado, ''));

    const [ficha] = await fichas.listarFichas();
    expect(ficha).toMatchObject({ nome: 'Treino novo', situacao: 'inativa', origem: 'manual' });
    expect(ficha.id).toEqual(fichaId);
    expect(versao.numero).toBe(1);
    expect(versao.rotinas.map((r) => [r.nome, r.diaDaSemana, r.itens.length])).toEqual([
      ['Segunda', 1, 1],
    ]);
    expect(versao.rotinas[0].itens[0].series).toHaveLength(3);
  });

  it('a ficha nova ainda sem nome ou sem rotinas é recusada pelo SalvarFicha, sem gravar nada', async () => {
    const pronto = await fichasParaTela();
    const fichas = new RepositorioDeFichasEmMemoria();
    const salvar = new SalvarFicha(
      fichas,
      pronto.catalogo,
      new GeradorDeIdentificadorSequencial(),
      new RelogioFixo(),
    );
    const semNome: PedidoDeFicha = pedidoDoRascunho(rascunhoDeFichaNova('rotacao'), '');
    const semRotinas = pedidoDoRascunho(comNome(rascunhoDeFichaNova('rotacao'), 'X'), '');

    await expect(salvar.executar(semNome)).rejects.toBeInstanceOf(ErroDeValidacao);
    await expect(salvar.executar(semRotinas)).rejects.toBeInstanceOf(ErroDeValidacao);
    expect(await fichas.listarFichas()).toEqual([]);
  });

  it('comExercicio e demais funções seguem valendo no rascunho da ficha nova', () => {
    const base = comRotinaNova(rascunhoDeFichaNova('rotacao'));
    const novo = comLinhaNova(base, 0, {
      id: Identificador.de('00000000-0000-7000-8000-0000000b5001'),
      nome: 'Supino Reto',
    });

    const trocado = comExercicio(novo, 0, 0, {
      id: Identificador.de('00000000-0000-7000-8000-0000000b5002'),
      nome: 'Remada Curvada',
    });

    expect(trocado.rotinas[0].itens[0].exercicioNome).toBe('Remada Curvada');
  });
});

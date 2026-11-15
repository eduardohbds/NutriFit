import { RegistrarFalha } from '../../src/aplicacao/casos-de-uso/registrar-falha';
import { RegistrarSerie } from '../../src/aplicacao/casos-de-uso/registrar-serie';
import { Identificador } from '../../src/dominio/identificador';
import { FabricaDeSessoes } from '../apoio/sessao-de-exemplo';
import { RegistroDeFalhasEmMemoria } from '../dubles/registro-de-falhas-em-memoria';
import { RelogioFixo } from '../dubles/relogio-fixo';
import { RepositorioDeSessoesSemEspaco } from '../dubles/repositorio-de-sessoes-sem-espaco';

async function montar() {
  const sessoes = new RepositorioDeSessoesSemEspaco();
  const registro = new RegistroDeFalhasEmMemoria();
  const registrarSerie = new RegistrarSerie(
    sessoes,
    new RegistrarFalha(registro, new RelogioFixo(), '0.0.1'),
  );
  const fabrica = new FabricaDeSessoes(Identificador.de('00000000-0000-7000-8000-00000000e001'));
  const sessao = { ...fabrica.sessao({ fichaId: null, versaoId: null, rotinaId: null }) };
  const exercicio = fabrica.exercicio();
  await sessoes.iniciarSessao(sessao);
  await sessoes.adicionarExercicio(sessao.id, exercicio);
  const serie = fabrica.serie({ cargaEmQuilos: 60, repeticoes: 10, rir: 3 });
  return {
    sessoes,
    registro,
    registrarSerie,
    sessao,
    confirmada: { exercicioDaSessaoId: exercicio.id, serie },
  };
}

describe('RegistrarSerie: a série confirmada é gravada antes de qualquer outra coisa (RNF08)', () => {
  it('grava a série confirmada na sessão', async () => {
    const { sessoes, registrarSerie, sessao, confirmada } = await montar();

    expect(await registrarSerie.executar(confirmada)).toEqual({ gravada: true });

    expect((await sessoes.buscarSessao(sessao.id))?.exercicios[0].series).toEqual([
      confirmada.serie,
    ]);
  });

  it('sem espaço no aparelho, não grava nada, avisa e registra a falha sem valores (CE61)', async () => {
    const { sessoes, registro, registrarSerie, sessao, confirmada } = await montar();
    sessoes.cheio = true;

    expect(await registrarSerie.executar(confirmada)).toEqual({
      gravada: false,
      motivo: 'sem_espaco',
    });

    expect((await sessoes.buscarSessao(sessao.id))?.exercicios[0].series).toEqual([]);
    const [linha] = (await registro.lerLinhas()).map((l) => JSON.parse(l));
    expect(linha).toMatchObject({ nivel: 'erro', onde: 'RegistrarSerie', codigo: 'SEM_ESPACO' });
    expect(JSON.stringify(linha)).not.toContain('60');
  });

  it('liberado o espaço, a mesma série confirmada pode ser enviada de novo e é gravada (CE61)', async () => {
    const { sessoes, registrarSerie, sessao, confirmada } = await montar();
    sessoes.cheio = true;
    await registrarSerie.executar(confirmada);
    sessoes.cheio = false;

    expect(await registrarSerie.executar(confirmada)).toEqual({ gravada: true });

    expect((await sessoes.buscarSessao(sessao.id))?.exercicios[0].series).toEqual([
      confirmada.serie,
    ]);
  });

  it('erro inesperado é registrado e repassado, nunca engolido', async () => {
    const { sessoes, registro, registrarSerie, confirmada } = await montar();
    sessoes.falhaInesperada = new Error('banco corrompido');

    await expect(registrarSerie.executar(confirmada)).rejects.toThrow('banco corrompido');

    const [linha] = (await registro.lerLinhas()).map((l) => JSON.parse(l));
    expect(linha).toMatchObject({ onde: 'RegistrarSerie', codigo: 'ERRO_INESPERADO' });
  });
});

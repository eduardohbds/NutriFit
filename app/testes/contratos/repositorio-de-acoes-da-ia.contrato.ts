import type { RepositorioDeAcoesDaIA } from '../../src/aplicacao/portas/repositorio-de-acoes-da-ia';
import type { RepositorioDeFichas } from '../../src/aplicacao/portas/repositorio-de-fichas';
import type { AcaoDaIA } from '../../src/dominio/acao-da-ia';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { Identificador } from '../../src/dominio/identificador';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import { FabricaDeFichas } from '../apoio/ficha-de-exemplo';

export interface CenarioDeAcoesDaIA {
  acoes: RepositorioDeAcoesDaIA;
  fichas: RepositorioDeFichas;
  // Exercício que já existe no armazenamento; o SQLite exige o vínculo (seção 18.6).
  exercicioId: Identificador;
}

function acaoDeExemplo(final: string, versaoCriadaId: Identificador | null): AcaoDaIA {
  return {
    id: Identificador.de(`00000000-0000-7000-8000-00000000a${final}`),
    comando: 'troque o supino por supino inclinado',
    criadaEm: InstanteUtc.de('2026-11-12T10:00:00.000Z'),
    tipo: 'alterar_ficha',
    resultado: 'aplicada',
    versaoCriadaId,
    resumo: 'Supino reto trocado por supino inclinado',
    desfeita: false,
  };
}

// Roda contra o falso em memória e contra o adaptador SQLite: os dois precisam passar (RT05).
export function contratoDoRepositorioDeAcoesDaIA(nome: string, criar: () => CenarioDeAcoesDaIA) {
  describe(`contrato do RepositorioDeAcoesDaIA: ${nome}`, () => {
    async function registrar() {
      const { acoes, fichas, exercicioId } = criar();
      const fabrica = new FabricaDeFichas(exercicioId);
      const ficha = fabrica.ficha();
      const versao = await fichas.criarFicha(
        ficha,
        fabrica.versao({ series: 3, cargaEmQuilos: 60 }),
      );
      const acao = acaoDeExemplo('001', versao.id);
      const outra = acaoDeExemplo('002', null);
      await acoes.registrar(acao);
      await acoes.registrar(outra);
      return { acoes, acao, outra };
    }

    it('guarda a ação registrada, ainda não desfeita', async () => {
      const { acoes, acao } = await registrar();

      expect(await acoes.buscar(acao.id)).toEqual(acao);
    });

    it('ao desfazer, o único campo que muda é a marca de desfeita', async () => {
      const { acoes, acao, outra } = await registrar();

      await acoes.desfazer(acao.id);

      expect(await acoes.buscar(acao.id)).toEqual({ ...acao, desfeita: true });
      expect(await acoes.buscar(outra.id)).toEqual(outra);
    });

    it('recusa desfazer ação que não existe, sem criar nada', async () => {
      const { acoes } = await registrar();
      const inexistente = Identificador.de('00000000-0000-7000-8000-00000000afff');

      await expect(acoes.desfazer(inexistente)).rejects.toThrow(ErroDeValidacao);
      expect(await acoes.buscar(inexistente)).toBeNull();
    });
  });
}

import type { RepositorioDoCatalogo } from '../../src/aplicacao/portas/repositorio-do-catalogo';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { Identificador } from '../../src/dominio/identificador';

export interface CenarioDoCatalogo {
  repositorio: RepositorioDoCatalogo;
  // Cada função cria o que descreve no armazenamento e devolve o identificador. Um cenário novo
  // por teste: cada teste chama só uma delas.
  exercicioSemUso(): Identificador;
  exercicioEmVersaoDeFicha(): Identificador;
  exercicioEmSessao(): Identificador;
  fichaSemSessao(): Identificador;
  fichaComSessao(): Identificador;
}

const INEXISTENTE = Identificador.de('00000000-0000-7000-8000-00000000ffff');

// Roda contra o falso em memória e contra o adaptador SQLite: os dois precisam passar (RT05).
export function contratoDoRepositorioDoCatalogo(nome: string, criar: () => CenarioDoCatalogo) {
  describe(`contrato do RepositorioDoCatalogo: ${nome}`, () => {
    it('exercício com sessão registrada só oferece arquivar (seção 18.6)', async () => {
      const { repositorio, exercicioEmSessao } = criar();
      expect(await repositorio.opcoesDeRemocaoDoExercicio(exercicioEmSessao())).toEqual([
        'arquivar',
      ]);
    });

    it('exercício usado numa versão de ficha, mesmo sem sessão, só oferece arquivar', async () => {
      const { repositorio, exercicioEmVersaoDeFicha } = criar();
      expect(await repositorio.opcoesDeRemocaoDoExercicio(exercicioEmVersaoDeFicha())).toEqual([
        'arquivar',
      ]);
    });

    it('exercício sem nenhum uso oferece arquivar e excluir', async () => {
      const { repositorio, exercicioSemUso } = criar();
      expect(await repositorio.opcoesDeRemocaoDoExercicio(exercicioSemUso())).toEqual([
        'arquivar',
        'excluir',
      ]);
    });

    it('ficha com sessões só oferece arquivar (seção 18.6)', async () => {
      const { repositorio, fichaComSessao } = criar();
      expect(await repositorio.opcoesDeRemocaoDaFicha(fichaComSessao())).toEqual(['arquivar']);
    });

    it('ficha sem sessões também só oferece arquivar, porque excluir apagaria versões (RB02)', async () => {
      const { repositorio, fichaSemSessao } = criar();
      expect(await repositorio.opcoesDeRemocaoDaFicha(fichaSemSessao())).toEqual(['arquivar']);
    });

    it('excluir um exercício com histórico é recusado e ele continua como estava', async () => {
      const { repositorio, exercicioEmSessao } = criar();
      const id = exercicioEmSessao();

      await expect(repositorio.excluirExercicio(id)).rejects.toBeInstanceOf(ErroDeValidacao);

      expect(await repositorio.situacaoDoExercicio(id)).toBe('ativo');
    });

    it('arquivar um exercício com histórico muda só a situação e o mantém consultável', async () => {
      const { repositorio, exercicioEmSessao } = criar();
      const id = exercicioEmSessao();

      await repositorio.arquivarExercicio(id);

      expect(await repositorio.situacaoDoExercicio(id)).toBe('arquivado');
      expect(await repositorio.opcoesDeRemocaoDoExercicio(id)).toEqual(['arquivar']);
    });

    it('excluir um exercício sem uso o remove', async () => {
      const { repositorio, exercicioSemUso } = criar();
      const id = exercicioSemUso();

      await repositorio.excluirExercicio(id);

      expect(await repositorio.situacaoDoExercicio(id)).toBeNull();
    });

    it('arquivar uma ficha muda só a situação dela', async () => {
      const { repositorio, fichaComSessao } = criar();
      const id = fichaComSessao();

      await repositorio.arquivarFicha(id);

      expect(await repositorio.situacaoDaFicha(id)).toBe('arquivada');
    });

    it('arquivar ou excluir o que não existe falha sem alterar nada', async () => {
      const { repositorio } = criar();
      await expect(repositorio.arquivarExercicio(INEXISTENTE)).rejects.toBeInstanceOf(
        ErroDeValidacao,
      );
      await expect(repositorio.excluirExercicio(INEXISTENTE)).rejects.toBeInstanceOf(
        ErroDeValidacao,
      );
      await expect(repositorio.arquivarFicha(INEXISTENTE)).rejects.toBeInstanceOf(ErroDeValidacao);
    });
  });
}

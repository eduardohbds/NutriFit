// Todo texto exibido ao usuário fica aqui, em português do Brasil (RES23, RNF35).
export const textos = {
  migracao: {
    revertida: 'A atualização dos dados não deu certo. Seus dados anteriores foram mantidos.',
    naoMigrada: 'Não foi possível atualizar os dados agora. Nada foi alterado.',
  },
  erroInesperado: {
    mensagem: 'Algo deu errado. Os dados já gravados continuam salvos.',
    tentarDeNovo: 'Tentar de novo',
  },
  catalogo: {
    titulo: 'Catálogo de exercícios',
    abrir: 'Abrir o catálogo',
    diretos: (grupos: string[]) => `Diretos: ${grupos.join(', ')}`,
    indiretos: (grupos: string[]) => `Indiretos: ${grupos.join(', ')}`,
    semGrupos: 'Sem grupos: fora da contagem de séries',
    editarGrupos: (nome: string) => `Editar grupos de ${nome}`,
    marcarDireto: (grupo: string) => `${grupo}: direto`,
    marcarIndireto: (grupo: string) => `${grupo}: indireto`,
    salvar: 'Salvar',
    cancelar: 'Cancelar',
    confirmarSemGrupos:
      'Este exercício ficará sem grupos e fora da contagem de séries. Salvar assim?',
    salvarSemGrupos: 'Salvar sem grupos',
  },
  fichas: {
    titulo: 'Fichas',
    abrir: 'Abrir as fichas',
    semFichas: 'Nenhuma ficha ainda.',
    situacao: { ativa: 'Ativa', inativa: 'Inativa' },
    versao: (numero: number) => `Versão ${numero}`,
    abrirFicha: (nome: string) => `Abrir ${nome}`,
    voltar: 'Voltar às fichas',
    diaDaSemana: (dia: string) => `Dia: ${dia}`,
    exercicio: (ordem: number, nome: string) => `${ordem}. ${nome}`,
    series: (quantidade: number) => (quantidade === 1 ? '1 série' : `${quantidade} séries`),
    meta: (meta: string) => `Meta: ${meta}`,
    carga: (carga: string) => `Carga (kg): ${carga}`,
    tecnica: (tecnica: string) => `Técnica: ${tecnica}`,
    descanso: (descanso: string) => `Descanso (s): ${descanso}`,
    grupo: (grupo: string) => `Grupo ${grupo}`,
    unilateral: 'Unilateral',
    observacoes: (texto: string) => `Observações: ${texto}`,
    editar: 'Editar',
    cancelarEdicao: 'Cancelar edição',
    voltarParaEdicao: 'Voltar à edição',
    trocarExercicio: (rotina: string, ordem: number) =>
      `Trocar exercício, ${rotina}, linha ${ordem}`,
    buscarExercicio: 'Buscar exercício',
    escolherExercicio: (nome: string) => `Escolher ${nome}`,
    semResultado: 'Nenhum exercício encontrado.',
    campo: {
      quantidade: 'Séries',
      meta: 'Meta',
      carga: 'Carga (kg)',
      tecnica: 'Técnica',
      descanso: 'Descanso (s)',
    },
    rotuloDoCampo: (campo: string, rotina: string, ordem: number) =>
      `${campo}, ${rotina}, linha ${ordem}`,
    diasDaSemana: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'],
  },
  validacao: {
    recusado: (recebido: string, esperado: string) =>
      `Valor recebido: ${recebido}. Formato esperado: ${esperado}.`,
  },
};

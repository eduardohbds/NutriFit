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
  validacao: {
    recusado: (recebido: string, esperado: string) =>
      `Valor recebido: ${recebido}. Formato esperado: ${esperado}.`,
  },
};

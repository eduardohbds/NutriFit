// Único lugar que conhece todos os adaptadores e os liga às portas (AGENTS.md seção 3).
import Constants from 'expo-constants';

import { RegistroDeFalhasEmArquivo } from '../adaptadores/sistema/registro-de-falhas-em-arquivo';
import { RelogioDoSistema } from '../adaptadores/sistema/relogio-do-sistema';
import { RegistrarFalha } from '../aplicacao/casos-de-uso/registrar-falha';

const versaoApp = Constants.expoConfig?.version ?? '0.0.0';

export const registrarFalha = new RegistrarFalha(
  new RegistroDeFalhasEmArquivo(),
  new RelogioDoSistema(),
  versaoApp,
);

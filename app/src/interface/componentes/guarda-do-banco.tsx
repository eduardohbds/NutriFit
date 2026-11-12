import { useEffect, useState, type ReactNode } from 'react';

import type { AbrirBanco } from '../../aplicacao/casos-de-uso/abrir-banco';
import type { SituacaoDaMigracao } from '../../aplicacao/casos-de-uso/migrar-banco';
import { AvisoDeMigracao } from './aviso-de-migracao';

type Estado = { fase: 'abrindo' } | { fase: 'pronto'; situacao: SituacaoDaMigracao };

// Nenhuma tela usa o banco antes de ele estar aberto e migrado. Uma falha ao abrir é relançada
// na renderização para chegar ao limite de erro, que registra e avisa (nunca engolir).
export function GuardaDoBanco(props: { abrirBanco: AbrirBanco; children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ fase: 'abrindo' });
  const [erro, setErro] = useState<unknown>(null);

  useEffect(() => {
    props.abrirBanco.executar().then(
      ({ situacao }) => setEstado({ fase: 'pronto', situacao }),
      (falha: unknown) => setErro(falha ?? new Error('falha ao abrir o banco')),
    );
  }, [props.abrirBanco]);

  if (erro) throw erro;
  if (estado.fase === 'abrindo') return null;
  return (
    <>
      <AvisoDeMigracao situacao={estado.situacao} />
      {props.children}
    </>
  );
}

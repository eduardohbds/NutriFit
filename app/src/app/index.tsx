import { GoogleSignin, isErrorWithCode, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { count } from 'drizzle-orm';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useState } from 'react';
import { Button, ScrollView, Text } from 'react-native';

import migrations from '../../drizzle/migrations';
import { banco, sqlite } from '../db/banco';
import { teste } from '../db/esquema';

GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });

export default function Spike() {
  const { success, error } = useMigrations(banco, migrations);
  const [linhas, setLinhas] = useState<number | null>(null);
  const [login, setLogin] = useState('ainda não tentado');

  async function gravarSerie() {
    await banco.insert(teste).values({ id: String(Date.now()), criadoEm: new Date().toISOString(), carga: 22500 });
    const [r] = await banco.select({ n: count() }).from(teste);
    setLinhas(r.n);
  }

  async function entrar() {
    try {
      await GoogleSignin.hasPlayServices();
      const resposta = await GoogleSignin.signIn();
      if (!isSuccessResponse(resposta)) return setLogin(`resposta: ${resposta.type}`);
      // Nunca exibir nem gravar o token inteiro: só o tamanho (AGENTS.md seção 8).
      setLogin(`ok: ${resposta.data.user.email}, idToken de ${resposta.data.idToken?.length ?? 0} caracteres`);
    } catch (e) {
      setLogin(isErrorWithCode(e) ? `erro ${e.code}: ${e.message}` : `erro: ${String(e)}`);
    }
  }

  const journal = (sqlite.getFirstSync('PRAGMA journal_mode') as { journal_mode: string }).journal_mode;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text>Migração aplicada: {error ? `ERRO ${error.message}` : success ? 'sim' : 'aguardando'}</Text>
      <Text>journal_mode: {journal}</Text>
      <Button title="Gravar série de teste" onPress={gravarSerie} disabled={!success} />
      <Text>Linhas na tabela teste: {linhas ?? '?'}</Text>
      <Button title="Entrar com Google" onPress={entrar} />
      <Text>Login: {login}</Text>
    </ScrollView>
  );
}

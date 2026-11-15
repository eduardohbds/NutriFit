import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { textos } from '../src/interface/textos';

// Rota fina: as telas de verdade ficam em src/interface (AGENTS.md seção 3).
export default function Inicio() {
  return (
    <View>
      <Text>NutriFit</Text>
      <Link href="/catalogo">{textos.catalogo.abrir}</Link>
    </View>
  );
}

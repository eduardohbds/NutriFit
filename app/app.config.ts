import type { ExpoConfig } from 'expo/config';

// A variante "dev" convive no mesmo celular com a de release e não toca nos treinos reais (arquitetura 13.3).
const ehDev = process.env.APP_VARIANT === 'dev';

const config: ExpoConfig = {
  name: ehDev ? 'NutriFit (dev)' : 'NutriFit',
  slug: 'nutrifit',
  version: '0.0.1',
  orientation: 'portrait',
  scheme: 'nutrifit',
  userInterfaceStyle: 'automatic',
  android: { package: ehDev ? 'com.ehbds.nutrifit.dev' : 'com.ehbds.nutrifit' },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-sqlite',
    '@react-native-google-signin/google-signin',
  ],
  experiments: { typedRoutes: true },
};

export default config;

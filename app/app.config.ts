import type { ExpoConfig } from 'expo/config';

// Spike SP01: variante "dev" convive no mesmo celular com a de release (arquitetura 13.3).
const ehDev = process.env.APP_VARIANT === 'dev';
const pacote = ehDev ? 'com.ehbds.nutrifit.dev' : 'com.ehbds.nutrifit';

const config: ExpoConfig = {
  name: ehDev ? 'NutriFit (dev)' : 'NutriFit',
  slug: 'nutrifit',
  version: '0.0.1',
  orientation: 'portrait',
  scheme: 'nutrifit',
  userInterfaceStyle: 'automatic',
  android: { package: pacote },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['expo-sqlite', {}],
    '@react-native-google-signin/google-signin',
  ],
  experiments: { typedRoutes: true },
};

export default config;

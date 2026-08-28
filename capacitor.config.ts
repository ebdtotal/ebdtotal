import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.portalebd.app',
  appName: 'EDB Total',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'EDBTotal',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#152238',
    },
  },
}

export default config

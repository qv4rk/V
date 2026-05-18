import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/necronomy-atlas/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  resolve: {
    alias: {
      // Fix for react-globe.gl trying to import from three/webgpu and three/tsl
      // These don't exist in older Three.js versions, so we stub them out
      'three/webgpu': 'three',
      'three/tsl': 'three'
    }
  },
  optimizeDeps: {
    exclude: ['three/webgpu', 'three/tsl']
  }
});

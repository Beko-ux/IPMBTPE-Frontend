// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })



import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Configuration pour jsPDF et html2canvas
  optimizeDeps: {
    include: ['jspdf', 'html2canvas'],
    exclude: [] // Retirer 'jspdf' et 'html2canvas' si ça cause des problèmes
  },
  
  // Configuration pour les imports
  esbuild: {
    supported: {
      'top-level-await': true
    }
  },
  
  // Configuration du build
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    rollupOptions: {
      external: [], // Vous pouvez ajouter des packages à externaliser si nécessaire
      output: {
        manualChunks: {
          'pdf-libs': ['jspdf', 'html2canvas']
        }
      }
    }
  },
  
  // Configuration du serveur
  server: {
    fs: {
      strict: false
    }
  }
})
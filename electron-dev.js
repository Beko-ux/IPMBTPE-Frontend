// electron-dev.js
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Démarrer Vite
const viteProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Attendre que Vite soit prêt
setTimeout(() => {
  // Démarrer Electron
  const electronProcess = spawn('electron', ['.'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
  });

  // Nettoyer à la fermeture
  electronProcess.on('close', (code) => {
    viteProcess.kill();
    process.exit(code);
  });

  process.on('SIGINT', () => {
    viteProcess.kill();
    electronProcess.kill();
    process.exit();
  });
}, 3000); // Attendre 3 secondes pour que Vite démarre
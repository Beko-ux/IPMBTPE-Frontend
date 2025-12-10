// start-app.js
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 IPMBTPE - Démarrage de l\'application complète');
console.log('===============================================');
console.log('📁 Dossier courant:', __dirname);

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function logStep(step, message) {
  console.log(`\n${colors.cyan}${step}${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✅${colors.reset} ${message}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠️${colors.reset} ${message}`);
}

function logError(message) {
  console.log(`${colors.magenta}❌${colors.reset} ${message}`);
}

// Vérifier si le backend existe
const backendPath = path.join(__dirname, '../backend');
const hasBackend = fs.existsSync(backendPath);

async function startBackend() {
  if (!hasBackend) {
    logWarning('Backend non trouvé dans ../backend/');
    logWarning('Poursuite sans backend (mode démo)');
    return null;
  }
  
  logStep('1️⃣', 'Démarrage du backend Node.js...');
  
  return new Promise((resolve) => {
    const backend = spawn('npm', ['start'], {
      cwd: backendPath,
      shell: true,
      stdio: 'pipe'
    });
    
    backend.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`  ${colors.blue}[Backend]${colors.reset} ${output}`);
      
      if (output.includes('Server running') || output.includes('Listening on')) {
        logSuccess('Backend démarré sur http://localhost:4000');
        resolve(backend);
      }
    });
    
    backend.stderr.on('data', (data) => {
      console.log(`  ${colors.yellow}[Backend ERR]${colors.reset} ${data.toString()}`);
    });
    
    backend.on('error', (error) => {
      logError(`Erreur backend: ${error.message}`);
      resolve(null);
    });
  });
}

async function startFrontend() {
  logStep('2️⃣', 'Démarrage du frontend React (Vite)...');
  
  return new Promise((resolve) => {
    const vite = spawn('npm', ['run', 'dev'], {
      cwd: __dirname,
      shell: true,
      stdio: 'pipe'
    });
    
    vite.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`  ${colors.blue}[Vite]${colors.reset} ${output}`);
      
      if (output.includes('Local:') && output.includes('5173')) {
        logSuccess('Frontend prêt sur http://localhost:5173');
        setTimeout(() => resolve(vite), 2000); // Attendre 2 secondes
      }
    });
    
    vite.stderr.on('data', (data) => {
      const output = data.toString();
      // Filtrer les warnings normaux de Vite
      if (!output.includes('Sourcemap') && !output.includes('deprecated')) {
        console.log(`  ${colors.yellow}[Vite ERR]${colors.reset} ${output}`);
      }
    });
  });
}

async function startElectron() {
  logStep('3️⃣', 'Démarrage d\'Electron...');
  
  return new Promise((resolve) => {
    const electron = spawn('npx', ['electron', '.'], {
      cwd: __dirname,
      shell: true,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' }
    });
    
    electron.on('close', (code) => {
      logWarning(`Electron fermé avec code ${code}`);
      resolve();
    });
    
    electron.on('error', (error) => {
      logError(`Erreur Electron: ${error.message}`);
      resolve();
    });
  });
}

// Gestion de la fermeture propre
function setupCleanup(processes) {
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Arrêt de l\'application...');
    
    processes.forEach(proc => {
      if (proc && !proc.killed) {
        proc.kill();
      }
    });
    
    setTimeout(() => {
      console.log('👋 Application arrêtée');
      process.exit(0);
    }, 1000);
  });
}

// Fonction principale
async function main() {
  console.log(`${colors.green}⚡ Configuration détectée:${colors.reset}`);
  console.log(`  - Frontend: ${colors.cyan}React + Vite${colors.reset} (port 5173)`);
  console.log(`  - Backend:  ${hasBackend ? colors.green + 'Présent' : colors.yellow + 'Absent'}${colors.reset} (port 4000)`);
  console.log(`  - Database: ${colors.cyan}Firebase${colors.reset}`);
  console.log(`  - Interface: ${colors.cyan}Electron${colors.reset} (application desktop)`);
  console.log('===============================================\n');
  
  const processes = [];
  
  try {
    // 1. Démarrer le backend
    const backendProcess = await startBackend();
    if (backendProcess) processes.push(backendProcess);
    
    // 2. Démarrer le frontend
    const viteProcess = await startFrontend();
    processes.push(viteProcess);
    
    // 3. Démarrer Electron
    setupCleanup(processes);
    await startElectron();
    
  } catch (error) {
    logError(`Erreur: ${error.message}`);
  } finally {
    // Nettoyer
    processes.forEach(proc => {
      if (proc && !proc.killed) {
        proc.kill();
      }
    });
    
    console.log('\n👋 Application arrêtée');
  }
}

// Démarrer l'application
main();
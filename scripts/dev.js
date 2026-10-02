import { spawn } from 'child_process';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');
const clientDir = path.join(rootDir, 'client');

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(600);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function start() {
  console.log('🚀 Starting BEC Transit Local Development Environment...\n');

  const isServerRunning = await isPortInUse(5000);
  let serverProcess = null;

  if (!isServerRunning) {
    console.log('📡 Launching Backend Server on port 5000...');
    const nodeCmd = /^win/.test(process.platform) ? 'node.cmd' : 'node';
    serverProcess = spawn('node', ['src/server.js'], {
      cwd: serverDir,
      stdio: 'inherit',
      shell: true
    });

    serverProcess.on('error', (err) => {
      console.error('❌ Failed to start backend server:', err.message);
    });
  } else {
    console.log('✅ Backend Server is already active on http://localhost:5000');
  }

  const isClientRunning = await isPortInUse(5173);
  let clientProcess = null;

  if (!isClientRunning) {
    console.log('💻 Launching Frontend Vite Client on http://localhost:5173...');
    const npmCmd = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
    clientProcess = spawn(npmCmd, ['run', 'dev'], {
      cwd: clientDir,
      stdio: 'inherit',
      shell: true
    });

    clientProcess.on('error', (err) => {
      console.error('❌ Failed to start Vite client:', err.message);
    });
  } else {
    console.log('✅ Frontend Vite Client is already active on http://localhost:5173');
  }

  function cleanExit() {
    console.log('\n🛑 Stopping BEC Transit local processes...');
    if (serverProcess) {
      try { serverProcess.kill(); } catch (e) {}
    }
    if (clientProcess) {
      try { clientProcess.kill(); } catch (e) {}
    }
    process.exit(0);
  }

  process.on('SIGINT', cleanExit);
  process.on('SIGTERM', cleanExit);
}

start();

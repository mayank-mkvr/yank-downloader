import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

let isKnownRunning = false;
let spawnPromise: Promise<boolean> | null = null;

async function checkHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 300);
    const res = await fetch('http://127.0.0.1:8000/health', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(id);
    return res.ok;
  } catch {
    return false;
  }
}

export async function ensurePythonEngineRunning(): Promise<boolean> {
  const isServerless = !!(process.env.K_SERVICE || process.env.FUNCTION_NAME || process.env.FIREBASE_CONFIG || process.env.FUNCTIONS_EMULATOR);
  if (isServerless) {
    // In serverless environments like Firebase Cloud Functions, background daemons cannot run
    return false;
  }

  if (isKnownRunning) {
    return true;
  }

  // Check if it's already running
  const alive = await checkHealth();
  if (alive) {
    isKnownRunning = true;
    return true;
  }

  if (spawnPromise) {
    return spawnPromise;
  }

  spawnPromise = (async () => {
    console.log('Python Secure Session Engine is offline. Attempting to start...');

    const appPath = path.resolve(process.cwd(), 'python', 'app.py');
    if (!fs.existsSync(appPath)) {
      console.error(`Python app not found at ${appPath}`);
      spawnPromise = null;
      return false;
    }

    // Determine the Python executable order
    const isWin = process.platform === 'win32';
    const commands = isWin ? ['python', 'python3'] : ['python3', 'python'];

    let spawned = false;
    for (const cmd of commands) {
      try {
        console.log(`Spawning Python process: ${cmd} python/app.py`);
        const child = spawn(cmd, [appPath], {
          detached: true,
          stdio: 'ignore',
          cwd: process.cwd(),
          windowsHide: true
        });

        child.unref();
        spawned = true;
        break;
      } catch (err: any) {
        console.warn(`Failed to spawn using command ${cmd}:`, err.message);
      }
    }

    if (!spawned) {
      console.error('Could not start Python Session Engine: Python executable not found.');
      spawnPromise = null;
      return false;
    }

    // Wait and poll until health check succeeds (up to 4 seconds)
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const ok = await checkHealth();
      if (ok) {
        console.log('Python Secure Session Engine successfully started and online!');
        isKnownRunning = true;
        spawnPromise = null;
        return true;
      }
    }

    console.error('Python Session Engine was spawned but failed to become healthy within timeout.');
    spawnPromise = null;
    return false;
  })();

  return spawnPromise;
}

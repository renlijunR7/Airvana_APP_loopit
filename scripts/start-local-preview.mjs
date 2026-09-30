import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, openSync, closeSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

export const PREVIEW_URL = 'http://127.0.0.1:8082';
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SERVICE = 'airvana-v5.3-economy-v1';

/** Only connection refusal means an unused port. Unknown listeners are never replaced. */
export function probeLocalPreview({ request = http.get, timeoutMs = 1500 } = {}) {
  return new Promise((resolveProbe) => {
    let settled = false;
    let deadline;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      resolveProbe(result);
    };
    const req = request(`${PREVIEW_URL}/api/health`, { headers: { Accept: 'application/json' } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
        if (body.length > 65536) {
          finish({ state: 'occupied', reason: 'Health response exceeds the size limit.' });
          res.destroy();
        }
      });
      res.on('error', (error) => finish({ state: 'occupied', reason: error.message }));
      res.on('end', () => {
        try {
          const health = JSON.parse(body);
          if (res.statusCode === 200 && health.ok === true && health.service === SERVICE && health.economyVersion === 'airvana-economy-v1.0') {
            finish({ state: 'healthy', service: health.service });
            return;
          }
        } catch { /* A non-JSON response is not an Airvana health proof. */ }
        finish({ state: 'occupied', reason: `Port 8082 did not return a recognized Airvana health response (HTTP ${res.statusCode}).` });
      });
    });
    req.setTimeout(timeoutMs, () => {
      finish({ state: 'occupied', reason: 'Port 8082 health check timed out.' });
      req.destroy();
    });
    req.on('error', (error) => finish(error.code === 'ECONNREFUSED'
      ? { state: 'free' }
      : { state: 'occupied', reason: error.message }));
    if (!settled) deadline = setTimeout(() => {
      finish({ state: 'occupied', reason: 'Port 8082 health check exceeded the total deadline.' });
      req.destroy();
    }, timeoutMs);
  });
}

/** Dependencies are injectable for tests; CLI host and port are intentionally fixed. */
export async function startLocalPreview({
  projectRoot = PROJECT_ROOT,
  probe = probeLocalPreview,
  spawnProcess = spawn,
  wait = delay,
  env = process.env,
  attempts = 24,
} = {}) {
  const initial = await probe();
  if (initial.state === 'healthy') return { state: 'existing', url: PREVIEW_URL };
  if (initial.state !== 'free') {
    throw new Error(`Cannot start preview: ${initial.reason || 'port 8082 is occupied.'} No process was stopped or replaced.`);
  }

  const runtimeDir = resolve(projectRoot, '.runtime');
  const logPath = resolve(runtimeDir, 'local-preview.log');
  mkdirSync(runtimeDir, { recursive: true });
  const logFd = openSync(logPath, 'a', 0o600);
  let child;
  let childError;
  let exitCode;
  try {
    child = spawnProcess(process.execPath, [resolve(projectRoot, 'server.mjs')], {
      cwd: projectRoot,
      env: { ...env, HOST: '127.0.0.1', PORT: '8082' },
      detached: true,
      stdio: ['ignore', logFd, logFd],
    });
    child.on('error', (error) => { childError = error; });
    child.on('exit', (code, signal) => { exitCode = signal || code; });
    await new Promise((resolveSpawn, rejectSpawn) => {
      child.once('spawn', resolveSpawn);
      child.once('error', rejectSpawn);
    });
    child.unref();
  } finally {
    closeSync(logFd);
  }

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const health = await probe();
    if (health.state === 'healthy') {
      return { state: exitCode === undefined ? 'started' : 'existing', url: PREVIEW_URL, pid: child.pid, logPath };
    }
    if (childError || exitCode !== undefined) {
      throw new Error(`Preview did not start: ${childError?.message || `child exited (${exitCode})`}. Check ${logPath}. No existing process was stopped.`);
    }
    await wait(250);
  }
  throw new Error(`Preview health could not be verified at ${PREVIEW_URL}. Check ${logPath} (child PID ${child.pid}). No process was stopped or replaced.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length > 2) throw new Error('Usage: npm run preview (fixed local address 127.0.0.1:8082; no host or port arguments).');
    const result = await startLocalPreview();
    console.log(`${result.state === 'existing' ? 'Airvana preview already running' : 'Airvana preview started in the background'}: ${result.url}`);
    if (result.state === 'started') console.log(`PID: ${result.pid}\nLog: ${result.logPath}`);
    console.log('Local preview only; no login startup service or public deployment was installed.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

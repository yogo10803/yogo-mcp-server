// start-all.js
// Read mcp_config.json and spawn all stdio servers defined there.
// Usage:
//   node start-all.js           # start servers in foreground (inherit stdio)
//   node start-all.js --background   # start servers detached, write logs/.pids

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const cfgPath = path.resolve(__dirname, 'mcp_config.json');
if (!fs.existsSync(cfgPath)) {
  console.error('mcp_config.json not found in', __dirname);
  process.exit(1);
}

const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const servers = cfg.servers || {};

const background = process.argv.includes('--background');

if (background) {
  // ensure directories exist
  fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
  fs.mkdirSync(path.join(__dirname, '.pids'), { recursive: true });
}

const toSpawn = [];
for (const [name, info] of Object.entries(servers)) {
  // only spawn stdio-type servers (skip http endpoints)
  if (info.type && info.type === 'http') {
    console.log(`Skipping ${name}: type http (not a local process)`);
    continue;
  }

  const command = info.command || 'npx';
  const args = Array.isArray(info.args) ? info.args : [];
  if (!command) {
    console.log(`Skipping ${name}: no command defined`);
    continue;
  }
  toSpawn.push({ name, command, args });
}

if (toSpawn.length === 0) {
  console.log('No stdio servers found to start in mcp_config.json');
  process.exit(0);
}

for (const s of toSpawn) {
  if (background) {
    const logFile = path.join(__dirname, 'logs', `${s.name}.log`);
    const pidFile = path.join(__dirname, '.pids', `${s.name}.pid`);
    const outFd = fs.openSync(logFile, 'a');
    const errFd = outFd;
    try {
      const child = spawn(s.command, s.args, { detached: true, stdio: ['ignore', outFd, errFd], cwd: __dirname });
      child.unref();
      fs.writeFileSync(pidFile, String(child.pid));
      console.log(`Started ${s.name} (pid ${child.pid}). log: ${logFile}, pid: ${pidFile}`);
    } catch (err) {
      console.error(`Failed to start ${s.name}:`, err && err.message);
    }
  } else {
    console.log(`Spawning ${s.name}: ${s.command} ${s.args.join(' ')}`);
    const proc = spawn(s.command, s.args, { stdio: 'inherit', cwd: __dirname });
    proc.on('exit', (code) => console.log(`${s.name} exited with code ${code}`));
  }
}

if (background) {
  console.log('\nAll background servers started.');
  console.log('To stop them:');
  console.log('  # list pid files:');
  console.log('  ls .pids');
  console.log('  # stop all:');
  console.log('  kill $(cat .pids/*.pid)');
  console.log('  # or stop one:');
  console.log('  kill <pid>  # PID from .pids/<name>.pid');
  console.log('  # logs are in ./logs/<server>.log');
}


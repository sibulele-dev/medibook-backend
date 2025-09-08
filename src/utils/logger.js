const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOGS_DIR, 'backend.log');

function ensureLogsDir() {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
  } catch (e) {
    // ignore
  }
}

function appendLine(level, message, meta) {
  try {
    const enabled = process.env.ENABLE_FILE_LOGS === 'true';
    if (!enabled) return;
    ensureLogsDir();
    const line = JSON.stringify({ timestamp: new Date().toISOString(), level, message, meta: meta ?? null }) + '\n';
    fs.appendFileSync(LOG_FILE, line, { encoding: 'utf8' });
  } catch (e) {
    // ignore
  }
}

function makeLogger(level) {
  return (message, meta) => {
    switch (level) {
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(message, meta);
        break;
      case 'info':
        // eslint-disable-next-line no-console
        console.info(message, meta);
        break;
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(message, meta);
        break;
      case 'error':
        // eslint-disable-next-line no-console
        console.error(message, meta);
        break;
    }
    appendLine(level, message, meta);
  };
}

module.exports = {
  debug: makeLogger('debug'),
  info: makeLogger('info'),
  warn: makeLogger('warn'),
  error: makeLogger('error'),
};



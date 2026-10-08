// Dependency-free text model. parseTextFile is pure and safe to use
// from the web app or a future mobile app. Node file loading lives in node.ts.
export interface TextDoc {
  id: string;
  title: string;
  group: string;
  author: string;
  note: string;
  body: string;
}

function unquote(v: string): string {
  const t = v.trim();
  if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) {
    return t.slice(1, -1).replace(/''/g, "'");
  }
  return t;
}

export function parseTextFile(raw: string): TextDoc {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error('missing frontmatter');
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const i = line.indexOf(':');
    if (i < 0) throw new Error('bad frontmatter line: ' + line);
    meta[line.slice(0, i).trim()] = unquote(line.slice(i + 1));
  }
  for (const k of ['id', 'title', 'group']) {
    if (!meta[k]) throw new Error('frontmatter missing ' + k);
  }
  return {
    id: meta.id,
    title: meta.title,
    group: meta.group,
    author: meta.author || '',
    note: meta.note || '',
    body: m[2].replace(/^\n+/, '').replace(/\s+$/, '') + '\n',
  };
}

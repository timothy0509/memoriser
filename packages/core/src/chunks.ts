// Split a text body into memorisable chunks. Pure, chunk size is a parameter
// so changing settings never needs a migration.
export function sentencesOf(body: string): string[] {
  const out: string[] = [];
  for (const ln of body.split('\n')) {
    const line = ln.trim();
    if (!line) continue;
    // Annotation lines like （一）... stay whole even when long.
    if (/^[（(【\[]/.test(line) && line.length < 24) {
      out.push(line);
      continue;
    }
    const parts = line.match(/[^。！？；…]+[。！？；…]?/g) || [line];
    for (const p of parts) if (p.trim()) out.push(p.trim());
  }
  return out;
}

export function chunksOf(body: string, chunkSize: number): string[] {
  const n = Math.max(1, Math.floor(chunkSize) || 1);
  const ss = sentencesOf(body);
  const cs: string[] = [];
  for (let i = 0; i < ss.length; i += n) cs.push(ss.slice(i, i + n).join(''));
  return cs;
}

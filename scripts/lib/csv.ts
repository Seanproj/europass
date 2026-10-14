import { readFileSync } from 'node:fs';

/** 따옴표 이스케이프만 지원하는 작은 CSV 파서. 첫 줄은 헤더, '#'로 시작하는 줄은 주석 */
export function readCsv(path: string): Record<string, string>[] {
  const lines = readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '' && !l.startsWith('#'));
  const [header, ...rows] = lines;
  if (!header) return [];
  const keys = splitLine(header);
  return rows.map((line) => {
    const cells = splitLine(line);
    return Object.fromEntries(keys.map((k, i) => [k, (cells[i] ?? '').trim()]));
  });
}

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** 한 줄에 하나씩, '#' 주석 허용 */
export function readList(path: string): string[] {
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*/, '').trim())
    .filter(Boolean);
}

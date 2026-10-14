/**
 * src/data/cities.json에서 앱이 쓰지 않는 필드를 뺀다 (다시 돌려도 결과가 같다)
 *   npm run data:slim
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, writeJson } from './lib/cache';
import { slimCity } from './lib/slim';

const path = join(ROOT, 'src/data/cities.json');
const cities = JSON.parse(readFileSync(path, 'utf8')) as Parameters<typeof slimCity>[0][];
writeJson(path, cities.map(slimCity));
console.log(`도시 ${cities.length}곳 정리`);

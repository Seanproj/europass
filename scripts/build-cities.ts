/**
 * 유럽 도시 데이터 생성: GeoNames + Wikidata 한글 이름 + 큐레이션
 *   npm run data:cities          (캐시 사용)
 *   npm run data:cities -- --refresh   (원천 다시 받기)
 * 출력: src/data/cities.json, src/data/countries.json
 */
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { CACHE_DIR, ROOT, cachedDownload, fetchWithHint, writeJson } from './lib/cache';
import { COUNTRIES, COUNTRY_CODES, REGION_GROUP_KO } from './lib/countries';
import { readCsv, readList } from './lib/csv';
import { distanceKm, labelPoint, loadCountryShapes, round } from './lib/geo';
import { slugify } from './lib/slug';
import type { City, Country } from '../src/data/types';

// 후보 기준 (이름과 id는 후보 전체에 대해 정한다)
const MIN_POPULATION = 50_000;
// 실제 수록 기준. tier1, 큐레이션, 수도는 인구와 관계없이 수록
const INCLUDE_POPULATION = 60_000;
// 위성도시 정리: 이 거리 안에 인구가 2배 이상인 도시가 있으면 뺀다 (런던 자치구, 루르 지역 등)
const SATELLITE_RADIUS_KM = 30;
const SATELLITE_RATIO = 2;
// 이 인구 이상은 위성도시여도 남긴다
const SATELLITE_KEEP_POPULATION = 200_000;
// 도시 구역, 역사적 장소 등 도시가 아닌 지점
// 히든젬으로 볼 큐레이션 도시의 인구 상한
const GEM_MAX_POPULATION = 100_000;
// Wikidata 항목이 도시의 대표 항목이라고 볼 sitelink 수
const MAIN_ITEM_SITELINKS = 20;
const EXCLUDED_FEATURE_CODES = new Set(['PPLX', 'PPLH', 'PPLQ', 'PPLW', 'PPLCH']);

const DATA = join(ROOT, 'data');
const OUT = join(ROOT, 'src', 'data');

interface GeoRow {
  geonameid: string;
  name: string;
  alternates: string[];
  lat: number;
  lon: number;
  fcode: string;
  country: string;
  admin1: string;
  population: number;
}

interface WikidataLabels {
  ko?: string;
  en?: string;
  /** P1705 (현지 이름) */
  native: { lang: string; text: string }[];
  /** 그 나라 언어들의 라벨 */
  labels: { lang: string; text: string }[];
  sitelinks: number;
}

interface Candidate {
  row: GeoRow;
  curated: boolean;
  override?: { en?: string; ko?: string; local?: string };
}

async function main() {
  if (process.argv.includes('--refresh')) rmSync(CACHE_DIR, { recursive: true, force: true });

  const cities15000 = await loadGeoNames('cities15000');
  const cities1000 = await loadGeoNames('cities1000');
  const admin1 = await loadAdmin1();
  const byId1000 = new Map(cities1000.map((r) => [r.geonameid, r]));

  // 1. 후보: 인구 기준 + 수도
  const excluded = new Set(readCsv(join(DATA, 'excluded.csv')).map((r) => r.geonameid));
  const candidates = new Map<string, Candidate>();
  for (const row of cities15000) {
    if (!COUNTRY_CODES.has(row.country) || excluded.has(row.geonameid)) continue;
    const isCapital = row.fcode === 'PPLC';
    if (isCapital || (row.population >= MIN_POPULATION && !EXCLUDED_FEATURE_CODES.has(row.fcode))) {
      candidates.set(row.geonameid, { row, curated: false });
    }
  }

  // 2. 큐레이션: 인구가 적어도 여행지로 유명한 곳
  for (const c of readCsv(join(DATA, 'curated.csv'))) {
    const override = { en: c.en || undefined, ko: c.ko || undefined, local: c.local || undefined };
    if (c.geonameid) {
      const row = byId1000.get(c.geonameid);
      if (!row) throw new Error(`curated.csv: GeoNames ${c.geonameid}(${c.note})를 cities1000에서 찾지 못함`);
      if (row.country !== c.country)
        throw new Error(`curated.csv: ${c.geonameid} 국가 불일치 ${row.country}≠${c.country}`);
      candidates.set(row.geonameid, { row, curated: true, override });
    } else {
      // GeoNames에 없는 작은 마을은 좌표를 직접 적는다
      const key = `curated-${c.country}-${slugify(c.en!)}`;
      candidates.set(key, {
        curated: true,
        override,
        row: {
          geonameid: '',
          name: c.local || c.en!,
          alternates: [],
          lat: Number(c.lat),
          lon: Number(c.lon),
          fcode: 'PPL',
          country: c.country!,
          admin1: '',
          population: Number(c.population || 0),
        },
      });
    }
  }

  // 3. 이름 (Wikidata)
  const labels = await loadWikidataLabels(
    [...candidates.values()].map((c) => c.row.geonameid).filter(Boolean),
  );
  const nameOverrides = new Map(readCsv(join(DATA, 'ko-overrides.csv')).map((r) => [r.geonameid!, r]));
  const langsOf = new Map(COUNTRIES.map((c) => [c.code, c.langs]));

  // GeoNames ID가 대표 항목이 아닌 하위 항목(구, 교구, 도시권 등)에 붙어 있는 경우가 많다.
  // sitelink가 적으면 GeoNames 이름 + 나라 + 좌표(30km 안)로 대표 항목을 다시 찾는다
  const isMain = (wd: WikidataLabels | undefined) => (wd?.sitelinks ?? 0) >= MAIN_ITEM_SITELINKS;
  const queryName = (c: Candidate) => c.override?.en ?? c.row.name;
  const weak = [...candidates.values()].filter(
    (c) => c.row.geonameid && !isMain(labels.get(c.row.geonameid)),
  );
  const fallback = await loadWikidataByName(
    weak.map((c) => ({ country: c.row.country, name: queryName(c), lat: c.row.lat, lon: c.row.lon })),
  );

  const named = [...candidates.values()].map((cand) => {
    const { row, override } = cand;
    const direct = labels.get(row.geonameid);
    const byName = fallback.get(nameKey(row.country, queryName(cand), row.lat, row.lon));
    const wd = byName && byName.sitelinks > (direct?.sitelinks ?? 0) ? byName : direct;
    // 하위 항목의 영문 라벨은 "Kreisfreie Stadt …" 같은 행정 명칭이라 대표 항목일 때만 쓴다
    const fix = nameOverrides.get(row.geonameid);
    const en = fix?.en || override?.en || cleanEn(isMain(wd) ? wd?.en : undefined) || row.name;
    const ko =
      (fix?.ko || undefined) ?? override?.ko ?? cleanKo(wd?.ko) ?? cleanKo(row.alternates.find(isHangul));
    const langs = langsOf.get(row.country)!;
    // 현지 이름: P1705 → 그 나라 언어 라벨 → GeoNames 이름 ("de-at"처럼 지역 변형도 같은 언어로 본다)
    const inLang = (list: { lang: string; text: string }[] | undefined, l: string) =>
      list?.find((n) => n.lang.split('-')[0] === l)?.text;
    const native =
      langs.map((l) => inLang(wd?.native, l)).find(Boolean) ??
      langs.map((l) => inLang(wd?.labels, l)).find(Boolean);
    // 영어권은 영문 이름이 곧 현지 이름
    const local = override?.local ?? (langs[0] === 'en' ? en : cleanLocal(native ?? row.name));
    return { cand, en, ko, local };
  });

  // 4. id: "국가코드-영문슬러그". 겹치면 인구가 적은 쪽에 지역명(admin1) 접미사
  const ids = new Map<string, (typeof named)[number]>();
  const idOf = new Map<(typeof named)[number], string>();
  const groups = new Map<string, typeof named>();
  for (const n of named) {
    const base = `${n.cand.row.country.toLowerCase()}-${slugify(n.en)}`;
    groups.set(base, [...(groups.get(base) ?? []), n]);
  }
  for (const [base, list] of groups) {
    list.sort((a, b) => b.cand.row.population - a.cand.row.population);
    list.forEach((n, i) => {
      let id = base;
      if (i > 0) {
        const region = admin1.get(`${n.cand.row.country}.${n.cand.row.admin1}`);
        id = region ? `${base}-${slugify(region)}` : base;
        if (ids.has(id)) id = `${base}-${n.cand.row.geonameid}`;
      }
      ids.set(id, n);
      idOf.set(n, id);
    });
  }

  // 5. 위성도시 정리 (tier1, 큐레이션, 수도, 대도시는 보호)
  const tier1 = new Set(readList(join(DATA, 'tier1.txt')));
  const unknownTier1 = [...tier1].filter((id) => !ids.has(id));
  if (unknownTier1.length) throw new Error(`tier1.txt에 없는 id: ${unknownTier1.join(', ')}`);

  const isProtected = (n: (typeof named)[number]) =>
    n.cand.curated ||
    n.cand.row.fcode === 'PPLC' ||
    n.cand.row.population >= SATELLITE_KEEP_POPULATION ||
    tier1.has(idOf.get(n)!);
  const dropped: string[] = [];
  const kept = named.filter((n) => {
    if (isProtected(n)) return true;
    const r = n.cand.row;
    if (r.population < INCLUDE_POPULATION) return false;
    const bigger = named.find(
      (o) =>
        o !== n &&
        o.cand.row.country === r.country &&
        o.cand.row.population >= r.population * SATELLITE_RATIO &&
        distanceKm(r.lat, r.lon, o.cand.row.lat, o.cand.row.lon) < SATELLITE_RADIUS_KM,
    );
    if (bigger) dropped.push(`${idOf.get(n)} (→ ${idOf.get(bigger)})`);
    return !bigger;
  });

  // 6. 출력
  const cities: City[] = kept
    .map((n): City => {
      const r = n.cand.row;
      const id = idOf.get(n)!;
      const tier = tier1.has(id) ? 1 : r.population >= 100_000 || n.cand.curated ? 2 : 3;
      return {
        id,
        name: { ko: n.ko ?? '', en: n.en, local: n.local },
        country: r.country,
        lat: round(r.lat, 4),
        lon: round(r.lon, 4),
        population: r.population,
        tier,
        capital: r.fcode === 'PPLC',
        regionId: '',
        ...(r.geonameid ? { geonameid: Number(r.geonameid) } : {}),
        // 히든젬: 상징 도시가 아닌 작은 큐레이션 여행지 (금색 도장)
        ...(n.cand.curated && tier !== 1 && r.population < GEM_MAX_POPULATION ? { gem: true } : {}),
      };
    })
    .sort(
      (a, b) => a.country.localeCompare(b.country) || b.population - a.population || a.id.localeCompare(b.id),
    );

  // regionId는 build-regions가 채운다. 이전 값이 있으면 유지해 두 스크립트 사이에서도 데이터가 비지 않게
  const prev = readPreviousRegionIds();
  for (const c of cities) c.regionId = prev.get(c.id) ?? '';

  const shapes = loadCountryShapes();
  const countries: Country[] = COUNTRIES.map((c) => ({
    code: c.code,
    name: { ko: c.ko, en: c.en },
    group: c.group,
    groupName: REGION_GROUP_KO[c.group],
    center: labelPoint(shapes.get(c.code)!),
    cityCount: cities.filter((x) => x.country === c.code).length,
  }));

  writeJson(join(OUT, 'cities.json'), cities);
  writeJson(join(OUT, 'countries.json'), countries);

  // 7. 요약
  const missingKo = cities.filter((c) => !c.name.ko);
  console.log(
    `\n도시 ${cities.length}개 · 나라 ${countries.length}개 · tier1 ${cities.filter((c) => c.tier === 1).length}개`,
  );
  console.log(`위성도시로 제외 ${dropped.length}개`);
  if (process.argv.includes('--verbose')) console.log(dropped.join('\n'));
  if (missingKo.length) {
    console.log(`\n한글 이름 없음 ${missingKo.length}개 (data/ko-overrides.csv에 추가):`);
    for (const c of missingKo) console.log(`  ${c.geonameid ?? '-'},${c.name.en}  # ${c.id}`);
  }
  const thin = countries.filter((c) => c.cityCount < 3);
  if (thin.length) console.log(`\n도시가 3개 미만인 나라: ${thin.map((c) => c.code).join(', ')}`);
}

async function loadGeoNames(name: 'cities15000' | 'cities1000'): Promise<GeoRow[]> {
  const zip = await cachedDownload(`https://download.geonames.org/export/dump/${name}.zip`, `${name}.zip`);
  const text = strFromU8(unzipSync(new Uint8Array(zip))[`${name}.txt`]!);
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const f = line.split('\t');
      return {
        geonameid: f[0]!,
        name: f[1]!,
        alternates: f[3] ? f[3].split(',') : [],
        lat: Number(f[4]),
        lon: Number(f[5]),
        fcode: f[7]!,
        country: f[8]!,
        admin1: f[10]!,
        population: Number(f[14]),
      };
    });
}

async function loadAdmin1(): Promise<Map<string, string>> {
  const buf = await cachedDownload(
    'https://download.geonames.org/export/dump/admin1CodesASCII.txt',
    'admin1CodesASCII.txt',
  );
  return new Map(
    buf
      .toString('utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        const f = l.split('\t');
        return [f[0]!, f[2]!] as const;
      }),
  );
}

type Binding = Record<string, { value: string; 'xml:lang'?: string }>;

// 현지 이름 후보로 받아 둘 라벨 언어
const LOCAL_LANGS = [...new Set(COUNTRIES.flatMap((c) => c.langs))];

/** 결과 행을 키별로 모아 sitelink가 가장 많은(대표) 항목 하나만 남긴다 */
function pickBest<K>(bindings: Binding[], keyOf: (b: Binding) => K | null): Map<K, WikidataLabels> {
  const best = new Map<K, { item: string } & WikidataLabels>();
  for (const b of bindings) {
    const key = keyOf(b);
    if (key === null) continue;
    const item = b.item!.value;
    const sl = Number(b.sl!.value);
    let cur = best.get(key);
    if (!cur || (cur.item !== item && sl > cur.sitelinks)) {
      cur = { item, native: [], labels: [], sitelinks: sl };
      best.set(key, cur);
    }
    if (cur.item !== item) continue;
    if (b.ko) cur.ko = b.ko.value;
    if (b.en) cur.en = b.en.value;
    for (const [field, list] of [
      ['native', cur.native],
      ['lbl', cur.labels],
    ] as const) {
      const v = b[field];
      if (!v) continue;
      const lang = v['xml:lang'] ?? '';
      if (!list.some((n) => n.lang === lang)) list.push({ lang, text: v.value });
    }
  }
  return new Map(
    [...best].map(([k, v]) => [
      k,
      { ko: v.ko, en: v.en, native: v.native, labels: v.labels, sitelinks: v.sitelinks },
    ]),
  );
}

const LABEL_CLAUSES = `
  OPTIONAL { ?item rdfs:label ?ko FILTER(LANG(?ko) = "ko") }
  OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en) = "en") }
  OPTIONAL { ?item wdt:P1705 ?native }
  OPTIONAL { ?item rdfs:label ?lbl FILTER(LANG(?lbl) IN (${LOCAL_LANGS.map((l) => `"${l}"`).join(', ')})) }`;

async function sparql(query: string): Promise<Binding[]> {
  // 공개 엔드포인트는 요청이 몰리면 429/503을 준다. Retry-After를 따라 몇 번 다시 시도
  for (let attempt = 0; ; attempt++) {
    const res = await fetchWithHint(
      'https://query.wikidata.org/sparql',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/sparql-results+json',
        },
        body: new URLSearchParams({ query }),
      },
      { allowStatus: [429, 500, 502, 503, 504] },
    );
    if (res.ok) return ((await res.json()) as { results: { bindings: Binding[] } }).results.bindings;
    if (attempt >= 5) throw new Error(`Wikidata SPARQL → HTTP ${res.status}`);
    const wait = Number(res.headers.get('retry-after')) || 5 * 2 ** attempt;
    console.log(`  Wikidata HTTP ${res.status}, ${wait}초 후 다시 시도`);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
}

/** 키 → 결과를 data/.cache에 저장해 두고 없는 것만 조회한다 */
async function cachedBatches<T extends { key: string }>(
  file: string,
  items: T[],
  batchSize: number,
  label: string,
  run: (batch: T[]) => Promise<Map<string, WikidataLabels>>,
): Promise<Map<string, WikidataLabels>> {
  const cachePath = join(CACHE_DIR, file);
  const cache: Record<string, WikidataLabels | null> = existsSync(cachePath)
    ? JSON.parse(readFileSync(cachePath, 'utf8'))
    : {};
  const todo = items.filter((q) => !(q.key in cache));
  for (let i = 0; i < todo.length; i += batchSize) {
    const batch = todo.slice(i, i + batchSize);
    console.log(`${label} ${i + batch.length}/${todo.length}`);
    const found = await run(batch);
    for (const q of batch) cache[q.key] = found.get(q.key) ?? null;
    writeJson(cachePath, cache);
  }
  const map = new Map<string, WikidataLabels>();
  for (const q of items) {
    const v = cache[q.key];
    if (v) map.set(q.key, v);
  }
  return map;
}

/** GeoNames ID(P1566) → ko/en 라벨, 현지 이름 */
function loadWikidataLabels(geonameIds: string[]): Promise<Map<string, WikidataLabels>> {
  return cachedBatches(
    'wikidata-labels.json',
    geonameIds.map((key) => ({ key })),
    100,
    'Wikidata 조회',
    async (batch) => {
      const rows = await sparql(`
      SELECT ?gid ?item ?sl ?ko ?en ?native ?lbl WHERE {
        VALUES ?gid { ${batch.map((q) => `"${q.key}"`).join(' ')} }
        ?item wdt:P1566 ?gid ; wikibase:sitelinks ?sl .
        ${LABEL_CLAUSES}
      }`);
      return pickBest(rows, (b) => b.gid!.value);
    },
  );
}

interface NameQuery {
  country: string;
  name: string;
  lat: number;
  lon: number;
}

const nameKey = (country: string, name: string, lat: number, lon: number) =>
  `${country}|${name}|${lat.toFixed(2)},${lon.toFixed(2)}`;

/** 이름(영어 또는 그 나라 언어 라벨) + 나라(P17)로 찾아 좌표가 30km 안인 것 중 sitelink가 가장 많은 항목 */
function loadWikidataByName(queries: NameQuery[]): Promise<Map<string, WikidataLabels>> {
  const langsOf = new Map(COUNTRIES.map((c) => [c.code, c.langs]));
  const keyed = queries.map((q) => ({ ...q, key: nameKey(q.country, q.name, q.lat, q.lon) }));
  return cachedBatches('wikidata-by-name.json', keyed, 25, 'Wikidata 이름 조회', async (batch) => {
    const values = batch.flatMap((q, j) =>
      ['en', ...langsOf.get(q.country)!].map(
        (lang) => `(${j} ${JSON.stringify(q.name)}@${lang} "${q.country}")`,
      ),
    );
    const rows = await sparql(`
      SELECT ?k ?item ?sl ?coord ?ko ?en ?native ?lbl WHERE {
        hint:Query hint:optimizer "None" .  # 라벨부터 찾도록 고정 (기본 계획은 수십 초)
        VALUES (?k ?name ?iso) { ${values.join(' ')} }
        ?item rdfs:label ?name .
        ?item wdt:P17 ?c .
        ?c wdt:P297 ?iso .
        ?item wdt:P625 ?coord ; wikibase:sitelinks ?sl .
        ${LABEL_CLAUSES}
      }`);
    return pickBest(rows, (b) => {
      const q = batch[Number(b.k!.value)]!;
      const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(b.coord!.value);
      if (!m || distanceKm(q.lat, q.lon, Number(m[2]), Number(m[1])) > 30) return null;
      // 같은 이름의 주(county), 지방 같은 상위 행정구역은 sitelink가 더 많아도 도시가 아니다
      if (/\b(County|Province|Region|District|Oblast)\b/.test(b.en?.value ?? '')) return null;
      return q.key;
    });
  });
}

function readPreviousRegionIds(): Map<string, string> {
  const path = join(OUT, 'cities.json');
  if (!existsSync(path)) return new Map();
  const prev = JSON.parse(readFileSync(path, 'utf8')) as City[];
  return new Map(prev.map((c) => [c.id, c.regionId]));
}

/** "Tromsø Municipality" → "Tromsø" (노르웨이 등은 도시 대신 기초자치단체 항목이 대표인 경우가 많다) */
function cleanEn(s: string | undefined): string | undefined {
  return (
    s?.replace(/ (Municipality|municipality|Urban Area|urban area|central locality)$/, '').trim() || undefined
  );
}

/** "Со̀фия" → "София", "City of Stoke-on-Trent" → "Stoke-on-Trent", "Zenica / Зеница" → "Zenica" */
function cleanLocal(s: string): string {
  // 키릴 문자의 강세 표시 제거
  if (/[\u0400-\u04ff]/.test(s))
    s = s
      .normalize('NFD')
      .replace(/[\u0300\u0301]/g, '')
      .normalize('NFC');
  return s
    .replace(/^(City of|Markt|Stadt|Hansestadt|Große Kreisstadt) /, '')
    .split('/')[0]!
    .trim();
}

const isHangul = (s: string) => /[가-힣]/.test(s);

/** "레온 (스페인)" → "레온" */
function cleanKo(s: string | undefined): string | undefined {
  if (!s) return undefined;
  return s.replace(/\s*\(.*?\)\s*/g, '').trim() || undefined;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  if (err instanceof Error && err.cause) console.error(err.cause);
  process.exit(1);
});

import { CITIES, COUNTRIES, REGIONS, cityById } from './cities.js';
import { db, uid, resizeImage } from './storage.js';
import { stampSVG, stampStyle } from './stamp.js';
import { evaluateBadges } from './badges.js';

// ISO 3166-1 numeric — world-atlas 국가 id와 매칭
const ISO_NUM = {
  DE: '276', FR: '250', NL: '528', BE: '056', LU: '442', GB: '826', IE: '372', AT: '040', CH: '756',
  CZ: '203', HU: '348', PL: '616', SI: '705', IT: '380', ES: '724', PT: '620', GR: '300', HR: '191',
  MT: '470', DK: '208', SE: '752', NO: '578', FI: '246', IS: '352', EE: '233',
};
const MOODS = ['🤩', '😊', '😌', '🥲', '😵‍💫'];

const state = {
  visits: [],
  settings: { name: 'Traveler', home: 'frankfurt' },
  filter: 'all',
  earnedBadges: null,
};

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- 계산 ----------
function haversine(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function seasonOf(iso) {
  const m = +iso.slice(5, 7);
  return m >= 3 && m <= 5 ? 'spring' : m <= 8 && m >= 6 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
}

function visitsByCity() {
  const map = {};
  for (const v of state.visits) (map[v.cityId] ||= []).push(v);
  for (const list of Object.values(map)) list.sort((a, b) => a.date.localeCompare(b.date));
  return map;
}

function computeStats() {
  const home = cityById[state.settings.home] || cityById.frankfurt;
  const byCity = visitsByCity();
  const ids = Object.keys(byCity).filter(id => cityById[id]);
  const cities = ids.map(id => cityById[id]);
  const byCountry = {}, byRegion = {};
  for (const c of cities) {
    byCountry[c.country] = (byCountry[c.country] || 0) + 1;
    byRegion[c.region] = (byRegion[c.region] || 0) + 1;
  }
  let km = 0;
  for (const v of state.visits) {
    const c = cityById[v.cityId];
    if (c && c.id !== home.id) km += haversine(home, c) * 2; // 왕복
  }
  return {
    home,
    byCity,
    cityCount: cities.length,
    countryCount: Object.keys(byCountry).length,
    capitalCount: cities.filter(c => c.capital).length,
    byCountry,
    byRegion,
    km,
    farthestKm: cities.reduce((m, c) => Math.max(m, haversine(home, c)), 0),
    seasons: new Set(state.visits.map(v => seasonOf(v.date))),
    maxVisitsPerCity: Math.max(0, ...Object.values(byCity).map(l => l.length)),
    longNotes: state.visits.filter(v => (v.note || '').length > 100).length,
    photoCount: state.visits.reduce((n, v) => n + (v.photos?.length || 0), 0),
  };
}

// ---------- 렌더링 ----------
function render() {
  const stats = computeStats();
  renderHeader(stats);
  renderMapState(stats);
  renderNextUp(stats);
  renderPassport(stats);
  renderJournal();
  renderBadges(stats);
}

function renderHeader(stats) {
  $('#ownerName').textContent = state.settings.name || 'Traveler';
  $('#homeName').textContent = stats.home.ko;
  const pct = Math.round((stats.cityCount / CITIES.length) * 100);
  $('#stats').innerHTML = `
    <div><dt>도시</dt><dd>${stats.cityCount}<small>/${CITIES.length}</small></dd></div>
    <div><dt>국가</dt><dd>${stats.countryCount}<small>/${Object.keys(COUNTRIES).length}</small></dd></div>
    <div><dt>이동거리</dt><dd>${Math.round(stats.km).toLocaleString()}<small>km</small></dd></div>
    <div><dt>정복률</dt><dd>${pct}<small>%</small></dd></div>`;
  $('#progressBar').style.width = `${pct}%`;
}

function renderNextUp(stats) {
  // 아직 안 가본 도시 중 집에서 가까운 곳 3개 추천
  const todo = CITIES.filter(c => !stats.byCity[c.id] && c.id !== stats.home.id)
    .map(c => ({ c, d: haversine(stats.home, c) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3);
  if (!todo.length) {
    $('#nextUp').innerHTML = `<p class="next-title">🎉 모든 도시를 클리어했어요. 진정한 유럽인!</p>`;
    return;
  }
  $('#nextUp').innerHTML = `
    <p class="next-title">다음 주말, 여기 어때요?</p>
    <div class="next-cards">
      ${todo.map(({ c, d }) => `
        <button class="next-card" data-city="${c.id}">
          <span class="next-emoji">${c.emoji}</span>
          <span><b>${c.ko}</b><small>${COUNTRIES[c.country].flag} ${Math.round(d)}km · ${trainHint(d)}</small></span>
        </button>`).join('')}
    </div>`;
}

function trainHint(km) {
  if (km < 350) return '기차 당일치기';
  if (km < 700) return '기차로 주말여행';
  if (km < 1200) return '야간열차·저가항공';
  return '비행기 추천';
}

function renderPassport(stats) {
  const groups = Object.entries(REGIONS).map(([key, label]) => {
    let cities = CITIES.filter(c => c.region === key);
    const done = cities.filter(c => stats.byCity[c.id]).length;
    if (state.filter === 'done') cities = cities.filter(c => stats.byCity[c.id]);
    if (state.filter === 'todo') cities = cities.filter(c => !stats.byCity[c.id]);
    if (!cities.length) return '';
    const total = CITIES.filter(c => c.region === key).length;
    return `
      <article class="page">
        <header class="page-head">
          <h2>${label}</h2>
          <span class="page-count">${done} / ${total}</span>
        </header>
        <div class="stamp-grid">
          ${cities.map(c => {
            const visits = stats.byCity[c.id];
            const first = visits?.[0];
            return `
              <button class="stamp-slot ${visits ? 'done' : 'todo'}" data-city="${c.id}">
                ${stampSVG(c, { date: first?.date, ghost: !visits, size: 120 })}
                <span class="slot-label">${c.ko}${visits && visits.length > 1 ? ` <em>×${visits.length}</em>` : ''}</span>
              </button>`;
          }).join('')}
        </div>
      </article>`;
  }).join('');
  $('#passportPages').innerHTML = groups || `<p class="empty">해당하는 도시가 없어요.</p>`;
}

function stars(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

function renderJournal() {
  const list = [...state.visits].sort((a, b) => b.date.localeCompare(a.date));
  if (!list.length) {
    $('#journalList').innerHTML = `
      <div class="empty">
        <p class="empty-big">📔</p>
        <p>아직 기록이 없어요.<br>지도에서 도시를 눌러 첫 도장을 찍어보세요!</p>
      </div>`;
    return;
  }
  let lastYearMonth = '';
  $('#journalList').innerHTML = list.map(v => {
    const c = cityById[v.cityId];
    if (!c) return '';
    const ym = v.date.slice(0, 7);
    const divider = ym !== lastYearMonth
      ? `<h3 class="month">${v.date.slice(0, 4)}. ${+v.date.slice(5, 7)}월</h3>` : '';
    lastYearMonth = ym;
    const ink = stampStyle(c).ink;
    return `${divider}
      <article class="entry" data-city="${c.id}" style="--ink:${ink}">
        ${v.photos?.length ? `<div class="entry-photos">${v.photos.slice(0, 3).map(p => `<img src="${p}" alt="" loading="lazy">`).join('')}</div>` : ''}
        <div class="entry-body">
          <div class="entry-head">
            <span class="entry-city">${c.emoji} ${c.ko} <small>${COUNTRIES[c.country].flag} ${c.en}</small></span>
            <span class="entry-mood">${v.mood || ''}</span>
          </div>
          <p class="entry-meta">${formatDate(v.date)} · <span class="stars">${stars(v.rating || 0)}</span></p>
          ${v.title ? `<p class="entry-title">“${esc(v.title)}”</p>` : ''}
          ${v.note ? `<p class="entry-note">${esc(v.note)}</p>` : ''}
        </div>
      </article>`;
  }).join('');
}

function renderBadges(stats) {
  const badges = evaluateBadges(stats);
  const earned = new Set(badges.filter(b => b.done).map(b => b.id));
  // 새로 얻은 배지 알림 (최초 로딩 시에는 알리지 않음)
  if (state.earnedBadges) {
    const fresh = badges.filter(b => b.done && !state.earnedBadges.has(b.id));
    fresh.forEach((b, i) => setTimeout(() => toast(`${b.icon} 배지 획득! <b>${b.name}</b>`), 1400 + i * 1600));
  }
  state.earnedBadges = earned;
  $('#badgeGrid').innerHTML = `
    <p class="badge-summary">${earned.size} / ${badges.length} 배지 획득</p>
    ${badges.map(b => `
      <div class="badge ${b.done ? 'done' : ''}">
        <span class="badge-icon">${b.icon}</span>
        <b>${b.name}</b>
        <small>${b.desc}</small>
        <div class="badge-progress"><i style="width:${(b.current / b.goal) * 100}%"></i></div>
        <small class="badge-num">${b.current.toLocaleString()} / ${b.goal.toLocaleString()}${b.unit || ''}</small>
      </div>`).join('')}`;
}

// ---------- 지도 ----------
const map = { ready: false };

async function initMap() {
  const svg = d3.select('#map');
  const width = 1000, height = 820;
  svg.attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet');

  const projection = d3.geoAzimuthalEqualArea()
    .rotate([-12, -52])
    .fitExtent([[30, 30], [width - 30, height - 30]], {
      type: 'MultiPoint', coordinates: CITIES.map(c => [c.lon, c.lat]),
    });
  const path = d3.geoPath(projection);

  const root = svg.append('g').attr('class', 'map-root');
  const gLand = root.append('g').attr('class', 'land');
  const gRoutes = root.append('g').attr('class', 'routes');
  const gPins = root.append('g').attr('class', 'pins');

  // 바다 배경 + 경위선
  gLand.append('path').datum(d3.geoGraticule10()).attr('class', 'graticule').attr('d', path);

  Object.assign(map, { svg, root, gLand, gRoutes, gPins, projection, path });

  // 확대/이동
  const zoom = d3.zoom().scaleExtent([1, 8])
    .translateExtent([[0, 0], [width, height]])
    .on('zoom', ev => {
      root.attr('transform', ev.transform);
      gPins.selectAll('.pin').attr('transform', d => {
        const [x, y] = projection([d.lon, d.lat]);
        return `translate(${x},${y}) scale(${1 / Math.sqrt(ev.transform.k)})`;
      });
    });
  svg.call(zoom).on('dblclick.zoom', null);
  map.zoom = zoom;

  drawPins();

  try {
    const world = await d3.json('vendor/countries-50m.json');
    const countries = topojson.feature(world, world.objects.countries).features;
    map.countries = gLand.append('g').selectAll('path')
      .data(countries)
      .join('path')
      .attr('class', 'country')
      .attr('d', path);
    gLand.append('path')
      .datum(topojson.mesh(world, world.objects.countries, (a, b) => a !== b))
      .attr('class', 'borders')
      .attr('d', path);
    map.ready = true;
    renderMapState(computeStats());
  } catch (err) {
    console.error(err);
    $('#mapError').hidden = false;
  }
}

function drawPins() {
  const { gPins, projection } = map;
  const tip = $('#mapTip');
  const pins = gPins.selectAll('.pin')
    .data(CITIES, d => d.id)
    .join(enter => {
      const g = enter.append('g')
        .attr('class', 'pin')
        .attr('tabindex', 0)
        .attr('role', 'button')
        .attr('aria-label', d => d.ko)
        .attr('transform', d => `translate(${projection([d.lon, d.lat])})`);
      g.append('circle').attr('class', 'pin-halo').attr('r', 16);
      g.append('circle').attr('class', 'pin-dot').attr('r', 6);
      g.append('text').attr('class', 'pin-emoji').attr('text-anchor', 'middle').attr('dy', '0.35em').text(d => d.emoji);
      return g;
    });
  pins
    .on('click', (ev, d) => openCity(d.id))
    .on('keydown', (ev, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openCity(d.id); } })
    .on('mouseenter focus', (ev, d) => {
      const rect = $('.map-wrap').getBoundingClientRect();
      const box = ev.currentTarget.getBoundingClientRect();
      tip.innerHTML = `${COUNTRIES[d.country].flag} <b>${d.ko}</b> <span>${d.en}</span>`;
      tip.style.left = `${box.left + box.width / 2 - rect.left}px`;
      tip.style.top = `${box.top - rect.top}px`;
      tip.hidden = false;
    })
    .on('mouseleave blur', () => { tip.hidden = true; });
}

function renderMapState(stats) {
  if (!map.gPins) return;
  const { gPins, gRoutes, projection } = map;
  const home = stats.home;

  gPins.selectAll('.pin')
    .classed('done', d => !!stats.byCity[d.id])
    .classed('home', d => d.id === home.id)
    .style('--ink', d => stampStyle(d).ink);
  // 클리어한 도시가 위에 그려지도록
  gPins.selectAll('.pin').sort((a, b) => (!!stats.byCity[a.id]) - (!!stats.byCity[b.id]));

  // 집 → 방문 도시 비행 궤적
  const [hx, hy] = projection([home.lon, home.lat]);
  const routes = CITIES.filter(c => stats.byCity[c.id] && c.id !== home.id);
  gRoutes.selectAll('path')
    .data(routes, d => d.id)
    .join('path')
    .attr('class', 'route')
    .style('stroke', d => stampStyle(d).ink)
    .attr('d', d => {
      const [x, y] = projection([d.lon, d.lat]);
      const mx = (hx + x) / 2, my = (hy + y) / 2;
      const dx = x - hx, dy = y - hy;
      const bend = 0.22;
      return `M${hx},${hy} Q${mx - dy * bend},${my + dx * bend} ${x},${y}`;
    });

  if (map.ready) {
    const visited = new Set(Object.keys(stats.byCountry).map(k => ISO_NUM[k]));
    const tracked = new Set(Object.values(ISO_NUM));
    map.countries
      .classed('visited', d => visited.has(d.id))
      .classed('tracked', d => tracked.has(d.id));
  }
}

// ---------- 도시 상세 / 도장 찍기 ----------
let pendingPhotos = [];
let editingId = null;

function openCity(cityId, { edit = null } = {}) {
  const c = cityById[cityId];
  const visits = visitsByCity()[cityId] || [];
  const home = cityById[state.settings.home] || cityById.frankfurt;
  const dist = Math.round(haversine(home, c));
  const editing = edit ? state.visits.find(v => v.id === edit) : null;
  editingId = editing?.id || null;
  pendingPhotos = editing?.photos ? [...editing.photos] : [];
  const showForm = !visits.length || editing;
  const today = new Date().toISOString().slice(0, 10);

  $('#cityBody').innerHTML = `
    <button class="close" type="button" data-close aria-label="닫기">✕</button>
    <div class="city-hero">
      <div class="city-stamp ${visits.length ? '' : 'ghost'}">${stampSVG(c, { date: visits[0]?.date, ghost: !visits.length, size: 150 })}</div>
      <div>
        <p class="eyebrow dark">${COUNTRIES[c.country].flag} ${COUNTRIES[c.country].ko} · ${REGIONS[c.region]}</p>
        <h2 class="city-name">${c.ko}</h2>
        <p class="city-en">${c.en}${c.capital ? ' · 수도' : ''}</p>
        <p class="city-dist">${c.id === home.id ? '🏠 우리 집' : `🏠 ${home.ko}에서 ${dist.toLocaleString()}km · ${trainHint(dist)}`}</p>
      </div>
    </div>

    ${visits.length && !editing ? `
      <div class="visit-list">
        ${visits.map((v, i) => `
          <article class="visit">
            <div class="visit-head">
              <b>${i + 1}번째 방문</b> <span>${formatDate(v.date)}</span>
              <span class="visit-tools">
                <button class="link" data-edit="${v.id}">수정</button>
                <button class="link danger" data-delete="${v.id}">삭제</button>
              </span>
            </div>
            <p class="entry-meta">${v.mood || ''} <span class="stars">${stars(v.rating || 0)}</span></p>
            ${v.title ? `<p class="entry-title">“${esc(v.title)}”</p>` : ''}
            ${v.note ? `<p class="entry-note">${esc(v.note)}</p>` : ''}
            ${v.photos?.length ? `<div class="visit-photos">${v.photos.map(p => `<img src="${p}" alt="">`).join('')}</div>` : ''}
          </article>`).join('')}
      </div>
      <button class="btn wide" type="button" id="addVisitBtn">＋ 또 다녀왔어요 (재방문 기록)</button>
    ` : ''}

    <form class="visit-form" id="visitForm" ${showForm ? '' : 'hidden'}>
      <h3>${editing ? '기록 수정' : visits.length ? '재방문 기록' : '도장 찍기'}</h3>
      <label>다녀온 날 <input type="date" name="date" required max="${today}" value="${editing?.date || today}"></label>
      <fieldset class="mood-pick">
        <legend>그날의 기분</legend>
        ${MOODS.map((m, i) => `<label><input type="radio" name="mood" value="${m}" ${(editing?.mood || MOODS[0]) === m ? 'checked' : ''}><span>${m}</span></label>`).join('')}
      </fieldset>
      <fieldset>
        <legend>별점</legend>
        <div class="rating-pick">
          ${[5, 4, 3, 2, 1].map(n => `<input type="radio" id="r${n}" name="rating" value="${n}" ${(editing?.rating || 5) === n ? 'checked' : ''}><label for="r${n}" title="${n}점">★</label>`).join('')}
        </div>
      </fieldset>
      <label>한 줄 요약 <input name="title" maxlength="60" placeholder="예) 노을 지는 카를교에서 맥주 한 잔" value="${esc(editing?.title || '')}"></label>
      <label>여행 일기 <textarea name="note" rows="4" placeholder="먹은 것, 본 것, 다음에 꼭 할 것…">${esc(editing?.note || '')}</textarea></label>
      <div class="photo-field">
        <span>사진</span>
        <div class="photo-previews" id="photoPreviews"></div>
        <label class="photo-add">＋ 사진 추가<input type="file" accept="image/*" multiple id="photoInput" hidden></label>
      </div>
      <button class="btn wide stamp-btn" type="submit">${editing ? '저장하기' : '🔖 쾅! 도장 찍기'}</button>
    </form>`;

  renderPhotoPreviews();
  const dlg = $('#cityDialog');
  if (!dlg.open) dlg.showModal();
  dlg.querySelector('.sheet-body').scrollTop = 0;

  $('#addVisitBtn')?.addEventListener('click', () => {
    $('#visitForm').hidden = false;
    $('#addVisitBtn').remove();
    $('#visitForm').scrollIntoView({ behavior: 'smooth' });
  });
  $('#photoInput').addEventListener('change', async ev => {
    const files = [...ev.target.files];
    for (const f of files) {
      try { pendingPhotos.push(await resizeImage(f)); } catch (e) { toast(e.message); }
    }
    ev.target.value = '';
    renderPhotoPreviews();
  });
  $('#visitForm').addEventListener('submit', ev => { ev.preventDefault(); saveVisit(cityId, ev.target); });
  $$('#cityBody [data-edit]').forEach(b => b.addEventListener('click', () => openCity(cityId, { edit: b.dataset.edit })));
  $$('#cityBody [data-delete]').forEach(b => b.addEventListener('click', () => deleteVisit(cityId, b.dataset.delete)));
}

function renderPhotoPreviews() {
  const box = $('#photoPreviews');
  if (!box) return;
  box.innerHTML = pendingPhotos.map((p, i) => `
    <figure><img src="${p}" alt=""><button type="button" data-rm="${i}" aria-label="사진 삭제">✕</button></figure>`).join('');
  box.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => {
    pendingPhotos.splice(+b.dataset.rm, 1);
    renderPhotoPreviews();
  }));
}

async function saveVisit(cityId, form) {
  const fd = new FormData(form);
  const isFirst = !state.visits.some(v => v.cityId === cityId);
  const visit = {
    id: editingId || uid(),
    cityId,
    date: fd.get('date'),
    mood: fd.get('mood'),
    rating: +fd.get('rating'),
    title: fd.get('title').trim(),
    note: fd.get('note').trim(),
    photos: pendingPhotos,
    updatedAt: Date.now(),
  };
  await db.putVisit(visit);
  const idx = state.visits.findIndex(v => v.id === visit.id);
  if (idx >= 0) state.visits[idx] = visit; else state.visits.push(visit);

  $('#cityDialog').close();
  if (isFirst && !editingId) playStamp(cityById[cityId], visit.date);
  else toast('기록을 저장했어요 ✍️');
  editingId = null;
  render();
}

async function deleteVisit(cityId, visitId) {
  if (!confirm('이 방문 기록을 삭제할까요?')) return;
  await db.deleteVisit(visitId);
  state.visits = state.visits.filter(v => v.id !== visitId);
  render();
  if (state.visits.some(v => v.cityId === cityId)) openCity(cityId);
  else $('#cityDialog').close();
}

function playStamp(city, date) {
  const fx = $('#stampFx');
  fx.innerHTML = `<div class="fx-stamp">${stampSVG(city, { date, size: 260 })}</div><p class="fx-text">${city.ko} 클리어!</p>`;
  fx.classList.remove('play');
  void fx.offsetWidth;
  fx.classList.add('play');
  navigator.vibrate?.([30, 40, 60]);
  setTimeout(() => fx.classList.remove('play'), 2200);
}

let toastTimer;
function toast(html) {
  const t = $('#toast');
  t.innerHTML = html;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ---------- 공유 카드 ----------
function svgToImage(svg) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

async function drawShareCard() {
  const stats = computeStats();
  const canvas = $('#shareCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  await document.fonts.ready;

  // 종이 배경
  ctx.fillStyle = '#f4ecd8';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(28,43,74,0.08)';
  for (let y = 0; y < H; y += 6) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // 상단 커버 띠
  ctx.fillStyle = '#1c2b4a';
  ctx.fillRect(0, 0, W, 300);
  ctx.fillStyle = '#d9b26a';
  ctx.font = '700 26px "Space Mono", monospace';
  ctx.fillText('EURO PASSPORT · 유럽 도장깨기', 70, 90);
  ctx.font = '800 92px "Playfair Display", serif';
  ctx.fillStyle = '#f4ecd8';
  ctx.fillText(`${stats.cityCount} Cities`, 70, 200);
  ctx.font = '30px "Gowun Dodum", sans-serif';
  ctx.fillStyle = '#c9cfdc';
  ctx.fillText(`${state.settings.name || 'Traveler'} · ${stats.countryCount}개국 · ${Math.round(stats.km).toLocaleString()}km`, 70, 256);

  // 진행 바
  const pct = stats.cityCount / CITIES.length;
  ctx.fillStyle = 'rgba(28,43,74,0.12)';
  roundRect(ctx, 70, 340, W - 140, 22, 11); ctx.fill();
  ctx.fillStyle = '#b3261e';
  roundRect(ctx, 70, 340, Math.max(22, (W - 140) * pct), 22, 11); ctx.fill();
  ctx.fillStyle = '#1c2b4a';
  ctx.font = '700 24px "Space Mono", monospace';
  ctx.fillText(`${Math.round(pct * 100)}% OF EUROPE CLEARED`, 70, 400);

  // 도장 — 최근 방문 순으로 최대 12개
  const cleared = Object.entries(stats.byCity)
    .map(([id, vs]) => ({ city: cityById[id], date: vs[vs.length - 1].date, first: vs[0].date }))
    .filter(x => x.city)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  const cols = 4, cell = (W - 140) / cols, top = 440;
  if (!cleared.length) {
    ctx.font = '40px "Gowun Dodum", sans-serif';
    ctx.fillStyle = '#8a7f6a';
    ctx.textAlign = 'center';
    ctx.fillText('첫 도장을 기다리는 중…', W / 2, 800);
    ctx.textAlign = 'left';
  }
  for (let i = 0; i < cleared.length; i++) {
    const { city, first } = cleared[i];
    const img = await svgToImage(stampSVG(city, { date: first, size: 220 }));
    const col = i % cols, row = Math.floor(i / cols);
    const jitter = ((i * 37) % 21) - 10;
    ctx.drawImage(img, 70 + col * cell + (cell - 220) / 2 + jitter, top + row * 205 + jitter / 2, 220, 220);
  }

  const earned = evaluateBadges(stats).filter(b => b.done);
  if (earned.length) {
    ctx.strokeStyle = 'rgba(28,43,74,0.2)';
    ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(70, H - 190); ctx.lineTo(W - 70, H - 190); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#1c2b4a';
    ctx.font = '700 22px "Space Mono", monospace';
    ctx.fillText(`BADGES ${earned.length}`, 70, H - 145);
    ctx.font = '44px sans-serif';
    earned.slice(0, 14).forEach((b, i) => ctx.fillText(b.icon, 70 + i * 66, H - 80));
  }

  ctx.font = '22px "Space Mono", monospace';
  ctx.fillStyle = '#8a7f6a';
  ctx.textAlign = 'right';
  ctx.fillText(`FROM ${stats.home.en.toUpperCase()} · ${new Date().getFullYear()}`, W - 70, H - 145);
  ctx.textAlign = 'left';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function canvasBlob() {
  return new Promise(res => $('#shareCanvas').toBlob(res, 'image/png'));
}

// ---------- 백업 ----------
function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function exportBackup() {
  const data = { app: 'euro-passport', version: 1, exportedAt: new Date().toISOString(), settings: state.settings, visits: state.visits };
  download(new Blob([JSON.stringify(data)], { type: 'application/json' }), `euro-passport-${new Date().toISOString().slice(0, 10)}.json`);
}

async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'euro-passport' || !Array.isArray(data.visits)) throw new Error('형식이 올바르지 않아요');
    if (!confirm(`${data.visits.length}개의 기록을 불러올까요? 같은 기록은 덮어써요.`)) return;
    for (const v of data.visits) await db.putVisit(v);
    if (data.settings) { state.settings = { ...state.settings, ...data.settings }; await db.setSetting('profile', state.settings); }
    state.visits = await db.allVisits();
    render();
    toast('백업을 불러왔어요 📦');
  } catch (e) {
    toast(`불러오기 실패: ${esc(e.message)}`);
  }
}

// ---------- 이벤트 ----------
function bindEvents() {
  $$('.tab').forEach(tab => tab.addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.toggle('active', t === tab));
    $$('.view').forEach(v => v.classList.toggle('active', v.id === `view-${tab.dataset.view}`));
    try { localStorage.setItem('ep-tab', tab.dataset.view); } catch {}
  }));
  try {
    const saved = localStorage.getItem('ep-tab');
    if (saved) $(`.tab[data-view="${saved}"]`)?.click();
  } catch {}

  $$('.chip').forEach(chip => chip.addEventListener('click', () => {
    state.filter = chip.dataset.filter;
    $$('.chip').forEach(c => c.classList.toggle('active', c === chip));
    renderPassport(computeStats());
  }));

  // 도시 열기 (여권·기록·추천 카드 공통)
  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-city]');
    if (el && !el.closest('dialog')) openCity(el.dataset.city);
    if (ev.target.closest('[data-close]')) ev.target.closest('dialog').close();
  });
  // 바깥 클릭으로 시트 닫기
  $$('dialog').forEach(d => d.addEventListener('click', ev => { if (ev.target === d) d.close(); }));

  // 설정
  const homeSelect = $('#homeSelect');
  homeSelect.innerHTML = CITIES.map(c => `<option value="${c.id}">${COUNTRIES[c.country].flag} ${c.ko}</option>`).join('');
  $('#settingsBtn').addEventListener('click', () => {
    const f = $('#settingsForm');
    f.name.value = state.settings.name || '';
    f.home.value = state.settings.home;
    $('#settingsDialog').showModal();
  });
  $('#settingsForm').addEventListener('submit', async ev => {
    if (ev.submitter?.value !== 'save') return;
    const f = ev.target;
    state.settings = { name: f.name.value.trim() || 'Traveler', home: f.home.value };
    await db.setSetting('profile', state.settings);
    render();
    toast('설정을 저장했어요');
  });
  $('#exportBtn').addEventListener('click', exportBackup);
  $('#importInput').addEventListener('change', ev => { if (ev.target.files[0]) importBackup(ev.target.files[0]); ev.target.value = ''; });
  $('#resetBtn').addEventListener('click', async () => {
    if (!confirm('정말 모든 기록을 삭제할까요? 되돌릴 수 없어요.')) return;
    await db.clearVisits();
    state.visits = [];
    $('#settingsDialog').close();
    render();
  });

  // 공유
  $('#shareBtn').addEventListener('click', async () => {
    $('#shareDialog').showModal();
    await drawShareCard();
  });
  $('#shareDownload').addEventListener('click', async () => download(await canvasBlob(), 'euro-passport.png'));
  $('#shareNative').addEventListener('click', async () => {
    const file = new File([await canvasBlob()], 'euro-passport.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Euro Passport', text: '나의 유럽 도장깨기 🛂' }); } catch {}
    } else {
      download(file, 'euro-passport.png');
    }
  });
}

// ---------- 시작 ----------
async function boot() {
  try {
    const [visits, profile] = await Promise.all([db.allVisits(), db.getSetting('profile')]);
    state.visits = visits || [];
    if (profile) state.settings = { ...state.settings, ...profile };
  } catch (e) {
    console.error(e);
    toast('저장소를 열 수 없어요 (시크릿 모드인가요?)');
  }
  bindEvents();
  if (window.d3) await initMap().catch(console.error);
  else $('#mapError').hidden = false;
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();

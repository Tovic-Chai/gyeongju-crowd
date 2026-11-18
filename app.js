'use strict';
// 경주 붐빔 예보 웹앱. data/forecast.json 하나만 읽는다. 바깥 라이브러리 없음.

const DOW = ['월', '화', '수', '목', '금', '토', '일'];
const SHORT = ['여유', '보통', '약간', '붐빔', '매우'];
const S = { data: null, calSel: null, placeSel: {} };

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dowOf = (ds) => (new Date(ds + 'T00:00:00').getDay() + 6) % 7;
const fmt = (ds) => { const d = new Date(ds + 'T00:00:00'); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[dowOf(ds)]})`; };
const md = (ds) => { const d = new Date(ds + 'T00:00:00'); return `${d.getMonth() + 1}/${d.getDate()}`; };
const lvName = (lv) => S.data.levels[lv];
const chip = (lv) => `<span class="chip lv${lv}" aria-hidden="true"></span><span class="lvname">${esc(lvName(lv))}</span>`;

function localToday() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}
function todayIdx() {
  const i = S.data.days.findIndex((d) => d.date === localToday());
  return i < 0 ? 0 : i;
}
function placeById(id) { return S.data.places.find((p) => p.id === id); }

function eventsHtml(day) {
  if (!day.events || !day.events.length) return '';
  return `<ul class="events">${day.events.map((e) => `<li>HICO: ${esc(e.name)}</li>`).join('')}</ul>`;
}
function rainText(pop) { return pop != null && pop >= 60 ? `비 예보(강수확률 ${pop}%)` : ''; }

// ---------------------------------------------------------------- 오늘
function viewToday() {
  const i = todayIdx();
  const day = S.data.days[i];
  const rows = S.data.places
    .map((p) => ({ p, d: p.days[i] }))
    .sort((a, b) => b.d.level - a.d.level || b.d.pct - a.d.pct);
  const week = (p) => p.days.slice(i, i + 7).map((d) =>
    `<i class="lv${d.level}${dowOf(d.date) >= 5 ? ' we' : ''}" title="${esc(fmt(d.date) + ' ' + lvName(d.level))}"></i>`).join('');
  return `
  <section>
    <h2>${esc(fmt(day.date))} 경주 전체</h2>
    <p class="big">${chip(day.level)}</p>
    ${day.reasons.length ? `<p class="reasons">${esc(day.reasons.join(', '))}</p>` : ''}
    ${eventsHtml(day)}
    <p class="note">외지인과 외국인 약 ${(day.pred / 10000).toFixed(1)}만 명 예상</p>
  </section>
  <section>
    <h2>장소별 오늘과 앞으로 7일</h2>
    <p class="note">테두리 칸은 주말입니다.</p>
    <ul class="plist">${rows.map(({ p, d }) => `
      <li><a href="#place/${p.id}"><span class="pname">${esc(p.name)}</span>
        <span class="plv">${chip(d.level)}</span>
        <span class="strip" aria-label="${esc(p.name)} 7일 단계: ${esc(p.days.slice(i, i + 7).map((x) => md(x.date) + ' ' + lvName(x.level)).join(', '))}">${week(p)}</span>
        <span class="go" aria-hidden="true">›</span></a></li>`).join('')}
    </ul>
  </section>`;
}

// ---------------------------------------------------------------- 달력
function viewCalendar() {
  const days = S.data.days;
  if (!S.calSel) S.calSel = days[todayIdx()].date;
  const first = new Date(days[0].date + 'T00:00:00');
  const start = new Date(first); start.setDate(first.getDate() - dowOf(days[0].date));
  const byDate = Object.fromEntries(days.map((d, k) => [d.date, k]));
  const last = new Date(days[days.length - 1].date + 'T00:00:00');
  let html = '<div class="cal">' + DOW.map((w) => `<div class="h">${w}</div>`).join('');
  for (let d = new Date(start); d <= last || dowOf(iso(d)) !== 0; d.setDate(d.getDate() + 1)) {
    const ds = iso(d);
    const k = byDate[ds];
    if (k == null) { html += '<div class="empty"></div>'; continue; }
    const x = days[k];
    html += `<button class="lv${x.level}" data-date="${ds}" aria-pressed="${ds === S.calSel}" aria-label="${esc(fmt(ds) + ' ' + lvName(x.level))}">
      <b>${d.getDate() === 1 ? `${d.getMonth() + 1}/1` : d.getDate()}</b><small>${SHORT[x.level]}</small></button>`;
  }
  html += '</div>';
  const k = byDate[S.calSel];
  const day = days[k];
  const pl = S.data.places.map((p) => ({ p, d: p.days[k] })).sort((a, b) => b.d.level - a.d.level || b.d.pct - a.d.pct);
  return `
  <section>
    <h2>앞으로 한 달, 경주 전체</h2>
    ${html}
  </section>
  <section>
    <h2>${esc(fmt(day.date))}</h2>
    <p class="big">${chip(day.level)}</p>
    ${day.reasons.length ? `<p class="reasons">${esc(day.reasons.join(', '))}</p>` : ''}
    ${eventsHtml(day)}
    <ul class="plist">${pl.map(({ p, d }) => `<li><a href="#place/${p.id}"><span class="pname">${esc(p.name)}</span><span class="plv">${chip(d.level)}</span><span class="go" aria-hidden="true">›</span></a></li>`).join('')}</ul>
  </section>`;
}
function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

// ---------------------------------------------------------------- 장소 목록
function viewPlaces() {
  const i = todayIdx();
  return `
  <section>
    <h2>장소별 앞으로 2주</h2>
    <ul class="plist">${S.data.places.map((p) => `
      <li><a href="#place/${p.id}"><span class="pname">${esc(p.name)}<br><small class="note">${esc(p.area)}</small></span>
      <span class="strip">${p.days.slice(i, i + 14).map((d) => `<i class="lv${d.level}${dowOf(d.date) >= 5 ? ' we' : ''}" title="${esc(fmt(d.date) + ' ' + lvName(d.level))}"></i>`).join('')}</span>
      <span class="go" aria-hidden="true">›</span></a></li>`).join('')}
    </ul>
  </section>`;
}

// ---------------------------------------------------------------- 장소 상세
function barChart(p, selIdx) {
  const n = p.days.length, W = 340, H = 180, L = 6, R = 62, T = 10, B = 24;
  const pw = W - L - R, ph = H - T - B, step = pw / n, bw = Math.max(step - 2, 2);
  const y = (v) => T + ph - (v / 100) * ph;
  const qs = S.data.level_q.map((q) => q * 100);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(p.name)} 한 달 붐빔 막대그래프">`;
  qs.forEach((q, k) => {
    s += `<line class="grid" x1="${L}" x2="${L + pw}" y1="${y(q)}" y2="${y(q)}"/>`;
    s += `<text x="${L + pw + 4}" y="${y(q) - 3}">${esc(S.data.levels[k + 1])}</text>`;
  });
  s += `<text x="${L + pw + 4}" y="${y(0) - 3}">${esc(S.data.levels[0])}</text>`;
  p.days.forEach((d, k) => {
    const x = L + k * step + 1, top = y(Math.max(d.pct, 2)), base = y(0), r = Math.min(4, bw / 2, base - top);
    s += `<path class="bar" data-k="${k}" fill="var(--lv${d.level})" d="M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${base} Z"/>`;
    if (dowOf(d.date) === 0 || k === 0) s += `<text x="${x}" y="${H - 8}">${md(d.date)}</text>`;
  });
  s += `<line class="base" x1="${L}" x2="${L + pw}" y1="${y(0)}" y2="${y(0)}"/>`;
  if (selIdx != null) {
    const x = L + selIdx * step;
    s += `<rect class="sel" x="${x}" y="${T}" width="${step}" height="${ph}" rx="3"/>`;
  }
  s += `<rect class="hit" x="${L}" y="${T}" width="${pw}" height="${ph + B}" fill="transparent" data-step="${step}" data-l="${L}" data-w="${W}"/>`;
  return s + '</svg>';
}
function dayBox(p, k) {
  const d = p.days[k], c = S.data.days[k];
  const rs = [...c.reasons.filter((r) => r !== 'HICO 행사'), ...d.reasons, rainText(d.pop)].filter(Boolean);
  return `<div class="daybox"><b>${esc(fmt(d.date))}</b> ${chip(d.level)}
    <p class="reasons">${esc(rs.join(', '))}</p>${p.area === '보문' ? eventsHtml(c) : ''}</div>`;
}
function viewPlace(id) {
  const p = placeById(id);
  if (!p) return '<section><p>장소를 찾지 못했습니다.</p></section>';
  const i = todayIdx();
  const k = S.placeSel[id] ?? i;
  const next = p.days.map((d, j) => ({ d, j })).slice(i, i + 14);
  const quiet = [...next].sort((a, b) => a.d.pct - b.d.pct).slice(0, 3).sort((a, b) => a.j - b.j);
  const busy = [...next].sort((a, b) => b.d.pct - a.d.pct).slice(0, 3).sort((a, b) => a.j - b.j);
  return `
  <a class="back" href="#places">‹ 장소 목록</a>
  <section>
    <h2>${esc(p.name)}</h2>
    <p class="note">막대를 누르면 그날 이유가 나옵니다.</p>
    <div id="chartwrap">${barChart(p, k)}</div>
    <div id="daybox">${dayBox(p, k)}</div>
    <details><summary>표로 보기</summary>
      <table><thead><tr><th>날짜</th><th>단계</th></tr></thead><tbody>
      ${p.days.map((d) => `<tr><td>${esc(fmt(d.date))}</td><td>${esc(lvName(d.level))}</td></tr>`).join('')}
      </tbody></table></details>
  </section>
  <section>
    <h3>앞으로 2주 중 한산할 날</h3>
    <ul class="plist">${quiet.map(({ d, j }) => `<li><a href="#place/${p.id}" data-k="${j}" class="pick"><span class="pname">${esc(fmt(d.date))}</span><span class="plv">${chip(d.level)}</span></a></li>`).join('')}</ul>
    <h3>앞으로 2주 중 붐빌 날</h3>
    <ul class="plist">${busy.map(({ d, j }) => `<li><a href="#place/${p.id}" data-k="${j}" class="pick"><span class="pname">${esc(fmt(d.date))}</span><span class="plv">${chip(d.level)}</span></a></li>`).join('')}</ul>
  </section>`;
}
function bindPlace(id) {
  const p = placeById(id);
  const wrap = $('#chartwrap');
  const tip = $('#tip');
  const idxAt = (ev) => {
    const svg = wrap.querySelector('svg'), hit = svg.querySelector('.hit');
    const r = svg.getBoundingClientRect(), W = +hit.dataset.w, L = +hit.dataset.l, step = +hit.dataset.step;
    const x = ((ev.clientX - r.left) / r.width) * W;
    return Math.min(p.days.length - 1, Math.max(0, Math.floor((x - L) / step)));
  };
  const select = (k) => {
    S.placeSel[id] = k;
    wrap.innerHTML = barChart(p, k);
    $('#daybox').innerHTML = dayBox(p, k);
  };
  wrap.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    const k = idxAt(ev), d = p.days[k];
    tip.innerHTML = `<b>${esc(fmt(d.date))}</b><br>${esc(lvName(d.level))}`;
    tip.hidden = false;
    tip.style.left = Math.min(ev.clientX + 12, window.innerWidth - 250) + 'px';
    tip.style.top = ev.clientY + 12 + 'px';
  });
  wrap.addEventListener('pointerleave', () => { tip.hidden = true; });
  wrap.addEventListener('click', (ev) => select(idxAt(ev)));
  document.querySelectorAll('a.pick').forEach((a) => a.addEventListener('click', (ev) => {
    ev.preventDefault(); select(+a.dataset.k); wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
}

// ---------------------------------------------------------------- 지도
const AREAS = ['전체', '시내', '보문', '불국사'];
const LABEL_OFFSET = { left: [-10, 0], right: [10, 0], top: [0, -10], bottom: [0, 10] };
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const rangeOf = (lv) => 220 + lv * 70; // 원의 반지름(m). 단계가 높을수록 넓게.

function viewMap() {
  const days = S.data.days;
  if (S.mapSel == null) S.mapSel = todayIdx();
  return `
  <section>
    <h2>지도</h2>
    <p class="note">진하고 클수록 붐빕니다.</p>
    <div class="dayrow" id="dayrow" aria-label="날짜 고르기">${days.map((d, j) => `
      <button data-j="${j}" aria-pressed="${j === S.mapSel}" aria-label="${esc(fmt(d.date) + ', 경주 전체 ' + lvName(d.level))}">
        <span>${md(d.date)}</span><span class="${d.dow >= 5 ? 'we' : ''}">${DOW[d.dow]}</span><i class="lv${d.level}"></i></button>`).join('')}
    </div>
    <p id="mapcity" class="mapcity"></p>
    <div class="areas">${AREAS.map((a) => `<button data-area="${a}">${a}</button>`).join('')}</div>
    <div id="map" class="map" role="application" aria-label="경주 붐빔 지도"></div>
  </section>
  <section><h2 id="maplisth"></h2><ul class="plist" id="maplist"></ul></section>`;
}
function mapPopup(p) {
  const d = p.days[S.mapSel];
  const rs = [...d.reasons, rainText(d.pop)].filter(Boolean);
  return `<b>${esc(p.name)}</b><br>${esc(fmt(d.date))} ${chip(d.level)}
    ${rs.length ? `<br>${esc(rs.join(', '))}` : ''}<br><a href="#place/${p.id}">한 달 예보 보기</a>`;
}
function bindMap() {
  if (typeof L === 'undefined') { $('#map').innerHTML = '<p class="err">지도를 불러오지 못했습니다.</p>'; return; }
  const map = L.map('map', { scrollWheelZoom: false, zoomSnap: 0.5 });
  S.map = map;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  // 지역 이름표: 전체로 볼 때만 보인다
  S.areaMarks = AREAS.slice(1).map((area) => {
    const ps = S.data.places.filter((p) => p.area === area);
    const lat = ps.reduce((a, p) => a + p.lat, 0) / ps.length, lon = ps.reduce((a, p) => a + p.lon, 0) / ps.length;
    const m = L.marker([lat, lon], { icon: L.divIcon({ className: 'areamark', html: '', iconSize: null }), keyboard: true });
    m.on('click', () => fitArea(area));
    return { area, ps, m };
  });
  S.mapLayers = S.data.places.map((p) => {
    const range = L.circle([p.lat, p.lon], { radius: rangeOf(0), weight: 2, fillOpacity: 0.32 }).addTo(map);
    const dot = L.circleMarker([p.lat, p.lon], { radius: 7, weight: 2, color: cssVar('--surface'), fillOpacity: 1 }).addTo(map);
    dot.bindTooltip('', { permanent: true, direction: p.dir, offset: LABEL_OFFSET[p.dir] || [0, 0], className: 'maplabel' });
    dot.bindPopup('', { maxWidth: 240 });
    const open = () => { dot.setPopupContent(mapPopup(p)); dot.openPopup(); };
    range.on('click', open);
    dot.on('click', open);
    return { p, range, dot };
  });
  map.on('zoomend', labelsForZoom);
  fitArea('전체');
  document.querySelectorAll('.areas button').forEach((b) => b.addEventListener('click', () => fitArea(b.dataset.area)));
  document.querySelectorAll('#dayrow button').forEach((b) => b.addEventListener('click', () => { S.mapSel = +b.dataset.j; updateMap(); }));
  updateMap();
  setTimeout(() => map.invalidateSize(), 60);
}
const LABEL_ZOOM = 13.5;
function fitArea(area) {
  const pts = S.data.places.filter((p) => area === '전체' || p.area === area).map((p) => [p.lat, p.lon]);
  S.map.fitBounds(pts, area === '전체' ? { paddingTopLeft: [60, 70], paddingBottomRight: [60, 20], maxZoom: 13, animate: false } : { paddingTopLeft: [84, 46], paddingBottomRight: [84, 46], maxZoom: 15, animate: false });
}
function labelsForZoom() {
  if (!S.map) return;
  const near = S.map.getZoom() >= LABEL_ZOOM;
  S.mapLayers.forEach(({ dot }) => (near ? dot.openTooltip() : dot.closeTooltip()));
  S.areaMarks.forEach(({ m }) => (near ? m.remove() : m.addTo(S.map)));
}
function updateMap() {
  const k = S.mapSel, day = S.data.days[k];
  S.areaMarks.forEach(({ area, ps, m }) => {
    const top = Math.max(...ps.map((p) => p.days[k].level));
    m.setIcon(L.divIcon({ className: 'areamark', iconSize: null,
      html: `<div><b>${esc(area)}</b> ${ps.length}곳<br><span class="chip lv${top}"></span> ${esc(lvName(top))}까지</div>` }));
  });
  S.mapLayers.forEach(({ p, range, dot }) => {
    const d = p.days[k], c = cssVar(`--lv${d.level}`);
    range.setStyle({ color: c, fillColor: c });
    range.setRadius(rangeOf(d.level));
    dot.setStyle({ fillColor: c });
    dot.setTooltipContent(`<b>${esc(p.short)}</b><br>${esc(lvName(d.level))}`);
    if (dot.isPopupOpen()) dot.setPopupContent(mapPopup(p));
  });
  // 덜 붐비는 곳을 먼저 그려 붐비는 곳의 원이 위로 오게 한다
  S.mapLayers.slice().sort((a, b) => a.p.days[k].level - b.p.days[k].level).forEach(({ range }) => range.bringToFront());
  S.mapLayers.forEach(({ dot }) => dot.bringToFront());
  labelsForZoom();
  $('#mapcity').innerHTML = `<b>${esc(fmt(day.date))}</b> 경주 전체 ${chip(day.level)} <span class="note">${esc(day.reasons.join(', '))}</span>`;
  document.querySelectorAll('#dayrow button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.j === k)));
  const sel = document.querySelector(`#dayrow button[data-j="${k}"]`);
  const row = $('#dayrow');
  if (sel && row) row.scrollLeft = sel.offsetLeft - row.clientWidth / 2 + sel.clientWidth / 2;
  $('#maplisth').textContent = `${fmt(day.date)} 장소별`;
  $('#maplist').innerHTML = S.data.places.map((p) => ({ p, d: p.days[k] }))
    .sort((a, b) => b.d.level - a.d.level || b.d.pct - a.d.pct)
    .map(({ p, d }) => `<li><a href="#place/${p.id}"><span class="pname">${esc(p.name)}</span><span class="plv">${chip(d.level)}</span><span class="go" aria-hidden="true">›</span></a></li>`).join('');
}

// ---------------------------------------------------------------- 근거
function viewBasis() {
  const D = S.data, bt = D.backtest;
  const label = { B0: '작년 같은 요일 값', B1: '작년 값에 최근 추세 곱하기', M: '이 앱의 모델' };
  return `
  <section>
    <h2>만든 방법</h2>
    <p>한국관광공사가 이동통신 자료로 집계한 경주시 하루 방문자 수(외지인과 외국인)를 2019년부터 모아 예측 모델을 학습했습니다. 요일, 공휴일과 연휴, 계절, 작년 같은 때의 값, 최근 추세를 넣습니다.</p>
    <p>실측이 한 달쯤 늦게 공개되므로 이 예보는 ${esc(fmt(D.last_actual))}까지의 자료로 만들었습니다.</p>
    <p>장소별 단계는 경주 전체 예보에 관광공사 집중률 예보의 날짜별 높낮이를 얹은 추정입니다. 장소별 실측이 없어 맞았는지는 아직 재지 못했습니다.</p>
    <p>단계는 2019년 이후(코로나 시기 제외) 경주의 하루 값을 줄 세워 하위 30%는 여유, 60%까지 보통, 80%까지 약간 붐빔, 95%까지 붐빔, 그 위를 매우 붐빔으로 나눴습니다.</p>
  </section>
  <section>
    <h2>예측 시험 결과</h2>
    <p class="note">${esc(bt.test_start)}부터 ${esc(bt.test_end)}까지 12개월을 떼어 두고 그 전 자료로 31일에서 60일 앞을 맞혀 봤습니다.</p>
    <table><thead><tr><th>방법</th><th class="num">오차율</th><th class="num">단계 맞힘</th><th class="num">붐빈 날 포착</th></tr></thead><tbody>
    ${bt.rows.map((r) => `<tr><td>${esc(label[r.key] || r.key)}</td><td class="num">${r.MAPE}%</td><td class="num">${r.level_exact}%</td><td class="num">${r.busy_recall}%</td></tr>`).join('')}
    </tbody></table>
    <p class="note">오차율은 하루 방문자 수를 평균 몇 % 틀렸는지, 붐빈 날 포착은 실제 붐빔 이상인 날을 붐빔 이상으로 맞힌 비율입니다. 미리 정한 기준(가장 나은 단순 방법보다 오차율 10% 넘게 낮고 붐빈 날은 더 놓치지 않을 것)을 ${bt.pass ? '넘어 이 모델을 씁니다' : '넘지 못해 단순 방법을 씁니다'}.</p>
  </section>
  <section>
    <h2>한계</h2>
    <p>비 예보와 HICO 행사는 점수에 넣지 않고 이유로만 보여 줍니다. 시간대별, 골목 단위 붐빔은 공개 자료가 없어 다루지 않습니다.</p>
  </section>
  <section>
    <h2>자료 출처</h2>
    <ul class="events">${D.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a></li>`).join('')}</ul>
  </section>
  <section>
    <h2>AI 활용</h2>
    <p>자료 찾기, 설계, 분석 코드, 화면 코드는 생성형 AI인 Claude(Anthropic)와 함께 만들었습니다. 무엇을 만들고 무엇을 믿을지는 사람이 정했습니다.</p>
  </section>`;
}

// ---------------------------------------------------------------- 라우팅
function route() {
  if (!S.data) return;
  const h = location.hash.replace('#', '') || 'today';
  const [tab, arg] = h.split('/');
  const view = $('#view');
  $('#tip').hidden = true;
  if (S.map) { S.map.remove(); S.map = null; }
  if (tab === 'map') view.innerHTML = viewMap();
  else if (tab === 'calendar') view.innerHTML = viewCalendar();
  else if (tab === 'places') view.innerHTML = viewPlaces();
  else if (tab === 'place') view.innerHTML = viewPlace(arg);
  else if (tab === 'basis') view.innerHTML = viewBasis();
  else view.innerHTML = viewToday();
  const cur = tab === 'place' ? 'places' : (['map', 'calendar', 'places', 'basis'].includes(tab) ? tab : 'today');
  document.querySelectorAll('.tabs a').forEach((a) => { if (a.dataset.tab === cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (tab === 'calendar') {
    view.querySelectorAll('.cal button').forEach((b) => b.addEventListener('click', () => { S.calSel = b.dataset.date; route(); }));
  }
  if (tab === 'place') bindPlace(arg);
  window.scrollTo(0, 0);
  if (tab === 'map') bindMap();
}

fetch('data/forecast.json', { cache: 'no-cache' })
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then((data) => {
    S.data = data;
    $('#sub').textContent = `${fmt(data.generated)} 기준 한 달 예보`;
    $('#legend').innerHTML = data.levels.map((n, k) => `<span><span class="chip lv${k}" aria-hidden="true"></span>${esc(n)}</span>`).join('');
    route();
  })
  .catch((e) => { $('#view').innerHTML = `<section><p class="err">예보 파일을 읽지 못했습니다 (${esc(e.message)}).</p></section>`; });
window.addEventListener('hashchange', route);

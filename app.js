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
const topPct = (pct) => Math.max(1, Math.round(100 - pct));

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
    <p class="reasons">${esc(day.reasons.join(', '))}</p>
    ${eventsHtml(day)}
    <p class="note">2019년 이후 경주의 하루 가운데 상위 ${topPct(day.pct)}% 수준으로 봅니다. 외지인과 외국인 약 ${(day.pred / 10000).toFixed(1)}만 명 예상.</p>
  </section>
  <section>
    <h2>장소별 오늘과 앞으로 7일</h2>
    <p class="note">칸 하나가 하루입니다. 테두리 있는 칸은 주말입니다. 장소를 누르면 한 달 예보가 나옵니다.</p>
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
    <p class="note">${esc(fmt(days[0].date))}부터 ${esc(fmt(days[days.length - 1].date))}까지입니다. 날짜를 누르면 그날 장소별 예보가 나옵니다.</p>
    ${html}
  </section>
  <section>
    <h2>${esc(fmt(day.date))}</h2>
    <p class="big">${chip(day.level)}</p>
    <p class="reasons">${esc(day.reasons.join(', '))}</p>
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
    <h2>장소</h2>
    <p class="note">오늘 단계와 앞으로 2주입니다.</p>
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
  const rs = [...c.reasons.filter((r) => r !== 'HICO 큰 행사'), ...d.reasons, rainText(d.pop)].filter(Boolean);
  return `<div class="daybox"><b>${esc(fmt(d.date))}</b> ${chip(d.level)}
    <p class="note">2019년 이후 경주의 하루와 견주면 상위 ${topPct(d.pct)}% 수준(자체 추정)${d.cnctr != null ? `, 관광공사 집중률 ${d.cnctr}` : ''}</p>
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
    <p class="note">${esc(p.area)} 지역. 막대 높이는 평소와 견준 붐빔 정도이고 색은 단계입니다. 막대를 누르면 그날 이유가 나옵니다.</p>
    <div id="chartwrap">${barChart(p, k)}</div>
    <div id="daybox">${dayBox(p, k)}</div>
    <details><summary>표로 보기</summary>
      <table><thead><tr><th>날짜</th><th>단계</th><th class="num">상위</th><th class="num">집중률</th></tr></thead><tbody>
      ${p.days.map((d) => `<tr><td>${esc(fmt(d.date))}</td><td>${esc(lvName(d.level))}</td><td class="num">${topPct(d.pct)}%</td><td class="num">${d.cnctr ?? ''}</td></tr>`).join('')}
      </tbody></table></details>
  </section>
  <section>
    <h3>앞으로 2주 가운데 한산할 날</h3>
    <ul class="plist">${quiet.map(({ d, j }) => `<li><a href="#place/${p.id}" data-k="${j}" class="pick"><span class="pname">${esc(fmt(d.date))}</span><span class="plv">${chip(d.level)}</span></a></li>`).join('')}</ul>
    <h3>앞으로 2주 가운데 붐빌 날</h3>
    <ul class="plist">${busy.map(({ d, j }) => `<li><a href="#place/${p.id}" data-k="${j}" class="pick"><span class="pname">${esc(fmt(d.date))}</span><span class="plv">${chip(d.level)}</span></a></li>`).join('')}</ul>
  </section>
  <section><p class="note">관광공사 집중률 예보 이름: ${esc(p.cnctr_names.join(', '))}</p></section>`;
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
    tip.innerHTML = `<b>${esc(fmt(d.date))}</b><br>${esc(lvName(d.level))}, 상위 ${topPct(d.pct)}%`;
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

// ---------------------------------------------------------------- 근거
function viewBasis() {
  const D = S.data, bt = D.backtest;
  const label = { B0: '작년 같은 요일 값', B1: '작년 값에 최근 추세를 곱함', M: '이 앱의 모델' };
  return `
  <section>
    <h2>이렇게 만들었습니다</h2>
    <p>한국관광공사가 이동통신 자료로 집계한 경주시 하루 방문자 수(외지인과 외국인)를 2019년부터 모아 예측 모델을 학습했습니다. 요일, 공휴일과 연휴, 계절, 작년 같은 때의 값, 최근 추세를 넣습니다.</p>
    <p>방문자 실측은 한 달쯤 늦게 공개됩니다. 그래서 이 예보는 ${esc(fmt(D.last_actual))}까지의 실측으로 만들었고, 시험도 같은 조건(31일에서 60일 앞을 맞히기)으로 했습니다.</p>
    <p>장소별 값은 경주 전체 예보에 관광공사 관광지 집중률 예보의 날짜별 높낮이를 얹은 자체 추정입니다. 장소별 실측 자료가 없어 장소 값이 맞았는지는 아직 재지 못했습니다.</p>
    <p>단계는 2019년 이후(코로나 시기 제외) 경주의 하루 값을 줄 세워 하위 30%는 여유, 60%까지 보통, 80%까지 약간 붐빔, 95%까지 붐빔, 그 위를 매우 붐빔으로 나눴습니다.</p>
  </section>
  <section>
    <h2>예측 시험 결과</h2>
    <p class="note">${esc(bt.test_start)}부터 ${esc(bt.test_end)}까지 12개월을 떼어 두고, 그 전 자료로만 학습해 맞혀 봤습니다. 시험 ${bt.n.toLocaleString()}건.</p>
    <table><thead><tr><th>방법</th><th class="num">오차율</th><th class="num">단계 맞힘</th><th class="num">붐빈 날 잡음</th></tr></thead><tbody>
    ${bt.rows.map((r) => `<tr><td>${esc(label[r.key] || r.key)}</td><td class="num">${r.MAPE}%</td><td class="num">${r.level_exact}%</td><td class="num">${r.busy_recall}%</td></tr>`).join('')}
    </tbody></table>
    <p class="note">오차율은 하루 방문자 수를 몇 % 틀렸는지의 평균입니다. 붐빈 날 잡음은 실제로 붐빔 이상이었던 날 가운데 붐빔 이상으로 예보한 비율입니다. 시험 전에 정한 기준(가장 나은 단순 방법보다 오차율 10% 넘게 낮고, 붐빈 날도 덜 놓치지 않을 것)을 ${bt.pass ? '넘어 이 모델을 씁니다' : '넘지 못해 단순 방법을 씁니다'}.</p>
  </section>
  <section>
    <h2>한계</h2>
    <p>비 예보와 HICO 행사는 점수에 넣지 않고 이유로만 보여 줍니다. 과거 날씨와 행사 자료로 학습하지 않았기 때문입니다. 시간대별 붐빔과 골목 단위 붐빔은 공개 자료가 없어 다루지 않습니다.</p>
  </section>
  <section>
    <h2>자료 출처</h2>
    <ul class="events">${D.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>. ${esc(s.use)}</li>`).join('')}</ul>
  </section>
  <section>
    <h2>AI 활용</h2>
    <p>자료 찾기, 설계, 분석 코드, 화면 코드는 생성형 AI인 Claude(Anthropic)와 대화하며 만들었습니다. 무엇을 만들지, 어떤 자료를 쓰고 뺄지, 결과를 믿을지는 사람이 정했습니다.</p>
    <p class="note">예보 만든 때 ${esc(D.generated_at)}</p>
  </section>`;
}

// ---------------------------------------------------------------- 라우팅
function route() {
  if (!S.data) return;
  const h = location.hash.replace('#', '') || 'today';
  const [tab, arg] = h.split('/');
  const view = $('#view');
  $('#tip').hidden = true;
  if (tab === 'calendar') view.innerHTML = viewCalendar();
  else if (tab === 'places') view.innerHTML = viewPlaces();
  else if (tab === 'place') view.innerHTML = viewPlace(arg);
  else if (tab === 'basis') view.innerHTML = viewBasis();
  else view.innerHTML = viewToday();
  const cur = tab === 'place' ? 'places' : (['calendar', 'places', 'basis'].includes(tab) ? tab : 'today');
  document.querySelectorAll('.tabs a').forEach((a) => { if (a.dataset.tab === cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (tab === 'calendar') {
    view.querySelectorAll('.cal button').forEach((b) => b.addEventListener('click', () => { S.calSel = b.dataset.date; route(); }));
  }
  if (tab === 'place') bindPlace(arg);
  window.scrollTo(0, 0);
}

fetch('data/forecast.json', { cache: 'no-cache' })
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then((data) => {
    S.data = data;
    $('#sub').textContent = `${fmt(data.generated)} 만든 예보. 공공데이터로 본 한 달 붐빔입니다.`;
    $('#legend').innerHTML = data.levels.map((n, k) => `<span><span class="chip lv${k}" aria-hidden="true"></span>${esc(n)}</span>`).join('');
    route();
  })
  .catch((e) => { $('#view').innerHTML = `<section><p class="err">예보 파일을 읽지 못했습니다 (${esc(e.message)}).</p></section>`; });
window.addEventListener('hashchange', route);

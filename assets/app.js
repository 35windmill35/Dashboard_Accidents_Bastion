/* Дашборд ДТП — ТОО "BLG". Логика построена на реальных данных из
   "Дашборд_ДТП_аналитика.xlsx" (листы "Данные Павлодар" + "Данные Алматы").
   Важно: Павлодар в этих данных — выборка 200 из 1448 ДТП (13.8% охвата),
   Алматы — полные данные (984 из 984, 100%). Это учтено в UI и в расчётах. */

const CAUSE_COLORS = {
  'Вина водителя': '#f46d00',
  'Вина третьей стороны': '#495569',
  'Виновный не определён': '#8a8f98',
  'Без повреждения': '#b8bec7',
  'На рассмотрении': '#7d8aa0',
};
const CURRENCY = '₸';
const DRIVER_RISK_MIN = 3;   // порог из листа "Сравнение автоколонн" (водители с 3+ ДТП)
const BUS_RISK_MIN = 5;

let META = null;
let RECORDS = [];
let CAUSE_ORDER = [];
let MIN_DATE = null, MAX_DATE = null;

// ---------- helpers ----------
function fmtNum(n){ return Math.round(n).toLocaleString('ru-RU'); }
function fmtMoney(n){ return fmtNum(n) + ' ' + CURRENCY; }
function fmtMoneyShort(n){
  if(Math.abs(n) >= 1000000) return (n/1000000).toLocaleString('ru-RU',{maximumFractionDigits:1}) + ' млн ' + CURRENCY;
  if(Math.abs(n) >= 1000) return (n/1000).toLocaleString('ru-RU',{maximumFractionDigits:0}) + ' тыс ' + CURRENCY;
  return fmtMoney(n);
}
function fmtDate(d){
  if(!d) return '—';
  const [y,m,day] = d.split('-');
  return `${day}.${m}.${y}`;
}
function fmtPercent(n){ return n.toFixed(1) + '%'; }
function causeColor(c){ return CAUSE_COLORS[c] || '#8a8f98'; }
function sumOf(arr, key){ return arr.reduce((s,r)=> s + (r[key]||0), 0); }
function sumKnown(arr, key){
  let sum = 0, known = false;
  arr.forEach(r=>{ if(r[key] != null){ sum += r[key]; known = true; } });
  return { sum, known };
}
function pairedPct(arr, aKey, bKey){
  let sumA = 0, sumB = 0, n = 0;
  arr.forEach(r=>{ if(r[aKey] != null && r[bKey] != null){ sumA += r[aKey]; sumB += r[bKey]; n++; } });
  return { pct: sumA ? (sumB/sumA*100) : null, n };
}
// Доля возмещения = сумма возмещённого / сумма ущерба (простое отношение сумм —
// именно так этот показатель определён в исходном файле "Дашборд_ДТП_аналитика.xlsx").
function reimbShare(arr){
  const damage = sumOf(arr,'damage');
  const reimb = sumKnown(arr,'reimb');
  return { pct: damage > 0 ? (reimb.sum/damage*100) : null, damage, reimbSum: reimb.sum, reimbKnown: reimb.known };
}
function monthLabel(m){
  const [y,mo] = m.split('-');
  const names = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  return names[parseInt(mo,10)-1] + ' ' + y.slice(2);
}
function escapeHtml(s){
  if(s == null) return '';
  return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// ---------- theme ----------
function isDark(){ return document.documentElement.getAttribute('data-theme') === 'dark'; }
function gridColor(){ return isDark() ? 'rgba(255,255,255,0.08)' : '#eef1f6'; }
function textColorMuted(){ return isDark() ? '#aab0ba' : '#4b5563'; }

function applyChartDefaults(){
  Chart.defaults.color = textColorMuted();
  Chart.defaults.font.family = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
}
function initTheme(){
  const saved = localStorage.getItem('dtp-theme');
  const theme = saved || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}
document.getElementById('themeToggle').addEventListener('click', ()=>{
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('dtp-theme', next);
  document.getElementById('themeToggle').textContent = next === 'dark' ? '☀️' : '🌙';
  applyChartDefaults();
  renderAll();
});

// ---------- state & filters ----------
let currentFleet = 'Все';
let currentFrom = null;
let currentTo = null;
const charts = {};
function destroyChart(key){ if(charts[key]){ charts[key].destroy(); delete charts[key]; } }

function periodData(){
  return RECORDS.filter(r=> r.d && r.d >= currentFrom && r.d <= currentTo);
}
function filteredData(){
  const base = periodData();
  if(currentFleet === 'Все') return base;
  return base.filter(r=> r.fleet === currentFleet);
}
function monthsInRange(){
  const s = new Set(periodData().map(r=> r.month).filter(Boolean));
  return Array.from(s).sort();
}

// ---------- KPI ----------
function renderKPI(data){
  const total = data.length;
  const damageSum = sumOf(data, 'damage');
  const reimbSum = sumKnown(data, 'reimb');
  const reimbPair = reimbShare(data);
  const withDamage = data.filter(r=> (r.damage||0) > 0);
  const avgDamage = withDamage.length ? sumOf(withDamage,'damage')/withDamage.length : 0;
  const pct = (n)=> total ? (n/total*100).toFixed(1) : '0.0';

  const byCause = {};
  data.forEach(r=> byCause[r.cat] = (byCause[r.cat]||0)+1);
  const driverFault = byCause['Вина водителя'] || 0;
  const thirdParty = byCause['Вина третьей стороны'] || 0;
  const undetermined = byCause['Виновный не определён'] || 0;

  const cards = [
    {label:'Всего ДТП', value: fmtNum(total), sub: 'Базовый масштаб аварийности; знаменатель для показателей ниже', cls:'a-accent'},
    {label:'Общая сумма ущерба', value: fmtMoneyShort(damageSum), sub: fmtMoney(damageSum), cls:'a-accent'},
    {label:'Сумма возмещено', value: reimbSum.known ? fmtMoneyShort(reimbSum.sum) : '—', sub: reimbSum.known ? fmtMoney(reimbSum.sum) : 'нет данных за период', cls:'a-accent'},
    {label:'Доля возмещения ущерба', value: reimbPair.pct!=null ? fmtPercent(reimbPair.pct) : '—', sub: reimbPair.pct!=null ? `${fmtMoneyShort(reimbPair.reimbSum)} возмещено из ${fmtMoneyShort(reimbPair.damage)} ущерба` : 'нет данных для расчёта', cls: reimbPair.pct!=null && reimbPair.pct < 70 ? 'a-red' : 'a-accent'},
    {label:'Средний ущерб на 1 ДТП с ущербом', value: withDamage.length ? fmtMoneyShort(avgDamage) : '—', sub: withDamage.length ? `по ${fmtNum(withDamage.length)} ДТП с ущербом` : 'нет данных', cls:'a-accent'},
    {label:'Доля «вина водителя»', value: pct(driverFault)+'%', sub: `${fmtNum(driverFault)} из ${fmtNum(total)} ДТП — управляемый риск`, cls:'a-accent'},
    {label:'Доля «вина третьей стороны»', value: pct(thirdParty)+'%', sub: `${fmtNum(thirdParty)} из ${fmtNum(total)} ДТП — вне контроля автоколонны`, cls:'a-gray'},
    {label:'Виновный не определён', value: pct(undetermined)+'%', sub: `${fmtNum(undetermined)} ДТП требуют дорасследования`, cls: undetermined>0 ? 'a-red' : 'a-gray'},
  ];

  document.getElementById('kpiGrid').innerHTML = cards.map(c=>`
    <div class="kpi-card ${c.cls}">
      <div class="kpi-label">${c.label}</div>
      <div class="kpi-value">${c.value}</div>
      <div class="kpi-sub">${c.sub}</div>
    </div>`).join('');
}

// ---------- cause distribution ----------
function renderCauseCharts(data){
  const counts = {};
  data.forEach(r=> counts[r.cat] = (counts[r.cat]||0)+1);
  const causes = CAUSE_ORDER.filter(c=> counts[c] > 0);
  const labels = causes;
  const values = causes.map(c=> counts[c]);
  const colors = causes.map(causeColor);

  destroyChart('causeBar');
  charts.causeBar = new Chart(document.getElementById('chartCauseBar'), {
    type:'bar',
    data:{ labels, datasets:[{ data: values, backgroundColor: colors, borderRadius:5, maxBarThickness:46 }] },
    options:{
      plugins:{ legend:{display:false} },
      scales:{ x:{grid:{display:false}}, y:{beginAtZero:true, grid:{color:gridColor()}} }
    }
  });

  destroyChart('causeDonut');
  const total = values.reduce((a,b)=>a+b,0);
  charts.causeDonut = new Chart(document.getElementById('chartCauseDonut'), {
    type:'doughnut',
    data:{ labels, datasets:[{ data: values, backgroundColor: colors, borderWidth:2, borderColor: isDark() ? '#1a1c22' : '#ffffff' }] },
    options:{
      plugins:{
        legend:{ position:'bottom', labels:{ boxWidth:10, padding:12, font:{size:11} } },
        tooltip:{ callbacks:{ label: ctx=>{
          const pct = total ? (ctx.parsed/total*100).toFixed(1) : 0;
          return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
        } } }
      },
      cutout:'62%'
    }
  });
}

// ---------- fleet comparison ----------
function renderFleetComparison(){
  const base = periodData();
  const fleets = ['Алматы','Павлодар'];
  const perFleet = {};
  fleets.forEach(f=>{
    const sub = base.filter(r=> r.fleet===f);
    const byCause = {};
    CAUSE_ORDER.forEach(c=> byCause[c]=0);
    sub.forEach(r=> byCause[r.cat] = (byCause[r.cat]||0)+1);
    const damage = sumOf(sub,'damage');
    const reimb = sumKnown(sub,'reimb');
    const reimbPair = reimbShare(sub);
    const withDamage = sub.filter(r=> (r.damage||0)>0);
    const avgDamage = withDamage.length ? sumOf(withDamage,'damage')/withDamage.length : 0;
    perFleet[f] = { count: sub.length, byCause, damage, reimb, reimbPair, avgDamage };
  });

  const meta = META.fleets;
  document.getElementById('fleetCards').innerHTML = fleets.map(f=>{
    const d = perFleet[f];
    const cov = meta[f];
    const covLabel = cov.coverage >= 0.999 ? `100% охват (${fmtNum(cov.sample)} из ${fmtNum(cov.system_total)})` : `${(cov.coverage*100).toFixed(1)}% охват (${fmtNum(cov.sample)} из ${fmtNum(cov.system_total)})`;
    return `
    <div class="fleet-card ${f==='Алматы'?'almaty':'pavlodar'}">
      <h3>${f}</h3>
      <span class="coverage-tag">${covLabel}</span>
      <div class="fleet-stats">
        <div>${fmtNum(d.count)}<span>ДТП в отчёте</span></div>
        <div>${d.reimbPair.pct!=null ? fmtPercent(d.reimbPair.pct) : '—'}<span>возмещено</span></div>
        <div>${d.avgDamage ? fmtMoneyShort(d.avgDamage) : '—'}<span>средний ущерб/ДТП</span></div>
      </div>
    </div>`;
  }).join('');

  // grouped bar: share of causes, % (comparable metric regardless of coverage)
  const labels = CAUSE_ORDER;
  destroyChart('fleetBar');
  charts.fleetBar = new Chart(document.getElementById('chartFleetBar'), {
    type:'bar',
    data:{
      labels,
      datasets: fleets.map(f=>{
        const d = perFleet[f];
        const total = d.count || 1;
        return {
          label:f,
          data: labels.map(c=> +( (d.byCause[c]||0)/total*100 ).toFixed(1)),
          backgroundColor: f==='Алматы' ? '#f46d00' : '#5c636e',
          borderRadius:5, maxBarThickness:28
        };
      })
    },
    options:{
      plugins:{ legend:{position:'bottom'}, tooltip:{ callbacks:{ label: ctx=> ` ${ctx.dataset.label}: ${ctx.parsed.y}%` } } },
      scales:{ x:{grid:{display:false}}, y:{beginAtZero:true, ticks:{callback:v=>v+'%'}, grid:{color:gridColor()}} }
    }
  });

  const rows = [
    ['Записей в отчёте / в системе', `${fmtNum(perFleet['Павлодар'].count)} из ${fmtNum(meta['Павлодар'].system_total)}`, `${fmtNum(perFleet['Алматы'].count)} из ${fmtNum(meta['Алматы'].system_total)}`],
    ['Доля возмещения ущерба', perFleet['Павлодар'].reimbPair.pct!=null?fmtPercent(perFleet['Павлодар'].reimbPair.pct):'—', perFleet['Алматы'].reimbPair.pct!=null?fmtPercent(perFleet['Алматы'].reimbPair.pct):'—'],
    ['Средний ущерб на 1 ДТП', fmtMoney(perFleet['Павлодар'].avgDamage), fmtMoney(perFleet['Алматы'].avgDamage)],
    ['Доля «вина водителя»', fmtPercent((perFleet['Павлодар'].byCause['Вина водителя']||0)/(perFleet['Павлодар'].count||1)*100), fmtPercent((perFleet['Алматы'].byCause['Вина водителя']||0)/(perFleet['Алматы'].count||1)*100)],
    ['Доля «вина третьей стороны»', fmtPercent((perFleet['Павлодар'].byCause['Вина третьей стороны']||0)/(perFleet['Павлодар'].count||1)*100), fmtPercent((perFleet['Алматы'].byCause['Вина третьей стороны']||0)/(perFleet['Алматы'].count||1)*100)],
    ['Сумма ущерба (по отчёту, не сравнивать напрямую)', fmtMoney(perFleet['Павлодар'].damage), fmtMoney(perFleet['Алматы'].damage)],
  ];
  document.getElementById('fleetTableWrap').innerHTML = `
    <table>
      <thead><tr><th>Показатель</th><th class="num">Павлодар</th><th class="num">Алматы</th></tr></thead>
      <tbody>${rows.map(r=>`<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td></tr>`).join('')}</tbody>
    </table>`;
}

// ---------- detail rows ----------
function toggleDetail(prefix, idx){
  const row = document.getElementById(prefix+'-detail-'+idx);
  const chevron = document.getElementById(prefix+'-chevron-'+idx);
  if(!row) return;
  const opening = row.style.display === 'none' || !row.style.display;
  row.style.display = opening ? 'table-row' : 'none';
  if(chevron) chevron.classList.toggle('open', opening);
}
window.toggleDetail = toggleDetail;

function buildDetailTable(records, colWidth){
  const sorted = records.slice().sort((a,b)=> (b.d||'').localeCompare(a.d||''));
  const rows = sorted.map(r=>`
    <tr>
      <td>${fmtDate(r.d)}</td>
      <td>${escapeHtml(r.fleet)}</td>
      <td>${escapeHtml(r.cat)}</td>
      <td>${escapeHtml(r.driver||'—')}</td>
      <td>${escapeHtml(r.bus||'—')}</td>
      <td class="num">${r.damage!=null ? fmtMoney(r.damage) : '<span class="no-data">нет данных</span>'}</td>
      <td class="num">${r.reimb!=null ? fmtMoney(r.reimb) : '<span class="no-data">нет данных</span>'}</td>
    </tr>`).join('');
  return `
    <div class="detail-inner">
      <p class="detail-caption">Все инциденты (${records.length})</p>
      <table>
        <thead><tr><th>Дата</th><th>Автоколонна</th><th>Причина</th><th>Водитель</th><th>Автобус</th><th class="num">Ущерб</th><th class="num">Возмещено</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ---------- top drivers ----------
function renderTopDrivers(data){
  const byDriver = {};
  data.forEach(r=>{
    const k = (r.driver||'').trim();
    if(!k) return;
    if(!byDriver[k]) byDriver[k] = { name:k, count:0, sum:0, records:[] };
    byDriver[k].count++;
    byDriver[k].sum += (r.damage||0);
    byDriver[k].records.push(r);
  });
  const list = Object.values(byDriver).sort((a,b)=> b.count-a.count || b.sum-a.sum).slice(0,10);

  if(!list.length){
    document.getElementById('topDriversTableWrap').innerHTML = '<p class="rec-empty">Нет данных за выбранный период.</p>';
    return;
  }

  const rows = list.map((d,i)=>`
    <tr class="main-row ${d.count>=DRIVER_RISK_MIN?'risk':''}" onclick="toggleDetail('drv',${i})">
      <td class="rank">${i+1}</td>
      <td><span class="chevron" id="drv-chevron-${i}">▶</span>${escapeHtml(d.name)}</td>
      <td class="num">${fmtNum(d.count)}</td>
      <td class="num">${fmtMoney(d.sum)}</td>
      <td>${d.count>=DRIVER_RISK_MIN ? '<span class="badge badge-risk">риск</span>' : ''}</td>
    </tr>
    <tr class="detail-row" id="drv-detail-${i}" style="display:none;"><td colspan="5">${buildDetailTable(d.records)}</td></tr>
  `).join('');

  document.getElementById('topDriversTableWrap').innerHTML = `
    <table>
      <thead><tr><th></th><th>Водитель</th><th class="num">Кол-во ДТП</th><th class="num">Сумма ущерба</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ---------- top buses ----------
function renderTopBuses(data){
  const byBus = {};
  data.forEach(r=>{
    const k = (r.bus||'').trim();
    if(!k) return;
    if(!byBus[k]) byBus[k] = { bus:k, count:0, sum:0, records:[] };
    byBus[k].count++;
    byBus[k].sum += (r.damage||0);
    byBus[k].records.push(r);
  });
  const list = Object.values(byBus).sort((a,b)=> b.count-a.count || b.sum-a.sum).slice(0,10);

  if(!list.length){
    document.getElementById('topBusesTableWrap').innerHTML = '<p class="rec-empty">Нет данных за выбранный период.</p>';
    return;
  }

  const rows = list.map((b,i)=>`
    <tr class="main-row ${b.count>=BUS_RISK_MIN?'risk':''}" onclick="toggleDetail('bus',${i})">
      <td class="rank">${i+1}</td>
      <td><span class="chevron" id="bus-chevron-${i}">▶</span>№ ${escapeHtml(b.bus)}</td>
      <td class="num">${fmtNum(b.count)}</td>
      <td class="num">${fmtMoney(b.sum)}</td>
      <td>${b.count>=BUS_RISK_MIN ? '<span class="badge badge-risk">риск</span>' : ''}</td>
    </tr>
    <tr class="detail-row" id="bus-detail-${i}" style="display:none;"><td colspan="5">${buildDetailTable(b.records)}</td></tr>
  `).join('');

  document.getElementById('topBusesTableWrap').innerHTML = `
    <table>
      <thead><tr><th></th><th>Гаражный №</th><th class="num">Кол-во ДТП</th><th class="num">Сумма ущерба</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ---------- financial ----------
function renderFinancial(data){
  const byCause = {};
  CAUSE_ORDER.forEach(c=> byCause[c]=0);
  data.forEach(r=> byCause[r.cat] = (byCause[r.cat]||0) + (r.damage||0));
  const causes = CAUSE_ORDER.filter(c=> byCause[c] > 0);
  const labels = causes;
  const values = causes.map(c=> byCause[c]);
  const colors = causes.map(causeColor);

  destroyChart('moneyByCause');
  charts.moneyByCause = new Chart(document.getElementById('chartMoneyByCause'), {
    type:'bar',
    data:{ labels, datasets:[{ data: values, backgroundColor: colors, borderRadius:5, maxBarThickness:46 }] },
    options:{ plugins:{legend:{display:false}, tooltip:{callbacks:{label:ctx=>' '+fmtMoney(ctx.parsed.y)}}}, scales:{ x:{grid:{display:false}}, y:{beginAtZero:true, ticks:{callback:v=>fmtMoneyShort(v)}, grid:{color:gridColor()}} } }
  });

  const base = periodData();
  const almatySum = sumOf(base.filter(r=> r.fleet==='Алматы'),'damage');
  const pavlodarSum = sumOf(base.filter(r=> r.fleet==='Павлодар'),'damage');
  destroyChart('moneyByFleet');
  charts.moneyByFleet = new Chart(document.getElementById('chartMoneyByFleet'), {
    type:'bar',
    data:{ labels:['Алматы','Павлодар'], datasets:[{ data:[almatySum,pavlodarSum], backgroundColor:['#f46d00','#5c636e'], borderRadius:5, maxBarThickness:70 }] },
    options:{ plugins:{legend:{display:false}, tooltip:{callbacks:{label:ctx=>' '+fmtMoney(ctx.parsed.y)}}}, scales:{ x:{grid:{display:false}}, y:{beginAtZero:true, ticks:{callback:v=>fmtMoneyShort(v)}, grid:{color:gridColor()}} } }
  });

  const months = monthsInRange();
  const byMonthDamage = {}, byMonthReimb = {};
  months.forEach(m=> { byMonthDamage[m]=0; byMonthReimb[m]=0; });
  data.forEach(r=>{
    if(byMonthDamage[r.month]===undefined) return;
    byMonthDamage[r.month] += (r.damage||0);
    byMonthReimb[r.month] += (r.reimb||0);
  });
  destroyChart('moneyByMonth');
  charts.moneyByMonth = new Chart(document.getElementById('chartMoneyByMonth'), {
    type:'line',
    data:{
      labels: months.map(monthLabel),
      datasets:[
        { label:'Ущерб', data: months.map(m=>byMonthDamage[m]), borderColor:'#f46d00', backgroundColor:'rgba(244,109,0,.12)', fill:true, tension:.3 },
        { label:'Возмещено', data: months.map(m=>byMonthReimb[m]), borderColor:'#495569', backgroundColor:'rgba(73,85,105,.10)', fill:true, tension:.3 },
      ]
    },
    options:{ plugins:{legend:{position:'bottom'}}, scales:{ x:{grid:{display:false}}, y:{beginAtZero:true, ticks:{callback:v=>fmtMoneyShort(v)}, grid:{color:gridColor()}} } }
  });

  const damageVals = causes.map(c=> byCause[c]);
  const byCauseReimb = {};
  CAUSE_ORDER.forEach(c=> byCauseReimb[c]=0);
  data.forEach(r=> byCauseReimb[r.cat] = (byCauseReimb[r.cat]||0) + (r.reimb||0));
  const reimbVals = causes.map(c=> byCauseReimb[c]);
  destroyChart('reimbByCause');
  charts.reimbByCause = new Chart(document.getElementById('chartReimbByCause'), {
    type:'bar',
    data:{ labels: causes, datasets:[
      { label:'Ущерб', data: damageVals, backgroundColor:'#f46d00', borderRadius:5, maxBarThickness:26 },
      { label:'Возмещено', data: reimbVals, backgroundColor:'#495569', borderRadius:5, maxBarThickness:26 },
    ]},
    options:{ plugins:{legend:{position:'bottom'}, tooltip:{callbacks:{label:ctx=>` ${ctx.dataset.label}: ${fmtMoney(ctx.parsed.y)}`}}}, scales:{ x:{grid:{display:false}}, y:{beginAtZero:true, ticks:{callback:v=>fmtMoneyShort(v)}, grid:{color:gridColor()}} } }
  });

  const reimbTrendValues = months.map(m=> byMonthDamage[m] ? (byMonthReimb[m]/byMonthDamage[m]*100) : null);
  destroyChart('reimbTrend');
  charts.reimbTrend = new Chart(document.getElementById('chartReimbTrend'), {
    type:'line',
    data:{ labels: months.map(monthLabel), datasets:[{ label:'% возмещения', data: reimbTrendValues, borderColor:'#f46d00', backgroundColor:'rgba(244,109,0,.12)', fill:true, tension:.3, spanGaps:true }] },
    options:{ plugins:{legend:{display:false}, tooltip:{callbacks:{label:ctx=> ctx.parsed.y!=null ? ' '+ctx.parsed.y.toFixed(1)+'%' : ' нет данных'}}}, scales:{ x:{grid:{display:false}}, y:{beginAtZero:true, max:100, ticks:{callback:v=>v+'%'}, grid:{color:gridColor()}} } }
  });
}

// ---------- time series ----------
function renderTimeSeries(){
  const months = monthsInRange();
  const base = periodData();
  const byMonthFleet = { 'Алматы':{}, 'Павлодар':{} };
  months.forEach(m=>{ byMonthFleet['Алматы'][m]=0; byMonthFleet['Павлодар'][m]=0; });
  base.forEach(r=>{ if(byMonthFleet[r.fleet] && byMonthFleet[r.fleet][r.month]!==undefined) byMonthFleet[r.fleet][r.month]++; });

  destroyChart('timeSeries');
  charts.timeSeries = new Chart(document.getElementById('chartTimeSeries'), {
    type:'line',
    data:{
      labels: months.map(monthLabel),
      datasets:[
        { label:'Алматы', data: months.map(m=>byMonthFleet['Алматы'][m]), borderColor:'#f46d00', backgroundColor:'rgba(244,109,0,.10)', fill:true, tension:.3 },
        { label:'Павлодар', data: months.map(m=>byMonthFleet['Павлодар'][m]), borderColor:'#5c636e', backgroundColor:'rgba(92,99,110,.10)', fill:true, tension:.3 },
      ]
    },
    options:{ plugins:{legend:{position:'bottom'}}, scales:{ x:{grid:{display:false}}, y:{beginAtZero:true, grid:{color:gridColor()}} } }
  });
}

// ---------- recommendations ----------
function renderRecommendations(data){
  const total = data.length;
  const items = [];
  if(!total){
    document.getElementById('recList').innerHTML = '<p class="rec-empty">Нет данных за выбранный период для формирования рекомендаций.</p>';
    return;
  }

  const byCause = {};
  data.forEach(r=> byCause[r.cat] = (byCause[r.cat]||0)+1);
  const driverFaultPct = (byCause['Вина водителя']||0)/total*100;
  const undeterminedPct = (byCause['Виновный не определён']||0)/total*100;
  const reimbPair = reimbShare(data);

  if(driverFaultPct >= 40){
    items.push({cls:'warn', icon:'⚠️', title:`Высокая доля ДТП по вине водителя — ${driverFaultPct.toFixed(1)}%`,
      text:'Более трети инцидентов вызваны непосредственно действиями водителей. Рекомендуется усилить инструктаж, ввести регулярный разбор происшествий с наставником и рассмотреть систему поощрений за безаварийную езду.'});
  }
  if(reimbPair.pct != null && reimbPair.pct < 70){
    items.push({cls:'', icon:'💸', title:`Доля возмещения ущерба — ${reimbPair.pct.toFixed(1)}%`,
      text:'Значительная часть ущерба остаётся невозмещённой виновником или страховой. Рекомендуется усилить претензионно-исковую работу и контроль сроков взыскания.'});
  }
  if(undeterminedPct > 2){
    items.push({cls:'warn', icon:'❓', title:`${fmtNum(byCause['Виновный не определён']||0)} ДТП (${undeterminedPct.toFixed(1)}%) — виновник не определён`,
      text:'Такие случаи снижают долю возмещения и требуют дорасследования: сбор дополнительных доказательств, работа со страховыми и ГАИ.'});
  }

  // risk drivers
  const byDriver = {};
  data.forEach(r=>{ const k=(r.driver||'').trim(); if(k) byDriver[k]=(byDriver[k]||0)+1; });
  const riskDrivers = Object.entries(byDriver).filter(([,c])=>c>=DRIVER_RISK_MIN).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if(riskDrivers.length){
    items.push({cls:'warn', icon:'🧑‍✈️', title:`${riskDrivers.length} водител${riskDrivers.length===1?'ь':'я/ей'} с ${DRIVER_RISK_MIN}+ ДТП за период`,
      text:`Наибольшее количество: ${riskDrivers.map(([n,c])=>`${n} (${c})`).join(', ')}. Рекомендуется точечная работа с этими водителями — от дополнительного инструктажа до отстранения при повторных нарушениях.`});
  }

  // risk buses
  const byBus = {};
  data.forEach(r=>{ const k=(r.bus||'').trim(); if(k) byBus[k]=(byBus[k]||0)+1; });
  const riskBuses = Object.entries(byBus).filter(([,c])=>c>=BUS_RISK_MIN).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if(riskBuses.length){
    items.push({cls:'info', icon:'🚌', title:`${riskBuses.length} автобус${riskBuses.length===1?'':'а/ов'} с ${BUS_RISK_MIN}+ ДТП за период`,
      text:`Наибольшее количество: ${riskBuses.map(([n,c])=>`№${n} (${c})`).join(', ')}. Рекомендуется проверить техническое состояние и маршруты эксплуатации этих машин.`});
  }

  if(currentFleet === 'Все'){
    items.push({cls:'info', icon:'📊', title:'Разный охват данных по автоколоннам',
      text:'Павлодар представлен выборкой 200 из 1448 ДТП (13.8%), Алматы — полными данными (100%). Для корректного сравнения автоколонн по абсолютным показателям рекомендуется получить полный массив данных по Павлодару.'});
  }

  if(!items.length){
    items.push({cls:'info', icon:'✅', title:'Существенных отклонений не выявлено', text:'Показатели за выбранный период не превышают контрольные пороги.'});
  }

  document.getElementById('recList').innerHTML = items.map(it=>`
    <div class="rec-item ${it.cls}">
      <div class="icon">${it.icon}</div>
      <div class="body"><b>${it.title}</b><p>${it.text}</p></div>
    </div>`).join('');
}

// ---------- render all ----------
function updatePeriodLabels(){
  document.getElementById('periodSubtitle').textContent =
    `${fmtDate(currentFrom)} — ${fmtDate(currentTo)} · Автоколонны: Алматы, Павлодар · всего ${fmtNum(RECORDS.length)} ДТП в базе`;
  document.getElementById('periodLabel').innerHTML =
    `Показано: <b>${currentFleet}</b>, с <b>${fmtDate(currentFrom)}</b> по <b>${fmtDate(currentTo)}</b>`;
}

function renderAll(){
  applyChartDefaults();
  const data = filteredData();
  updatePeriodLabels();
  renderKPI(data);
  renderCauseCharts(data);
  renderFleetComparison();
  renderTopDrivers(data);
  renderTopBuses(data);
  renderFinancial(data);
  renderTimeSeries();
  renderRecommendations(data);
}

// ---------- init ----------
async function init(){
  const res = await fetch('assets/data.json');
  const json = await res.json();
  META = json.meta;
  RECORDS = json.records;

  const dates = RECORDS.map(r=>r.d).filter(Boolean).sort();
  MIN_DATE = dates[0];
  MAX_DATE = dates[dates.length-1];
  currentFrom = MIN_DATE;
  currentTo = MAX_DATE;

  const causeCounts = {};
  RECORDS.forEach(r=> causeCounts[r.cat] = (causeCounts[r.cat]||0)+1);
  CAUSE_ORDER = Object.keys(causeCounts).sort((a,b)=> causeCounts[b]-causeCounts[a]);

  document.getElementById('dateFrom').min = MIN_DATE;
  document.getElementById('dateFrom').max = MAX_DATE;
  document.getElementById('dateFrom').value = MIN_DATE;
  document.getElementById('dateTo').min = MIN_DATE;
  document.getElementById('dateTo').max = MAX_DATE;
  document.getElementById('dateTo').value = MAX_DATE;
  document.getElementById('genDate').textContent = fmtDate(META.generated);

  document.getElementById('fleetSelect').addEventListener('change', (e)=>{ currentFleet = e.target.value; renderAll(); });
  document.getElementById('dateFrom').addEventListener('change', (e)=>{ currentFrom = e.target.value || MIN_DATE; renderAll(); });
  document.getElementById('dateTo').addEventListener('change', (e)=>{ currentTo = e.target.value || MAX_DATE; renderAll(); });
  document.getElementById('resetPeriod').addEventListener('click', ()=>{
    currentFrom = MIN_DATE; currentTo = MAX_DATE; currentFleet = 'Все';
    document.getElementById('dateFrom').value = MIN_DATE;
    document.getElementById('dateTo').value = MAX_DATE;
    document.getElementById('fleetSelect').value = 'Все';
    renderAll();
  });

  initTheme();
  renderAll();
}

init().catch(err=>{
  console.error(err);
  document.getElementById('periodSubtitle').textContent = 'Ошибка загрузки данных: ' + err.message;
});

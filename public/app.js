let EXCHANGE = { TWD: 1, USD: 32, JPY: 0.22, EUR: 35 };
const CYCLE_MONTHS = { monthly: 1, quarterly: 3, yearly: 12, weekly: 0.23 };
const CAT_COLORS = {
  '娛樂': '#f59e0b', '工具': '#4f46e5', '雲端': '#8b5cf6',
  '健康': '#10b981', '新聞': '#ef4444', '教育': '#06b6d4', '其他': '#94a3b8'
};

const SERVICE_MAP = {
  'Netflix':         { icon: '🎬', category: '娛樂', currency: 'TWD', cycle: 'monthly', plans: [{ name: '基本', amount: 299 }, { name: '標準', amount: 399 }, { name: '高級', amount: 539 }] },
  'Spotify':         { icon: '🎵', category: '娛樂', currency: 'TWD', cycle: 'monthly', plans: [{ name: '個人', amount: 168 }, { name: '學生', amount: 88 }, { name: 'Duo', amount: 228 }, { name: '家庭', amount: 298 }] },
  'YouTube Premium': { icon: '▶️', category: '娛樂', currency: 'TWD', cycle: 'monthly', plans: [{ name: 'Lite', amount: 280 }, { name: '個人', amount: 480 }, { name: '家庭', amount: 840 }, { name: '學生', amount: 280 }] },
  'iCloud+':         { icon: '☁️', category: '雲端', currency: 'TWD', cycle: 'monthly', plans: [{ name: '50GB', amount: 30 }, { name: '200GB', amount: 90 }, { name: '2TB', amount: 300 }, { name: '6TB', amount: 900 }, { name: '12TB', amount: 1790 }] },
  'Microsoft 365':   { icon: '📄', category: '工具', currency: 'TWD', cycle: 'yearly',  plans: [{ name: '基本版', amount: 720 }, { name: '個人版', amount: 3690 }, { name: '家用版', amount: 4190 }, { name: '進階版', amount: 8028 }] },
  'Apple One':       { icon: '🍎', category: '雲端', currency: 'TWD', cycle: 'monthly', plans: [{ name: '個人', amount: 390 }, { name: '家庭', amount: 490 }] },
  'Adobe CC':        { icon: '🎨', category: '工具', currency: 'USD', cycle: 'monthly', plans: [{ name: '全方位創意應用', amount: 54.99 }] },
  'Claude Pro':      { icon: '🤖', category: '工具', currency: 'USD', cycle: 'monthly', plans: [{ name: 'Pro（月付）', amount: 20 }, { name: 'Pro（年付）', amount: 17, cycle: 'yearly' }, { name: 'Max', amount: 100 }] },
  'Disney+':         { icon: '✨', category: '娛樂', currency: 'TWD', cycle: 'monthly', plans: [{ name: '標準', amount: 390 }] },
};

const SIMPLE_SERVICES = {
  'Adobe Creative Cloud': { category: '工具', currency: 'USD', cycle: 'monthly' },
  'Figma':         { category: '工具', currency: 'USD', cycle: 'monthly' },
  'Notion':        { category: '工具', currency: 'USD', cycle: 'monthly' },
  'Canva Pro':     { category: '工具', currency: 'USD', cycle: 'yearly'  },
  'ChatGPT Plus':  { category: '工具', currency: 'USD', cycle: 'monthly' },
  'Google One':    { category: '雲端', currency: 'TWD', cycle: 'monthly' },
  'Nintendo Switch Online': { category: '娛樂', currency: 'JPY', cycle: 'yearly' },
  'Amazon Prime':  { category: '其他', currency: 'USD', cycle: 'monthly' },
  'LINE MUSIC':    { category: '娛樂', currency: 'TWD', cycle: 'monthly' },
  'KKBOX':         { category: '娛樂', currency: 'TWD', cycle: 'monthly' },
  'Coursera':      { category: '教育', currency: 'USD', cycle: 'yearly'  },
};

let selectedServiceBtn = null;
let selectedPlanChip = null;
let quickBtnsBuilt = false;

function buildServiceButtons() {
  if (quickBtnsBuilt) return;
  const grid = document.getElementById('service-grid');
  Object.entries(SERVICE_MAP).forEach(([name, info]) => {
    const btn = document.createElement('button');
    btn.className = 'quick-btn';
    const displayName = name === 'YouTube Premium' ? 'YouTube' : name === 'Microsoft 365' ? 'MS 365' : name;
    btn.innerHTML = `<span class="quick-icon">${info.icon}</span><span class="quick-name">${displayName}</span>`;
    btn.onclick = () => selectService(name, btn);
    grid.appendChild(btn);
  });
  quickBtnsBuilt = true;
}

function selectService(name, btn) {
  if (selectedServiceBtn) selectedServiceBtn.classList.remove('selected');
  btn.classList.add('selected');
  selectedServiceBtn = btn;
  selectedPlanChip = null;

  const info = SERVICE_MAP[name];
  document.getElementById('f-name').value = name;
  document.getElementById('f-category').value = info.category;
  document.getElementById('f-currency').value = info.currency;
  document.getElementById('f-cycle').value = info.cycle;
  document.getElementById('f-amount').value = '';

  const planRow = document.getElementById('plan-row');
  const planChips = document.getElementById('plan-chips');
  document.getElementById('plan-label').textContent = `選擇 ${name} 方案`;
  planChips.innerHTML = '';

  const CYCLE_LABEL = { monthly: '月付', yearly: '年付', quarterly: '季付' };
  const sym = info.currency === 'TWD' ? 'NT$' : (info.currency === 'USD' ? '$' : info.currency + ' ');

  if (info.plans.length === 1) {
    const plan = info.plans[0];
    document.getElementById('f-amount').value = plan.amount;
    if (plan.cycle) document.getElementById('f-cycle').value = plan.cycle;
    flashField('f-amount');
    document.getElementById('name-hint').textContent = `✓ 已自動帶入 ${info.category}・${info.currency}・${CYCLE_LABEL[plan.cycle || info.cycle]}・${sym}${plan.amount}`;
    planRow.classList.remove('visible');
  } else {
    info.plans.forEach(plan => {
      const chip = document.createElement('button');
      chip.className = 'plan-chip';
      chip.textContent = `${plan.name}　${sym}${plan.amount}`;
      chip.onclick = () => selectPlan(plan, chip, info);
      planChips.appendChild(chip);
    });
    planRow.classList.add('visible');
    document.getElementById('name-hint').textContent = `↑ 請選擇 ${name} 的方案`;
  }
}

function selectPlan(plan, chip, serviceInfo) {
  if (selectedPlanChip) selectedPlanChip.classList.remove('selected');
  chip.classList.add('selected');
  selectedPlanChip = chip;

  document.getElementById('f-amount').value = plan.amount;
  if (plan.cycle) document.getElementById('f-cycle').value = plan.cycle;
  flashField('f-amount');

  const CYCLE_LABEL = { monthly: '月付', yearly: '年付', quarterly: '季付' };
  const cycle = plan.cycle || serviceInfo.cycle;
  const sym = serviceInfo.currency === 'TWD' ? 'NT$' : (serviceInfo.currency === 'USD' ? '$' : serviceInfo.currency + ' ');
  document.getElementById('name-hint').textContent = `✓ 已自動帶入 ${serviceInfo.category}・${serviceInfo.currency}・${CYCLE_LABEL[cycle]}・${sym}${plan.amount}`;
}

function flashField(id) {
  const el = document.getElementById(id);
  el.classList.add('autofilled');
  setTimeout(() => el.classList.remove('autofilled'), 1500);
}

function onNameInput(el) {
  const info = SERVICE_MAP[el.value] || SIMPLE_SERVICES[el.value];
  if (!info) { document.getElementById('name-hint').textContent = ''; return; }
  document.getElementById('f-category').value = info.category;
  document.getElementById('f-currency').value = info.currency;
  document.getElementById('f-cycle').value = info.cycle;
  if (SERVICE_MAP[el.value]) {
    document.getElementById('name-hint').textContent = `↑ 從上方選擇方案以自動帶入價格`;
  } else {
    const CYCLE_LABEL = { monthly: '月付', yearly: '年付', quarterly: '季付' };
    document.getElementById('name-hint').textContent = `✓ 已自動帶入 ${info.category}・${info.currency}・${CYCLE_LABEL[info.cycle]}`;
  }
}

Chart.register(ChartDataLabels);

let subs = [];
let editingId = null;
let donutChart = null;
let barChart = null;
let filterCategory = '';
let filterStatus = '';

async function load() {
  const [subsRes, ratesRes] = await Promise.all([
    fetch('/api/subscriptions'),
    fetch('/api/rates'),
  ]);
  subs = await subsRes.json();
  const rates = await ratesRes.json();
  Object.assign(EXCHANGE, rates);
  render();
}

function getFilters() {
  return {
    sort: document.getElementById('sort-select')?.value || 'date-asc',
    category: filterCategory,
    status: filterStatus,
  };
}

function setChip(type, value, el) {
  if (type === 'category') filterCategory = value;
  if (type === 'status') filterStatus = value;
  el.closest('.chip-group').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  render();
}

function applyFilters() {
  render();
}

function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function filteredSubs() {
  const { category, status } = getFilters();
  return subs.filter(s => {
    if (category && s.category !== category) return false;
    if (status && s.status !== status) return false;
    return true;
  });
}

function sortedSubs(list) {
  const { sort } = getFilters();
  return [...list].sort((a, b) => {
    if (sort === 'date-asc') return new Date(a.next_billing_date) - new Date(b.next_billing_date);
    if (sort === 'date-desc') return new Date(b.next_billing_date) - new Date(a.next_billing_date);
    if (sort === 'cost-desc') return myActualMonthly(b) - myActualMonthly(a);
    if (sort === 'cost-asc') return myActualMonthly(a) - myActualMonthly(b);
    return 0;
  });
}

function toTWD(amount, currency) {
  return (+amount) * (EXCHANGE[currency] || 1);
}

function myActualCost(s) {
  if (s.plan_type === 'member') return toTWD(s.my_share || 0, s.currency);
  if (s.plan_type === 'organizer') {
    const membersTotal = (s.members || []).reduce((sum, m) => sum + toTWD(m.amount || 0, s.currency), 0);
    return Math.max(0, toTWD(s.amount, s.currency) - membersTotal);
  }
  return toTWD(s.amount, s.currency);
}

function myActualMonthly(s) {
  return myActualCost(s) / (CYCLE_MONTHS[s.cycle] || 1);
}

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  return Math.round((d - today) / 86400000);
}

function fmt(n) {
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

function buildForecast(activeSubs) {
  const today = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return { label: `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}`, total: 0 };
  });
  const end = new Date(today.getFullYear(), today.getMonth() + 12, 1);

  activeSubs.forEach(s => {
    if (!s.next_billing_date) return;
    const cost = myActualCost(s);
    const cm = CYCLE_MONTHS[s.cycle];
    if (s.cycle === 'weekly') { months.forEach(m => m.total += cost * 4.33); return; }
    let d = new Date(s.next_billing_date);
    while (d < end) {
      const idx = (d.getFullYear() - today.getFullYear()) * 12 + (d.getMonth() - today.getMonth());
      if (idx >= 0 && idx < 12) months[idx].total += cost;
      d = new Date(d.getFullYear(), d.getMonth() + cm, d.getDate());
    }
  });
  return months;
}

const centerTextPlugin = {
  id: 'centerText',
  afterDraw(chart) {
    if (chart.config.type !== 'doughnut') return;
    const { ctx, chartArea: { width, height, top } } = chart;
    const centerX = width / 2;
    const centerY = top + height / 2;
    const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#86868b';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillText('每月實際', centerX, centerY - 12);
    ctx.fillStyle = '#1d1d1f';
    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.fillText('NT$' + total.toLocaleString(), centerX, centerY + 8);
    ctx.restore();
  }
};

function renderCharts(activeSubs) {
  const catMap = {};
  activeSubs.forEach(s => {
    const cat = s.category || '其他';
    catMap[cat] = (catMap[cat] || 0) + myActualMonthly(s);
  });
  const catLabels = Object.keys(catMap);
  const catValues = catLabels.map(k => Math.round(catMap[k]));
  const catColors = catLabels.map(k => CAT_COLORS[k] || '#aeaeb2');
  const total = catValues.reduce((a, b) => a + b, 0);

  if (donutChart) donutChart.destroy();
  donutChart = new Chart(document.getElementById('chart-donut'), {
    type: 'doughnut',
    plugins: [centerTextPlugin],
    data: { labels: catLabels, datasets: [{ data: catValues, backgroundColor: catColors, borderWidth: 2, borderColor: '#fff' }] },
    options: {
      cutout: '62%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 12, usePointStyle: true } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}：NT$${ctx.raw.toLocaleString()}/月` } },
        datalabels: {
          color: '#fff',
          font: { weight: 'bold', size: 11 },
          formatter: (val) => {
            const pct = total > 0 ? Math.round(val / total * 100) : 0;
            return pct >= 6 ? pct + '%' : '';
          },
        }
      }
    }
  });

  const forecast = buildForecast(activeSubs);
  const values = forecast.map(m => Math.round(m.total));
  const avg = values.reduce((a, b) => a + b, 0) / (values.filter(v => v > 0).length || 1);
  const barColors = values.map((v, i) => {
    if (i === 0) return '#4f46e5';
    if (v > avg * 1.3) return '#f59e0b';
    return '#e0e7ff';
  });

  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById('chart-bar'), {
    type: 'bar',
    data: {
      labels: forecast.map(m => m.label),
      datasets: [{
        label: '實際花費（TWD）',
        data: values,
        backgroundColor: barColors,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` NT$${ctx.raw.toLocaleString()}` } },
        datalabels: {
          anchor: 'end', align: 'end', offset: 2,
          color: '#555', font: { size: 10, weight: '600' },
          formatter: v => v > 0 ? 'NT$' + v.toLocaleString() : '',
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => 'NT$' + v.toLocaleString(), font: { size: 11 } },
          grid: { color: '#f0f0f0' }
        },
        x: { ticks: { font: { size: 11 } }, grid: { display: false } }
      },
      layout: { padding: { top: 20 } }
    }
  });
}

function render() {
  const allActive = subs.filter(s => s.status === 'active');
  const monthly = allActive.reduce((sum, s) => sum + myActualMonthly(s), 0);
  const upcoming = allActive.filter(s => { const d = daysUntil(s.next_billing_date); return d >= 0 && d <= 7; }).length;

  document.getElementById('stat-monthly').textContent = 'NT$' + fmt(monthly);
  document.getElementById('stat-yearly').textContent = 'NT$' + fmt(monthly * 12);
  document.getElementById('stat-upcoming').textContent = upcoming + ' 項';

  const filtered = filteredSubs();
  const filteredActive = filtered.filter(s => s.status === 'active');
  renderCharts(filteredActive);

  const sorted = sortedSubs(filtered);
  const list = document.getElementById('list');

  if (!sorted.length) {
    list.innerHTML = `<div class="empty"><p>${subs.length ? '沒有符合條件的訂閱' : '還沒有訂閱項目'}</p><span>${subs.length ? '試著調整篩選條件' : '點右上角「＋ 新增訂閱」開始記錄'}</span></div>`;
    return;
  }

  list.innerHTML = sorted.map(s => {
    const days = daysUntil(s.next_billing_date);
    const inactive = s.status !== 'active';
    let dotClass = 'dot-green', dueClass = '', dueText = '';

    if (inactive) {
      dotClass = 'dot-gray';
      dueText = s.status === 'paused' ? '已暫停' : '已取消';
    } else if (days < 0) {
      dotClass = 'dot-gray'; dueText = '已過期';
    } else if (days <= 3) {
      dotClass = 'dot-red'; dueClass = 'urgent'; dueText = days === 0 ? '今天到期！' : `${days} 天後到期`;
    } else if (days <= 7) {
      dotClass = 'dot-orange'; dueClass = 'soon'; dueText = `${days} 天後到期`;
    } else {
      dueText = `${days} 天後到期`;
    }

    const cycleLabel = { monthly:'月付', yearly:'年付', quarterly:'季付', weekly:'週付' }[s.cycle] || s.cycle;
    const actualTWD = myActualCost(s);
    const isSharingPlan = s.plan_type === 'member' || s.plan_type === 'organizer';

    let roleTag = '';
    if (s.plan_type === 'organizer') roleTag = `<span class="tag tag-organizer">團主</span>`;
    if (s.plan_type === 'member') roleTag = `<span class="tag tag-member">成員・付給 ${s.pay_to || '?'}</span>`;

    const amountDisplay = `NT$${fmt(actualTWD)}`;
    const monthlyEquiv = s.cycle !== 'monthly' ? `≈ NT$${fmt(myActualMonthly(s))}/月` : '';
    const amountSub = isSharingPlan ? `原價 ${s.currency} ${(+s.amount).toLocaleString()}` : '';

    let membersPanel = '';
    if (s.plan_type === 'organizer' && s.members && s.members.length > 0) {
      const unpaidCount = s.members.filter(m => !m.paid).length;
      const statusText = unpaidCount > 0
        ? `<span style="color:#f59e0b">${unpaidCount} 人未收款</span>`
        : `<span style="color:#10b981">全部已收款</span>`;
      const rows = s.members.map(m => `
        <div class="member-row-card">
          <div>
            <span class="member-name-card">${m.name}</span>
            <span class="member-amount-card">・${s.currency} ${(+m.amount).toLocaleString()}</span>
          </div>
          <button class="btn-paid ${m.paid ? 'paid' : 'unpaid'}" onclick="togglePaid('${s.id}','${m.id}')">
            ${m.paid ? '✓ 已收款' : '未收款'}
          </button>
        </div>`).join('');
      membersPanel = `
        <div class="members-panel">
          <div class="members-panel-header" onclick="togglePanel('panel-${s.id}')">
            <div class="members-panel-title">成員收款・${statusText}</div>
            <span class="members-panel-chevron" id="chevron-${s.id}">▾</span>
          </div>
          <div class="members-panel-body" id="panel-${s.id}">
            <div class="members-panel-body-inner">${rows}</div>
          </div>
        </div>`;
    }

    return `
    <div class="card ${inactive ? 'badge-inactive' : ''}">
      <div class="card-main">
        <div class="card-dot ${dotClass}"></div>
        <div class="card-info">
          <div class="card-name">${s.name}</div>
          <div class="card-meta">${s.payment || '未設定付款方式'} · ${s.next_billing_date}</div>
          <div class="card-tags">
            <span class="tag">${s.category || '其他'}</span>
            <span class="tag">${cycleLabel}</span>
            ${roleTag}
            ${s.currency !== 'TWD' ? `<span class="tag">${s.currency}</span>` : ''}
          </div>
        </div>
        <div class="card-right">
          <div class="card-amount">${amountDisplay}</div>
          ${monthlyEquiv ? `<div class="card-amount-monthly">${monthlyEquiv}</div>` : ''}
          ${amountSub ? `<div class="card-amount-sub">${amountSub}</div>` : ''}
          <div class="card-due ${dueClass}">${dueText}</div>
        </div>
        <div class="card-actions">
          <button class="btn-edit" onclick="openModal('${s.id}')">編輯</button>
          <button class="btn-del" onclick="del('${s.id}')">刪除</button>
        </div>
      </div>
      ${membersPanel}
    </div>`;
  }).join('');
}

function togglePanel(panelId) {
  const body = document.getElementById(panelId);
  const subId = panelId.replace('panel-', '');
  const chevron = document.getElementById('chevron-' + subId);
  const isOpen = body.classList.toggle('open');
  chevron.classList.toggle('open', isOpen);
}

async function togglePaid(subId, memberId) {
  const s = subs.find(x => x.id === subId);
  if (!s) return;
  const members = (s.members || []).map(m => m.id === memberId ? { ...m, paid: !m.paid } : m);
  await fetch(`/api/subscriptions/${subId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...s, members })
  });
  load();
}

function onPlanTypeChange() {
  const val = document.getElementById('f-plan-type').value;
  document.getElementById('section-member').classList.toggle('show', val === 'member');
  document.getElementById('section-organizer').classList.toggle('show', val === 'organizer');
}

function calcEqualShare() {
  const total = parseFloat(document.getElementById('f-amount').value) || 0;
  const memberCount = document.getElementById('members-list').querySelectorAll('.member-row-form').length;
  const totalPeople = memberCount + 1;
  return totalPeople > 1 ? Math.round((total / totalPeople) * 100) / 100 : 0;
}

function addMemberRow(name = '', amount = '', memberId = null) {
  const id = memberId || Date.now().toString() + Math.random().toString(36).slice(2, 6);
  const defaultAmount = amount !== '' ? amount : calcEqualShare();
  const row = document.createElement('div');
  row.className = 'member-row-form';
  row.dataset.memberId = id;
  row.innerHTML = `
    <input class="member-name" placeholder="成員姓名" value="${name}" />
    <input class="member-amount amount-input" type="number" min="0" step="0.01" placeholder="金額" value="${defaultAmount || ''}" />
    <button class="btn-remove-member" onclick="this.parentElement.remove()">×</button>`;
  document.getElementById('members-list').appendChild(row);
}

function splitEqually() {
  const total = parseFloat(document.getElementById('f-amount').value) || 0;
  const rows = document.getElementById('members-list').querySelectorAll('.member-row-form');
  if (!rows.length) return;
  const each = Math.round((total / (rows.length + 1)) * 100) / 100;
  rows.forEach(row => { row.querySelector('.member-amount').value = each; });
}

function openModal(id) {
  editingId = id || null;
  document.getElementById('modal-title').textContent = id ? '編輯訂閱' : '新增訂閱';
  document.getElementById('members-list').innerHTML = '';

  if (id) {
    document.getElementById('quick-section').classList.add('hidden');
    document.getElementById('name-hint').textContent = '';
    const s = subs.find(x => x.id === id);
    document.getElementById('f-name').value = s.name || '';
    document.getElementById('f-category').value = s.category || '其他';
    document.getElementById('f-status').value = s.status || 'active';
    document.getElementById('f-amount').value = s.amount || '';
    document.getElementById('f-currency').value = s.currency || 'TWD';
    document.getElementById('f-cycle').value = s.cycle || 'monthly';
    document.getElementById('f-next-date').value = s.next_billing_date || '';
    document.getElementById('f-payment').value = s.payment || '';
    document.getElementById('f-remind').value = s.remind_days || 7;
    document.getElementById('f-notes').value = s.notes || '';
    document.getElementById('f-plan-type').value = s.plan_type || 'solo';
    document.getElementById('f-my-share').value = s.my_share || '';
    document.getElementById('f-pay-to').value = s.pay_to || '';
    (s.members || []).forEach(m => addMemberRow(m.name, m.amount, m.id));
  } else {
    document.getElementById('quick-section').classList.remove('hidden');
    if (selectedServiceBtn) { selectedServiceBtn.classList.remove('selected'); selectedServiceBtn = null; }
    if (selectedPlanChip) { selectedPlanChip.classList.remove('selected'); selectedPlanChip = null; }
    document.getElementById('plan-row').classList.remove('visible');
    document.getElementById('plan-chips').innerHTML = '';
    document.getElementById('name-hint').textContent = '';
    document.getElementById('f-name').value = '';
    document.getElementById('f-category').value = '娛樂';
    document.getElementById('f-status').value = 'active';
    document.getElementById('f-amount').value = '';
    document.getElementById('f-currency').value = 'TWD';
    document.getElementById('f-cycle').value = 'monthly';
    document.getElementById('f-next-date').value = '';
    document.getElementById('f-payment').value = '';
    document.getElementById('f-remind').value = 7;
    document.getElementById('f-notes').value = '';
    document.getElementById('f-plan-type').value = 'solo';
    document.getElementById('f-my-share').value = '';
    document.getElementById('f-pay-to').value = '';
  }

  onPlanTypeChange();
  document.getElementById('overlay').classList.add('show');
}

function closeModal() {
  document.getElementById('overlay').classList.remove('show');
}

document.getElementById('overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('overlay')) closeModal();
});

async function save() {
  const name = document.getElementById('f-name').value.trim();
  const amount = document.getElementById('f-amount').value;
  const date = document.getElementById('f-next-date').value;
  if (!name || !amount || !date) { alert('請填寫服務名稱、費用和下次扣款日'); return; }

  const planType = document.getElementById('f-plan-type').value;
  const existingMembers = editingId ? (subs.find(x => x.id === editingId)?.members || []) : [];
  const members = [...document.getElementById('members-list').querySelectorAll('.member-row-form')].map(row => {
    const memberId = row.dataset.memberId;
    const existing = existingMembers.find(m => m.id === memberId);
    return {
      id: memberId,
      name: row.querySelector('.member-name').value.trim(),
      amount: parseFloat(row.querySelector('.member-amount').value) || 0,
      paid: existing ? existing.paid : false,
    };
  }).filter(m => m.name);

  const payload = {
    name,
    category: document.getElementById('f-category').value,
    status: document.getElementById('f-status').value,
    amount: parseFloat(amount),
    currency: document.getElementById('f-currency').value,
    cycle: document.getElementById('f-cycle').value,
    next_billing_date: date,
    payment: document.getElementById('f-payment').value.trim(),
    remind_days: parseInt(document.getElementById('f-remind').value) || 7,
    notes: document.getElementById('f-notes').value.trim(),
    plan_type: planType,
    my_share: parseFloat(document.getElementById('f-my-share').value) || 0,
    pay_to: document.getElementById('f-pay-to').value.trim(),
    members,
  };

  if (editingId) {
    await fetch(`/api/subscriptions/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    showToast('✓ 已更新訂閱');
  } else {
    await fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    showToast('✓ 已新增訂閱');
  }

  closeModal();
  load();
}

async function del(id) {
  if (!confirm('確定要刪除這筆訂閱嗎？')) return;
  await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
  showToast('已刪除', 'info');
  load();
}

buildServiceButtons();
load();

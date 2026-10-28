'use strict';

/* =========================================================
   УТИЛИТЫ
   ========================================================= */
const $  = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const rub = n => n.toLocaleString('ru-RU') + ' ₽';

// Склонение: plural(5, ['миска','миски','мисок']) → «мисок»
function plural(n, forms) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
}

let toastTimer;
function toast(message) {
  const t = $('#toast');
  t.textContent = message;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

// Если фото не загрузилось — показываем эмодзи вместо пустого места
function withFallback(img, emoji) {
  const swap = () => {
    const ph = document.createElement('div');
    ph.className = 'ph';
    ph.textContent = emoji;
    ph.setAttribute('aria-hidden', 'true');
    img.replaceWith(ph);
  };
  if (img.complete && img.naturalWidth === 0) swap();
  else img.addEventListener('error', swap, { once: true });
}
$$('img[data-fallback]').forEach(img => withFallback(img, img.dataset.fallback));

/* =========================================================
   ПОДОПЕЧНЫЕ
   Замените фото и тексты на настоящих питомцев приюта.
   ========================================================= */
const photo = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&h=600&q=80`;

const pets = [
  { id: 1, name: 'Барсик', type: 'cat', kind: 'кот',   age: '2 года', photo: photo('1514888286974-6c03e2ca1dba'),
    text: 'Ласковый мурлыка. Любит подоконники и почесушки за ухом.', traits: ['привит', 'стерилизован', 'приучен к лотку'] },
  { id: 2, name: 'Рекс',   type: 'dog', kind: 'пёс',   age: '3 года', photo: photo('1587300003388-59208cc962cb'),
    text: 'Весёлый и энергичный. Обожает долгие прогулки и мячик.', traits: ['привит', 'знает команды'] },
  { id: 3, name: 'Муся',   type: 'cat', kind: 'кошка', age: '1 год',  photo: photo('1574158622682-e40e69881006'),
    text: 'Игривая и любопытная, быстро подружится с детьми.', traits: ['привита', 'стерилизована'] },
  { id: 4, name: 'Джек',   type: 'dog', kind: 'пёс',   age: '5 лет',  photo: photo('1543466835-00a7907e9de1'),
    text: 'Спокойный и преданный. Идеален для неспешных прогулок.', traits: ['привит', 'ладит с кошками'] },
  { id: 5, name: 'Тиша',   type: 'cat', kind: 'кот',   age: '4 года', photo: photo('1518791841217-8f162f1e1131'),
    text: 'Сначала стесняется, а потом не отходит ни на шаг.', traits: ['привит', 'спокойный'] },
  { id: 6, name: 'Пончик', type: 'dog', kind: 'пёс',   age: '2 года', photo: photo('1517849845537-4d257902454a'),
    text: 'Маленький диванный философ. Немного храпит, но очень мило.', traits: ['привит', 'для квартиры'] },
];

const petsGrid = $('#petsGrid');
const liked = new Set();
let petFilter = 'all';
const heartIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.6-4.7-9.4-9.6C1.5 7.6 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.5 3.1 4.4 6.4-1.8 4.9-9.4 9.6-9.4 9.6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';

function renderPets() {
  petsGrid.innerHTML = '';
  pets
    .filter(p => petFilter === 'all' || p.type === petFilter)
    .forEach(p => {
      const card = document.createElement('article');
      card.className = 'tag';
      card.innerHTML = `
        <div class="tag-photo">
          <img src="${p.photo}" alt="${p.kind} ${p.name}" loading="lazy" width="600" height="600">
          <button class="like" type="button" data-like="${p.id}" aria-pressed="${liked.has(p.id)}" aria-label="В избранное: ${p.name}">${heartIcon}</button>
        </div>
        <div class="tag-body">
          <h3 class="tag-name">${p.name}</h3>
          <p class="tag-meta">${p.kind}, ${p.age}</p>
          <p class="tag-text">${p.text}</p>
          <ul class="traits">${p.traits.map(t => `<li>${t}</li>`).join('')}</ul>
          <button class="btn btn-adopt" type="button" data-adopt="${p.id}">Приютить</button>
        </div>`;
      withFallback(card.querySelector('img'), p.type === 'cat' ? '🐱' : '🐶');
      petsGrid.append(card);
    });
}

$$('[data-filter]').forEach(chip => {
  chip.addEventListener('click', () => {
    petFilter = chip.dataset.filter;
    $$('[data-filter]').forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
    renderPets();
  });
});

petsGrid.addEventListener('click', e => {
  const likeBtn = e.target.closest('[data-like]');
  if (likeBtn) {
    const id = Number(likeBtn.dataset.like);
    liked.has(id) ? liked.delete(id) : liked.add(id);
    likeBtn.setAttribute('aria-pressed', String(liked.has(id)));
    return;
  }
  const adoptBtn = e.target.closest('[data-adopt]');
  if (adoptBtn) openAdopt(Number(adoptBtn.dataset.adopt));
});

renderPets();

/* =========================================================
   МОДАЛЬНЫЕ ОКНА
   ========================================================= */
let lastFocus = null;
const anyModalOpen = () => !!$('.modal.open');

function openModal(modal) {
  lastFocus = document.activeElement;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  const first = modal.querySelector('input, select, textarea, .amount, .btn');
  setTimeout(() => first && first.focus(), 60);
}
function closeModal(modal) {
  modal.classList.remove('open');
  if (!anyModalOpen()) document.body.style.overflow = '';
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
$$('.modal').forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.closest('[data-close]')) closeModal(modal);
  });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && anyModalOpen()) closeModal($('.modal.open'));
});

/* =========================================================
   «ПРИЮТИТЬ»
   ========================================================= */
const adoptModal = $('#adoptModal');
const adoptForm  = $('#adoptForm');
const adoptError = $('#adoptError');
let currentPet = null;

function openAdopt(id) {
  currentPet = pets.find(p => p.id === id);
  $('#adoptTitle').textContent = `${currentPet.name} ищет дом`;
  $('#adoptMeta').textContent  = `${currentPet.kind}, ${currentPet.age}`;
  const thumb = $('#adoptThumb');
  thumb.innerHTML = `<img src="${currentPet.photo}" alt="">`;
  withFallback(thumb.querySelector('img'), currentPet.type === 'cat' ? '🐱' : '🐶');

  adoptForm.reset();
  adoptError.textContent = '';
  $('#adoptStep').hidden = false;
  $('#adoptSuccess').hidden = true;
  openModal(adoptModal);
}

adoptForm.addEventListener('submit', e => {
  e.preventDefault();
  const name  = $('#aName').value.trim();
  const phone = $('#aPhone').value.trim();

  if (name.length < 2) { adoptError.textContent = 'Введите имя — хотя бы 2 буквы.'; $('#aName').focus(); return; }
  if (phone.replace(/\D/g, '').length < 10) { adoptError.textContent = 'Введите номер телефона полностью, например +7 900 123-45-67.'; $('#aPhone').focus(); return; }
  if (!$('#aAgree').checked) { adoptError.textContent = 'Отметьте согласие на знакомство с волонтёром.'; return; }

  // Здесь заявку можно отправить на сервер или в Telegram-бота:
  // fetch('/api/adopt', { method: 'POST', body: JSON.stringify({ petId: currentPet.id, name, phone, ... }) })

  $('#adoptSuccessText').textContent = `${name}, спасибо! Координатор позвонит в течение дня и договорится о знакомстве. ${currentPet.name} уже ждёт 🐾`;
  $('#adoptStep').hidden = true;
  $('#adoptSuccess').hidden = false;
  $('#adoptSuccess .btn').focus();
});

/* =========================================================
   «ЗАДОНАТИТЬ НА КОРМ»
   ========================================================= */
const GOAL = 60000;
const BOWL_PRICE = 50; // сколько стоит одна миска корма, ₽
let raised = 32450;
let amount = 500;

const donateModal = $('#donateModal');
const payBtn = $('#payBtn');
const customAmount = $('#customAmount');
const donateError = $('#donateError');

function updateProgress() {
  const pct = Math.min(100, (raised / GOAL) * 100);
  $('#progressBar').style.width = pct + '%';
  $('#progress').setAttribute('aria-valuenow', String(Math.round(pct)));
  $('#raised').textContent = rub(raised);
  $('#goal').textContent = rub(GOAL);
}

function setAmount(value) {
  amount = value;
  const bowls = Math.floor(value / BOWL_PRICE);
  payBtn.textContent = value > 0 ? `Задонатить ${rub(value)}` : 'Задонатить';
  $('#calc').textContent = bowls > 0
    ? `Это примерно ${bowls} ${plural(bowls, ['миска', 'миски', 'мисок'])} корма.`
    : 'Даже маленькая сумма приближает нас к цели.';
}

$$('.amount').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.amount').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    customAmount.value = '';
    donateError.textContent = '';
    setAmount(Number(btn.dataset.amount));
  });
});

customAmount.addEventListener('input', () => {
  $$('.amount').forEach(b => b.setAttribute('aria-pressed', 'false'));
  donateError.textContent = '';
  setAmount(Math.max(0, Math.floor(Number(customAmount.value) || 0)));
});

$$('[data-open-donate]').forEach(btn => btn.addEventListener('click', () => {
  $('#donateStep').hidden = false;
  $('#donateSuccess').hidden = true;
  donateError.textContent = '';
  openModal(donateModal);
}));

/* Здесь подключается настоящая платёжная система
   (ЮKassa, CloudPayments, Stripe и т. п.). Сейчас оплата имитируется. */
function processDonation(sum, email) {
  return new Promise(resolve => setTimeout(() => resolve({ ok: true, sum, email }), 900));
}

payBtn.addEventListener('click', async () => {
  if (amount < 10) { donateError.textContent = 'Минимальная сумма — 10 ₽.'; customAmount.focus(); return; }
  payBtn.disabled = true;
  payBtn.textContent = 'Переводим…';

  const result = await processDonation(amount, $('#dEmail').value.trim());
  payBtn.disabled = false;
  setAmount(amount);
  if (!result.ok) { donateError.textContent = 'Перевод не прошёл. Проверьте данные карты и попробуйте ещё раз.'; return; }

  raised += amount;
  updateProgress();
  const bowls = Math.floor(amount / BOWL_PRICE);
  $('#donateSuccessText').textContent = bowls > 0
    ? `${rub(amount)} — это ${bowls} ${plural(bowls, ['миска', 'миски', 'мисок'])} корма для наших подопечных.`
    : `Ваши ${rub(amount)} уже в копилке на корм.`;
  $('#donateStep').hidden = true;
  $('#donateSuccess').hidden = false;
  $('#donateSuccess .btn').focus();
  toast('Донат отправлен. Спасибо!');
});

setAmount(amount);
updateProgress();

/* =========================================================
   МИНИ-ИГРА «КОТ-ПРЫГУН»
   ========================================================= */
(() => {
  const canvas = $('#gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = $('#score'), bestEl = $('#best'), bowlsEl = $('#bowls'), startBtn = $('#startBtn');
  const isTouch = matchMedia('(pointer: coarse)').matches;

  // Физика (пиксели и секунды)
  const GRAVITY = 2000;
  const JUMP_SPEED = 720;
  const SHORT_JUMP_SPEED = 320; // если отпустить кнопку рано

  let W = 600, H = 240, groundY = 200;
  let state = 'ready';           // ready | playing | over
  let cat, mice, clouds, pebbles, floats;
  let speed, score, best = 0, bowlsTotal = 0, spawnTimer, time = 0, overAt = 0, newRecord = false;
  let inView = false, captureKeys = false;
  let colors = {};

  // Цвета берём из CSS-переменных, чтобы игра подстраивалась под тему
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const v = name => cs.getPropertyValue(name).trim();
    colors = {
      sky: v('--game-sky'), ground: v('--game-ground'), line: v('--game-line'), cloud: v('--game-cloud'),
      text: v('--game-text'), muted: v('--game-muted'), panel: v('--game-panel'), accent: v('--game-accent'),
      cat: v('--cat'), catDark: v('--cat-dark'), belly: v('--cat-belly'),
      mouse: v('--mouse'), mouseDark: v('--mouse-dark'), pink: v('--pink'), sun: v('--sun'),
    };
  }
  readColors();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColors);

  function makeScenery() {
    clouds = [
      { x: W * 0.12, y: 38, s: 1 },
      { x: W * 0.52, y: 70, s: 0.8 },
      { x: W * 0.84, y: 30, s: 1.15 },
    ];
    pebbles = [];
    for (let x = 0; x < W + 30; x += 30) {
      pebbles.push({ x: x + Math.random() * 14, y: 8 + Math.random() * 22, w: 4 + Math.random() * 10 });
    }
  }

  function resize() {
    W = canvas.parentElement.clientWidth;
    H = Math.round(Math.max(220, Math.min(300, W * 0.38)));
    groundY = H - 38;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeScenery();
    if (cat) draw(); // после изменения размера холст очищается — перерисовываем
  }

  function reset() {
    cat = { x: Math.max(40, Math.min(80, W * 0.1)), y: 0, vy: 0, w: 58, h: 46 };
    mice = [];
    floats = [];
    speed = 280;
    score = 0;
    spawnTimer = 1.1;
    newRecord = false;
    scoreEl.textContent = '0';
  }

  function start() {
    reset();
    state = 'playing';
    startBtn.textContent = 'Заново';
  }

  function jump() {
    if (cat.y <= 0.01) cat.vy = JUMP_SPEED;
  }

  function press() {
    if (state === 'playing') { jump(); return; }
    if (state === 'over' && performance.now() - overAt < 450) return; // защита от случайного рестарта
    start();
    jump();
  }

  function release() {
    if (state === 'playing' && cat.vy > SHORT_JUMP_SPEED) cat.vy = SHORT_JUMP_SPEED;
  }

  function spawnMouse() {
    mice.push({ x: W + 20, w: 36, h: 20, passed: false, phase: Math.random() * 6 });
    let extra = 0;
    // На большой скорости иногда бегут две мыши подряд
    if (speed > 380 && Math.random() < 0.3) {
      mice.push({ x: W + 66, w: 36, h: 20, passed: false, phase: Math.random() * 6 });
      extra = 0.15;
    }
    spawnTimer = 0.8 + extra + Math.random() * (1.1 - Math.min(0.5, score * 0.02));
  }

  function hits(m) {
    const catBottom = groundY - cat.y;
    const cx1 = cat.x + 10, cx2 = cat.x + cat.w - 2, cy1 = catBottom - cat.h + 8;
    const mx1 = m.x + 4,    mx2 = m.x + m.w - 4,     my1 = groundY - m.h + 4;
    return cx1 < mx2 && cx2 > mx1 && cy1 < groundY && catBottom > my1;
  }

  function addPoint() {
    score++;
    scoreEl.textContent = String(score);
    floats.push({ x: cat.x + 30, y: groundY - cat.y - 64, text: '+1', life: 0.8, color: colors.text });
    if (score % 5 === 0) {
      bowlsTotal++;
      bowlsEl.textContent = String(bowlsTotal);
      floats.push({ x: cat.x + 70, y: groundY - cat.y - 80, text: '+1 🥣', life: 1.3, color: colors.accent });
    }
  }

  function gameOver() {
    state = 'over';
    overAt = performance.now();
    if (score > best) { best = score; newRecord = score > 0; bestEl.textContent = String(best); }
    startBtn.textContent = 'Ещё раз';
    const earned = Math.floor(score / 5);
    if (earned > 0) toast(`Рыжик заработал ${earned} ${plural(earned, ['миску', 'миски', 'мисок'])} корма для приюта!`);
  }

  function update(dt) {
    time += dt;
    const sceneSpeed = state === 'playing' ? speed : 30;

    clouds.forEach(c => {
      c.x -= sceneSpeed * 0.12 * dt;
      if (c.x < -80) { c.x = W + Math.random() * 60; c.y = 24 + Math.random() * 60; }
    });
    floats.forEach(f => { f.life -= dt; f.y -= 34 * dt; });
    floats = floats.filter(f => f.life > 0);

    if (state !== 'playing') return;

    pebbles.forEach(p => { p.x -= speed * dt; if (p.x < -14) p.x += W + 28; });

    cat.vy -= GRAVITY * dt;
    cat.y += cat.vy * dt;
    if (cat.y < 0) { cat.y = 0; cat.vy = 0; }

    spawnTimer -= dt;
    if (spawnTimer <= 0) spawnMouse();

    mice.forEach(m => {
      m.x -= speed * dt;
      if (!m.passed && m.x + m.w < cat.x + 10) { m.passed = true; addPoint(); }
    });
    mice = mice.filter(m => m.x > -60);

    for (const m of mice) if (hits(m)) { gameOver(); break; }

    speed = Math.min(620, 280 + score * 9);
  }

  /* ---------- рисование ---------- */
  function circle(x, y, r) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCloud(c) {
    const s = c.s;
    ctx.fillStyle = colors.cloud;
    ctx.beginPath();
    circle(c.x, c.y, 14 * s);
    circle(c.x + 18 * s, c.y - 8 * s, 18 * s);
    circle(c.x + 38 * s, c.y, 14 * s);
    ctx.rect(c.x, c.y, 38 * s, 14 * s);
    ctx.fill();
  }

  function drawCat() {
    const x = cat.x, b = groundY - cat.y;
    const inAir = cat.y > 0.5;
    const running = state === 'playing' && !inAir;
    const t = time * 18;
    const wave = Math.sin(time * (state === 'playing' ? 10 : 3)) * 6;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // хвост
    ctx.strokeStyle = colors.cat;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x + 8, b - 26);
    ctx.quadraticCurveTo(x - 12, b - 28, x - 9 + wave * 0.3, b - 46 - wave * 0.5);
    ctx.stroke();

    // лапы
    ctx.strokeStyle = colors.catDark;
    ctx.lineWidth = 6;
    [x + 14, x + 22, x + 36, x + 44].forEach((lx, i) => {
      let dx = 0, len = 14;
      if (running) dx = Math.sin(t + (i % 2 ? Math.PI : 0)) * 5;
      if (inAir) { dx = i < 2 ? -6 : 6; len = 9; }
      ctx.beginPath();
      ctx.moveTo(lx, b - 16);
      ctx.lineTo(lx + dx, b - 16 + len);
      ctx.stroke();
    });

    // туловище, животик, полоски
    ctx.fillStyle = colors.cat;
    ctx.beginPath(); ctx.ellipse(x + 29, b - 24, 24, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = colors.belly;
    ctx.beginPath(); ctx.ellipse(x + 32, b - 17, 14, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = colors.catDark;
    ctx.lineWidth = 3;
    [x + 17, x + 25, x + 33].forEach(sx => {
      ctx.beginPath(); ctx.moveTo(sx, b - 36); ctx.quadraticCurveTo(sx + 3, b - 31, sx, b - 27); ctx.stroke();
    });

    // голова
    const hx = x + 52, hy = b - 38 + (running ? Math.sin(t) * 1.2 : 0);
    ctx.fillStyle = colors.cat;
    ctx.beginPath(); ctx.moveTo(hx - 12, hy - 4); ctx.lineTo(hx - 8, hy - 21); ctx.lineTo(hx - 1, hy - 11); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 2, hy - 12);  ctx.lineTo(hx + 10, hy - 21); ctx.lineTo(hx + 12, hy - 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = colors.pink;
    ctx.beginPath(); ctx.moveTo(hx - 9, hy - 8); ctx.lineTo(hx - 7.5, hy - 16); ctx.lineTo(hx - 4, hy - 11); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 5, hy - 11); ctx.lineTo(hx + 9, hy - 16); ctx.lineTo(hx + 9.5, hy - 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = colors.cat;
    ctx.beginPath(); ctx.arc(hx, hy, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = colors.belly;
    ctx.beginPath(); ctx.ellipse(hx + 6, hy + 5, 7, 5, 0, 0, Math.PI * 2); ctx.fill();

    // глаз
    ctx.fillStyle = '#1F2A44';
    ctx.strokeStyle = '#1F2A44';
    if (state === 'over') {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx + 1, hy - 6); ctx.lineTo(hx + 7, hy);
      ctx.moveTo(hx + 7, hy - 6); ctx.lineTo(hx + 1, hy);
      ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(hx + 4, hy - 3, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(hx + 5, hy - 4, 0.9, 0, Math.PI * 2); ctx.fill();
    }

    // нос и усы
    ctx.fillStyle = colors.pink;
    ctx.beginPath(); ctx.moveTo(hx + 11, hy + 1); ctx.lineTo(hx + 14.5, hy + 1); ctx.lineTo(hx + 12.7, hy + 3.8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = colors.catDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hx + 12, hy + 4); ctx.lineTo(hx + 23, hy + 2);
    ctx.moveTo(hx + 12, hy + 5); ctx.lineTo(hx + 23, hy + 8);
    ctx.stroke();

    ctx.restore();
  }

  function drawMouse(m) {
    const x = m.x, b = groundY;
    const t = time * 20 + m.phase;
    ctx.save();
    ctx.lineCap = 'round';

    // хвост
    ctx.strokeStyle = colors.pink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 33, b - 8);
    ctx.quadraticCurveTo(x + 42, b - 8 + Math.sin(t) * 5, x + 50, b - 14 + Math.sin(t + 1) * 4);
    ctx.stroke();

    // лапки
    ctx.fillStyle = colors.mouseDark;
    ctx.beginPath();
    circle(x + 10 + Math.sin(t) * 2, b - 2, 2.6);
    circle(x + 26 - Math.sin(t) * 2, b - 2, 2.6);
    ctx.fill();

    // туловище и мордочка
    ctx.fillStyle = colors.mouse;
    ctx.beginPath(); ctx.ellipse(x + 20, b - 10, 15, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 12, b - 17);
    ctx.quadraticCurveTo(x - 1, b - 13, x - 4, b - 8);
    ctx.quadraticCurveTo(x + 4, b - 3, x + 14, b - 4);
    ctx.closePath();
    ctx.fill();

    // ушко
    ctx.beginPath(); ctx.arc(x + 12, b - 19, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = colors.pink;
    ctx.beginPath(); ctx.arc(x + 12, b - 19, 3.4, 0, Math.PI * 2); ctx.fill();

    // глаз и нос
    ctx.fillStyle = '#1F2A44';
    ctx.beginPath(); ctx.arc(x + 4, b - 11, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = colors.pink;
    ctx.beginPath(); ctx.arc(x - 4, b - 8, 2, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  function drawPanel(title, subtitle) {
    const pw = Math.min(W - 32, 520), ph = 92;
    const px = (W - pw) / 2, py = Math.max(12, (groundY - ph) / 2 - 10);
    ctx.fillStyle = colors.panel;
    roundRect(px, py, pw, ph, 18);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.text;
    ctx.font = `700 ${W < 420 ? 17 : 21}px Unbounded, "Arial Black", system-ui, sans-serif`;
    ctx.fillText(title, W / 2, py + 34, pw - 24);
    ctx.fillStyle = colors.muted;
    ctx.font = `500 ${W < 420 ? 13 : 15}px "Golos Text", system-ui, sans-serif`;
    ctx.fillText(subtitle, W / 2, py + 64, pw - 24);
  }

  function draw() {
    ctx.fillStyle = colors.sky;
    ctx.fillRect(0, 0, W, H);
    clouds.forEach(drawCloud);

    // земля
    ctx.fillStyle = colors.ground;
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = colors.line;
    ctx.fillRect(0, groundY, W, 3);
    pebbles.forEach(p => ctx.fillRect(p.x, groundY + p.y, p.w, 2.5));

    mice.forEach(drawMouse);
    drawCat();

    floats.forEach(f => {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.5));
      ctx.fillStyle = f.color;
      ctx.font = '700 16px Unbounded, "Arial Black", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    });

    const action = isTouch ? 'Коснитесь экрана' : 'Нажмите пробел или кликните';
    if (state === 'ready') drawPanel('Кот-прыгун', `${action}, чтобы начать`);
    if (state === 'over') drawPanel(newRecord ? 'Новый рекорд!' : 'Рыжик споткнулся!', `Мышей позади: ${score}. ${isTouch ? 'Коснитесь' : 'Пробел'} — сыграть ещё`);
  }

  /* ---------- игровой цикл ---------- */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (inView && !anyModalOpen()) { update(dt); draw(); }
    requestAnimationFrame(loop);
  }

  /* ---------- управление ---------- */
  window.addEventListener('keydown', e => {
    if (!['Space', 'ArrowUp', 'KeyW'].includes(e.code)) return;
    if (!captureKeys || anyModalOpen()) return;
    if (e.target.closest && e.target.closest('input, textarea, select, button, a')) return;
    e.preventDefault(); // чтобы пробел не прокручивал страницу
    if (!e.repeat) press();
  });
  window.addEventListener('keyup', e => {
    if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) release();
  });
  canvas.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    e.preventDefault();
    press();
  });
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  startBtn.addEventListener('click', () => { startBtn.blur(); start(); });

  // Игра работает, только когда её видно на экране
  new IntersectionObserver(entries => {
    const ratio = entries[0].intersectionRatio;
    inView = ratio > 0;
    captureKeys = ratio >= 0.5;
  }, { threshold: [0, 0.5, 1] }).observe(canvas);

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas.parentElement);
  else window.addEventListener('resize', resize);

  resize();
  reset();
  draw();
  requestAnimationFrame(loop);
})();

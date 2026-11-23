'use strict';
/*
 * EMBERFALL — Duel of the Ashen Court. An original two-player-style card
 * duel against the Ashen Warden (an AI opponent), in one file.
 *
 * You and the Warden each hold 20 life. Each turn your embers refill and
 * grow by one (to 10). Play creature cards onto your row and spell cards
 * for instant effects; a creature can attack the turn after it is played:
 * click it, then click an enemy creature or the Warden himself. Creatures
 * trade damage both ways. Empty deck? Every draw burns 1 life. Reduce the
 * Warden to 0 to win; fall to 0 and the Court keeps your name.
 *
 * Mouse: click cards and targets. Keys: 1-7 play a card, SPACE ends the
 * turn, ENTER starts, R restarts, M mutes.
 */
(function () {
  var W = 960, H = 600;
  // ---------------------------------------------------------------- rng
  var seed = 7;
  function rnd() { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------------------------------------------------------------- cards
  // el: ember(flame) frost(ice) thorn(leaf) star(void). kind: minion|bolt|mend|surge
  var POOL = [
    { name: 'Cinder Imp', cost: 1, atk: 2, hp: 1, el: 'ember', kind: 'minion', text: 'Small. Angry. Flammable.' },
    { name: 'Ash Squire', cost: 1, atk: 1, hp: 3, el: 'star', kind: 'minion', text: 'Sworn to the cold hearth.' },
    { name: 'Thorn Sprite', cost: 2, atk: 2, hp: 3, el: 'thorn', kind: 'minion', text: 'The garden fights back.' },
    { name: 'Frost Herald', cost: 2, atk: 3, hp: 2, el: 'frost', kind: 'minion', text: 'Winter sends its regards.' },
    { name: 'Ember Bolt', cost: 2, kind: 'bolt', el: 'ember', text: 'Deal 3 damage to anything.' },
    { name: 'Coal Golem', cost: 3, atk: 3, hp: 4, el: 'ember', kind: 'minion', text: 'It remembers being a mountain.' },
    { name: 'Grave Gardener', cost: 3, atk: 2, hp: 5, el: 'thorn', kind: 'minion', text: 'Everything returns to soil.' },
    { name: 'Starless Knight', cost: 4, atk: 4, hp: 4, el: 'star', kind: 'minion', text: 'His oath outlived his sky.' },
    { name: 'Hearth Mend', cost: 2, kind: 'mend', el: 'thorn', text: 'Restore 5 life to your hero.' },
    { name: 'Glacier Mare', cost: 4, atk: 5, hp: 4, el: 'frost', kind: 'minion', text: 'Hooves of black ice.' },
    { name: 'Kindled Surge', cost: 1, kind: 'surge', el: 'ember', text: 'Give a friendly creature +2 attack.' },
    { name: 'Pyre Dragon', cost: 6, atk: 7, hp: 6, el: 'ember', kind: 'minion', text: 'The court\'s final argument.' },
    { name: 'Void Oracle', cost: 5, atk: 4, hp: 7, el: 'star', kind: 'minion', text: 'She has seen how this ends.' },
    { name: 'Briar Matriarch', cost: 5, atk: 5, hp: 6, el: 'thorn', kind: 'minion', text: 'Root, tooth and crown.' }
  ];
  function buildDeck() {
    var d = [];
    POOL.forEach(function (c) { d.push(c); d.push(c); });
    d.push(POOL[11]); d.push(POOL[12]);
    return shuffle(d.slice());
  }
  var EL = {
    ember: { col: '#ff7a3c', soft: '#ffd9a8', label: 'EMBER' },
    frost: { col: '#6ec6ff', soft: '#d3efff', label: 'FROST' },
    thorn: { col: '#7ed957', soft: '#dcffc9', label: 'THORN' },
    star: { col: '#c39bff', soft: '#ecdfff', label: 'VOID' }
  };

  // ---------------------------------------------------------------- state
  var S;
  function side(isAI) {
    return { ai: isAI, life: 20, deck: buildDeck(), hand: [], board: [], embers: 0, maxEmbers: 0, fatigue: 0 };
  }
  function reset(newSeed) {
    seed = newSeed || (Date.now() % 100000) + 7;
    S = {
      mode: 'title', t: 0, turn: 1, active: 'you',
      you: side(false), foe: side(true),
      sel: null, selCard: null, log: [], score: 0, muted: false, over: ''
    };
    for (var i = 0; i < 4; i++) { drawFromDeck(S.you, true); drawFromDeck(S.foe, true); }
    beginTurn(S.you, true);
    log('The Ashen Court is seated. Your move, challenger.');
  }
  function log(m) { S.log.unshift(m); if (S.log.length > 4) S.log.pop(); }
  function drawFromDeck(sd, silent) {
    if (sd.deck.length === 0) {
      sd.fatigue += 1; sd.life -= sd.fatigue;
      log((sd.ai ? 'The Warden' : 'You') + ' draw from an empty deck and burn ' + sd.fatigue + ' life.');
      checkEnd(); return;
    }
    if (sd.hand.length < 9) sd.hand.push(sd.deck.pop());
    if (!silent) { /* drawing is quiet */ }
  }
  function beginTurn(sd, first) {
    sd.maxEmbers = clamp(sd.maxEmbers + (first ? 1 : 1), 1, 10);
    sd.embers = sd.maxEmbers;
    sd.board.forEach(function (m) { m.ready = true; m.acted = false; });
    if (!first) drawFromDeck(sd);
  }
  function checkEnd() {
    if (S.mode !== 'play' && S.mode !== 'title') return;
    if (S.foe.life <= 0) { S.mode = 'win'; S.score = 100 + S.you.life * 10 + S.turn * -2 + totalDamage; beep(523, .12); setTimeout(function () { beep(784, .2); }, 110); }
    else if (S.you.life <= 0) { S.mode = 'lose'; beep(160, .5, 'sawtooth', .06); }
  }
  var totalDamage = 0;
  reset(7); S.mode = 'title';

  // ---------------------------------------------------------------- audio
  var AC = null;
  function beep(f, d, type, v) {
    if (S.muted) return;
    try {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      if (!AC) AC = new C();
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = type || 'square'; o.frequency.value = f; g.gain.value = v || .04;
      o.connect(g); g.connect(AC.destination); o.start();
      g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + d); o.stop(AC.currentTime + d);
    } catch (e) {}
  }

  // ---------------------------------------------------------------- rules
  function dealDamage(target, amt, targetSide) {
    if (target === 'hero') {
      targetSide.life -= amt;
      if (targetSide === S.foe) { totalDamage += amt; S.score += amt; }
    } else {
      target.hp -= amt;
    }
  }
  function sweepDead() {
    ['you', 'foe'].forEach(function (k) {
      S[k].board = S[k].board.filter(function (m) { if (m.hp <= 0) { log(m.name + ' falls.'); return false; } return true; });
    });
  }
  function playCard(sd, idx) {
    var card = sd.hand[idx];
    if (!card || card.cost > sd.embers) return false;
    if (card.kind === 'minion' && sd.board.length >= 5) { if (!sd.ai) log('Your row is full (5 creatures).'); return false; }
    sd.embers -= card.cost;
    sd.hand.splice(idx, 1);
    if (card.kind === 'minion') {
      sd.board.push({ name: card.name, cost: card.cost, atk: card.atk, hp: card.hp, maxHp: card.hp, el: card.el, ready: false, acted: false });
      log((sd.ai ? 'The Warden plays ' : 'You play ') + card.name + '.');
      beep(440, .08);
    } else if (card.kind === 'mend') {
      sd.life = clamp(sd.life + 5, 0, 30);
      log((sd.ai ? 'The Warden mends' : 'You mend') + ' for 5 life.');
      beep(660, .1);
    } else {
      // targeted spells wait for a click in the UI; the AI resolves at once
      if (sd.ai) { resolveSpell(sd, card, aiSpellTarget(sd, card)); }
      else { S.selCard = { card: card, fromHand: true }; log('Choose a target for ' + card.name + '.'); return true; }
    }
    sweepDead(); checkEnd();
    return true;
  }
  function aiSpellTarget(sd, card) {
    var foe = sd === S.you ? S.foe : S.you;
    if (card.kind === 'bolt') {
      var kill = foe.board.filter(function (m) { return m.hp <= 3; }).sort(function (a, b) { return b.atk - a.atk; })[0];
      if (kill) return kill;
      return foe.life <= 3 || foe.board.length === 0 ? 'hero' : (foe.board[0] || 'hero');
    }
    // surge: biggest friendly creature
    var best = sd.board.slice().sort(function (a, b) { return b.hp - a.hp; })[0];
    return best || null;
  }
  function resolveSpell(sd, card, target) {
    if (card.kind === 'bolt') {
      var foe = sd === S.you ? S.foe : S.you;
      dealDamage(target, 3, foe);
      log(card.name + ' strikes for 3.');
      beep(220, .12, 'sawtooth', .05);
    } else if (card.kind === 'surge') {
      if (target && target !== 'hero') { target.atk += 2; log(card.name + ': ' + target.name + ' gains +2 attack.'); }
      else { log(card.name + ' fizzles with no creature to kindle.'); }
      beep(880, .09);
    }
    sweepDead(); checkEnd();
  }
  function attack(att, target, attSide) {
    var defSide = attSide === S.you ? S.foe : S.you;
    att.acted = true;
    if (target === 'hero') {
      dealDamage('hero', att.atk, defSide);
      log(att.name + ' hits ' + (defSide.ai ? 'the Warden' : 'you') + ' for ' + att.atk + '.');
    } else {
      target.hp -= att.atk;
      att.hp -= target.atk;
      log(att.name + ' clashes with ' + target.name + '.');
    }
    beep(300, .07, 'square', .05);
    sweepDead(); checkEnd();
  }
  function endTurn() {
    if (S.mode !== 'play') return;
    S.sel = null; S.selCard = null;
    if (S.active === 'you') {
      S.active = 'foe';
      aiTurn();
      if (S.mode !== 'play') return;
      S.active = 'you';
      S.turn += 1;
      beginTurn(S.you);
      log('Turn ' + S.turn + '. Your embers flare to ' + S.you.maxEmbers + '.');
    }
  }
  function aiTurn() {
    var foe = S.foe;
    beginTurn(foe);
    // play cards greedily, most expensive first, while affordable
    var guard = 0;
    while (guard++ < 12) {
      var playable = foe.hand.map(function (c, i) { return { c: c, i: i }; })
        .filter(function (p) { return p.c.cost <= foe.embers && (p.c.kind !== 'minion' || foe.board.length < 5) && (p.c.kind !== 'surge' || foe.board.length > 0); })
        .sort(function (a, b) { return b.c.cost - a.c.cost; });
      if (!playable.length) break;
      if (!playCard(foe, playable[0].i)) break;
      if (S.mode !== 'play') return;
    }
    // attack with every ready creature
    foe.board.slice().forEach(function (m) {
      if (S.mode !== 'play' || m.hp <= 0 || !m.ready || m.acted) return;
      var targets = S.you.board.filter(function (x) { return x.hp > 0; });
      var kill = targets.filter(function (x) { return x.hp <= m.atk && x.atk < m.hp; }).sort(function (a, b) { return b.atk - a.atk; })[0];
      if (kill) attack(m, kill, foe);
      else if (targets.length && S.you.life > 8 && rnd() < 0.35) attack(m, targets[0], foe);
      else attack(m, 'hero', foe);
    });
  }

  // ---------------------------------------------------------------- input
  var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined' && !!document.getElementById;
  var canvas = null, ctx = null, hits = [];
  function startGame() {
    if (S.mode === 'play') return;
    reset((Date.now() % 100000) + 7);
    S.mode = 'play';
    beep(660, .12);
  }
  if (isBrowser) {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    window.addEventListener('keydown', function (e) {
      var k = e.key.toLowerCase();
      if (e.key === 'Enter') startGame();
      if (k === 'r' && (S.mode === 'win' || S.mode === 'lose')) startGame();
      if (k === 'm') S.muted = !S.muted;
      if (e.key === ' ' && S.mode === 'play') { e.preventDefault(); endTurn(); }
      var n = parseInt(e.key, 10);
      if (S.mode === 'play' && n >= 1 && n <= 7) tryPlay(n - 1);
    });
    canvas.addEventListener('mousedown', function (ev) {
      var r = canvas.getBoundingClientRect();
      var x = (ev.clientX - r.left) * (W / r.width), y = (ev.clientY - r.top) * (H / r.height);
      click(x, y);
    });
  }
  function tryPlay(i) {
    if (S.active !== 'you' || S.mode !== 'play') return;
    var card = S.you.hand[i];
    if (!card) return;
    if (card.cost > S.you.embers) { log('Not enough embers for ' + card.name + ' (needs ' + card.cost + ').'); beep(140, .1, 'sawtooth', .05); return; }
    if (card.kind === 'bolt' || card.kind === 'surge') { playCard(S.you, i); return; }
    playCard(S.you, i);
  }
  function click(x, y) {
    if (S.mode !== 'play') { startGame(); return; }
    for (var i = hits.length - 1; i >= 0; i--) {
      var h = hits[i];
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) { h.fn(); return; }
    }
    // a click on empty felt only drops a chosen attacker; a spell that is
    // waiting for its target stays in hand until it is cast or replaced
    S.sel = null;
  }

  // ---------------------------------------------------------------- draw
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function elIcon(c, el, x, y, s) {
    c.save(); c.translate(x, y); c.fillStyle = EL[el].col;
    c.beginPath();
    if (el === 'ember') { c.moveTo(0, -s); c.quadraticCurveTo(s * .8, -s * .1, s * .45, s * .5); c.quadraticCurveTo(s * .2, s, 0, s); c.quadraticCurveTo(-s * .2, s, -s * .45, s * .5); c.quadraticCurveTo(-s * .8, -s * .1, 0, -s); }
    else if (el === 'frost') { for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3; c.moveTo(0, 0); c.lineTo(Math.cos(a) * s, Math.sin(a) * s); c.lineTo(Math.cos(a + .5) * s * .3, Math.sin(a + .5) * s * .3); } c.arc(0, 0, s * .3, 0, Math.PI * 2); }
    else if (el === 'thorn') { c.moveTo(0, s); c.quadraticCurveTo(-s, 0, 0, -s); c.quadraticCurveTo(s, 0, 0, s); }
    else { c.moveTo(0, -s); c.lineTo(s * .25, -s * .25); c.lineTo(s, 0); c.lineTo(s * .25, s * .25); c.lineTo(0, s); c.lineTo(-s * .25, s * .25); c.lineTo(-s, 0); c.lineTo(-s * .25, -s * .25); }
    c.closePath(); c.fill(); c.restore();
  }
  function drawCard(c, card, x, y, w, h, opts) {
    opts = opts || {};
    var el = EL[card.el];
    c.save();
    if (opts.dim) c.globalAlpha = .45;
    // frame
    c.fillStyle = opts.sel ? '#ffd75e' : '#2a2135';
    rr(c, x - 2, y - 2, w + 4, h + 4, 10); c.fill();
    var g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#f7ecd2'); g.addColorStop(1, '#e3d3ae');
    c.fillStyle = g; rr(c, x, y, w, h, 8); c.fill();
    // art window
    c.fillStyle = el.soft; rr(c, x + 7, y + 22, w - 14, h * .42, 6); c.fill();
    elIcon(c, card.el, x + w / 2, y + 22 + h * .21, Math.min(w, h) * .17);
    c.fillStyle = 'rgba(30,20,40,0.65)';
    c.font = 'bold ' + Math.round(h * .075) + 'px sans-serif'; c.textAlign = 'center';
    c.fillText(el.label, x + w / 2, y + 22 + h * .42 - 5);
    // name (shrunk until it fits beside the cost orb)
    c.fillStyle = '#241a30';
    var nfs = Math.round(h * .088);
    c.font = 'bold ' + nfs + 'px sans-serif';
    while (c.measureText(card.name).width > w - 36 && nfs > 8) { nfs--; c.font = 'bold ' + nfs + 'px sans-serif'; }
    c.fillText(card.name, x + w / 2 + 8, y + 15);
    // cost orb
    c.fillStyle = '#ff8c1a'; c.beginPath(); c.arc(x + 13, y + 13, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.font = 'bold 13px sans-serif'; c.fillText(card.cost, x + 13, y + 17.5);
    // body text / stats
    c.fillStyle = '#4a3a28';
    c.font = Math.round(h * .072) + 'px sans-serif';
    if (card.kind === 'minion') {
      wrapText(c, card.text, x + w / 2, y + h * .72, w - 14, h * .09);
      badge(c, x + 12, y + h - 12, card.atk, '#c0392b');
      badge(c, x + w - 12, y + h - 12, card.hp, '#2471a3');
    } else {
      wrapText(c, card.text, x + w / 2, y + h * .74, w - 12, h * .09);
      c.fillStyle = el.col; c.font = 'bold ' + Math.round(h * .08) + 'px sans-serif';
      c.fillText('SPELL', x + w / 2, y + h - 8);
    }
    c.restore();
  }
  function badge(c, x, y, v, col) {
    c.fillStyle = col; c.beginPath(); c.arc(x, y, 11, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.fillText(v, x, y + 4.5);
  }
  function wrapText(c, text, x, y, maxW, lh) {
    var words = text.split(' '), line = '', yy = y;
    for (var i = 0; i < words.length; i++) {
      var t = line ? line + ' ' + words[i] : words[i];
      if (c.measureText(t).width > maxW && line) { c.fillText(line, x, yy); line = words[i]; yy += lh; }
      else line = t;
    }
    if (line) c.fillText(line, x, yy);
  }
  function drawMinion(c, m, x, y, w, h, mine) {
    var card = { name: m.name, el: m.el, cost: m.cost || 0, kind: 'minion', atk: m.atk, hp: m.hp, text: '' };
    drawCard(c, card, x, y, w, h, { sel: S.sel === m, dim: !m.ready && mine && S.active === 'you' });
    if (!m.ready) {
      c.fillStyle = 'rgba(240,240,255,0.85)'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center';
      c.fillText('SUMMONED', x + w / 2, y + h + 11);
    } else if (m.acted) {
      c.fillStyle = 'rgba(200,200,200,0.8)'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center';
      c.fillText('SPENT', x + w / 2, y + h + 11);
    }
    // damage wear
    if (m.hp < m.maxHp) {
      c.fillStyle = '#c0392b'; c.font = 'bold 11px sans-serif'; c.textAlign = 'right';
      c.fillText('-' + (m.maxHp - m.hp), x + w - 4, y + 12);
    }
  }
  function drawHero(c, sd, x, y, isFoe) {
    c.save();
    c.fillStyle = isFoe ? '#3a1522' : '#14301f';
    rr(c, x, y, 170, 74, 10); c.fill();
    c.strokeStyle = isFoe ? '#ff7a3c' : '#7ed957'; c.lineWidth = 2; rr(c, x, y, 170, 74, 10); c.stroke();
    c.fillStyle = isFoe ? '#ff9d5c' : '#a8e063';
    c.beginPath(); c.arc(x + 34, y + 37, 22, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1c1428';
    c.font = 'bold 21px sans-serif'; c.textAlign = 'center';
    c.fillText(isFoe ? 'W' : 'Y', x + 34, y + 45);
    c.fillStyle = '#f7ecd2'; c.font = 'bold 14px sans-serif'; c.textAlign = 'left';
    c.fillText(isFoe ? 'ASHEN WARDEN' : 'YOU, CHALLENGER', x + 64, y + 28);
    c.fillStyle = sd.life <= 6 ? '#ff5040' : '#ffd75e';
    c.font = 'bold 19px sans-serif';
    c.fillText('♥ ' + sd.life + ' LIFE', x + 64, y + 54);
    c.fillStyle = '#bdb2d9'; c.font = '11px sans-serif';
    c.fillText('deck ' + sd.deck.length + ' · hand ' + sd.hand.length, x + 64, y + 69);
    c.restore();
    if (!isFoe || S.sel || S.selCard) {
      hits.push({ x: x, y: y, w: 170, h: 74, fn: function () { heroClicked(isFoe); } });
    }
  }
  function heroClicked(isFoe) {
    if (S.selCard) { // spells target heroes only if friendly surge has none / bolt foe
      var card = S.selCard.card;
      if (card.kind === 'bolt' && isFoe) { removeSelCard(); resolveSpell(S.you, card, 'hero'); }
      else if (card.kind === 'surge' && !isFoe) { log('Surge needs a creature target, not a hero.'); }
      return;
    }
    if (S.sel && isFoe) { var m = S.sel; S.sel = null; attack(m, 'hero', S.you); }
  }
  function removeSelCard() {
    var i = S.you.hand.indexOf(S.selCard.card);
    S.selCard = null;
  }
  function draw(c) {
    hits = [];
    c.clearRect(0, 0, W, H);
    // table felt
    var g = c.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 620);
    g.addColorStop(0, '#274435'); g.addColorStop(1, '#12241a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(255,215,94,0.25)'; c.lineWidth = 2;
    rr(c, 10, 10, W - 20, H - 20, 16); c.stroke();
    if (S.mode === 'title') { overlayTitle(c); drawTitleCards(c); return; }
    // heroes
    drawHero(c, S.foe, 24, 18, true);
    drawHero(c, S.you, 24, H - 92, false);
    // turn + embers + score banner
    c.fillStyle = '#f7ecd2'; c.textAlign = 'center';
    c.font = 'bold 17px sans-serif';
    c.fillText(S.mode === 'play' ? (S.active === 'you' ? 'YOUR TURN ' + S.turn : 'WARDEN\'S TURN') : 'DUEL OVER', W / 2, 34);
    c.font = '13px sans-serif'; c.fillStyle = '#ffd75e';
    c.fillText('SCORE ' + Math.max(0, S.score + totalDamage * 0) + '  ·  damage dealt ' + totalDamage, W / 2, 54);
    // embers
    for (var i = 0; i < 10; i++) {
      c.fillStyle = i < S.you.embers ? '#ff8c1a' : 'rgba(255,140,26,0.2)';
      c.beginPath(); c.arc(790 + (i % 5) * 30, 412 + Math.floor(i / 5) * 26, 9, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#ffd75e'; c.font = 'bold 12px sans-serif'; c.textAlign = 'left';
    c.fillText('EMBERS ' + S.you.embers + '/' + S.you.maxEmbers, 786, 398);
    // opponent hand: card backs
    for (var b = 0; b < S.foe.hand.length; b++) {
      var bx = 660 + b * 32, by = 16;
      c.fillStyle = '#4a2440'; rr(c, bx, by, 44, 62, 5); c.fill();
      c.strokeStyle = '#ff7a3c'; c.lineWidth = 1.4; rr(c, bx + 3, by + 3, 38, 56, 4); c.stroke();
      elIcon(c, 'ember', bx + 22, by + 31, 9);
    }
    c.fillStyle = '#bdb2d9'; c.font = '11px sans-serif'; c.textAlign = 'left';
    c.fillText('WARDEN\'S HAND', 660, 92);
    // boards
    drawRow(c, S.foe, 100, false);
    drawRow(c, S.you, 238, true);
    c.strokeStyle = 'rgba(247,236,210,0.18)'; c.beginPath(); c.moveTo(210, 228); c.lineTo(750, 228); c.stroke();
    // your hand
    var hw = S.you.hand.length > 6 ? 88 : 104, hh = 138, gap = 8;
    var total = S.you.hand.length * (hw + gap) - gap;
    var hx = (W - total) / 2 - 60, hy = H - hh - 8;
    S.you.hand.forEach(function (card, i) {
      var x = hx + i * (hw + gap);
      var afford = card.cost <= S.you.embers;
      drawCard(c, card, x, hy, hw, hh, { dim: !afford && S.mode === 'play', sel: S.selCard && S.selCard.card === card });
      c.fillStyle = '#f7ecd2'; c.font = 'bold 11px sans-serif'; c.textAlign = 'center';
      c.fillText(String(i + 1), x + hw / 2, hy - 6);
      (function (idx) {
        hits.push({ x: x, y: hy, w: hw, h: hh, fn: function () { tryPlay(idx); } });
      })(i);
    });
    // end turn button
    var canEnd = S.mode === 'play' && S.active === 'you';
    c.fillStyle = canEnd ? '#c96a1e' : '#5a4632';
    rr(c, 806, 300, 130, 46, 9); c.fill();
    c.fillStyle = '#fff'; c.font = 'bold 16px sans-serif'; c.textAlign = 'center';
    c.fillText('END TURN ⏎', 871, 329);
    if (canEnd) hits.push({ x: 806, y: 300, w: 130, h: 46, fn: function () { endTurn(); } });
    // log, with the current instruction as its first line when one is live
    c.fillStyle = 'rgba(8,10,8,0.55)'; rr(c, 216, 384, 540, 58, 8); c.fill();
    var lines = S.log.slice(0, 3);
    if (S.selCard) lines = ['Choose a target for ' + S.selCard.card.name + ' — click a creature' + (S.selCard.card.kind === 'bolt' ? ' or the Warden.' : '.')].concat(lines.slice(0, 2));
    else if (S.sel) lines = [S.sel.name + ' is ready — click an enemy creature or the Warden to attack.'].concat(lines.slice(0, 2));
    c.font = '12px sans-serif'; c.textAlign = 'left';
    lines.forEach(function (m, i) {
      c.fillStyle = i === 0 && (S.sel || S.selCard) ? '#ffd75e' : '#e8e4da';
      if (i === 0 && (S.sel || S.selCard)) c.font = 'bold 12px sans-serif'; else c.font = '12px sans-serif';
      c.fillText(m, 228, 402 + i * 17);
    });
    if (S.mode === 'win') overlayEnd(c, true);
    if (S.mode === 'lose') overlayEnd(c, false);
  }
  function drawRow(c, sd, y, mine) {
    var w = 104, h = 118, gap = 10;
    var total = Math.max(1, sd.board.length) * (w + gap) - gap;
    var x0 = (W - total) / 2 - 20;
    if (sd.board.length === 0) {
      c.fillStyle = 'rgba(247,236,210,0.35)'; c.font = 'italic 13px sans-serif'; c.textAlign = 'center';
      c.fillText(mine ? '— your row is empty: play a creature —' : '— the Warden\'s row is empty —', W / 2 - 20, y + 60);
      return;
    }
    sd.board.forEach(function (m, i) {
      var x = x0 + i * (w + gap);
      drawMinion(c, m, x, y, w, h, mine);
      (function (mm) {
        hits.push({
          x: x, y: y, w: w, h: h, fn: function () {
            if (S.mode !== 'play') return;
            if (S.selCard) {
              var card = S.selCard.card;
              if (card.kind === 'bolt' && !mine) { removeSelCard(); resolveSpell(S.you, card, mm); }
              else if (card.kind === 'surge' && mine) { removeSelCard(); resolveSpell(S.you, card, mm); }
              else log('That is not a legal target for ' + card.name + '.');
              return;
            }
            if (mine) {
              if (S.active === 'you' && mm.ready && !mm.acted) S.sel = mm;
              else if (mm.ready === false) log(mm.name + ' was just summoned — it attacks next turn.');
              return;
            }
            if (S.sel) { var a = S.sel; S.sel = null; attack(a, mm, S.you); }
          }
        });
      })(m);
    });
  }
  function drawTitleCards(c) {
    var demo = [POOL[11], POOL[3], POOL[12]];
    demo.forEach(function (card, i) {
      drawCard(c, card, 250 + i * 170, 330, 130, 172, {});
    });
  }
  function overlayTitle(c) {
    c.fillStyle = 'rgba(10,6,14,0.78)'; c.fillRect(0, 0, W, H);
    c.textAlign = 'center';
    c.fillStyle = '#ff8c1a'; c.font = 'bold 62px sans-serif';
    c.fillText('EMBERFALL', W / 2, 130);
    c.fillStyle = '#f7ecd2'; c.font = 'bold 20px sans-serif';
    c.fillText('— DUEL OF THE ASHEN COURT —', W / 2, 164);
    c.fillStyle = '#e8e4da'; c.font = '16px sans-serif';
    c.fillText('An original card duel against the Ashen Warden. Both heroes hold 20 life.', W / 2, 214);
    c.fillText('Spend embers on creatures and spells, trade blows on the table,', W / 2, 240);
    c.fillText('and burn the Warden down before your deck — or your life — runs out.', W / 2, 266);
    c.fillStyle = '#ffd75e'; c.font = 'bold 15px sans-serif';
    c.fillText('CLICK a card to play it · CLICK your ready creature, then a target, to attack · SPACE ends the turn', W / 2, 300);
    c.fillStyle = '#7ed957'; c.font = 'bold 23px sans-serif';
    if (Math.floor(S.t * 2) % 2 === 0) c.fillText('PRESS ENTER OR CLICK TO DUEL', W / 2, 556);
    c.textAlign = 'left';
  }
  function overlayEnd(c, won) {
    c.fillStyle = won ? 'rgba(8,22,10,0.82)' : 'rgba(26,6,8,0.85)';
    c.fillRect(0, 0, W, H);
    c.textAlign = 'center';
    c.fillStyle = won ? '#7ed957' : '#ff5040';
    c.font = 'bold 52px sans-serif';
    c.fillText(won ? 'THE COURT IS YOURS!' : 'ASHES TAKE YOU', W / 2, 216);
    c.fillStyle = '#f7ecd2'; c.font = '18px sans-serif';
    if (won) {
      c.fillText('The Ashen Warden bows. You dealt ' + totalDamage + ' damage in ' + S.turn + ' turns', W / 2, 268);
      c.fillText('with ' + S.you.life + ' life to spare. Final score: ' + Math.max(0, 100 + S.you.life * 10 - S.turn * 2) + '.', W / 2, 298);
    } else {
      c.fillText(S.foe.life > 0 ? 'The Warden still holds ' + S.foe.life + ' life. Your name joins the ash.' : 'Your deck burned out.', W / 2, 268);
      c.fillText('You dealt ' + totalDamage + ' damage over ' + S.turn + ' turns. The Court will seat you again.', W / 2, 298);
    }
    c.fillStyle = '#ffd75e'; c.font = 'bold 20px sans-serif';
    c.fillText('PRESS R TO DUEL AGAIN', W / 2, 372);
    c.textAlign = 'left';
  }

  // ---------------------------------------------------------------- shots
  function stageShot(name) {
    reset(42);
    if (name === 'start') { S.mode = 'title'; return; }
    S.mode = 'play';
    if (name === 'play') {
      S.turn = 5;
      S.you.life = 14; S.foe.life = 17;
      S.you.maxEmbers = 6; S.you.embers = 3;
      S.foe.maxEmbers = 5; S.foe.embers = 0;
      totalDamage = 9; S.score = 9;
      S.you.board = [
        { name: 'Coal Golem', cost: 3, atk: 3, hp: 2, maxHp: 4, el: 'ember', ready: true, acted: false },
        { name: 'Thorn Sprite', cost: 2, atk: 2, hp: 3, maxHp: 3, el: 'thorn', ready: true, acted: false },
        { name: 'Frost Herald', cost: 2, atk: 3, hp: 2, maxHp: 2, el: 'frost', ready: false, acted: false }
      ];
      S.foe.board = [
        { name: 'Starless Knight', cost: 4, atk: 4, hp: 4, maxHp: 4, el: 'star', ready: true, acted: false },
        { name: 'Cinder Imp', cost: 1, atk: 2, hp: 1, maxHp: 1, el: 'ember', ready: true, acted: false }
      ];
      S.you.hand = [POOL[11], POOL[4], POOL[9], POOL[0]];
      S.foe.hand = [POOL[1], POOL[2], POOL[5], POOL[6], POOL[7]];
      S.sel = S.you.board[0];
      S.log = ['Coal Golem is ready — click an enemy creature or the Warden to attack.', 'The Warden plays Starless Knight.', 'You play Frost Herald.'];
    } else if (name === 'win') {
      S.mode = 'win';
      S.you.life = 9; S.foe.life = 0; S.turn = 9; totalDamage = 27;
    } else if (name === 'lose') {
      S.mode = 'lose';
      S.you.life = 0; S.foe.life = 6; S.turn = 11; totalDamage = 18;
    }
  }

  // ---------------------------------------------------------------- loop
  var last = 0;
  function frame(ts) {
    var dt = Math.min(.05, (ts - last) / 1000 || .016);
    last = ts;
    S.t += dt;
    if (ctx) draw(ctx);
    if (isBrowser) window.requestAnimationFrame(frame);
  }
  if (isBrowser) {
    var q = '';
    try { q = window.location.search || ''; } catch (e) {}
    var m = /[?&]shot=([a-z]+)/.exec(q);
    if (m) stageShot(m[1]);
    window.requestAnimationFrame(frame);
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.__EMBER__ = {
      stageShot: stageShot, draw: draw, setCtx: function (c) { ctx = c; },
      start: startGame, endTurn: endTurn, tryPlay: tryPlay, click: click,
      state: function () { return S; }, W: W, H: H
    };
  }
})();

/* Swarm · execução ao vivo. Desenha pipelines → tabelas do BigQuery → investigadores → orquestrador/auditor
   a partir do snapshot live/<id>.json (branch live) ou de um events.jsonl (reassistir). */
window.SwarmLive = (function () {
  var NS = 'http://www.w3.org/2000/svg';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PIPES = [
    { id: 'p_pl', n: 'places', s: 'Places Graph' },
    { id: 'p_tr', n: 'transactions', s: 'Groundflow' },
    { id: 'p_au', n: 'audiences', s: 'Audiences Graph' },
    { id: 'p_pf', n: 'performance', s: 'Max Attention' }
  ];
  var FEED = { geoiq_mart: ['p_pl'], hypr_invoice_data: ['p_tr', 'p_pl'], reviq_mart: ['p_tr'], bidiq_mart: ['p_pf', 'p_au'] };
  var MAXT = 5;
  var SHORT = { unified_store_brand_monthly: 'store_brand', unified_chain_monthly: 'chain', fireho_basket_brand: 'basket', fireho_nf_season_brand_category: 'nf_season',
    fact_ean_dia: 'ean_dia', fact_ean_loja_mes: 'ean_loja', dim_loja: 'loja', dim_marcas: 'marcas', dim_categorias: 'categorias', ean_enriquecidos_com_categoria_e_marca: 'ean_enriq',
    unified_token_geo_daily: 'token_geo', singlepoint_pdvs: 'pdvs' };
  var DSHORT = { reviq_mart: 'revIQ', hypr_invoice_data: 'invoice', bidiq_mart: 'bidIQ', geoiq_mart: 'geoIQ' };

  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clock(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function gb(b) { return b >= 1e9 ? (b / 1e9).toFixed(1).replace('.', ',') + ' GB' : Math.round(b / 1e6) + ' MB'; }
  var PR = { inM: 3, outM: 15, bqTB: 6.25 };
  function usd(v) { return 'US$ ' + (v < 10 ? v.toFixed(2) : v.toFixed(1)).replace('.', ','); }
  function costOf(tk, bytes) { tk = tk || {}; return ((tk.input || 0) * PR.inM + (tk.output || 0) * PR.outM) / 1e6 + (bytes || 0) * PR.bqTB / 1e12; }
  function tok(n) { return n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' mi' : n >= 1000 ? Math.round(n / 1000) + ' mil' : String(n); }
  function tablesIn(sql) { var m = sql.match(/`([\w\-\.]+)`/g) || []; return m.map(function (t) { return t.replace(/`/g, ''); }); }
  function short(t) { var n = t.split('.').pop(); return SHORT[n] || n.replace(/^(unified_|fact_|dim_)/, '').replace(/_monthly$/, '_m').replace(/_daily$/, '_d'); }
  function dataset(t) { var p = t.split('.'); return p.length >= 2 ? p[p.length - 2] : ''; }
  function hiSql(s) {
    return esc(s).replace(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|AND|OR|AS|JOIN|LEFT|ON|WITH|CASE|WHEN|THEN|ELSE|END|SUM|COUNT|AVG|DISTINCT|BETWEEN|IN|LIMIT|HAVING|OVER|PARTITION BY|SAFE_DIVIDE|DATE|EXTRACT|QUALIFY|UNION ALL|NOT|IS|NULL)\b/g, '<span class="k">$1</span>')
      .replace(/`([^`]+)`/g, '<span class="s">`$1`</span>');
  }

  function View(root) {
    this.root = root;
    root.innerHTML =
      '<div class="lv-head"><div><div class="mono" id="lv-id">caso ao vivo</div><h2 id="lv-q" style="margin:6px 0 0"></h2><div class="lv-phase"><i></i><span id="lv-phase">preparando</span></div></div><span class="pill run" id="lv-st">rodando</span></div>' +
      '<div class="kpis"><div class="kpi"><div class="v" id="lv-ag">0</div><div class="l">agentes</div></div><div class="kpi"><div class="v" id="lv-qn">0</div><div class="l">consultas</div></div><div class="kpi"><div class="v" id="lv-gb">0 MB</div><div class="l">lidos no BigQuery</div></div><div class="kpi"><div class="v" id="lv-tk">0</div><div class="l">tokens</div></div><div class="kpi"><div class="v" id="lv-cost">US$ 0</div><div class="l">custo estimado</div></div><div class="kpi"><div class="v" id="lv-cl">0:00</div><div class="l">tempo decorrido</div></div></div>' +
      '<div class="net"><svg id="lv-net" viewBox="0 0 640 490" aria-label="Agentes consultando as bases HYPR no BigQuery"></svg></div>' +
      '<div class="console" id="lv-con"></div>' +
      '<div id="lv-foot"></div>';
    this.$ = function (id) { return root.querySelector('#' + id); };
    this.net = this.$('lv-net'); this.con = this.$('lv-con');
    this.reset();
  }
  View.prototype.reset = function () {
    this.done = 0; this.pos = {}; this.links = {}; this.ag = {}; this.tb = {}; this.tbOrder = []; this.agOrder = []; this.qn = 0; this.bytes = 0; this.t = 0; this.status = 'running';
    this.lastTables = {}; this.queue = null; this.base = null; this.con.innerHTML = ''; this.$('lv-foot').innerHTML = '';
    this.buildStatic();
  };
  View.prototype.buildStatic = function () {
    var net = this.net; net.innerHTML = '';
    this.gL = el('g', {}, net); this.gF = el('g', {}, net); this.gN = el('g', {}, net); this.gP = el('g', {}, net);
    el('text', { class: 'bq', x: 18, y: 14 }, this.gN).textContent = 'DATA PIPELINES';
    for (var i = 0; i < PIPES.length; i++) {
      var p = PIPES[i], x = 112 + i * 138, y = 46; this.pos[p.id] = { x: x, y: y };
      var g = el('g', { class: 'pipe', transform: 'translate(' + x + ',' + y + ')' }, this.gN);
      el('rect', { x: -50, y: -12, width: 100, height: 24, rx: 12 }, g);
      el('text', { class: 'pn', y: 4, 'text-anchor': 'middle' }, g).textContent = p.n;
      el('text', { class: 'ps', y: -19, 'text-anchor': 'middle' }, g).textContent = p.s;
    }
    el('text', { class: 'bq', x: 18, y: 92 }, this.gN).textContent = 'BIGQUERY · SITE-HYPR';
    el('rect', { class: 'bqbox', x: 6, y: 98, width: 628, height: 70, rx: 14 }, this.gN);
    this.tbEmpty = el('text', { class: 'sub', x: 320, y: 137, 'text-anchor': 'middle' }, this.gN); this.tbEmpty.textContent = 'aguardando a primeira consulta';
    this.gT = el('g', {}, this.gN); this.gA = el('g', {}, this.gN);
    el('text', { class: 'bq', x: 18, y: 200 }, this.gN).textContent = 'AGENTES';
    this.agEmpty = el('text', { class: 'sub', x: 320, y: 262, 'text-anchor': 'middle' }, this.gN); this.agEmpty.textContent = 'o orquestrador ainda não criou agentes';
    // orquestrador e auditor
    this.pos.orq = { x: 300, y: 352 }; this.pos.aud = { x: 450, y: 352 };
    this.links['orq-aud'] = el('path', { class: 'link', d: 'M322 352 L428 352' }, this.gL);
    el('circle', { class: 'drop', r: 2.2, cx: 375, cy: 352 }, this.gF);
    var go = el('g', { class: 'ag', transform: 'translate(300,352)' }, this.gN);
    el('circle', { class: 'c', r: 22 }, go);
    var ro = el('circle', { class: 'prog', r: 22, transform: 'rotate(-90)', 'stroke-dasharray': '138.2', 'stroke-dashoffset': '138.2' }, go);
    el('text', { x: -34, y: 0, 'text-anchor': 'end' }, go).textContent = 'Orquestrador';
    el('text', { class: 'role', x: -34, y: 14, 'text-anchor': 'end' }, go).textContent = 'hipóteses, cruza, reconcilia';
    el('text', { class: 'st', y: 3, 'text-anchor': 'middle' }, go).textContent = '';
    this.ag.orq = { g: go, prog: ro, st: go.querySelector('.st'), n: 'Orquestrador', q: 0, done: false };
    var ga = el('g', { class: 'ag', transform: 'translate(450,352)' }, this.gN);
    el('circle', { class: 'c', r: 22 }, ga);
    var ra = el('circle', { class: 'prog', r: 22, transform: 'rotate(-90)', 'stroke-dasharray': '138.2', 'stroke-dashoffset': '138.2' }, ga);
    el('text', { x: 34, y: 0, 'text-anchor': 'start' }, ga).textContent = 'Auditor';
    el('text', { class: 'role', x: 34, y: 14, 'text-anchor': 'start' }, ga).textContent = 'checagem independente';
    el('text', { class: 'st', y: 3, 'text-anchor': 'middle' }, ga).textContent = '';
    this.ag.aud = { g: ga, prog: ra, st: ga.querySelector('.st'), n: 'Auditor', q: 0, done: false };
    // resultado
    el('text', { class: 'bq', x: 18, y: 408 }, this.gN).textContent = 'RESULTADO';
    this.links['orq|res'] = el('path', { class: 'link', d: 'M300 374 C 300 395, 250 405, 250 418' }, this.gL);
    var rb = el('g', { class: 'res', transform: 'translate(250,440)' }, this.gN);
    el('rect', { x: -120, y: -20, width: 240, height: 40, rx: 10 }, rb);
    this.resT = el('text', { class: 'rt', y: -2, 'text-anchor': 'middle' }, rb); this.resT.textContent = 'Hipóteses ranqueadas';
    this.resS = el('text', { class: 'rs', y: 12, 'text-anchor': 'middle' }, rb); this.resS.textContent = '% de confiança em cada uma';
    this.resBox = rb;
    el('path', { class: 'link', d: 'M372 440 L448 440' }, this.gL); el('circle', { class: 'drop', r: 2.2, cx: 410, cy: 440 }, this.gF);
    var ab = el('g', { class: 'res act', transform: 'translate(545,440)' }, this.gN);
    el('rect', { x: -95, y: -20, width: 190, height: 40, rx: 10 }, ab);
    this.actT = el('text', { class: 'rt', y: -2, 'text-anchor': 'middle' }, ab); this.actT.textContent = 'Ação no bidIQ';
    this.actS = el('text', { class: 'rs', y: 12, 'text-anchor': 'middle' }, ab); this.actS.textContent = 'plano de audiência pronto';
    this.actBox = ab;
    this.phase('preparing');
  };
  View.prototype.ensureTable = function (t) {
    if (this.tb[t]) return this.tb[t];
    if (this.tbOrder.length >= MAXT) { if (!this.tb._more) { this.tb._more = this.addTable('_more', '+ outras', ''); } return this.tb._more; }
    return this.addTable(t, short(t), dataset(t));
  };
  View.prototype.addTable = function (id, label, ds) {
    this.tbOrder.push(id); this.tbEmpty.setAttribute('opacity', 0);
    var n = this.tbOrder.length, self = this;
    var W = 122, left = 320 - (n * W) / 2 + 20;
    this.tbOrder.forEach(function (tid, i) {
      var x = Math.round(left + i * W), y = 133; self.pos[tid] = { x: x, y: y };
      if (self.tb[tid]) { self.tb[tid].g.setAttribute('transform', 'translate(' + x + ',' + y + ')'); self.redraw(tid); }
    });
    var p = this.pos[id];
    var g = el('g', { class: 'base', transform: 'translate(' + p.x + ',' + p.y + ')' }, this.gT);
    el('circle', { class: 'ring', r: 17 }, g); el('circle', { r: 17 }, g);
    var cnt = el('text', { class: 'cnt', y: 4, 'text-anchor': 'middle' }, g); cnt.textContent = '';
    var tx = el('text', { class: 'iq', x: 24, y: -2, 'text-anchor': 'start' }, g); tx.textContent = label.length > 12 ? label.slice(0, 11) + '…' : label;
    el('text', { class: 'sub', x: 24, y: 10, 'text-anchor': 'start' }, g).textContent = DSHORT[ds] || ds || '';
    el('title', {}, g).textContent = id;
    var rec = { g: g, cnt: cnt, c: 0, feeds: (FEED[ds] || []).slice(), tx: tx, label: label };
    this.tb[id] = rec; this.redraw(id);
    return rec;
  };
  View.prototype.redraw = function (tid) {
    // feeds pipeline → tabela (com partícula) e links agente → tabela
    var self = this, rec = this.tb[tid], p = this.pos[tid];
    if (!rec) return;
    (rec.feedEls || []).forEach(function (e) { e.remove(); }); rec.feedEls = [];
    rec.feeds.forEach(function (pid, j) {
      var q = self.pos[pid];
      var d = 'M' + q.x + ' ' + (q.y + 12) + ' C ' + q.x + ' ' + (q.y + 50) + ', ' + p.x + ' ' + (p.y - 60) + ', ' + p.x + ' ' + (p.y - 17);
      var f = el('path', { class: 'feed', d: d, id: 'feed-' + self.uid(tid) + '-' + pid }, self.gF);
      rec.feedEls.push(f);
      if (!reduced) { var c = el('circle', { class: 'drop', r: 2.2 }, self.gF); var am = el('animateMotion', { dur: (2.4 + (j * 0.7)) + 's', repeatCount: 'indefinite', begin: (-(j * 1.1)) + 's' }, c); el('mpath', { href: '#' + f.id }, am); rec.feedEls.push(c); }
    });
    Object.keys(this.links).forEach(function (k) {
      var parts = k.split('|'); if (parts.length === 2 && parts[1] === tid) self.linkPath(parts[0], tid, self.links[k]);
    });
  };
  View.prototype.uid = function (s) { return s.replace(/[^\w]/g, '_'); };
  View.prototype.linkPath = function (aid, tid, path) {
    var a = this.pos[aid], t = this.pos[tid]; if (!a || !t) return;
    var up = aid === 'aud' || aid === 'orq';
    var d = up ? 'M' + t.x + ' ' + (t.y + 17) + ' C ' + t.x + ' 250, ' + a.x + ' 290, ' + a.x + ' ' + (a.y - 22)
               : 'M' + t.x + ' ' + (t.y + 17) + ' C ' + t.x + ' ' + (a.y - 60) + ', ' + a.x + ' ' + (t.y + 60) + ', ' + a.x + ' ' + (a.y - 22);
    path.setAttribute('d', d);
  };
  View.prototype.ensureLink = function (aid, tid) {
    var k = aid + '|' + tid; if (this.links[k]) return this.links[k];
    var p = el('path', { class: 'link' }, this.gL); this.links[k] = p; this.linkPath(aid, tid, p); return p;
  };
  View.prototype.ensureAgent = function (aid, role) {
    if (this.ag[aid]) return this.ag[aid];
    this.agOrder.push(aid); this.agEmpty.setAttribute('opacity', 0);
    var n = this.agOrder.length, self = this;
    var small = n > 8 ? 'sm' : n > 6 ? 'md' : '';
    this.gA.setAttribute('class', small);
    this.agOrder.forEach(function (id, i) {
      var x = Math.round(320 + (i - (n - 1) / 2) * Math.min(120, 600 / n)), y = 262; self.pos[id] = { x: x, y: y };
      if (self.ag[id]) { self.ag[id].g.setAttribute('transform', 'translate(' + x + ',' + y + ')'); self.ag[id].name.textContent = self.agName(id, n); self.ag[id].role.setAttribute('opacity', n > 6 ? 0 : 1); self.relink(id); }
    });
    var p = this.pos[aid];
    var g = el('g', { class: 'ag born', transform: 'translate(' + p.x + ',' + p.y + ')' }, this.gA);
    el('circle', { class: 'c', r: 22 }, g);
    var ring = el('circle', { class: 'prog', r: 22, transform: 'rotate(-90)', 'stroke-dasharray': '138.2', 'stroke-dashoffset': '138.2' }, g);
    var name = el('text', { y: -30, 'text-anchor': 'middle' }, g); name.textContent = this.agName(aid, n);
    var r = el('text', { class: 'role', y: 37, 'text-anchor': 'middle' }, g); var rt = role || ''; r.textContent = rt.length > 18 ? rt.slice(0, 17) + '…' : rt; if (n > 6) r.setAttribute('opacity', 0);
    el('title', {}, g).textContent = (role || '');
    var st = el('text', { class: 'st', y: 3, 'text-anchor': 'middle' }, g); st.textContent = '';
    var rec = { g: g, prog: ring, st: st, name: name, role: r, n: this.agName(aid, 99), q: 0, done: false };
    this.ag[aid] = rec;
    this.links[aid + '|orq'] = el('path', { class: 'link' }, this.gL); this.relink(aid);
    this.$('lv-ag').textContent = n;
    this.packet('orq', aid, true);
    setTimeout(function () { g.classList.remove('born'); }, 700);
    return rec;
  };
  View.prototype.agName = function (aid, n) { if (aid === 'controle') return 'Controle'; var m = /^inv(\d+)$/.exec(aid); if (!m) return aid; return 'Agent ' + m[1]; };
  View.prototype.relink = function (aid) {
    var self = this, p = this.pos[aid];
    var o = this.links[aid + '|orq']; if (o) o.setAttribute('d', 'M' + p.x + ' ' + (p.y + 22) + ' C ' + p.x + ' ' + (p.y + 50) + ', 300 ' + (p.y + 50) + ', 300 330');
    Object.keys(this.links).forEach(function (k) { var parts = k.split('|'); if (parts[0] === aid && parts[1] !== 'orq') self.linkPath(aid, parts[1], self.links[k]); });
  };
  View.prototype.packet = function (from, to, back) {
    if (reduced) return;
    var path = this.links[from + '|' + to], rev = false;
    if (!path) { path = this.links[to + '|' + from]; rev = true; }
    if (!path || !path.getAttribute('d')) return;
    if (!path.id) path.id = 'lk' + Math.random().toString(36).slice(2, 8);
    var c = el('circle', { class: 'pkt' + (back ? ' back' : ''), r: 3 }, this.gP);
    var am = el('animateMotion', { dur: '0.7s', fill: 'freeze', keyPoints: rev ? '0;1' : '1;0', keyTimes: '0;1', calcMode: 'linear' }, c);
    el('mpath', { href: '#' + path.id }, am);
    am.beginElement && am.beginElement();
    setTimeout(function () { c.remove(); }, 800);
  };
  View.prototype.light = function (aid, tid) { var l = this.ensureLink(aid, tid); l.classList.add('on'); setTimeout(function () { l.classList.remove('on'); }, 1100); };
  View.prototype.pulse = function (tid) { var b = this.tb[tid]; if (!b) return; b.g.classList.remove('on'); void b.g.getBBox(); b.g.classList.add('on'); setTimeout(function () { b.g.classList.remove('on'); }, 900); };
  View.prototype.prog = function (aid, f) { var a = this.ag[aid]; if (a) a.prog.setAttribute('stroke-dashoffset', String(138.2 * (1 - Math.max(0, Math.min(1, f))))); };
  View.prototype.setState = function (aid, cls) { var a = this.ag[aid]; if (!a) return; a.g.classList.remove('live', 'done'); if (cls) a.g.classList.add(cls); };

  View.prototype.phase = function (p, extra) {
    var T = { preparing: 'subindo um container dedicado a este caso no Cloud Run', boot: 'conectando ao BigQuery e ao modelo', control: 'controle de coleta medindo a base, a categoria e mesmas lojas',
      spawn: 'orquestrador criou ' + (extra || '') + ' agentes; investigando em paralelo', cross: 'orquestrador cruzando as conclusões', audit: 'auditor refazendo os pilares por conta própria',
      done: 'concluído' + (extra ? ' · ' + extra : ''), failed: 'interrompido' };
    this.$('lv-phase').textContent = T[p] || p; this.root.querySelector('.lv-phase').className = 'lv-phase ' + p;
  };
  View.prototype.line = function (ev, body, cls) {
    var key = ev.agent === 'orquestrador' ? 'orq' : ev.agent === 'auditor' ? 'aud' : ev.agent;
    var who = this.ag[key] ? this.ag[key].n : ev.agent;
    var d = document.createElement('div'); d.className = 'ln ' + cls + (ev.agent === 'orquestrador' ? ' orq' : '') + (ev.agent === 'auditor' ? ' aud' : '');
    d.innerHTML = '<span class="m">' + clock(ev.t) + '</span><span class="who">' + esc(who) + '</span><div>' + body + '</div>';
    this.con.appendChild(d);
    while (this.con.children.length > 400) this.con.removeChild(this.con.firstChild);
    this.con.scrollTop = this.con.scrollHeight;
  };

  View.prototype.apply = function (ev) {
    var a = ev.agent, k = ev.kind, self = this;
    if (a === 'orquestrador') a = 'orq'; else if (a === 'auditor') a = 'aud';
    if ((/^inv\d+$/.test(a) || a === 'controle') && !this.ag[a]) {
      var role = (this.agents && this.agents[a] && this.agents[a].role) || '';
      this.ensureAgent(a, role);
    }
    var ag = this.ag[a];
    this.t = Math.max(this.t, ev.t || 0);
    if (a === 'motor' && k === 'note') this.phase('boot');
    if (a === 'controle' && k === 'hyp') this.phase('control');
    if (a === 'orq' && k === 'note' && /^Criando (\d+)/.test(ev.text)) this.phase('spawn', /^Criando (\d+)/.exec(ev.text)[1]);
    if (a === 'orq' && k === 'note' && /Fechamento|cruz/i.test(ev.text)) this.phase('cross');
    if (a === 'aud' && k === 'hyp') this.phase('audit');
    if (k === 'hyp') {
      this.setState(a, 'live'); if (ag) ag.st.textContent = '…';
      this.line(ev, esc(ev.text), 'hyp');
    } else if (k === 'note') {
      if (a === 'orq') { this.setState('orq', 'live'); this.ag.orq.st.textContent = '…'; }
      this.line(ev, esc(ev.text), 'note');
    } else if (k === 'sql') {
      this.setState(a, 'live');
      var ts = tablesIn(ev.text); var seen = {};
      ts.forEach(function (t) { var rec = self.ensureTable(t); var tid = self.tb[t] ? t : '_more'; if (seen[tid]) return; seen[tid] = 1; self.light(a, tid); self.packet(a, tid, false); });
      if (ag) { ag.q++; ag.st.textContent = ag.q + 'q'; if (!ag.done) this.prog(a, Math.min(.85, ag.q * 0.18)); }
      this.qn++; this.$('lv-qn').textContent = this.qn;
      this.line(ev, '<pre>' + hiSql(ev.text) + '</pre>' + (ev.bytes_est ? '<span class="res">estimativa ' + gb(ev.bytes_est) + '</span>' : ''), 'sql');
    } else if (k === 'res') {
      var tl = this.lastTables[a] || [];
      tl.forEach(function (tid) { self.pulse(tid); self.packet(tid, a, true); var r = self.tb[tid]; if (r) { r.c++; r.cnt.textContent = r.c; } });
      this.bytes += ev.bytes || 0; this.$('lv-gb').textContent = gb(this.bytes);
      this.line(ev, '<span class="res">↳ ' + esc(ev.text) + '</span>', 'res');
    } else if (k === 'dead') {
      this.line(ev, '✕ ' + esc(ev.text), 'dead');
    } else if (k === 'deny' || k === 'error') {
      this.line(ev, '⚠ ' + esc(ev.text), 'dead');
    } else if (k === 'find') {
      if (ag) { ag.done = true; this.setState(a, 'done'); this.prog(a, 1); ag.st.textContent = ev.confidence != null ? Math.round(ev.confidence * 100) + '%' : '✓'; }
      if (a !== 'orq' && a !== 'aud') { this.packet(a, 'orq', true); var self2 = this; if (this.agOrder.every(function (id) { return self2.ag[id].done; })) this.phase('cross'); }
      if (a === 'orq') { this.resBox.classList.add('on'); this.resS.textContent = 'enviado ao auditor'; }
      if (a === 'orq') this.packet('orq', 'aud', false);
      this.line(ev, esc(ev.text), 'find');
    } else {
      this.line(ev, esc(ev.text), 'note');
    }
    if (k === 'sql') this.lastTables[a] = Object.keys((function () { var o = {}; tablesIn(ev.text).forEach(function (t) { o[self.tb[t] ? t : '_more'] = 1; }); return o; })());
  };

  /* snapshot cumulativo → aplica só os eventos novos, com pequeno escalonamento */
  View.prototype.render = function (snap) {
    var self = this;
    this.agents = snap.agents || {};
    this.lastTables = this.lastTables || {};
    this.$('lv-id').textContent = 'caso ' + (snap.id || '') + (snap.playbook ? ' · ' + snap.playbook : '');
    this.$('lv-q').textContent = snap.question || '';
    var evs = snap.events || [];
    var fresh = evs.slice(this.done); this.done = evs.length;
    if (this.queue) { this.queue = this.queue.concat(fresh); } else { this.queue = fresh; this.drain(); }
    var m = snap.metrics || {};
    if (m.tokens) { this.$('lv-tk').textContent = tok((m.tokens.input || 0) + (m.tokens.output || 0)); this.$('lv-cost').textContent = usd(m.cost && m.cost.usd != null ? m.cost.usd : costOf(m.tokens, m.bytes || this.bytes)); this.$('lv-cost').title = 'tokens + leitura no BigQuery'; }
    if (m.bytes != null && m.bytes > this.bytes) { this.bytes = m.bytes; this.$('lv-gb').textContent = gb(this.bytes); }
    this.setStatus(snap.status, m.seconds, snap);
  };
  View.prototype.drain = function () {
    var self = this;
    if (!this.queue || !this.queue.length) { this.queue = null; return; }
    var ev = this.queue.shift(); this.apply(ev);
    var gap = this.queue.length > 20 ? 25 : this.queue.length > 5 ? 90 : 220;
    if (reduced) gap = 0;
    setTimeout(function () { self.drain(); }, gap);
  };
  View.prototype.setStatus = function (status, seconds, snap) {
    var st = this.$('lv-st');
    this.status = status;
    if (status === 'done') { st.className = 'pill ok'; st.textContent = snap.result && snap.result.approved === false ? 'concluído · devolvido' : 'concluído'; this.setState('aud', 'done'); this.prog('aud', 1);
      var r = snap.result || {}, hs = (r.hypotheses || []).filter(function (h) { return h && h.statement; });
      this.resBox.classList.add('on'); if (hs.length) { this.resT.textContent = hs.length + ' hipóteses ranqueadas'; this.resS.textContent = 'confiança máxima ' + Math.round(100 * Math.max.apply(null, hs.map(function (h) { return h.confidence || 0; }))) + '%'; }
      this.actBox.classList.add('on'); if (r.action) { this.actS.textContent = r.action.length > 26 ? r.action.slice(0, 25) + '…' : r.action; }
      this.phase('done', r.approved === false ? 'auditor devolveu' : 'auditor aprovou'); if (this.onDone) this.onDone(snap); }
    else if (status === 'failed') { this.phase('failed'); st.className = 'pill no'; st.textContent = 'interrompido'; this.$('lv-foot').innerHTML = '<p class="hint">O caso não terminou. Abra de novo com a mesma pergunta.</p>'; }
    else { st.className = 'pill run'; st.textContent = status === 'preparing' ? 'preparando' : 'rodando'; if (status === 'preparing') this.phase('preparing'); }
    if (seconds != null) { var cur = this.base ? this.base.s + (Date.now() - this.base.at) / 1000 : 0; this.base = { s: Math.max(seconds, status === 'running' || status === 'preparing' ? cur : seconds), at: Date.now() }; }
  };
  View.prototype.tick = function () {
    var s = this.base ? this.base.s + (this.status === 'running' || this.status === 'preparing' ? (Date.now() - this.base.at) / 1000 : 0) : this.t;
    this.$('lv-cl').textContent = clock(s);
  };

  /* ---- modos ---- */
  function Live(root) {
    var view = new View(root), timer = null, tickT = setInterval(function () { view.tick(); }, 1000);
    function stop() { if (timer) { clearTimeout(timer); timer = null; } }
    return {
      view: view,
      /* preparando: ainda não há live/<id>.json */
      preparing: function (run) {
        view.reset(); view.lastTables = {};
        view.$('lv-id').textContent = 'execução #' + (run.run_number || '') + ' · preparando o ambiente';
        view.$('lv-q').textContent = run.display_title || run.name || '';
        view.setStatus('preparing', (Date.now() - new Date(run.run_started_at || run.created_at).getTime()) / 1000, {});
        view.setState('orq', 'live'); view.ag.orq.st.textContent = '…';
        view.line({ t: 0, agent: 'motor' }, 'instalando dependências e conectando ao BigQuery (site-hypr)…', 'note');
      },
      /* ao vivo: função que devolve Promise<snapshot|null>; polling até done */
      follow: function (fetchSnap, onDone) {
        stop(); view.reset(); view.lastTables = {}; view.onDone = function (s) { stop(); onDone && onDone(s); };
        var seenId = null;
        (function poll() {
          fetchSnap().then(function (snap) {
            if (snap) { if (snap.id !== seenId) { seenId = snap.id; } view.render(snap); if (snap.status === 'done' || snap.status === 'failed') return; }
            timer = setTimeout(poll, 6000);
          }).catch(function () { timer = setTimeout(poll, 8000); });
        })();
      },
      /* reassistir: events.jsonl já completo, acelerado */
      replay: function (meta, events, speed) {
        stop(); view.reset(); view.lastTables = {}; view.onDone = null;
        speed = speed || 12;
        view.$('lv-id').textContent = 'reassistindo o caso ' + meta.id + ' · ' + speed + '× mais rápido';
        view.$('lv-q').textContent = meta.question || '';
        view.agents = meta.agents || {};
        view.setStatus('running', 0, {}); view.base = null;
        var i = 0, t0 = Date.now(), first = events.length ? events[0].t : 0;
        var tk = meta.metrics && meta.metrics.tokens ? (meta.metrics.tokens.input || 0) + (meta.metrics.tokens.output || 0) : 0;
        (function step() {
          var now = first + (Date.now() - t0) / 1000 * speed;
          while (i < events.length && events[i].t <= now) { view.apply(events[i]); i++; }
          view.t = now; if (tk) { var f = Math.min(1, i / events.length); view.$('lv-tk').textContent = tok(Math.round(tk * f)); var mt = meta.metrics || {}; view.$('lv-cost').textContent = usd((mt.cost && mt.cost.usd != null ? mt.cost.usd : costOf(mt.tokens, mt.bytes)) * f); }
          if (i < events.length) timer = setTimeout(step, 120);
          else { view.t = events.length ? events[events.length - 1].t : 0; view.setStatus('done', view.t, { result: meta.result }); }
        })();
      },
      stop: function () { stop(); clearInterval(tickT); }
    };
  }
  return Live;
})();

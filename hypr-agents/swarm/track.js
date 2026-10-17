/* Swarm · analytics próprio (sem terceiros): pageview + heartbeat a cada 30 s enquanto a aba está visível.
   Vai para o serviço (/track), que grava no bucket; o Relator calcula sessões, tempo médio e páginas vistas. */
(function () {
  var API = 'https://swarm-453955675457.us-central1.run.app/track';
  var sid; try { sid = sessionStorage.getItem('swarm_sid'); if (!sid) { sid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('swarm_sid', sid); } } catch (e) { sid = 'anon'; }
  var who = null; try { var s = JSON.parse(localStorage.getItem('swarm_session') || 'null'); who = s && s.email || null; } catch (e) {}
  var page = location.pathname.replace(/^\/hypr-agents\/swarm/, '').replace(/\/index\.html$/, '/') || '/';
  var t0 = Date.now(), views = 0;
  function send(ev, extra) {
    var d = Object.assign({ ev: ev, sid: sid, who: who, page: page, host: location.host, t: Date.now(), ref: document.referrer ? document.referrer.slice(0, 120) : '', ua: navigator.userAgent.slice(0, 80), secs: Math.round((Date.now() - t0) / 1000) }, extra || {});
    try { if (navigator.sendBeacon) navigator.sendBeacon(API, new Blob([JSON.stringify(d)], { type: 'text/plain' })); else fetch(API, { method: 'POST', body: JSON.stringify(d), keepalive: true, headers: { 'Content-Type': 'text/plain' } }); } catch (e) {}
  }
  send('pageview'); views++;
  setInterval(function () { if (document.visibilityState === 'visible') send('heartbeat'); }, 30000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') send('hide'); });
  window.addEventListener('pagehide', function () { send('leave'); });
  window.SwarmTrack = function (ev, extra) { send(ev, extra); };
})();

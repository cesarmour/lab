/* Swarm · login HYPR (Google, restrito a @hypr.mobi). Mesmo cliente OAuth do platform.hyprgrid.ai. */
window.SwarmAuth = (function () {
  var KEY = 'swarm_session';
  var CLIENT_ID = '453955675457-fj1ei0rqp3qsvg4jjpctnq8u7g8g431j.apps.googleusercontent.com';
  var DOMAIN = 'hypr.mobi';
  var TTL = 12 * 3600 * 1000;
  var LOGIN = '/hypr-agents/swarm/login/';

  function get() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.exp > Date.now() && s.email) return s; } catch (e) {}
    return null;
  }
  function set(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }
  function require() {
    var s = get();
    if (!s) location.replace(LOGIN + '?next=' + encodeURIComponent(location.pathname + location.search));
    return s;
  }
  function signOut(to) { clear(); location.href = to || LOGIN; }

  function signIn(cb) {
    if (!window.google || !google.accounts || !google.accounts.oauth2) { cb('A biblioteca do Google não carregou. Recarregue a página.'); return; }
    var client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'openid email profile',
      hosted_domain: DOMAIN,
      prompt: 'select_account',
      callback: function (r) {
        if (!r || r.error) { cb(r && (r.error_description || r.error) || 'Login cancelado.'); return; }
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + r.access_token } })
          .then(function (x) { return x.json(); })
          .then(function (u) {
            var ok = u && u.email && u.email_verified !== false && (u.hd === DOMAIN || String(u.email).toLowerCase().slice(-DOMAIN.length - 1) === '@' + DOMAIN);
            if (!ok) { cb('Restrito a contas @' + DOMAIN + '. Você entrou com ' + (u && u.email ? u.email : 'outra conta') + '.'); return; }
            var s = { email: u.email, name: u.name || u.email, picture: u.picture || '', exp: Date.now() + TTL };
            set(s); cb(null, s);
          })
          .catch(function () { cb('Não consegui confirmar a conta Google.'); });
      },
      error_callback: function (e) {
        var t = e && e.type;
        cb(t === 'popup_closed' ? 'Login cancelado.' : t === 'popup_failed_to_open' ? 'O navegador bloqueou o popup do Google.' : 'Falha no login do Google.');
      }
    });
    client.requestAccessToken();
  }

  return { get: get, set: set, clear: clear, require: require, signIn: signIn, signOut: signOut, LOGIN: LOGIN, DOMAIN: DOMAIN };
})();

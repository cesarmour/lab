/* Swarm · login HYPR (Google, restrito a @hypr.mobi). Fluxo por redirecionamento (OAuth 2.0 implícito, id_token):
   o Google volta para APP com o token no fragmento da URL; o app guarda a sessão e manda o id_token ao serviço, que o verifica. */
window.SwarmAuth = (function () {
  var KEY = 'swarm_session';
  var CLIENT_ID = '453955675457-2aoh6aalfthgaopkbtqi5lftmdvrtl56.apps.googleusercontent.com';
  var DOMAIN = 'hypr.mobi';
  var APP = 'https://lab.softwarehaus.workers.dev/hypr-agents/swarm/app/';
  var LOGIN = '/hypr-agents/swarm/login/';

  function get() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.exp > Date.now() && s.email && s.id_token) return s; } catch (e) {}
    return null;
  }
  function set(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }
  function rand() { var a = new Uint8Array(16); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function b64(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(Array.prototype.map.call(atob(s), function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')); }

  /* manda ao Google; `next` é para onde voltar depois (só caminhos de /hypr-agents/) */
  function signIn(next, opts) {
    opts = opts || {};
    var nonce = rand();
    try { sessionStorage.setItem('swarm_nonce', nonce); sessionStorage.setItem('swarm_next', next || APP); } catch (e) {}
    var q = {
      client_id: CLIENT_ID, redirect_uri: APP, response_type: 'id_token token', scope: 'openid email profile',
      hd: DOMAIN, nonce: nonce, state: next || APP, prompt: opts.silent ? 'none' : 'select_account'
    };
    if (opts.hint) q.login_hint = opts.hint;
    location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + Object.keys(q).map(function (k) { return k + '=' + encodeURIComponent(q[k]); }).join('&');
  }

  /* no APP: lê o fragmento devolvido pelo Google. Devolve true se acabou de entrar. */
  function handleRedirect() {
    if (!location.hash || location.hash.indexOf('id_token=') < 0 && location.hash.indexOf('error=') < 0) return false;
    var h = {}; location.hash.slice(1).split('&').forEach(function (p) { var i = p.indexOf('='); h[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1)); });
    history.replaceState(null, '', location.pathname + location.search);
    if (h.error) { location.replace(LOGIN + '?err=' + encodeURIComponent(h.error)); return true; }
    var claims; try { claims = JSON.parse(b64(h.id_token.split('.')[1])); } catch (e) { location.replace(LOGIN + '?err=token'); return true; }
    var nonce = null; try { nonce = sessionStorage.getItem('swarm_nonce'); } catch (e) {}
    var email = String(claims.email || '').toLowerCase();
    var ok = claims.aud === CLIENT_ID && (!nonce || claims.nonce === nonce) && claims.email_verified !== false && (claims.hd === DOMAIN || email.slice(-DOMAIN.length - 1) === '@' + DOMAIN);
    if (!ok) { clear(); location.replace(LOGIN + '?err=domain&who=' + encodeURIComponent(email)); return true; }
    try { sessionStorage.removeItem('swarm_silent'); } catch (e) {}
    set({ email: email, name: claims.name || email, picture: claims.picture || '', id_token: h.id_token, exp: claims.exp * 1000 - 60000 });
    var next = h.state || APP; if (!/^(\/hypr-agents\/|https:\/\/lab\.softwarehaus\.workers\.dev\/hypr-agents\/)/.test(next)) next = APP;
    if (next !== location.href && next !== location.pathname + location.search) location.replace(next);
    return true;
  }

  /* no APP: garante sessão; sem ela vai ao login; vencida tenta renovar em silêncio */
  function require() {
    if (handleRedirect()) return null;
    var s = get();
    if (s) return s;
    var old = null; try { old = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    var here = location.pathname + location.search;
    if (old && old.email && !sessionStorage.getItem('swarm_silent')) { try { sessionStorage.setItem('swarm_silent', '1'); } catch (e) {} signIn(here, { silent: true, hint: old.email }); return null; }
    location.replace(LOGIN + '?next=' + encodeURIComponent(here));
    return null;
  }
  function signOut(to) { clear(); try { sessionStorage.removeItem('swarm_silent'); } catch (e) {} location.href = to || LOGIN; }

  return { get: get, set: set, clear: clear, require: require, signIn: signIn, signOut: signOut, handleRedirect: handleRedirect, LOGIN: LOGIN, APP: APP, DOMAIN: DOMAIN, CLIENT_ID: CLIENT_ID };
})();

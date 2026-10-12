/*
 * Painel online: login, criação de senha pelo link do e-mail e chamadas ao servidor (Supabase).
 * Só liga quando a página publicada traz assets/js/config.js (window.PAINEL_NUVEM).
 * Por padrão a sessão fica só na memória da aba (ao recarregar, entra de novo).
 * Se a pessoa marcar "Manter conectado neste aparelho por 30 dias", só a chave de login
 * vai para o localStorage, com validade de 30 dias contada do login. Nenhum dado de aluna
 * é guardado no navegador. "Sair" apaga a chave.
 */
(function (P) {
  'use strict';

  var CFG = window.PAINEL_NUVEM;
  var configurado = !!(CFG && CFG.url && CFG.chave && window.supabase);
  var sb = null;
  var esc = P.util.esc;

  var ERROS = [
    [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/email not confirmed/i, 'Este e-mail ainda não foi confirmado. Use o link do convite que chegou por e-mail.'],
    [/rate limit|too many|security purposes/i, 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'],
    [/should be different/i, 'A nova senha precisa ser diferente da anterior.'],
    [/password should be at least|weak password/i, 'Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.'],
    [/expired|invalid.*(link|token)|otp/i, 'Este link expirou ou já foi usado. Peça para a Administração voltar a sua senha para a inicial.'],
    [/failed to fetch|network/i, 'Sem conexão com o servidor. Confira a internet e tente de novo.'],
    [/sem acesso|permission|42501/i, 'Seu usuário não tem acesso a isso.']
  ];
  function traduzir(e) {
    var msg = (e && (e.message || e.error_description || e.erro)) || String(e || '');
    for (var i = 0; i < ERROS.length; i++) if (ERROS[i][0].test(msg)) return ERROS[i][1];
    return 'Não deu certo: ' + msg;
  }

  // Lê o que veio no endereço pelo link do e-mail antes da biblioteca limpar. Dois formatos:
  // #token_hash=...&type=invite (link direto para o painel, não depende da lista de endereços do Supabase)
  // #access_token=...&type=invite (link padrão do Supabase, depois de passar pelo /verify)
  function lerLink() {
    var h = location.hash.replace(/^#/, '');
    if (!/token_hash=|access_token=|error_description=|error=/.test(h)) return { tipo: null, erro: null, hash: null };
    var q = {};
    h.split('&').forEach(function (p) { var kv = p.split('='); q[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); });
    return { tipo: q.type || null, erro: q.error_description || q.error || null, hash: q.token_hash || null };
  }

  /* "Manter conectado": a chave de login vai para o localStorage só enquanto valer o prazo. */
  var LEMBRAR = 'painel-lembrar-ate', DIAS_LEMBRAR = 30;
  var memoria = {};
  function ls(acao, k, v) {
    try {
      if (acao === 'get') return window.localStorage.getItem(k);
      if (acao === 'set') window.localStorage.setItem(k, v);
      if (acao === 'del') window.localStorage.removeItem(k);
    } catch (e) { /* navegador sem armazenamento: fica só na memória */ }
    return null;
  }
  function lembrando() { var ate = +ls('get', LEMBRAR); return ate > Date.now(); }
  function chavesLogin() {
    var ks = [];
    try { for (var i = 0; i < window.localStorage.length; i++) { var k = window.localStorage.key(i); if (/^sb-.*-auth-token/.test(k)) ks.push(k); } } catch (e) { /* idem */ }
    return ks;
  }
  function esquecerAparelho() { ls('del', LEMBRAR); chavesLogin().forEach(function (k) { ls('del', k); }); }
  var armazenamento = {
    getItem: function (k) { return lembrando() ? ls('get', k) : (k in memoria ? memoria[k] : null); },
    setItem: function (k, v) { if (lembrando()) ls('set', k, v); else memoria[k] = v; },
    removeItem: function (k) { delete memoria[k]; ls('del', k); }
  };

  function criar() {
    if (!lembrando()) esquecerAparelho(); // prazo vencido ou nunca marcado: não deixa chave para trás
    sb = window.supabase.createClient(CFG.url, CFG.chave, {
      auth: { persistSession: true, storage: armazenamento, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return sb;
  }

  function enderecoPainel() { return location.origin + location.pathname; }

  async function rpc(nome, args) {
    var r = await sb.rpc(nome, args || {});
    if (r.error) throw r.error;
    return r.data;
  }

  async function usuarios(corpo) { return funcao('painel-usuarios', corpo); }

  async function funcao(nome, corpo) {
    var r = await sb.functions.invoke(nome, { body: corpo });
    if (r.error) {
      var detalhe = null;
      try { detalhe = await r.error.context.json(); } catch (e) { /* sem corpo */ }
      throw new Error((detalhe && detalhe.erro) || r.error.message);
    }
    if (r.data && r.data.ok === false) throw new Error(r.data.erro || 'Não deu certo.');
    return r.data;
  }

  /* ---------- tela de entrada ---------- */

  var E = { modo: 'entrar', msg: '', erro: '', ocupado: false, aoEntrar: null, email: '', primeiro: false };

  function caixa(conteudo) {
    return '<div class="entrada-caixa"><p class="entrada-marca">Corpo Feliz</p><h1>Acompanhamento das Alunas</h1>' + conteudo + '</div>';
  }

  function renderEntrada() {
    var el = document.getElementById('entrada');
    var h = '';
    var aviso = (E.erro ? '<p class="entrada-erro" role="alert">' + esc(E.erro) + '</p>' : '') + (E.msg ? '<p class="entrada-ok" role="status">' + esc(E.msg) + '</p>' : '');
    var dis = E.ocupado ? ' disabled' : '';
    if (E.modo === 'carregando') {
      h = caixa('<p class="sub">Conferindo seu acesso…</p>');
    } else if (E.modo === 'entrar') {
      h = caixa('<form id="form-entrar" novalidate>' + aviso +
        '<label class="campo"><span>E-mail</span><input type="email" id="en-email" autocomplete="username" required value="' + esc(E.email) + '"></label>' +
        '<label class="campo"><span>Senha</span><input type="password" id="en-senha" autocomplete="current-password" required></label>' +
        '<label class="check"><input type="checkbox" id="en-lembrar"' + (E.lembrar ? ' checked' : '') + '> Manter conectado neste aparelho por 30 dias</label>' +
        '<button type="submit" class="btn"' + dis + '>' + (E.ocupado ? 'Entrando…' : 'Entrar') + '</button></form>' +
        '<p class="nota-peq">Não marque em computador de outra pessoa ou compartilhado.</p>' +
        '<p class="nota-peq">Primeiro acesso? Entre com a senha inicial que a Administração te passou. Em seguida você cria a sua senha.</p>' +
        '<p class="nota-peq">Esqueceu a senha? Peça para a Administração voltar a sua senha para a inicial.</p>');
    } else if (E.modo === 'esqueci') {
      h = caixa('<form id="form-esqueci" novalidate>' + aviso +
        '<p class="sub">Informe seu e-mail. Se ele tiver acesso ao painel, chega um link para criar uma nova senha.</p>' +
        '<label class="campo"><span>E-mail</span><input type="email" id="es-email" autocomplete="username" required value="' + esc(E.email) + '"></label>' +
        '<button type="submit" class="btn"' + dis + '>Enviar link</button></form>' +
        '<p class="entrada-links"><button type="button" class="link" data-entrada="entrar">Voltar para entrar</button></p>');
    } else if (E.modo === 'senha') {
      h = caixa('<form id="form-senha" novalidate>' + aviso +
        '<h2>Crie sua senha</h2><p class="sub">' + (E.primeiro ? 'Primeiro acesso: troque a senha inicial por uma só sua antes de ver o painel. ' : '') + 'Use pelo menos 8 caracteres. Não use a mesma senha de outros sites.</p>' +
        '<label class="campo"><span>Nova senha</span><input type="password" id="se-1" autocomplete="new-password" minlength="8" required></label>' +
        '<label class="campo"><span>Repita a senha</span><input type="password" id="se-2" autocomplete="new-password" minlength="8" required></label>' +
        '<button type="submit" class="btn"' + dis + '>Salvar senha e entrar</button></form>');
    } else if (E.modo === 'sem-acesso') {
      h = caixa(aviso + '<p>Seu login funcionou, mas este e-mail ainda não tem acesso ao painel ou foi desativado.</p><p class="sub">Peça à administração para conferir em Usuários.</p>' +
        '<button type="button" class="btn btn-sec" data-entrada="sair">Sair</button>');
    }
    el.innerHTML = h;
    var foco = el.querySelector('input:not([value]), input[value=""], input');
    if (foco && !E.ocupado) foco.focus();
  }

  function mostrarEntrada(sim) {
    document.body.classList.toggle('sem-login', sim);
    document.getElementById('entrada').hidden = !sim;
  }

  async function concluirEntrada() {
    E.modo = 'carregando'; renderEntrada();
    try {
      var eu = await rpc('painel_eu');
      if (!eu) { E.modo = 'sem-acesso'; E.erro = ''; renderEntrada(); return; }
      if (eu.trocar_senha) { E.primeiro = true; E.modo = 'senha'; E.erro = ''; renderEntrada(); return; }
      mostrarEntrada(false);
      E.aoEntrar(eu);
    } catch (e) {
      E.modo = 'entrar'; E.erro = traduzir(e); renderEntrada();
    }
  }

  document.addEventListener('submit', async function (ev) {
    var f = ev.target;
    if (!/^form-(entrar|esqueci|senha)$/.test(f.id)) return;
    ev.preventDefault();
    if (E.ocupado) return;
    E.erro = ''; E.msg = '';
    try {
      if (f.id === 'form-entrar') {
        E.email = document.getElementById('en-email').value.trim();
        var senha = document.getElementById('en-senha').value;
        E.lembrar = document.getElementById('en-lembrar').checked;
        if (!E.email || !senha) { E.erro = 'Preencha e-mail e senha.'; renderEntrada(); return; }
        if (E.lembrar) ls('set', LEMBRAR, String(Date.now() + DIAS_LEMBRAR * 86400000));
        else esquecerAparelho();
        E.ocupado = true; renderEntrada();
        var r = await sb.auth.signInWithPassword({ email: E.email, password: senha });
        E.ocupado = false;
        if (r.error) { esquecerAparelho(); E.erro = traduzir(r.error); renderEntrada(); return; }
        await concluirEntrada();
      } else if (f.id === 'form-esqueci') {
        E.email = document.getElementById('es-email').value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(E.email)) { E.erro = 'Confira o e-mail.'; renderEntrada(); return; }
        E.ocupado = true; renderEntrada();
        var r2 = await sb.auth.resetPasswordForEmail(E.email, { redirectTo: enderecoPainel() });
        E.ocupado = false;
        if (r2.error) E.erro = traduzir(r2.error);
        else E.msg = 'Pronto. Se este e-mail tiver acesso, o link chega em alguns minutos. Confira também o spam.';
        renderEntrada();
      } else {
        var s1 = document.getElementById('se-1').value, s2 = document.getElementById('se-2').value;
        if (s1.length < 8) { E.erro = 'A senha precisa ter pelo menos 8 caracteres.'; renderEntrada(); return; }
        if (s1 !== s2) { E.erro = 'As duas senhas não são iguais.'; renderEntrada(); return; }
        E.ocupado = true; renderEntrada();
        var erroTroca = await trocarSenha(s1);
        E.ocupado = false;
        if (erroTroca) { E.erro = erroTroca; renderEntrada(); return; }
        E.primeiro = false;
        await concluirEntrada();
      }
    } catch (e) {
      E.ocupado = false; E.erro = traduzir(e); renderEntrada();
    }
  });

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-entrada]');
    if (!b) return;
    var v = b.dataset.entrada;
    if (v === 'sair') { sair(); return; }
    E.modo = v; E.erro = ''; E.msg = ''; renderEntrada();
  });

  // Troca a senha e avisa o servidor (que confere que não é mais a senha inicial). Devolve o erro em texto, ou ''.
  async function trocarSenha(nova) {
    var r = await sb.auth.updateUser({ password: nova });
    if (r.error) return traduzir(r.error);
    try {
      var ok = await rpc('painel_senha_trocada');
      if (!ok) return 'A nova senha precisa ser diferente da senha inicial.';
    } catch (e) { return traduzir(e); }
    return '';
  }

  async function iniciar(aoEntrar) {
    E.aoEntrar = aoEntrar;
    var link = lerLink();
    mostrarEntrada(true);
    E.modo = 'carregando'; renderEntrada();
    criar();
    var s = await sb.auth.getSession();
    if (link.tipo || link.erro || link.hash) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* segue */ } }
    if (link.hash) {
      var tipo = ['invite', 'recovery', 'signup', 'magiclink', 'email'].indexOf(link.tipo) !== -1 ? link.tipo : 'invite';
      var v = await sb.auth.verifyOtp({ token_hash: link.hash, type: tipo });
      if (v.error) { E.modo = 'entrar'; E.erro = traduzir({ message: 'expired ' + v.error.message }); renderEntrada(); return; }
      E.modo = 'senha'; renderEntrada(); return;
    }
    if (link.erro && !(s.data && s.data.session)) {
      E.modo = 'entrar'; E.erro = traduzir({ message: 'expired ' + link.erro }); renderEntrada(); return;
    }
    if (s.data && s.data.session && (link.tipo === 'invite' || link.tipo === 'recovery' || link.tipo === 'signup')) {
      E.modo = 'senha'; renderEntrada(); return;
    }
    if (s.data && s.data.session) { await concluirEntrada(); return; }
    E.modo = 'entrar'; renderEntrada();
  }

  async function sair() {
    try { await sb.auth.signOut(); } catch (e) { /* sessão já encerrada */ }
    esquecerAparelho();
    location.replace(location.pathname);
  }

  P.nuvem = {
    configurado: configurado,
    iniciar: iniciar,
    sair: sair,
    traduzir: traduzir,
    trocarSenha: trocarSenha,
    mensagens: function (dias) { return rpc('painel_mensagens_ler', { p_dias: dias || 60 }); },
    revisar: function (id, tipo, tema) { return rpc('painel_revisar', { p_id: id, p_tipo: tipo, p_tema: tema }); },
    autorizar: function (id, status, por) { return rpc('painel_autorizar', { p_id: id, p_status: status, p_por: por || '' }); },
    registro: function () { return rpc('painel_registro', { p_limite: 200 }); },
    usuarios: usuarios,
    drive: function (corpo) { return funcao('painel-drive', corpo); }
  };
})(window.Painel);

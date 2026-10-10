/*
 * Painel de acompanhamento das alunas: protótipo navegável.
 * Objetivo: juntar e organizar o que as alunas trazem (dores, objeções, resultados,
 * antes e depois, interação no grupo) e transformar em ideias de conteúdo e de cuidado.
 * O painel não responde ninguém e não guarda telefone ou contato.
 * Estado só em memória: ao recarregar a página tudo volta ao início.
 * Permissões aqui são SIMULADAS (não há login). A versão real valida no servidor.
 */
(function (P) {
  'use strict';

  var U = P.util, C = P.classificador, A = P.analise, PRIV = P.privacidade;
  var esc = U.esc;

  var PAPEIS = {
    leitura: { nome: 'Leitura', editar: false, nome1: false, exportar: false, admin: false },
    edicao: { nome: 'Edição', editar: true, nome1: true, exportar: false, admin: false },
    exportacao: { nome: 'Exportação', editar: false, nome1: false, exportar: true, admin: false },
    admin: { nome: 'Administração', editar: true, nome1: true, exportar: true, admin: true }
  };

  var CANAIS = { whatsapp: 'WhatsApp', telegram: 'Telegram' };
  var AUT = {
    nao_solicitada: 'Não solicitada',
    solicitada: 'Solicitada, aguardando',
    uso_interno: 'Autorizada só para uso interno',
    divulgacao: 'Autorizada para divulgação',
    negada: 'Recusada'
  };
  var NATUREZAS = { conteudo: 'Vira conteúdo', mentalidade: 'Bloqueio de mentalidade', entrega: 'Ajuste na entrega', prova: 'Prova social' };
  var ABAS = [
    { id: 'visao', nome: 'Visão geral' },
    { id: 'resumo', nome: 'Resumo do dia' },
    { id: 'dores', nome: 'Dores e objeções' },
    { id: 'resultados', nome: 'Antes e depois e resultados' },
    { id: 'ideias', nome: 'Ideias de conteúdo' },
    { id: 'ajuda', nome: 'Como ajudar mais' },
    { id: 'mensagens', nome: 'Mensagens e revisão' },
    { id: 'relatorios', nome: 'Relatórios' },
    { id: 'importar', nome: 'Importar' },
    { id: 'config', nome: 'Configurações' }
  ];

  var S = {
    modo: 'demo',
    papel: 'admin',
    aba: 'visao',
    subDores: 'objecoes',
    subRes: 'ideias',
    temas: C.temasPadrao(),
    objecoes: A.objecoesPadrao(),
    resultados: A.resultadosPadrao(),
    equipe: ['Coordenação', 'Equipe 1', 'Equipe 2'],
    dados: { demo: null, import: { alunas: {}, mensagens: [], midias: [] } },
    filtros: { periodo: '30', inicio: '', fim: '', canal: '', tema: '', tipo: '', autorizacao: '' },
    busca: '',
    soNaoRevisadas: false,
    limite: 40,
    gran: 'dia',
    diaResumo: '',
    rel: { tipo: 'pauta', soRevisadas: true, secoes: { numeros: true, temas: true, dores: true, depoimentos: true } },
    impOrigem: 'whatsapp',
    impCanal: 'whatsapp',
    impPrevia: null,
    seqImport: 0,
    auditoria: [],
    editor: null,
    confirmarLimpeza: false
  };

  /* ---------- acesso aos dados ---------- */

  function pode(p) { return PAPEIS[S.papel][p]; }
  function conj() { return S.dados[S.modo]; }
  function alunasAtuais() { return conj().alunas; }
  function msgsAlunas() { return conj().mensagens.filter(function (m) { return !m.equipe; }); }
  function nomeTema(id) { var t = S.temas.find(function (x) { return x.id === id; }); return t ? t.nome : 'Outros assuntos'; }
  function nomeTipo(id) { var t = C.TIPOS.find(function (x) { return x.id === id; }); return t ? t.nome : id; }
  function ehDor(m) { return m.tipo === 'duvida' || m.tipo === 'dificuldade' || m.tipo === 'queixa'; }
  function ehProva(m) { return m.tipo === 'depoimento' || m.tipo === 'evolucao'; }

  function registrar(acao, detalhe) {
    S.auditoria.unshift({ quando: Date.now(), papel: PAPEIS[S.papel].nome, modo: S.modo === 'demo' ? 'Exemplo' : 'Importados', acao: acao, detalhe: detalhe || '' });
  }

  function refFim() {
    var ms = conj().mensagens;
    if (!ms.length) return U.fimDia(Date.now());
    var mx = 0;
    ms.forEach(function (m) { if (m.data > mx) mx = m.data; });
    return U.fimDia(mx);
  }
  function refInicio() {
    var ms = conj().mensagens;
    if (!ms.length) return U.inicioDia(Date.now());
    var mn = Infinity;
    ms.forEach(function (m) { if (m.data < mn) mn = m.data; });
    return U.inicioDia(mn);
  }

  function intervalo() {
    var f = S.filtros;
    if (f.periodo === 'custom' && f.inicio && f.fim) return [U.deChave(f.inicio), U.fimDia(U.deChave(f.fim))];
    var fim = refFim();
    if (f.periodo === 'tudo' || f.periodo === 'custom') return [refInicio(), fim];
    var n = +f.periodo;
    return [U.somarDias(U.inicioDia(fim), -(n - 1)), fim];
  }
  function intervaloAnterior(iv) {
    var dur = iv[1] - iv[0] + 1;
    return [iv[0] - dur, iv[0] - 1];
  }

  function passaFiltros(m) {
    var f = S.filtros;
    if (f.canal && m.canal !== f.canal) return false;
    if (f.tema && m.tema !== f.tema) return false;
    if (f.tipo && m.tipo !== f.tipo) return false;
    if (f.autorizacao && (!m.aut || m.aut.status !== f.autorizacao)) return false;
    return true;
  }

  function filtrar(lista, iv) {
    return lista.filter(function (m) {
      if (iv && (m.data < iv[0] || m.data > iv[1])) return false;
      return passaFiltros(m);
    });
  }

  function textoSeguro(m) {
    if (m._seguro == null) m._seguro = PRIV.mascararTexto(m.texto, alunasAtuais());
    return m._seguro;
  }
  function invalidarMascaras() { conj().mensagens.forEach(function (m) { m._seguro = null; }); }

  // Identificação de acordo com a permissão (o painel não guarda contato).
  function rotuloAluna(id) {
    var a = alunasAtuais()[id];
    if (!a) return 'Sem identificação';
    if (pode('nome1')) return PRIV.primeiroNome(a) + ' · ' + id;
    return 'Aluna ' + id;
  }

  function prontoDivulgacao(m) { return m.revisado && m.aut && m.aut.status === 'divulgacao' && !!m.aut.confirmadoPor; }

  // Análise completa do período (pauta, objeções, resultados, interação, sugestões).
  function analisar(lista, anterior, iv) {
    return P.pauta.construir({
      lista: lista, anterior: anterior, todas: conj().mensagens, iv: iv,
      temas: S.temas, objecoes: S.objecoes, resultados: S.resultados,
      textoSeguro: textoSeguro, nomeTema: nomeTema, pronto: prontoDivulgacao,
      sinais: A.sinaisAlunas(msgsAlunas(), S.temas, iv[1])
    });
  }
  function analisePeriodo() {
    var iv = intervalo();
    return { iv: iv, lista: filtrar(msgsAlunas(), iv), r: analisar(filtrar(msgsAlunas(), iv), filtrar(msgsAlunas(), intervaloAnterior(iv)), iv) };
  }

  /* ---------- pequenos componentes ---------- */

  function opcoes(mapa, atual, vazio) {
    var h = vazio != null ? '<option value="">' + esc(vazio) + '</option>' : '';
    Object.keys(mapa).forEach(function (k) {
      h += '<option value="' + esc(k) + '"' + (k === atual ? ' selected' : '') + '>' + esc(mapa[k]) + '</option>';
    });
    return h;
  }
  function mapaTemas() { var r = {}; S.temas.forEach(function (t) { r[t.id] = t.nome; }); return r; }
  function mapaTipos() { var r = {}; C.TIPOS.forEach(function (t) { r[t.id] = t.nome; }); return r; }
  function mapaEquipe() { var r = {}; S.equipe.forEach(function (n) { r[n] = n; }); return r; }

  function canalTag(c) { return '<span class="canal canal-' + c + '"><i aria-hidden="true"></i>' + CANAIS[c] + '</span>'; }
  function citar(t) { return '“' + esc(t) + '”'; }

  function classeChip(m) {
    if (m.revisado) return '<span class="chip chip-ok" title="Classificação conferida por uma pessoa">Revisada</span>';
    var conf = m.auto ? (m.auto.confTipo === 'baixa' || m.auto.confTema === 'baixa' ? 'baixa' : m.auto.confTipo === 'alta' && m.auto.confTema === 'alta' ? 'alta' : 'média') : 'baixa';
    return '<span class="chip chip-auto" title="Sugestão automática por palavras-chave. Precisa de revisão.">Sugestão automática · confiança ' + conf + '</span>';
  }

  function autChip(aut) {
    if (!aut) return '';
    var cls = aut.status === 'divulgacao' ? 'aut-ok' : aut.status === 'uso_interno' ? 'aut-int' : aut.status === 'negada' ? 'aut-no' : 'aut-wait';
    var icone = aut.status === 'divulgacao' ? '✓' : aut.status === 'negada' ? '✕' : aut.status === 'uso_interno' ? '◐' : '…';
    return '<span class="aut ' + cls + '"><span aria-hidden="true">' + icone + '</span> ' + esc(AUT[aut.status]) +
      (aut.confirmadoPor ? ' · confirmado por ' + esc(aut.confirmadoPor) : '') + '</span>';
  }

  function vazio(titulo, texto, botao) {
    return '<div class="vazio"><h3>' + esc(titulo) + '</h3><p>' + texto + '</p>' + (botao || '') + '</div>';
  }

  function semPermissao(acao) {
    return '<p class="nota nota-trava"><span aria-hidden="true">🔒</span> Seu papel atual (' + esc(PAPEIS[S.papel].nome) + ') não permite ' + acao + '. Troque em "Ver como" para testar outro acesso.</p>';
  }

  function subnav(chave, itens) {
    return '<div class="subnav" role="tablist">' + itens.map(function (s) {
      return '<button type="button" role="tab" data-acao="sub" data-k="' + chave + '" data-v="' + s[0] + '" aria-selected="' + (S[chave] === s[0]) + '">' + esc(s[1]) + (s[2] != null ? ' <span class="sub">' + s[2] + '</span>' : '') + '</button>';
    }).join('') + '</div>';
  }

  function avisar(msg) {
    var el = document.getElementById('aviso');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(avisar._t);
    avisar._t = setTimeout(function () { el.hidden = true; }, 3200);
  }

  /* ---------- moldura ---------- */

  function renderMoldura() {
    document.querySelectorAll('[data-acao="modo"]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.v === S.modo));
    });
    document.getElementById('papel').value = S.papel;

    var faixa = document.getElementById('faixa');
    if (S.modo === 'demo') {
      faixa.className = 'faixa faixa-demo';
      faixa.innerHTML = '<strong>Dados fictícios.</strong> Pessoas, mensagens e ilustrações desta tela são exemplos para demonstração. Nenhuma conversa real está conectada.';
    } else {
      faixa.className = 'faixa faixa-import';
      faixa.innerHTML = '<strong>Dados importados manualmente.</strong> Ficam só nesta aba do navegador e somem ao recarregar. Nenhuma integração automática está ativa.';
    }
    faixa.innerHTML += ' <span class="faixa-sim">Login e permissões são simulados neste protótipo.</span>';

    document.getElementById('nav').innerHTML = ABAS.map(function (a) {
      return '<button type="button" class="nav-item" data-acao="aba" data-v="' + a.id + '"' + (a.id === S.aba ? ' aria-current="page"' : '') + '>' + esc(a.nome) + '</button>';
    }).join('');
  }

  function filtrosVisiveis() { return ['visao', 'dores', 'resultados', 'ideias', 'ajuda', 'mensagens', 'relatorios'].indexOf(S.aba) !== -1; }

  function renderFiltros() {
    var el = document.getElementById('filtros');
    if (!filtrosVisiveis() || !conj().mensagens.length) { el.innerHTML = ''; return; }
    var f = S.filtros;
    var ativos = ['canal', 'tema', 'tipo', 'autorizacao'].filter(function (k) { return f[k]; }).length;
    var iv = intervalo();
    var aberto = el.querySelector('details') ? el.querySelector('details').open : window.innerWidth >= 900;
    el.innerHTML =
      '<details class="filtros"' + (aberto ? ' open' : '') + '>' +
      '<summary><span>Filtros</span><span class="filtros-resumo">' + U.fmtDataAno(iv[0]) + ' a ' + U.fmtDataAno(iv[1]) + (ativos ? ' · ' + ativos + ' filtro' + (ativos > 1 ? 's' : '') + ' ativo' + (ativos > 1 ? 's' : '') : '') + '</span></summary>' +
      '<div class="filtros-grade">' +
      campoSelect('f-periodo', 'Período', 'periodo', { '7': 'Últimos 7 dias', '14': 'Últimos 14 dias', '30': 'Últimos 30 dias', '60': 'Últimos 60 dias', 'tudo': 'Tudo', 'custom': 'Escolher datas' }, f.periodo) +
      (f.periodo === 'custom'
        ? '<label class="campo"><span>De</span><input type="date" id="f-inicio" data-mudar="filtro" data-k="inicio" value="' + esc(f.inicio) + '"></label>' +
          '<label class="campo"><span>Até</span><input type="date" id="f-fim" data-mudar="filtro" data-k="fim" value="' + esc(f.fim) + '"></label>'
        : '') +
      campoSelect('f-canal', 'Canal', 'canal', CANAIS, f.canal, 'Todos') +
      campoSelect('f-tema', 'Assunto', 'tema', mapaTemas(), f.tema, 'Todos') +
      campoSelect('f-tipo', 'Tipo de conteúdo', 'tipo', mapaTipos(), f.tipo, 'Todos') +
      campoSelect('f-aut', 'Autorização', 'autorizacao', AUT, f.autorizacao, 'Qualquer') +
      '<div class="campo campo-botao"><button type="button" class="btn btn-sec" data-acao="limpar-filtros">Limpar filtros</button></div>' +
      '</div></details>';
  }

  function campoSelect(id, rotulo, k, mapa, atual, vazioTxt) {
    return '<label class="campo"><span>' + esc(rotulo) + '</span><select id="' + id + '" data-mudar="filtro" data-k="' + k + '">' + opcoes(mapa, atual, vazioTxt) + '</select></label>';
  }

  function render() {
    renderMoldura();
    renderFiltros();
    var el = document.getElementById('aba');
    var semDados = !conj().mensagens.length && ['importar', 'config'].indexOf(S.aba) === -1 && !(S.aba === 'resultados' && S.subRes === 'fotos' && S.modo === 'import');
    if (semDados) {
      el.innerHTML = vazio('Nenhum dado importado ainda',
        'Para ver seus dados aqui, importe um arquivo exportado do WhatsApp, do Telegram ou uma planilha. Os dados ficam só nesta aba e não se misturam com o exemplo fictício.',
        '<button type="button" class="btn" data-acao="aba" data-v="importar">Ir para Importar</button>');
      return;
    }
    var fn = { visao: abaVisao, resumo: abaResumo, dores: abaDores, resultados: abaResultados, ideias: abaIdeias, ajuda: abaAjuda, mensagens: abaMensagens, relatorios: abaRelatorios, importar: abaImportar, config: abaConfig }[S.aba];
    el.innerHTML = fn();
    if (S.aba === 'visao') desenharGrafico();
    if (S.aba === 'mensagens') renderListaMensagens();
  }

  /* ---------- Visão geral ---------- */

  function abaVisao() {
    var iv = intervalo(), ant = intervaloAnterior(iv);
    var atual = filtrar(msgsAlunas(), iv), anterior = filtrar(msgsAlunas(), ant);
    var r = analisar(atual, anterior, iv);
    var porTipoA = U.contarPor(atual, 'tipo'), porTipoB = U.contarPor(anterior, 'tipo');
    var comObj = function (l) { return l.filter(function (m) { return !ehProva(m) && A.detectar(m.texto, S.objecoes).length; }).length; };
    var naoRev = atual.filter(function (m) { return !m.revisado; }).length;

    function kpi(rot, a, b) {
      var v = U.variacao(a, b);
      return '<div class="kpi"><span class="kpi-rot">' + rot + '</span><span class="kpi-num">' + U.fmtNum(a) + '</span>' +
        '<span class="kpi-var var-' + v.dir + '">' + (v.dir === 'sobe' ? '▲ ' : v.dir === 'desce' ? '▼ ' : '') + v.txt + ' <span class="kpi-ref">vs. período anterior</span></span></div>';
    }

    var h = '<div class="cabeca-aba"><h1>Visão geral</h1><p class="sub">O que as alunas trouxeram no período. Mensagens da equipe não entram nas contagens.</p></div>';
    if (naoRev) {
      h += '<p class="nota nota-revisao"><strong>' + naoRev + ' de ' + atual.length + '</strong> mensagens do período ainda têm só a classificação automática. ' +
        '<button type="button" class="link" data-acao="ir-revisao">Revisar agora</button></p>';
    }
    h += '<section class="kpis" aria-label="Números do período">' +
      kpi('Mensagens das alunas', atual.length, anterior.length) +
      kpi('Dúvidas', porTipoA.duvida || 0, porTipoB.duvida || 0) +
      kpi('Queixas e dificuldades', (porTipoA.queixa || 0) + (porTipoA.dificuldade || 0), (porTipoB.queixa || 0) + (porTipoB.dificuldade || 0)) +
      kpi('Mensagens com objeção', comObj(atual), comObj(anterior)) +
      kpi('Depoimentos positivos', porTipoA.depoimento || 0, porTipoB.depoimento || 0) +
      kpi('Relatos de evolução', porTipoA.evolucao || 0, porTipoB.evolucao || 0) +
      '</section>';

    h += '<section class="painel-card"><div class="card-topo"><h2>Mensagens ao longo do tempo</h2>' +
      '<div class="seg seg-peq" role="group" aria-label="Agrupar por">' +
      '<button type="button" data-acao="gran" data-v="dia" aria-pressed="' + (S.gran === 'dia') + '">Por dia</button>' +
      '<button type="button" data-acao="gran" data-v="semana" aria-pressed="' + (S.gran === 'semana') + '">Por semana</button></div></div>' +
      '<div id="grafico" class="grafico" role="img" aria-label="Gráfico de linhas com mensagens por canal ao longo do período"></div></section>';

    // Assuntos
    var temasA = U.contarPor(atual, 'tema'), temasB = U.contarPor(anterior, 'tema');
    var duvPorTema = U.contarPor(atual.filter(function (m) { return m.tipo === 'duvida'; }), 'tema');
    var ordem = Object.keys(temasA).sort(function (a, b) { return temasA[b] - temasA[a]; });
    var maxT = ordem.length ? temasA[ordem[0]] : 1;
    h += '<div class="duas">';
    h += '<section class="painel-card"><h2>Assuntos recorrentes</h2><p class="sub">Toque em um assunto para filtrar o painel.</p><ul class="barras">' +
      ordem.map(function (t) {
        var v = U.variacao(temasA[t], temasB[t] || 0);
        return '<li><button type="button" class="barra-linha" data-acao="filtrar-tema" data-v="' + esc(t) + '">' +
          '<span class="barra-rot">' + esc(nomeTema(t)) + '</span>' +
          '<span class="barra-trilho"><span class="barra" style="width:' + Math.max(2, temasA[t] / maxT * 100) + '%"></span></span>' +
          '<span class="barra-num">' + temasA[t] + '</span>' +
          '<span class="barra-det">' + (duvPorTema[t] || 0) + ' dúvidas · <span class="var-' + v.dir + '">' + v.txt + '</span></span>' +
          '</button></li>';
      }).join('') + '</ul></section>';

    // Objeções + canal
    var porCanal = U.contarPor(atual, 'canal');
    var tot = atual.length || 1;
    var wa = porCanal.whatsapp || 0, tg = porCanal.telegram || 0;
    var maxO = r.objecoes.length ? r.objecoes[0].n : 1;
    h += '<div class="pilha"><section class="painel-card"><div class="card-topo"><h2>Objeções mais citadas</h2><button type="button" class="link" data-acao="aba" data-v="dores">Ver todas</button></div>' +
      (r.objecoes.length ? '<ul class="barras barras-simples">' + r.objecoes.slice(0, 6).map(function (o) {
        return '<li><div class="barra-linha estatica"><span class="barra-rot">"' + esc(o.obj.nome) + '"</span>' +
          '<span class="barra-trilho"><span class="barra barra-tipo" style="width:' + Math.max(2, o.n / maxO * 100) + '%"></span></span>' +
          '<span class="barra-num">' + o.n + '</span></div></li>';
      }).join('') + '</ul>' : '<p class="sub">Nenhuma objeção encontrada no período.</p>') + '</section>' +
      '<section class="painel-card"><h2>Por canal</h2>' +
      '<div class="divisao" aria-hidden="true"><span class="div-wa" style="width:' + (wa / tot * 100) + '%"></span><span class="div-tg" style="width:' + (tg / tot * 100) + '%"></span></div>' +
      '<dl class="legenda-canais"><div><dt>' + canalTag('whatsapp') + '</dt><dd>' + wa + ' <span class="sub">(' + Math.round(wa / tot * 100) + '%)</span></dd></div>' +
      '<div><dt>' + canalTag('telegram') + '</dt><dd>' + tg + ' <span class="sub">(' + Math.round(tg / tot * 100) + '%)</span></dd></div></dl></section></div>';
    h += '</div>';

    // Ideias + interação + cuidado
    h += '<div class="duas"><section class="painel-card"><div class="card-topo"><h2>Ideias de conteúdo a partir das dúvidas</h2><button type="button" class="link" data-acao="aba" data-v="ideias">Ver pauta completa</button></div>' + blocoIdeias(atual, 3) + '</section>';
    h += '<section class="painel-card"><div class="card-topo"><h2>O que mais gerou conversa no grupo</h2></div>' + blocoInteracao(r.interacao, 3) + '</section></div>';
    var sinais = A.sinaisAlunas(msgsAlunas(), S.temas, iv[1]);
    h += '<section class="painel-card"><div class="card-topo"><h2>Alunas que pedem um olhar mais próximo</h2><button type="button" class="link" data-acao="aba" data-v="ajuda">Como ajudar mais</button></div>' +
      (sinais.length ? '<p>' + sinais.filter(function (s) { return s.tipo === 'dificuldade'; }).length + ' com dificuldade repetida na última semana e ' + sinais.filter(function (s) { return s.tipo === 'sumiu'; }).length + ' que pararam de escrever.</p>' : '<p class="sub">Nenhum sinal no momento.</p>') + '</section>';
    return h;
  }

  function blocoIdeias(lista, n) {
    var duv = U.contarPor(lista.filter(function (m) { return m.tipo === 'duvida' || m.tipo === 'dificuldade'; }), 'tema');
    var top = Object.keys(duv).filter(function (t) { var tm = S.temas.find(function (x) { return x.id === t; }); return tm && tm.ideia && tm.natureza !== 'entrega'; })
      .sort(function (a, b) { return duv[b] - duv[a]; }).slice(0, n);
    if (!top.length) return '<p class="sub">Ainda não há dúvidas suficientes no período.</p>';
    return '<ol class="ideias">' + top.map(function (t) {
      var tm = S.temas.find(function (x) { return x.id === t; });
      return '<li><span class="ideia-tema">' + esc(tm.nome) + ' <span class="sub">· ' + duv[t] + ' dúvidas e dificuldades</span></span><span>' + esc(tm.ideia) + '</span></li>';
    }).join('') + '</ol><p class="nota-peq">Sugestões geradas por regras a partir dos assuntos mais frequentes. Revise antes de virar post.</p>';
  }

  function blocoInteracao(inter, n) {
    if (!inter.posts.length) return '<p class="sub">Sem mensagens da equipe no Telegram neste período. Ao importar o grupo, marque quem é da equipe para ver o que gera mais resposta.</p>';
    return '<p class="sub">Média: ' + inter.media.toFixed(1).replace('.', ',') + ' respostas das alunas por mensagem sua (até 3 h depois).</p><ol class="ideias">' + inter.posts.slice(0, n).map(function (x) {
      return '<li><span>' + citar(x.texto) + '</span><span class="sub">' + x.media.toFixed(1).replace('.', ',') + ' respostas em média' + (x.vezes > 1 ? ' · enviada ' + x.vezes + 'x' : '') + '</span></li>';
    }).join('') + '</ol>';
  }

  function desenharGrafico() {
    var el = document.getElementById('grafico');
    if (!el) return;
    var iv = intervalo();
    var lista = filtrar(msgsAlunas(), iv);
    var chaves = [], idx = {};
    var passoFn = S.gran === 'semana' ? U.inicioSemana : U.inicioDia;
    for (var t = passoFn(iv[0]); t <= iv[1]; t = U.somarDias(t, S.gran === 'semana' ? 7 : 1)) {
      idx[U.chaveDia(t)] = chaves.length;
      chaves.push(t);
    }
    var canais = S.filtros.canal ? [S.filtros.canal] : ['whatsapp', 'telegram'];
    var series = canais.map(function (c) { return { id: c, nome: CANAIS[c], cor: 'var(--' + (c === 'whatsapp' ? 'wa' : 'tg') + ')', valores: chaves.map(function () { return 0; }) }; });
    lista.forEach(function (m) {
      var i = idx[U.chaveDia(passoFn(m.data))];
      var s = series.find(function (x) { return x.id === m.canal; });
      if (i != null && s) s.valores[i]++;
    });
    var rotulos = chaves.map(function (t) { return S.gran === 'semana' ? 'Semana de ' + U.fmtData(t) : U.fmtData(t); });
    P.grafico.linhas(el, chaves.map(function (t) { return U.fmtData(t); }), rotulos, series);
  }

  /* ---------- Resumo do dia ---------- */

  function abaResumo() {
    var fimRef = refFim();
    var dia = S.diaResumo ? U.deChave(S.diaResumo) : U.inicioDia(fimRef);
    var r = calcularResumo(dia);
    var h = '<div class="cabeca-aba"><h1>Resumo do dia</h1><p class="sub">Gerado por regras a partir das mensagens do dia, comparando com o dia anterior e com a média dos 7 dias anteriores. Respeita os filtros de canal e assunto.</p></div>';
    h += '<div class="linha-controles"><label class="campo"><span>Dia</span><input type="date" id="dia-resumo" data-mudar="dia-resumo" value="' + U.chaveDia(dia) + '" min="' + U.chaveDia(refInicio()) + '" max="' + U.chaveDia(fimRef) + '"></label>' +
      '<button type="button" class="btn btn-sec" data-acao="resumo-copiar">Copiar resumo (sem dados pessoais)</button></div>';

    h += '<section class="kpis kpis-4">' +
      '<div class="kpi"><span class="kpi-rot">Mensagens no dia</span><span class="kpi-num">' + r.total + '</span><span class="kpi-var">ontem: ' + r.ontem + ' · média 7 dias: ' + r.media7.toFixed(1).replace('.', ',') + '</span></div>' +
      '<div class="kpi"><span class="kpi-rot">Dúvidas e dificuldades</span><span class="kpi-num">' + r.dores + '</span><span class="kpi-var">' + r.queixas + ' queixa(s)</span></div>' +
      '<div class="kpi"><span class="kpi-rot">Mensagens com objeção</span><span class="kpi-num">' + r.objecoes + '</span><span class="kpi-var">' + (r.objTop ? 'mais citada: "' + esc(r.objTop) + '"' : 'nenhuma') + '</span></div>' +
      '<div class="kpi"><span class="kpi-rot">Depoimentos e evolução</span><span class="kpi-num">' + (r.depo + r.evol) + '</span><span class="kpi-var">' + r.autorizados + ' já autorizados para divulgação</span></div>' +
      '</section>';

    h += '<div class="duas"><section class="painel-card"><h2>Destaques</h2><ul class="destaques">' + r.destaques.map(function (d) { return '<li>' + d + '</li>'; }).join('') + '</ul></section>';
    h += '<section class="painel-card"><h2>Pede atenção</h2>' + (r.atencao.length ? '<ul class="destaques">' + r.atencao.map(function (d) { return '<li>' + d + '</li>'; }).join('') + '</ul>' : '<p class="sub">Nada fora do normal neste dia.</p>') + '</section></div>';
    h += blocoSinais(U.fimDia(dia), 6);
    return h;
  }

  // Alunas que pedem um olhar mais próximo (uso interno; nunca vai para relatórios).
  function blocoSinais(fim, limite) {
    var sinais = A.sinaisAlunas(msgsAlunas(), S.temas, fim);
    var h = '<section class="painel-card"><div class="card-topo"><h2>Alunas que pedem um olhar mais próximo</h2><span class="chip chip-auto">Sinal automático, confirme antes de agir</span></div>' +
      '<p class="sub">Quem trouxe várias dificuldades na última semana ou parou de escrever. Uso interno: não entra em relatórios nem no resumo copiado.</p>';
    if (!sinais.length) return h + '<p class="sub">Nenhum sinal neste momento.</p></section>';
    return h + '<ul class="sinais">' + sinais.slice(0, limite).map(function (x) {
      return '<li class="sinal-' + x.tipo + '"><span class="sinal-tag">' + (x.tipo === 'dificuldade' ? 'Dificuldade repetida' : 'Parou de escrever') + '</span>' +
        '<span class="item-quem">' + esc(rotuloAluna(x.alunaId)) + '</span><span class="sub">' + esc(x.motivo) + '</span>' +
        (x.ultima ? '<span class="lc-texto">Última mensagem (' + U.fmtData(x.ultima.data) + '): ' + esc(textoSeguro(x.ultima)) + '</span>' : '') + '</li>';
    }).join('') + '</ul>' + (sinais.length > limite ? '<p class="sub">+' + (sinais.length - limite) + ' outras. <button type="button" class="link" data-acao="aba" data-v="ajuda">Ver todas</button></p>' : '') + '</section>';
  }

  function calcularResumo(dia) {
    var todas = msgsAlunas().filter(passaFiltros);
    function doDia(d) { var a = U.inicioDia(d), b = U.fimDia(d); return todas.filter(function (m) { return m.data >= a && m.data <= b; }); }
    var hoje = doDia(dia), ontem = doDia(U.somarDias(dia, -1));
    var semana = todas.filter(function (m) { return m.data >= U.somarDias(dia, -7) && m.data < dia; });
    var media7 = semana.length / 7;
    var temasHoje = U.contarPor(hoje, 'tema'), temasSem = U.contarPor(semana, 'tema');
    var top = Object.keys(temasHoje).sort(function (a, b) { return temasHoje[b] - temasHoje[a]; }).slice(0, 3);
    var subiram = Object.keys(temasHoje).filter(function (t) { return temasHoje[t] >= 3 && temasHoje[t] >= 2 * ((temasSem[t] || 0) / 7) + 1; })
      .sort(function (a, b) { return temasHoje[b] - temasHoje[a]; });
    var porCanal = U.contarPor(hoje, 'canal');
    var depo = hoje.filter(function (m) { return m.tipo === 'depoimento'; }).length;
    var evol = hoje.filter(function (m) { return m.tipo === 'evolucao'; }).length;
    var autorizados = hoje.filter(function (m) { return m.aut && m.aut.status === 'divulgacao'; }).length;
    var queixas = hoje.filter(function (m) { return m.tipo === 'queixa'; });
    var objContagem = {};
    var comObj = hoje.filter(function (m) {
      if (ehProva(m)) return false;
      var ids = A.detectar(m.texto, S.objecoes);
      ids.forEach(function (id) { objContagem[id] = (objContagem[id] || 0) + 1; });
      return ids.length > 0;
    });
    var objTopId = Object.keys(objContagem).sort(function (a, b) { return objContagem[b] - objContagem[a]; })[0];
    var objTop = objTopId ? S.objecoes.find(function (o) { return o.id === objTopId; }) : null;
    var v = U.variacao(hoje.length, ontem.length);

    var destaques = [];
    destaques.push('<strong>' + hoje.length + ' mensagens</strong> (WhatsApp ' + (porCanal.whatsapp || 0) + ', Telegram ' + (porCanal.telegram || 0) + '). Em relação a ontem: ' + v.txt + '.');
    if (top.length) destaques.push('Assuntos que mais apareceram: ' + top.map(function (t) { return '<strong>' + esc(nomeTema(t)) + '</strong> (' + temasHoje[t] + ')'; }).join(', ') + '.');
    subiram.forEach(function (t) {
      destaques.push('<strong>' + esc(nomeTema(t)) + '</strong> subiu: ' + temasHoje[t] + ' hoje contra média de ' + ((temasSem[t] || 0) / 7).toFixed(1).replace('.', ',') + ' por dia na semana anterior.');
    });
    if (objTop) destaques.push('Objeção mais citada: <strong>"' + esc(objTop.nome) + '"</strong> (' + objContagem[objTopId] + 'x). Ângulo: ' + esc(objTop.quebra));
    if (depo || evol) destaques.push(depo + ' depoimento(s) positivo(s) e ' + evol + ' relato(s) de evolução. Confira a autorização antes de qualquer uso externo.');

    var atencao = [];
    if (queixas.length) {
      var qt = U.contarPor(queixas, 'tema');
      var principal = Object.keys(qt).sort(function (a, b) { return qt[b] - qt[a]; })[0];
      atencao.push('<strong>' + queixas.length + '</strong> queixa(s) no dia, principalmente sobre ' + esc(nomeTema(principal)) + '.');
    }
    var semAut = hoje.filter(function (m) { return ehProva(m) && (!m.aut || m.aut.status === 'nao_solicitada'); }).length;
    if (semAut) atencao.push(semAut + ' relato(s) ou depoimento(s) sem pedido de autorização. Bom momento para pedir.');
    var naoRev = hoje.filter(function (m) { return !m.revisado; }).length;
    if (naoRev) atencao.push(naoRev + ' classificação(ões) automática(s) ainda sem revisão.');

    return {
      dia: dia, total: hoje.length, ontem: ontem.length, media7: media7,
      dores: hoje.filter(function (m) { return m.tipo === 'duvida' || m.tipo === 'dificuldade'; }).length, queixas: queixas.length,
      objecoes: comObj.length, objTop: objTop ? objTop.nome : '',
      depo: depo, evol: evol, autorizados: autorizados,
      destaques: destaques, atencao: atencao
    };
  }

  function textoPlano(html) { var d = document.createElement('div'); d.innerHTML = html; return d.textContent; }

  /* ---------- Dores e objeções ---------- */

  function abaDores() {
    var a = analisePeriodo();
    var dores = a.lista.filter(ehDor);
    var h = '<div class="cabeca-aba"><h1>Dores e objeções</h1><p class="sub">O que trava as alunas, nas palavras delas. As objeções são crenças que aparecem nas mensagens e podem virar post de "mito x verdade" ou entrar no acolhimento do grupo.</p></div>';
    h += subnav('subDores', [['objecoes', 'Objeções', a.r.objecoes.length], ['assuntos', 'Dores por assunto', dores.length]]);

    if (S.subDores === 'objecoes') {
      if (!a.r.objecoes.length) return h + vazio('Nenhuma objeção no período', 'Mude o período ou edite as objeções em Configurações.');
      return h + '<div class="grupos">' + a.r.objecoes.map(function (o) {
        var v = U.variacao(o.n, o.antes);
        return '<section class="painel-card grupo"><div class="card-topo"><h2>"' + esc(o.obj.nome) + '"</h2><span class="grupo-num">' + o.n + '</span></div>' +
          '<p class="sub">' + v.txt + ' vs. período anterior' + (o.dia ? ' · aparece mais ' + o.dia.aos + ' (' + o.dia.pct + '%)' : '') + '</p>' +
          '<ul class="citacoes">' + o.exemplos.map(function (e) { return '<li><q>' + esc(e.texto) + '</q><span class="sub">' + e.n + ' vez(es)</span></li>'; }).join('') + '</ul>' +
          '<div class="quebra"><span class="quebra-rot">Como quebrar (seu método)</span><p>' + esc(o.obj.quebra) + '</p></div>' +
          '<p class="sub">Prova social: ' + (o.prontas.length ? o.prontas.length + ' relato(s) autorizado(s), como ' + citar(textoSeguro(o.prontas[0])) : 'nenhum autorizado') + (o.aguardando ? ' · ' + o.aguardando + ' aguardando autorização' : '') + '</p>' +
          '</section>';
      }).join('') + '</div>';
    }

    if (!dores.length) return h + vazio('Nada neste período', 'Mude o período ou os filtros para ver mais.');
    var porTema = {};
    dores.forEach(function (m) { (porTema[m.tema] = porTema[m.tema] || []).push(m); });
    var ordem = Object.keys(porTema).sort(function (a2, b) { return porTema[b].length - porTema[a2].length; });
    return h + '<div class="grupos">' + ordem.map(function (t) {
      var ms = porTema[t];
      var tm = S.temas.find(function (x) { return x.id === t; }) || {};
      var c = U.contarPor(ms, 'tipo');
      var gs = P.pauta.agrupar(ms, textoSeguro).slice(0, 4);
      return '<section class="painel-card grupo"><div class="card-topo"><h2>' + esc(nomeTema(t)) + '</h2><span class="grupo-num">' + ms.length + '</span></div>' +
        '<p class="sub">' + (c.duvida || 0) + ' dúvidas · ' + (c.dificuldade || 0) + ' dificuldades · ' + (c.queixa || 0) + ' queixas · <span class="chip">' + esc(NATUREZAS[tm.natureza] || 'Vira conteúdo') + '</span></p>' +
        '<ul class="citacoes">' + gs.map(function (g) { return '<li><q>' + esc(g.principal) + '</q><span class="sub">' + g.itens.length + ' vez(es)</span></li>'; }).join('') + '</ul></section>';
    }).join('') + '</div>';
  }

  /* ---------- Antes e depois e resultados ---------- */

  function abaResultados() {
    var a = analisePeriodo();
    var provas = a.lista.filter(ehProva);
    var h = '<div class="cabeca-aba"><h1>Antes e depois e resultados</h1><p class="sub">Relatos de evolução, depoimentos e fotos, com controle de autorização. Nada é público por padrão.</p></div>';
    h += subnav('subRes', [['ideias', 'Ideias de antes e depois'], ['relatos', 'Relatos e depoimentos', provas.length], ['fotos', 'Fotos', conj().midias.length]]);
    if (S.subRes === 'fotos') return h + subFotos();
    if (S.subRes === 'relatos') {
      if (!provas.length) return h + vazio('Nada neste período', 'Mude o período ou os filtros para ver mais.');
      if (!pode('editar')) h += semPermissao('registrar autorizações');
      return h + '<div class="itens">' + provas.sort(function (x, y) { return y.data - x.data; }).slice(0, S.limite).map(function (m) {
        return '<article class="item item-depo"><div class="item-topo">' + canalTag(m.canal) + '<span class="chip">' + esc(nomeTipo(m.tipo)) + '</span><span class="item-quem">' + esc(rotuloAluna(m.alunaId)) + '</span><time>' + U.fmtDataHora(m.data) + '</time></div>' +
          '<blockquote class="item-texto depo">' + esc(textoSeguro(m)) + '</blockquote>' +
          '<div class="item-meta">' + A.detectar(m.texto, S.resultados).map(function (id) { var rr = S.resultados.find(function (x) { return x.id === id; }); return '<span class="chip">' + esc(rr.nome) + '</span>'; }).join('') +
          classeChip(m) + autChip(m.aut) + (prontoDivulgacao(m) ? '<span class="chip chip-pronto">Pode ir para divulgação</span>' : '') + '</div>' +
          formAut('msg', m) + '</article>';
      }).join('') + '</div>' + (provas.length > S.limite ? '<button type="button" class="btn btn-sec mais" data-acao="mais">Mostrar mais</button>' : '');
    }

    // Ideias de antes e depois
    var res = a.r.resultados;
    var cand = A.candidatasAntesDepois(msgsAlunas(), conj().midias, a.iv[1]);
    h += '<p class="nota">Resultados vão além da foto do corpo. Cada tipo de resultado relatado pelas alunas sugere um formato de antes e depois, alinhado à sua mensagem de constância. Use só material com autorização para divulgação.</p>';
    h += '<div class="grupos">' + res.map(function (r) {
      return '<section class="painel-card grupo"><div class="card-topo"><h2>' + esc(r.res.nome) + '</h2><span class="grupo-num">' + r.n + '</span></div>' +
        '<p class="sub">' + r.prontas.length + ' autorizado(s) para divulgação · ' + r.aguardando + ' sem autorização</p>' +
        '<div class="quebra"><span class="quebra-rot">Ideia de antes e depois</span><p>' + esc(r.res.ideia) + '</p></div>' +
        (r.msgs.length ? '<ul class="citacoes">' + r.msgs.filter(function (m, i, arr) { return arr.findIndex(function (x) { return x.texto === m.texto; }) === i; }).slice(0, 2).map(function (m) { return '<li><q>' + esc(textoSeguro(m)) + '</q><span class="sub">' + esc(AUT[(m.aut || {}).status] || 'Sem registro') + '</span></li>'; }).join('') + '</ul>' : '<p class="sub">Nenhum relato desse tipo no período. Vale perguntar no grupo.</p>') +
        '</section>';
    }).join('') + '</div>';
    h += '<section class="painel-card"><div class="card-topo"><h2>Convidar para antes e depois</h2><span class="chip chip-auto">Sugestão automática</span></div>' +
      '<p class="sub">Alunas que relataram evolução nos últimos 30 dias e ainda não têm foto registrada. Convide com o termo de autorização. A participação é opcional.</p>' +
      (cand.length ? '<ul class="sinais">' + cand.slice(0, 12).map(function (c) {
        return '<li class="sinal-convite"><span class="sinal-tag">' + c.n + ' relato(s)</span><span class="item-quem">' + esc(rotuloAluna(c.alunaId)) + '</span><span class="lc-texto">' + citar(textoSeguro(c.ultima)) + '</span></li>';
      }).join('') + '</ul>' : '<p class="sub">Ninguém nessa situação agora.</p>') + '</section>';
    return h;
  }

  function formAut(alvo, obj) {
    if (!pode('editar')) return '';
    var aut = obj.aut || { status: 'nao_solicitada', confirmadoPor: '' };
    return '<div class="form-aut" data-alvo="' + alvo + '" data-id="' + obj.id + '">' +
      '<label class="campo campo-peq"><span>Autorização</span><select id="as-' + obj.id + '">' + opcoes(AUT, aut.status) + '</select></label>' +
      '<label class="campo campo-peq"><span>Quem confirmou</span><select id="ap-' + obj.id + '">' + opcoes(mapaEquipe(), aut.confirmadoPor, 'Ninguém ainda') + '</select></label>' +
      '<button type="button" class="btn btn-sec btn-peq" data-acao="registrar-aut" data-alvo="' + alvo + '" data-id="' + obj.id + '">Registrar</button>' +
      '<p class="erro" id="ae-' + obj.id + '" hidden></p>' +
      (aut.data ? '<p class="nota-peq">Último registro: ' + U.fmtDataAno(aut.data) + '</p>' : '') +
      '</div>';
  }

  /* ---------- Ideias de conteúdo ---------- */

  function abaIdeias() {
    var a = analisePeriodo();
    return '<div class="cabeca-aba"><h1>Ideias de conteúdo</h1><p class="sub">Pauta montada a partir do que as alunas trouxeram de ' + U.fmtDataAno(a.iv[0]) + ' a ' + U.fmtDataAno(a.iv[1]) + '. Para exportar e compartilhar, use <button type="button" class="link" data-acao="ir-pauta">Relatórios</button>.</p></div>' +
      '<section class="painel-card relatorio">' + a.r.html + '</section>';
  }

  /* ---------- Como ajudar mais ---------- */

  function abaAjuda() {
    var a = analisePeriodo();
    var h = '<div class="cabeca-aba"><h1>Como ajudar mais</h1><p class="sub">Sugestões para melhorar a entrega e o cuidado com as alunas, cada uma com a evidência que a gerou. São pontos de partida para a sua decisão, não ordens.</p></div>';
    h += a.r.sugestoes.length ? '<div class="grupos">' + a.r.sugestoes.map(function (x) {
      return '<section class="painel-card grupo sug"><span class="chip">' + esc(x.area) + '</span><h2>' + esc(x.titulo) + '</h2><p>' + esc(x.detalhe) + '</p><p class="sub">Evidência: ' + esc(x.evidencia) + '</p></section>';
    }).join('') + '</div>' : vazio('Nenhuma sugestão', 'Poucos dados no período.');
    h += blocoSinais(a.iv[1], 30);
    return h;
  }

  /* ---------- Mensagens e revisão ---------- */

  function abaMensagens() {
    var h = '<div class="cabeca-aba"><h1>Mensagens e revisão</h1><p class="sub">Busque por palavra ou assunto e corrija a classificação automática. Só depois de revisadas as mensagens entram nos relatórios (essa opção pode ser desligada em Relatórios). Os textos aparecem sem telefone, e-mail ou sobrenome.</p></div>';
    h += '<div class="linha-controles"><label class="campo campo-largo"><span>Buscar</span><input type="search" id="busca" placeholder="Ex.: televisão, marmita, glúteo, A-012" value="' + esc(S.busca) + '" autocomplete="off"></label>' +
      '<label class="check"><input type="checkbox" id="so-nao-rev" data-mudar="so-nao-rev"' + (S.soNaoRevisadas ? ' checked' : '') + '> Só não revisadas</label></div>';
    if (!pode('editar')) h += semPermissao('corrigir classificações');
    h += '<div id="lista-mensagens"></div>';
    return h;
  }

  function renderListaMensagens() {
    var el = document.getElementById('lista-mensagens');
    if (!el) return;
    var q = U.norm(S.busca.trim());
    var lista = filtrar(msgsAlunas(), intervalo()).filter(function (m) {
      if (S.soNaoRevisadas && m.revisado) return false;
      if (!q) return true;
      return U.norm(textoSeguro(m)).indexOf(q) !== -1 || U.norm(nomeTema(m.tema)).indexOf(q) !== -1 || U.norm(m.alunaId).indexOf(q) !== -1;
    }).sort(function (a, b) { return b.data - a.data; });
    var mostrar = lista.slice(0, S.limite);
    var dis = pode('editar') ? '' : ' disabled';
    el.innerHTML = '<p class="sub">' + lista.length + ' mensagem(ns) encontrada(s).</p>' +
      (lista.length ? '<div class="itens">' + mostrar.map(function (m) {
        var objs = A.detectar(m.texto, S.objecoes);
        return '<article class="item"><div class="item-topo">' + canalTag(m.canal) + '<span class="item-quem">' + esc(rotuloAluna(m.alunaId)) + '</span><time>' + U.fmtDataHora(m.data) + '</time></div>' +
          '<p class="item-texto">' + esc(textoSeguro(m)) + '</p>' +
          '<div class="item-meta">' + classeChip(m) + (m.aut ? autChip(m.aut) : '') +
          objs.map(function (id) { var o = S.objecoes.find(function (x) { return x.id === id; }); return '<span class="chip chip-obj">Objeção: ' + esc(o.nome) + '</span>'; }).join('') + '</div>' +
          '<div class="item-acoes">' +
          '<label class="campo campo-peq"><span>Tipo</span><select id="ct-' + m.id + '"' + dis + '>' + opcoes(mapaTipos(), m.tipo) + '</select></label>' +
          '<label class="campo campo-peq"><span>Assunto</span><select id="cm-' + m.id + '"' + dis + '>' + opcoes(mapaTemas(), m.tema) + '</select></label>' +
          (pode('editar') ? '<button type="button" class="btn btn-peq" data-acao="confirmar-class" data-id="' + m.id + '">' + (m.revisado ? 'Salvar correção' : 'Confirmar classificação') + '</button>' : '') +
          '</div></article>';
      }).join('') + '</div>' : vazio('Nada encontrado', 'Tente outra palavra ou limpe os filtros.')) +
      (lista.length > mostrar.length ? '<button type="button" class="btn btn-sec mais" data-acao="mais">Mostrar mais ' + Math.min(40, lista.length - mostrar.length) + '</button>' : '');
  }

  function subFotos() {
    var ms = conj().midias;
    var h = '<p class="sub">Acesso restrito. O arquivo original nunca é alterado: o desfoque gera uma cópia tratada separada, com prévia antes de salvar. Nada fica público por padrão.</p>';
    if (S.modo === 'demo') {
      h += '<p class="nota">As imagens abaixo são <strong>ilustrações fictícias</strong> (silhuetas desenhadas pelo painel), não fotos de pessoas. Servem para testar o fluxo de autorização e desfoque.</p>';
    } else if (pode('editar')) {
      h += '<section class="painel-card"><h2>Adicionar foto para revisão</h2><p class="sub">A foto fica só na memória desta aba. Ela não é enviada para nenhum lugar e some ao recarregar. Adicione apenas fotos que a aluna enviou para o acompanhamento.</p>' +
        '<div class="linha-controles">' +
        '<label class="campo"><span>Aluna</span><select id="foto-aluna">' + opcoes(Object.keys(alunasAtuais()).reduce(function (r, id) { r[id] = rotuloAluna(id); return r; }, {}), '', 'Sem vínculo') + '</select></label>' +
        '<label class="campo"><span>Descrição</span><input type="text" id="foto-desc" placeholder="Ex.: 60 dias de programa"></label>' +
        '<label class="campo"><span>Arquivo de imagem</span><input type="file" id="foto-arquivo" accept="image/*"></label>' +
        '<div class="campo campo-botao"><button type="button" class="btn" data-acao="foto-adicionar">Adicionar</button></div></div></section>';
    }
    if (!ms.length) return h + vazio('Nenhuma foto ainda', S.modo === 'demo' ? 'Sem ilustrações.' : 'Adicione uma foto acima para testar o fluxo.');
    h += '<div class="galeria">' + ms.map(cardFoto).join('') + '</div>';
    return h;
  }

  function cardFoto(f) {
    var podeVerOriginal = pode('editar');
    var img;
    if (podeVerOriginal) img = '<img src="' + (f.derivada || f.original) + '" alt="' + (f.derivada ? 'Cópia tratada' : 'Original') + ' · ' + esc(f.descricao) + '">';
    else if (f.derivada) img = '<img src="' + f.derivada + '" alt="Cópia tratada · ' + esc(f.descricao) + '">';
    else img = '<div class="trava-img"><span aria-hidden="true">🔒</span> Original com acesso restrito. Ainda não há cópia tratada.</div>';
    var podeLiberar = f.aut && f.aut.status === 'divulgacao' && f.aut.confirmadoPor && (!f.ocultarRosto || f.derivada);
    return '<article class="foto">' +
      '<div class="foto-img">' + img + (f.derivada ? '<span class="selo">Cópia tratada</span>' : podeVerOriginal ? '<span class="selo selo-orig">Original</span>' : '') + '</div>' +
      '<div class="foto-corpo"><div class="item-topo"><span class="item-quem">' + esc(rotuloAluna(f.alunaId)) + '</span><time>' + U.fmtDataAno(f.data) + '</time></div>' +
      '<p>' + esc(f.descricao) + '</p>' +
      '<div class="item-meta">' + autChip(f.aut) + (f.ocultarRosto ? '<span class="chip">Ocultar rosto</span>' : '') +
      (f.prontaDivulgacao ? '<span class="chip chip-pronto">Marcada como pronta para divulgação</span>' : '') + '</div>' +
      (f.derivadaInfo ? '<p class="nota-peq">Cópia tratada criada em ' + U.fmtDataHora(f.derivadaInfo.quando) + ' (' + f.derivadaInfo.areas + ' área(s) desfocada(s)). O original foi mantido.</p>' : '') +
      '<div class="item-acoes">' +
      (pode('editar') ? '<button type="button" class="btn btn-sec btn-peq" data-acao="abrir-editor" data-id="' + f.id + '">' + (f.derivada ? 'Refazer cópia tratada' : 'Criar cópia tratada') + '</button>' : '') +
      (pode('editar') ? '<label class="check"><input type="checkbox" data-mudar="ocultar-rosto" data-id="' + f.id + '"' + (f.ocultarRosto ? ' checked' : '') + '> Exigir rosto oculto</label>' : '') +
      (pode('exportar') && f.derivada ? '<button type="button" class="btn btn-sec btn-peq" data-acao="baixar-derivada" data-id="' + f.id + '">Baixar cópia tratada</button>' : '') +
      (pode('editar') ? '<button type="button" class="btn btn-peq" data-acao="pronta-divulgacao" data-id="' + f.id + '"' + (podeLiberar ? '' : ' disabled title="Precisa de autorização para divulgação com quem confirmou e, se exigido, cópia com rosto oculto."') + '>' + (f.prontaDivulgacao ? 'Desmarcar' : 'Marcar como pronta') + '</button>' : '') +
      '</div>' + formAut('midia', f) + '</div></article>';
  }

  /* ---------- Editor de desfoque ---------- */

  function abrirEditor(id) {
    var f = conj().midias.find(function (x) { return x.id === id; });
    if (!f || !pode('editar')) return;
    var img = new Image();
    img.onload = function () {
      S.editor = { foto: f, img: img, areas: [], bloco: 18, previa: null, arrasto: null };
      renderEditor();
    };
    img.src = f.original;
  }

  function renderEditor() {
    var E = S.editor, el = document.getElementById('modal');
    if (!E) { el.hidden = true; el.innerHTML = ''; document.body.classList.remove('com-modal'); return; }
    document.body.classList.add('com-modal');
    el.hidden = false;
    el.innerHTML = '<div class="modal-caixa" role="dialog" aria-modal="true" aria-labelledby="ed-tit">' +
      '<div class="card-topo"><h2 id="ed-tit">Criar cópia tratada</h2><button type="button" class="btn btn-sec btn-peq" data-acao="fechar-editor">Fechar</button></div>' +
      '<p class="sub">Arraste sobre a imagem para marcar as áreas a desfocar (rosto, tatuagens, fundo com informação pessoal). O original não muda.</p>' +
      '<div class="editor-grade"><div><p class="rot-canvas">Original</p><canvas id="ed-canvas" class="ed-canvas"></canvas></div>' +
      '<div><p class="rot-canvas">Prévia da cópia tratada</p>' + (E.previa ? '<img class="ed-previa" src="' + E.previa + '" alt="Prévia da cópia tratada">' : '<div class="ed-vazio">Gere a prévia para conferir antes de salvar.</div>') + '</div></div>' +
      '<div class="linha-controles">' +
      '<span class="sub">' + E.areas.length + ' área(s) marcada(s)</span>' +
      (E.foto.sugestaoRosto ? '<button type="button" class="btn btn-sec btn-peq" data-acao="ed-sugestao">Marcar rostos da ilustração</button>' : '') +
      '<button type="button" class="btn btn-sec btn-peq" data-acao="ed-limpar">Limpar áreas</button>' +
      '<label class="campo campo-peq"><span>Intensidade</span><select id="ed-bloco" data-mudar="ed-bloco">' + opcoes({ '10': 'Leve', '18': 'Média', '30': 'Forte' }, String(E.bloco)) + '</select></label>' +
      '<button type="button" class="btn btn-sec" data-acao="ed-previa"' + (E.areas.length ? '' : ' disabled') + '>Gerar prévia</button>' +
      '<button type="button" class="btn" data-acao="ed-salvar"' + (E.previa ? '' : ' disabled') + '>Salvar cópia tratada</button>' +
      '</div><p class="nota-peq">Tamanho e formato finais para Instagram ainda serão definidos com você. Por enquanto a cópia mantém o tamanho original.</p></div>';
    desenharEditor();
    ligarCanvas();
  }

  function desenharEditor() {
    var E = S.editor, cv = document.getElementById('ed-canvas');
    if (!cv) return;
    cv.width = E.img.naturalWidth; cv.height = E.img.naturalHeight;
    var x = cv.getContext('2d');
    x.drawImage(E.img, 0, 0);
    var todas = E.areas.concat(E.arrasto ? [E.arrasto] : []);
    x.lineWidth = Math.max(2, cv.width / 300);
    todas.forEach(function (a) {
      x.fillStyle = 'rgba(163, 36, 92, 0.25)';
      x.strokeStyle = '#a3245c';
      var r = normRet(a);
      x.fillRect(r.x, r.y, r.w, r.h);
      x.strokeRect(r.x, r.y, r.w, r.h);
    });
  }

  function normRet(a) { return { x: Math.min(a.x, a.x + a.w), y: Math.min(a.y, a.y + a.h), w: Math.abs(a.w), h: Math.abs(a.h) }; }

  function ligarCanvas() {
    var cv = document.getElementById('ed-canvas'), E = S.editor;
    function pos(ev) {
      var r = cv.getBoundingClientRect();
      return { x: (ev.clientX - r.left) * cv.width / r.width, y: (ev.clientY - r.top) * cv.height / r.height };
    }
    cv.addEventListener('pointerdown', function (ev) {
      var p = pos(ev); E.arrasto = { x: p.x, y: p.y, w: 0, h: 0 };
      cv.setPointerCapture(ev.pointerId);
    });
    cv.addEventListener('pointermove', function (ev) {
      if (!E.arrasto) return;
      var p = pos(ev); E.arrasto.w = p.x - E.arrasto.x; E.arrasto.h = p.y - E.arrasto.y;
      desenharEditor();
    });
    cv.addEventListener('pointerup', function () {
      if (E.arrasto && Math.abs(E.arrasto.w) > 6 && Math.abs(E.arrasto.h) > 6) { E.areas.push(normRet(E.arrasto)); E.previa = null; }
      E.arrasto = null;
      renderEditor();
    });
  }

  function gerarPrevia() {
    var E = S.editor;
    var w = E.img.naturalWidth, h = E.img.naturalHeight;
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var x = cv.getContext('2d');
    x.drawImage(E.img, 0, 0);
    var b = E.bloco * Math.max(1, w / 800);
    E.areas.forEach(function (a) {
      var pw = Math.max(1, Math.round(a.w / b)), ph = Math.max(1, Math.round(a.h / b));
      var t = document.createElement('canvas'); t.width = pw; t.height = ph;
      t.getContext('2d').drawImage(E.img, a.x, a.y, a.w, a.h, 0, 0, pw, ph);
      x.imageSmoothingEnabled = false;
      x.drawImage(t, 0, 0, pw, ph, a.x, a.y, a.w, a.h);
      x.imageSmoothingEnabled = true;
    });
    E.previa = cv.toDataURL('image/png');
  }

  /* ---------- Relatórios ---------- */

  function construirRelatorio() {
    var iv = intervalo();
    var base = filtrar(msgsAlunas(), iv);
    var naoRev = base.filter(function (m) { return !m.revisado; }).length;
    var lista = S.rel.soRevisadas ? base.filter(function (m) { return m.revisado; }) : base;
    var demo = S.modo === 'demo';
    var sec = S.rel.secoes;
    var filtrosTxt = ['canal', 'tema', 'tipo', 'autorizacao'].filter(function (k) { return S.filtros[k]; }).map(function (k) {
      var v = S.filtros[k];
      return { canal: 'Canal: ' + CANAIS[v], tema: 'Assunto: ' + nomeTema(v), tipo: 'Tipo: ' + nomeTipo(v), autorizacao: 'Autorização: ' + AUT[v] }[k];
    });
    var h = [], t = [], csv = [];
    var titulo = { pauta: 'Pauta de conteúdo e necessidades das alunas', interno: 'Relatório interno em números', divulgacao: 'Material autorizado para divulgação' }[S.rel.tipo];
    if (demo) { h.push('<p class="rel-demo">DADOS FICTÍCIOS · DEMONSTRAÇÃO · NÃO USAR EM DIVULGAÇÃO</p>'); t.push('*** DADOS FICTÍCIOS · DEMONSTRAÇÃO · NÃO USAR EM DIVULGAÇÃO ***'); }
    h.push('<h2>' + titulo + '</h2>');
    var cab = 'Período: ' + U.fmtDataAno(iv[0]) + ' a ' + U.fmtDataAno(iv[1]) + (filtrosTxt.length ? ' · ' + filtrosTxt.join(' · ') : '') + ' · Gerado em ' + U.fmtDataHora(Date.now());
    h.push('<p class="rel-meta">' + esc(cab) + '</p>');
    t.push(titulo, cab);
    var notaRev = S.rel.soRevisadas ? 'Inclui só classificações revisadas por uma pessoa (' + naoRev + ' mensagem(ns) sem revisão ficaram de fora).' : 'Atenção: inclui ' + naoRev + ' classificação(ões) automática(s) ainda não revisada(s).';
    h.push('<p class="rel-meta">' + notaRev + ' Sem nomes, sobrenomes, telefones ou códigos de alunas.</p>');
    t.push(notaRev, '');

    if (S.rel.tipo === 'pauta') {
      var anteriorRel = filtrar(msgsAlunas(), intervaloAnterior(iv));
      if (S.rel.soRevisadas) anteriorRel = anteriorRel.filter(function (m) { return m.revisado; });
      var pa = analisar(lista, anteriorRel, iv);
      return { html: h.join('') + pa.html, texto: t.join('\n') + '\n' + pa.texto, csv: pa.csv };
    }

    if (S.rel.tipo === 'divulgacao') {
      var ok = base.filter(prontoDivulgacao);
      h.push('<p class="rel-meta">Só entram depoimentos e relatos revisados, com autorização para divulgação e o nome de quem confirmou. Releia o texto e a autorização antes de publicar.</p>');
      if (!ok.length) { h.push('<p>Nenhum item autorizado para divulgação no período.</p>'); t.push('Nenhum item autorizado para divulgação no período.'); }
      else {
        h.push('<ol class="rel-lista">' + ok.map(function (m) { return '<li><q>' + esc(textoSeguro(m)) + '</q> <span>(' + esc(nomeTipo(m.tipo)) + ' · ' + esc(nomeTema(m.tema)) + ' · ' + U.fmtDataAno(m.data) + ')</span></li>'; }).join('') + '</ol>');
        ok.forEach(function (m) { t.push('- "' + textoSeguro(m) + '" (' + nomeTipo(m.tipo) + ', ' + U.fmtDataAno(m.data) + ')'); });
      }
      csv.push(['data', 'canal', 'tipo', 'assunto', 'texto', 'autorizacao', 'confirmado_por']);
      ok.forEach(function (m) { csv.push([U.fmtDataAno(m.data), CANAIS[m.canal], nomeTipo(m.tipo), nomeTema(m.tema), textoSeguro(m), AUT[m.aut.status], m.aut.confirmadoPor]); });
      return { html: h.join(''), texto: t.join('\n'), csv: csv };
    }

    var porTipo = U.contarPor(lista, 'tipo'), porCanal = U.contarPor(lista, 'canal');
    if (sec.numeros) {
      h.push('<h3>Números do período</h3><div class="tabela-rolagem"><table class="rel-tab"><tbody>' +
        '<tr><th>Mensagens das alunas</th><td>' + lista.length + '</td></tr>' +
        '<tr><th>WhatsApp · Telegram</th><td>' + (porCanal.whatsapp || 0) + ' · ' + (porCanal.telegram || 0) + '</td></tr>' +
        C.TIPOS.map(function (x) { return '<tr><th>' + esc(x.nome) + '</th><td>' + (porTipo[x.id] || 0) + '</td></tr>'; }).join('') + '</tbody></table></div>');
      t.push('NÚMEROS', 'Mensagens das alunas: ' + lista.length, 'WhatsApp: ' + (porCanal.whatsapp || 0) + ' · Telegram: ' + (porCanal.telegram || 0));
      C.TIPOS.forEach(function (x) { t.push(x.nome + ': ' + (porTipo[x.id] || 0)); });
      t.push('');
    }
    if (sec.temas) {
      var porTema = U.contarPor(lista, 'tema');
      var ord = Object.keys(porTema).sort(function (a, b) { return porTema[b] - porTema[a]; });
      h.push('<h3>Assuntos recorrentes</h3><div class="tabela-rolagem"><table class="rel-tab"><thead><tr><th>Assunto</th><th>Mensagens</th><th>Dúvidas</th><th>Queixas e dificuldades</th></tr></thead><tbody>' +
        ord.map(function (k) {
          var d = lista.filter(function (m) { return m.tema === k; });
          var c = U.contarPor(d, 'tipo');
          return '<tr><th>' + esc(nomeTema(k)) + '</th><td>' + porTema[k] + '</td><td>' + (c.duvida || 0) + '</td><td>' + ((c.queixa || 0) + (c.dificuldade || 0)) + '</td></tr>';
        }).join('') + '</tbody></table></div>');
      t.push('ASSUNTOS RECORRENTES');
      ord.forEach(function (k) { t.push('- ' + nomeTema(k) + ': ' + porTema[k]); });
      t.push('');
    }
    if (sec.dores) {
      var qd = lista.filter(function (m) { return m.tipo === 'queixa' || m.tipo === 'dificuldade'; });
      var gq = {};
      qd.forEach(function (m) { (gq[m.tema] = gq[m.tema] || []).push(m); });
      h.push('<h3>Queixas e dificuldades por assunto</h3>');
      t.push('QUEIXAS E DIFICULDADES');
      Object.keys(gq).sort(function (a, b) { return gq[b].length - gq[a].length; }).forEach(function (k) {
        var exs = P.pauta.agrupar(gq[k], textoSeguro).slice(0, 2).map(function (g) { return g.principal; });
        h.push('<p><strong>' + esc(nomeTema(k)) + '</strong> (' + gq[k].length + '): ' + exs.map(function (e) { return '<q>' + esc(e) + '</q>'; }).join(' ') + '</p>');
        t.push('- ' + nomeTema(k) + ' (' + gq[k].length + '): ' + exs.map(function (e) { return '"' + e + '"'; }).join(' '));
      });
      if (!qd.length) h.push('<p>Nenhuma no período.</p>');
      t.push('');
    }
    if (sec.depoimentos) {
      var dep = lista.filter(ehProva);
      var autorizados = dep.filter(function (m) { return m.aut && (m.aut.status === 'uso_interno' || m.aut.status === 'divulgacao') && m.aut.confirmadoPor; });
      h.push('<h3>Depoimentos e relatos de evolução</h3><p>' + dep.length + ' no período. ' + autorizados.length + ' com autorização registrada (texto abaixo). ' + (dep.length - autorizados.length) + ' sem autorização: só contados, sem texto.</p>' +
        (autorizados.length ? '<ul class="rel-lista">' + autorizados.slice(0, 15).map(function (m) { return '<li><q>' + esc(textoSeguro(m)) + '</q> <span>(' + esc(AUT[m.aut.status]) + ')</span></li>'; }).join('') + '</ul>' : ''));
      t.push('DEPOIMENTOS E EVOLUÇÃO: ' + dep.length + ' no período, ' + autorizados.length + ' com autorização registrada.');
      autorizados.slice(0, 15).forEach(function (m) { t.push('- "' + textoSeguro(m) + '" (' + AUT[m.aut.status] + ')'); });
    }

    csv.push(['data', 'canal', 'tipo', 'assunto', 'classificacao', 'objecoes', 'autorizacao', 'texto_sem_dados_pessoais']);
    lista.forEach(function (m) {
      var objs = A.detectar(m.texto, S.objecoes).map(function (id) { return S.objecoes.find(function (o) { return o.id === id; }).nome; }).join(' | ');
      csv.push([U.fmtDataHora(m.data), CANAIS[m.canal], nomeTipo(m.tipo), nomeTema(m.tema), m.revisado ? 'revisada' : 'automática', objs, m.aut ? AUT[m.aut.status] : '', textoSeguro(m)]);
    });
    return { html: h.join(''), texto: t.join('\n'), csv: csv };
  }

  function csvTexto(linhas) {
    var aviso = S.modo === 'demo' ? 'DADOS FICTÍCIOS - DEMONSTRAÇÃO\n' : '';
    return '\ufeff' + aviso + linhas.map(function (l) { return l.map(function (v) { v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';'); }).join('\n');
  }

  function abaRelatorios() {
    var r = construirRelatorio();
    var sec = S.rel.secoes;
    var h = '<div class="cabeca-aba"><h1>Relatórios</h1><p class="sub">Usa os filtros do topo. Nenhum relatório traz nome, sobrenome, telefone ou código de aluna.</p></div>';
    h += '<div class="linha-controles">' +
      '<label class="campo campo-largo"><span>Tipo de relatório</span><select id="rel-tipo" data-mudar="rel-tipo">' + opcoes({ pauta: 'Pauta de conteúdo e necessidades', interno: 'Interno em números', divulgacao: 'Divulgação (somente autorizados)' }, S.rel.tipo) + '</select></label>' +
      '<label class="check"><input type="checkbox" id="rel-rev" data-mudar="rel-rev"' + (S.rel.soRevisadas ? ' checked' : '') + '> Só classificações revisadas</label>' +
      '</div>';
    if (S.rel.tipo === 'interno') {
      h += '<fieldset class="secoes"><legend>Seções</legend>' + [['numeros', 'Números'], ['temas', 'Assuntos'], ['dores', 'Queixas e dificuldades'], ['depoimentos', 'Depoimentos e evolução']].map(function (s) {
        return '<label class="check"><input type="checkbox" id="rs-' + s[0] + '" data-mudar="rel-secao" data-k="' + s[0] + '"' + (sec[s[0]] ? ' checked' : '') + '> ' + s[1] + '</label>';
      }).join('') + '</fieldset>';
    }
    h += '<div class="linha-controles">' +
      (pode('exportar')
        ? '<button type="button" class="btn" data-acao="rel-html">Baixar relatório (.html)</button><button type="button" class="btn btn-sec" data-acao="rel-csv">Baixar planilha (.csv)</button><button type="button" class="btn btn-sec" data-acao="rel-copiar">Copiar texto</button>'
        : '') + '</div>';
    if (!pode('exportar')) h += semPermissao('exportar relatórios');
    h += '<p class="nota-peq">Para salvar em PDF, abra o .html baixado e use Imprimir → Salvar como PDF. Se o download não funcionar nesta visualização, use "Copiar texto" ou abra o painel direto pelo arquivo index.html.</p>';
    h += '<section class="painel-card relatorio" aria-label="Prévia do relatório">' + r.html + '</section>';
    return h;
  }

  /* ---------- Importar ---------- */

  function abaImportar() {
    var h = '<div class="cabeca-aba"><h1>Importar conversas</h1><p class="sub">Você exporta a conversa no aplicativo e carrega o arquivo aqui. Para WhatsApp, exporte as conversas que tiveram dúvidas, relatos ou depoimentos. Tudo é lido no seu navegador, fica só nesta aba e não se mistura com os dados fictícios.</p></div>';
    h += '<div class="duas"><section class="painel-card"><h2>Como exportar</h2>' +
      '<details open><summary><strong>WhatsApp</strong> (conversa individual ou grupo)</summary><ol class="passos"><li>Abra a conversa no celular.</li><li>Toque nos três pontinhos (Android) ou no nome do contato (iPhone).</li><li>Escolha <em>Mais → Exportar conversa → Sem mídia</em>.</li><li>Salve o arquivo .txt (se vier em .zip, extraia o .txt).</li></ol></details>' +
      '<details><summary><strong>Telegram</strong> (grupo de acompanhamento)</summary><ol class="passos"><li>Use o Telegram Desktop no computador.</li><li>Abra o grupo → três pontinhos → <em>Exportar histórico do chat</em>.</li><li>Desmarque fotos e vídeos e escolha o formato <em>JSON legível por máquina</em>.</li><li>Carregue aqui o arquivo result.json.</li></ol></details>' +
      '<details><summary><strong>Planilha</strong> (.csv)</summary><p class="sub">Colunas: data, hora, canal, nome, mensagem e equipe (sim/não).</p><button type="button" class="btn btn-sec btn-peq" data-acao="modelo-csv">Baixar modelo de planilha</button></details>' +
      '</section>';
    h += '<section class="painel-card"><h2>Carregar arquivo</h2>';
    if (!pode('editar')) h += semPermissao('importar dados');
    else {
      h += '<div class="linha-controles">' +
        '<label class="campo"><span>Origem</span><select id="imp-origem" data-mudar="imp-origem">' + opcoes({ whatsapp: 'WhatsApp (.txt)', telegram: 'Telegram (.json)', csv: 'Planilha (.csv)' }, S.impOrigem) + '</select></label>' +
        (S.impOrigem === 'csv' ? '<label class="campo"><span>Canal, se a planilha não informar</span><select id="imp-canal" data-mudar="imp-canal">' + opcoes(CANAIS, S.impCanal) + '</select></label>' : '') +
        '<label class="campo"><span>Arquivo</span><input type="file" id="imp-arquivo" data-mudar="imp-arquivo" accept=".txt,.json,.csv,text/plain,application/json,text/csv"></label></div>';
      h += previaImportacao();
    }
    h += '</section></div>';
    var c = S.dados.import;
    if (c.mensagens.length) {
      h += '<section class="painel-card"><h2>Dados importados nesta aba</h2><p>' + c.mensagens.length + ' mensagens de ' + Object.keys(c.alunas).length + ' aluna(s), ' + c.mensagens.filter(function (m) { return m.equipe; }).length + ' da equipe.</p>' +
        '<div class="linha-controles"><button type="button" class="btn" data-acao="modo" data-v="import">Ver no painel</button>' +
        (pode('editar') ? '<button type="button" class="btn btn-perigo" data-acao="imp-limpar-pedir">Apagar dados importados</button>' : '') + '</div>' +
        (S.confirmarLimpeza ? '<div class="confirma"><p>Isso apaga da memória desta aba todas as mensagens e fotos importadas. Os arquivos no seu computador continuam intactos.</p><button type="button" class="btn btn-perigo" data-acao="imp-limpar">Sim, apagar</button><button type="button" class="btn btn-sec" data-acao="imp-limpar-cancelar">Cancelar</button></div>' : '') +
        '</section>';
    }
    return h;
  }

  function previaImportacao() {
    var p = S.impPrevia;
    if (!p) return '<p class="sub">Escolha um arquivo para ver uma prévia antes de importar.</p>';
    if (p.erro) return '<p class="erro">' + esc(p.erro) + '</p>';
    var rem = {};
    p.mensagens.forEach(function (m) { rem[m.remetente] = (rem[m.remetente] || 0) + 1; });
    var nomes = Object.keys(rem).sort(function (a, b) { return rem[b] - rem[a]; });
    var datas = p.mensagens.map(function (m) { return m.data; });
    var h = '<div class="previa"><p><strong>' + esc(p.arquivo) + '</strong>: ' + p.mensagens.length + ' mensagens de ' + nomes.length + ' pessoa(s), de ' + U.fmtDataAno(Math.min.apply(null, datas)) + ' a ' + U.fmtDataAno(Math.max.apply(null, datas)) + '.' +
      (p.midias ? ' ' + p.midias + ' mídia(s) ignorada(s) (fotos entram só pela aba Antes e depois, com autorização).' : '') +
      (p.ignoradas ? ' ' + p.ignoradas + ' linha(s) de sistema ou apagadas ignorada(s).' : '') + '</p>' +
      '<fieldset class="secoes"><legend>Marque quem é da equipe (as mensagens da equipe não entram nas contagens e servem para saber o que já foi respondido)</legend>' +
      nomes.slice(0, 60).map(function (n, i) {
        return '<label class="check"><input type="checkbox" id="eq-' + i + '" data-mudar="imp-equipe" data-nome="' + esc(n) + '"' + (p.equipe[n] ? ' checked' : '') + '> ' + esc(n) + ' <span class="sub">(' + rem[n] + ')</span></label>';
      }).join('') + (nomes.length > 60 ? '<p class="sub">Mostrando as 60 pessoas com mais mensagens.</p>' : '') + '</fieldset>' +
      '<div class="linha-controles"><button type="button" class="btn" data-acao="imp-confirmar">Importar para revisão</button><button type="button" class="btn btn-sec" data-acao="imp-cancelar">Cancelar</button></div>' +
      '<p class="nota-peq">Depois de importar, tudo recebe classificação automática marcada como sugestão. Revise em "Mensagens e revisão".</p></div>';
    return h;
  }

  function lerArquivoImportacao(file) {
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'json') S.impOrigem = 'telegram';
    else if (ext === 'csv') S.impOrigem = 'csv';
    else if (ext === 'txt') S.impOrigem = 'whatsapp';
    else if (ext === 'zip') { S.impPrevia = { erro: 'Arquivos .zip não são lidos. Extraia o .txt de dentro do .zip e carregue só ele.' }; render(); return; }
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var I = P.importadores;
        var res = S.impOrigem === 'telegram' ? I.telegram(fr.result) : S.impOrigem === 'csv' ? I.csv(fr.result, S.impCanal) : I.whatsapp(fr.result);
        var eq = {};
        res.mensagens.forEach(function (m) { if (m.equipe) eq[m.remetente] = true; if (S.equipe.indexOf(m.remetente) !== -1) eq[m.remetente] = true; });
        S.impPrevia = { arquivo: file.name, mensagens: res.mensagens, midias: res.midias, ignoradas: res.ignoradas, equipe: eq };
      } catch (e) {
        S.impPrevia = { erro: e.message };
      }
      render();
    };
    fr.onerror = function () { S.impPrevia = { erro: 'Não consegui ler o arquivo.' }; render(); };
    fr.readAsText(file, 'utf-8');
  }

  // Código estável por remetente sem guardar o nome ou o número de origem.
  function chaveRemetente(s) {
    var h = 5381, t = U.norm(s).trim();
    for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
    return 'r' + (h >>> 0).toString(36);
  }

  function confirmarImportacao() {
    var p = S.impPrevia, c = S.dados.import;
    var porChave = {};
    Object.keys(c.alunas).forEach(function (id) { porChave[c.alunas[id].chave] = id; });
    var novas = p.mensagens.map(function (x) {
      var eq = !!p.equipe[x.remetente];
      var alunaId = null;
      if (!eq) {
        var k = chaveRemetente(x.remetente);
        alunaId = porChave[k];
        if (!alunaId) {
          alunaId = 'I-' + String(Object.keys(c.alunas).length + 1).padStart(3, '0');
          var ehTel = /^[+\d\s().-]{8,}$/.test(x.remetente);
          var partes = ehTel ? [] : x.remetente.trim().split(/\s+/);
          // Guardamos só o primeiro nome (para a equipe reconhecer) e o sobrenome em memória para mascarar textos.
          c.alunas[alunaId] = { id: alunaId, chave: k, nome: ehTel ? 'Sem nome' : partes[0], sobrenome: ehTel ? '' : partes.slice(1).join(' ') };
          porChave[k] = alunaId;
        }
      }
      var auto = C.classificar(x.texto, S.temas);
      return { id: 'i' + (++S.seqImport), origem: 'import', arquivo: p.arquivo, canal: x.canal, data: x.data, texto: x.texto, equipe: eq, alunaId: alunaId, tipo: eq ? 'outro' : auto.tipo, tema: auto.tema, auto: auto, revisado: eq, aut: null };
    });
    novas.forEach(function (m) {
      if (!m.equipe && ehProva(m)) m.aut = { status: 'nao_solicitada', confirmadoPor: '', data: null };
    });
    c.mensagens = c.mensagens.concat(novas).sort(function (a, b) { return a.data - b.data; });
    registrar('Importou arquivo', p.arquivo + ' · ' + novas.length + ' mensagens');
    S.impPrevia = null;
    S.modo = 'import';
    S.filtros.periodo = 'tudo';
    invalidarMascaras();
    S.aba = 'visao';
    avisar('Importação concluída. Revise as classificações automáticas.');
    render();
  }

  /* ---------- Configurações ---------- */

  function abaConfig() {
    var adm = pode('admin');
    var h = '<div class="cabeca-aba"><h1>Configurações</h1><p class="sub">Assuntos, objeções, equipe, permissões e registro de ações. Neste protótipo tudo fica só nesta aba.</p></div>';
    h += '<section class="painel-card"><h2>Assuntos</h2><p class="sub">As palavras-chave alimentam a classificação automática. O "tipo" decide se o assunto vira pauta de conteúdo, bloqueio de mentalidade, ajuste na entrega ou prova social. Mensagens já revisadas não são alteradas.</p>';
    if (!adm) h += semPermissao('editar assuntos');
    h += '<div class="tabela-rolagem"><table class="tab"><thead><tr><th>Assunto</th><th>Tipo</th><th>Palavras-chave (separe por vírgula)</th><th>Ideia de conteúdo</th><th>Ângulo do seu método (ou ação, se for entrega)</th>' + (adm ? '<th><span class="sr">Ações</span></th>' : '') + '</tr></thead><tbody>' +
      S.temas.map(function (t) {
        var dis = adm && !t.fixo ? '' : ' disabled';
        return '<tr><td><input type="text" id="tn-' + t.id + '" value="' + esc(t.nome) + '" aria-label="Nome do assunto"' + dis + '></td>' +
          '<td><select id="tz-' + t.id + '" aria-label="Tipo do assunto"' + dis + '>' + opcoes(NATUREZAS, t.natureza || 'conteudo') + '</select></td>' +
          '<td><textarea id="tp-' + t.id + '" rows="2" aria-label="Palavras-chave"' + dis + '>' + esc(t.palavras.join(', ')) + '</textarea></td>' +
          '<td><textarea id="ti-' + t.id + '" rows="2" aria-label="Ideia de conteúdo"' + dis + '>' + esc(t.ideia) + '</textarea></td>' +
          '<td><textarea id="ta-' + t.id + '" rows="2" aria-label="Ângulo do método ou ação"' + dis + '>' + esc((t.natureza === 'entrega' ? t.acao : t.angulo) || '') + '</textarea></td>' +
          (adm ? '<td class="acoes-celula">' + (t.fixo ? '<span class="sub">fixo</span>' : '<button type="button" class="btn btn-sec btn-peq" data-acao="tema-salvar" data-id="' + t.id + '">Salvar</button><button type="button" class="btn btn-sec btn-peq" data-acao="tema-remover" data-id="' + t.id + '">Remover</button>') + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>';
    if (adm) h += '<div class="linha-controles"><label class="campo"><span>Novo assunto</span><input type="text" id="tema-novo" placeholder="Ex.: Sono e descanso"></label><div class="campo campo-botao"><button type="button" class="btn btn-sec" data-acao="tema-adicionar">Adicionar</button></div>' +
      '<div class="campo campo-botao"><button type="button" class="btn" data-acao="reclassificar">Reclassificar mensagens não revisadas</button></div></div>';
    h += '</section>';

    h += '<section class="painel-card"><h2>Objeções</h2><p class="sub">Crenças que travam a aluna. O painel procura as palavras-chave nas mensagens. "Como quebrar" é a resposta do seu método e aparece na pauta.</p>';
    if (!adm) h += semPermissao('editar objeções');
    h += '<div class="tabela-rolagem"><table class="tab"><thead><tr><th>Objeção</th><th>Palavras-chave</th><th>Como quebrar (seu método)</th>' + (adm ? '<th><span class="sr">Ações</span></th>' : '') + '</tr></thead><tbody>' +
      S.objecoes.map(function (o) {
        var dis = adm ? '' : ' disabled';
        return '<tr><td><input type="text" id="on-' + o.id + '" value="' + esc(o.nome) + '" aria-label="Objeção"' + dis + '></td>' +
          '<td><textarea id="op-' + o.id + '" rows="2" aria-label="Palavras-chave da objeção"' + dis + '>' + esc(o.palavras.join(', ')) + '</textarea></td>' +
          '<td><textarea id="oq-' + o.id + '" rows="2" aria-label="Como quebrar"' + dis + '>' + esc(o.quebra) + '</textarea></td>' +
          (adm ? '<td class="acoes-celula"><button type="button" class="btn btn-sec btn-peq" data-acao="obj-salvar" data-id="' + o.id + '">Salvar</button><button type="button" class="btn btn-sec btn-peq" data-acao="obj-remover" data-id="' + o.id + '">Remover</button></td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>';
    if (adm) h += '<div class="linha-controles"><label class="campo campo-largo"><span>Nova objeção</span><input type="text" id="obj-nova" placeholder="Ex.: Depois dos 40 não dá mais"></label><div class="campo campo-botao"><button type="button" class="btn btn-sec" data-acao="obj-adicionar">Adicionar</button></div></div>';
    h += '</section>';

    h += '<div class="duas"><section class="painel-card"><h2>Equipe</h2><p class="sub">Nomes usados em "quem confirmou a autorização". Ao importar, marque essas pessoas como equipe.</p><ul class="equipe">' +
      S.equipe.map(function (n, i) { return '<li>' + esc(n) + (adm && S.equipe.length > 1 ? ' <button type="button" class="link" data-acao="equipe-remover" data-i="' + i + '">remover</button>' : '') + '</li>'; }).join('') + '</ul>' +
      (adm ? '<div class="linha-controles"><label class="campo"><span>Nome</span><input type="text" id="equipe-novo"></label><div class="campo campo-botao"><button type="button" class="btn btn-sec" data-acao="equipe-adicionar">Adicionar</button></div></div>' : semPermissao('editar a equipe')) +
      '</section>';
    h += '<section class="painel-card"><h2>Permissões por função</h2><p class="sub">Simulação. Na versão com servidor, isso é garantido pelo login e pelas regras do banco de dados. O painel não guarda telefone nem contato de ninguém.</p><div class="tabela-rolagem"><table class="tab tab-centro"><thead><tr><th>Função</th><th>Ver painéis</th><th>Editar</th><th>Ver primeiro nome</th><th>Exportar</th><th>Administrar</th></tr></thead><tbody>' +
      Object.keys(PAPEIS).map(function (k) {
        var p = PAPEIS[k];
        function c(v) { return v ? '<span class="sim">Sim</span>' : '<span class="nao">Não</span>'; }
        return '<tr' + (k === S.papel ? ' class="atual"' : '') + '><th>' + esc(p.nome) + '</th><td>' + c(true) + '</td><td>' + c(p.editar) + '</td><td>' + c(p.nome1) + '</td><td>' + c(p.exportar) + '</td><td>' + c(p.admin) + '</td></tr>';
      }).join('') + '</tbody></table></div></section></div>';

    h += '<section class="painel-card"><h2>Registro de ações</h2><p class="sub">Classificações, autorizações, cópias tratadas, importações e exportações. Neste protótipo some ao recarregar. Na versão real fica guardado no servidor.</p>' +
      (!adm ? semPermissao('ver o registro de ações') : S.auditoria.length ? '<div class="tabela-rolagem"><table class="tab"><thead><tr><th>Quando</th><th>Função</th><th>Dados</th><th>Ação</th><th>Detalhe</th></tr></thead><tbody>' +
        S.auditoria.slice(0, 200).map(function (a) { return '<tr><td class="mono">' + U.fmtDataHora(a.quando) + '</td><td>' + esc(a.papel) + '</td><td>' + esc(a.modo) + '</td><td>' + esc(a.acao) + '</td><td>' + esc(a.detalhe) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="sub">Nenhuma ação registrada ainda.</p>') +
      '</section>';
    return h;
  }

  /* ---------- ações ---------- */

  function acharMsg(id) { return conj().mensagens.find(function (m) { return m.id === id; }); }
  function acharFoto(id) { return conj().midias.find(function (m) { return m.id === id; }); }

  var ACOES = {
    aba: function (b) { S.aba = b.dataset.v; S.limite = 40; render(); document.getElementById('conteudo').focus({ preventScroll: true }); window.scrollTo(0, 0); },
    modo: function (b) { if (S.modo === b.dataset.v) { render(); return; } S.modo = b.dataset.v; S.limite = 40; S.filtros.periodo = S.modo === 'import' ? 'tudo' : '30'; S.diaResumo = ''; render(); },
    'limpar-filtros': function () { S.filtros = { periodo: S.filtros.periodo, inicio: S.filtros.inicio, fim: S.filtros.fim, canal: '', tema: '', tipo: '', autorizacao: '' }; render(); },
    'filtrar-tema': function (b) { S.filtros.tema = b.dataset.v; render(); avisar('Filtro aplicado: ' + nomeTema(b.dataset.v)); },
    'ir-revisao': function () { S.aba = 'mensagens'; S.soNaoRevisadas = true; render(); },
    'ir-pauta': function () { S.aba = 'relatorios'; S.rel.tipo = 'pauta'; render(); window.scrollTo(0, 0); },
    gran: function (b) { S.gran = b.dataset.v; render(); },
    mais: function () { S.limite += 40; if (S.aba === 'mensagens') renderListaMensagens(); else render(); },
    sub: function (b) { S[b.dataset.k] = b.dataset.v; S.limite = 40; render(); },
    'confirmar-class': function (b) {
      if (!pode('editar')) return;
      var m = acharMsg(b.dataset.id);
      var tipo = document.getElementById('ct-' + m.id).value, tema = document.getElementById('cm-' + m.id).value;
      var mudou = tipo !== m.tipo || tema !== m.tema;
      registrar(mudou ? 'Corrigiu classificação' : 'Confirmou classificação', 'Msg ' + m.id + ': ' + nomeTipo(m.tipo) + ' / ' + nomeTema(m.tema) + (mudou ? ' → ' + nomeTipo(tipo) + ' / ' + nomeTema(tema) : ''));
      m.tipo = tipo; m.tema = tema; m.revisado = true;
      if (ehProva(m) && !m.aut) m.aut = { status: 'nao_solicitada', confirmadoPor: '', data: null };
      avisar('Classificação salva como revisada.');
      renderListaMensagens();
    },
    'registrar-aut': function (b) {
      if (!pode('editar')) return;
      var alvo = b.dataset.alvo === 'msg' ? acharMsg(b.dataset.id) : acharFoto(b.dataset.id);
      var st = document.getElementById('as-' + alvo.id).value, por = document.getElementById('ap-' + alvo.id).value;
      var erro = document.getElementById('ae-' + alvo.id);
      if ((st === 'uso_interno' || st === 'divulgacao') && !por) {
        erro.textContent = 'Informe quem confirmou a autorização antes de registrar.';
        erro.hidden = false;
        return;
      }
      alvo.aut = { status: st, confirmadoPor: st === 'uso_interno' || st === 'divulgacao' ? por : '', data: Date.now() };
      if (st !== 'divulgacao' && alvo.prontaDivulgacao) alvo.prontaDivulgacao = false;
      registrar('Registrou autorização', (b.dataset.alvo === 'msg' ? 'Msg ' : 'Foto ') + alvo.id + ': ' + AUT[st] + (por ? ' (confirmado por ' + por + ')' : ''));
      avisar('Autorização registrada.');
      render();
    },
    'abrir-editor': function (b) { abrirEditor(b.dataset.id); },
    'fechar-editor': function () { S.editor = null; renderEditor(); },
    'ed-sugestao': function () { var E = S.editor; E.areas = E.foto.sugestaoRosto.map(function (r) { return Object.assign({}, r); }); E.previa = null; renderEditor(); },
    'ed-limpar': function () { S.editor.areas = []; S.editor.previa = null; renderEditor(); },
    'ed-previa': function () { gerarPrevia(); renderEditor(); },
    'ed-salvar': function () {
      var E = S.editor;
      E.foto.derivada = E.previa;
      E.foto.derivadaInfo = { quando: Date.now(), areas: E.areas.length };
      registrar('Criou cópia tratada', 'Foto ' + E.foto.id + ' · ' + E.areas.length + ' área(s) desfocada(s); original mantido');
      S.editor = null;
      renderEditor();
      avisar('Cópia tratada salva. O original foi mantido.');
      render();
    },
    'baixar-derivada': function (b) {
      if (!pode('exportar')) return;
      var f = acharFoto(b.dataset.id);
      registrar('Baixou cópia tratada', 'Foto ' + f.id);
      fetch(f.derivada).then(function (r) { return r.blob(); }).then(function (bl) { U.baixar((S.modo === 'demo' ? 'FICTICIO-' : '') + 'copia-tratada-' + f.id + '.png', bl); });
    },
    'pronta-divulgacao': function (b) {
      if (!pode('editar')) return;
      var f = acharFoto(b.dataset.id);
      f.prontaDivulgacao = !f.prontaDivulgacao;
      registrar(f.prontaDivulgacao ? 'Marcou foto como pronta para divulgação' : 'Desmarcou foto para divulgação', 'Foto ' + f.id);
      render();
    },
    'foto-adicionar': function () {
      var inp = document.getElementById('foto-arquivo');
      var file = inp && inp.files[0];
      if (!file) { avisar('Escolha um arquivo de imagem primeiro.'); return; }
      var fr = new FileReader();
      fr.onload = function () {
        var c = S.dados.import;
        var id = 'if' + (c.midias.length + 1);
        c.midias.push({ id: id, origem: 'import', alunaId: document.getElementById('foto-aluna').value, descricao: document.getElementById('foto-desc').value || file.name, data: Date.now(), original: fr.result, ocultarRosto: true, derivada: null, derivadaInfo: null, prontaDivulgacao: false, aut: { status: 'nao_solicitada', confirmadoPor: '', data: null } });
        registrar('Adicionou foto', id + ' (só na memória da aba)');
        render();
      };
      fr.readAsDataURL(file);
    },
    'rel-html': function () {
      if (!pode('exportar')) return;
      var r = construirRelatorio();
      var doc = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Relatório</title><style>body{font:15px/1.55 system-ui,sans-serif;max-width:48rem;margin:2rem auto;padding:0 1rem;color:#1f1a1d}h2,h3{line-height:1.2}h3{margin-top:1.8rem;color:#8a1d4d}table{border-collapse:collapse;width:100%;margin:.5rem 0 1rem}th,td{border-bottom:1px solid #ddd;padding:.35rem .5rem;text-align:left;vertical-align:top}.rel-demo{background:#fff1c2;border:2px dashed #8a6500;padding:.5rem;font-weight:700;text-align:center}.rel-meta,.rel-lista span{color:#5b5157;font-size:.9em}.pauta>li{margin-bottom:1rem}.pauta-campos div{display:grid;grid-template-columns:11rem 1fr;gap:.6rem}.pauta-campos dt{color:#6c5f66;font-size:.85em}.pauta-campos dd{margin:0}.objecao{border-left:2px solid #a3245c;padding-left:.8rem;margin:.8rem 0}.objecao p{margin:.2rem 0}.objecao-nome{font-weight:700}.rel-lista li{margin-bottom:.5rem}</style></head><body>' + r.html + '</body></html>';
      registrar('Exportou relatório (.html)', S.rel.tipo);
      U.baixar((S.modo === 'demo' ? 'FICTICIO-' : '') + 'relatorio-' + U.chaveDia(Date.now()) + '.html', doc, 'text/html');
      render();
    },
    'rel-csv': function () {
      if (!pode('exportar')) return;
      var r = construirRelatorio();
      registrar('Exportou planilha (.csv)', S.rel.tipo);
      U.baixar((S.modo === 'demo' ? 'FICTICIO-' : '') + 'relatorio-' + U.chaveDia(Date.now()) + '.csv', csvTexto(r.csv), 'text/csv');
      render();
    },
    'rel-copiar': function () {
      if (!pode('exportar')) return;
      var r = construirRelatorio();
      U.copiar(r.texto, function () { registrar('Copiou relatório', S.rel.tipo); avisar('Texto copiado.'); }, function () { avisar('Não foi possível copiar automaticamente neste navegador.'); });
    },
    'resumo-copiar': function () {
      var dia = S.diaResumo ? U.deChave(S.diaResumo) : U.inicioDia(refFim());
      var r = calcularResumo(dia);
      var txt = (S.modo === 'demo' ? '*** DADOS FICTÍCIOS ***\n' : '') + 'Resumo do dia ' + U.fmtDataAno(dia) + '\n\n' + r.destaques.map(function (d) { return '• ' + textoPlano(d); }).join('\n') +
        (r.atencao.length ? '\n\nPede atenção:\n' + r.atencao.map(function (d) { return '• ' + textoPlano(d); }).join('\n') : '');
      U.copiar(txt, function () { registrar('Copiou resumo do dia', U.fmtDataAno(dia)); avisar('Resumo copiado.'); }, function () { avisar('Não foi possível copiar automaticamente neste navegador.'); });
    },
    'modelo-csv': function () { U.baixar('modelo-importacao.csv', P.importadores.MODELO_CSV, 'text/csv'); },
    'imp-confirmar': function () { confirmarImportacao(); },
    'imp-cancelar': function () { S.impPrevia = null; render(); },
    'imp-limpar-pedir': function () { S.confirmarLimpeza = true; render(); },
    'imp-limpar-cancelar': function () { S.confirmarLimpeza = false; render(); },
    'imp-limpar': function () {
      S.dados.import = { alunas: {}, mensagens: [], midias: [] };
      S.confirmarLimpeza = false;
      registrar('Apagou dados importados', 'Memória da aba');
      avisar('Dados importados apagados desta aba.');
      render();
    },
    'tema-salvar': function (b) {
      if (!pode('admin')) return;
      var t = S.temas.find(function (x) { return x.id === b.dataset.id; });
      t.nome = document.getElementById('tn-' + t.id).value.trim() || t.nome;
      t.palavras = document.getElementById('tp-' + t.id).value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      t.ideia = document.getElementById('ti-' + t.id).value.trim();
      t.natureza = document.getElementById('tz-' + t.id).value;
      if (t.natureza === 'entrega') t.acao = document.getElementById('ta-' + t.id).value.trim();
      else t.angulo = document.getElementById('ta-' + t.id).value.trim();
      registrar('Editou assunto', t.nome);
      avisar('Assunto salvo.');
      render();
    },
    'tema-remover': function (b) {
      if (!pode('admin')) return;
      var id = b.dataset.id;
      var t = S.temas.find(function (x) { return x.id === id; });
      S.temas = S.temas.filter(function (x) { return x.id !== id; });
      ['demo', 'import'].forEach(function (k) { var c = S.dados[k]; if (c) c.mensagens.forEach(function (m) { if (m.tema === id) { m.tema = 'outros'; m.revisado = false; } }); });
      if (S.filtros.tema === id) S.filtros.tema = '';
      registrar('Removeu assunto', t.nome + ' (mensagens foram para "Outros assuntos" e voltaram para revisão)');
      render();
    },
    'tema-adicionar': function () {
      if (!pode('admin')) return;
      var nome = document.getElementById('tema-novo').value.trim();
      if (!nome) return;
      var id = 'tema-' + Date.now().toString(36);
      S.temas.splice(S.temas.length - 1, 0, { id: id, nome: nome, natureza: 'conteudo', palavras: [], ideia: '', angulo: '' });
      registrar('Criou assunto', nome);
      render();
    },
    'obj-salvar': function (b) {
      if (!pode('admin')) return;
      var o = S.objecoes.find(function (x) { return x.id === b.dataset.id; });
      o.nome = document.getElementById('on-' + o.id).value.trim() || o.nome;
      o.palavras = document.getElementById('op-' + o.id).value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      o.quebra = document.getElementById('oq-' + o.id).value.trim();
      registrar('Editou objeção', o.nome);
      avisar('Objeção salva.');
      render();
    },
    'obj-remover': function (b) {
      if (!pode('admin')) return;
      var o = S.objecoes.find(function (x) { return x.id === b.dataset.id; });
      S.objecoes = S.objecoes.filter(function (x) { return x.id !== o.id; });
      registrar('Removeu objeção', o.nome);
      render();
    },
    'obj-adicionar': function () {
      if (!pode('admin')) return;
      var nome = document.getElementById('obj-nova').value.trim();
      if (!nome) return;
      S.objecoes.push({ id: 'obj-' + Date.now().toString(36), nome: nome, palavras: [], temas: [], quebra: '' });
      registrar('Criou objeção', nome);
      avisar('Objeção criada. Agora preencha as palavras-chave e clique em Salvar.');
      render();
    },
    reclassificar: function () {
      if (!pode('admin')) return;
      var n = 0;
      conj().mensagens.forEach(function (m) {
        if (m.revisado || m.equipe) return;
        var a = C.classificar(m.texto, S.temas);
        m.auto = a; m.tipo = a.tipo; m.tema = a.tema; n++;
      });
      registrar('Reclassificou mensagens', n + ' mensagens não revisadas');
      avisar(n + ' mensagens reclassificadas. As revisadas não mudaram.');
      render();
    },
    'equipe-adicionar': function () {
      if (!pode('admin')) return;
      var n = document.getElementById('equipe-novo').value.trim();
      if (!n || S.equipe.indexOf(n) !== -1) return;
      S.equipe.push(n);
      registrar('Adicionou pessoa à equipe', n);
      render();
    },
    'equipe-remover': function (b) {
      if (!pode('admin')) return;
      var n = S.equipe.splice(+b.dataset.i, 1)[0];
      registrar('Removeu pessoa da equipe', n);
      render();
    }
  };

  var MUDANCAS = {
    filtro: function (el) { S.filtros[el.dataset.k] = el.value; S.limite = 40; render(); },
    papel: function (el) { S.papel = el.value; registrar('Trocou função (simulação)', PAPEIS[S.papel].nome); render(); },
    'so-nao-rev': function (el) { S.soNaoRevisadas = el.checked; S.limite = 40; renderListaMensagens(); },
    'dia-resumo': function (el) { S.diaResumo = el.value; render(); },
    'rel-tipo': function (el) { S.rel.tipo = el.value; render(); },
    'rel-rev': function (el) { S.rel.soRevisadas = el.checked; render(); },
    'rel-secao': function (el) { S.rel.secoes[el.dataset.k] = el.checked; render(); },
    'imp-origem': function (el) { S.impOrigem = el.value; S.impPrevia = null; render(); },
    'imp-canal': function (el) { S.impCanal = el.value; },
    'imp-arquivo': function (el) { if (el.files[0]) lerArquivoImportacao(el.files[0]); },
    'imp-equipe': function (el) { S.impPrevia.equipe[el.dataset.nome] = el.checked; },
    'ocultar-rosto': function (el) { if (!pode('editar')) return; var f = acharFoto(el.dataset.id); f.ocultarRosto = el.checked; registrar('Alterou exigência de rosto oculto', 'Foto ' + f.id + ': ' + (el.checked ? 'sim' : 'não')); render(); },
    'ed-bloco': function (el) { S.editor.bloco = +el.value; S.editor.previa = null; renderEditor(); }
  };

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-acao]');
    if (!b || b.disabled) return;
    var fn = ACOES[b.dataset.acao];
    if (fn) { e.preventDefault(); fn(b, e); }
  });
  document.addEventListener('change', function (e) {
    var el = e.target.closest('[data-mudar]');
    if (!el) return;
    var fn = MUDANCAS[el.dataset.mudar];
    if (fn) fn(el, e);
  });
  var tBusca;
  document.addEventListener('input', function (e) {
    if (e.target.id !== 'busca') return;
    S.busca = e.target.value;
    S.limite = 40;
    clearTimeout(tBusca);
    tBusca = setTimeout(renderListaMensagens, 150);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && S.editor) { S.editor = null; renderEditor(); }
  });
  var tResize;
  window.addEventListener('resize', function () { clearTimeout(tResize); tResize = setTimeout(desenharGrafico, 120); });

  /* ---------- início ---------- */

  S.dados.demo = P.demo.gerar(S.temas, S.equipe);
  if (/^#(visao|resumo|dores|resultados|ideias|ajuda|mensagens|relatorios|importar|config)$/.test(location.hash)) S.aba = location.hash.slice(1);
  render();
})(window.Painel);

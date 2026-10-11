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
    { id: 'visao', nome: 'Visão geral', grupo: 'Acompanhar' },
    { id: 'dia', nome: 'Conversas do dia', grupo: 'Acompanhar' },
    { id: 'dores', nome: 'Dores e objeções', grupo: 'Entender' },
    { id: 'resultados', nome: 'Resultados e antes e depois', grupo: 'Entender' },
    { id: 'ideias', nome: 'Ideias de conteúdo', grupo: 'Criar' },
    { id: 'prints', nome: 'Prints para o Instagram', grupo: 'Criar' },
    { id: 'ajuda', nome: 'Como ajudar mais', grupo: 'Cuidar' },
    { id: 'mensagens', nome: 'Mensagens e revisão', grupo: 'Dados' },
    { id: 'importar', nome: 'Importar dados', grupo: 'Dados' },
    { id: 'relatorios', nome: 'Relatórios', grupo: 'Dados' },
    { id: 'config', nome: 'Configurações', grupo: '' }
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
    dados: { demo: null, import: { alunas: {}, mensagens: [], midias: [], prints: [], chaves: {}, arquivos: [] } },
    filtros: { periodo: '30', inicio: '', fim: '', canal: '', tema: '', tipo: '', autorizacao: '' },
    busca: '',
    soNaoRevisadas: false,
    limite: 40,
    gran: 'dia',
    diaResumo: '',
    conv: { mostrar: 'perguntas', semResposta: false },
    subPrints: 'aguardando',
    compositor: null,
    rel: { tipo: 'pauta', soRevisadas: true, secoes: { numeros: true, temas: true, dores: true, depoimentos: true } },
    impOrigem: 'whatsapp',
    impCanal: 'whatsapp',
    impPrevia: null,
    seqImport: 0,
    auditoria: [],
    editor: null,
    confirmarLimpeza: false,
    prefs: null,
    visAtual: '',
    menuAberto: false,
    filtrosAbertos: false,
    calculadoEm: Date.now(),
    verTodosAssuntos: false,
    confirmarRedefinir: false,
    modalAtivo: '',
    soSemResposta: false
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

  function respostaDe(m) { return m.resposta ? acharMsg(m.resposta) : null; }

  function prontoDivulgacao(m) { return m.revisado && m.aut && m.aut.status === 'divulgacao' && !!m.aut.confirmadoPor; }

  // Análise completa do período (pauta, objeções, resultados, interação, sugestões).
  function analisar(lista, anterior, iv) {
    return P.pauta.construir({
      lista: lista, anterior: anterior, todas: conj().mensagens, iv: iv,
      temas: S.temas, objecoes: S.objecoes, resultados: S.resultados,
      textoSeguro: textoSeguro, nomeTema: nomeTema, pronto: prontoDivulgacao,
      respostaDe: respostaDe, textoEquipe: function (m) { return PRIV.mascararNomes(m.texto, alunasAtuais()); },
      sinais: A.sinaisAlunas(msgsAlunas(), S.temas, iv[1])
    });
  }
  function analisePeriodo() {
    var iv = intervalo();
    return { iv: iv, lista: filtrar(msgsAlunas(), iv), r: analisar(filtrar(msgsAlunas(), iv), filtrar(msgsAlunas(), intervaloAnterior(iv)), iv) };
  }

  /* ---------- Indicadores e preferências ---------- */

  // Só indicadores que dá para calcular com os dados existentes.
  // sentido: 'ruim' (subir é pior), 'bom' (subir é melhor) ou 'neutro'.
  var INDICADORES = {
    msgs: { nome: 'Mensagens das alunas', un: 'mensagens', sentido: 'neutro', conta: function () { return true; }, desc: 'Tudo o que as alunas escreveram no período (sem a equipe).' },
    duvidas: { nome: 'Dúvidas', un: 'mensagens', sentido: 'neutro', conta: function (m) { return m.tipo === 'duvida'; }, desc: 'Mensagens classificadas como dúvida.' },
    dores: { nome: 'Queixas e dificuldades', un: 'mensagens', sentido: 'ruim', conta: function (m) { return m.tipo === 'queixa' || m.tipo === 'dificuldade'; }, desc: 'O que trava ou incomoda as alunas.' },
    queixas: { nome: 'Queixas', un: 'mensagens', sentido: 'ruim', conta: function (m) { return m.tipo === 'queixa'; }, desc: 'Reclamações sobre acesso, atendimento ou programa.' },
    objecoes: { nome: 'Mensagens com objeção', un: 'mensagens', sentido: 'ruim', conta: function (m) { return !ehProva(m) && A.detectar(m.texto, S.objecoes).length > 0; }, desc: 'Mensagens com alguma das objeções cadastradas em Configurações.' },
    depoimentos: { nome: 'Depoimentos positivos', un: 'mensagens', sentido: 'bom', conta: function (m) { return m.tipo === 'depoimento'; }, desc: 'Elogios e relatos de experiência na comunidade.' },
    evolucao: { nome: 'Relatos de evolução', un: 'mensagens', sentido: 'bom', conta: function (m) { return m.tipo === 'evolucao'; }, desc: 'Resultados contados pelas alunas.' },
    semResposta: { nome: 'Perguntas sem resposta registrada', un: 'mensagens', sentido: 'ruim', conta: function (m) { return ehDor(m) && !m.resposta; }, desc: 'Dúvidas, dificuldades e queixas sem resposta da equipe nos arquivos importados.' },
    naoRevisadas: { nome: 'Classificações sem revisão', un: 'mensagens', sentido: 'ruim', conta: function (m) { return !m.revisado; }, desc: 'Mensagens que ainda têm só a sugestão automática.' },
    autorizados: { nome: 'Relatos autorizados para divulgação', un: 'mensagens', sentido: 'bom', conta: prontoDivulgacao, desc: 'Depoimentos e relatos revisados, com autorização e quem confirmou.' },
    alunas: { nome: 'Alunas que escreveram', un: 'alunas', sentido: 'neutro', desc: 'Pessoas diferentes que mandaram mensagem no período.',
      calc: function (l) { var s = {}; l.forEach(function (m) { if (m.alunaId) s[m.alunaId] = 1; }); return Object.keys(s).length; } },
    taxaResposta: { nome: 'Perguntas com resposta registrada', un: '%', sentido: 'bom', desc: 'Parte das dúvidas, dificuldades e queixas que têm resposta da equipe nos arquivos.',
      calc: function (l) { var d = l.filter(ehDor); return d.length ? Math.round(100 * d.filter(function (m) { return m.resposta; }).length / d.length) : null; } },
    tempoResposta: { nome: 'Tempo mediano até a resposta', un: 'min', sentido: 'ruim', desc: 'Metade das perguntas foi respondida em até esse tempo (só as que têm resposta registrada).',
      calc: function (l) {
        var t = l.filter(function (m) { return ehDor(m) && m.resposta; }).map(function (m) { var r = respostaDe(m); return r ? (r.data - m.data) / 60000 : null; }).filter(function (x) { return x != null && x >= 0; }).sort(function (a, b) { return a - b; });
        if (!t.length) return null;
        var k = Math.floor(t.length / 2);
        return Math.round(t.length % 2 ? t[k] : (t[k - 1] + t[k]) / 2);
      } },
    printsAguardando: { nome: 'Prints aguardando aprovação', un: 'prints', sentido: 'neutro', agora: true, desc: 'Prints prontos esperando você aprovar (situação de agora, não do período).',
      calc: function () { return (conj().prints || []).filter(function (p) { return p.status === 'aguardando'; }).length; } }
  };

  function valorIndicador(id, lista) {
    var ind = INDICADORES[id];
    if (ind.calc) return ind.calc(lista);
    return lista.filter(ind.conta).length;
  }

  function fmtIndicador(id, v) {
    if (v == null) return '—';
    var un = INDICADORES[id].un;
    if (un === '%') return v + '%';
    if (un === 'min') return v < 60 ? v + ' min' : (v / 60).toFixed(1).replace('.', ',') + ' h';
    return U.fmtNum(v);
  }

  var SECOES_VISAO = [
    { id: 'alertas', nome: 'Pede atenção agora', cheia: true },
    { id: 'indicadores', nome: 'Indicadores', cheia: true },
    { id: 'grafico', nome: 'Evolução no período', cheia: true },
    { id: 'assuntos', nome: 'Assuntos recorrentes' },
    { id: 'objecoes', nome: 'Objeções mais citadas' },
    { id: 'ideias', nome: 'Ideias de conteúdo' },
    { id: 'interacao', nome: 'O que mais gerou conversa no grupo' },
    { id: 'alunas', nome: 'Alunas que pedem um olhar' },
    { id: 'tipos', nome: 'Tipo de conteúdo', oculta: true }
  ];

  function prefsPadrao() {
    return {
      indicadores: ['msgs', 'dores', 'objecoes', 'semResposta', 'evolucao', 'depoimentos'],
      secoes: SECOES_VISAO.map(function (s) { return { id: s.id, visivel: !s.oculta }; }),
      periodo: '30',
      metrica: 'msgs'
    };
  }

  // Preferências ficam no navegador e não contêm dados das alunas: só ids de indicadores, seções e filtros.
  var CHAVE_PREFS = 'painel-acompanhamento-visualizacoes-v1';
  function lerVisualizacoes() {
    try { var x = JSON.parse(localStorage.getItem(CHAVE_PREFS)); return x && x.lista ? x : { padrao: '', lista: {} }; } catch (e) { return { padrao: '', lista: {} }; }
  }
  function gravarVisualizacoes(v) {
    try { localStorage.setItem(CHAVE_PREFS, JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function aplicarVisualizacao(v) {
    var base = prefsPadrao();
    S.prefs = {
      indicadores: (v.prefs.indicadores || base.indicadores).filter(function (id) { return INDICADORES[id]; }),
      secoes: SECOES_VISAO.map(function (s) { var x = (v.prefs.secoes || []).find(function (y) { return y.id === s.id; }); return { id: s.id, visivel: x ? !!x.visivel : !s.oculta, _ordem: x ? (v.prefs.secoes || []).indexOf(x) : 99 }; })
        .sort(function (a, b) { return a._ordem - b._ordem; }).map(function (s) { return { id: s.id, visivel: s.visivel }; }),
      periodo: v.prefs.periodo || base.periodo,
      metrica: INDICADORES[v.prefs.metrica] ? v.prefs.metrica : base.metrica
    };
    var f = v.filtros || {};
    S.filtros = { periodo: f.periodo || S.prefs.periodo, inicio: f.inicio || '', fim: f.fim || '', canal: f.canal || '', tema: S.temas.some(function (t) { return t.id === f.tema; }) ? f.tema : '', tipo: f.tipo || '', autorizacao: f.autorizacao || '' };
  }

  // Alertas por regra: só aparecem quando há dado que os sustente.
  function calcularAlertas(atual, anterior, r) {
    var out = [];
    var dorA = U.contarPor(atual.filter(ehDor), 'tema'), dorB = U.contarPor(anterior.filter(ehDor), 'tema');
    var subindo = Object.keys(dorA).filter(function (t) { var b = dorB[t] || 0; return dorA[t] >= 5 && b > 0 && (dorA[t] - b) / b >= 0.3; })
      .sort(function (x, y) { return (dorA[y] - (dorB[y] || 0)) - (dorA[x] - (dorB[x] || 0)); });
    if (subindo.length) {
      var t0 = subindo[0], p0 = Math.round((dorA[t0] - dorB[t0]) / dorB[t0] * 100);
      out.push({ nivel: 'atencao', texto: '<strong>' + esc(nomeTema(t0)) + '</strong> está crescendo: ' + dorA[t0] + ' dúvidas e dificuldades (+' + p0 + '% vs. período anterior).', rotulo: 'Ver dores', destino: 'dores' });
    }
    var objSub = r.objecoes.filter(function (o) { return o.n >= 5 && o.antes > 0 && (o.n - o.antes) / o.antes >= 0.3; });
    if (objSub.length) out.push({ nivel: 'atencao', texto: 'A objeção <strong>"' + esc(objSub[0].obj.nome) + '"</strong> subiu: ' + objSub[0].n + ' menções (antes: ' + objSub[0].antes + ').', rotulo: 'Ver objeções', destino: 'dores' });
    var semResp = atual.filter(function (m) { return ehDor(m) && !m.resposta; }).length;
    if (semResp) out.push({ nivel: 'atencao', texto: '<strong>' + semResp + '</strong> pergunta(s) do período sem resposta registrada nos arquivos.', rotulo: 'Ver conversas', destino: 'dia-sem-resposta' });
    var sinais = A.sinaisAlunas(msgsAlunas(), S.temas, refFim()).filter(function (s) { return s.tipo === 'dificuldade'; }).length;
    if (sinais) out.push({ nivel: 'atencao', texto: '<strong>' + sinais + '</strong> aluna(s) com dificuldade repetida na última semana.', rotulo: 'Ver quem', destino: 'ajuda' });
    var ag = (conj().prints || []).filter(function (p) { return p.status === 'aguardando'; }).length;
    if (ag) out.push({ nivel: 'info', texto: '<strong>' + ag + '</strong> print(s) aguardando a sua aprovação.', rotulo: 'Aprovar', destino: 'prints' });
    var nr = atual.filter(function (m) { return !m.revisado; }).length;
    if (nr) out.push({ nivel: 'info', texto: '<strong>' + nr + '</strong> classificação(ões) automática(s) sem revisão no período.', rotulo: 'Revisar', destino: 'revisao' });
    return out;
  }

  // Minigráfico de tendência (contagem por dia, ou por semana em períodos longos).
  function sparkline(id, lista, iv) {
    var ind = INDICADORES[id];
    if (!ind.conta && id !== 'alunas') return '';
    var dias = Math.round((iv[1] - iv[0]) / U.DIA);
    var semanal = dias > 62;
    var passo = semanal ? U.inicioSemana : U.inicioDia;
    var chaves = [], idx = {};
    for (var t = passo(iv[0]); t <= iv[1]; t = U.somarDias(t, semanal ? 7 : 1)) { idx[U.chaveDia(t)] = chaves.length; chaves.push(0); }
    if (chaves.length < 2) return '';
    var vistos = {};
    lista.forEach(function (m) {
      var i = idx[U.chaveDia(passo(m.data))];
      if (i == null) return;
      if (id === 'alunas') { var k = i + ':' + m.alunaId; if (!m.alunaId || vistos[k]) return; vistos[k] = 1; chaves[i]++; }
      else if (ind.conta(m)) chaves[i]++;
    });
    var w = 120, h = 28, max = Math.max.apply(null, chaves) || 1;
    var pts = chaves.map(function (v, i) { return (i * w / (chaves.length - 1)).toFixed(1) + ',' + (h - 3 - v / max * (h - 6)).toFixed(1); });
    var ult = pts[pts.length - 1].split(',');
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true" preserveAspectRatio="none"><polyline points="' + pts.join(' ') + '" style="fill:none;stroke:var(--muted);stroke-width:1.5;vector-effect:non-scaling-stroke"></polyline>' +
      '<circle cx="' + ult[0] + '" cy="' + ult[1] + '" r="2.5" style="fill:var(--accent)"></circle></svg>';
  }

  function textoPeriodo(iv) {
    var dias = Math.round((iv[1] - iv[0]) / U.DIA);
    return U.fmtDataAno(iv[0]) + ' a ' + U.fmtDataAno(iv[1]) + ' · ' + dias + ' dia' + (dias > 1 ? 's' : '');
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
    return '<span class="chip chip-auto" title="Classificação automática por palavras-chave, confiança ' + conf + '. Confira e confirme em Mensagens e revisão.">Não revisada</span>';
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

    var ultima = 0;
    conj().mensagens.forEach(function (m) { if (m.data > ultima) ultima = m.data; });
    document.getElementById('status-dados').textContent = (S.modo === 'demo' ? 'Exemplo fictício' : 'Dados importados') +
      (ultima ? ' · mensagens até ' + U.fmtDataHora(ultima) : ' · sem mensagens') + ' · análises às ' + U.fmtHora(S.calculadoEm);

    var faixa = document.getElementById('faixa');
    if (S.modo === 'demo') {
      faixa.className = 'faixa faixa-demo';
      faixa.innerHTML = '<strong>Dados fictícios.</strong> Pessoas, mensagens e imagens são exemplos. Login e permissões são simulados.';
    } else {
      faixa.className = 'faixa faixa-import';
      faixa.innerHTML = '<strong>Dados importados.</strong> Ficam só nesta aba e somem ao recarregar. Login e permissões são simulados.';
    }

    var aguardando = (conj().prints || []).filter(function (x) { return x.status === 'aguardando'; }).length;
    var grupos = [];
    ABAS.forEach(function (a) { var g = grupos.find(function (x) { return x.nome === a.grupo; }); if (!g) grupos.push(g = { nome: a.grupo, abas: [] }); g.abas.push(a); });
    var nav = document.getElementById('nav');
    nav.innerHTML = grupos.map(function (g) {
      return '<div class="nav-grupo">' + (g.nome ? '<span class="nav-titulo">' + esc(g.nome) + '</span>' : '') + g.abas.map(function (a) {
        var extra = a.id === 'prints' && aguardando ? '<span class="nav-cont" aria-label="' + aguardando + ' aguardando aprovação">' + aguardando + '</span>' : '';
        return '<button type="button" class="nav-item" data-acao="aba" data-v="' + a.id + '"' + (a.id === S.aba ? ' aria-current="page"' : '') + '>' + esc(a.nome) + extra + '</button>';
      }).join('') + '</div>';
    }).join('');
    nav.classList.toggle('aberto', !!S.menuAberto);
    var bm = document.getElementById('menu-btn');
    bm.setAttribute('aria-expanded', String(!!S.menuAberto));
    var atual = ABAS.find(function (a) { return a.id === S.aba; });
    bm.querySelector('.menu-atual').textContent = atual ? atual.nome : 'Menu';
  }

  function filtrosVisiveis() { return ['visao', 'dia', 'dores', 'resultados', 'ideias', 'ajuda', 'mensagens', 'relatorios'].indexOf(S.aba) !== -1; }

  var PERIODOS = [['7', '7 dias'], ['14', '14 dias'], ['30', '30 dias'], ['60', '60 dias'], ['tudo', 'Tudo'], ['custom', 'Escolher datas']];

  function renderFiltros() {
    var el = document.getElementById('filtros');
    if (!filtrosVisiveis() || !conj().mensagens.length) { el.innerHTML = ''; return; }
    var f = S.filtros;
    var nomesF = { canal: 'Canal', tema: 'Assunto', tipo: 'Tipo', autorizacao: 'Autorização' };
    var valores = { canal: CANAIS, tema: mapaTemas(), tipo: mapaTipos(), autorizacao: AUT };
    var ativos = Object.keys(nomesF).filter(function (k) { return f[k]; });
    var noDia = S.aba === 'dia';
    var h = '<div class="barra-filtros" role="region" aria-label="Período e filtros">';
    if (noDia) h += '<span class="periodo-txt">Período: o dia escolhido abaixo</span>';
    else {
      h += '<div class="periodos" role="group" aria-label="Período">' + PERIODOS.map(function (p) {
        return '<button type="button" class="chip-periodo" data-acao="periodo" data-v="' + p[0] + '" aria-pressed="' + (f.periodo === p[0]) + '">' + p[1] + '</button>';
      }).join('') + '</div>';
      if (f.periodo === 'custom') h += '<div class="datas"><label class="campo campo-peq"><span>De</span><input type="date" id="f-inicio" data-mudar="filtro" data-k="inicio" value="' + esc(f.inicio) + '"></label>' +
        '<label class="campo campo-peq"><span>Até</span><input type="date" id="f-fim" data-mudar="filtro" data-k="fim" value="' + esc(f.fim) + '"></label></div>';
      h += '<span class="periodo-txt">' + textoPeriodo(intervalo()) + '</span>';
    }
    h += '<button type="button" class="btn btn-sec btn-peq" data-acao="toggle-filtros" aria-expanded="' + !!S.filtrosAbertos + '" aria-controls="filtros-mais">Filtros' + (ativos.length ? ' (' + ativos.length + ')' : '') + '</button>';
    if (ativos.length) {
      h += '<div class="filtros-ativos" aria-label="Filtros ativos">' + ativos.map(function (k) {
        return '<button type="button" class="chip-filtro" data-acao="remover-filtro" data-k="' + k + '" aria-label="Remover filtro ' + nomesF[k] + ': ' + esc(valores[k][f[k]] || f[k]) + '">' + nomesF[k] + ': ' + esc(valores[k][f[k]] || f[k]) + ' <span aria-hidden="true">×</span></button>';
      }).join('') + '<button type="button" class="link" data-acao="limpar-filtros">Limpar filtros</button></div>';
    }
    h += '<div class="filtros-mais" id="filtros-mais"' + (S.filtrosAbertos ? '' : ' hidden') + '>' +
      campoSelect('f-canal', 'Canal', 'canal', CANAIS, f.canal, 'Todos') +
      campoSelect('f-tema', 'Assunto', 'tema', mapaTemas(), f.tema, 'Todos') +
      campoSelect('f-tipo', 'Tipo de mensagem', 'tipo', mapaTipos(), f.tipo, 'Todos') +
      campoSelect('f-aut', 'Autorização', 'autorizacao', AUT, f.autorizacao, 'Qualquer') + '</div>';
    el.innerHTML = h + '</div>';
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
    var fn = { visao: abaVisao, dia: abaDia, prints: abaPrints, dores: abaDores, resultados: abaResultados, ideias: abaIdeias, ajuda: abaAjuda, mensagens: abaMensagens, relatorios: abaRelatorios, importar: abaImportar, config: abaConfig }[S.aba];
    el.innerHTML = fn();
    if (S.aba === 'visao') desenharGrafico();
    if (S.aba === 'mensagens') renderListaMensagens();
  }

  /* ---------- Visão geral ---------- */

  function abaVisao() {
    var iv = intervalo(), ant = intervaloAnterior(iv);
    var atual = filtrar(msgsAlunas(), iv), anterior = filtrar(msgsAlunas(), ant);
    var r = analisar(atual, anterior, iv);
    var periodo = textoPeriodo(iv);
    var vis = lerVisualizacoes();
    var nomes = Object.keys(vis.lista);

    var h = '<div class="cabeca-aba cabeca-linha"><div><h1>Visão geral</h1><p class="sub">O que as alunas trouxeram de ' + periodo + '. Mensagens da equipe não entram nas contagens.</p></div>' +
      '<div class="ferramentas" role="group" aria-label="Personalização">' +
      (nomes.length ? '<label class="campo campo-peq"><span>Visualização</span><select id="vis-atual" data-mudar="vis-aplicar">' + opcoes(nomes.reduce(function (o, n) { o[n] = n + (vis.padrao === n ? ' (abre sempre)' : ''); return o; }, {}), S.visAtual || '', 'Atual (não salva)') + '</select></label>' : '') +
      '<button type="button" class="btn btn-sec btn-peq" data-acao="personalizar" title="Escolha e ordene indicadores e seções">Personalizar painel</button>' +
      '<button type="button" class="btn btn-sec btn-peq" data-acao="salvar-vis" title="Guarda indicadores, seções, período e filtros neste navegador">Salvar visualização</button>' +
      '</div></div>';

    var blocos = {
      alertas: function () {
        var al = calcularAlertas(atual, anterior, r);
        if (!al.length) return '<p class="sub">Nada fora do normal no período.</p>';
        return '<ul class="alertas">' + al.map(function (x) {
          return '<li class="alerta alerta-' + x.nivel + '"><span class="alerta-icone" aria-hidden="true">' + (x.nivel === 'atencao' ? '!' : 'i') + '</span>' +
            '<span class="sr">' + (x.nivel === 'atencao' ? 'Atenção: ' : 'Informação: ') + '</span><span class="alerta-texto">' + x.texto + '</span>' +
            '<button type="button" class="link" data-acao="ir-alerta" data-v="' + x.destino + '">' + esc(x.rotulo) + '</button></li>';
        }).join('') + '</ul><p class="nota-peq">Alertas gerados por regras a partir dos dados do período.</p>';
      },
      indicadores: function () {
        return '<div class="kpis">' + S.prefs.indicadores.map(function (id) {
          var ind = INDICADORES[id];
          var a = valorIndicador(id, atual);
          var linha;
          if (ind.agora) linha = '<span class="kpi-var">situação de agora</span>';
          else {
            var b = valorIndicador(id, anterior);
            if (a == null || b == null) linha = '<span class="kpi-var">sem base de comparação</span>';
            else {
              var v = U.variacao(a, b);
              var juizo = v.dir === 'igual' ? '' : ind.sentido === 'neutro' ? '' : ((v.dir === 'sobe') === (ind.sentido === 'bom') ? 'melhorou' : 'piorou');
              var dif = ind.un === '%' ? (a - b > 0 ? '+' : '') + (a - b) + ' p.p.' : v.txt;
              linha = '<span class="kpi-var' + (juizo ? ' var-' + (juizo === 'melhorou' ? 'bom' : 'ruim') : '') + '">' + (v.dir === 'sobe' ? '▲ ' : v.dir === 'desce' ? '▼ ' : '') + esc(dif) + (juizo ? ' · ' + juizo : '') + '<span class="kpi-ref"> vs. período anterior</span></span>';
            }
          }
          return '<div class="kpi" title="' + esc(ind.desc) + '"><span class="kpi-rot">' + esc(ind.nome) + '</span>' +
            '<span class="kpi-linha"><span class="kpi-num">' + fmtIndicador(id, a) + '</span>' + (ind.un === 'mensagens' || ind.un === 'alunas' || ind.un === 'prints' ? '<span class="kpi-un">' + ind.un + '</span>' : '') + '</span>' +
            linha + (ind.agora ? '' : sparkline(id, atual, iv)) + '</div>';
        }).join('') +
          '</div><div class="kpi-rodape"><button type="button" class="link" data-acao="personalizar" data-foco="adicionar">+ Adicionar indicador</button><span class="sub">Passe o mouse sobre um indicador para ver como ele é calculado.</span></div>';
      },
      grafico: function () {
        var ind = INDICADORES[S.prefs.metrica];
        var metricas = {};
        Object.keys(INDICADORES).forEach(function (k) { if (INDICADORES[k].conta) metricas[k] = INDICADORES[k].nome; });
        return '<div class="grafico-ctrl"><label class="campo campo-peq"><span>Mostrar</span><select id="g-metrica" data-mudar="metrica">' + opcoes(metricas, S.prefs.metrica) + '</select></label>' +
          '<div class="seg seg-peq" role="group" aria-label="Agrupar por">' +
          '<button type="button" data-acao="gran" data-v="dia" aria-pressed="' + (S.gran === 'dia') + '">Por dia</button>' +
          '<button type="button" data-acao="gran" data-v="semana" aria-pressed="' + (S.gran === 'semana') + '">Por semana</button></div></div>' +
          '<p class="sub">' + esc(ind.nome) + ' por ' + (S.gran === 'dia' ? 'dia' : 'semana') + ', separado por canal. Passe o dedo ou o mouse para ver cada valor.</p>' +
          '<div id="grafico" class="grafico" role="img" aria-label="' + esc(ind.nome) + ' por ' + S.gran + ' e por canal, de ' + periodo + '"></div>';
      },
      assuntos: function () {
        var temasA = U.contarPor(atual, 'tema'), temasB = U.contarPor(anterior, 'tema');
        var semAssunto = temasA.outros || 0;
        var ordem = Object.keys(temasA).filter(function (t) { return t !== 'outros'; }).sort(function (a, b) { return temasA[b] - temasA[a]; });
        if (!ordem.length) return '<p class="sub">Sem mensagens com assunto definido no período.</p>';
        var maxT = temasA[ordem[0]];
        var mostrar = S.verTodosAssuntos ? ordem : ordem.slice(0, 6);
        return '<p class="sub">Mensagens por assunto. Toque para filtrar o painel.</p><ul class="barras">' + mostrar.map(function (t) {
          var v = U.variacao(temasA[t], temasB[t] || 0);
          return '<li><button type="button" class="barra-linha" data-acao="filtrar-tema" data-v="' + esc(t) + '">' +
            '<span class="barra-rot">' + esc(nomeTema(t)) + '</span>' +
            '<span class="barra-trilho"><span class="barra" style="width:' + Math.max(2, temasA[t] / maxT * 100) + '%"></span></span>' +
            '<span class="barra-num">' + temasA[t] + '</span><span class="barra-det">' + v.txt + ' vs. período anterior</span></button></li>';
        }).join('') + '</ul>' + (ordem.length > 6 ? '<button type="button" class="link" data-acao="ver-todos-assuntos">' + (S.verTodosAssuntos ? 'Mostrar só os 6 principais' : 'Ver todos (' + ordem.length + ')') + '</button>' : '') +
          (semAssunto ? '<p class="nota-peq">' + semAssunto + ' mensagem(ns) sem assunto definido (respostas curtas como "Eu topo!" ou textos que não batem com nenhuma palavra-chave). <button type="button" class="link" data-acao="filtrar-tema" data-v="outros">Ver quais são</button></p>' : '');
      },
      objecoes: function () {
        if (!r.objecoes.length) return '<p class="sub">Nenhuma objeção encontrada no período.</p>';
        var maxO = r.objecoes[0].n;
        return '<p class="sub">Mensagens que citam cada objeção.</p><ul class="barras barras-simples">' + r.objecoes.slice(0, 5).map(function (o) {
          return '<li><div class="barra-linha estatica"><span class="barra-rot">"' + esc(o.obj.nome) + '"</span>' +
            '<span class="barra-trilho"><span class="barra barra-tipo" style="width:' + Math.max(2, o.n / maxO * 100) + '%"></span></span>' +
            '<span class="barra-num">' + o.n + '</span></div></li>';
        }).join('') + '</ul><button type="button" class="link" data-acao="aba" data-v="dores">Ver objeções e como quebrar</button>';
      },
      ideias: function () { return blocoIdeias(atual, 3) + '<button type="button" class="link" data-acao="aba" data-v="ideias">Ver pauta completa</button>'; },
      interacao: function () { return blocoInteracao(r.interacao, 3); },
      alunas: function () {
        var s = A.sinaisAlunas(msgsAlunas(), S.temas, iv[1]);
        var dif = s.filter(function (x) { return x.tipo === 'dificuldade'; }).length, sum = s.length - dif;
        return s.length ? '<p><strong>' + dif + '</strong> com dificuldade repetida na última semana e <strong>' + sum + '</strong> que pararam de escrever há 10 dias ou mais.</p><button type="button" class="link" data-acao="aba" data-v="ajuda">Ver quem são</button>' : '<p class="sub">Nenhum sinal no momento.</p>';
      },
      tipos: function () {
        var porTipo = U.contarPor(atual, 'tipo'), mx = 1;
        C.TIPOS.forEach(function (t) { mx = Math.max(mx, porTipo[t.id] || 0); });
        return '<ul class="barras barras-simples">' + C.TIPOS.map(function (t) {
          var n = porTipo[t.id] || 0;
          return '<li><div class="barra-linha estatica"><span class="barra-rot">' + esc(t.nome) + '</span><span class="barra-trilho"><span class="barra barra-tipo" style="width:' + (n ? Math.max(2, n / mx * 100) : 0) + '%"></span></span><span class="barra-num">' + n + '</span></div></li>';
        }).join('') + '</ul>';
      }
    };

    var visiveis = S.prefs.secoes.filter(function (s) { return s.visivel; });
    if (!visiveis.length) return h + vazio('Todas as seções estão ocultas', 'Use "Personalizar painel" para mostrar as seções que quiser.', '<button type="button" class="btn" data-acao="personalizar">Personalizar painel</button>');
    h += '<div class="secoes-visao">' + visiveis.map(function (s) {
      var def = SECOES_VISAO.find(function (x) { return x.id === s.id; });
      var titulo = s.id === 'grafico' ? 'Evolução no período' : def.nome;
      if (s.id === 'indicadores') return '<section class="secao-cheia" aria-label="Indicadores">' + blocos.indicadores() + '</section>';
      return '<section class="painel-card' + (def.cheia ? ' secao-cheia' : '') + (s.id === 'alertas' ? ' card-alertas' : '') + '" aria-labelledby="sec-' + s.id + '"><div class="card-topo"><h2 id="sec-' + s.id + '">' + esc(titulo) + '</h2></div>' + blocos[s.id]() + '</section>';
    }).join('') + '</div>';
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
    }).join('') + '</ol>';
  }

  function blocoInteracao(inter, n) {
    if (!inter.posts.length) return '<p class="sub">Sem mensagens da equipe no Telegram neste período. Ao importar o grupo, marque quem é da equipe.</p>';
    return '<p class="sub">Respostas das alunas até 3 h depois de cada mensagem sua. Média: ' + inter.media.toFixed(1).replace('.', ',') + '.</p><ol class="ideias">' + inter.posts.slice(0, n).map(function (x) {
      return '<li><span>' + citar(x.texto) + '</span><span class="sub">' + x.media.toFixed(1).replace('.', ',') + ' respostas em média' + (x.vezes > 1 ? ' · enviada ' + x.vezes + 'x' : '') + '</span></li>';
    }).join('') + '</ol>';
  }

  function desenharGrafico() {
    var el = document.getElementById('grafico');
    if (!el) return;
    var iv = intervalo();
    var ind = INDICADORES[S.prefs.metrica];
    var lista = filtrar(msgsAlunas(), iv).filter(ind.conta);
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

  /* ---------- Conversas do dia ---------- */

  function abaDia() {
    var fimRef = refFim();
    var dia = S.diaResumo ? U.deChave(S.diaResumo) : U.inicioDia(fimRef);
    var r = calcularResumo(dia);
    var a0 = U.inicioDia(dia), a1 = U.fimDia(dia);
    var doDia = msgsAlunas().filter(function (m) { return m.data >= a0 && m.data <= a1 && passaFiltros(m); }).sort(function (x, y) { return x.data - y.data; });
    var perguntas = doDia.filter(ehDor);
    var lista = S.conv.mostrar === 'perguntas' ? perguntas : doDia;
    if (S.conv.semResposta) lista = lista.filter(function (m) { return !m.resposta; });
    var temas = U.contarPor(doDia, 'tema');
    var topo = Object.keys(temas).sort(function (x, y) { return temas[y] - temas[x]; });

    var h = '<div class="cabeca-aba"><h1>Conversas do dia</h1><p class="sub">O que aconteceu nas conversas que você já tem no WhatsApp e no grupo: o assunto do dia, quem perguntou o quê e o que a equipe respondeu. Aqui é só para ver e organizar. Ninguém é respondido pelo painel.</p></div>';
    h += '<div class="linha-controles"><label class="campo"><span>Dia</span><input type="date" id="dia-resumo" data-mudar="dia-resumo" value="' + U.chaveDia(dia) + '" min="' + U.chaveDia(refInicio()) + '" max="' + U.chaveDia(fimRef) + '"></label>' +
      '<button type="button" class="btn btn-sec" data-acao="resumo-copiar">Copiar resumo (sem dados pessoais)</button></div>';

    h += '<section class="assunto-dia"><span class="kpi-rot">Assunto do dia</span>' +
      (topo.length ? '<p class="assunto-nome">' + esc(nomeTema(topo[0])) + ' <span class="sub">· ' + temas[topo[0]] + ' mensagens</span></p>' +
        (topo.length > 1 ? '<p class="sub">Depois: ' + topo.slice(1, 4).map(function (t) { return esc(nomeTema(t)) + ' (' + temas[t] + ')'; }).join(' · ') + '</p>' : '') : '<p class="sub">Nenhuma mensagem neste dia.</p>') + '</section>';

    var resp = perguntas.filter(function (m) { return m.resposta; }).length;
    h += '<section class="kpis kpis-4">' +
      '<div class="kpi"><span class="kpi-rot">Mensagens das alunas</span><span class="kpi-num">' + r.total + '</span><span class="kpi-var">ontem: ' + r.ontem + ' · média 7 dias: ' + r.media7.toFixed(1).replace('.', ',') + '</span></div>' +
      '<div class="kpi"><span class="kpi-rot">Perguntas e dificuldades</span><span class="kpi-num">' + perguntas.length + '</span><span class="kpi-var">' + resp + ' com resposta registrada</span></div>' +
      '<div class="kpi"><span class="kpi-rot">Mensagens com objeção</span><span class="kpi-num">' + r.objecoes + '</span><span class="kpi-var">' + (r.objTop ? 'mais citada: "' + esc(r.objTop) + '"' : 'nenhuma') + '</span></div>' +
      '<div class="kpi"><span class="kpi-rot">Depoimentos e evolução</span><span class="kpi-num">' + (r.depo + r.evol) + '</span><span class="kpi-var">' + r.autorizados + ' já autorizados para divulgação</span></div>' +
      '</section>';

    h += '<div class="duas"><section class="painel-card"><h2>Destaques</h2><ul class="destaques">' + r.destaques.map(function (d) { return '<li>' + d + '</li>'; }).join('') + '</ul></section>';
    h += '<section class="painel-card"><h2>Pede atenção</h2>' + (r.atencao.length ? '<ul class="destaques">' + r.atencao.map(function (d) { return '<li>' + d + '</li>'; }).join('') + '</ul>' : '<p class="sub">Nada fora do normal neste dia.</p>') + '</section></div>';

    h += '<section class="painel-card"><div class="card-topo"><h2>Quem perguntou e o que foi respondido</h2>' +
      '<div class="seg seg-peq" role="group" aria-label="Mostrar">' +
      '<button type="button" data-acao="conv-mostrar" data-v="perguntas" aria-pressed="' + (S.conv.mostrar === 'perguntas') + '">Perguntas e dificuldades</button>' +
      '<button type="button" data-acao="conv-mostrar" data-v="todas" aria-pressed="' + (S.conv.mostrar === 'todas') + '">Todas as mensagens</button></div></div>' +
      '<label class="check"><input type="checkbox" id="conv-sem" data-mudar="conv-sem"' + (S.conv.semResposta ? ' checked' : '') + '> Só as que não têm resposta registrada</label>' +
      (lista.length ? '<div class="itens">' + lista.map(itemConversa).join('') + '</div>' : '<p class="sub">Nada para mostrar com essas opções.</p>') +
      '<p class="nota-peq">A resposta vem dos arquivos importados. No Telegram, usamos o "responder" da mensagem. No WhatsApp, a primeira mensagem da equipe depois da pergunta (ligação estimada pelo horário).</p></section>';

    h += blocoSinais(U.fimDia(dia), 6);
    return h;
  }

  function itemConversa(m) {
    var r = respostaDe(m);
    var h = '<article class="item qa"><div class="item-topo">' + canalTag(m.canal) + '<span class="item-quem">' + esc(rotuloAluna(m.alunaId)) + '</span>' +
      '<span class="chip">' + esc(nomeTema(m.tema)) + '</span><span class="chip">' + esc(nomeTipo(m.tipo)) + '</span><time>' + U.fmtHora(m.data) + '</time></div>' +
      '<p class="item-texto">' + esc(textoSeguro(m)) + '</p>';
    if (r) {
      var min = Math.round((r.data - m.data) / 60000);
      h += '<div class="resposta"><span class="resp-rot">Resposta de ' + esc(r.autor || 'equipe') + ' · ' + U.fmtHora(r.data) + ' (' + (min < 60 ? min + ' min' : Math.round(min / 60) + ' h') + ' depois)' + (m.respostaEstimada ? ' · ligação estimada' : '') + '</span>' +
        '<p>' + esc(PRIV.mascararTexto(r.texto, alunasAtuais())) + '</p></div>';
    } else h += '<p class="sem-resp">Sem resposta registrada nos arquivos.</p>';
    return h + '</article>';
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
    h += subnav('subRes', [['ideias', 'Ideias de antes e depois'], ['relatos', 'Relatos e depoimentos', provas.length], ['fotos', 'Fotos e prints de conversa', conj().midias.length]]);
    if (S.subRes === 'fotos') return h + subFotos();
    if (S.subRes === 'relatos') {
      if (!provas.length) return h + vazio('Nada neste período', 'Mude o período ou os filtros para ver mais.');
      if (!pode('editar')) h += semPermissao('registrar autorizações');
      return h + '<div class="itens">' + provas.sort(function (x, y) { return y.data - x.data; }).slice(0, S.limite).map(function (m) {
        return '<article class="item item-depo"><div class="item-topo">' + canalTag(m.canal) + '<span class="chip">' + esc(nomeTipo(m.tipo)) + '</span><span class="item-quem">' + esc(rotuloAluna(m.alunaId)) + '</span><time>' + U.fmtDataHora(m.data) + '</time></div>' +
          '<blockquote class="item-texto depo">' + esc(textoSeguro(m)) + '</blockquote>' +
          '<div class="item-meta">' + A.detectar(m.texto, S.resultados).map(function (id) { var rr = S.resultados.find(function (x) { return x.id === id; }); return '<span class="chip">' + esc(rr.nome) + '</span>'; }).join('') +
          classeChip(m) + autChip(m.aut) + (prontoDivulgacao(m) ? '<span class="chip chip-pronto">Pode ir para divulgação</span>' : '') + '</div>' +
          (prontoDivulgacao(m) && pode('editar') ? '<div class="item-acoes"><button type="button" class="btn btn-peq" data-acao="abrir-compositor" data-fonte="msg" data-id="' + m.id + '">Criar card para o Instagram</button></div>' : '') +
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
      '<label class="check"><input type="checkbox" id="so-nao-rev" data-mudar="so-nao-rev"' + (S.soNaoRevisadas ? ' checked' : '') + '> Só não revisadas</label>' +
      '<label class="check"><input type="checkbox" id="so-sem-resp" data-mudar="so-sem-resp"' + (S.soSemResposta ? ' checked' : '') + '> Só perguntas sem resposta registrada</label></div>';
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
      if (S.soSemResposta && !(ehDor(m) && !m.resposta)) return false;
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
    var h = '<p class="sub">Acesso restrito. O arquivo original nunca é alterado: ocultar rosto, nome ou foto de perfil gera uma cópia separada, com prévia antes de salvar. Nada fica público por padrão.</p>';
    if (S.modo === 'demo') {
      h += '<p class="nota">As imagens abaixo são <strong>ilustrações fictícias</strong> (silhuetas desenhadas pelo painel), não fotos de pessoas. Servem para testar autorização, desfoque e montagem de prints.</p>';
    } else if (pode('editar')) {
      h += '<section class="painel-card"><h2>Adicionar antes e depois ou print de conversa</h2><p class="sub">Fica só na memória desta aba e some ao recarregar. Use apenas material que a aluna enviou. Para print de conversa (depoimento), envie só o primeiro arquivo.</p>' +
        '<div class="linha-controles">' +
        '<label class="campo"><span>Aluna</span><select id="foto-aluna">' + opcoes(Object.keys(alunasAtuais()).reduce(function (r, id) { r[id] = rotuloAluna(id); return r; }, {}), '', 'Sem vínculo') + '</select></label>' +
        '<label class="campo"><span>Descrição</span><input type="text" id="foto-desc" placeholder="Ex.: 60 dias de programa"></label>' +
        '<label class="campo"><span>Foto de antes (ou print da conversa)</span><input type="file" id="foto-antes" accept="image/*"></label>' +
        '<label class="campo"><span>Foto de depois</span><input type="file" id="foto-depois" accept="image/*"></label>' +
        '<div class="campo campo-botao"><button type="button" class="btn" data-acao="foto-adicionar">Adicionar</button></div></div></section>';
    }
    if (!ms.length) return h + vazio('Nenhuma foto ainda', S.modo === 'demo' ? 'Sem ilustrações.' : 'Adicione material acima para testar o fluxo.');
    return h + '<div class="galeria">' + ms.map(cardFoto).join('') + '</div>';
  }

  function ladosDe(f) { return f.tipo === 'print_conversa' ? [['antes', 'Print']] : [['antes', 'Antes'], ['depois', 'Depois']]; }

  function faltaTratar(f) {
    return f.ocultarRosto && ladosDe(f).some(function (l) { return !f.tratadas[l[0]]; });
  }

  function autValida(aut) { return !!(aut && aut.status === 'divulgacao' && aut.confirmadoPor); }

  function cardFoto(f) {
    var podeVer = pode('editar');
    var nPrints = (conj().prints || []).filter(function (p) { return p.fonte === 'midia' && p.fonteId === f.id; }).length;
    var imgs = ladosDe(f).map(function (l) {
      var tratada = f.tratadas[l[0]];
      var src = tratada || (podeVer ? f.fotos[l[0]] : null);
      return '<figure class="foto-lado">' + (src ? '<img src="' + src + '" alt="' + l[1] + ' · ' + esc(f.descricao) + '">' : '<div class="trava-img"><span aria-hidden="true">🔒</span> Acesso restrito</div>') +
        '<figcaption>' + l[1] + (tratada ? ' · <strong>rosto oculto</strong>' : podeVer ? ' · original' : '') + '</figcaption>' +
        (pode('editar') ? '<button type="button" class="btn btn-sec btn-peq" data-acao="abrir-editor" data-id="' + f.id + '" data-lado="' + l[0] + '">' + (tratada ? 'Refazer desfoque' : 'Ocultar rosto ou dados') + '</button>' : '') +
        '</figure>';
    }).join('');
    var bloqueio = !autValida(f.aut) ? 'Precisa de autorização para divulgação com quem confirmou.' : faltaTratar(f) ? 'Falta a cópia com rosto oculto.' : '';
    return '<article class="foto">' +
      '<div class="foto-lados">' + imgs + '</div>' +
      '<div class="foto-corpo"><div class="item-topo"><span class="item-quem">' + esc(rotuloAluna(f.alunaId)) + '</span><span class="chip">' + (f.tipo === 'print_conversa' ? 'Print de conversa' : 'Antes e depois') + '</span><time>' + U.fmtDataAno(f.data) + '</time></div>' +
      '<p>' + esc(f.descricao) + '</p>' +
      '<div class="item-meta">' + autChip(f.aut) + (nPrints ? '<span class="chip chip-pronto">' + nPrints + ' print(s) criado(s)</span>' : '') + '</div>' +
      '<div class="item-acoes">' +
      (pode('editar') ? '<label class="check"><input type="checkbox" data-mudar="ocultar-rosto" data-id="' + f.id + '"' + (f.ocultarRosto ? ' checked' : '') + '> Exigir rosto oculto no print</label>' : '') +
      (pode('editar') ? '<button type="button" class="btn btn-peq" data-acao="abrir-compositor" data-fonte="midia" data-id="' + f.id + '"' + (bloqueio ? ' disabled title="' + esc(bloqueio) + '"' : '') + '>Criar print para o Instagram</button>' : '') +
      '</div>' + (bloqueio && pode('editar') ? '<p class="nota-peq">Para criar o print: ' + esc(bloqueio) + '</p>' : '') +
      formAut('midia', f) + '</div></article>';
  }

  /* ---------- Editor de desfoque ---------- */

  function abrirEditor(id, lado) {
    var f = conj().midias.find(function (x) { return x.id === id; });
    if (!f || !pode('editar')) return;
    P.prints.carregar(f.fotos[lado]).then(function (img) {
      S.editor = { foto: f, lado: lado, img: img, areas: [], bloco: 18, previa: null, arrasto: null };
      renderEditor();
    });
  }

  function renderEditor() {
    var E = S.editor, el = document.getElementById('modal');
    if (!E) { fecharModal(); return; }
    abrirModal('<div class="modal-caixa" role="dialog" aria-modal="true" aria-labelledby="ed-tit">' +
      '<div class="card-topo"><h2 id="ed-tit">Ocultar rosto ou dados · ' + (E.foto.tipo === 'print_conversa' ? 'Print' : E.lado === 'antes' ? 'Antes' : 'Depois') + '</h2><button type="button" class="btn btn-sec btn-peq" data-acao="fechar-editor">Fechar</button></div>' +
      '<p class="sub">Arraste sobre a imagem para marcar o que esconder: rosto, nome, foto de perfil, número, tatuagem ou fundo com informação pessoal. O original não muda.</p>' +
      '<div class="editor-grade"><div><p class="rot-canvas">Original</p><canvas id="ed-canvas" class="ed-canvas"></canvas></div>' +
      '<div><p class="rot-canvas">Prévia da cópia</p>' + (E.previa ? '<img class="ed-previa" src="' + E.previa + '" alt="Prévia da cópia com áreas ocultas">' : '<div class="ed-vazio">Gere a prévia para conferir antes de salvar.</div>') + '</div></div>' +
      '<div class="linha-controles">' +
      '<span class="sub">' + E.areas.length + ' área(s) marcada(s)</span>' +
      (E.foto.rostos && E.foto.rostos[E.lado] ? '<button type="button" class="btn btn-sec btn-peq" data-acao="ed-sugestao">Marcar rosto da ilustração</button>' : '') +
      '<button type="button" class="btn btn-sec btn-peq" data-acao="ed-limpar">Limpar áreas</button>' +
      '<label class="campo campo-peq"><span>Intensidade</span><select id="ed-bloco" data-mudar="ed-bloco">' + opcoes({ '10': 'Leve', '18': 'Média', '30': 'Forte' }, String(E.bloco)) + '</select></label>' +
      '<button type="button" class="btn btn-sec" data-acao="ed-previa"' + (E.areas.length ? '' : ' disabled') + '>Gerar prévia</button>' +
      '<button type="button" class="btn" data-acao="ed-salvar"' + (E.previa ? '' : ' disabled') + '>Salvar cópia</button>' +
      '</div></div>');
    desenharEditor();
    ligarCanvas();
  }

  // Janela sobreposta: leva o foco para dentro, prende o Tab e devolve o foco ao fechar.
  function abrirModal(html) {
    var el = document.getElementById('modal');
    var jaAberto = !el.hidden;
    var focoId = jaAberto && document.activeElement && el.contains(document.activeElement) ? document.activeElement.id : '';
    var focoAcao = jaAberto && document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.acao : '';
    if (!jaAberto) S.focoAntes = document.activeElement;
    document.body.classList.add('com-modal');
    el.hidden = false;
    el.innerHTML = html;
    var alvo = (focoId && document.getElementById(focoId)) || (focoAcao && el.querySelector('[data-acao="' + focoAcao + '"]:not([disabled])'));
    if (!alvo) { var cx = el.querySelector('[role="dialog"]'); cx.setAttribute('tabindex', '-1'); alvo = cx; }
    alvo.focus({ preventScroll: true });
  }
  function fecharModal() {
    var el = document.getElementById('modal');
    el.hidden = true; el.innerHTML = '';
    document.body.classList.remove('com-modal');
    S.modalAtivo = ''; S.confirmarRedefinir = false;
    if (S.focoAntes && document.body.contains(S.focoAntes)) S.focoAntes.focus({ preventScroll: true });
    S.focoAntes = null;
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
    E.previa = P.prints.pixelar(E.img, E.areas, E.bloco).toDataURL('image/png');
  }

  /* ---------- Montagem de prints ---------- */

  function abrirCompositor(fonte, id) {
    if (!pode('editar')) return;
    var base = { fonte: fonte, id: id, formato: 'feed', layout: 'lado', rotulos: true, periodo: '', assinatura: S.assinatura || '', fundo: 'claro', atribuicao: 'Aluna do programa', previa: null, imgs: {} };
    if (fonte === 'msg') {
      var m = acharMsg(id);
      if (!prontoDivulgacao(m)) { avisar('Esse relato ainda não tem autorização para divulgação.'); return; }
      S.compositor = base;
      gerarPrint();
      renderCompositor();
      return;
    }
    var f = acharFoto(id);
    if (!autValida(f.aut) || faltaTratar(f)) { avisar('Falta autorização ou cópia com rosto oculto.'); return; }
    base.periodo = f.tipo === 'print_conversa' ? '' : f.descricao;
    var lados = ladosDe(f);
    Promise.all(lados.map(function (l) { return P.prints.carregar(f.tratadas[l[0]] || f.fotos[l[0]]); })).then(function (imgs) {
      lados.forEach(function (l, i) { base.imgs[l[0]] = imgs[i]; });
      S.compositor = base;
      gerarPrint();
      renderCompositor();
    });
  }

  function gerarPrint() {
    var K = S.compositor, PR = P.prints;
    if (K.fonte === 'msg') {
      K.previa = PR.cardDepoimento({ formato: K.formato, texto: textoSeguro(acharMsg(K.id)), atribuicao: K.atribuicao, assinatura: K.assinatura, fundo: K.fundo });
      return;
    }
    var f = acharFoto(K.id);
    K.previa = f.tipo === 'print_conversa'
      ? PR.printConversa({ formato: K.formato, imagem: K.imgs.antes, assinatura: K.assinatura, fundo: K.fundo })
      : PR.antesDepois({ formato: K.formato, layout: K.layout, antes: K.imgs.antes, depois: K.imgs.depois, rotulos: K.rotulos, periodo: K.periodo, assinatura: K.assinatura, fundo: K.fundo });
  }

  function renderCompositor() {
    var K = S.compositor;
    if (!K) { fecharModal(); return; }
    var PR = P.prints;
    var fmts = {}; Object.keys(PR.FORMATOS).forEach(function (k) { fmts[k] = PR.FORMATOS[k].nome; });
    var fundos = {}; Object.keys(PR.FUNDOS).forEach(function (k) { fundos[k] = PR.FUNDOS[k].nome; });
    var ehMsg = K.fonte === 'msg', f = ehMsg ? null : acharFoto(K.id);
    var ad = f && f.tipo !== 'print_conversa';
    abrirModal('<div class="modal-caixa" role="dialog" aria-modal="true" aria-labelledby="cp-tit">' +
      '<div class="card-topo"><h2 id="cp-tit">' + (ehMsg ? 'Card de depoimento' : ad ? 'Print de antes e depois' : 'Print de conversa') + '</h2><button type="button" class="btn btn-sec btn-peq" data-acao="fechar-compositor">Fechar</button></div>' +
      '<div class="compositor"><div class="cp-controles">' +
      '<label class="campo"><span>Formato</span><select id="cp-formato" data-mudar="cp" data-k="formato">' + opcoes(fmts, K.formato) + '</select></label>' +
      (ad ? '<label class="campo"><span>Disposição</span><select id="cp-layout" data-mudar="cp" data-k="layout">' + opcoes({ lado: 'Lado a lado', empilhado: 'Um em cima do outro' }, K.layout) + '</select></label>' +
        '<label class="check"><input type="checkbox" id="cp-rotulos" data-mudar="cp" data-k="rotulos"' + (K.rotulos ? ' checked' : '') + '> Mostrar "ANTES" e "DEPOIS"</label>' +
        '<label class="campo"><span>Texto embaixo</span><input type="text" id="cp-periodo" data-mudar="cp" data-k="periodo" value="' + esc(K.periodo) + '" placeholder="Ex.: 60 dias de constância"></label>' : '') +
      (ehMsg ? '<label class="campo"><span>Assinatura do depoimento</span><input type="text" id="cp-atrib" data-mudar="cp" data-k="atribuicao" value="' + esc(K.atribuicao) + '"></label>' +
        '<p class="nota-peq">Não use nome ou sobrenome sem autorização para isso.</p>' : '') +
      '<label class="campo"><span>Perfil (opcional)</span><input type="text" id="cp-assin" data-mudar="cp" data-k="assinatura" value="' + esc(K.assinatura) + '" placeholder="@seuperfil"></label>' +
      '<label class="campo"><span>Fundo</span><select id="cp-fundo" data-mudar="cp" data-k="fundo">' + opcoes(fundos, K.fundo) + '</select></label>' +
      '<button type="button" class="btn" data-acao="cp-enviar">Enviar para aprovação</button>' +
      '<p class="nota-peq">Os formatos são uma sugestão inicial. Me diga os tamanhos que a social media usa e eu ajusto.</p>' +
      '</div><div class="cp-previa"><p class="rot-canvas">Prévia</p><img src="' + K.previa + '" alt="Prévia do print"></div></div></div>');
  }

  /* ---------- Prints para o Instagram ---------- */

  function fonteDoPrint(p) { return p.fonte === 'msg' ? acharMsg(p.fonteId) : acharFoto(p.fonteId); }
  function printValido(p) {
    var f = fonteDoPrint(p);
    if (!f) return false;
    return p.fonte === 'msg' ? prontoDivulgacao(f) : autValida(f.aut);
  }
  var STATUS_PRINT = { aguardando: 'Aguardando sua aprovação', ajuste: 'Pediu ajuste', aprovado: 'Aprovado' };
  var TIPOS_PRINT = { antes_depois: 'Antes e depois', depoimento: 'Card de depoimento', print_conversa: 'Print de conversa' };

  function abaPrints() {
    var prints = conj().prints || [];
    var cont = U.contarPor(prints, 'status');
    var h = '<div class="cabeca-aba"><h1>Prints para o Instagram</h1><p class="sub">Material pronto para post, montado só a partir de fotos e depoimentos autorizados. Você aprova, e os aprovados vão para a pasta da social media.</p></div>';
    h += '<ol class="fluxo"><li><strong>Autorização</strong><span>Aluna autorizou o uso no Instagram e alguém da equipe confirmou</span></li><li><strong>Print</strong><span>Rosto oculto, quando exigido, e montagem no formato do post</span></li><li><strong>Sua aprovação</strong><span>Aprovar ou pedir ajuste</span></li><li><strong>Drive da social media</strong><span>Pasta privada, compartilhada só com ela</span></li></ol>';

    // Material pronto para virar print
    var fotosProntas = conj().midias.filter(function (f) { return autValida(f.aut) && !prints.some(function (p) { return p.fonte === 'midia' && p.fonteId === f.id; }); });
    var depoProntos = msgsAlunas().filter(function (m) { return ehProva(m) && prontoDivulgacao(m) && !prints.some(function (p) { return p.fonte === 'msg' && p.fonteId === m.id; }); }).sort(function (a, b) { return b.data - a.data; });
    if (pode('editar') && (fotosProntas.length || depoProntos.length)) {
      h += '<section class="painel-card"><h2>Autorizados e ainda sem print</h2><div class="prontos">' +
        fotosProntas.map(function (f) {
          var falta = faltaTratar(f);
          return '<div class="pronto"><span class="chip">' + (f.tipo === 'print_conversa' ? 'Print de conversa' : 'Antes e depois') + '</span><span>' + esc(rotuloAluna(f.alunaId)) + ' · ' + esc(f.descricao) + '</span>' +
            (falta ? '<button type="button" class="btn btn-sec btn-peq" data-acao="ir-fotos">Falta ocultar o rosto</button>' : '<button type="button" class="btn btn-peq" data-acao="abrir-compositor" data-fonte="midia" data-id="' + f.id + '">Criar print</button>') + '</div>';
        }).join('') +
        depoProntos.slice(0, 6).map(function (m) {
          return '<div class="pronto"><span class="chip">' + esc(nomeTipo(m.tipo)) + '</span><span>' + citar(textoSeguro(m)) + ' <span class="sub">· ' + esc(rotuloAluna(m.alunaId)) + ', ' + U.fmtData(m.data) + '</span></span><button type="button" class="btn btn-peq" data-acao="abrir-compositor" data-fonte="msg" data-id="' + m.id + '">Criar card</button></div>';
        }).join('') + '</div>' + (depoProntos.length > 6 ? '<p class="sub">+' + (depoProntos.length - 6) + ' depoimentos autorizados em "Antes e depois e resultados".</p>' : '') + '</section>';
    }

    h += subnav('subPrints', [['aguardando', 'Aguardando aprovação', cont.aguardando || 0], ['ajuste', 'Pediu ajuste', cont.ajuste || 0], ['aprovado', 'Aprovados', cont.aprovado || 0], ['todos', 'Todos', prints.length]]);
    var lista = prints.filter(function (p) { return S.subPrints === 'todos' || p.status === S.subPrints; }).slice().reverse();
    if (!lista.length) h += vazio('Nada aqui', 'Crie prints a partir das fotos e depoimentos autorizados.');
    else h += '<div class="prints">' + lista.map(cardPrint).join('') + '</div>';

    var aprovados = prints.filter(function (p) { return p.status === 'aprovado' && printValido(p); });
    h += '<section class="painel-card"><h2>Enviar para o Drive da social media</h2>' +
      '<p class="sub">' + aprovados.length + ' print(s) aprovado(s). Estrutura proposta: <span class="mono">Painel de acompanhamento/Materiais autorizados/Instagram/AAAA-MM/</span>, com uma lista dos arquivos sem dados pessoais.</p>' +
      '<div class="linha-controles"><button type="button" class="btn" disabled title="Depende da configuração do Google Drive (próxima etapa)">Enviar ao Drive (ainda não conectado)</button>' +
      (pode('exportar') ? '<button type="button" class="btn btn-sec" data-acao="pacote-drive"' + (aprovados.length ? '' : ' disabled') + '>Baixar pacote dos aprovados (.zip)</button>' : '') + '</div>' +
      '<p class="nota-peq">Enquanto o Drive não está conectado, baixe o pacote e arraste a pasta para o Drive. Não deixe a pasta com link público: compartilhe só com o e-mail da social media.</p>' +
      (pode('exportar') ? '' : semPermissao('baixar o pacote')) + '</section>';
    return h;
  }

  function cardPrint(p) {
    var valido = printValido(p);
    var fmt = P.prints.FORMATOS[p.formato];
    var h = '<article class="print-card' + (valido ? '' : ' print-invalido') + '">' +
      '<button type="button" class="print-img" data-acao="ver-print" data-id="' + p.id + '" style="aspect-ratio:' + fmt.w + ' / ' + fmt.h + '"><img src="' + p.url + '" alt="' + esc(TIPOS_PRINT[p.tipo]) + ' em ' + esc(fmt.nome) + '"></button>' +
      '<div class="foto-corpo"><div class="item-meta"><span class="chip">' + esc(TIPOS_PRINT[p.tipo]) + '</span><span class="chip">' + esc(fmt.nome.split(' (')[0]) + '</span>' +
      '<span class="st-print st-' + p.status + '">' + esc(STATUS_PRINT[p.status]) + '</span></div>' +
      '<p class="sub">' + esc(rotuloAluna(p.alunaId)) + ' · criado em ' + U.fmtDataHora(p.criadoEm) + (p.aprovadoEm ? ' · aprovado por ' + esc(p.aprovadoPor) + ' em ' + U.fmtDataAno(p.aprovadoEm) : '') + (p.pacoteEm ? ' · no pacote de ' + U.fmtDataAno(p.pacoteEm) : '') + '</p>' +
      (p.nota ? '<p class="nota-peq">Ajuste pedido: ' + esc(p.nota) + '</p>' : '') +
      (!valido ? '<p class="erro">A autorização não vale mais. Não usar.</p>' : '');
    var acoes = '';
    if (valido && pode('admin') && p.status !== 'aprovado') acoes += '<button type="button" class="btn btn-peq" data-acao="print-aprovar" data-id="' + p.id + '">Aprovar</button>';
    if (valido && pode('admin') && p.status === 'aguardando') acoes += '<input type="text" id="nota-' + p.id + '" class="nota-input" placeholder="O que ajustar?" aria-label="O que ajustar"><button type="button" class="btn btn-sec btn-peq" data-acao="print-ajuste" data-id="' + p.id + '">Pedir ajuste</button>';
    if (valido && pode('exportar') && p.status === 'aprovado') acoes += '<button type="button" class="btn btn-sec btn-peq" data-acao="print-baixar" data-id="' + p.id + '">Baixar</button>';
    if (pode('editar')) acoes += '<button type="button" class="btn btn-sec btn-peq" data-acao="print-descartar" data-id="' + p.id + '">Descartar</button>';
    if (!pode('admin') && p.status === 'aguardando') acoes += '<span class="sub">Só a função Administração aprova.</span>';
    return h + (acoes ? '<div class="item-acoes">' + acoes + '</div>' : '') + '</div></article>';
  }

  function nomeArquivoPrint(p) {
    return U.chaveDia(p.aprovadoEm || p.criadoEm) + '_' + p.tipo.replace('_', '-') + '_' + p.formato + '_' + p.id + '.png';
  }

  function blobDeDataURL(url) {
    var partes = url.split(','), bin = atob(partes[1]), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: 'image/png' });
  }

  function baixarPacote() {
    var aprovados = conj().prints.filter(function (p) { return p.status === 'aprovado' && printValido(p); });
    if (!aprovados.length) return;
    var demo = S.modo === 'demo';
    var mes = U.chaveDia(Date.now()).slice(0, 7);
    var leia = (demo ? '*** MATERIAL FICTÍCIO DE DEMONSTRAÇÃO. NÃO PUBLICAR. ***\n\n' : '') +
      'Prints aprovados para o Instagram (' + U.fmtDataAno(Date.now()) + ')\nAntes de publicar: confira se a autorização continua válida no painel.\n\n' +
      aprovados.map(function (p) {
        var f = fonteDoPrint(p);
        return nomeArquivoPrint(p) + ' | ' + TIPOS_PRINT[p.tipo] + ' | ' + P.prints.FORMATOS[p.formato].nome + ' | aprovado por ' + p.aprovadoPor + ' em ' + U.fmtDataAno(p.aprovadoEm) + ' | autorização confirmada por ' + (f.aut ? f.aut.confirmadoPor : '');
      }).join('\n') + '\n';
    var pasta = (demo ? 'FICTICIO-' : '') + 'Instagram/' + mes + '/';
    if (window.JSZip) {
      var zip = new window.JSZip();
      aprovados.forEach(function (p) { zip.file(pasta + nomeArquivoPrint(p), p.url.split(',')[1], { base64: true }); });
      zip.file(pasta + 'LEIA-ME.txt', leia);
      zip.generateAsync({ type: 'blob' }).then(function (b) { U.baixar((demo ? 'FICTICIO-' : '') + 'prints-aprovados-' + U.chaveDia(Date.now()) + '.zip', b); });
    } else {
      aprovados.forEach(function (p, i) { setTimeout(function () { U.baixar(nomeArquivoPrint(p), blobDeDataURL(p.url)); }, i * 400); });
      U.baixar('LEIA-ME.txt', leia, 'text/plain');
    }
    aprovados.forEach(function (p) { p.pacoteEm = Date.now(); });
    registrar('Baixou pacote para o Drive', aprovados.length + ' print(s) aprovado(s)');
    avisar('Pacote gerado com ' + aprovados.length + ' print(s).');
    render();
  }

  /* ---------- Personalizar, salvar visualização e atualizar dados ---------- */

  function renderPersonalizar() {
    var pf = S.prefs;
    var restantes = {};
    Object.keys(INDICADORES).forEach(function (k) { if (pf.indicadores.indexOf(k) === -1) restantes[k] = INDICADORES[k].nome; });
    var periodos = { '7': 'Últimos 7 dias', '14': 'Últimos 14 dias', '30': 'Últimos 30 dias', '60': 'Últimos 60 dias', 'tudo': 'Tudo' };
    var metricas = {};
    Object.keys(INDICADORES).forEach(function (k) { if (INDICADORES[k].conta) metricas[k] = INDICADORES[k].nome; });
    function setas(lista, i, tipo) {
      return '<span class="ordem"><button type="button" class="btn btn-sec btn-icone" data-acao="mover" data-tipo="' + tipo + '" data-i="' + i + '" data-d="-1"' + (i === 0 ? ' disabled' : '') + ' aria-label="Subir">↑</button>' +
        '<button type="button" class="btn btn-sec btn-icone" data-acao="mover" data-tipo="' + tipo + '" data-i="' + i + '" data-d="1"' + (i === lista.length - 1 ? ' disabled' : '') + ' aria-label="Descer">↓</button></span>';
    }
    abrirModal('<div class="modal-caixa modal-estreito" role="dialog" aria-modal="true" aria-labelledby="pz-tit">' +
      '<div class="card-topo"><h2 id="pz-tit">Personalizar painel</h2><button type="button" class="btn btn-sec btn-peq" data-acao="fechar-modal">Fechar</button></div>' +
      '<p class="sub">As mudanças aparecem na hora na Visão geral. Para guardar e usar de novo depois, clique em "Salvar visualização".</p>' +
      '<h3>Indicadores</h3><ol class="lista-ordem">' + pf.indicadores.map(function (id, i) {
        return '<li><span><strong>' + esc(INDICADORES[id].nome) + '</strong><span class="sub"> · ' + esc(INDICADORES[id].desc) + '</span></span>' + setas(pf.indicadores, i, 'ind') +
          '<button type="button" class="btn btn-sec btn-peq" data-acao="remover-ind" data-v="' + id + '" aria-label="Remover ' + esc(INDICADORES[id].nome) + '">Remover</button></li>';
      }).join('') + '</ol>' +
      (Object.keys(restantes).length ? '<div class="linha-controles"><label class="campo campo-largo"><span>Indicador para adicionar</span><select id="pz-novo">' + opcoes(restantes, '') + '</select></label>' +
        '<div class="campo campo-botao"><button type="button" class="btn btn-peq" data-acao="adicionar-ind">Adicionar indicador</button></div></div>' : '<p class="sub">Todos os indicadores disponíveis já estão no painel.</p>') +
      '<h3>Seções da Visão geral</h3><ol class="lista-ordem">' + pf.secoes.map(function (s, i) {
        var def = SECOES_VISAO.find(function (x) { return x.id === s.id; });
        return '<li><label class="check"><input type="checkbox" data-mudar="secao-vis" data-v="' + s.id + '"' + (s.visivel ? ' checked' : '') + '> ' + esc(def.nome) + '</label>' + setas(pf.secoes, i, 'sec') + '</li>';
      }).join('') + '</ol>' +
      '<h3>Ao abrir</h3><div class="linha-controles">' +
      '<label class="campo"><span>Período</span><select id="pz-periodo" data-mudar="pref-periodo">' + opcoes(periodos, pf.periodo) + '</select></label>' +
      '<label class="campo"><span>Métrica do gráfico</span><select id="pz-metrica" data-mudar="metrica">' + opcoes(metricas, pf.metrica) + '</select></label></div>' +
      '<div class="rodape-modal">' +
      (S.confirmarRedefinir
        ? '<span class="sub">Voltar indicadores, seções, período e filtros ao padrão do painel?</span><button type="button" class="btn btn-perigo btn-peq" data-acao="redefinir-sim">Sim, redefinir</button><button type="button" class="btn btn-sec btn-peq" data-acao="redefinir-nao">Cancelar</button>'
        : '<button type="button" class="btn btn-sec btn-peq" data-acao="redefinir" title="Volta ao padrão do painel. Visualizações salvas não são apagadas.">Redefinir</button><button type="button" class="btn btn-peq" data-acao="salvar-vis">Salvar visualização</button>') +
      '</div></div>');
    S.modalAtivo = 'personalizar';
  }

  function renderSalvarVis() {
    var vis = lerVisualizacoes();
    var nomes = Object.keys(vis.lista);
    abrirModal('<div class="modal-caixa modal-estreito" role="dialog" aria-modal="true" aria-labelledby="sv-tit">' +
      '<div class="card-topo"><h2 id="sv-tit">Salvar visualização</h2><button type="button" class="btn btn-sec btn-peq" data-acao="fechar-modal">Fechar</button></div>' +
      '<p class="sub">Guarda neste navegador os indicadores, as seções, o período e os filtros que estão na tela agora. Não guarda dados das alunas. Em outro computador ou navegador, as visualizações não aparecem.</p>' +
      '<div class="linha-controles"><label class="campo campo-largo"><span>Nome</span><input type="text" id="sv-nome" maxlength="40" value="' + esc(S.visAtual || '') + '" placeholder="Ex.: Pauta da semana"></label></div>' +
      '<label class="check"><input type="checkbox" id="sv-padrao"' + (vis.padrao && vis.padrao === S.visAtual ? ' checked' : '') + '> Abrir sempre o painel com esta visualização</label>' +
      '<p class="erro" id="sv-erro" hidden></p>' +
      '<div class="rodape-modal"><button type="button" class="btn btn-peq" data-acao="salvar-vis-ok">Salvar</button></div>' +
      (nomes.length ? '<h3>Visualizações salvas</h3><ul class="lista-ordem">' + nomes.map(function (n) {
        return '<li><span><strong>' + esc(n) + '</strong>' + (vis.padrao === n ? ' <span class="chip">abre sempre</span>' : '') + '</span>' +
          '<button type="button" class="btn btn-sec btn-peq" data-acao="vis-usar" data-v="' + esc(n) + '">Aplicar</button>' +
          '<button type="button" class="btn btn-sec btn-peq" data-acao="vis-excluir" data-v="' + esc(n) + '">Excluir</button></li>';
      }).join('') + '</ul>' : '') + '</div>');
    S.modalAtivo = 'salvar';
  }

  function renderAtualizar() {
    var c = conj();
    var fim = c.mensagens.length ? refFim() : null;
    var ultima = 0;
    c.mensagens.forEach(function (m) { if (m.data > ultima) ultima = m.data; });
    var arquivos = c.arquivos || [];
    var h = '<div class="modal-caixa modal-estreito" role="dialog" aria-modal="true" aria-labelledby="at-tit">' +
      '<div class="card-topo"><h2 id="at-tit">Atualizar dados</h2><button type="button" class="btn btn-sec btn-peq" data-acao="fechar-modal">Fechar</button></div>' +
      '<dl class="status-lista"><div><dt>Fonte na tela</dt><dd>' + (S.modo === 'demo' ? 'Exemplo fictício' : 'Dados importados nesta aba') + '</dd></div>' +
      '<div><dt>Mensagens até</dt><dd>' + (ultima ? U.fmtDataHora(ultima) : 'sem mensagens') + '</dd></div>' +
      '<div><dt>Análises calculadas às</dt><dd>' + U.fmtDataHora(S.calculadoEm) + '</dd></div></dl>';
    if (S.modo === 'import' && arquivos.length) {
      h += '<h3>Arquivos importados</h3><div class="tabela-rolagem"><table class="tab"><thead><tr><th>Arquivo</th><th>Canal</th><th>Novas</th><th>Repetidas ignoradas</th><th>Importado em</th></tr></thead><tbody>' +
        arquivos.map(function (a) { return '<tr><td>' + esc(a.nome) + '</td><td>' + esc(CANAIS[a.canal] || a.canal) + '</td><td>' + a.novas + '</td><td>' + a.repetidas + '</td><td class="mono">' + U.fmtDataHora(a.quando) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    h += '<h3>O que você pode fazer</h3><ul class="acoes-explicadas">' +
      '<li><button type="button" class="btn btn-peq" data-acao="ir-importar">Importar arquivo mais recente</button><span class="sub">Leva para a tela Importar. Mensagens que já estão no painel são reconhecidas e ignoradas, então pode importar a conversa inteira de novo.</span></li>' +
      '<li><button type="button" class="btn btn-sec btn-peq" data-acao="recalcular"' + (pode('editar') ? '' : ' disabled') + '>Recalcular análises</button><span class="sub">Refaz a classificação automática das mensagens não revisadas com as palavras-chave atuais e recalcula todos os números. As revisadas não mudam.' + (pode('editar') ? '' : ' Precisa da função Edição ou Administração.') + '</span></li></ul>' +
      '<p class="nota-peq">' + (S.modo === 'demo' ? 'O exemplo fictício não tem fonte externa: os dados não mudam ao atualizar. ' : '') + 'Atualização automática ainda não está disponível. Ela depende do bot do Telegram e do servidor do painel, que ainda não foram configurados.</p></div>';
    abrirModal(h);
    S.modalAtivo = 'atualizar';
  }

  function moverItem(lista, i, d) {
    var j = i + d;
    if (j < 0 || j >= lista.length) return;
    var x = lista[i]; lista[i] = lista[j]; lista[j] = x;
  }

  function salvarVisualizacao() {
    var nome = (document.getElementById('sv-nome').value || '').trim();
    var erro = document.getElementById('sv-erro');
    if (!nome) { erro.textContent = 'Dê um nome para a visualização.'; erro.hidden = false; return; }
    var vis = lerVisualizacoes();
    vis.lista[nome] = { prefs: JSON.parse(JSON.stringify(S.prefs)), filtros: JSON.parse(JSON.stringify(S.filtros)), salvoEm: Date.now() };
    if (document.getElementById('sv-padrao').checked) vis.padrao = nome;
    else if (vis.padrao === nome) vis.padrao = '';
    if (!gravarVisualizacoes(vis)) { erro.textContent = 'Este navegador bloqueou o armazenamento (por exemplo, janela anônima). A visualização não foi salva.'; erro.hidden = false; return; }
    S.visAtual = nome;
    registrar('Salvou visualização', nome);
    avisar('Visualização "' + nome + '" salva neste navegador.');
    fecharModal();
    render();
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

  // Chave para reconhecer a mesma mensagem em importações repetidas (não guarda o remetente em texto).
  function chaveMensagem(x) { return x.canal + '|' + Math.floor(x.data / 60000) + '|' + chaveRemetente(x.remetente) + '|' + U.norm(x.texto).slice(0, 200); }

  function confirmarImportacao() {
    var p = S.impPrevia, c = S.dados.import;
    c.chaves = c.chaves || {};
    c.arquivos = c.arquivos || [];
    var total = p.mensagens.length;
    p.mensagens = p.mensagens.filter(function (x) { var k = chaveMensagem(x); if (c.chaves[k]) return false; c.chaves[k] = 1; return true; });
    var repetidas = total - p.mensagens.length;
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
      return { id: 'i' + (++S.seqImport), origem: 'import', arquivo: p.arquivo, conversa: x.canal + ':' + p.arquivo, canal: x.canal, data: x.data, texto: x.texto, equipe: eq, autor: eq ? x.remetente : null,
        alunaId: alunaId, tipo: eq ? 'outro' : auto.tipo, tema: auto.tema, auto: auto, revisado: eq, aut: null, resposta: null, respondeA: null, idOrigem: x.idOrigem, respondeOrigem: x.respondeOrigem };
    });
    // Liga cada pergunta à resposta da equipe.
    // Telegram: pelo "responder" da mensagem. Sem isso: primeira mensagem da equipe depois (WhatsApp até 24 h; grupo até 1 h), marcada como estimada.
    var porOrigem = {};
    novas.forEach(function (m) { if (m.idOrigem != null) porOrigem[m.idOrigem] = m; });
    novas.forEach(function (m) {
      if (!m.equipe || m.respondeOrigem == null) return;
      var alvo = porOrigem[m.respondeOrigem];
      if (alvo && !alvo.equipe) { m.respondeA = alvo.id; if (!alvo.resposta) alvo.resposta = m.id; }
    });
    var ordenadas = novas.slice().sort(function (a, b) { return a.data - b.data; });
    ordenadas.forEach(function (m, i) {
      if (m.equipe || m.resposta || !ehDor(m)) return;
      var limite = m.data + (m.canal === 'whatsapp' ? 24 : 1) * 3600000;
      for (var k = i + 1; k < ordenadas.length && ordenadas[k].data <= limite; k++) {
        var e = ordenadas[k];
        if (e.equipe && (e.respondeOrigem == null || e.respondeA === m.id)) {
          m.resposta = e.id; m.respostaEstimada = e.respondeA !== m.id;
          if (!e.respondeA) e.respondeA = m.id;
          break;
        }
      }
    });
    novas.forEach(function (m) {
      delete m.idOrigem; delete m.respondeOrigem;
      if (!m.equipe && ehProva(m)) m.aut = { status: 'nao_solicitada', confirmadoPor: '', data: null };
    });
    c.mensagens = c.mensagens.concat(novas).sort(function (a, b) { return a.data - b.data; });
    c.arquivos.push({ nome: p.arquivo, canal: (novas[0] || {}).canal || '', novas: novas.length, repetidas: repetidas, quando: Date.now() });
    S.calculadoEm = Date.now();
    registrar('Importou arquivo', p.arquivo + ' · ' + novas.length + ' novas, ' + repetidas + ' repetidas ignoradas');
    S.impPrevia = null;
    S.modo = 'import';
    S.filtros.periodo = 'tudo';
    invalidarMascaras();
    S.aba = 'visao';
    avisar(novas.length + ' mensagens novas importadas' + (repetidas ? ', ' + repetidas + ' repetidas ignoradas' : '') + '. Revise as classificações automáticas.');
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

  function irPara(aba) {
    S.aba = aba; S.limite = 40; S.menuAberto = false;
    if (location.hash !== '#' + aba) { try { history.replaceState(null, '', '#' + aba); } catch (e) { location.hash = aba; } }
    render();
    document.getElementById('conteudo').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function acharMsg(id) { return conj().mensagens.find(function (m) { return m.id === id; }); }
  function acharFoto(id) { return conj().midias.find(function (m) { return m.id === id; }); }

  var ACOES = {
    aba: function (b) { irPara(b.dataset.v); },
    menu: function () { S.menuAberto = !S.menuAberto; renderMoldura(); if (S.menuAberto) { var a = document.querySelector('#nav [aria-current="page"]'); if (a) a.focus(); } },
    periodo: function (b) { S.filtros.periodo = b.dataset.v; S.limite = 40; render(); },
    'toggle-filtros': function () { S.filtrosAbertos = !S.filtrosAbertos; renderFiltros(); var f = document.getElementById('f-canal'); if (S.filtrosAbertos && f) f.focus(); },
    'remover-filtro': function (b) { S.filtros[b.dataset.k] = ''; render(); avisar('Filtro removido.'); },
    personalizar: function (b) { renderPersonalizar(); if (b.dataset.foco === 'adicionar') { var x = document.getElementById('pz-novo'); if (x) x.focus(); } },
    'salvar-vis': function () { renderSalvarVis(); var n = document.getElementById('sv-nome'); if (n) n.focus(); },
    'salvar-vis-ok': function () { salvarVisualizacao(); },
    'vis-usar': function (b) { var v = lerVisualizacoes().lista[b.dataset.v]; if (!v) return; aplicarVisualizacao(v); S.visAtual = b.dataset.v; fecharModal(); render(); avisar('Visualização "' + b.dataset.v + '" aplicada.'); },
    'vis-excluir': function (b) { var vis = lerVisualizacoes(); delete vis.lista[b.dataset.v]; if (vis.padrao === b.dataset.v) vis.padrao = ''; gravarVisualizacoes(vis); if (S.visAtual === b.dataset.v) S.visAtual = ''; render(); renderSalvarVis(); avisar('Visualização excluída.'); },
    mover: function (b) { moverItem(b.dataset.tipo === 'ind' ? S.prefs.indicadores : S.prefs.secoes, +b.dataset.i, +b.dataset.d); S.visAtual = ''; render(); renderPersonalizar(); },
    'remover-ind': function (b) { S.prefs.indicadores = S.prefs.indicadores.filter(function (x) { return x !== b.dataset.v; }); S.visAtual = ''; render(); renderPersonalizar(); },
    'adicionar-ind': function () { var v = document.getElementById('pz-novo').value; if (!v || !INDICADORES[v]) return; S.prefs.indicadores.push(v); S.visAtual = ''; render(); renderPersonalizar(); avisar('Indicador adicionado: ' + INDICADORES[v].nome); },
    redefinir: function () { S.confirmarRedefinir = true; renderPersonalizar(); },
    'redefinir-nao': function () { S.confirmarRedefinir = false; renderPersonalizar(); },
    'redefinir-sim': function () {
      S.prefs = prefsPadrao(); S.visAtual = ''; S.confirmarRedefinir = false;
      S.filtros = { periodo: S.prefs.periodo, inicio: '', fim: '', canal: '', tema: '', tipo: '', autorizacao: '' };
      registrar('Redefiniu o painel', 'Indicadores, seções, período e filtros voltaram ao padrão');
      render(); renderPersonalizar(); avisar('Painel redefinido. Visualizações salvas continuam disponíveis.');
    },
    atualizar: function () { renderAtualizar(); },
    'ir-importar': function () { fecharModal(); irPara('importar'); },
    recalcular: function () {
      if (!pode('editar')) return;
      var n = 0;
      conj().mensagens.forEach(function (m) { if (m.revisado || m.equipe) return; var a = C.classificar(m.texto, S.temas); m.auto = a; m.tipo = a.tipo; m.tema = a.tema; n++; });
      S.calculadoEm = Date.now();
      registrar('Recalculou análises', n + ' classificações automáticas refeitas');
      render(); renderAtualizar(); avisar('Análises recalculadas. ' + n + ' classificações automáticas refeitas.');
    },
    'ir-alerta': function (b) {
      var v = b.dataset.v;
      if (v === 'dia-sem-resposta') { S.soSemResposta = true; S.soNaoRevisadas = false; irPara('mensagens'); }
      else if (v === 'revisao') { S.soNaoRevisadas = true; S.soSemResposta = false; irPara('mensagens'); }
      else irPara(v);
    },
    'ver-todos-assuntos': function () { S.verTodosAssuntos = !S.verTodosAssuntos; render(); },
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
      registrar('Registrou autorização', (b.dataset.alvo === 'msg' ? 'Msg ' : 'Foto ') + alvo.id + ': ' + AUT[st] + (por ? ' (confirmado por ' + por + ')' : ''));
      avisar('Autorização registrada.');
      render();
    },
    'abrir-editor': function (b) { abrirEditor(b.dataset.id, b.dataset.lado); },
    'fechar-editor': function () { S.editor = null; fecharModal(); },
    'ed-sugestao': function () { var E = S.editor; E.areas = E.foto.rostos[E.lado].map(function (r) { return Object.assign({}, r); }); E.previa = null; renderEditor(); },
    'ed-limpar': function () { S.editor.areas = []; S.editor.previa = null; renderEditor(); },
    'ed-previa': function () { gerarPrevia(); renderEditor(); },
    'ed-salvar': function () {
      var E = S.editor;
      E.foto.tratadas[E.lado] = E.previa;
      E.foto.tratadaInfo[E.lado] = { quando: Date.now(), areas: E.areas.length };
      registrar('Criou cópia com áreas ocultas', 'Foto ' + E.foto.id + ' (' + E.lado + ') · ' + E.areas.length + ' área(s); original mantido');
      S.editor = null;
      fecharModal();
      avisar('Cópia salva. O original foi mantido.');
      render();
    },
    'abrir-compositor': function (b) { abrirCompositor(b.dataset.fonte, b.dataset.id); },
    'fechar-compositor': function () { S.compositor = null; fecharModal(); },
    'cp-enviar': function () {
      var K = S.compositor;
      if (!K || !pode('editar')) return;
      var c = conj();
      var fonte = K.fonte === 'msg' ? acharMsg(K.id) : acharFoto(K.id);
      var tipo = K.fonte === 'msg' ? 'depoimento' : fonte.tipo;
      c.prints.push({ id: 'p' + (c.prints.length + 1) + (S.modo === 'demo' ? '' : 'i'), fonte: K.fonte, fonteId: K.id, alunaId: fonte.alunaId, tipo: tipo, formato: K.formato, url: K.previa, status: 'aguardando', criadoEm: Date.now(), nota: '' });
      S.assinatura = K.assinatura;
      registrar('Criou print para aprovação', TIPOS_PRINT[tipo] + ' · ' + P.prints.FORMATOS[K.formato].nome);
      S.compositor = null;
      fecharModal();
      S.aba = 'prints'; S.subPrints = 'aguardando';
      avisar('Print enviado para aprovação.');
      render();
    },
    'ver-print': function (b) {
      var p = conj().prints.find(function (x) { return x.id === b.dataset.id; });
      abrirModal('<div class="modal-caixa modal-ver" role="dialog" aria-modal="true" aria-label="Print em tamanho maior"><div class="card-topo"><h2>' + esc(TIPOS_PRINT[p.tipo]) + '</h2><button type="button" class="btn btn-sec btn-peq" data-acao="fechar-modal">Fechar</button></div><img src="' + p.url + '" alt="Print em tamanho maior"></div>');
    },
    'fechar-modal': function () { fecharModal(); },
    'print-aprovar': function (b) {
      if (!pode('admin')) return;
      var p = conj().prints.find(function (x) { return x.id === b.dataset.id; });
      if (!printValido(p)) return;
      // Sem login real, registramos a função simulada. Com login, aqui entra o e-mail de quem aprovou.
      p.status = 'aprovado'; p.aprovadoPor = PAPEIS[S.papel].nome + ' (login simulado)'; p.aprovadoEm = Date.now(); p.nota = '';
      registrar('Aprovou print', p.id + ' · ' + TIPOS_PRINT[p.tipo]);
      avisar('Print aprovado.');
      render();
    },
    'print-ajuste': function (b) {
      if (!pode('admin')) return;
      var p = conj().prints.find(function (x) { return x.id === b.dataset.id; });
      var nota = (document.getElementById('nota-' + p.id) || {}).value || '';
      p.status = 'ajuste'; p.nota = nota.trim() || 'Sem detalhe';
      registrar('Pediu ajuste no print', p.id + ': ' + p.nota);
      render();
    },
    'print-baixar': function (b) {
      if (!pode('exportar')) return;
      var p = conj().prints.find(function (x) { return x.id === b.dataset.id; });
      if (!printValido(p) || p.status !== 'aprovado') return;
      registrar('Baixou print', p.id);
      U.baixar((S.modo === 'demo' ? 'FICTICIO-' : '') + nomeArquivoPrint(p), blobDeDataURL(p.url));
    },
    'print-descartar': function (b) {
      if (!pode('editar')) return;
      var c = conj();
      c.prints = c.prints.filter(function (x) { return x.id !== b.dataset.id; });
      registrar('Descartou print', b.dataset.id + ' (a foto ou o depoimento de origem continuam guardados)');
      render();
    },
    'pacote-drive': function () { if (pode('exportar')) baixarPacote(); },
    'ir-fotos': function () { S.aba = 'resultados'; S.subRes = 'fotos'; render(); window.scrollTo(0, 0); },
    'conv-mostrar': function (b) { S.conv.mostrar = b.dataset.v; render(); },
    'foto-adicionar': function () {
      if (!pode('editar')) return;
      var fa = document.getElementById('foto-antes').files[0], fd = document.getElementById('foto-depois').files[0];
      if (!fa) { avisar('Escolha pelo menos a foto de antes (ou o print da conversa).'); return; }
      function ler(file) { return new Promise(function (ok) { var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.readAsDataURL(file); }); }
      Promise.all([ler(fa), fd ? ler(fd) : Promise.resolve(null)]).then(function (r) {
        var c = S.dados.import;
        var id = 'if' + (c.midias.length + 1);
        c.midias.push({ id: id, origem: 'import', tipo: r[1] ? 'antes_depois' : 'print_conversa', alunaId: document.getElementById('foto-aluna').value,
          descricao: document.getElementById('foto-desc').value || fa.name, data: Date.now(), fotos: { antes: r[0], depois: r[1] },
          tratadas: { antes: null, depois: null }, tratadaInfo: {}, ocultarRosto: true, aut: { status: 'nao_solicitada', confirmadoPor: '', data: null } });
        registrar('Adicionou ' + (r[1] ? 'antes e depois' : 'print de conversa'), id + ' (só na memória da aba)');
        render();
      });
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
      S.dados.import = { alunas: {}, mensagens: [], midias: [], prints: [], chaves: {}, arquivos: [] };
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
      S.calculadoEm = Date.now();
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
    'ed-bloco': function (el) { S.editor.bloco = +el.value; S.editor.previa = null; renderEditor(); },
    cp: function (el) {
      var K = S.compositor;
      K[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value;
      if (el.dataset.k === 'formato') K.layout = el.value === 'stories' ? 'empilhado' : K.layout;
      gerarPrint();
      renderCompositor();
    },
    'conv-sem': function (el) { S.conv.semResposta = el.checked; render(); },
    metrica: function (el) { S.prefs.metrica = el.value; S.visAtual = ''; render(); if (S.modalAtivo === 'personalizar') renderPersonalizar(); },
    'secao-vis': function (el) { var x = S.prefs.secoes.find(function (s) { return s.id === el.dataset.v; }); x.visivel = el.checked; S.visAtual = ''; render(); renderPersonalizar(); },
    'pref-periodo': function (el) { S.prefs.periodo = el.value; S.filtros.periodo = el.value; S.visAtual = ''; render(); renderPersonalizar(); },
    'vis-aplicar': function (el) {
      if (!el.value) { S.visAtual = ''; return; }
      var v = lerVisualizacoes().lista[el.value];
      if (v) { aplicarVisualizacao(v); S.visAtual = el.value; render(); avisar('Visualização "' + el.value + '" aplicada.'); }
    },
    'so-sem-resp': function (el) { S.soSemResposta = el.checked; S.limite = 40; renderListaMensagens(); }
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
    var modal = document.getElementById('modal');
    if (e.key === 'Escape') {
      if (!modal.hidden) { S.editor = null; S.compositor = null; fecharModal(); }
      else if (S.menuAberto) { S.menuAberto = false; renderMoldura(); document.getElementById('menu-btn').focus(); }
      return;
    }
    if (e.key === 'Tab' && !modal.hidden) {
      var foc = Array.prototype.filter.call(modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'), function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!foc.length) return;
      var pri = foc[0], ult = foc[foc.length - 1];
      if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); }
      else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
    }
  });
  var tResize;
  window.addEventListener('resize', function () { clearTimeout(tResize); tResize = setTimeout(desenharGrafico, 120); });

  /* ---------- início ---------- */

  S.prefs = prefsPadrao();
  (function () {
    var vis = lerVisualizacoes();
    if (vis.padrao && vis.lista[vis.padrao]) { aplicarVisualizacao(vis.lista[vis.padrao]); S.visAtual = vis.padrao; }
  })();
  window.addEventListener('hashchange', function () {
    var h = location.hash.slice(1);
    if (h !== S.aba && ABAS.some(function (a) { return a.id === h; })) irPara(h);
  });
  S.dados.demo = P.demo.gerar(S.temas, S.equipe);

  // Prints de exemplo (fictícios): um aguardando aprovação e um aprovado, feitos com as cópias de rosto oculto.
  (function () {
    var d = S.dados.demo, PR = P.prints;
    var fontes = d.midias.filter(function (f) { return autValida(f.aut) && f.tratadas.antes && f.tratadas.depois; });
    var depo = d.mensagens.find(function (m) { return m.tipo === 'depoimento' && prontoDivulgacao(m); });
    if (depo) d.prints.push({ id: 'p1', fonte: 'msg', fonteId: depo.id, alunaId: depo.alunaId, tipo: 'depoimento', formato: 'feed', url: PR.cardDepoimento({ formato: 'feed', texto: PRIV.mascararTexto(depo.texto, d.alunas), atribuicao: 'Aluna do programa', fundo: 'rosa' }), status: 'aguardando', criadoEm: Date.now() - 3600000, nota: '' });
    Promise.all(fontes.map(function (f) { return Promise.all([PR.carregar(f.tratadas.antes), PR.carregar(f.tratadas.depois)]); })).then(function (pares) {
      pares.forEach(function (im, i) {
        var f = fontes[i];
        d.prints.push({ id: 'p' + (d.prints.length + 1), fonte: 'midia', fonteId: f.id, alunaId: f.alunaId, tipo: 'antes_depois', formato: i ? 'stories' : 'feed',
          url: PR.antesDepois({ formato: i ? 'stories' : 'feed', layout: i ? 'empilhado' : 'lado', antes: im[0], depois: im[1], rotulos: true, periodo: f.descricao, fundo: 'claro' }),
          status: i ? 'aprovado' : 'aguardando', criadoEm: Date.now() - (i + 2) * 3600000, aprovadoPor: i ? 'Administração (login simulado)' : null, aprovadoEm: i ? Date.now() - 1800000 : null, nota: '' });
      });
      render();
    });
  })();
  if (/^#(visao|dia|dores|resultados|prints|ideias|ajuda|mensagens|relatorios|importar|config)$/.test(location.hash)) S.aba = location.hash.slice(1);
  render();
})(window.Painel);

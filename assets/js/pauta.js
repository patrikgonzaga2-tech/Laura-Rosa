/*
 * Pauta de conteúdo e necessidades das alunas.
 * Transforma as mensagens do período em: pauta sugerida, perguntas que se repetem,
 * bloqueios de mentalidade, o que está crescendo, provas por objeção e melhorias na entrega.
 * Tudo é gerado por regras e precisa de leitura humana antes de virar post ou decisão.
 */
window.Painel = window.Painel || {};
(function (P) {
  'use strict';

  var U = P.util, C = P.classificador, esc = U.esc;
  var DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  var PALAVRAS_VAZIAS = {};
  ('a o as os de da do das dos e em um uma uns umas no na nos nas pra pro para por com sem que se me mim minha meu ' +
   'eu ta to tava nao mas ja ou ao mais muito isso esse essa aqui ai la ele ela elas eles voce vcs tem ter hoje dia ' +
   'como faco faz fazer posso pode qual quais sera seria vou vai ser estou esta tou tao bem so ate entao ainda gente').split(' ')
    .forEach(function (w) { PALAVRAS_VAZIAS[w] = true; });

  function tokens(t) {
    var r = {};
    U.norm(t).split(/[^a-z0-9]+/).forEach(function (w) { if (w.length >= 3 && !PALAVRAS_VAZIAS[w]) r[w] = true; });
    return Object.keys(r);
  }
  function jaccard(a, b) {
    if (!a.length || !b.length) return 0;
    var sb = {}, inter = 0;
    b.forEach(function (w) { sb[w] = true; });
    a.forEach(function (w) { if (sb[w]) inter++; });
    return inter / (a.length + b.length - inter);
  }

  // Agrupa mensagens parecidas ("Como coloco na TV?" e "Dá pra ver na TV da sala?").
  function agrupar(msgs, textoFn) {
    var grupos = [];
    msgs.forEach(function (m) {
      var tk = tokens(m.texto);
      var melhor = null, nota = 0;
      grupos.forEach(function (g) {
        if (g.tema !== m.tema) return;
        var s = jaccard(tk, g.tk);
        if (s > nota) { nota = s; melhor = g; }
      });
      var txt = textoFn(m);
      if (melhor && nota >= 0.5) {
        melhor.itens.push(m);
        melhor.textos[txt] = (melhor.textos[txt] || 0) + 1;
      } else {
        var g = { tk: tk, tema: m.tema, itens: [m], textos: {} };
        g.textos[txt] = 1;
        grupos.push(g);
      }
    });
    grupos.forEach(function (g) {
      var ord = Object.keys(g.textos).sort(function (a, b) { return g.textos[b] - g.textos[a]; });
      g.principal = ord[0];
      g.variacoes = ord.slice(1, 3);
    });
    return grupos.sort(function (a, b) { return b.itens.length - a.itens.length; });
  }

  function citar(t) { return '“' + esc(t) + '”'; }

  /*
   * ctx: { lista, anterior, todas, iv, temas, objecoes, resultados, textoSeguro, nomeTema, pronto, sinais }
   * Devolve { html, texto, csv }.
   */
  function construir(ctx) {
    var A = P.analise;
    var temas = ctx.temas;
    var tema = function (id) { return temas.find(function (t) { return t.id === id; }) || { id: id, nome: ctx.nomeTema(id), natureza: 'conteudo' }; };
    var ehDor = function (m) { return m.tipo === 'duvida' || m.tipo === 'dificuldade' || m.tipo === 'queixa'; };
    var dores = ctx.lista.filter(ehDor), doresAnt = ctx.anterior.filter(ehDor);
    var provas = ctx.lista.filter(function (m) { return m.tipo === 'depoimento' || m.tipo === 'evolucao'; });
    var porTema = U.contarPor(dores, 'tema'), porTemaAnt = U.contarPor(doresAnt, 'tema');
    var grupos = agrupar(dores, ctx.textoSeguro);
    var objs = A.analisarObjecoes({ lista: ctx.lista, anterior: ctx.anterior, objecoes: ctx.objecoes, temas: temas, textoSeguro: ctx.textoSeguro, pronto: ctx.pronto });
    var res = A.analisarResultados({ lista: ctx.lista, resultados: ctx.resultados, pronto: ctx.pronto });
    var inter = A.interacao(ctx.todas, ctx.iv);
    var sugestoes = A.sugestoesAjuda({ lista: ctx.lista, anterior: ctx.anterior, temas: temas, objecoesAn: objs, grupos: grupos, sinais: ctx.sinais, interacao: inter });
    var h = [], t = [], csv = [];
    function secao(titulo, nota) { h.push('<h3>' + esc(titulo) + '</h3>' + (nota ? '<p class="rel-meta">' + esc(nota) + '</p>' : '')); t.push(titulo.toUpperCase()); }
    function fimSecao() { t.push(''); }

    // Provas ligadas a cada assunto.
    var provasPorTema = {};
    provas.forEach(function (m) {
      var rel = C.temasRelacionados(m.texto, temas);
      if (rel.indexOf(m.tema) === -1) rel.push(m.tema);
      rel.forEach(function (id) {
        var p = provasPorTema[id] = provasPorTema[id] || { prontas: [], aguardando: 0 };
        if (ctx.pronto(m)) p.prontas.push(m); else p.aguardando++;
      });
    });

    var ordemTemas = Object.keys(porTema).sort(function (a, b) { return porTema[b] - porTema[a]; });
    var crescendo = Object.keys(porTema).map(function (id) {
      var a = porTema[id], b = porTemaAnt[id] || 0;
      return { id: id, a: a, b: b, pct: b ? Math.round((a - b) / b * 100) : null };
    }).filter(function (x) { return (x.pct !== null && x.pct >= 30 && x.a >= 5) || (x.pct === null && x.a >= 3); })
      .sort(function (x, y) { return (y.pct === null ? 999 : y.pct) - (x.pct === null ? 999 : x.pct); });
    var totalProntas = provas.filter(ctx.pronto).length;

    // ---- 1. Em poucas palavras
    var frase = [];
    if (ordemTemas.length) frase.push('O assunto que mais gerou dúvida ou dificuldade foi <strong>' + esc(tema(ordemTemas[0]).nome) + '</strong> (' + porTema[ordemTemas[0]] + ' mensagens).');
    if (objs.length) frase.push('A objeção mais repetida foi <strong>"' + esc(objs[0].obj.nome) + '"</strong> (' + objs[0].n + ' vezes).');
    if (crescendo.length) frase.push('O que mais cresceu foi <strong>' + esc(tema(crescendo[0].id).nome) + '</strong> (' + (crescendo[0].pct === null ? 'novo no período' : '+' + crescendo[0].pct + '%') + ').');
    if (res.length && res[0].n) frase.push('O resultado mais relatado foi <strong>' + esc(res[0].res.nome.toLowerCase()) + '</strong>.');
    frase.push(provas.length + ' relato(s) e depoimento(s) no período: ' + totalProntas + ' autorizado(s) para divulgação.');
    secao('Em poucas palavras');
    h.push('<p>' + frase.join(' ') + '</p>');
    t.push(frase.join(' ').replace(/<[^>]+>/g, ''));
    fimSecao();

    // ---- 2. Pauta sugerida
    var candidatos = Object.keys(porTema).filter(function (id) { var n = tema(id).natureza; return (n === 'conteudo' || n === 'mentalidade') && id !== 'outros'; })
      .map(function (id) {
        var a = porTema[id], b = porTemaAnt[id] || 0;
        var alta = b ? Math.max(0, Math.min(1, (a - b) / b)) : (a >= 3 ? 1 : 0);
        return { id: id, n: a, b: b, nota: a * (1 + alta * 0.5) };
      }).sort(function (x, y) { return y.nota - x.nota; }).slice(0, 6);
    secao('Pauta sugerida', 'Ordenada por quantas mensagens trouxeram o assunto, com peso extra para o que está crescendo. A frase mais repetida serve de gancho: use como inspiração e não publique a frase literal de uma aluna.');
    csv.push(['secao', 'item', 'evidencia', 'ideia_ou_formato', 'angulo_do_metodo', 'gancho_ou_exemplo', 'provas_autorizadas', 'provas_aguardando']);
    if (!candidatos.length) h.push('<p>Poucos dados no período para sugerir pauta.</p>');
    h.push('<ol class="pauta">' + candidatos.map(function (c, i) {
      var tm = tema(c.id);
      var g = grupos.find(function (x) { return x.tema === c.id; });
      var pv = provasPorTema[c.id] || { prontas: [], aguardando: 0 };
      var v = U.variacao(c.n, c.b);
      t.push((i + 1) + '. ' + tm.nome + ' (' + c.n + ' mensagens, ' + v.txt + ')', '   Ideia: ' + (tm.ideia || '—'), '   Ângulo do método: ' + (tm.angulo || '—'),
        '   Gancho (do jeito que elas falam): ' + (g ? '"' + g.principal + '" (' + g.itens.length + 'x)' : '—'),
        '   Provas: ' + pv.prontas.length + ' autorizada(s), ' + pv.aguardando + ' aguardando');
      csv.push(['Pauta', tm.nome, c.n + ' mensagens (' + v.txt + ')', tm.ideia || '', tm.angulo || '', g ? g.principal : '', pv.prontas.length, pv.aguardando]);
      return '<li><div class="pauta-topo"><strong>' + esc(tm.nome) + '</strong><span class="rel-meta">' + c.n + ' mensagens · ' + v.txt + ' vs. período anterior' + (tm.natureza === 'mentalidade' ? ' · bloqueio de mentalidade' : '') + '</span></div>' +
        '<dl class="pauta-campos">' +
        '<div><dt>Ideia e formato</dt><dd>' + esc(tm.ideia || 'Defina em Configurações') + '</dd></div>' +
        '<div><dt>Ângulo do seu método</dt><dd>' + esc(tm.angulo || 'Defina em Configurações') + '</dd></div>' +
        '<div><dt>Gancho (do jeito que elas falam)</dt><dd>' + (g ? citar(g.principal) + ' <span class="rel-meta">· ' + g.itens.length + ' vez(es)</span>' : '—') + '</dd></div>' +
        '<div><dt>Prova social</dt><dd>' + (pv.prontas.length ? pv.prontas.length + ' relato(s) autorizado(s) sobre esse assunto' : 'Nenhum relato autorizado ainda') + (pv.aguardando ? ' · ' + pv.aguardando + ' aguardando autorização' : '') + '</dd></div>' +
        '</dl></li>';
    }).join('') + '</ol>');
    fimSecao();

    // ---- 3. Objeções e como quebrar
    secao('Objeções e como quebrar', 'Crenças que aparecem nas mensagens e travam a aluna. Cada uma pode virar post de "mito x verdade" e entrar no acolhimento do grupo.');
    if (!objs.length) h.push('<p>Nenhuma objeção encontrada no período.</p>');
    h.push(objs.slice(0, 6).map(function (o) {
      var v = U.variacao(o.n, o.antes);
      var prova = o.prontas.length ? citar(ctx.textoSeguro(o.prontas[0])) : '<span class="rel-meta">Nenhum relato autorizado' + (o.aguardando ? '. Peça autorização para ' + o.aguardando + ' relato(s) já recebido(s)' : '. Vale estimular relatos sobre isso') + '</span>';
      t.push('- "' + o.obj.nome + '" (' + o.n + 'x, ' + v.txt + ')' + (o.exemplos[0] ? ' Ex.: "' + o.exemplos[0].texto + '"' : ''), '   Como quebrar: ' + o.obj.quebra, '   Prova: ' + (o.prontas.length ? '"' + ctx.textoSeguro(o.prontas[0]) + '"' : 'nenhuma autorizada (' + o.aguardando + ' aguardando)'));
      csv.push(['Objeção', o.obj.nome, o.n + 'x (' + v.txt + ')', '', o.obj.quebra, o.exemplos[0] ? o.exemplos[0].texto : '', o.prontas.length, o.aguardando]);
      return '<div class="objecao"><p class="objecao-nome">"' + esc(o.obj.nome) + '" <span class="rel-meta">· ' + o.n + ' menções · ' + v.txt + '</span></p>' +
        (o.exemplos.length ? '<p class="rel-meta">Como aparece: ' + o.exemplos.slice(0, 2).map(function (e) { return citar(e.texto); }).join(' · ') + '</p>' : '') +
        '<p><span class="rel-meta">Como quebrar:</span> ' + esc(o.obj.quebra) + '</p>' +
        '<p><span class="rel-meta">Prova:</span> ' + prova + '</p></div>';
    }).join(''));
    fimSecao();

    // ---- 4. Ideias de antes e depois
    secao('Ideias de antes e depois', 'A partir dos resultados que as alunas relatam. Vão além da foto do corpo e combinam com a sua mensagem de constância. Use só material com autorização para divulgação.');
    var comRes = res.filter(function (r) { return r.n; });
    if (!comRes.length) h.push('<p>Nenhum relato de resultado no período.</p>');
    h.push('<ol class="rel-lista">' + comRes.map(function (r) {
      t.push('- ' + r.res.nome + ' (' + r.n + ' relatos, ' + r.prontas.length + ' autorizados): ' + r.res.ideia);
      csv.push(['Antes e depois', r.res.nome, r.n + ' relatos', r.res.ideia, '', r.prontas[0] ? ctx.textoSeguro(r.prontas[0]) : '', r.prontas.length, r.aguardando]);
      return '<li><strong>' + esc(r.res.nome) + '</strong> <span>(' + r.n + ' relato(s) · ' + r.prontas.length + ' autorizado(s)' + (r.aguardando ? ' · ' + r.aguardando + ' aguardando' : '') + ')</span><br>' + esc(r.res.ideia) +
        (r.prontas[0] ? '<br><span>Exemplo autorizado: ' + citar(ctx.textoSeguro(r.prontas[0])) + '</span>' : '') + '</li>';
    }).join('') + '</ol>');
    fimSecao();

    // ---- 5. O que mais gerou conversa no grupo
    secao('O que mais gerou conversa no grupo', 'Suas mensagens no Telegram e quantas respostas das alunas vieram em seguida (até 3 h ou até sua próxima mensagem).');
    if (inter.posts.length) {
      h.push('<p>Média geral: ' + inter.media.toFixed(1).replace('.', ',') + ' respostas por mensagem sua (' + inter.total + ' mensagens no período).</p><ol class="rel-lista">' + inter.posts.slice(0, 5).map(function (x) {
        t.push('- "' + x.texto + '": ' + x.media.toFixed(1).replace('.', ',') + ' respostas em média (' + x.vezes + 'x)');
        return '<li>' + citar(x.texto) + ' <span>(' + x.media.toFixed(1).replace('.', ',') + ' respostas em média' + (x.vezes > 1 ? ', enviada ' + x.vezes + 'x' : '') + ')</span></li>';
      }).join('') + '</ol>');
    } else { h.push('<p>Sem mensagens da equipe no Telegram neste período. Ao importar, marque quem é da equipe.</p>'); t.push('Sem dados.'); }
    fimSecao();

    // ---- 6. Perguntas que mais se repetem
    var faq = grupos.filter(function (g) { return g.itens.some(function (m) { return m.tipo === 'duvida'; }); }).slice(0, 8);
    secao('Perguntas que mais se repetem', 'Mensagens parecidas foram agrupadas. Viram material fixo no grupo e pauta de conteúdo.');
    h.push('<ol class="rel-lista">' + faq.map(function (g) {
      t.push('- (' + g.itens.length + 'x) "' + g.principal + '" [' + tema(g.tema).nome + ']');
      return '<li>' + citar(g.principal) + ' <span>(' + g.itens.length + 'x · ' + esc(tema(g.tema).nome) + ')</span>' +
        (g.variacoes.length ? '<br><span>Também escrevem: ' + g.variacoes.map(citar).join(' · ') + '</span>' : '') + '</li>';
    }).join('') + '</ol>');
    fimSecao();

    // ---- 7. O que está crescendo
    secao('O que está crescendo');
    if (crescendo.length) {
      h.push('<ul class="rel-lista">' + crescendo.slice(0, 5).map(function (x) {
        var txt = tema(x.id).nome + ': ' + x.a + ' mensagens (antes: ' + x.b + (x.pct === null ? ', novo' : ', +' + x.pct + '%') + ')' + (tema(x.id).natureza === 'entrega' ? '. Parece problema de entrega, não de conteúdo' : '');
        t.push('- ' + txt);
        return '<li>' + esc(txt) + '</li>';
      }).join('') + '</ul>');
    } else { h.push('<p>Nenhum assunto cresceu de forma relevante.</p>'); t.push('Nada relevante.'); }
    fimSecao();

    // ---- 8. Como ajudar mais
    secao('Como ajudar mais', 'Sugestões geradas por regras, cada uma com a evidência que a gerou.');
    if (!sugestoes.length) h.push('<p>Nada a destacar.</p>');
    h.push('<ul class="rel-lista">' + sugestoes.map(function (x) {
      t.push('- [' + x.area + '] ' + x.titulo + ' | ' + x.detalhe + ' (' + x.evidencia + ')');
      csv.push(['Como ajudar mais', x.titulo, x.evidencia, x.detalhe, '', '', '', '']);
      return '<li><strong>' + esc(x.area) + ':</strong> ' + esc(x.titulo) + '<br><span>' + esc(x.detalhe) + ' · ' + esc(x.evidencia) + '</span></li>';
    }).join('') + '</ul>');
    fimSecao();

    var lim = 'Limites desta análise: a classificação é automática por palavras-chave e precisa de revisão. Só entra o que foi escrito: áudios, figurinhas e fotos não são lidos. Vale como termômetro, não como pesquisa.';
    h.push('<p class="rel-meta">' + esc(lim) + '</p>');
    t.push(lim);
    return { html: h.join(''), texto: t.join('\n'), csv: csv, objecoes: objs, resultados: res, interacao: inter, sugestoes: sugestoes, grupos: grupos };
  }

  P.pauta = { construir: construir, agrupar: agrupar };
})(window.Painel);

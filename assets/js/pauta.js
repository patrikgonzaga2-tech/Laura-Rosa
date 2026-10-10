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
   * ctx: { lista, anterior, temas, textoSeguro, nomeTema, pronto, atrasados, fimDia }
   * Devolve { html, texto, csv }.
   */
  function construir(ctx) {
    var temas = ctx.temas;
    var tema = function (id) { return temas.find(function (t) { return t.id === id; }) || { id: id, nome: ctx.nomeTema(id), natureza: 'conteudo' }; };
    var dores = ctx.lista.filter(function (m) { return m.tipo === 'duvida' || m.tipo === 'dificuldade' || m.tipo === 'queixa'; });
    var doresAnt = ctx.anterior.filter(function (m) { return m.tipo === 'duvida' || m.tipo === 'dificuldade' || m.tipo === 'queixa'; });
    var provas = ctx.lista.filter(function (m) { return m.tipo === 'depoimento' || m.tipo === 'evolucao'; });
    var porTema = U.contarPor(dores, 'tema'), porTemaAnt = U.contarPor(doresAnt, 'tema');
    var grupos = agrupar(dores, ctx.textoSeguro);
    var h = [], t = [], csv = [];

    // Provas ligadas a cada assunto (pelo assunto principal e pelos assuntos citados no texto).
    var provasPorTema = {};
    provas.forEach(function (m) {
      var rel = C.temasRelacionados(m.texto, temas);
      if (rel.indexOf(m.tema) === -1) rel.push(m.tema);
      rel.forEach(function (id) {
        var p = provasPorTema[id] = provasPorTema[id] || { prontas: [], aguardando: 0 };
        if (ctx.pronto(m)) p.prontas.push(m); else p.aguardando++;
      });
    });

    // ---- 1. Em poucas palavras
    var ordemTemas = Object.keys(porTema).sort(function (a, b) { return porTema[b] - porTema[a]; });
    var crescendo = Object.keys(porTema).map(function (id) {
      var a = porTema[id], b = porTemaAnt[id] || 0;
      return { id: id, a: a, b: b, pct: b ? Math.round((a - b) / b * 100) : null };
    }).filter(function (x) { return (x.pct !== null && x.pct >= 30 && x.a >= 5) || (x.pct === null && x.a >= 3); })
      .sort(function (x, y) { return (y.pct === null ? 999 : y.pct) - (x.pct === null ? 999 : x.pct); });
    var mentais = ordemTemas.filter(function (id) { return tema(id).natureza === 'mentalidade'; });
    var totalProntas = provas.filter(ctx.pronto).length;

    var frase = [];
    if (ordemTemas.length) frase.push('O que mais gerou dúvida ou dificuldade foi <strong>' + esc(tema(ordemTemas[0]).nome) + '</strong> (' + porTema[ordemTemas[0]] + ' mensagens).');
    if (crescendo.length) frase.push('O assunto que mais cresceu foi <strong>' + esc(tema(crescendo[0].id).nome) + '</strong> (' + (crescendo[0].pct === null ? 'novo no período' : '+' + crescendo[0].pct + '%') + ').');
    if (mentais.length) frase.push('O principal bloqueio de mentalidade foi <strong>' + esc(tema(mentais[0]).nome) + '</strong>.');
    frase.push(totalProntas + ' depoimento(s) ou relato(s) estão autorizados para divulgação e ' + (provas.length - totalProntas) + ' ainda aguardam autorização.');
    h.push('<h3>Em poucas palavras</h3><p>' + frase.join(' ') + '</p>');
    t.push('EM POUCAS PALAVRAS', frase.join(' ').replace(/<[^>]+>/g, ''), '');

    // ---- 2. Pauta sugerida
    var candidatos = Object.keys(porTema).filter(function (id) { var n = tema(id).natureza; return n === 'conteudo' || n === 'mentalidade'; })
      .filter(function (id) { return id !== 'outros'; })
      .map(function (id) {
        var a = porTema[id], b = porTemaAnt[id] || 0;
        var alta = b ? Math.max(0, Math.min(1, (a - b) / b)) : (a >= 3 ? 1 : 0);
        return { id: id, n: a, b: b, nota: a * (1 + alta * 0.5) };
      }).sort(function (x, y) { return y.nota - x.nota; }).slice(0, 6);
    h.push('<h3>Pauta sugerida</h3><p class="rel-meta">Ordenada por quantas alunas trouxeram o assunto, com peso extra para o que está crescendo. A frase mais repetida de cada assunto serve de gancho. Use como inspiração e não publique a frase literal de uma aluna.</p>');
    t.push('PAUTA SUGERIDA');
    csv.push(['ordem', 'assunto', 'mensagens_no_periodo', 'variacao', 'ideia_e_formato', 'angulo_do_metodo', 'pergunta_mais_repetida', 'provas_autorizadas', 'provas_aguardando']);
    if (!candidatos.length) h.push('<p>Poucos dados no período para sugerir pauta.</p>');
    h.push('<ol class="pauta">' + candidatos.map(function (c, i) {
      var tm = tema(c.id);
      var g = grupos.find(function (x) { return x.tema === c.id; });
      var pv = provasPorTema[c.id] || { prontas: [], aguardando: 0 };
      var v = U.variacao(c.n, c.b);
      t.push((i + 1) + '. ' + tm.nome + ' (' + c.n + ' mensagens, ' + v.txt + ')', '   Ideia: ' + (tm.ideia || '—'), '   Ângulo do método: ' + (tm.angulo || '—'),
        '   Gancho (do jeito que elas falam): ' + (g ? '"' + g.principal + '" (' + g.itens.length + 'x)' : '—'),
        '   Provas: ' + pv.prontas.length + ' autorizada(s), ' + pv.aguardando + ' aguardando');
      csv.push([i + 1, tm.nome, c.n, v.txt, tm.ideia || '', tm.angulo || '', g ? g.principal : '', pv.prontas.length, pv.aguardando]);
      return '<li><div class="pauta-topo"><strong>' + esc(tm.nome) + '</strong><span class="rel-meta">' + c.n + ' mensagens · ' + v.txt + ' vs. período anterior' + (tm.natureza === 'mentalidade' ? ' · bloqueio de mentalidade' : '') + '</span></div>' +
        '<dl class="pauta-campos">' +
        '<div><dt>Ideia e formato</dt><dd>' + esc(tm.ideia || 'Defina em Configurações') + '</dd></div>' +
        '<div><dt>Ângulo do seu método</dt><dd>' + esc(tm.angulo || 'Defina em Configurações') + '</dd></div>' +
        '<div><dt>Gancho (do jeito que elas falam)</dt><dd>' + (g ? citar(g.principal) + ' <span class="rel-meta">· ' + g.itens.length + ' vez(es)</span>' : '—') + '</dd></div>' +
        '<div><dt>Prova social</dt><dd>' + (pv.prontas.length ? pv.prontas.length + ' relato(s) autorizado(s) ligado(s) a esse assunto' : 'Nenhum relato autorizado ainda') + (pv.aguardando ? ' · ' + pv.aguardando + ' aguardando autorização' : '') + '</dd></div>' +
        '</dl></li>';
    }).join('') + '</ol>');
    t.push('');

    // ---- 3. Perguntas que mais se repetem
    var faq = grupos.filter(function (g) { return g.itens[0].tipo === 'duvida' || g.itens.some(function (m) { return m.tipo === 'duvida'; }); }).slice(0, 8);
    h.push('<h3>Perguntas que mais se repetem</h3><p class="rel-meta">Mensagens parecidas foram agrupadas. Cada uma pode virar resposta pronta para o suporte e pauta de conteúdo.</p>');
    t.push('PERGUNTAS QUE MAIS SE REPETEM');
    h.push('<ol class="rel-lista">' + faq.map(function (g) {
      t.push('- (' + g.itens.length + 'x) "' + g.principal + '" [' + tema(g.tema).nome + ']' + (g.variacoes.length ? ' Variações: ' + g.variacoes.map(function (x) { return '"' + x + '"'; }).join(' ') : ''));
      return '<li>' + citar(g.principal) + ' <span>(' + g.itens.length + 'x · ' + esc(tema(g.tema).nome) + ')</span>' +
        (g.variacoes.length ? '<br><span>Também escrevem: ' + g.variacoes.map(citar).join(' · ') + '</span>' : '') + '</li>';
    }).join('') + '</ol>');
    t.push('');

    // ---- 4. Bloqueios de mentalidade
    h.push('<h3>Bloqueios de mentalidade</h3><p class="rel-meta">Assuntos ligados à sua mensagem central: flexibilidade em vez de perfeição.</p>');
    t.push('BLOQUEIOS DE MENTALIDADE');
    var linhasMente = temas.filter(function (tm) { return tm.natureza === 'mentalidade'; }).map(function (tm) {
      var ms = dores.filter(function (m) { return m.tema === tm.id; });
      var dia = '';
      if (ms.length >= 8) {
        var pd = U.contarPor(ms, function (m) { return new Date(m.data).getDay(); });
        var top = Object.keys(pd).sort(function (a, b) { return pd[b] - pd[a]; })[0];
        dia = 'Aparece mais às ' + DIAS[top] + 's (' + Math.round(pd[top] / ms.length * 100) + '% das mensagens). Bom dia para publicar sobre o assunto.';
      } else if (ms.length) dia = 'Poucas mensagens para indicar um dia da semana.';
      var gs = grupos.filter(function (g) { return g.tema === tm.id; }).slice(0, 2);
      t.push('- ' + tm.nome + ': ' + ms.length + ' mensagens. ' + dia + ' Ângulo: ' + (tm.angulo || '—'));
      return '<div class="mente"><p><strong>' + esc(tm.nome) + '</strong> · ' + ms.length + ' mensagem(ns)</p>' +
        (gs.length ? '<p>' + gs.map(function (g) { return citar(g.principal); }).join(' · ') + '</p>' : '') +
        (dia ? '<p class="rel-meta">' + esc(dia) + '</p>' : '') +
        '<p><span class="rel-meta">Ângulo do método:</span> ' + esc(tm.angulo || '—') + '</p></div>';
    });
    h.push(linhasMente.join(''));
    t.push('');

    // ---- 5. O que está crescendo
    h.push('<h3>O que está crescendo</h3>');
    t.push('O QUE ESTÁ CRESCENDO');
    if (crescendo.length) {
      h.push('<ul class="rel-lista">' + crescendo.slice(0, 5).map(function (x) {
        var txt = tema(x.id).nome + ': ' + x.a + ' mensagens (antes: ' + x.b + (x.pct === null ? ', novo' : ', +' + x.pct + '%') + ')' + (tema(x.id).natureza === 'entrega' ? '. Parece problema de entrega, não de conteúdo' : '');
        t.push('- ' + txt);
        return '<li>' + esc(txt) + '</li>';
      }).join('') + '</ul>');
    } else { h.push('<p>Nenhum assunto cresceu de forma relevante em relação ao período anterior.</p>'); t.push('Nada relevante.'); }
    t.push('');

    // ---- 6. Prova social por objeção
    h.push('<h3>Prova social por objeção</h3><p class="rel-meta">Para cada dificuldade frequente, os relatos que respondem a ela. Só aparece o texto de quem autorizou divulgação.</p>');
    t.push('PROVA SOCIAL POR OBJEÇÃO');
    var objecoes = ordemTemas.filter(function (id) { var n = tema(id).natureza; return n === 'mentalidade' || n === 'conteudo'; }).slice(0, 6);
    h.push('<div class="tabela-rolagem"><table class="rel-tab rel-tab-texto"><thead><tr><th>Dificuldade</th><th>Relato que responde</th></tr></thead><tbody>' + objecoes.map(function (id) {
      var pv = provasPorTema[id] || { prontas: [], aguardando: 0 };
      var cel = pv.prontas.length ? citar(ctx.textoSeguro(pv.prontas[0])) + (pv.prontas.length > 1 ? ' <span class="rel-meta">+' + (pv.prontas.length - 1) + '</span>' : '') :
        '<span class="rel-meta">Nenhum autorizado' + (pv.aguardando ? '. Peça autorização para ' + pv.aguardando + ' relato(s) já recebido(s)' : '. Vale estimular relatos sobre isso') + '</span>';
      t.push('- ' + tema(id).nome + ': ' + (pv.prontas.length ? '"' + ctx.textoSeguro(pv.prontas[0]) + '"' : 'nenhum autorizado (' + pv.aguardando + ' aguardando)'));
      return '<tr><th>' + esc(tema(id).nome) + '</th><td>' + cel + '</td></tr>';
    }).join('') + '</tbody></table></div>');
    t.push('');

    // ---- 7. Melhorias na entrega
    h.push('<h3>Melhorias na entrega (não é conteúdo)</h3>');
    t.push('MELHORIAS NA ENTREGA');
    var entrega = [];
    temas.filter(function (tm) { return tm.natureza === 'entrega' && porTema[tm.id]; }).forEach(function (tm) {
      entrega.push(tm.nome + ': ' + porTema[tm.id] + ' mensagens. Sugestão: ' + (tm.acao || 'definir ação'));
    });
    var queixas = ctx.lista.filter(function (m) { return m.tipo === 'queixa'; });
    if (queixas.length) {
      var qt = U.contarPor(queixas, 'tema');
      entrega.push(queixas.length + ' queixa(s) no período, mais sobre: ' + Object.keys(qt).sort(function (a, b) { return qt[b] - qt[a]; }).slice(0, 2).map(function (id) { return tema(id).nome + ' (' + qt[id] + ')'; }).join(', ') + '.');
    }
    if (ctx.atrasados) entrega.push(ctx.atrasados + ' mensagem(ns) estão pendentes há mais de 24 h agora. Defina um prazo de resposta da equipe.');
    grupos.filter(function (g) { return g.itens.length >= 5 && g.itens.some(function (m) { return m.tipo === 'duvida'; }); }).slice(0, 3).forEach(function (g) {
      entrega.push('A pergunta "' + g.principal + '" apareceu ' + g.itens.length + ' vezes. Vale uma resposta pronta ou um material fixo no grupo.');
    });
    h.push(entrega.length ? '<ul class="rel-lista">' + entrega.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>' : '<p>Nada a destacar.</p>');
    entrega.forEach(function (e) { t.push('- ' + e); });
    t.push('');

    // ---- 8. Limites
    var lim = 'Limites desta análise: a classificação é automática por palavras-chave e precisa de revisão. Só entra o que foi escrito: áudios, figurinhas e fotos não são lidos. Vale como termômetro, não como pesquisa.';
    h.push('<p class="rel-meta">' + esc(lim) + '</p>');
    t.push(lim);
    return { html: h.join(''), texto: t.join('\n'), csv: csv };
  }

  // Sinais por aluna para cuidado individual (uso interno, nunca exportado).
  function sinaisAlunas(msgs, temas, fimDia) {
    var mente = {};
    temas.forEach(function (t) { if (t.natureza === 'mentalidade') mente[t.id] = true; });
    var ini7 = U.somarDias(U.inicioDia(fimDia), -6), ini10 = U.somarDias(U.inicioDia(fimDia), -9), ini40 = U.somarDias(U.inicioDia(fimDia), -39);
    var por = {};
    msgs.forEach(function (m) {
      if (!m.alunaId || m.data > fimDia || m.data < ini40) return;
      var a = por[m.alunaId] = por[m.alunaId] || { recentes: [], antes: 0, ultimo: null };
      if (m.data >= ini10) a.recentes.push(m); else a.antes++;
      if (!a.ultimo || m.data > a.ultimo.data) a.ultimo = m;
    });
    var r = [];
    Object.keys(por).forEach(function (id) {
      var a = por[id];
      var dif = a.recentes.filter(function (m) { return m.data >= ini7 && (mente[m.tema] || m.tipo === 'queixa'); });
      if (dif.length >= 2) r.push({ alunaId: id, tipo: 'bloqueio', motivo: dif.length + ' mensagens de dificuldade ou queixa nos últimos 7 dias', ultima: dif[dif.length - 1] });
      else if (!a.recentes.length && a.antes >= 3) r.push({ alunaId: id, tipo: 'sumiu', motivo: 'Escrevia com frequência e está há 10 dias sem mandar mensagem', ultima: a.ultimo });
    });
    return r.sort(function (x, y) { return (x.tipo === 'bloqueio' ? 0 : 1) - (y.tipo === 'bloqueio' ? 0 : 1); });
  }

  P.pauta = { construir: construir, sinaisAlunas: sinaisAlunas, agrupar: agrupar };
})(window.Painel);

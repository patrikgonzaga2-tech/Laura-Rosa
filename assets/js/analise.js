/*
 * Análises que transformam mensagens em entendimento:
 * objeções, tipos de resultado (ideias de antes e depois), interação no grupo,
 * sinais por aluna e sugestões de como ajudar mais.
 * Tudo é gerado por regras e serve de ponto de partida para a sua leitura.
 */
window.Painel = window.Painel || {};
(function (P) {
  'use strict';

  var U = P.util, C = P.classificador;
  var DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  // "Toda segunda" / "Todo sábado"; "às segundas" / "aos sábados".
  function dia(i) {
    var masc = i === 0 || i === 6;
    return { nome: DIAS[i], todo: (masc ? 'Todo ' : 'Toda ') + DIAS[i], aos: (masc ? 'aos ' : 'às ') + DIAS[i] + 's' };
  }

  // Crenças que travam a aluna. "quebra" é a resposta do seu método.
  function objecoesPadrao() {
    return [
      { id: 'sem_tempo', nome: 'Não tenho tempo para treinar', palavras: ['sem tempo', 'nao tenho tempo', 'pouco tempo', 'correria', 'semana corrida', 'muito corrida', 'so tenho 10', 'so tenho 15', 'so consigo 10', 'so consigo 15'], temas: ['tempo', 'rotina'], quebra: 'Treino curto conta. 15 minutos feitos mantêm a constância, e é a constância que traz o resultado.' },
      { id: 'perfeicao', nome: 'Se não for o treino completo, não vale', palavras: ['treino completo', 'perfeito', 'perfeita', 'tudo ou nada', 'culpa', 'compensar', 'treino inteiro'], temas: ['constancia', 'objetivo'], quebra: 'Feito é melhor que perfeito. Entendendo o objetivo do treino do dia, a versão menor já cumpre o papel.' },
      { id: 'motivacao', nome: 'Preciso estar motivada para treinar', palavras: ['desmotivada', 'desanimada', 'sem vontade', 'preguica', 'sem animo'], temas: ['motivacao'], quebra: 'A ação vem antes da motivação. No dia sem vontade, a versão mínima do treino mantém você no caminho.' },
      { id: 'sem_resultado', nome: 'Não estou vendo resultado', palavras: ['nada ta mudando', 'nada esta mudando', 'nao vejo resultado', 'nao estou vendo', 'continua', 'estagnada', 'nao sai', 'frustrada'], temas: ['barriga', 'resultados'], quebra: 'Resultado leva tempo e vai além da balança: medidas, roupas, força, disposição. Registre e compare.' },
      { id: 'localizada', nome: 'Dá para perder gordura só da barriga', palavras: ['tirar a gordura da barriga', 'tirar a barriga', 'perder a barriga', 'abdominal todo dia', 'gordura localizada'], temas: ['barriga'], quebra: 'Não existe perda localizada. Treino completo, constância e paciência com o corpo da mulher.' },
      { id: 'recomeco', nome: 'Parei, então perdi tudo', palavras: ['parei', 'recomeco', 'recomecar', 'desistir', 'desisti', 'falhei', 'no zero', 'paro na'], temas: ['constancia'], quebra: 'A jornada não é linear. Recomeçar faz parte, e nada do que você construiu se perde.' },
      { id: 'trabalho', nome: 'Minha rotina de trabalho não permite', palavras: ['trabalho', 'plantao', 'chego tarde', 'turno', '12x36', 'expediente'], temas: ['trabalho', 'rotina'], quebra: 'O melhor horário é o que cabe na sua rotina real. Adapte o treino do dia ao tempo que você tem.' },
      { id: 'equipamento', nome: 'Não tenho equipamento em casa', palavras: ['sem pesos', 'nao tenho os pesos', 'nao tenho peso', 'halter', 'equipamento', 'pesos em casa'], temas: ['objetivo'], quebra: 'Dá para adaptar com o peso do corpo e objetos de casa, mantendo o objetivo do treino.' }
    ];
  }

  // Tipos de resultado que aparecem nos relatos: base para ideias de antes e depois.
  function resultadosPadrao() {
    return [
      { id: 'medidas', nome: 'Medidas e peso', palavras: ['perdi ', ' kg', 'quilos', ' cm', 'medida', 'emagreci', 'balanca', 'cintura', 'diminui'], ideia: 'Antes e depois em números: carrossel com centímetros e quilos de alunas autorizadas, sem foto de rosto. Destaque o tempo de programa.' },
      { id: 'roupa', nome: 'Roupas que voltaram a servir', palavras: ['calca', 'roupa', 'vestido', 'numero', 'servir', 'serviu', 'fechou', 'fechava', 'biquini'], ideia: 'Antes e depois da roupa: foto da peça ("a calça que não fechava") ou a aluna vestindo, sem rosto. Ótimo para quem tem vergonha de foto do corpo.' },
      { id: 'forca', nome: 'Força e condicionamento', palavras: ['sem parar', 'treino inteiro', 'carga', 'aumentei', 'folego', 'resistencia', 'consegui fazer', 'mais forte'], ideia: 'Antes e depois de força: vídeo curto "semana 1 x semana 8" do mesmo exercício (mais repetições, mais carga, menos pausa).' },
      { id: 'constancia', nome: 'Constância e rotina', palavras: ['completei', 'um mes', 'semanas seguidas', 'nao falhei', 'consegui manter', 'encaixar', 'todos os dias', 'constancia'], ideia: 'Antes e depois da rotina: "antes eu tentava treinar todo dia e desistia; hoje faço treinos curtos e não paro". Texto em tela ou carrossel.' },
      { id: 'mente', nome: 'Mentalidade e autoestima', palavras: ['autoestima', 'confiante', 'me sinto', 'espelho', 'cabeca', 'leve', 'perfeito', 'sem culpa', 'gostando'], ideia: 'Antes e depois da cabeça: frases de "antes" (culpa, tudo ou nada) e "depois" (flexibilidade, constância). Reforça a sua mensagem central.' },
      { id: 'saude', nome: 'Disposição e saúde', palavras: ['disposicao', 'energia', 'sono', 'dormindo', 'dor nas costas', 'dores', 'cansaco', 'exame'], ideia: 'Antes e depois da disposição: sono, energia, menos dores. Resultado que não aparece na foto, mas muda o dia a dia.' }
    ];
  }

  function detectar(texto, lista) {
    return lista.filter(function (x) { return C.pontuar(texto, x.palavras) > 0; }).map(function (x) { return x.id; });
  }

  function provasDe(m) { return m.tipo === 'depoimento' || m.tipo === 'evolucao'; }

  // ctx: { lista, anterior, objecoes, textoSeguro, pronto }
  function analisarObjecoes(ctx) {
    var provas = ctx.lista.filter(provasDe);
    return ctx.objecoes.map(function (o) {
      var msgs = ctx.lista.filter(function (m) { return !provasDe(m) && C.pontuar(m.texto, o.palavras) > 0; });
      var antes = ctx.anterior.filter(function (m) { return !provasDe(m) && C.pontuar(m.texto, o.palavras) > 0; }).length;
      var ligadas = provas.filter(function (m) {
        var rel = C.temasRelacionados(m.texto, ctx.temas);
        return (o.temas || []).some(function (t) { return rel.indexOf(t) !== -1 || m.tema === t; });
      });
      var grupos = P.pauta.agrupar(msgs, ctx.textoSeguro);
      var porDia = U.contarPor(msgs, function (m) { return new Date(m.data).getDay(); });
      var diaTop = Object.keys(porDia).sort(function (a, b) { return porDia[b] - porDia[a]; })[0];
      return {
        obj: o, n: msgs.length, antes: antes, msgs: msgs,
        exemplos: grupos.slice(0, 3).map(function (g) { return { texto: g.principal, n: g.itens.length }; }),
        prontas: ligadas.filter(ctx.pronto), aguardando: ligadas.filter(function (m) { return !ctx.pronto(m); }).length,
        dia: msgs.length >= 8 ? Object.assign(dia(+diaTop), { pct: Math.round(porDia[diaTop] / msgs.length * 100) }) : null
      };
    }).filter(function (x) { return x.n > 0; }).sort(function (a, b) { return b.n - a.n; });
  }

  // ctx: { lista, resultados, textoSeguro, pronto }
  function analisarResultados(ctx) {
    var provas = ctx.lista.filter(provasDe);
    return ctx.resultados.map(function (r) {
      var ms = provas.filter(function (m) { return C.pontuar(m.texto, r.palavras) > 0; });
      return { res: r, n: ms.length, msgs: ms, prontas: ms.filter(ctx.pronto), aguardando: ms.filter(function (m) { return !ctx.pronto(m); }).length };
    }).sort(function (a, b) { return b.n - a.n; });
  }

  // Alunas com relato de evolução recente que ainda não têm foto registrada: convidar, com termo de autorização.
  function candidatasAntesDepois(msgs, midias, fimDia) {
    var ini = U.somarDias(U.inicioDia(fimDia), -29);
    var comFoto = {};
    midias.forEach(function (f) { if (f.alunaId) comFoto[f.alunaId] = true; });
    var por = {};
    msgs.forEach(function (m) {
      if (m.tipo !== 'evolucao' || !m.alunaId || m.data < ini || m.data > fimDia || comFoto[m.alunaId]) return;
      var a = por[m.alunaId] = por[m.alunaId] || { alunaId: m.alunaId, n: 0, ultima: null };
      a.n++;
      if (!a.ultima || m.data > a.ultima.data) a.ultima = m;
    });
    return Object.keys(por).map(function (k) { return por[k]; }).sort(function (a, b) { return b.n - a.n || b.ultima.data - a.ultima.data; });
  }

  // Suas mensagens no grupo que mais geraram respostas (até 3 h depois ou até a sua próxima mensagem).
  function interacao(todas, iv) {
    var msgs = todas.filter(function (m) { return m.canal === 'telegram'; }).sort(function (a, b) { return a.data - b.data; });
    var equipe = msgs.filter(function (m) { return m.equipe && m.data >= iv[0] && m.data <= iv[1]; });
    var porTexto = {};
    equipe.forEach(function (p) {
      var prox = msgs.find(function (m) { return m.equipe && m.data > p.data; });
      var fim = Math.min(p.data + 3 * 3600000, prox ? prox.data : Infinity);
      var resp = msgs.filter(function (m) { return !m.equipe && m.data > p.data && m.data <= fim; }).length;
      var k = U.norm(p.texto).trim();
      var x = porTexto[k] = porTexto[k] || { texto: p.texto, vezes: 0, respostas: 0 };
      x.vezes++; x.respostas += resp;
    });
    var lista = Object.keys(porTexto).map(function (k) { var x = porTexto[k]; x.media = x.respostas / x.vezes; return x; });
    var media = lista.length ? lista.reduce(function (s, x) { return s + x.respostas; }, 0) / equipe.length : 0;
    return { posts: lista.sort(function (a, b) { return b.media - a.media; }), total: equipe.length, media: media };
  }

  // Sinais por aluna para cuidado individual (uso interno, nunca exportado com identificação).
  function sinaisAlunas(msgs, temas, fimDia) {
    var mente = {};
    temas.forEach(function (t) { if (t.natureza === 'mentalidade') mente[t.id] = true; });
    var ini7 = U.somarDias(U.inicioDia(fimDia), -6), ini10 = U.somarDias(U.inicioDia(fimDia), -9), ini40 = U.somarDias(U.inicioDia(fimDia), -39);
    var por = {};
    msgs.forEach(function (m) {
      if (!m.alunaId || m.equipe || m.data > fimDia || m.data < ini40) return;
      var a = por[m.alunaId] = por[m.alunaId] || { recentes: [], antes: 0, ultimo: null };
      if (m.data >= ini10) a.recentes.push(m); else a.antes++;
      if (!a.ultimo || m.data > a.ultimo.data) a.ultimo = m;
    });
    var r = [];
    Object.keys(por).forEach(function (id) {
      var a = por[id];
      var dif = a.recentes.filter(function (m) { return m.data >= ini7 && (mente[m.tema] || m.tipo === 'queixa' || m.tipo === 'dificuldade'); });
      if (dif.length >= 2) r.push({ alunaId: id, tipo: 'dificuldade', motivo: dif.length + ' mensagens de dificuldade nos últimos 7 dias', ultima: dif[dif.length - 1] });
      else if (!a.recentes.length && a.antes >= 3) r.push({ alunaId: id, tipo: 'sumiu', motivo: 'Participava com frequência e está há 10 dias sem escrever', ultima: a.ultimo });
    });
    return r.sort(function (x, y) { return (x.tipo === 'dificuldade' ? 0 : 1) - (y.tipo === 'dificuldade' ? 0 : 1); });
  }

  /*
   * Sugestões de como ajudar mais. Cada uma traz a evidência que a gerou.
   * ctx: { lista, anterior, temas, objecoesAn, grupos, sinais, interacao }
   */
  function sugestoesAjuda(ctx) {
    var out = [];
    var tema = function (id) { return ctx.temas.find(function (t) { return t.id === id; }) || { nome: id }; };

    ctx.grupos.filter(function (g) { return g.itens.length >= 4 && g.itens.some(function (m) { return m.tipo === 'duvida'; }); }).slice(0, 4).forEach(function (g) {
      out.push({ area: 'Material fixo', titulo: 'Responder de uma vez: "' + g.principal + '"', detalhe: 'Gravar um vídeo curto ou fixar uma mensagem no grupo sobre ' + tema(g.tema).nome.toLowerCase() + '. Evita a mesma dúvida voltando toda semana.', evidencia: g.itens.length + ' mensagens parecidas no período' });
    });

    ctx.objecoesAn.filter(function (o) { return o.dia; }).slice(0, 3).forEach(function (o) {
      out.push({ area: 'Rotina do grupo', titulo: o.dia.todo + ': mensagem sobre "' + o.obj.nome.toLowerCase() + '"', detalhe: 'Antecipar a objeção no dia em que ela mais aparece. Ângulo: ' + o.obj.quebra, evidencia: o.dia.pct + '% das ' + o.n + ' menções aparecem ' + o.dia.aos });
    });

    ctx.temas.filter(function (t) { return t.natureza === 'entrega'; }).forEach(function (t) {
      var n = ctx.lista.filter(function (m) { return m.tema === t.id && m.tipo !== 'depoimento' && m.tipo !== 'evolucao'; }).length;
      if (n >= 3) out.push({ area: 'Entrega', titulo: t.nome, detalhe: t.acao || 'Definir uma ação para resolver na origem.', evidencia: n + ' mensagens no período' });
    });

    var porTema = U.contarPor(ctx.lista.filter(function (m) { return m.tipo === 'duvida' || m.tipo === 'dificuldade'; }), 'tema');
    var porTemaAnt = U.contarPor(ctx.anterior.filter(function (m) { return m.tipo === 'duvida' || m.tipo === 'dificuldade'; }), 'tema');
    Object.keys(porTema).filter(function (id) { var b = porTemaAnt[id] || 0; return porTema[id] >= 6 && b && (porTema[id] - b) / b >= 0.3 && tema(id).natureza !== 'entrega'; })
      .slice(0, 2).forEach(function (id) {
        out.push({ area: 'Aula ou live', titulo: 'Encontro de dúvidas sobre ' + tema(id).nome.toLowerCase(), detalhe: 'O assunto está crescendo. Uma aula ao vivo curta, ou uma sequência de stories respondendo, alcança todas de uma vez.', evidencia: porTema[id] + ' mensagens (antes: ' + (porTemaAnt[id] || 0) + ')' });
      });

    var dif = ctx.sinais.filter(function (s) { return s.tipo === 'dificuldade'; }).length;
    var sum = ctx.sinais.filter(function (s) { return s.tipo === 'sumiu'; }).length;
    if (dif) out.push({ area: 'Cuidado individual', titulo: 'Mensagem individual para ' + dif + ' aluna(s) com dificuldade repetida', detalhe: 'Um áudio curto de acolhimento, lembrando da versão mínima do treino. A lista está em "Como ajudar mais".', evidencia: '2 ou mais dificuldades na mesma semana' });
    if (sum) out.push({ area: 'Cuidado individual', titulo: 'Reengajar ' + sum + ' aluna(s) que pararam de escrever', detalhe: 'Mensagem leve, sem cobrança: "estou aqui, recomeçar faz parte".', evidencia: '10 dias sem mensagem depois de participar com frequência' });

    if (ctx.interacao && ctx.interacao.posts.length >= 2) {
      var top = ctx.interacao.posts[0];
      out.push({ area: 'Engajamento no grupo', titulo: 'Repetir o formato que mais gerou conversa', detalhe: '"' + top.texto + '"', evidencia: top.media.toFixed(1).replace('.', ',') + ' respostas em média, contra ' + ctx.interacao.media.toFixed(1).replace('.', ',') + ' das suas mensagens em geral' });
    }
    return out;
  }

  P.analise = {
    DIAS: DIAS,
    objecoesPadrao: objecoesPadrao,
    resultadosPadrao: resultadosPadrao,
    detectar: detectar,
    analisarObjecoes: analisarObjecoes,
    analisarResultados: analisarResultados,
    candidatasAntesDepois: candidatasAntesDepois,
    interacao: interacao,
    sinaisAlunas: sinaisAlunas,
    sugestoesAjuda: sugestoesAjuda
  };
})(window.Painel);

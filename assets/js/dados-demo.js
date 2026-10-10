/*
 * DADOS FICTÍCIOS PARA DEMONSTRAÇÃO.
 * Nenhuma pessoa, mensagem, foto ou resultado daqui é real.
 * Este arquivo nunca é misturado com dados importados.
 */
window.Painel = window.Painel || {};
(function (P) {
  'use strict';

  var U = P.util;

  // Gerador pseudoaleatório com semente fixa: os dados de exemplo são sempre os mesmos.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var NOMES = ['Juliana', 'Fernanda', 'Patrícia', 'Camila', 'Aline', 'Renata', 'Vanessa', 'Tatiane', 'Daniela', 'Priscila',
    'Simone', 'Luciana', 'Gabriela', 'Mariana', 'Carla', 'Bruna', 'Débora', 'Cristiane', 'Roberta', 'Adriana',
    'Michele', 'Larissa', 'Natália', 'Raquel', 'Elaine', 'Kelly', 'Sabrina', 'Viviane', 'Jéssica', 'Andreia',
    'Paula', 'Thaís', 'Letícia', 'Rosana', 'Sílvia', 'Cláudia', 'Márcia', 'Eliane', 'Karina', 'Beatriz'];
  var SOBRENOMES = ['Exemplo', 'Ficção', 'Modelo', 'Teste', 'Demonstração'];

  // Mensagens-modelo por tema. "t" é o tipo verdadeiro (usado para simular a revisão humana).
  var MODELOS = {
    rotina: [
      { t: 'duvida', x: 'Como eu monto minha rotina de treinos se só consigo treinar 3 dias na semana?' },
      { t: 'duvida', x: 'Qual a melhor forma de organizar a semana pra não perder nenhum treino?' },
      { t: 'dificuldade', x: 'Tô com dificuldade de encaixar o treino na rotina, começo bem e na quarta já desandou' },
      { t: 'duvida', x: 'Posso fazer dois treinos no mesmo dia pra compensar a semana?' }
    ],
    trabalho: [
      { t: 'duvida', x: 'Trabalho de plantão 12x36, como fica a rotina de treinos pra mim?' },
      { t: 'dificuldade', x: 'Chego do trabalho muito tarde e cansada, não tô conseguindo treinar' },
      { t: 'duvida', x: 'É melhor treinar antes ou depois do trabalho?' }
    ],
    acesso: [
      { t: 'duvida', x: 'Como coloco os treinos na televisão? Minha TV é smart' },
      { t: 'queixa', x: 'Não consigo acessar a plataforma, diz que a senha tá errada' },
      { t: 'duvida', x: 'Dá pra espelhar o app na TV pelo celular?' },
      { t: 'queixa', x: 'O vídeo do treino tá travando no aplicativo desde ontem' },
      { t: 'duvida', x: 'Tem como assistir os treinos na TV da sala?' }
    ],
    cafe: [
      { t: 'duvida', x: 'O que posso substituir no café da manhã no lugar do pão?' },
      { t: 'duvida', x: 'Posso trocar a tapioca por cuscuz no café da manhã?' },
      { t: 'dificuldade', x: 'Não consigo comer nada de manhã cedo, o que eu faço antes de treinar?' }
    ],
    lanche: [
      { t: 'duvida', x: 'Que lanche prático eu posso levar pro trabalho?' },
      { t: 'dificuldade', x: 'Bate muita fome à tarde no trabalho e acabo comendo besteira' },
      { t: 'duvida', x: 'Alguma ideia de marmita pra deixar pronta no domingo?' }
    ],
    gluteo: [
      { t: 'duvida', x: 'Quanto tempo leva pra começar a ver o glúteo crescer?' },
      { t: 'duvida', x: 'Posso fazer o treino de glúteo mais vezes na semana pra crescer mais rápido?' },
      { t: 'dificuldade', x: 'Não sinto o glúteo trabalhando na elevação pélvica, só a coxa' },
      { t: 'duvida', x: 'Em quanto tempo o glúteo começa a crescer?' }
    ],
    barriga: [
      { t: 'duvida', x: 'Como faço pra tirar a gordura da barriga? Abdominal todo dia ajuda?' },
      { t: 'dificuldade', x: 'Já perdi peso mas a barriga continua, tô ficando frustrada' },
      { t: 'duvida', x: 'Abdominal todo dia ajuda a perder a barriga?' }
    ],
    motivacao: [
      { t: 'dificuldade', x: 'Hoje acordei totalmente desmotivada, sem vontade nenhuma de treinar' },
      { t: 'dificuldade', x: 'Essa semana tô desanimada, parece que nada tá mudando' },
      { t: 'duvida', x: 'O que eu faço nos dias que bate a preguiça?' },
      { t: 'dificuldade', x: 'Tô sem ânimo nenhum hoje, cansada da semana' }
    ],
    tempo: [
      { t: 'duvida', x: 'Hoje só tenho 15 minutos, qual treino eu faço?' },
      { t: 'dificuldade', x: 'Semana muito corrida, sem tempo nenhum pra treinar' },
      { t: 'duvida', x: 'Tem algum treino menorzinho pra dias de correria?' },
      { t: 'duvida', x: 'Só consigo 10 minutos hoje, vale a pena treinar?' }
    ],
    objetivo: [
      { t: 'duvida', x: 'Como eu sei qual é o objetivo do treino de hoje pra trocar por um mais curto?' },
      { t: 'duvida', x: 'Perdi o treino de ontem, faço hoje ou sigo o do dia?' },
      { t: 'duvida', x: 'Posso adaptar o treino do dia se não tenho os pesos em casa?' }
    ],
    constancia: [
      { t: 'dificuldade', x: 'Falhei a semana inteira e já pensei em desistir de tudo' },
      { t: 'dificuldade', x: 'Sinto culpa quando não consigo fazer o treino completo' },
      { t: 'duvida', x: 'Parei duas semanas, como eu recomeço sem me sentir no zero?' },
      { t: 'dificuldade', x: 'Sempre começo animada e paro na segunda semana, não consigo manter' }
    ],
    resultados: [
      { t: 'evolucao', x: 'Perdi 3 kg esse mês e diminuí 4 cm de cintura!' },
      { t: 'evolucao', x: 'A calça jeans que não fechava voltou a servir' },
      { t: 'evolucao', x: 'Primeira vez que fiz o treino inteiro sem parar, tô evoluindo' },
      { t: 'evolucao', x: 'Mandei as fotos de antes e depois de 60 dias, olha a diferença na barriga' },
      { t: 'evolucao', x: 'Mesmo com a semana corrida fiz os treinos de 15 minutos e perdi 2 kg' },
      { t: 'evolucao', x: 'Minha barriga diminuiu 5 cm desde que comecei' },
      { t: 'evolucao', x: 'Parei de querer fazer tudo perfeito e pela primeira vez completei um mês de treinos' }
    ],
    comunidade: [
      { t: 'depoimento', x: 'Amei o acompanhamento, nunca me senti tão acolhida num programa' },
      { t: 'depoimento', x: 'Obrigada pelo apoio de ontem, fez toda diferença pra eu não desistir' },
      { t: 'depoimento', x: 'Esse grupo é a melhor parte do meu dia, a gente se sente junto' },
      { t: 'depoimento', x: 'Aprendi que fazer o treino curto é melhor do que não fazer nada, mudou minha cabeça' },
      { t: 'queixa', x: 'Mandei mensagem ontem e ninguém respondeu ainda' },
      { t: 'depoimento', x: 'Consegui encaixar o treino antes do trabalho com as dicas do grupo, amei' }
    ]
  };

  var PESOS = { rotina: 9, trabalho: 6, acesso: 6, cafe: 8, lanche: 6, gluteo: 7, barriga: 8, motivacao: 7, tempo: 9, objetivo: 7, constancia: 6, resultados: 5, comunidade: 7 };
  // Probabilidade de a mensagem chegar pelo WhatsApp de suporte (o resto vem do grupo do Telegram).
  var P_WHATS = { rotina: 0.5, trabalho: 0.5, acesso: 0.85, cafe: 0.45, lanche: 0.45, gluteo: 0.4, barriga: 0.4, motivacao: 0.25, tempo: 0.4, objetivo: 0.45, constancia: 0.35, resultados: 0.35, comunidade: 0.3 };

  function escolher(r, lista) { return lista[Math.floor(r() * lista.length)]; }

  function escolherTema(r, diasAtras, diaSemana) {
    var pesos = {};
    var total = 0;
    Object.keys(PESOS).forEach(function (k) {
      var w = PESOS[k];
      if (k === 'acesso' && diasAtras <= 6) w *= 3.2; // pico fictício para demonstrar "mudança"
      if (k === 'motivacao' && (diaSemana === 0 || diaSemana === 1)) w *= 1.8;
      if (k === 'resultados' && diasAtras <= 20) w *= 1.5;
      pesos[k] = w;
      total += w;
    });
    var x = r() * total;
    var ks = Object.keys(pesos);
    for (var i = 0; i < ks.length; i++) { x -= pesos[ks[i]]; if (x <= 0) return ks[i]; }
    return ks[ks.length - 1];
  }

  // Mensagens fictícias "da equipe" no grupo e o quanto cada formato puxa conversa.
  var POSTS = [
    { tema: 'tempo', eng: 7, x: 'Desafio da semana: 3 treinos curtos de 15 minutos. Quem topa? Responde aqui' },
    { tema: 'constancia', eng: 6, x: 'Qual foi a sua maior dificuldade essa semana? Me conta aqui que eu te ajudo' },
    { tema: 'constancia', eng: 4, x: 'Lembrete: o treino de hoje não precisa ser perfeito, precisa ser feito.' },
    { tema: 'objetivo', eng: 3, x: 'Dica: se o tempo estiver curto, faça só o primeiro bloco do treino do dia. Ele já cumpre o objetivo principal.' },
    { tema: 'cafe', eng: 3, x: 'Ideia de café da manhã rápido para os dias corridos: ovos mexidos com fruta.' },
    { tema: 'acesso', eng: 1.5, x: 'Os treinos novos da semana já estão liberados na plataforma.' }
  ];
  // Respostas fictícias "da equipe", no tom do método (flexibilidade em vez de perfeição).
  var RESPOSTAS = {
    rotina: 'Monta assim: 3 treinos em dias fixos e um treino curto de reserva. Se perder um dia, usa o curto. Constância vale mais que perfeição!',
    trabalho: 'O melhor horário é o que cabe no seu dia. Nos dias mais puxados, faz a versão de 15 minutos e está tudo certo.',
    acesso: 'Na TV: abre o app da plataforma na smart TV e entra com o mesmo e-mail. Se não tiver o app, dá para espelhar pelo celular. Te mandei o passo a passo!',
    cafe: 'Pode trocar sim! O importante é ter uma proteína no café. Escolhe o que for mais prático para a sua manhã.',
    lanche: 'Ideias práticas: iogurte com fruta, ovo cozido, castanhas ou sanduíche natural. Deixa separado na noite anterior.',
    gluteo: 'Com constância, em 6 a 8 semanas já dá para perceber. Foca na execução: desce devagar e contrai o glúteo lá em cima.',
    barriga: 'Abdominal sozinho não tira a gordura da barriga. O que funciona é o treino completo com constância: a barriga vai junto com o corpo todo.',
    motivacao: 'Nos dias sem vontade, faz só o aquecimento e o primeiro bloco. Quase sempre a vontade aparece depois que você começa. E se não aparecer, tudo bem também!',
    tempo: 'Faz o treino curto de 15 minutos do dia! Treino curto feito vale muito mais que o treino perfeito que não acontece.',
    objetivo: 'O objetivo do treino está no título da aula. Se o tempo for curto, escolhe um treino menor com o mesmo objetivo. Não precisa compensar o de ontem.',
    constancia: 'Recomeçar faz parte da jornada! Volta com os treinos curtos essa semana, sem culpa. Nada do que você construiu se perdeu.',
    comunidade: 'Desculpa a demora! Já te respondi por aqui, conta comigo.',
    resultados: 'Que orgulho de você! Posso usar o seu relato, sem o seu nome, para inspirar outras alunas?',
    outros: 'Obrigada por contar! Seguimos juntas.'
  };
  var RESPOSTAS_CURTAS = ['Eu topo!', 'Tô dentro, bora!', 'Vou tentar essa semana', 'Conta comigo', 'Precisava ler isso hoje'];

  function gerar(temas, equipe) {
    var C = P.classificador;
    var r = mulberry32(20261010);
    var hoje = U.inicioDia(Date.now());
    var agora = Date.now();

    var alunas = {};
    NOMES.forEach(function (nome, i) {
      var id = 'A-' + String(i + 1).padStart(3, '0');
      alunas[id] = { id: id, nome: nome, sobrenome: escolher(r, SOBRENOMES), ficticia: true };
    });
    var ids = Object.keys(alunas);

    var mensagens = [];
    var seq = 0;

    function criar(texto, temaVerdadeiro, tipoVerdadeiro, canal, data, d) {
      var auto = C.classificar(texto, temas);
      var revisado = d >= 6 && r() < 0.75;
      var tipo = revisado ? tipoVerdadeiro : auto.tipo;
      var alunaId = escolher(r, ids);
      var conversa = canal === 'whatsapp' ? 'wa:' + alunaId : 'tg:grupo';
      var m = {
        id: 'd' + (++seq), origem: 'demo', canal: canal, conversa: conversa, alunaId: alunaId, data: data, texto: texto, equipe: false,
        tipo: tipo, tema: revisado ? temaVerdadeiro : auto.tema, auto: auto, revisado: revisado, aut: null, resposta: null
      };
      if (tipo === 'depoimento' || tipo === 'evolucao') {
        var y = r();
        var st = y < 0.4 ? 'nao_solicitada' : y < 0.6 ? 'solicitada' : y < 0.75 ? 'uso_interno' : y < 0.95 ? 'divulgacao' : 'negada';
        m.aut = { status: st, confirmadoPor: (st === 'uso_interno' || st === 'divulgacao') ? equipe[0] : '', data: (st === 'nao_solicitada' ? null : data + 86400000) };
      }
      mensagens.push(m);
      // Resposta da equipe (nem toda mensagem tem resposta registrada).
      var chance = tipoVerdadeiro === 'outro' ? 0 : (tipoVerdadeiro === 'depoimento' || tipoVerdadeiro === 'evolucao') ? 0.5 : d === 0 ? 0.45 : 0.75;
      if (r() < chance) {
        var dr = data + (8 + Math.floor(r() * 170)) * 60000;
        if (dr < agora) {
          var resp = { id: 'd' + (++seq), origem: 'demo', canal: canal, conversa: conversa, alunaId: null, autor: escolher(r, equipe), data: dr,
            texto: RESPOSTAS[temaVerdadeiro] || RESPOSTAS.outros, equipe: true, respondeA: m.id, tipo: 'outro', tema: temaVerdadeiro, revisado: true, aut: null };
          mensagens.push(resp);
          m.resposta = resp.id;
        }
      }
    }

    for (var d = 59; d >= 0; d--) {
      var dia = U.somarDias(hoje, -d);
      var ds = new Date(dia).getDay();

      // Mensagem do dia da equipe no grupo do Telegram e as respostas que ela puxa.
      var post = POSTS[Math.floor(r() * POSTS.length)];
      var hPost = dia + (7 + Math.floor(r() * 2)) * 3600000 + Math.floor(r() * 50) * 60000;
      if (hPost < agora) {
        mensagens.push({ id: 'd' + (++seq), origem: 'demo', canal: 'telegram', conversa: 'tg:grupo', alunaId: null, autor: equipe[0], data: hPost, texto: post.x, equipe: true, respondeA: null, tipo: 'outro', tema: post.tema, revisado: true, aut: null });
        var nResp = Math.round(post.eng * (0.6 + r() * 0.8));
        for (var q = 0; q < nResp; q++) {
          var dr = hPost + (5 + Math.floor(r() * 160)) * 60000;
          if (dr > agora) continue;
          if (r() < 0.45) criar(escolher(r, RESPOSTAS_CURTAS), 'outros', 'outro', 'telegram', dr, d);
          else { var mt = escolher(r, MODELOS[post.tema]); criar(mt.x, post.tema, mt.t, 'telegram', dr, d); }
        }
      }

      var n = 7 + (ds === 1 ? 4 : 0) - (ds === 0 ? 3 : 0) - (ds === 6 ? 2 : 0) + Math.floor(r() * 5);
      for (var k = 0; k < n; k++) {
        var temaVerdadeiro = escolherTema(r, d, ds);
        var modelo = escolher(r, MODELOS[temaVerdadeiro]);
        var data = dia + (10 + Math.floor(r() * 12)) * 3600000 + Math.floor(r() * 60) * 60000;
        if (data > agora) data = agora - Math.floor(r() * 3 * 3600000);
        criar(modelo.x, temaVerdadeiro, modelo.t, r() < P_WHATS[temaVerdadeiro] ? 'whatsapp' : 'telegram', data, d);
      }
    }
    mensagens.sort(function (a, b) { return a.data - b.data; });

    var midias = [
      { aluna: 'A-003', desc: '60 dias de programa', st: 'divulgacao', dias: 3 },
      { aluna: 'A-008', desc: '30 dias de programa', st: 'uso_interno', dias: 9 },
      { aluna: 'A-015', desc: '90 dias de programa', st: 'solicitada', dias: 1 },
      { aluna: 'A-021', desc: '45 dias de programa', st: 'nao_solicitada', dias: 14 },
      { aluna: 'A-027', desc: '60 dias de programa', st: 'negada', dias: 20 },
      { aluna: 'A-034', desc: '30 dias de programa', st: 'divulgacao', dias: 6 }
    ].map(function (x, i) {
      var a = ilustracao(i, 0), b = ilustracao(i, 1);
      var f = {
        id: 'f' + (i + 1), origem: 'demo', tipo: 'antes_depois', alunaId: x.aluna, descricao: x.desc,
        data: U.somarDias(hoje, -x.dias) + 10 * 3600000,
        fotos: { antes: a.url, depois: b.url },
        rostos: { antes: [a.rosto], depois: [b.rosto] },
        tratadas: { antes: null, depois: null }, tratadaInfo: {},
        ocultarRosto: true,
        aut: { status: x.st, confirmadoPor: (x.st === 'uso_interno' || x.st === 'divulgacao') ? equipe[0] : '', data: x.st === 'nao_solicitada' ? null : U.somarDias(hoje, -x.dias + 1) }
      };
      // As duas fotos autorizadas para divulgação já vêm com cópia de rosto oculto, para demonstrar o fluxo.
      if (x.st === 'divulgacao') {
        f.tratadas.antes = P.prints.pixelar(a.canvas, [a.rosto], 22).toDataURL('image/png');
        f.tratadas.depois = P.prints.pixelar(b.canvas, [b.rosto], 22).toDataURL('image/png');
        f.tratadaInfo = { antes: { quando: f.data + 3600000, areas: 1 }, depois: { quando: f.data + 3600000, areas: 1 } };
      }
      return f;
    });

    return { alunas: alunas, mensagens: mensagens.sort(function (a, b) { return a.data - b.data; }), midias: midias, prints: [] };
  }

  // Ilustração neutra (silhueta) no lugar de foto real. Não é foto de ninguém.
  function ilustracao(i, lado) {
    var w = 600, h = 800;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d');
    var tons = ['#d9c7cf', '#cfd6dd', '#d6d1c4', '#c9d3c9', '#d8cbd9', '#d3cdc4'];
    x.fillStyle = lado ? '#f6f2f4' : '#ebe4e8';
    x.fillRect(0, 0, w, h);
    x.fillStyle = tons[i % tons.length];
    x.beginPath(); x.arc(300, 190, 70, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#7d6a73';
    x.beginPath(); x.arc(275, 180, 7, 0, Math.PI * 2); x.arc(325, 180, 7, 0, Math.PI * 2); x.fill();
    x.fillRect(278, 218, 44, 6);
    x.fillStyle = tons[i % tons.length];
    x.beginPath(); x.ellipse(300, 520, lado ? 112 : 150, 230, 0, 0, Math.PI * 2); x.fill();
    x.save();
    x.translate(w / 2, h / 2 + 60);
    x.rotate(-0.42);
    x.fillStyle = 'rgba(120, 40, 80, 0.30)';
    x.textAlign = 'center';
    x.font = '700 44px system-ui, sans-serif';
    x.fillText('ILUSTRAÇÃO FICTÍCIA', 0, 0);
    x.font = '600 24px system-ui, sans-serif';
    x.fillText('não é foto de uma pessoa real', 0, 36);
    x.restore();
    return { canvas: c, url: c.toDataURL('image/png'), rosto: { x: 220, y: 110, w: 160, h: 160 } };
  }

  P.demo = { gerar: gerar };
})(window.Painel);

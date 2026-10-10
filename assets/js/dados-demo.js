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
      { t: 'queixa', x: 'O vídeo do treino tá travando no aplicativo desde ontem' }
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
      { t: 'dificuldade', x: 'Não sinto o glúteo trabalhando na elevação pélvica, só a coxa' }
    ],
    barriga: [
      { t: 'duvida', x: 'Como faço pra tirar a gordura da barriga? Abdominal todo dia ajuda?' },
      { t: 'dificuldade', x: 'Já perdi peso mas a barriga continua, tô ficando frustrada' }
    ],
    motivacao: [
      { t: 'dificuldade', x: 'Hoje acordei totalmente desmotivada, sem vontade nenhuma de treinar' },
      { t: 'dificuldade', x: 'Essa semana tô desanimada, parece que nada tá mudando' },
      { t: 'duvida', x: 'O que eu faço nos dias que bate a preguiça?' }
    ],
    tempo: [
      { t: 'duvida', x: 'Hoje só tenho 15 minutos, qual treino eu faço?' },
      { t: 'dificuldade', x: 'Semana muito corrida, sem tempo nenhum pra treinar' },
      { t: 'duvida', x: 'Tem algum treino menorzinho pra dias de correria?' }
    ],
    objetivo: [
      { t: 'duvida', x: 'Como eu sei qual é o objetivo do treino de hoje pra trocar por um mais curto?' },
      { t: 'duvida', x: 'Perdi o treino de ontem, faço hoje ou sigo o do dia?' },
      { t: 'duvida', x: 'Posso adaptar o treino do dia se não tenho os pesos em casa?' }
    ],
    constancia: [
      { t: 'dificuldade', x: 'Falhei a semana inteira e já pensei em desistir de tudo' },
      { t: 'dificuldade', x: 'Sinto culpa quando não consigo fazer o treino completo' },
      { t: 'duvida', x: 'Parei duas semanas, como eu recomeço sem me sentir no zero?' }
    ],
    resultados: [
      { t: 'evolucao', x: 'Perdi 3 kg esse mês e diminuí 4 cm de cintura!' },
      { t: 'evolucao', x: 'A calça jeans que não fechava voltou a servir' },
      { t: 'evolucao', x: 'Primeira vez que fiz o treino inteiro sem parar, tô evoluindo' },
      { t: 'evolucao', x: 'Mandei as fotos de antes e depois de 60 dias, olha a diferença na barriga' }
    ],
    comunidade: [
      { t: 'depoimento', x: 'Amei o acompanhamento, nunca me senti tão acolhida num programa' },
      { t: 'depoimento', x: 'Obrigada pelo apoio de ontem, fez toda diferença pra eu não desistir' },
      { t: 'depoimento', x: 'Esse grupo é a melhor parte do meu dia, a gente se sente junto' },
      { t: 'depoimento', x: 'Aprendi que fazer o treino curto é melhor do que não fazer nada, mudou minha cabeça' },
      { t: 'queixa', x: 'Mandei mensagem ontem e ninguém respondeu ainda' }
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

  function gerar(temas, equipe) {
    var C = P.classificador;
    var r = mulberry32(20261010);
    var hoje = U.inicioDia(Date.now());
    var agora = Date.now();

    var alunas = {};
    NOMES.forEach(function (nome, i) {
      var id = 'A-' + String(i + 1).padStart(3, '0');
      alunas[id] = {
        id: id,
        nome: nome,
        sobrenome: escolher(r, SOBRENOMES),
        telefone: '+55 (00) 90000-' + String(1000 + i),
        ficticia: true
      };
    });
    var ids = Object.keys(alunas);

    var mensagens = [];
    var seq = 0;
    for (var d = 59; d >= 0; d--) {
      var dia = U.somarDias(hoje, -d);
      var ds = new Date(dia).getDay();
      var n = 7 + (ds === 1 ? 4 : 0) - (ds === 0 ? 3 : 0) - (ds === 6 ? 2 : 0) + Math.floor(r() * 5);
      for (var k = 0; k < n; k++) {
        var temaVerdadeiro = escolherTema(r, d, ds);
        var modelo = escolher(r, MODELOS[temaVerdadeiro]);
        var data = dia + (6 + Math.floor(r() * 16)) * 3600000 + Math.floor(r() * 60) * 60000;
        if (data > agora) data = agora - Math.floor(r() * 3 * 3600000);
        var auto = C.classificar(modelo.x, temas);
        var revisado = d >= 6 && r() < 0.75;
        var tipo = revisado ? modelo.t : auto.tipo;
        var tema = revisado ? temaVerdadeiro : auto.tema;

        var m = {
          id: 'd' + (++seq),
          origem: 'demo',
          canal: r() < P_WHATS[temaVerdadeiro] ? 'whatsapp' : 'telegram',
          alunaId: escolher(r, ids),
          data: data,
          texto: modelo.x,
          equipe: false,
          tipo: tipo,
          tema: tema,
          auto: auto,
          revisado: revisado,
          acomp: null,
          aut: null
        };

        if (C.precisaAcompanhar(tipo)) {
          var x = r();
          var status;
          if (d > 4) status = x < 0.92 ? 'concluido' : 'andamento';
          else if (d >= 1) status = x < 0.5 ? 'concluido' : x < 0.75 ? 'andamento' : 'pendente';
          else status = x < 0.7 ? 'pendente' : 'andamento';
          var prio = C.sugerirPrioridade(tipo, tema, modelo.x);
          if (prio === 'media' && r() < 0.3) prio = 'baixa';
          m.acomp = {
            status: status,
            prioridade: prio,
            responsavel: status === 'pendente' && r() < 0.6 ? '' : escolher(r, equipe),
            sugerido: true
          };
        }

        if (tipo === 'depoimento' || tipo === 'evolucao') {
          var y = r();
          var st = y < 0.4 ? 'nao_solicitada' : y < 0.6 ? 'solicitada' : y < 0.75 ? 'uso_interno' : y < 0.95 ? 'divulgacao' : 'negada';
          m.aut = { status: st, confirmadoPor: (st === 'uso_interno' || st === 'divulgacao') ? equipe[0] : '', data: (st === 'nao_solicitada' ? null : data + 86400000) };
        }
        mensagens.push(m);
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
      var il = ilustracao(i);
      return {
        id: 'f' + (i + 1),
        origem: 'demo',
        alunaId: x.aluna,
        descricao: x.desc,
        data: U.somarDias(hoje, -x.dias) + 10 * 3600000,
        original: il.url,
        largura: il.w,
        altura: il.h,
        sugestaoRosto: il.rostos,
        ocultarRosto: true,
        derivada: null,
        derivadaInfo: null,
        prontaDivulgacao: false,
        aut: { status: x.st, confirmadoPor: (x.st === 'uso_interno' || x.st === 'divulgacao') ? equipe[0] : '', data: x.st === 'nao_solicitada' ? null : U.somarDias(hoje, -x.dias + 1) }
      };
    });

    return { alunas: alunas, mensagens: mensagens, midias: midias };
  }

  // Ilustração neutra (silhuetas) no lugar de fotos reais. Não é foto de ninguém.
  function ilustracao(i) {
    var w = 800, h = 520;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d');
    var tons = ['#d9c7cf', '#cfd6dd', '#d6d1c4', '#c9d3c9', '#d8cbd9', '#d3cdc4'];
    x.fillStyle = '#efe9ec';
    x.fillRect(0, 0, w, h);
    var rostos = [];
    [0, 1].forEach(function (lado) {
      var ox = lado * 400;
      x.fillStyle = lado ? '#f6f2f4' : '#ebe4e8';
      x.fillRect(ox + 8, 8, 384, h - 16);
      x.fillStyle = tons[i % tons.length];
      // cabeça
      x.beginPath(); x.arc(ox + 200, 130, 46, 0, Math.PI * 2); x.fill();
      rostos.push({ x: ox + 148, y: 78, w: 104, h: 104 });
      // olhos e boca simples para o desfoque ter o que esconder
      x.fillStyle = '#7d6a73';
      x.beginPath(); x.arc(ox + 184, 124, 5, 0, Math.PI * 2); x.arc(ox + 216, 124, 5, 0, Math.PI * 2); x.fill();
      x.fillRect(ox + 186, 148, 28, 4);
      // corpo (mais largo no "antes")
      x.fillStyle = tons[i % tons.length];
      x.beginPath(); x.ellipse(ox + 200, 330, lado ? 74 : 98, 140, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#5b4d54';
      x.font = '600 26px system-ui, sans-serif';
      x.fillText(lado ? 'DEPOIS' : 'ANTES', ox + 28, 50);
    });
    x.save();
    x.translate(w / 2, h / 2 + 40);
    x.rotate(-0.32);
    x.fillStyle = 'rgba(120, 40, 80, 0.28)';
    x.font = '700 46px system-ui, sans-serif';
    x.textAlign = 'center';
    x.fillText('ILUSTRAÇÃO FICTÍCIA', 0, 0);
    x.font = '600 24px system-ui, sans-serif';
    x.fillText('não é foto de uma pessoa real', 0, 40);
    x.restore();
    return { url: c.toDataURL('image/png'), w: w, h: h, rostos: rostos };
  }

  P.demo = { gerar: gerar };
})(window.Painel);

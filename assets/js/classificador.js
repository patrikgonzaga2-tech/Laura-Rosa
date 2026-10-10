/*
 * Classificação automática por palavras-chave.
 * O resultado é sempre uma SUGESTÃO: a equipe revisa antes de usar em relatórios.
 */
window.Painel = window.Painel || {};
(function (P) {
  'use strict';

  var norm = P.util.norm;

  var TIPOS = [
    { id: 'duvida', nome: 'Dúvida' },
    { id: 'queixa', nome: 'Queixa' },
    { id: 'dificuldade', nome: 'Dificuldade' },
    { id: 'depoimento', nome: 'Depoimento positivo' },
    { id: 'evolucao', nome: 'Relato de evolução' },
    { id: 'outro', nome: 'Outro' }
  ];

  // Ordem = desempate (o primeiro vence quando a pontuação é igual).
  var REGRAS_TIPO = [
    { tipo: 'evolucao', termos: ['perdi ', 'emagreci', ' kg', 'quilos', ' cm', 'centimetro', 'medida', 'calca', 'roupa', 'antes e depois', 'resultado', 'evolui', 'evoluindo', 'diminui', 'balanca'] },
    { tipo: 'depoimento', termos: ['amei', 'amando', 'obrigada', 'gratidao', 'grata', 'melhor coisa', 'melhor parte', 'acolhida', 'recomendo', 'fez toda diferenca', 'mudou minha', 'feliz', 'adorando'] },
    { tipo: 'queixa', termos: ['nao funciona', 'travando', ' erro', 'ninguem respondeu', 'ninguem me respondeu', 'demora', 'reclamacao', 'insatisfeita', 'absurdo', 'senha ta errada', 'senha errada', 'nao consigo acessar', 'nao abre', 'cancelar', 'reembolso'] },
    { tipo: 'dificuldade', termos: ['dificil', 'dificuldade', 'nao consigo', 'nao to conseguindo', 'nao estou conseguindo', 'desmotivada', 'desanimada', 'sem vontade', 'sem tempo', 'cansada', 'falhei', 'culpa', 'desistir', 'desandou', 'frustrada', 'fome', 'nao sinto'] },
    { tipo: 'duvida', termos: ['?', 'como ', 'posso', 'qual ', 'quanto', 'pode ', 'duvida', 'devo', 'e melhor', 'tem algum', 'alguma ideia', 'o que eu faco', 'o que posso'] }
  ];

  function temasPadrao() {
    return [
      { id: 'rotina', nome: 'Rotina e organização da semana', palavras: ['rotina', 'organizar', 'organizo', 'semana', 'planejar', 'agenda', 'cronograma', 'encaixar'], ideia: 'Carrossel: como montar a semana de treinos em 3 passos, com um plano B para os dias corridos.' },
      { id: 'trabalho', nome: 'Trabalho e treino', palavras: ['trabalho', 'plantao', 'expediente', 'turno', 'escritorio', 'chego tarde', 'saio cedo', '12x36'], ideia: 'Reels: treinar antes ou depois do trabalho? Como escolher pelo horário real de cada uma.' },
      { id: 'acesso', nome: 'Acesso aos treinos (TV, app, login)', palavras: ['tv', 'televisao', 'smart', 'espelhar', 'chromecast', 'login', 'senha', 'acessar', 'aplicativo', 'app', 'plataforma', 'video'], ideia: 'Vídeo curto de suporte: como colocar os treinos na TV. Vale fixar como resposta pronta no WhatsApp.' },
      { id: 'cafe', nome: 'Café da manhã e substituições', palavras: ['cafe da manha', 'substituir', 'substituicao', 'pao', 'tapioca', 'cuscuz', ' ovo', 'iogurte', 'de manha'], ideia: 'Carrossel: trocas simples para o café da manhã sem complicar a rotina.' },
      { id: 'lanche', nome: 'Lanches e marmita para o trabalho', palavras: ['lanche', 'marmita', 'levar pro trabalho', 'levar para o trabalho', 'fome a tarde', 'besteira', 'pratico'], ideia: 'Post: 5 lanches práticos para levar ao trabalho.' },
      { id: 'gluteo', nome: 'Glúteo', palavras: ['gluteo', 'bumbum', 'elevacao pelvica', 'agachamento'], ideia: 'Reels: por que você não sente o glúteo no exercício e como ajustar.' },
      { id: 'barriga', nome: 'Gordura da barriga', palavras: ['barriga', 'abdomen', 'abdominal', 'pochete', 'gordura localizada'], ideia: 'Carrossel: abdominal todo dia tira a barriga? O que realmente ajuda.' },
      { id: 'motivacao', nome: 'Dias de desmotivação', palavras: ['desmotivada', 'desanimada', 'sem vontade', 'preguica', 'cansada', 'triste', 'animo'], ideia: 'Stories: o que fazer no dia em que a vontade não aparece.' },
      { id: 'tempo', nome: 'Pouco tempo e treino curto', palavras: ['sem tempo', 'pouco tempo', 'corrida', 'correria', '10 minutos', '15 minutos', '20 minutos', 'rapido', 'treino curto', 'menorzinho'], ideia: 'Reels: treino de 15 minutos para os dias de correria.' },
      { id: 'objetivo', nome: 'Objetivo do treino do dia e flexibilidade', palavras: ['objetivo do treino', 'foco do treino', 'treino de hoje', 'treino do dia', 'trocar o treino', 'perdi o treino', 'adaptar', 'sigo o do dia', 'flexivel'], ideia: 'Carrossel: como descobrir o objetivo do treino do dia e trocar por uma versão menor.' },
      { id: 'constancia', nome: 'Perfeccionismo e constância', palavras: ['falhei', 'culpa', 'desistir', 'recomeco', 'recomecar', 'tudo ou nada', 'perfeita', 'parei', 'constancia', 'voltar'], ideia: 'Post: feito é melhor que perfeito. Constância vence a semana perfeita.' },
      { id: 'resultados', nome: 'Resultados e medidas', palavras: ['perdi ', 'emagreci', ' kg', 'quilos', ' cm', 'medida', 'calca', 'roupa', 'balanca', 'antes e depois', 'resultado'], ideia: 'Somente com autorização para divulgação: relatos de evolução como prova social, sem dados pessoais.' },
      { id: 'comunidade', nome: 'Experiência na comunidade', palavras: ['grupo', 'comunidade', 'acompanhamento', 'acolhida', 'apoio', 'suporte', 'respondeu', 'atendimento'], ideia: 'Somente com autorização para divulgação: depoimentos sobre o acompanhamento diário.' },
      { id: 'outros', nome: 'Outros assuntos', palavras: [], ideia: '', fixo: true }
    ];
  }

  function pontuar(texto, termos, pesoPergunta) {
    var t = ' ' + norm(texto) + ' ';
    var pts = 0;
    termos.forEach(function (k) {
      var kk = norm(k);
      if (!kk.trim() && kk !== '?') return;
      if (t.indexOf(kk) !== -1) {
        if (kk === '?') pts += pesoPergunta || 1;
        else pts += kk.trim().indexOf(' ') !== -1 ? 2 : 1;
      }
    });
    return pts;
  }

  function confianca(p) { return p >= 3 ? 'alta' : p === 2 ? 'media' : 'baixa'; }

  function classificar(texto, temas) {
    var melhorTipo = { id: 'outro', pts: 0 };
    REGRAS_TIPO.forEach(function (r) {
      var p = pontuar(texto, r.termos, 2);
      if (p > melhorTipo.pts) melhorTipo = { id: r.tipo, pts: p };
    });
    var melhorTema = { id: 'outros', pts: 0 };
    temas.forEach(function (tm) {
      if (tm.fixo) return;
      var p = pontuar(texto, tm.palavras);
      if (p > melhorTema.pts) melhorTema = { id: tm.id, pts: p };
    });
    return {
      tipo: melhorTipo.id,
      tema: melhorTema.id,
      confTipo: confianca(melhorTipo.pts),
      confTema: confianca(melhorTema.pts)
    };
  }

  // Sugestão de prioridade para a fila (também revisável).
  function sugerirPrioridade(tipo, tema, texto) {
    var t = norm(texto);
    if (tipo === 'queixa') return 'alta';
    if (/desistir|cancelar|reembolso|parar tudo/.test(t)) return 'alta';
    if (tipo === 'dificuldade' && (tema === 'motivacao' || tema === 'constancia')) return 'alta';
    if (tipo === 'dificuldade' || tipo === 'duvida') return 'media';
    return 'baixa';
  }

  function precisaAcompanhar(tipo) {
    return tipo === 'duvida' || tipo === 'queixa' || tipo === 'dificuldade';
  }

  P.classificador = {
    TIPOS: TIPOS,
    temasPadrao: temasPadrao,
    classificar: classificar,
    sugerirPrioridade: sugerirPrioridade,
    precisaAcompanhar: precisaAcompanhar
  };
})(window.Painel);

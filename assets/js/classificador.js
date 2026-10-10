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

  // natureza: 'conteudo' (vira post), 'mentalidade' (bloqueios que o seu método resolve),
  // 'entrega' (ajuste no suporte/produto) ou 'prova' (depoimentos e resultados).
  function temasPadrao() {
    return [
      { id: 'rotina', nome: 'Rotina e organização da semana', natureza: 'conteudo', palavras: ['rotina', 'organizar', 'organizo', 'semana', 'planejar', 'agenda', 'cronograma', 'encaixar'], ideia: 'Carrossel: como montar a semana de treinos em 3 passos, com um plano B para os dias corridos.', angulo: 'A semana não precisa ser perfeita: tenha um plano A e uma versão curta para os dias difíceis.' },
      { id: 'trabalho', nome: 'Trabalho e treino', natureza: 'conteudo', palavras: ['trabalho', 'plantao', 'expediente', 'turno', 'escritorio', 'chego tarde', 'saio cedo', '12x36'], ideia: 'Reels: treinar antes ou depois do trabalho? Como escolher pelo horário real de cada uma.', angulo: 'O melhor horário é o que cabe na sua rotina de verdade, não o ideal.' },
      { id: 'acesso', nome: 'Acesso aos treinos (TV, app, login)', natureza: 'entrega', palavras: ['tv', 'televisao', 'smart', 'espelhar', 'chromecast', 'login', 'senha', 'acessar', 'aplicativo', 'app', 'plataforma', 'video'], ideia: 'Vídeo curto de suporte: como colocar os treinos na TV.', acao: 'Gravar um tutorial fixo (TV, app e login), incluir na mensagem de boas-vindas e deixar como resposta pronta no WhatsApp.' },
      { id: 'cafe', nome: 'Café da manhã e substituições', natureza: 'conteudo', palavras: ['cafe da manha', 'substituir', 'substituicao', 'pao', 'tapioca', 'cuscuz', ' ovo', 'iogurte', 'de manha'], ideia: 'Carrossel: trocas simples para o café da manhã sem complicar a rotina.', angulo: 'Trocar é melhor do que cortar: flexibilidade também na alimentação.' },
      { id: 'lanche', nome: 'Lanches e marmita para o trabalho', natureza: 'conteudo', palavras: ['lanche', 'marmita', 'levar pro trabalho', 'levar para o trabalho', 'fome a tarde', 'besteira', 'pratico'], ideia: 'Post: 5 lanches práticos para levar ao trabalho.', angulo: 'Planejar o lanche é o que evita a "besteira" das 16 h, não força de vontade.' },
      { id: 'gluteo', nome: 'Glúteo', natureza: 'conteudo', palavras: ['gluteo', 'bumbum', 'elevacao pelvica', 'agachamento'], ideia: 'Reels: por que você não sente o glúteo no exercício e como ajustar.', angulo: 'Resultado vem de constância e técnica, não de treinar glúteo todo dia.' },
      { id: 'barriga', nome: 'Gordura da barriga', natureza: 'conteudo', palavras: ['barriga', 'abdomen', 'abdominal', 'pochete', 'gordura localizada'], ideia: 'Carrossel: abdominal todo dia tira a barriga? O que realmente ajuda.', angulo: 'Não existe perda localizada: treino completo, constância e paciência com o corpo da mulher.' },
      { id: 'motivacao', nome: 'Dias de desmotivação', natureza: 'mentalidade', palavras: ['desmotivada', 'desanimada', 'sem vontade', 'preguica', 'cansada', 'triste', 'animo'], ideia: 'Stories: o que fazer no dia em que a vontade não aparece.', angulo: 'No dia sem vontade, faça a versão mínima. Motivação vem depois da ação.' },
      { id: 'tempo', nome: 'Pouco tempo e treino curto', natureza: 'mentalidade', palavras: ['sem tempo', 'pouco tempo', 'corrida', 'correria', '10 minutos', '15 minutos', '20 minutos', 'rapido', 'treino curto', 'menorzinho'], ideia: 'Reels: treino de 15 minutos para os dias de correria.', angulo: '15 minutos contam. O treino curto mantém a constância, e a constância traz o resultado.' },
      { id: 'objetivo', nome: 'Objetivo do treino do dia e flexibilidade', natureza: 'conteudo', palavras: ['objetivo do treino', 'foco do treino', 'treino de hoje', 'treino do dia', 'trocar o treino', 'perdi o treino', 'adaptar', 'sigo o do dia', 'flexivel'], ideia: 'Carrossel: como descobrir o objetivo do treino do dia e trocar por uma versão menor.', angulo: 'Entendendo o objetivo do dia, você adapta sem culpa e não perde a semana.' },
      { id: 'constancia', nome: 'Perfeccionismo e constância', natureza: 'mentalidade', palavras: ['falhei', 'culpa', 'desistir', 'recomeco', 'recomecar', 'tudo ou nada', 'perfeita', 'perfeito', 'parei', 'constancia', 'voltar', 'manter', 'paro na'], ideia: 'Post: feito é melhor que perfeito. Constância vence a semana perfeita.', angulo: 'Fazer o melhor possível em cada dia, nas condições que você tem, dá resultado mais duradouro do que a semana perfeita que não se repete.' },
      { id: 'resultados', nome: 'Resultados e medidas', natureza: 'prova', palavras: ['perdi ', 'emagreci', ' kg', 'quilos', ' cm', 'medida', 'calca', 'roupa', 'balanca', 'antes e depois', 'resultado'], ideia: 'Somente com autorização para divulgação: relatos de evolução como prova social, sem dados pessoais.' },
      { id: 'comunidade', nome: 'Experiência na comunidade', natureza: 'prova', palavras: ['grupo', 'comunidade', 'acompanhamento', 'acolhida', 'apoio', 'suporte', 'respondeu', 'atendimento'], ideia: 'Somente com autorização para divulgação: depoimentos sobre o acompanhamento diário.', acao: 'Queixas sobre demora na resposta entram aqui: acompanhe o tempo de resposta da equipe.' },
      { id: 'outros', nome: 'Outros assuntos', natureza: 'conteudo', palavras: [], ideia: '', fixo: true }
    ];
  }

  // Todos os assuntos citados num texto (usado para ligar provas às dificuldades).
  function temasRelacionados(texto, temas) {
    return temas.filter(function (tm) { return !tm.fixo && pontuar(texto, tm.palavras) > 0; }).map(function (tm) { return tm.id; });
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
    temasRelacionados: temasRelacionados,
    classificar: classificar,
    sugerirPrioridade: sugerirPrioridade,
    precisaAcompanhar: precisaAcompanhar
  };
})(window.Painel);

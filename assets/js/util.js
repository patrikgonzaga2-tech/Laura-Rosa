/* Funções utilitárias compartilhadas pelo painel. */
window.Painel = window.Painel || {};
(function (P) {
  'use strict';

  var DIA = 86400000;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Minúsculas e sem acentos, para comparar palavras-chave.
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function p2(n) { return (n < 10 ? '0' : '') + n; }

  function inicioDia(ms) { var d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function fimDia(ms) { var d = new Date(ms); d.setHours(23, 59, 59, 999); return d.getTime(); }
  function somarDias(ms, n) { var d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); }

  function chaveDia(ms) {
    var d = new Date(ms);
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  }
  function deChave(k) {
    var a = String(k).split('-');
    return new Date(+a[0], +a[1] - 1, +a[2]).getTime();
  }
  // Segunda-feira da semana do dia informado.
  function inicioSemana(ms) {
    var d = new Date(inicioDia(ms));
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.getTime();
  }

  function fmtData(ms) { var d = new Date(ms); return p2(d.getDate()) + '/' + p2(d.getMonth() + 1); }
  function fmtDataAno(ms) { var d = new Date(ms); return fmtData(ms) + '/' + d.getFullYear(); }
  function fmtHora(ms) { var d = new Date(ms); return p2(d.getHours()) + ':' + p2(d.getMinutes()); }
  function fmtDataHora(ms) { return fmtDataAno(ms) + ' ' + fmtHora(ms); }

  function fmtRel(ms, ref) {
    var h = Math.floor((ref - ms) / 3600000);
    if (h < 1) return 'há menos de 1 h';
    if (h < 24) return 'há ' + h + ' h';
    var d = Math.floor(h / 24);
    return d === 1 ? 'há 1 dia' : 'há ' + d + ' dias';
  }

  function fmtNum(n) { return Number(n || 0).toLocaleString('pt-BR'); }

  // Variação percentual entre o período atual e o anterior.
  function variacao(atual, anterior) {
    if (!anterior) return atual ? { txt: 'novo', dir: 'sobe' } : { txt: 'sem mudança', dir: 'igual' };
    var p = Math.round(((atual - anterior) / anterior) * 100);
    if (p === 0) return { txt: 'estável', dir: 'igual' };
    return { txt: (p > 0 ? '+' : '') + p + '%', dir: p > 0 ? 'sobe' : 'desce' };
  }

  function contarPor(lista, chave) {
    var r = {};
    lista.forEach(function (x) { var k = typeof chave === 'function' ? chave(x) : x[chave]; r[k] = (r[k] || 0) + 1; });
    return r;
  }

  // Inicia um download. Funciona com o painel aberto no navegador;
  // em visualizações embutidas o navegador pode bloquear.
  function baixar(nome, conteudo, tipo) {
    var blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }

  function copiar(texto, ok, falha) {
    try {
      navigator.clipboard.writeText(texto).then(ok, falha);
    } catch (e) { falha(); }
  }

  P.util = {
    DIA: DIA, esc: esc, norm: norm, p2: p2,
    inicioDia: inicioDia, fimDia: fimDia, somarDias: somarDias,
    chaveDia: chaveDia, deChave: deChave, inicioSemana: inicioSemana,
    fmtData: fmtData, fmtDataAno: fmtDataAno, fmtHora: fmtHora, fmtDataHora: fmtDataHora,
    fmtRel: fmtRel, fmtNum: fmtNum, variacao: variacao, contarPor: contarPor,
    baixar: baixar, copiar: copiar
  };
})(window.Painel);

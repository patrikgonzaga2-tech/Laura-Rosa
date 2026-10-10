/* Gráfico de linhas em SVG, sem bibliotecas externas (funciona offline). */
window.Painel = window.Painel || {};
(function (P) {
  'use strict';

  var esc = P.util.esc;

  function passoBonito(x) {
    if (x <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(x)));
    var f = x / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }

  // eixo: rótulos curtos do eixo X; dicas: rótulos completos do tooltip;
  // series: [{ nome, cor, valores[] }]
  function linhas(el, eixo, dicas, series) {
    var W = Math.max(280, el.clientWidth || 600);
    var H = W < 520 ? 210 : 250;
    var m = { l: 34, r: 14, t: 14, b: 28 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var n = eixo.length;
    var max = 0;
    series.forEach(function (s) { s.valores.forEach(function (v) { if (v > max) max = v; }); });
    var passo = Math.max(1, passoBonito(max / 4));
    var ymax = Math.max(passo, Math.ceil(max / passo) * passo);
    function x(i) { return m.l + (n === 1 ? iw / 2 : i * iw / (n - 1)); }
    function y(v) { return m.t + ih - (v / ymax) * ih; }

    var s = '<svg class="g-svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">';
    for (var v = 0; v <= ymax; v += passo) {
      s += '<line class="g-grade" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(v) + '" y2="' + y(v) + '"></line>';
      s += '<text class="g-txt" x="' + (m.l - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + '</text>';
    }
    var cada = Math.max(1, Math.ceil(n / (W < 520 ? 4 : 7)));
    for (var i = 0; i < n; i++) {
      if (i % cada !== 0 && i !== n - 1) continue;
      if (i !== n - 1 && n - 1 - i < cada * 0.6) continue;
      var anc = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
      s += '<text class="g-txt" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="' + anc + '">' + esc(eixo[i]) + '</text>';
    }
    series.forEach(function (se) {
      var d = se.valores.map(function (val, k) { return (k ? 'L' : 'M') + x(k).toFixed(1) + ' ' + y(val).toFixed(1); }).join(' ');
      if (series.length === 1) {
        s += '<path d="' + d + ' L' + x(n - 1) + ' ' + y(0) + ' L' + x(0) + ' ' + y(0) + ' Z" style="fill:' + se.cor + ';opacity:.12"></path>';
      }
      s += '<path d="' + d + '" style="fill:none;stroke:' + se.cor + ';stroke-width:2;stroke-linejoin:round;stroke-linecap:round"></path>';
      s += '<circle cx="' + x(n - 1) + '" cy="' + y(se.valores[n - 1]) + '" r="4" style="fill:' + se.cor + ';stroke:var(--surface);stroke-width:2"></circle>';
    });
    s += '<line class="g-mira" x1="0" x2="0" y1="' + m.t + '" y2="' + (m.t + ih) + '" visibility="hidden"></line>';
    series.forEach(function (se, k) {
      s += '<circle class="g-ponto" data-k="' + k + '" r="4" visibility="hidden" style="fill:' + se.cor + ';stroke:var(--surface);stroke-width:2"></circle>';
    });
    s += '<rect class="g-alvo" x="' + m.l + '" y="' + m.t + '" width="' + iw + '" height="' + ih + '" style="fill:transparent"></rect></svg>';

    var legenda = '<div class="g-legenda">' + series.map(function (se) {
      var tot = se.valores.reduce(function (a, b) { return a + b; }, 0);
      return '<span><i style="background:' + se.cor + '"></i>' + esc(se.nome) + ' <strong>' + tot + '</strong></span>';
    }).join('') + '</div>';

    var tabela = '<details class="g-tabela"><summary>Ver números em tabela</summary><div class="tabela-rolagem"><table class="tab"><thead><tr><th>Período</th>' +
      series.map(function (se) { return '<th>' + esc(se.nome) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      dicas.map(function (d, k) { return '<tr><td>' + esc(d) + '</td>' + series.map(function (se) { return '<td>' + se.valores[k] + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div></details>';

    el.innerHTML = legenda + '<div class="g-area">' + s + '<div class="g-dica" hidden></div></div>' + tabela;

    var svg = el.querySelector('svg'), alvo = el.querySelector('.g-alvo'), mira = el.querySelector('.g-mira');
    var dica = el.querySelector('.g-dica'), pontos = el.querySelectorAll('.g-ponto');
    function mover(ev) {
      var r = svg.getBoundingClientRect();
      var px = (ev.clientX - r.left) * (W / r.width);
      var i = n === 1 ? 0 : Math.round((px - m.l) / (iw / (n - 1)));
      i = Math.max(0, Math.min(n - 1, i));
      mira.setAttribute('x1', x(i)); mira.setAttribute('x2', x(i)); mira.setAttribute('visibility', 'visible');
      pontos.forEach(function (p) {
        var se = series[+p.dataset.k];
        p.setAttribute('cx', x(i)); p.setAttribute('cy', y(se.valores[i])); p.setAttribute('visibility', 'visible');
      });
      dica.innerHTML = '<strong>' + esc(dicas[i]) + '</strong>' + series.map(function (se) {
        return '<span><i style="background:' + se.cor + '"></i>' + esc(se.nome) + ': ' + se.valores[i] + '</span>';
      }).join('');
      dica.hidden = false;
      var left = x(i) * (r.width / W);
      var w = dica.offsetWidth;
      dica.style.left = Math.max(0, Math.min(r.width - w, left - w / 2)) + 'px';
    }
    function sair() {
      mira.setAttribute('visibility', 'hidden');
      pontos.forEach(function (p) { p.setAttribute('visibility', 'hidden'); });
      dica.hidden = true;
    }
    alvo.addEventListener('pointermove', mover);
    alvo.addEventListener('pointerdown', mover);
    alvo.addEventListener('pointerleave', sair);
  }

  P.grafico = { linhas: linhas };
})(window.Painel);

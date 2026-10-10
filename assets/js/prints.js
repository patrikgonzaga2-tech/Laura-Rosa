/*
 * Montagem de "prints" para o Instagram a partir de material AUTORIZADO.
 * - Antes e depois: junta as duas fotos (ou as cópias com rosto oculto) num formato de post.
 * - Card de depoimento: o texto autorizado em um card de citação. Não imita print de WhatsApp.
 * - Print de conversa: encaixa um print real (já com nomes e fotos desfocados) no formato.
 * Nada aqui cria, inventa ou altera resultados: só organiza o que foi fornecido.
 */
window.Painel = window.Painel || {};
(function (P) {
  'use strict';

  var FORMATOS = {
    feed: { nome: 'Feed 4:5 (1080×1350)', w: 1080, h: 1350 },
    stories: { nome: 'Stories 9:16 (1080×1920)', w: 1080, h: 1920 },
    quadrado: { nome: 'Quadrado 1:1 (1080×1080)', w: 1080, h: 1080 }
  };
  var FUNDOS = {
    claro: { nome: 'Claro', bg: '#faf6f8', fg: '#2a1f25', tarja: '#a3245c', tarjaTxt: '#ffffff', sub: '#6c5f66' },
    rosa: { nome: 'Rosa', bg: '#f3dbe6', fg: '#3a1427', tarja: '#3a1427', tarjaTxt: '#ffffff', sub: '#6d3e55' },
    escuro: { nome: 'Escuro', bg: '#1d171a', fg: '#f6eef2', tarja: '#e67aa8', tarjaTxt: '#1d171a', sub: '#c4b2bb' }
  };
  var FONTE = '"Bricolage Grotesque", "Figtree", system-ui, sans-serif';

  function tela(f) {
    var c = document.createElement('canvas');
    c.width = f.w; c.height = f.h;
    return c;
  }

  // Desenha a imagem cobrindo a área (corta o excesso, sem distorcer).
  function cobrir(x, img, dx, dy, dw, dh) {
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    var esc = Math.max(dw / iw, dh / ih);
    var sw = dw / esc, sh = dh / esc;
    x.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, dx, dy, dw, dh);
  }
  // Desenha a imagem inteira dentro da área (sem cortar).
  function conter(x, img, dx, dy, dw, dh) {
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    var esc = Math.min(dw / iw, dh / ih);
    var w = iw * esc, h = ih * esc;
    x.drawImage(img, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h);
  }

  function arredondado(x, px, py, w, h, r) {
    x.beginPath();
    x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
  }

  function tarja(x, txt, px, py, cor) {
    x.font = '700 40px ' + FONTE;
    var w = x.measureText(txt).width + 44;
    x.fillStyle = cor.tarja;
    arredondado(x, px, py, w, 66, 12); x.fill();
    x.fillStyle = cor.tarjaTxt;
    x.textBaseline = 'middle';
    x.fillText(txt, px + 22, py + 34);
  }

  function rodape(x, f, cor, texto, assinatura) {
    x.textBaseline = 'alphabetic';
    x.textAlign = 'center';
    if (texto) { x.fillStyle = cor.fg; x.font = '700 56px ' + FONTE; x.fillText(texto, f.w / 2, f.h - (assinatura ? 110 : 70)); }
    if (assinatura) { x.fillStyle = cor.sub; x.font = '500 34px ' + FONTE; x.fillText(assinatura, f.w / 2, f.h - 52); }
    x.textAlign = 'start';
  }

  // o: { formato, layout ('lado'|'empilhado'), antes, depois, rotulos, periodo, assinatura, fundo }
  function antesDepois(o) {
    var f = FORMATOS[o.formato], cor = FUNDOS[o.fundo] || FUNDOS.claro;
    var c = tela(f), x = c.getContext('2d');
    x.fillStyle = cor.bg; x.fillRect(0, 0, f.w, f.h);
    var m = 48, gap = 16;
    var base = (o.periodo || o.assinatura) ? 200 : 60;
    var aw = f.w - m * 2, ah = f.h - m - base;
    var empilhado = o.layout === 'empilhado';
    var r1, r2;
    if (empilhado) { var hh = (ah - gap) / 2; r1 = [m, m, aw, hh]; r2 = [m, m + hh + gap, aw, hh]; }
    else { var ww = (aw - gap) / 2; r1 = [m, m, ww, ah]; r2 = [m + ww + gap, m, ww, ah]; }
    [[o.antes, r1, 'ANTES'], [o.depois, r2, 'DEPOIS']].forEach(function (p) {
      x.save();
      arredondado(x, p[1][0], p[1][1], p[1][2], p[1][3], 18); x.clip();
      x.fillStyle = cor.sub; x.fillRect(p[1][0], p[1][1], p[1][2], p[1][3]);
      cobrir(x, p[0], p[1][0], p[1][1], p[1][2], p[1][3]);
      x.restore();
      if (o.rotulos) tarja(x, p[2], p[1][0] + 20, p[1][1] + 20, cor);
    });
    rodape(x, f, cor, o.periodo, o.assinatura);
    return c.toDataURL('image/png');
  }

  // Quebra o texto em linhas que caibam na largura.
  function linhas(x, texto, larg) {
    var palavras = String(texto).split(/\s+/), out = [], atual = '';
    palavras.forEach(function (p) {
      var t = atual ? atual + ' ' + p : p;
      if (x.measureText(t).width > larg && atual) { out.push(atual); atual = p; } else atual = t;
    });
    if (atual) out.push(atual);
    return out;
  }

  // o: { formato, texto, atribuicao, assinatura, fundo }
  function cardDepoimento(o) {
    var f = FORMATOS[o.formato], cor = FUNDOS[o.fundo] || FUNDOS.claro;
    var c = tela(f), x = c.getContext('2d');
    x.fillStyle = cor.bg; x.fillRect(0, 0, f.w, f.h);
    var m = 110, larg = f.w - m * 2;
    var tam = o.texto.length > 160 ? 52 : o.texto.length > 90 ? 62 : 74;
    x.font = '600 ' + tam + 'px ' + FONTE;
    var ls = linhas(x, '“' + o.texto + '”', larg);
    var alt = ls.length * tam * 1.28;
    var y0 = Math.max(m + 120, (f.h - alt) / 2 - 40);
    x.fillStyle = cor.tarja; x.font = '700 220px ' + FONTE; x.fillText('“', m - 14, y0 - 10);
    x.fillStyle = cor.fg; x.font = '600 ' + tam + 'px ' + FONTE; x.textBaseline = 'top';
    ls.forEach(function (l, i) { x.fillText(l, m, y0 + i * tam * 1.28); });
    x.fillStyle = cor.tarja; x.fillRect(m, y0 + alt + 40, 90, 8);
    x.fillStyle = cor.sub; x.font = '500 40px ' + FONTE;
    x.fillText(o.atribuicao || 'Aluna do programa', m, y0 + alt + 76);
    x.textBaseline = 'alphabetic';
    rodape(x, f, cor, '', o.assinatura);
    return c.toDataURL('image/png');
  }

  // o: { formato, imagem, assinatura, fundo }
  function printConversa(o) {
    var f = FORMATOS[o.formato], cor = FUNDOS[o.fundo] || FUNDOS.claro;
    var c = tela(f), x = c.getContext('2d');
    x.fillStyle = cor.bg; x.fillRect(0, 0, f.w, f.h);
    var base = o.assinatura ? 140 : 60;
    conter(x, o.imagem, 60, 60, f.w - 120, f.h - 60 - base);
    rodape(x, f, cor, '', o.assinatura);
    return c.toDataURL('image/png');
  }

  // Cópia com áreas pixeladas (rosto, nome, foto de perfil). Nunca altera a imagem de origem.
  function pixelar(img, areas, bloco) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    var b = bloco * Math.max(1, w / 800);
    areas.forEach(function (a) {
      var pw = Math.max(1, Math.round(a.w / b)), ph = Math.max(1, Math.round(a.h / b));
      var t = document.createElement('canvas'); t.width = pw; t.height = ph;
      t.getContext('2d').drawImage(img, a.x, a.y, a.w, a.h, 0, 0, pw, ph);
      x.imageSmoothingEnabled = false;
      x.drawImage(t, 0, 0, pw, ph, a.x, a.y, a.w, a.h);
      x.imageSmoothingEnabled = true;
    });
    return c;
  }

  function carregar(url) {
    return new Promise(function (ok, erro) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = erro; i.src = url; });
  }

  P.prints = { FORMATOS: FORMATOS, FUNDOS: FUNDOS, antesDepois: antesDepois, cardDepoimento: cardDepoimento, printConversa: printConversa, pixelar: pixelar, carregar: carregar };
})(window.Painel);

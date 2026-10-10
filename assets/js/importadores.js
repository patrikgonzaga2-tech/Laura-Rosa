/*
 * Leitura de arquivos exportados manualmente.
 * Tudo acontece no navegador, na memória da aba. Nada é enviado para servidor
 * e nada é gravado no armazenamento do navegador.
 */
window.Painel = window.Painel || {};
(function (P) {
  'use strict';

  var norm = P.util.norm;

  var MIDIA_WHATS = /^(<\s*(m[ií]dia oculta|arquivo de m[ií]dia oculto|media omitted)\s*>|.*\(arquivo anexado\)|imagem ocultada|figurinha omitida|null)$/i;
  var APAGADA = /^(mensagem apagada|esta mensagem foi apagada|voc[eê] apagou esta mensagem|this message was deleted)\.?$/i;

  // Aceita os formatos de exportação do WhatsApp no Android e no iPhone:
  //   10/10/2026 14:32 - Nome: texto
  //   [10/10/2026, 14:32:05] Nome: texto
  var LINHA_WHATS = /^‎?\[?(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AaPp])\.?\s?[Mm]\.?)?\]?\s*(?:[-–]\s*)?([\s\S]*)$/;

  function whatsapp(texto) {
    var linhas = String(texto).replace(/\r\n?/g, '\n').split('\n');
    var msgs = [];
    var atual = null;
    var ignoradas = 0, midias = 0, sistema = 0;

    linhas.forEach(function (bruta) {
      var linha = bruta.replace(/[‎‏‪-‮]/g, '');
      var m = LINHA_WHATS.exec(linha);
      if (!m) {
        if (atual && linha.trim()) atual.texto += '\n' + linha;
        return;
      }
      var ano = +m[3]; if (ano < 100) ano += 2000;
      var hora = +m[4];
      if (m[7]) { var pm = /p/i.test(m[7]); if (pm && hora < 12) hora += 12; if (!pm && hora === 12) hora = 0; }
      var data = new Date(ano, +m[2] - 1, +m[1], hora, +m[5], +(m[6] || 0)).getTime();
      var resto = m[8];
      var sep = resto.indexOf(': ');
      if (sep <= 0 || sep > 60) { sistema++; atual = null; return; }
      atual = { data: data, remetente: resto.slice(0, sep).trim(), texto: resto.slice(sep + 2), canal: 'whatsapp' };
      msgs.push(atual);
    });

    var limpas = msgs.filter(function (x) {
      var t = x.texto.trim();
      if (MIDIA_WHATS.test(t)) { midias++; return false; }
      if (APAGADA.test(t) || !t) { ignoradas++; return false; }
      x.texto = t;
      return true;
    });
    if (!limpas.length) throw new Error('Não encontrei mensagens nesse arquivo. Confira se é o .txt gerado em "Exportar conversa" do WhatsApp (se veio em .zip, extraia o .txt antes).');
    return { mensagens: limpas, midias: midias, ignoradas: ignoradas + sistema };
  }

  function textoTelegram(t) {
    if (typeof t === 'string') return t;
    if (Array.isArray(t)) return t.map(function (p) { return typeof p === 'string' ? p : (p && p.text) || ''; }).join('');
    return '';
  }

  // Formato "JSON legível por máquina" do Telegram Desktop (arquivo result.json).
  function telegram(texto) {
    var dados;
    try { dados = JSON.parse(texto); } catch (e) { throw new Error('O arquivo não é um JSON válido. No Telegram Desktop, exporte com o formato "JSON legível por máquina".'); }
    var lista = [];
    if (Array.isArray(dados.messages)) lista = dados.messages;
    else if (dados.chats && Array.isArray(dados.chats.list)) dados.chats.list.forEach(function (c) { lista = lista.concat(c.messages || []); });
    else throw new Error('Esse JSON não parece uma exportação do Telegram (falta a lista "messages").');

    var midias = 0, ignoradas = 0;
    var msgs = [];
    lista.forEach(function (x) {
      if (x.type !== 'message') { ignoradas++; return; }
      var t = textoTelegram(x.text).trim();
      if (!t) { if (x.photo || x.file || x.media_type) midias++; else ignoradas++; return; }
      var data = new Date(x.date).getTime();
      if (isNaN(data)) { ignoradas++; return; }
      msgs.push({ data: data, remetente: x.from || 'Sem nome', texto: t, canal: 'telegram', idOrigem: x.id, respondeOrigem: x.reply_to_message_id || null });
    });
    if (!msgs.length) throw new Error('Não encontrei mensagens de texto nesse arquivo do Telegram.');
    return { mensagens: msgs, midias: midias, ignoradas: ignoradas, chat: dados.name || '' };
  }

  function lerCSV(txt) {
    txt = String(txt).replace(/^﻿/, '');
    var primeira = txt.split(/\r?\n/)[0] || '';
    var delim = (primeira.split(';').length > primeira.split(',').length) ? ';' : ',';
    var linhas = [], campo = '', linha = [], aspas = false;
    for (var i = 0; i < txt.length; i++) {
      var c = txt[i];
      if (aspas) {
        if (c === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else aspas = false; }
        else campo += c;
      } else if (c === '"') aspas = true;
      else if (c === delim) { linha.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && txt[i + 1] === '\n') i++;
        linha.push(campo); linhas.push(linha); linha = []; campo = '';
      } else campo += c;
    }
    if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
    return linhas.filter(function (l) { return l.some(function (v) { return String(v).trim(); }); });
  }

  function lerDataLivre(s) {
    s = String(s || '').trim();
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2}))?/.exec(s);
    if (m) { var a = +m[3]; if (a < 100) a += 2000; return new Date(a, +m[2] - 1, +m[1], +(m[4] || 12), +(m[5] || 0)).getTime(); }
    m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(s);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 12), +(m[5] || 0)).getTime();
    return NaN;
  }

  function acharColuna(cab, nomes) {
    for (var i = 0; i < cab.length; i++) if (nomes.indexOf(norm(cab[i]).trim()) !== -1) return i;
    return -1;
  }

  // Planilha com colunas: data, canal, nome, mensagem (e opcional: equipe).
  // Colunas de telefone ou contato são ignoradas: o painel não precisa delas.
  function csv(texto, canalPadrao) {
    var linhas = lerCSV(texto);
    if (linhas.length < 2) throw new Error('A planilha está vazia ou só tem o cabeçalho.');
    var cab = linhas[0];
    var iData = acharColuna(cab, ['data', 'data/hora', 'data e hora', 'datahora', 'date']);
    var iHora = acharColuna(cab, ['hora']);
    var iNome = acharColuna(cab, ['nome', 'remetente', 'aluna', 'autor']);
    var iTexto = acharColuna(cab, ['mensagem', 'texto', 'conteudo']);
    var iCanal = acharColuna(cab, ['canal']);
    var iEquipe = acharColuna(cab, ['equipe', 'da equipe', 'e da equipe']);
    var faltam = [];
    if (iData < 0) faltam.push('data');
    if (iNome < 0) faltam.push('nome');
    if (iTexto < 0) faltam.push('mensagem');
    if (faltam.length) throw new Error('Faltam colunas na planilha: ' + faltam.join(', ') + '. Use o modelo disponível nesta tela.');

    var msgs = [], ignoradas = 0;
    linhas.slice(1).forEach(function (l) {
      var bruto = (l[iData] || '') + (iHora >= 0 && l[iHora] ? ' ' + l[iHora] : '');
      var data = lerDataLivre(bruto);
      var t = String(l[iTexto] || '').trim();
      if (isNaN(data) || !t) { ignoradas++; return; }
      var canal = iCanal >= 0 ? norm(l[iCanal]) : '';
      canal = canal.indexOf('tele') === 0 ? 'telegram' : canal.indexOf('whats') === 0 || canal === 'wpp' || canal === 'zap' ? 'whatsapp' : canalPadrao;
      msgs.push({
        data: data,
        remetente: String(l[iNome] || 'Sem nome').trim(),
        texto: t,
        canal: canal,
        equipe: iEquipe >= 0 ? /^(s|sim|x|1|true)$/i.test(String(l[iEquipe]).trim()) : undefined
      });
    });
    if (!msgs.length) throw new Error('Nenhuma linha válida. Confira se a data está como dd/mm/aaaa e se a mensagem não está vazia.');
    return { mensagens: msgs, midias: 0, ignoradas: ignoradas };
  }

  var MODELO_CSV = '﻿data;hora;canal;nome;mensagem;equipe\n' +
    '10/10/2026;08:15;whatsapp;Nome da aluna;Escreva aqui o texto da mensagem;não\n' +
    '10/10/2026;08:40;whatsapp;Nome de quem é da equipe;Resposta da equipe;sim\n';

  P.importadores = { whatsapp: whatsapp, telegram: telegram, csv: csv, MODELO_CSV: MODELO_CSV };
})(window.Painel);

/*
 * Minimização de dados pessoais.
 * - Visões analíticas e relatórios: código da aluna, sem nome completo, sem telefone.
 * - Área restrita (fila, com permissão): primeiro nome; contato só sob demanda.
 */
window.Painel = window.Painel || {};
(function (P) {
  'use strict';

  var norm = P.util.norm;

  var RE_EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
  var RE_TEL = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2}\)?[\s.-]?)?9?\d{4}[\s.-]?\d{4}\b/g;
  var RE_ARROBA = /(^|[\s(])@[A-Za-z0-9_.]{3,}/g;
  var RE_CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;

  // Remove contato e sobrenomes conhecidos do texto antes de exibir em visões não restritas.
  function mascararTexto(texto, alunas) {
    var t = String(texto || '')
      .replace(RE_EMAIL, '[e-mail oculto]')
      .replace(RE_CPF, '[documento oculto]')
      .replace(RE_TEL, '[telefone oculto]')
      .replace(RE_ARROBA, '$1[@ oculto]');
    var sobrenomes = {};
    Object.keys(alunas || {}).forEach(function (id) {
      String(alunas[id].sobrenome || '').split(/\s+/).forEach(function (s) {
        if (s.length >= 3) sobrenomes[norm(s)] = true;
      });
    });
    if (Object.keys(sobrenomes).length) {
      t = t.replace(/[\p{L}'’-]+/gu, function (palavra) {
        return sobrenomes[norm(palavra)] ? '[sobrenome oculto]' : palavra;
      });
    }
    return t;
  }

  function primeiroNome(a) { return a ? String(a.nome || '').split(/\s+/)[0] : ''; }

  P.privacidade = { mascararTexto: mascararTexto, primeiroNome: primeiroNome };
})(window.Painel);

/*
 * Minimização de dados pessoais.
 * - O painel não guarda telefone nem contato: ele organiza, não responde.
 * - Visões analíticas e relatórios: código da aluna, sem nome e sem sobrenome.
 * - Com permissão de edição: primeiro nome + código, para reconhecer quem é.
 * - Telefones, e-mails, @ e documentos citados no texto são mascarados.
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

  // Para textos da equipe em relatórios: também troca nomes de alunas citados ("Bom dia, Bianca!").
  function mascararNomes(texto, alunas) {
    var nomes = {};
    Object.keys(alunas || {}).forEach(function (id) {
      var n = String(alunas[id].nome || '').split(/\s+/)[0];
      if (n.length >= 3) nomes[norm(n)] = true;
    });
    var t = mascararTexto(texto, alunas);
    return t.replace(/[\p{L}'’-]+/gu, function (p) { return nomes[norm(p)] ? '[nome]' : p; });
  }

  function primeiroNome(a) { return a ? String(a.nome || '').split(/\s+/)[0] : ''; }

  P.privacidade = { mascararTexto: mascararTexto, mascararNomes: mascararNomes, primeiroNome: primeiroNome };
})(window.Painel);

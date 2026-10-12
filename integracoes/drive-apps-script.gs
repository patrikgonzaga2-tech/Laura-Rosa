/**
 * Painel de acompanhamento → Google Drive (prints aprovados para o Instagram).
 *
 * Fica na conta Google dona da pasta "Painel de acompanhamento". Recebe do servidor do painel
 * (função painel-drive) um PNG já aprovado e salva em:
 *   Painel de acompanhamento / Materiais autorizados / Instagram / AAAA-MM / <arquivo>.png
 * As permissões dos arquivos são as da pasta (este script não compartilha nada).
 *
 * Como instalar (passo a passo no chat):
 *  1. Cole este código num projeto novo em script.google.com.
 *  2. Rode a função "configurar" uma vez: ela gera a chave e mostra no registro de execução.
 *  3. Publique como App da Web (Executar como: Eu; Quem pode acessar: Qualquer pessoa).
 *  4. No Supabase, em Edge Functions > Secrets, crie DRIVE_URL (endereço do App da Web)
 *     e DRIVE_CHAVE (a chave gerada no passo 2).
 */

// Pasta "Materiais autorizados" dentro de "Painel de acompanhamento".
var PASTA_MATERIAIS_ID = '1UHo-YXCYB5fhKWT3RN0GKU1uUKDRO4Ix';

function configurar() {
  var pasta = DriveApp.getFolderById(PASTA_MATERIAIS_ID); // confirma o acesso à pasta
  var chave = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('CHAVE', chave);
  Logger.log('Pasta encontrada: ' + pasta.getName());
  Logger.log('Copie esta chave para o Supabase (secret DRIVE_CHAVE): ' + chave);
}

function doPost(e) {
  try {
    var corpo = JSON.parse(e.postData.contents);
    var chave = PropertiesService.getScriptProperties().getProperty('CHAVE');
    if (!chave || corpo.chave !== chave) return saida({ ok: false, erro: 'chave' });
    if (corpo.acao === 'status') {
      var p = DriveApp.getFolderById(PASTA_MATERIAIS_ID);
      return saida({ ok: true, pasta: p.getName(), url: p.getUrl() });
    }
    var nome = limpar(corpo.nome);
    if (!/\.(png|jpe?g)$/i.test(nome) || !corpo.base64) return saida({ ok: false, erro: 'arquivo inválido' });
    var pasta = DriveApp.getFolderById(PASTA_MATERIAIS_ID);
    (corpo.pastas || []).forEach(function (n) { pasta = subpasta(pasta, limpar(n)); });
    var repetidos = pasta.getFilesByName(nome);
    if (repetidos.hasNext()) {
      var r = repetidos.next();
      return saida({ ok: true, repetido: true, id: r.getId(), url: r.getUrl(), pastaUrl: pasta.getUrl() });
    }
    var tipo = /\.png$/i.test(nome) ? 'image/png' : 'image/jpeg';
    var arquivo = pasta.createFile(Utilities.newBlob(Utilities.base64Decode(corpo.base64), tipo, nome));
    if (corpo.descricao) arquivo.setDescription(String(corpo.descricao).slice(0, 1000));
    return saida({ ok: true, id: arquivo.getId(), url: arquivo.getUrl(), pastaUrl: pasta.getUrl() });
  } catch (err) {
    return saida({ ok: false, erro: String(err && err.message || err).slice(0, 200) });
  }
}

function subpasta(pai, nome) {
  var it = pai.getFoldersByName(nome);
  return it.hasNext() ? it.next() : pai.createFolder(nome);
}

function limpar(s) {
  return String(s || '').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function saida(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

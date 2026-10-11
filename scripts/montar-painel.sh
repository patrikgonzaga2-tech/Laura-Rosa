#!/bin/sh
# Monta a pasta dist/ que o Vercel publica no projeto do painel (só os arquivos do painel).
# O endereço do servidor e a chave PÚBLICA vêm das variáveis do projeto no Vercel,
# então não ficam no repositório. Nunca use aqui a chave secreta (service_role / sb_secret).
set -eu
: "${PAINEL_URL:?Defina PAINEL_URL nas variáveis do projeto no Vercel}"
: "${PAINEL_CHAVE:?Defina PAINEL_CHAVE (chave publishable do Supabase) nas variáveis do projeto no Vercel}"
case "$PAINEL_CHAVE" in
  sb_publishable_*) ;;
  *) echo "PAINEL_CHAVE precisa ser a chave publishable (começa com sb_publishable_). Chave secreta não pode ir para o navegador."; exit 1 ;;
esac
rm -rf dist
mkdir -p dist
cp index.html dist/
cp -r assets dist/
rm -f dist/assets/js/config.js
printf 'window.PAINEL_NUVEM = { url: "%s", chave: "%s" };\n' "$PAINEL_URL" "$PAINEL_CHAVE" > dist/assets/js/config.js
echo "Painel montado em dist/"

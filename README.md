# Painel de Acompanhamento das Alunas

Protótipo de painel para organizar o suporte das alunas (WhatsApp de suporte e grupo de acompanhamento no Telegram): dúvidas frequentes, queixas e dificuldades, fila de respostas, depoimentos, relatos de evolução e fotos de antes e depois com controle de autorização.

> **Estado atual: protótipo (etapa 1).** Funciona inteiro no navegador, sem servidor.
> - Os dados que aparecem ao abrir são **fictícios** e identificados como tal.
> - É possível **importar manualmente** conversas exportadas do WhatsApp (.txt), do Telegram (.json) ou de uma planilha (.csv). Esses dados ficam só na memória da aba e somem ao recarregar.
> - **Nenhuma integração automática está ativa.** Login e permissões são simulados.

## Como abrir

1. Baixe ou clone esta pasta (veja `docs/COMO-ABRIR-E-VERSIONAR.md`).
2. Dê dois cliques em `index.html`. Ele abre no navegador (Chrome, Edge, Firefox ou Safari).
3. Para testar a importação, use os arquivos fictícios da pasta `exemplos/`.

Não precisa instalar nada. As fontes vêm do Google Fonts quando há internet. Sem internet, o painel usa as fontes do sistema.

## O que tem aqui

| Pasta/arquivo | Conteúdo |
|---|---|
| `index.html` | Página do painel |
| `assets/css/painel.css` | Visual (claro e escuro, computador e celular) |
| `assets/js/` | Lógica: classificação, privacidade, importação, gráfico e telas |
| `assets/js/dados-demo.js` | **Dados fictícios** usados na demonstração |
| `exemplos/` | Arquivos fictícios para testar a importação |
| `docs/ARQUITETURA.md` | Arquitetura proposta (protótipo e versão com servidor) |
| `docs/CHECKLIST.md` | Informações e autorizações que ainda faltam |
| `docs/GUIA-INTEGRACOES.md` | Guia de integrações, uma por vez |
| `docs/PRIVACIDADE-LGPD.md` | Cuidados com dados pessoais (não substitui orientação jurídica) |
| `docs/TESTES.md` | Lista de testes de filtros, permissões, anonimização, arquivos e exportações |
| `docs/COMO-ABRIR-E-VERSIONAR.md` | Passo a passo com o GitHub Desktop |

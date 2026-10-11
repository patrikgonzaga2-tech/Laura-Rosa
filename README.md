# Painel de Acompanhamento das Alunas

Painel que organiza as conversas que já acontecem no WhatsApp de suporte e no grupo do Telegram. Ele não serve para conversar com as alunas e não guarda telefone ou contato.

- **Conversas do dia:** o assunto do dia, quem perguntou o quê e o que a equipe respondeu.
- **Dores e objeções:** o que trava as alunas, nas palavras delas, e como quebrar com o seu método.
- **Antes e depois e resultados:** relatos, depoimentos e fotos, com registro de autorização e ideias de antes e depois.
- **Prints para o Instagram:** monta o print (antes e depois, card de depoimento ou print de conversa) só com material autorizado. Você aprova, e os aprovados vão em um pacote para o Drive da social media.
- **Visão geral personalizável:** alertas "Pede atenção agora", indicadores com tendência, gráfico com escolha de métrica, "Personalizar painel", "Salvar visualização", "Redefinir" e "Atualizar dados".
- **Ideias de conteúdo e Como ajudar mais:** pauta com o ângulo do seu método, a resposta que você já deu e sugestões para cuidar melhor das alunas.

O relatório principal é a **Pauta de conteúdo e necessidades das alunas**. Ela transforma as mensagens em pauta para o Instagram (com o ângulo do seu método), perguntas que se repetem, bloqueios de mentalidade, provas sociais autorizadas e melhorias na entrega. Veja um exemplo com dados fictícios em `exemplos/relatorio-pauta-ficticio.html`.

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
| `assets/js/` | Lógica: classificação, análises (`analise.js`), pauta (`pauta.js`), montagem de prints (`prints.js`), privacidade, importação, gráfico e telas |
| `assets/vendor/` | JSZip 3.10.1 (licença MIT), para gerar o .zip do pacote de prints |
| `assets/js/dados-demo.js` | **Dados fictícios** usados na demonstração |
| `exemplos/` | Arquivos fictícios para testar a importação |
| `docs/ARQUITETURA.md` | Arquitetura proposta (protótipo e versão com servidor) |
| `docs/CHECKLIST.md` | Informações e autorizações que ainda faltam |
| `docs/GUIA-INTEGRACOES.md` | Guia de integrações, uma por vez |
| `docs/PRIVACIDADE-LGPD.md` | Cuidados com dados pessoais (não substitui orientação jurídica) |
| `docs/TESTES.md` | Lista de testes de filtros, permissões, anonimização, arquivos e exportações |
| `docs/COMO-ABRIR-E-VERSIONAR.md` | Passo a passo com o GitHub Desktop |

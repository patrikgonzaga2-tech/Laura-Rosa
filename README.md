# Painel de Acompanhamento das Alunas

Painel que organiza as conversas que já acontecem no WhatsApp de suporte e no grupo do Telegram. Ele não serve para conversar com as alunas e não guarda telefone ou contato.

- **Conversas do dia:** o assunto do dia, quem perguntou o quê e o que a equipe respondeu.
- **Dores e objeções:** o que trava as alunas, nas palavras delas, e como quebrar com o seu método.
- **Antes e depois e resultados:** relatos, depoimentos e fotos, com registro de autorização e ideias de antes e depois.
- **Prints para o Instagram:** monta o print (antes e depois, card de depoimento ou print de conversa) só com material autorizado. Você aprova, e os aprovados vão em um pacote para o Drive da social media.
- **Visão geral personalizável:** alertas "Pede atenção agora", indicadores com tendência, gráfico com escolha de métrica, "Personalizar painel", "Salvar visualização", "Redefinir" e "Atualizar dados".
- **Ideias de conteúdo e Como ajudar mais:** pauta com o ângulo do seu método, a resposta que você já deu e sugestões para cuidar melhor das alunas.

O relatório principal é a **Pauta de conteúdo e necessidades das alunas**. Ela transforma as mensagens em pauta para o Instagram (com o ângulo do seu método), perguntas que se repetem, bloqueios de mentalidade, provas sociais autorizadas e melhorias na entrega. Veja um exemplo com dados fictícios em `exemplos/relatorio-pauta-ficticio.html`.

> **Estado atual: painel online com login (etapa 2).**
> - **Publicado** em um projeto próprio do Vercel (separado do site). Só entra quem a Administração cadastrar em **Usuários**. A pessoa cria a própria senha pelo link do convite que chega no e-mail.
> - **Ao vivo:** as mensagens do grupo do Telegram chegam sozinhas (bot `@CorpoFelizPainelBot` → função `painel-telegram` → banco). Revisões de classificação e autorizações ficam salvas no servidor.
> - **Funções** (Administração, Edição, Exportação, Leitura) vêm do servidor. O primeiro nome das alunas só sai do servidor para Administração e Edição. A escolha de painéis organiza o menu de cada pessoa.
> - **Ainda só na aba:** fotos, prints montados e mudanças em assuntos/objeções/equipe (somem ao recarregar). WhatsApp entra por importação manual até a etapa 9.
> - Aberto direto do arquivo (sem `assets/js/config.js`), continua sendo o protótipo com dados fictícios e "Ver como" simulado.

## Painel online: como funciona a publicação

- O Vercel roda `scripts/montar-painel.sh`, que copia só `index.html` e `assets/` para `dist/` e cria `assets/js/config.js` com as variáveis `PAINEL_URL` e `PAINEL_CHAVE` do projeto no Vercel. Esse arquivo não fica no repositório.
- `PAINEL_CHAVE` é a chave **publishable** do Supabase (feita para ficar no navegador). O script recusa chave secreta. As tabelas não aceitam essa chave: tudo passa por funções que exigem login.
- O `vercel.json` pula a montagem quando o projeto não tem `PAINEL_CHAVE` (é o caso do projeto do site), então o site não é afetado.
- Banco: `supabase/migrations/` (tabelas `painel_*`, funções `painel_eu`, `painel_mensagens_ler`, `painel_revisar`, `painel_autorizar`, `painel_registro`). Funções do servidor: `supabase/functions/painel-telegram` e `supabase/functions/painel-usuarios`.

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

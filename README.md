# Painel de Acompanhamento das Alunas

Painel que organiza as conversas que já acontecem no WhatsApp de suporte e no grupo do Telegram. Ele não serve para conversar com as alunas e não guarda telefone ou contato.

- **Conversas do dia:** o assunto do dia, quem perguntou o quê e o que a equipe respondeu.
- **Dores e objeções:** o que trava as alunas, nas palavras delas, e como quebrar com o seu método.
- **Antes e depois e resultados:** relatos, depoimentos e fotos, com registro de autorização e ideias de antes e depois.
- **Prints para o Instagram:** monta o print (antes e depois, card de depoimento ou print de conversa) só com material autorizado. Você aprova, e os aprovados vão em um pacote para o Drive da social media.
- **Visão geral personalizável:** alertas "Pede atenção agora", indicadores com tendência, gráfico com escolha de métrica, "Personalizar painel", "Salvar visualização", "Redefinir" e "Atualizar dados".
- **Ideias de conteúdo e Como ajudar mais:** pauta com o ângulo do seu método, a resposta que você já deu e sugestões para cuidar melhor das alunas.

O relatório principal é a **Pauta de conteúdo e necessidades das alunas**. Ela transforma as mensagens em pauta para o Instagram (com o ângulo do seu método), perguntas que se repetem, bloqueios de mentalidade, provas sociais autorizadas e melhorias na entrega.

> **Estado atual: painel online com login.**
> - **Publicado** em um projeto próprio do Vercel (separado do site): https://painel.teamcorpofeliz.com.br e https://painel-alunas-corpo-feliz.vercel.app. Só entra quem a Administração cadastrar em **Usuários**, com a senha inicial `primeironome1234`; no primeiro acesso a pessoa cria uma senha só dela. "Manter conectado" lembra o aparelho por 30 dias.
> - **Ao vivo:** as mensagens do grupo do Telegram chegam sozinhas (bot `@CorpoFelizPainelBot` → função `painel-telegram` → banco). Revisões de classificação e autorizações ficam salvas no servidor.
> - **Funções** (Administração, Edição, Exportação, Leitura) vêm do servidor. O primeiro nome das alunas só sai do servidor para Administração e Edição. A escolha de painéis organiza o menu de cada pessoa.
> - **Ainda só na aba:** fotos, prints montados e mudanças em assuntos/objeções/equipe (somem ao recarregar). O WhatsApp de suporte ainda não está ligado (etapa 9).
> - Não há mais dados fictícios nem importação de arquivos: o painel mostra só os dados reais do servidor.

## Painel online: como funciona a publicação

- O Vercel roda `scripts/montar-painel.sh`, que copia só `index.html` e `assets/` para `dist/` e cria `assets/js/config.js` com as variáveis `PAINEL_URL` e `PAINEL_CHAVE` do projeto no Vercel. Esse arquivo não fica no repositório.
- `PAINEL_CHAVE` é a chave **publishable** do Supabase (feita para ficar no navegador). O script recusa chave secreta. As tabelas não aceitam essa chave: tudo passa por funções que exigem login.
- O `vercel.json` pula a montagem quando o projeto não tem `PAINEL_CHAVE` (é o caso do projeto do site), então o site não é afetado.
- Banco: `supabase/migrations/` (tabelas `painel_*`, funções `painel_eu`, `painel_mensagens_ler`, `painel_revisar`, `painel_autorizar`, `painel_registro`). Funções do servidor: `supabase/functions/painel-telegram` e `supabase/functions/painel-usuarios`.

## Como abrir

Use o endereço publicado. Aberto direto do arquivo `index.html`, sem o `assets/js/config.js` que a publicação cria, o painel só mostra o aviso de que falta a configuração do servidor.

## O que tem aqui

| Pasta/arquivo | Conteúdo |
|---|---|
| `index.html` | Página do painel |
| `assets/css/painel.css` | Visual (claro e escuro, computador e celular) |
| `assets/js/` | Lógica: login e servidor (`nuvem.js`), classificação, análises (`analise.js`), pauta (`pauta.js`), montagem de prints (`prints.js`), privacidade, gráfico e telas (`app.js`) |
| `assets/vendor/` | JSZip 3.10.1 e Supabase JS 2.45.4 (licença MIT) |
| `scripts/montar-painel.sh` | Monta a pasta publicada no Vercel |
| `supabase/` | Banco (migrações) e funções do servidor |
| `docs/ARQUITETURA.md` | Arquitetura |
| `docs/CHECKLIST.md` | Informações e autorizações que ainda faltam |
| `docs/GUIA-INTEGRACOES.md` | Guia de integrações, uma por vez |
| `docs/PRIVACIDADE-LGPD.md` | Cuidados com dados pessoais (não substitui orientação jurídica) |
| `docs/TESTES.md` | Lista de testes de filtros, permissões, anonimização, arquivos e exportações |
| `docs/COMO-ABRIR-E-VERSIONAR.md` | Passo a passo com o GitHub Desktop |

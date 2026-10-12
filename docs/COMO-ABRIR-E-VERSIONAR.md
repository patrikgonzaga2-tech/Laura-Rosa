# Como abrir o projeto e versionar com o GitHub Desktop

O repositório do projeto no GitHub é `patrikgonzaga2-tech/Laura-Rosa`.

## 1. Instalar o GitHub Desktop (se ainda não tiver)
1. Acesse **desktop.github.com** e clique em *Download* (Windows ou Mac).
2. Abra o instalador e siga as instruções.
3. Na primeira abertura, clique em **Sign in to GitHub.com** e entre com a conta que tem acesso ao repositório. O login acontece no navegador. Não passe a senha para ninguém.
4. Em *Configure Git*, confirme o nome e o e-mail que vão aparecer nas versões salvas.

## 2. Baixar o projeto para o computador
1. No GitHub Desktop, vá em **File → Clone repository** (no Mac: *File → Clone Repository…*).
2. Na aba **GitHub.com**, escolha `patrikgonzaga2-tech/Laura-Rosa`.
3. Em **Local path**, escolha a pasta (ex.: `Documentos/GitHub/Laura-Rosa`) e clique em **Clone**.
4. Se o painel estiver em outro ramo (*branch*), troque em **Current branch** no topo.

## 3. Abrir o painel
Use o endereço publicado: https://painel.teamcorpofeliz.com.br. Aberto direto do arquivo `index.html`, o painel só avisa que falta a configuração do servidor (ela é criada na publicação pelo Vercel).

## 4. Salvar uma nova versão (commit)
1. Faça a alteração nos arquivos (por exemplo, editando um texto).
2. Volte ao GitHub Desktop. As mudanças aparecem na lista à esquerda.
3. Em **Summary**, escreva um resumo curto (ex.: "Ajusta nomes dos assuntos").
4. Clique em **Commit to …** (o nome do ramo atual).
5. Clique em **Push origin** para enviar ao GitHub.

## 5. Receber as atualizações feitas por outra pessoa
1. Clique em **Fetch origin**.
2. Se aparecer **Pull origin**, clique para baixar as mudanças.

## Cuidados importantes
- **Nunca coloque no repositório:**
  - arquivos exportados com conversas reais, fotos de alunas, planilhas com contatos;
  - senhas, tokens ou chaves de API.
- O arquivo `.gitignore` já bloqueia a pasta `dados-reais/` e arquivos de exportação comuns. Mesmo assim, confira a lista antes de cada commit.
- O repositório deve continuar **privado**. Confira em GitHub → Settings → General → *Danger Zone* → visibilidade.

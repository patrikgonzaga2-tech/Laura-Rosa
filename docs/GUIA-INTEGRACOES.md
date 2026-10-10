# Guia de integrações (uma por vez)

As integrações serão feitas **uma de cada vez**, e só passamos para a próxima depois da sua confirmação. Este guia descreve o caminho de cada uma. Os passos detalhados de configuração são preenchidos quando chegarmos nela.

**Regras para todas as integrações:**
- Nenhuma senha, código de verificação ou token é enviado pelo chat. Cada chave é colada direto no painel do provedor ou nos *secrets* do servidor.
- Primeiro testamos num ambiente controlado: um grupo de teste ou um número de teste, só com pessoas da equipe.
- Até a conexão ser configurada e testada, o painel continua mostrando "importação manual" ou "dados fictícios".

---

## Etapa 0: importação manual (já disponível no protótipo)
- **WhatsApp:** no celular, abra a conversa e toque em *Mais → Exportar conversa → Sem mídia* para gerar o `.txt`.
- **Telegram:** no Telegram Desktop, abra o grupo e use *Exportar histórico do chat* no formato *JSON legível por máquina* para gerar o `result.json`.
- **Planilha:** use o modelo `.csv` disponível na tela Importar.
- **Limitação:** é manual e não atualiza sozinho. Em compensação, não exige nenhuma configuração externa.

## Etapa A: Telegram (provavelmente a mais simples)
**Como funciona:** um bot oficial criado no @BotFather entra no grupo. O Telegram envia cada nova mensagem para uma função no servidor (webhook), que grava no banco.

**Requisitos:**
- Permissão para adicionar bots ao grupo.
- Ser administradora do grupo, ou ter a ajuda de quem é.
- Um servidor com HTTPS para receber o webhook (Supabase Edge Function).

**O que o bot consegue ler:**
- Com o *modo de privacidade* ligado (padrão), ele só recebe comandos, menções e respostas às mensagens dele.
- Para ler todas as mensagens do grupo, ele precisa ser **administrador** ou ter o modo de privacidade **desligado** (@BotFather → `/setprivacy` → Disable). Depois de mudar essa opção, é preciso remover e adicionar o bot de novo no grupo.
- Ele **não lê mensagens anteriores** à entrada dele. O histórico antigo entra pela importação manual (JSON).
- Fotos chegam como arquivo e só são guardadas se a regra de autorização permitir.

**Como testar sem expor as alunas:**
1. Criar um grupo de teste só com a equipe.
2. Adicionar o bot e enviar mensagens fictícias.
3. Conferir no painel, apagar os dados de teste e só então levar o bot para o grupo real, com aviso às alunas.

## Etapa B: WhatsApp
**As opções dependem da sua resposta sobre qual solução você usa hoje:**

| Cenário | É oficial? | O que dá para fazer |
|---|---|---|
| App WhatsApp Business no celular | Sim | **Não há API para ler conversas.** Só a exportação manual (.txt) |
| WhatsApp Business Platform (Cloud API da Meta), direto | Sim | Mensagens novas chegam por webhook. Exige empresa verificada no Gerenciador de Negócios e um número conectado à API |
| Provedor autorizado pela Meta (BSP) | Sim, se for parceiro oficial | Igual à Cloud API, com o painel do provedor. Alguns oferecem **coexistência**: o mesmo número continua no app Business e na API, às vezes com importação de parte do histórico. Confirmar com o provedor |
| Ferramentas que conectam pelo QR code do WhatsApp Web | **Não** | **Não recomendado.** Pode bloquear o número e expõe as conversas |

**Pontos de atenção:**
- **Custos:** a Meta cobra por mensagem-modelo enviada fora da janela de atendimento. Receber mensagens e responder dentro da janela de 24 h normalmente não é cobrado. Provedores podem cobrar mensalidade. Vamos confirmar na tabela atual antes de contratar.
- **Testes:** a Meta oferece um número de teste gratuito. Primeiro conectamos esse número, testamos com celulares da equipe e só depois o número real.
- **UMCLIQUE:** sua conta tem um conector dessa plataforma. Antes de usá-la como fonte, precisamos confirmar com você que ela é o seu atendimento oficial e se é parceira oficial da Meta. **Não acessei nada dela.**

## Etapa C: Google Drive
- **Como funciona:** usa a API oficial do Google Drive com login OAuth. A permissão pedida é restrita (`drive.file`), então o painel só enxerga os arquivos e pastas que ele mesmo criou.
- **Estrutura proposta, sujeita à sua aprovação:**
  ```
  Painel de acompanhamento/
    Importações originais/
    Materiais autorizados/
    Cópias tratadas para revisão/
    Relatórios/
  ```
- Nenhuma pasta ou arquivo com link público. O compartilhamento é por e-mail, pessoa a pessoa.
- Nada é enviado ao Drive antes de você confirmar a estrutura, as permissões e as regras de autorização.

## Etapa D: hospedagem e login
Veja `docs/ARQUITETURA.md`. Inclui:
- criar o projeto no Supabase (região São Paulo);
- configurar o login da equipe;
- publicar o painel com acesso só por login;
- cadastrar as chaves como *secrets*.

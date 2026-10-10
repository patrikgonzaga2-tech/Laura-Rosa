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

## Etapa A: Telegram (a principal fonte e a mais simples de automatizar)
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
**Decisão atual:** o painel só **lê e organiza**, não responde. Por isso a **exportação manual** é o caminho recomendado para começar. É oficial, gratuita e não arrisca o número.

| Cenário | É oficial? | O que dá para fazer |
|---|---|---|
| App do WhatsApp no celular (uso atual) | Sim | Não há API para ler conversas. Exporte as conversas que trouxeram dúvidas, relatos ou depoimentos ("Exportar conversa → Sem mídia") e importe no painel, por exemplo uma vez por semana |
| WhatsApp Business Platform (Cloud API), direto ou por provedor oficial | Sim | Coleta automática das mensagens novas. Só vale a pena se o volume tornar a exportação manual pesada demais. Exige o app **WhatsApp Business**, empresa verificada na Meta e, para manter o app no celular junto, um provedor com "coexistência" |
| Ferramentas que conectam pelo QR code do WhatsApp Web | **Não** | **Não usar.** Podem bloquear o número e expõem as conversas |

**Limitações da exportação:**
- É feita conversa por conversa.
- Áudios não viram texto.
- Fotos de antes e depois entram pela aba "Antes e depois e resultados", só com autorização.

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

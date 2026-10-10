# Arquitetura

## O que já existe (etapa 1: protótipo)

```
Navegador (index.html)
 ├─ Dados fictícios (gerados no próprio navegador, sempre identificados)
 ├─ Importação manual: .txt do WhatsApp, .json do Telegram, .csv
 │    └─ lidos só na memória da aba, nunca gravados nem enviados
 ├─ Classificação automática por palavras-chave → sempre "sugestão", revisada por pessoa
 ├─ Minimização: textos sem telefone, e-mail, @, CPF e sobrenomes conhecidos
 └─ Permissões simuladas (Leitura, Suporte, Exportação, Administração)
```

- **Sem servidor, sem banco e sem login real.** Serve para validar telas, categorias e fluxo de trabalho.
- **Nada sensível vai para o armazenamento do navegador** (sem `localStorage` ou IndexedDB). Ao recarregar, tudo volta ao exemplo.
- **Dados fictícios e importados ficam em conjuntos separados** e nunca se misturam. Existe um seletor no topo.

## Proposta para a versão real (etapa 2 em diante, depende da sua aprovação)

```
                 ┌──────────── Painel (HTML/JS) ─────────────┐
 Equipe ──login──▶  hospedado em Vercel ou Cloudflare Pages    │
                 └───────────────┬────────────────────────────┘
                                 │ HTTPS + sessão do usuário
                 ┌───────────────▼────────────────────────────┐
                 │ Supabase (região São Paulo)                 │
                 │  • Auth: login por e-mail + 2 etapas        │
                 │  • Postgres com regras por função (RLS)     │
                 │      alunas (restrito: nome, telefone)      │
                 │      mensagens (código da aluna, texto)     │
                 │      autorizacoes, midias, auditoria        │
                 │  • Storage privado: originais / tratadas    │
                 │  • Edge Functions (chaves em "secrets")     │
                 └──────▲──────────────────▲──────────────────┘
                        │ webhook           │ webhook
             Telegram Bot API     WhatsApp Business Platform
              (grupo, bot admin)   (API oficial ou provedor)
                                         │
                       Google Drive (opcional, pastas privadas)
```

### Por que essa combinação
- **Supabase** reúne banco, login, arquivos privados e funções de servidor num lugar só. Tem região no Brasil e plano gratuito para testes.
- **As regras de acesso ficam no banco de dados (RLS)**, não só na tela. Quem tem função "Leitura" não recebe nome nem telefone, mesmo que tente acessar por fora do painel.
- **Chaves de API** (Telegram, WhatsApp, Google) ficam nos *secrets* das funções de servidor. Nunca ficam no HTML nem no GitHub.

### Proteção dos dados
- **Em trânsito:** HTTPS (TLS) em todas as conexões.
- **Em repouso:** banco e arquivos com criptografia do provedor (AES-256). Fotos em *bucket* privado, acessadas por links temporários e assinados.
- **Separação:**
  - A tabela de identificação (nome e contato) é restrita às funções Suporte e Administração.
  - Painéis e relatórios usam código e texto mascarado.
- **Auditoria:** uma tabela registra mudança de status, edição de classificação, autorização, exportação e visualização de contato.
- **Prazo de guarda (a definir com você):** sugestão inicial no `docs/PRIVACIDADE-LGPD.md`.
- **Correção e exclusão:** a função Administração pode corrigir ou apagar os dados de uma aluna. Cópias derivadas e relatórios gerados também são localizados pelo código dela.

### Custos estimados (confirmar antes de contratar)

| Item | Para testar | Em uso |
|---|---|---|
| Supabase | Grátis (o projeto pausa após 1 semana sem uso) | Plano Pro, cerca de US$ 25/mês |
| Hospedagem do painel | Cloudflare Pages grátis (permite uso comercial) | Grátis ou Vercel Pro, cerca de US$ 20/usuário/mês (o Vercel gratuito não permite uso comercial) |
| Telegram Bot API | Grátis | Grátis |
| WhatsApp Business Platform | Número de teste da Meta é grátis | Cobrança por mensagem-modelo enviada. Receber e responder dentro da janela de atendimento não costuma ser cobrado. Provedores podem cobrar mensalidade |
| Google Drive | Conta existente | Conforme o plano do Google Workspace |
| Classificação com IA (opcional) | — | Por uso. Exige avaliação de LGPD antes |

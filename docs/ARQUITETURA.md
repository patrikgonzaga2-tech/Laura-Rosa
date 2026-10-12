# Arquitetura

## O que existe hoje

```
Grupo do Telegram ──bot──▶ função painel-telegram ──▶ banco (Supabase, RLS fechado)
                                                        │
Equipe ──login──▶ painel (Vercel) ──funções com login──┘
 ├─ Função de cada pessoa vem do servidor (Administração, Edição, Exportação, Leitura)
 ├─ Classificação automática por palavras-chave → sugestão, revisada por pessoa (salva no servidor)
 ├─ Análises: objeções, tipos de resultado, perguntas repetidas, interação no grupo,
 │    sinais por aluna e sugestões de como ajudar mais → pauta de conteúdo
 └─ Minimização: sem telefone ou contato; primeiro nome só para Administração e Edição
```

- Não há dados fictícios nem importação de arquivos.
- No navegador fica só a chave de login, e só quando a pessoa marca "Manter conectado" (30 dias). Nenhum dado de aluna é guardado no navegador.

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
                 │      alunas (código + primeiro nome)        │
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
- **As regras de acesso ficam no banco de dados (RLS)**, não só na tela. Quem tem função "Leitura" não recebe nem o primeiro nome, mesmo que tente acessar por fora do painel.
- **O painel não responde alunas**, então não guarda telefone ou contato. Menos dado guardado = menos risco.
- **Chaves de API** (Telegram, WhatsApp, Google) ficam nos *secrets* das funções de servidor. Nunca ficam no HTML nem no GitHub.

### Proteção dos dados
- **Em trânsito:** HTTPS (TLS) em todas as conexões.
- **Em repouso:** banco e arquivos com criptografia do provedor (AES-256). Fotos em *bucket* privado, acessadas por links temporários e assinados.
- **Separação:** painéis usam código (e primeiro nome só para quem edita). Relatórios não têm identificação.
- **Auditoria:** uma tabela registra edição de classificação, autorização, cópias tratadas, importação e exportação.
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

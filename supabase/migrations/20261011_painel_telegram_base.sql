-- Painel de acompanhamento das alunas: tabelas separadas (prefixo painel_).
-- Aplicada em 11/10/2026 no projeto Supabase "Corpo Feliz – CRM e Ideias".
-- Todas com RLS ligado e sem políticas: só o servidor (service_role) lê e grava.

create table if not exists public.painel_config (
  chave text primary key,
  valor text not null,
  criado_em timestamptz not null default now()
);
comment on table public.painel_config is 'Painel: chaves internas geradas no próprio banco (segredo do webhook, sal de pseudonimização). Só o servidor acessa.';

insert into public.painel_config (chave, valor) values
  ('tg_webhook_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')),
  ('hash_salt', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (chave) do nothing;

create table if not exists public.painel_chats (
  chat_id text primary key,
  origem text not null default 'telegram',
  titulo text,
  tipo text,
  permitido boolean not null default false,
  admins_ref text[] not null default '{}',
  admins_atualizado_em timestamptz,
  bot_status text,
  primeira_vez_em timestamptz not null default now(),
  ultima_msg_em timestamptz
);
comment on table public.painel_chats is 'Painel: grupos onde o bot está. Mensagens só são guardadas quando permitido = true (liberação manual).';

create table if not exists public.painel_mensagens (
  id bigint generated always as identity primary key,
  origem text not null check (origem in ('telegram', 'whatsapp', 'importacao')),
  chat_id text not null,
  mensagem_id text not null,
  data timestamptz not null,
  autor_ref text,
  autor_nome text,
  autor_equipe boolean not null default false,
  texto text,
  responde_a text,
  tem_midia boolean not null default false,
  tipo_midia text,
  midia_ref text,
  editada boolean not null default false,
  recebido_em timestamptz not null default now(),
  unique (origem, chat_id, mensagem_id)
);
comment on table public.painel_mensagens is 'Painel: mensagens dos grupos liberados. Guarda só o primeiro nome e um código pseudônimo do autor; não guarda telefone, @ nem sobrenome. Fotos ficam só como referência (midia_ref), sem download.';
create index if not exists painel_mensagens_data_idx on public.painel_mensagens (data desc);
create index if not exists painel_mensagens_chat_data_idx on public.painel_mensagens (chat_id, data);

create table if not exists public.painel_eventos (
  id bigint generated always as identity primary key,
  tipo text not null,
  detalhe text,
  criado_em timestamptz not null default now()
);
comment on table public.painel_eventos is 'Painel: registro técnico (configuração, grupos novos, erros). Sem conteúdo de mensagens.';

alter table public.painel_config enable row level security;
alter table public.painel_chats enable row level security;
alter table public.painel_mensagens enable row level security;
alter table public.painel_eventos enable row level security;

revoke all on table public.painel_config, public.painel_chats, public.painel_mensagens, public.painel_eventos from anon, authenticated;

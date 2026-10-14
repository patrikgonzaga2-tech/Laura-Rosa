-- Painel: análises feitas pela IA (Claude) a partir das mensagens dos últimos dias.
-- A IA recebe só o texto, com cada aluna trocada por um código ("aluna 7"). Sem nome, telefone ou e-mail.
-- Só as funções do servidor leem e gravam (RLS ligado, sem regras de acesso).
create table if not exists public.painel_ia (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  inicio timestamptz not null,
  fim timestamptz not null,
  mensagens int not null default 0,
  modelo text,
  resultado jsonb not null,
  tokens_entrada int,
  tokens_saida int,
  pedido_por text
);
comment on table public.painel_ia is 'Painel: ideias de conteúdo, dúvidas, provas e alertas gerados pela IA. Sem dados pessoais.';
create index if not exists painel_ia_criado_idx on public.painel_ia (criado_em desc);
alter table public.painel_ia enable row level security;

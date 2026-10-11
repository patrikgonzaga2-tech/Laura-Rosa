-- Painel de acompanhamento: login, usuários e leitura protegida.
-- Quem pode entrar fica em painel_usuarios. A ligação com o login é feita pelo user_id,
-- gravado só pela função painel-usuarios (convite). Nada aqui é acessível sem login,
-- e as tabelas continuam sem acesso direto: tudo passa pelas funções abaixo.

create table if not exists public.painel_usuarios (
  email text primary key check (email = lower(email) and position('@' in email) > 1),
  user_id uuid unique references auth.users(id) on delete set null,
  nome text,
  funcao text not null default 'leitura' check (funcao in ('admin', 'edicao', 'exportacao', 'leitura')),
  paineis text[] not null default array['visao','dia','dores','resultados','ideias','prints','ajuda','mensagens','importar','relatorios'],
  ativo boolean not null default true,
  convidado_em timestamptz,
  convidado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.painel_revisoes (
  mensagem_id bigint primary key references public.painel_mensagens(id) on delete cascade,
  tipo text,
  tema text,
  revisado boolean not null default false,
  aut_status text check (aut_status in ('nao_solicitada', 'solicitada', 'uso_interno', 'divulgacao', 'negada')),
  aut_por text,
  aut_em timestamptz,
  por text,
  em timestamptz not null default now()
);

alter table public.painel_eventos add column if not exists usuario text;

alter table public.painel_usuarios enable row level security;
alter table public.painel_revisoes enable row level security;
revoke all on public.painel_usuarios from anon, authenticated;
revoke all on public.painel_revisoes from anon, authenticated;

insert into public.painel_usuarios (email, funcao) values
  ('laurafsrosa@gmail.com', 'admin'),
  ('patrikgonzaga2@gmail.com', 'admin')
on conflict (email) do nothing;

-- Usuário do painel que está logado (null se não tiver acesso ou estiver desativado).
create or replace function public.painel_quem()
returns public.painel_usuarios
language sql stable security definer set search_path = public
as $$
  select u.* from public.painel_usuarios u
  where u.ativo and u.user_id is not null and u.user_id = auth.uid()
$$;

create or replace function public.painel_eu()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select case when q.email is null then null else
    jsonb_build_object('email', q.email, 'nome', q.nome, 'funcao', q.funcao, 'paineis', to_jsonb(q.paineis)) end
  from (select (public.painel_quem()).*) q
$$;

-- Mensagens dos grupos liberados. O primeiro nome só vai para Administração e Edição.
create or replace function public.painel_mensagens_ler(p_dias int default 60)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  q public.painel_usuarios;
  ver_nome boolean;
begin
  q := public.painel_quem();
  if q.email is null then raise exception 'sem acesso' using errcode = '42501'; end if;
  ver_nome := q.funcao in ('admin', 'edicao');
  return jsonb_build_object(
    'agora', now(),
    'mensagens', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'origem', m.origem, 'chat', m.chat_id, 'grupo', c.titulo, 'msg', m.mensagem_id,
        'data', m.data, 'autor', m.autor_ref, 'nome', case when ver_nome then m.autor_nome end,
        'equipe', m.autor_equipe, 'texto', m.texto, 'responde', m.responde_a,
        'midia', m.tipo_midia, 'editada', m.editada,
        'rev', case when r.mensagem_id is null then null else jsonb_build_object(
          'tipo', r.tipo, 'tema', r.tema, 'revisado', r.revisado,
          'aut', r.aut_status, 'aut_por', r.aut_por, 'aut_em', r.aut_em) end
      ) order by m.data)
      from public.painel_mensagens m
      join public.painel_chats c on c.chat_id = m.chat_id and c.permitido
      left join public.painel_revisoes r on r.mensagem_id = m.id
      where m.data >= now() - make_interval(days => greatest(1, least(coalesce(p_dias, 60), 400)))
    ), '[]'::jsonb)
  );
end
$$;

create or replace function public.painel_revisar(p_id bigint, p_tipo text, p_tema text)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare q public.painel_usuarios;
begin
  q := public.painel_quem();
  if q.email is null or q.funcao not in ('admin', 'edicao') then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_tipo not in ('duvida', 'queixa', 'dificuldade', 'depoimento', 'evolucao', 'outro') then raise exception 'tipo inválido'; end if;
  insert into public.painel_revisoes (mensagem_id, tipo, tema, revisado, por, em)
  values (p_id, p_tipo, left(p_tema, 80), true, q.email, now())
  on conflict (mensagem_id) do update set tipo = excluded.tipo, tema = excluded.tema, revisado = true, por = excluded.por, em = now();
  insert into public.painel_eventos (tipo, detalhe, usuario) values ('revisao', 'Msg ' || p_id || ': ' || p_tipo || ' / ' || left(p_tema, 80), q.email);
end
$$;

create or replace function public.painel_autorizar(p_id bigint, p_status text, p_por text)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare q public.painel_usuarios;
begin
  q := public.painel_quem();
  if q.email is null or q.funcao not in ('admin', 'edicao') then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_status in ('uso_interno', 'divulgacao') and coalesce(trim(p_por), '') = '' then raise exception 'informe quem confirmou'; end if;
  insert into public.painel_revisoes (mensagem_id, aut_status, aut_por, aut_em, por, em)
  values (p_id, p_status, nullif(left(trim(p_por), 80), ''), now(), q.email, now())
  on conflict (mensagem_id) do update set aut_status = excluded.aut_status, aut_por = excluded.aut_por, aut_em = now(), por = excluded.por, em = now();
  insert into public.painel_eventos (tipo, detalhe, usuario) values ('autorizacao', 'Msg ' || p_id || ': ' || p_status || coalesce(' (confirmado por ' || nullif(trim(p_por), '') || ')', ''), q.email);
end
$$;

-- Registro de ações (só Administração).
create or replace function public.painel_registro(p_limite int default 200)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare q public.painel_usuarios;
begin
  q := public.painel_quem();
  if q.email is null or q.funcao <> 'admin' then raise exception 'sem permissão' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('quando', e.criado_em, 'tipo', e.tipo, 'detalhe', e.detalhe, 'usuario', e.usuario) order by e.id desc)
    from (select * from public.painel_eventos order by id desc limit greatest(1, least(p_limite, 1000))) e), '[]'::jsonb);
end
$$;

revoke all on function public.painel_quem() from public, anon, authenticated;
revoke all on function public.painel_eu() from public, anon;
revoke all on function public.painel_mensagens_ler(int) from public, anon;
revoke all on function public.painel_revisar(bigint, text, text) from public, anon;
revoke all on function public.painel_autorizar(bigint, text, text) from public, anon;
revoke all on function public.painel_registro(int) from public, anon;
grant execute on function public.painel_eu() to authenticated;
grant execute on function public.painel_mensagens_ler(int) to authenticated;
grant execute on function public.painel_revisar(bigint, text, text) to authenticated;
grant execute on function public.painel_autorizar(bigint, text, text) to authenticated;
grant execute on function public.painel_registro(int) to authenticated;

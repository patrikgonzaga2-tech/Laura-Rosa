-- Senha inicial definida pela Administração (padrão nome + 1234) e troca obrigatória no primeiro acesso.
alter table public.painel_usuarios add column if not exists trocar_senha boolean not null default false;
alter table public.painel_usuarios add column if not exists senha_inicial_hash text;

-- Só quem já trocou a senha inicial acessa dados.
create or replace function public.painel_quem()
returns public.painel_usuarios
language sql stable security definer set search_path = public
as $$
  select u.* from public.painel_usuarios u
  where u.ativo and not u.trocar_senha and u.user_id is not null and u.user_id = auth.uid()
$$;

-- Quem sou eu (inclusive se ainda precisa trocar a senha inicial).
create or replace function public.painel_eu()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object('email', u.email, 'nome', u.nome, 'funcao', u.funcao, 'paineis', to_jsonb(u.paineis), 'trocar_senha', u.trocar_senha)
  from public.painel_usuarios u
  where u.ativo and u.user_id is not null and u.user_id = auth.uid()
$$;

-- Chamada pela função painel-usuarios logo depois de definir a senha inicial (só service_role).
create or replace function public.painel_marcar_senha_inicial(p_user uuid)
returns void
language sql volatile security definer set search_path = public, auth
as $$
  update public.painel_usuarios u
     set trocar_senha = true,
         senha_inicial_hash = (select a.encrypted_password from auth.users a where a.id = p_user),
         atualizado_em = now()
   where u.user_id = p_user
$$;

-- A pessoa avisa que trocou a senha; o servidor confere que ela é diferente da inicial.
create or replace function public.painel_senha_trocada()
returns boolean
language plpgsql volatile security definer set search_path = public, auth
as $$
declare ok boolean;
begin
  select coalesce(a.encrypted_password, '') <> coalesce(u.senha_inicial_hash, '') into ok
    from public.painel_usuarios u join auth.users a on a.id = u.user_id
   where u.user_id = auth.uid() and u.ativo;
  if coalesce(ok, false) then
    update public.painel_usuarios set trocar_senha = false, senha_inicial_hash = null, atualizado_em = now() where user_id = auth.uid();
    insert into public.painel_eventos (tipo, detalhe, usuario)
      select 'senha_trocada', 'Trocou a senha', email from public.painel_usuarios where user_id = auth.uid();
  end if;
  return coalesce(ok, false);
end
$$;

revoke all on function public.painel_marcar_senha_inicial(uuid) from public, anon, authenticated;
grant execute on function public.painel_marcar_senha_inicial(uuid) to service_role;
revoke all on function public.painel_senha_trocada() from public, anon;
grant execute on function public.painel_senha_trocada() to authenticated;
revoke all on function public.painel_eu() from public, anon;
grant execute on function public.painel_eu() to authenticated;

update public.painel_usuarios set nome = 'Laura' where email = 'laurafsrosa@gmail.com' and nome is null;
update public.painel_usuarios set nome = 'Patrick' where email = 'patrikgonzaga2@gmail.com' and nome is null;

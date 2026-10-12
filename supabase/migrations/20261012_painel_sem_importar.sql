-- O painel não tem mais a tela "Importar dados": tira o painel da lista padrão e de quem já tinha.
alter table public.painel_usuarios alter column paineis set default array['visao','dia','dores','resultados','ideias','prints','ajuda','mensagens','relatorios'];
update public.painel_usuarios set paineis = array_remove(paineis, 'importar') where 'importar' = any(paineis);

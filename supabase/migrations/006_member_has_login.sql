-- Verifica se um e-mail já tem login criado (auth_user_id preenchido).
-- Usado pra avisar quem tenta "Criar conta" mas já tem acesso
-- automático (gerado a partir do WhatsApp no cadastro).

create or replace function public.member_has_login(p_email text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(
    select 1 from public.members
    where lower(email) = lower(p_email) and auth_user_id is not null
  );
$$;

grant execute on function public.member_has_login(text) to anon, authenticated;

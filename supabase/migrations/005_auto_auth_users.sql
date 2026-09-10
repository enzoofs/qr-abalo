-- Cria automaticamente o login (auth.users) de cada membro assim que
-- ele é cadastrado (manual ou por importação de planilha):
--   login = e-mail do membro
--   senha = últimos 4 dígitos do WhatsApp
-- Membro sem WhatsApp (ou com menos de 4 dígitos) não recebe login
-- automático e continua podendo usar "Criar conta" no app.
--
-- Obs.: a senha só é validada por tamanho mínimo quando a pessoa
-- TROCA a senha pelo app (aí o Supabase exige 6+ caracteres). A senha
-- inicial de 4 dígitos é inserida direto no banco, sem essa checagem.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.create_member_auth_user(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members;
  v_digits text;
  v_password text;
  v_user_id uuid;
  v_existing uuid;
begin
  select * into v_member from public.members where id = p_member_id;
  if v_member.id is null or v_member.auth_user_id is not null then
    return;
  end if;

  -- já existe um auth.users com esse e-mail? só vincula.
  select id into v_existing
  from auth.users
  where lower(email) = lower(v_member.email)
  limit 1;
  if v_existing is not null then
    update public.members set auth_user_id = v_existing where id = p_member_id;
    return;
  end if;

  v_digits := regexp_replace(coalesce(v_member.whatsapp, ''), '\D', '', 'g');
  if length(v_digits) < 4 then
    return; -- sem telefone suficiente pra gerar senha
  end if;
  v_password := right(v_digits, 4);

  v_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    lower(v_member.email),
    extensions.crypt(v_password, extensions.gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb
  );

  insert into auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    v_user_id::text,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', lower(v_member.email),
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  );

  update public.members set auth_user_id = v_user_id where id = p_member_id;
exception
  when others then
    raise warning 'create_member_auth_user falhou para %: %', v_member.email, sqlerrm;
end;
$$;

create or replace function public.member_auto_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_member_auth_user(new.id);
  return new;
end;
$$;

drop trigger if exists on_member_created_auth on public.members;
create trigger on_member_created_auth
  after insert on public.members
  for each row execute procedure public.member_auto_auth();

-- se o WhatsApp for preenchido depois (numa edição), tenta criar o login
drop trigger if exists on_member_whatsapp_added on public.members;
create trigger on_member_whatsapp_added
  after update of whatsapp on public.members
  for each row
  when (new.auth_user_id is null and new.whatsapp is distinct from old.whatsapp)
  execute procedure public.member_auto_auth();

-- backfill: membros que já existem e ainda não têm login
do $$
declare r record;
begin
  for r in select id from public.members where auth_user_id is null loop
    perform public.create_member_auth_user(r.id);
  end loop;
end $$;

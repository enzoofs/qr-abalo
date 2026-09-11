-- Corrige "Database error querying schema" no login: alguns campos de
-- texto internos do auth.users (usados pelo próprio Supabase Auth,
-- não pelo nosso app) ficaram NULL nas contas criadas pela nossa
-- função, porque não foram preenchidos no INSERT — e esse projeto
-- não tem default '' pra eles. O Supabase Auth não aceita NULL nesses
-- campos e quebra com um erro genérico ao tentar logar.

-- corrige as contas já quebradas
update auth.users
set
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change = coalesce(phone_change, ''),
  phone_change_token = coalesce(phone_change_token, ''),
  reauthentication_token = coalesce(reauthentication_token, '')
where confirmation_token is null
   or recovery_token is null
   or email_change_token_new is null
   or email_change is null
   or email_change_token_current is null
   or phone_change is null
   or phone_change_token is null
   or reauthentication_token is null;

-- e passa a preencher esses campos com '' em toda conta nova
create or replace function public.create_member_auth_user(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members;
  v_password text;
  v_user_id uuid;
  v_existing uuid;
begin
  select * into v_member from public.members where id = p_member_id;
  if v_member.id is null or v_member.auth_user_id is not null then
    return;
  end if;

  select id into v_existing
  from auth.users
  where lower(email) = lower(v_member.email)
  limit 1;
  if v_existing is not null then
    update public.members set auth_user_id = v_existing where id = p_member_id;
    return;
  end if;

  v_password := public.member_password_from_phone(v_member.whatsapp);
  if v_password is null then
    return;
  end if;

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
    raw_user_meta_data,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token
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
    '{}'::jsonb,
    '', '', '', '', '', '', '', ''
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

  update public.members
  set auth_user_id = v_user_id, auth_auto_password = true
  where id = p_member_id;
exception
  when others then
    raise warning 'create_member_auth_user falhou para %: %', v_member.email, sqlerrm;
end;
$$;

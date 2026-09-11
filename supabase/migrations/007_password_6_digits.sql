-- O Supabase não permite senha com menos de 6 caracteres em NENHUM
-- fluxo (nem login) — por isso a senha de 4 dígitos nunca funcionou
-- de verdade. Troca o esquema pra 6 últimos dígitos do WhatsApp
-- (praticamente todo número tem 6+ dígitos, então na prática o
-- comportamento pro cliente é o mesmo).
--
-- Também corrige a senha de quem já tinha login criado com o esquema
-- velho (4 dígitos) — só pra membros cujo login foi criado
-- automaticamente (marcado por members.auth_auto_password). Contas
-- criadas manualmente (ex.: a diretoria, via "Criar conta") NUNCA
-- são tocadas.

alter table public.members
  add column if not exists auth_auto_password boolean not null default false;

-- assume que, até agora, todo membro comum (não diretor) com login já
-- criado veio do gatilho automático (senha de 4 dígitos) — se algum
-- membro já tinha trocado a própria senha manualmente, avise pra
-- gente ajustar antes de rodar isso de novo.
update public.members
set auth_auto_password = true
where role = 'member' and auth_user_id is not null;

create or replace function public.member_password_from_phone(p_whatsapp text)
returns text
language sql
immutable
as $$
  select case
    when length(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g')) >= 6
      then right(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), 6)
    else null
  end;
$$;

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
    return; -- sem telefone suficiente pra gerar senha
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

  update public.members
  set auth_user_id = v_user_id, auth_auto_password = true
  where id = p_member_id;
exception
  when others then
    raise warning 'create_member_auth_user falhou para %: %', v_member.email, sqlerrm;
end;
$$;

-- corrige a senha de quem já tem login mas ainda está no esquema
-- velho (ou teve o WhatsApp alterado depois)
create or replace function public.reset_member_password_from_phone(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members;
  v_password text;
begin
  select * into v_member from public.members where id = p_member_id;
  if v_member.id is null or v_member.auth_user_id is null then
    return;
  end if;

  v_password := public.member_password_from_phone(v_member.whatsapp);
  if v_password is null then
    return;
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
      updated_at = now()
  where id = v_member.auth_user_id;
exception
  when others then
    raise warning 'reset_member_password_from_phone falhou para %: %', v_member.email, sqlerrm;
end;
$$;

-- se a pessoa trocar a própria senha pelo app, marca que não é mais
-- a senha automática — assim nenhum reset futuro mexe nela de novo
create or replace function public.mark_password_changed()
returns void
language sql
security definer
set search_path = public
as $$
  update public.members set auth_auto_password = false where auth_user_id = auth.uid();
$$;

grant execute on function public.mark_password_changed() to authenticated;

create or replace function public.member_auto_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.auth_user_id is null then
    perform public.create_member_auth_user(new.id);
  elsif new.auth_auto_password then
    perform public.reset_member_password_from_phone(new.id);
  end if;
  return new;
end;
$$;

-- corrige agora a senha de todo mundo que estava no esquema de 4 dígitos
do $$
declare r record;
begin
  for r in select id from public.members where auth_auto_password = true loop
    perform public.reset_member_password_from_phone(r.id);
  end loop;
end $$;

-- tenta criar login de quem ainda não tinha (agora com 6 dígitos)
do $$
declare r record;
begin
  for r in select id from public.members where auth_user_id is null loop
    perform public.create_member_auth_user(r.id);
  end loop;
end $$;

-- Abalô-Caxi — schema inicial
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor > New query)

-- =============================================================
-- Tabelas
-- =============================================================

create table public.members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null unique,
  email text not null unique,
  full_name text not null,
  whatsapp text,
  role text not null default 'member' check (role in ('member', 'director')),
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters int not null default 150 check (radius_meters > 0),
  qr_token uuid not null unique default gen_random_uuid(),
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.attendances (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  distance_meters int,
  source text not null default 'self' check (source in ('self', 'manual')),
  unique (event_id, member_id)
);

create index events_qr_token_idx on public.events(qr_token);
create index events_starts_at_idx on public.events(starts_at);
create index attendances_event_id_idx on public.attendances(event_id);
create index attendances_member_id_idx on public.attendances(member_id);

-- =============================================================
-- Helpers
-- =============================================================

-- Vincula um auth.users novo a um member pré-cadastrado (pelo email).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.members
  set auth_user_id = new.id
  where lower(email) = lower(new.email) and auth_user_id is null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Distância entre dois pontos em metros (Haversine).
create or replace function public.distance_meters(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable as $$
  select 6371000 * 2 * asin(sqrt(
    power(sin(radians((lat2 - lat1) / 2)), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians((lng2 - lng1) / 2)), 2)
  ));
$$;

-- Verifica se um e-mail está na whitelist (pode ser chamada por anon).
create or replace function public.is_email_whitelisted(p_email text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(select 1 from public.members where lower(email) = lower(p_email));
$$;

grant execute on function public.is_email_whitelisted(text) to anon, authenticated;

-- Verifica se o usuário autenticado atual é diretor.
create or replace function public.is_director()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(
    select 1 from public.members
    where auth_user_id = auth.uid() and role = 'director'
  );
$$;

-- =============================================================
-- Check-in function (segurança no servidor)
-- =============================================================
-- Valida QR + janela de horário + distância + duplicata e insere
-- a presença. RLS não permite INSERT direto em attendances pelo membro;
-- só via essa função (security definer).
create or replace function public.check_in(
  p_qr_token uuid,
  p_latitude double precision,
  p_longitude double precision
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events;
  v_member public.members;
  v_distance double precision;
  v_attendance_id uuid;
begin
  select * into v_member
  from public.members
  where auth_user_id = auth.uid();

  if v_member.id is null then
    return json_build_object('ok', false, 'error', 'not_whitelisted');
  end if;

  select * into v_event
  from public.events
  where qr_token = p_qr_token;

  if v_event.id is null then
    return json_build_object('ok', false, 'error', 'invalid_qr');
  end if;

  if now() < v_event.starts_at then
    return json_build_object('ok', false, 'error', 'too_early');
  end if;

  if now() > v_event.ends_at then
    return json_build_object('ok', false, 'error', 'too_late');
  end if;

  v_distance := public.distance_meters(
    v_event.latitude, v_event.longitude,
    p_latitude, p_longitude
  );

  if v_distance > v_event.radius_meters then
    return json_build_object(
      'ok', false,
      'error', 'too_far',
      'distance_meters', round(v_distance)
    );
  end if;

  insert into public.attendances (event_id, member_id, latitude, longitude, distance_meters, source)
  values (v_event.id, v_member.id, p_latitude, p_longitude, round(v_distance), 'self')
  on conflict (event_id, member_id) do nothing
  returning id into v_attendance_id;

  if v_attendance_id is null then
    return json_build_object('ok', false, 'error', 'already_checked_in');
  end if;

  return json_build_object(
    'ok', true,
    'attendance_id', v_attendance_id,
    'event_name', v_event.name,
    'distance_meters', round(v_distance)
  );
end;
$$;

-- =============================================================
-- RLS
-- =============================================================

alter table public.members enable row level security;
alter table public.events enable row level security;
alter table public.attendances enable row level security;

-- members
create policy "members read own" on public.members
  for select using (auth_user_id = auth.uid());

create policy "directors read all members" on public.members
  for select using (public.is_director());

create policy "directors manage members" on public.members
  for all using (public.is_director()) with check (public.is_director());

-- events
create policy "authenticated read events" on public.events
  for select to authenticated using (true);

create policy "directors manage events" on public.events
  for all using (public.is_director()) with check (public.is_director());

-- attendances
create policy "members read own attendances" on public.attendances
  for select using (
    member_id in (select id from public.members where auth_user_id = auth.uid())
  );

create policy "directors read all attendances" on public.attendances
  for select using (public.is_director());

create policy "directors insert manual attendances" on public.attendances
  for insert with check (public.is_director() and source = 'manual');

create policy "directors delete attendances" on public.attendances
  for delete using (public.is_director());

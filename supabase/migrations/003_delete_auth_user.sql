-- Quando um diretor remove um membro da lista, apaga também o login (auth.users).
-- Roda como security definer (dono = postgres), que tem permissão sobre auth.users.

create or replace function public.handle_member_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.auth_user_id is not null then
    delete from auth.users where id = old.auth_user_id;
  end if;
  return old;
end;
$$;

drop trigger if exists on_member_deleted on public.members;
create trigger on_member_deleted
  after delete on public.members
  for each row execute procedure public.handle_member_deleted();

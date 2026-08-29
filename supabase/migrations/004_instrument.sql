-- Adiciona o instrumento tocado por cada membro.
-- Roda no SQL Editor depois das migrations anteriores.

alter table public.members
  add column instrument text;

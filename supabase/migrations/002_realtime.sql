-- Habilita Realtime na tabela attendances pra o painel do diretor atualizar
-- ao vivo enquanto a galera vai chegando.
-- Roda no SQL Editor depois do 001_init.sql.
alter publication supabase_realtime add table public.attendances;

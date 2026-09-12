-- Troca o instrumento "Tamborim" por "Repique" na lista da bateria.
-- Atualiza também quem já estava cadastrado com Tamborim.

update public.members
set instrument = 'Repique'
where instrument = 'Tamborim';

-- Accesos Bellavista v2.2 · base de datos en Supabase
-- Ejecutar una sola vez en Supabase > SQL Editor.

create table if not exists public.ab_db (
id text primary key,
data jsonb not null,
rev integer not null default 1,
mensaje text,
updated_by text,
updated_at timestamptz not null default now(),
constraint ab_db_formato check (jsonb_typeof(data) = 'object' and data->>'v' = '2')
);

create table if not exists public.ab_db_versions (
vid bigserial primary key,
db_id text not null,
rev integer not null,
data jsonb not null,
mensaje text,
operador text,
created_at timestamptz not null default now()
);

create or replace function public.ab_db_guardar_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
insert into public.ab_db_versions(db_id, rev, data, mensaje, operador) values (new.id, new.rev, new.data, new.mensaje, new.updated_by);
return new;
end $$;

drop trigger if exists ab_db_version on public.ab_db;
create trigger ab_db_version after insert or update on public.ab_db for each row execute function public.ab_db_guardar_version();

alter table public.ab_db enable row level security;
alter table public.ab_db_versions enable row level security;

drop policy if exists ab_db_leer on public.ab_db;
drop policy if exists ab_db_crear on public.ab_db;
drop policy if exists ab_db_actualizar on public.ab_db;
create policy ab_db_leer on public.ab_db for select to anon using (id = 'main');
create policy ab_db_crear on public.ab_db for insert to anon with check (id = 'main');
create policy ab_db_actualizar on public.ab_db for update to anon using (id = 'main') with check (id = 'main');

-- Sin políticas para anon en ab_db_versions: el historial no se puede leer ni borrar desde el sitio.
-- Tampoco hay política de DELETE en ab_db.
revoke all on public.ab_db_versions from anon, authenticated;
grant select, insert, update on public.ab_db to anon;

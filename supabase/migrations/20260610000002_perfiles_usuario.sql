-- Perfil de usuario que el frontend espera (login). Un solo usuario admin local.
create table perfiles_usuario (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text not null,
  rol text not null default 'administrador'
    check (rol in ('operador','supervisor','auditor','administrador')),
  activo boolean not null default true,
  ultimo_acceso timestamptz
);

alter table perfiles_usuario enable row level security;
create policy todo_perfiles on perfiles_usuario for all using (true) with check (true);

insert into perfiles_usuario (id, nombre_completo, rol)
select id, 'Gaston', 'administrador' from auth.users where email = 'gaston@local.cultivo';

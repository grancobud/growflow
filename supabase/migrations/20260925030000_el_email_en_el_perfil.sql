-- El mail en el perfil. Aplicada en la base de GrowFlow el 25/09/2026.
--
-- El mail vive en auth.users, que no se lee desde el navegador. La pantalla
-- O.N.G. > Usuarios (lib/usuarios.ts) y la Edge Function usuarios-invitar lo
-- leen de perfiles_usuario.email. Ese codigo vino de Aguara, pero la migracion
-- que crea la columna nunca se aplico aca: la pantalla tiraba «column
-- perfiles_usuario.email does not exist» y no listaba a nadie.
--
-- Solo agrega: la columna, el mail de cada perfil existente (desde auth.users)
-- y que las cuentas nuevas lo copien al darse de alta.
alter table public.perfiles_usuario add column if not exists email text;

update public.perfiles_usuario p
   set email = lower(u.email)
  from auth.users u
 where u.id = p.id and p.email is null and u.email is not null;

create or replace function public.crear_perfil_al_alta()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  es_el_primero boolean;
begin
  select not exists (select 1 from public.perfiles_usuario) into es_el_primero;

  insert into public.perfiles_usuario (id, nombre_completo, rol, activo, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre_completo', split_part(new.email, '@', 1)),
    case when es_el_primero then 'administrador' else 'auditor' end,
    es_el_primero,
    lower(new.email)
  )
  on conflict (id) do update set email = coalesce(public.perfiles_usuario.email, excluded.email);

  return new;
end $function$;

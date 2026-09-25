-- Historia clinica del paciente: las tablas que la base ya tiene y el repo no.
--
-- POR QUE EXISTE: el commit 7788cb2 («Historia clinica del paciente, portada de
-- Chaco») creo `pacientes_clinica`, `evolucion_clinica` y los campos del
-- director medico en `ong_entidad` directamente contra la base, sin guardar la
-- migracion como archivo. La base de GrowFlow quedo bien; el repo quedo sin con
-- que reconstruirla. Solo `instalacion-nueva/esquema-completo.sql` las tenia.
--
-- ES IDEMPOTENTE: sobre la base de GrowFlow, que ya tiene todo esto, no cambia
-- nada (create/add if not exists, y las policies se recrean iguales). Copia
-- exacta de lo que dice esquema-completo.sql, que se genero del esquema real.
--
-- Va despues de 20260924200000 porque usa puede_ver_clinico() y es_admin(), que
-- se crean ahi. (La migracion 20260916233000 ya tocaba evolucion_clinica: el
-- historial de migraciones no se puede re-correr de cero en orden. Para una
-- instalacion nueva se usa esquema-completo.sql, ver ARRANQUE.md.)

-- ═══ Ficha clinica: 1 a 1 con el paciente ═══
create table if not exists public.pacientes_clinica (
  paciente_id uuid not null,
  antecedentes text,
  medicacion_concomitante text,
  alergias text,
  contraindicaciones text,
  objetivo_terapeutico text,
  notas_medico text,
  actualizado_en timestamp with time zone default now() not null,
  actualizado_por text,
  constraint pacientes_clinica_pkey primary key (paciente_id),
  constraint pacientes_clinica_paciente_id_fkey foreign key (paciente_id)
    references public.pacientes(id) on delete cascade
);

-- ═══ Evolucion: entradas fechadas del profesional, N a 1 ═══
create table if not exists public.evolucion_clinica (
  id uuid default gen_random_uuid() not null,
  paciente_id uuid not null,
  fecha date default ((now() at time zone 'America/Argentina/Buenos_Aires'))::date not null,
  tipo text default 'evolucion' not null,
  texto text not null,
  firmado_por text,
  matricula text,
  creado_en timestamp with time zone default now() not null,
  constraint evolucion_clinica_pkey primary key (id),
  constraint evolucion_clinica_paciente_id_fkey foreign key (paciente_id)
    references public.pacientes(id) on delete cascade,
  constraint evolucion_tipo_check check (tipo = any (array[
    'evolucion', 'consulta', 'ajuste_dosis', 'alta', 'suspension', 'nota']))
);

-- ═══ RLS: igual que ong_feedback_clinico, cerradas con puede_ver_clinico() ═══
alter table public.pacientes_clinica enable row level security;
alter table public.evolucion_clinica enable row level security;

drop policy if exists clinica_ver on public.pacientes_clinica;
drop policy if exists clinica_escribir on public.pacientes_clinica;
drop policy if exists clinica_actualizar on public.pacientes_clinica;
drop policy if exists clinica_borrar on public.pacientes_clinica;
create policy clinica_ver on public.pacientes_clinica for select using (public.puede_ver_clinico());
create policy clinica_escribir on public.pacientes_clinica for insert with check (public.puede_ver_clinico());
create policy clinica_actualizar on public.pacientes_clinica for update
  using (public.puede_ver_clinico()) with check (public.puede_ver_clinico());
create policy clinica_borrar on public.pacientes_clinica for delete using (public.es_admin());

drop policy if exists evolucion_ver on public.evolucion_clinica;
drop policy if exists evolucion_escribir on public.evolucion_clinica;
drop policy if exists evolucion_actualizar on public.evolucion_clinica;
drop policy if exists evolucion_borrar on public.evolucion_clinica;
create policy evolucion_ver on public.evolucion_clinica for select using (public.puede_ver_clinico());
create policy evolucion_escribir on public.evolucion_clinica for insert with check (public.puede_ver_clinico());
create policy evolucion_actualizar on public.evolucion_clinica for update
  using (public.puede_ver_clinico()) with check (public.puede_ver_clinico());
create policy evolucion_borrar on public.evolucion_clinica for delete using (public.es_admin());

-- ═══ Director medico de la entidad (firma los informes de la Res. 1780/2025) ═══
alter table public.ong_entidad add column if not exists director_medico text;
alter table public.ong_entidad add column if not exists director_medico_matricula text;
alter table public.ong_entidad add column if not exists director_medico_dni text;
alter table public.ong_entidad add column if not exists director_medico_vence date;
alter table public.ong_entidad add column if not exists director_medico_refeps boolean;

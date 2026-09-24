-- Integracion: GrowFlow recibe todas las mejoras de Aguara / Panacea.
--
-- SOLO AGREGA. No borra ninguna tabla, columna ni fila:
--  * Se omite 20260919130000_sacar_tablas_de_modulos_ausentes (borraba las tablas
--    de nutrientes, instalacion y tableros, que en GrowFlow se usan).
--  * Se omiten los datos propios de otras instalaciones (lote "Proyecto Panacea",
--    acuerdos de aporte de dos pacientes de Aguara) y la normalizacion de
--    nombre_completo de pacientes: los nombres quedan como estan.
--  * Los backfills que quedan llenan columnas NUEVAS (riegos.ec desde ppm,
--    pacientes.apellido/nombres); ppm y nombre_completo no se tocan.
--
-- Probada entera contra una replica del esquema real de GrowFlow (PGlite) antes
-- de aplicarla.

-- ═══ Columnas que Panacea crea adentro de un create table que GrowFlow ya tenia ═══
alter table public.ong_caja add column if not exists pago_id uuid;
alter table public.ong_dispensas add column if not exists visita_id uuid;
alter table public.ong_entidad add column if not exists proveedor_propio text;
alter table public.ong_entidad add column if not exists modo_beta boolean default false not null;

-- ═══ de 20260818000000_funciones_de_rol.sql ═══
-- Las funciones de rol, que NINGUNA migración creaba.
--
-- ⚠️ POR QUÉ FALTABAN: el repo de origen tiene un archivo
-- `20260819_sistema_de_roles.sql` que es SOLO COMENTARIOS. Ahí está escrito,
-- con todas las letras, que las diez migraciones de roles «se aplicaron por
-- separado (ver historial de Supabase)»: se corrieron a mano contra la base y
-- nunca se guardaron como archivo. La base de esa instalación quedó bien, el
-- repo quedó sin con qué reconstruirla.
--
-- Resultado: una instalación nueva levantaba con las tablas de cultivo pero sin
-- `mi_rol()`, y como CASI TODAS las policies la llaman, ninguna se podía crear.
-- La base terminaba con un puñado de policies `using (true)` —abierta a
-- cualquiera con la publishable key— y eso NO se nota mirando la app: se entra,
-- se ve todo, funciona. Se nota el día que alguien de afuera lee el padrón.
--
-- Esto es el mismo pozo que ya había mordido a la tercera instalación. La regla
-- que deja: si un arreglo no está como ARCHIVO en `supabase/migrations`, para
-- la próxima instalación no existe.
--
-- Van primero las funciones y en un archivo aparte las policies, porque una
-- policy que llama a una función inexistente falla al crearse.

-- ───────────────────────────────────────────────────────────────────────────
-- El rol de quien está pidiendo
-- ───────────────────────────────────────────────────────────────────────────

-- ⚠️ Devuelve 'sin_perfil', no null, para todo usuario sin perfil o con el
-- perfil desactivado. Es lo que permite escribir las policies como
-- `mi_rol() <> all (array['sin_perfil','demo'])`: como el registro de Supabase
-- es abierto, un filtro `<> 'demo'` a secas deja entrar a cualquiera que se
-- cree una cuenta.
CREATE OR REPLACE FUNCTION public.mi_rol()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (select rol from public.perfiles_usuario where id = auth.uid() and activo is not false),
    'sin_perfil'
  );
$function$;
CREATE OR REPLACE FUNCTION public.es_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.mi_rol() in ('administrador', 'administrador_sistema');
$function$;
CREATE OR REPLACE FUNCTION public.puede_escribir()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.mi_rol() in ('administrador', 'cultivador', 'director_medico', 'administrativo');
$function$;
-- La ficha clínica: sólo administración y dirección médica.
CREATE OR REPLACE FUNCTION public.puede_ver_clinico()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.mi_rol() in ('administrador', 'administrador_sistema', 'director_medico');
$function$;
-- El padrón es más ancho que lo clínico: mostrador y administrativo necesitan
-- el NOMBRE de la persona para atenderla, sin ver su ficha médica.
CREATE OR REPLACE FUNCTION public.puede_ver_padron()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.puede_ver_clinico() or public.mi_rol() in ('administrativo', 'mostrador');
$function$;
CREATE OR REPLACE FUNCTION public.puede_ver_plata()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.mi_rol() in
    ('administrador', 'administrador_sistema', 'administrativo', 'auditor', 'mostrador');
$function$;
-- ───────────────────────────────────────────────────────────────────────────
-- Auxiliares
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.marcar_acceso()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.perfiles_usuario
  set ultimo_acceso = now()
  where id = auth.uid();
$function$;
CREATE OR REPLACE FUNCTION public.set_actualizado_en()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.actualizado_en := now();
  return new;
end $function$;
-- ───────────────────────────────────────────────────────────────────────────
-- Permisos
-- ───────────────────────────────────────────────────────────────────────────
--
-- ⚠️ REVOCAR SÓLO A `anon` NO ALCANZA: Postgres le da EXECUTE a PUBLIC por
-- defecto, así que una función recién creada queda abierta, no cerrada. Hay que
-- sacárselo a `public` explícitamente y después otorgarlo. Al agregar una
-- función nueva, repetir esto o el Security Advisor la vuelve a marcar.

do $$
declare f text;
begin
  foreach f in array array[
    'mi_rol()', 'es_admin()', 'puede_escribir()', 'puede_ver_clinico()',
    'puede_ver_padron()', 'puede_ver_plata()', 'marcar_acceso()',
    'set_actualizado_en()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;

-- ═══ de 20260818000100_tablas_ong.sql ═══
-- Las 19 tablas `ong_*` que ninguna migración creaba.
--
-- Mismo origen que las funciones de rol (ver 20260919120000): se crearon a mano
-- sobre la base de la primera instalación y nunca se escribieron como archivo.
-- El repo traía sólo cuatro de ellas —las agregadas después, en migraciones
-- posteriores— y las diecinueve de base faltaban.
--
-- Extraídas del esquema real de esa base, con sus claves, FKs y checks. Todo
-- `if not exists` / `if exists` para que sea seguro correrlo sobre una base que
-- ya tenga parte aplicada.
--
-- El ORDEN importa: `ong_libros` antes que `ong_actas` porque ésta la
-- referencia, y las FKs van todas al final por la misma razón (hay ciclos:
-- `ong_caja` apunta a `ong_dispensas` y `ong_documentos`, que apuntan de vuelta
-- a `ong_asociados`).

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Las tablas
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.ong_entidad (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  razon_social text,
  cuit text,
  jurisdiccion text,
  organismo_control text,
  sede_domicilio text,
  sede_localidad text,
  sede_provincia text,
  fecha_constitucion date,
  cierre_ejercicio_dia integer,
  cierre_ejercicio_mes integer,
  mandato_anios integer,
  mandato_desde date,
  reprocann_inscripcion date,
  reprocann_vencimiento date,
  tope_pacientes integer default 150,
  plantas_por_paciente integer default 9,
  tope_predios integer default 3,
  notas text,
  creado_en timestamp with time zone default now(),
  actualizado_en timestamp with time zone default now(),
  codigo_vinculacion text,
  objeto_cannabis boolean default false,
  objeto_social text,
  perfil_reprocann text default 'ONG vinculada a la Salud'::text,
  ultima_revision_libros date,
  rinde_esperado_planta_g numeric,
  director_tecnico text,
  director_tecnico_matricula text,
  proveedor_propio text,
  modo_beta boolean not null default false
);
create table if not exists public.ong_libros (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  tipo text not null,
  numero integer default 1,
  rubricado boolean default false,
  fecha_rubrica date,
  organismo text,
  digital boolean default false,
  folios_totales integer,
  folios_usados integer default 0,
  estado text default 'vigente'::text,
  notas text,
  creado_en timestamp with time zone default now()
);
create table if not exists public.ong_actas (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  tipo text not null,
  numero integer not null,
  fecha date not null,
  lugar text,
  hora_inicio text,
  hora_fin text,
  asistentes integer,
  quorum_ok boolean default true,
  segunda_convocatoria boolean default false,
  orden_del_dia jsonb default '[]'::jsonb,
  firmantes text,
  estado text default 'borrador'::text,
  libro_id uuid,
  folio integer,
  notas text,
  creado_en timestamp with time zone default now(),
  asistentes_nombres jsonb default '[]'::jsonb,
  quorum_requerido integer
);
create table if not exists public.ong_asociados (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  nombre text not null,
  dni text,
  categoria text,
  paciente_id uuid,
  fecha_alta date,
  acta_alta_id uuid,
  fecha_baja date,
  acta_baja_id uuid,
  activo boolean default true,
  fundador boolean default false,
  notas text,
  creado_en timestamp with time zone default now(),
  vinculado_reprocann boolean default false,
  fecha_vinculacion date,
  mandato_aceptado boolean default false,
  mandato_fecha date,
  legajo text,
  mandato_hora timestamp with time zone,
  ip_firma_mandato text,
  mandato_version text
);
create table if not exists public.ong_autoridades (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  nombre text not null,
  cargo text not null,
  organo text default 'Comisión Directiva'::text,
  desde date,
  hasta date,
  activo boolean default true,
  notas text,
  creado_en timestamp with time zone default now(),
  antecedentes_penales_ok boolean,
  cuit_activa boolean,
  reprocann_activo boolean,
  grupo_familiar text,
  fundador boolean default false
);
create table if not exists public.ong_categorias_socio (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  nombre text not null,
  requiere_reprocann boolean default false,
  con_voto boolean default true,
  cuota numeric,
  notas text,
  creado_en timestamp with time zone default now()
);
create table if not exists public.ong_cuotas (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  categoria text,
  valor numeric not null,
  vigente_desde date,
  acta_id uuid,
  notas text,
  creado_en timestamp with time zone default now(),
  tipo text default 'social'::text
);
create table if not exists public.ong_cuotas_emitidas (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  asociado_id uuid,
  periodo text not null,
  tipo text default 'social'::text,
  monto numeric not null,
  pagada boolean default false,
  fecha_pago date,
  medio text,
  notas text,
  creado_en timestamp with time zone default now()
);
create table if not exists public.ong_predios (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  nombre text not null,
  direccion text,
  localidad text,
  provincia text,
  municipio text,
  georreferenciado boolean default false,
  municipio_notificado boolean default false,
  activo boolean default true,
  notas text,
  creado_en timestamp with time zone default now()
);
create table if not exists public.ong_requisitos (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  clave text not null,
  titulo text not null,
  detalle text,
  cumplido boolean default false,
  vence date,
  responsable text,
  nota text,
  orden integer default 0,
  creado_en timestamp with time zone default now(),
  acreditacion text,
  acreditado boolean default false
);
create table if not exists public.ong_ddjj (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  periodo text not null,
  fecha_presentacion date,
  plantas_total integer,
  plantas_floracion integer,
  pacientes_vinculados integer,
  variedades text,
  presentada boolean not null default false,
  notas text,
  creado_en timestamp with time zone not null default now()
);
create table if not exists public.ong_lotes (
  id uuid not null default gen_random_uuid(),
  user_id uuid default auth.uid(),
  codigo text not null,
  producto text not null default 'flor'::text,
  genetica_id uuid,
  cosecha_id uuid,
  gramos_totales numeric not null,
  fecha_elaboracion date default ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date,
  thc_pct numeric,
  cbd_pct numeric,
  laboratorio text,
  fecha_analisis date,
  analisis_path text,
  aporte_por_gramo numeric,
  activo boolean not null default true,
  notas text,
  creado_en timestamp with time zone not null default now(),
  origen text not null default 'propio'::text,
  costo_por_gramo numeric,
  proveedor text,
  unidad text not null default 'g'::text
);
create table if not exists public.ong_visitas (
  id uuid not null default gen_random_uuid(),
  fecha date not null default ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date,
  hora time without time zone,
  paciente_id uuid,
  nombre_libre text,
  contacto text,
  motivo text not null,
  resultado text,
  atendio text,
  user_id uuid,
  notas text,
  creada_en timestamp with time zone not null default now(),
  origen text not null default 'registrada'::text
);
create table if not exists public.ong_dispensas (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  paciente_id uuid,
  fecha date not null default ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date,
  producto text default 'flor'::text,
  genetica_id uuid,
  gramos numeric not null,
  aporte numeric,
  modalidad text default 'retiro'::text,
  entregado_por text,
  con_receta boolean default false,
  notas text,
  creado_en timestamp with time zone default now(),
  recibo_numero integer,
  medio_pago text,
  pago_referencia text,
  lote_codigo text,
  unidad text not null default 'g'::text,
  aporte_desglose jsonb,
  visita_id uuid,
  tipo_movimiento text,
  aporte_esperado numeric
);
create table if not exists public.ong_documentos (
  id uuid not null default gen_random_uuid(),
  tipo text not null default 'emitido'::text,
  subtipo text,
  numero text,
  fecha date not null default ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date,
  descripcion text,
  monto numeric,
  proveedor text,
  categoria text,
  asociado_id uuid,
  paciente_id uuid,
  dispensa_id uuid,
  archivo_path text,
  archivo_nombre text,
  notas text,
  creado_en timestamp with time zone not null default now(),
  user_id uuid,
  lote_codigo text,
  notas_preview text
);
create table if not exists public.ong_caja (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  fecha date not null default ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date,
  tipo text not null default 'ingreso'::text,
  concepto text not null,
  detalle text,
  monto numeric not null,
  medio text,
  dispensa_id uuid,
  cuota_id uuid,
  documento_id uuid,
  notas text,
  creado_en timestamp with time zone not null default now(),
  pago_id uuid,
  paciente_id uuid
);
create table if not exists public.ong_pedidos (
  id uuid not null default gen_random_uuid(),
  user_id uuid default auth.uid(),
  codigo_reserva text not null,
  lote_id uuid not null,
  paciente_id uuid,
  asociado_id uuid,
  gramos numeric not null,
  monto_reembolso numeric not null default 0,
  metodo_pago text not null default 'Efectivo_Sede'::text,
  estado_pago text not null default 'Pendiente_Efectivo'::text,
  estado_pedido text not null default 'Reservado'::text,
  fecha_expiracion timestamp with time zone not null default (now() + '72:00:00'::interval),
  comprobante_path text,
  comprobante_nombre text,
  dispensa_id uuid,
  entregado_en timestamp with time zone,
  notas text,
  creado_en timestamp with time zone not null default now()
);
create table if not exists public.ong_feedback_clinico (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  dispensa_id uuid not null,
  paciente_id uuid,
  escala_alivio integer not null,
  efectos_adversos jsonb not null default '[]'::jsonb,
  efectos_detalle text,
  dosificacion_real text not null,
  observaciones text,
  creado_en timestamp with time zone not null default now()
);
create table if not exists public.ong_traslados (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  fecha date not null default ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date,
  hora_salida text,
  hora_llegada text,
  origen text,
  destino text,
  ruta text,
  transportista text,
  transportista_dni text,
  destinatario text,
  tipo_material text not null default 'flores'::text,
  cantidad numeric,
  paciente_id uuid,
  carta_porte_presentada boolean not null default false,
  notas text,
  creado_en timestamp with time zone not null default now(),
  lotes text
);
-- ───────────────────────────────────────────────────────────────────────────
-- 3. RLS prendido, sin una sola policy todavía
-- ───────────────────────────────────────────────────────────────────────────
--
-- ⚠️ Se prende ACÁ y las policies vienen en el archivo siguiente. Una tabla con
-- RLS y sin policies no la lee nadie, que es el estado seguro: si la migración
-- de policies fallara, estas tablas quedan cerradas en vez de abiertas.

do $$
declare t text;
begin
  foreach t in array array[
    'ong_actas','ong_asociados','ong_autoridades','ong_caja','ong_categorias_socio',
    'ong_cuotas','ong_cuotas_emitidas','ong_ddjj','ong_dispensas','ong_documentos',
    'ong_entidad','ong_feedback_clinico','ong_libros','ong_lotes','ong_pedidos',
    'ong_predios','ong_requisitos','ong_traslados','ong_visitas'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ═══ de 20260818000200_policies_ong.sql ═══
-- Las policies de las tablas `ong_*`.
--
-- Van DESPUÉS de las funciones de rol (20260919120000) a propósito: casi todas
-- llaman a `mi_rol()` o a `puede_ver_plata()`, y una policy que referencia una
-- función inexistente falla al crearse. Ese es exactamente el orden que se
-- rompió en la instalación nueva: sin las funciones, ninguna de estas se podía
-- crear, y la base quedaba con las tablas prendidas y sin reglas — o, peor, con
-- reglas `using (true)` puestas para «destrabar».
--
-- ⚠️ NINGUNA POLICY ACÁ ES `using (true)`. Si después de correr esto el chequeo
-- de permisivas da distinto de cero, hay una regla puesta a mano que hay que
-- encontrar: las policies se combinan con OR, así que UNA sola permisiva abre
-- la tabla entera por más que las otras estén bien.
--
-- ⚠️ Y el filtro correcto es `mi_rol() <> all (array['sin_perfil','demo'])`,
-- nunca `<> 'demo'` a secas: como el registro de Supabase es abierto, cualquiera
-- que se cree una cuenta cae en 'sin_perfil' y pasaría el filtro.
--
-- Se borra antes de crear para que la migración sea repetible.

do $$
declare
  p record;
  s text;
begin
  -- 1. Limpio lo que haya en estas tablas, incluidas las permisivas que
  --    alguien pudo haber puesto para poder trabajar.
  for p in
    select policyname, tablename from pg_policies
     where schemaname = 'public'
       and tablename = any(array[
         'ong_actas','ong_asociados','ong_autoridades','ong_caja','ong_categorias_socio',
         'ong_cuotas','ong_cuotas_emitidas','ong_ddjj','ong_dispensas','ong_documentos',
         'ong_entidad','ong_feedback_clinico','ong_libros','ong_lotes','ong_pedidos',
         'ong_predios','ong_requisitos','ong_traslados','ong_visitas'])
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;

  -- 2. Las reglas buenas, tal como están en la instalación de referencia.
  foreach s in array array[
    -- Institucional: lo ve todo rol real, lo escribe administración.
    'create policy "ong_actas_ver" on public.ong_actas for select to authenticated using (mi_rol() <> all (array[''sin_perfil'',''demo'']))',
    'create policy "ong_actas_escribir" on public.ong_actas for all to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo''])) with check (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo'']))',
    'create policy "ong_autoridades_ver" on public.ong_autoridades for select to authenticated using (mi_rol() <> all (array[''sin_perfil'',''demo'']))',
    'create policy "ong_autoridades_escribir" on public.ong_autoridades for all to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo''])) with check (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo'']))',
    'create policy "ong_entidad_ver" on public.ong_entidad for select to authenticated using (mi_rol() <> all (array[''sin_perfil'',''demo'']))',
    'create policy "ong_entidad_escribir" on public.ong_entidad for all to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo''])) with check (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo'']))',
    'create policy "ong_libros_ver" on public.ong_libros for select to authenticated using (mi_rol() <> all (array[''sin_perfil'',''demo'']))',
    'create policy "ong_libros_escribir" on public.ong_libros for all to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo''])) with check (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo'']))',
    'create policy "ong_requisitos_ver" on public.ong_requisitos for select to authenticated using (mi_rol() <> all (array[''sin_perfil'',''demo'']))',
    'create policy "ong_requisitos_escribir" on public.ong_requisitos for all to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo''])) with check (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo'']))',

    -- Cumplimiento: el director de cultivo también escribe.
    'create policy "ong_ddjj_ver" on public.ong_ddjj for select to authenticated using (mi_rol() <> all (array[''sin_perfil'',''demo'']))',
    'create policy "ong_ddjj_escribir" on public.ong_ddjj for all to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo'',''director_cultivo''])) with check (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo'',''director_cultivo'']))',
    'create policy "ong_predios_ver" on public.ong_predios for select to authenticated using (mi_rol() <> all (array[''sin_perfil'',''demo'']))',
    'create policy "ong_predios_escribir" on public.ong_predios for all to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo'',''director_cultivo''])) with check (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo'',''director_cultivo'']))',

    -- La PLATA: se lee con puede_ver_plata(), que deja afuera a cultivo y a
    -- dirección médica.
    'create policy "ong_caja_ver" on public.ong_caja for select to authenticated using (puede_ver_plata())',
    'create policy "ong_caja_escribir" on public.ong_caja for all to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo'',''mostrador''])) with check (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo'',''mostrador'']))',
    'create policy "ong_documentos_ver" on public.ong_documentos for select to authenticated using (puede_ver_plata())',
    'create policy "ong_documentos_escribir" on public.ong_documentos for all to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo'',''mostrador''])) with check (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo'',''mostrador'']))',
    'create policy "ong_cuotas_ver" on public.ong_cuotas for select to authenticated using (puede_ver_plata())',
    'create policy "ong_cuotas_escribir" on public.ong_cuotas for all to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo''])) with check (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo'']))',
    'create policy "ong_cuotas_emitidas_ver" on public.ong_cuotas_emitidas for select to authenticated using (puede_ver_plata())',
    'create policy "ong_cuotas_emitidas_escribir" on public.ong_cuotas_emitidas for all to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo''])) with check (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo'']))',
    'create policy "ong_categorias_socio_ver" on public.ong_categorias_socio for select to authenticated using (puede_ver_plata())',
    'create policy "ong_categorias_socio_escribir" on public.ong_categorias_socio for all to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo''])) with check (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo'']))',

    -- Padrón y entregas: incluye mostrador, que necesita atender.
    'create policy "ong_asociados_ver" on public.ong_asociados for select to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo'',''auditor'',''mostrador'']))',
    'create policy "ong_asociados_escribir" on public.ong_asociados for all to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo''])) with check (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo'']))',
    'create policy "ong_dispensas_ver" on public.ong_dispensas for select to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo'',''auditor'',''mostrador'']))',
    'create policy "ong_dispensas_escribir" on public.ong_dispensas for all to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo'',''mostrador''])) with check (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo'',''mostrador'']))',
    'create policy "ong_lotes_ver" on public.ong_lotes for select to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo'',''auditor'',''mostrador'']))',
    'create policy "ong_lotes_escribir" on public.ong_lotes for all to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo'',''mostrador''])) with check (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo'',''mostrador'']))',
    'create policy "ong_pedidos_ver" on public.ong_pedidos for select to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo'',''auditor'',''mostrador'']))',
    'create policy "ong_pedidos_escribir" on public.ong_pedidos for all to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo'',''mostrador''])) with check (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo'',''mostrador'']))',
    'create policy "ong_visitas_ver" on public.ong_visitas for select to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo'',''auditor'',''mostrador'']))',
    'create policy "ong_visitas_escribir" on public.ong_visitas for all to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo'',''mostrador''])) with check (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo'',''mostrador'']))',
    'create policy "ong_traslados_ver" on public.ong_traslados for select to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo'',''auditor'',''director_cultivo'']))',
    'create policy "ong_traslados_escribir" on public.ong_traslados for all to authenticated using (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo'',''director_cultivo''])) with check (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo'',''director_cultivo'']))',

    -- Lo CLÍNICO es el cierre más estrecho: sólo administración y dirección
    -- médica, y ni siquiera hay update ni delete — un seguimiento no se corrige,
    -- se carga otro.
    'create policy "feedback_ver" on public.ong_feedback_clinico for select to authenticated using (puede_ver_clinico())',
    'create policy "feedback_cargar" on public.ong_feedback_clinico for insert to authenticated with check (puede_ver_clinico())'
  ] loop
    execute s;
  end loop;
end $$;
-- ───────────────────────────────────────────────────────────────────────────
-- `anon` no tiene nada que hacer acá
-- ───────────────────────────────────────────────────────────────────────────
--
-- No es un agujero —el RLS ya le devuelve cero filas— pero sin el privilegio
-- hacen falta dos errores en vez de uno para que se filtre algo.

do $$
declare t text;
begin
  foreach t in array array[
    'ong_actas','ong_asociados','ong_autoridades','ong_caja','ong_categorias_socio',
    'ong_cuotas','ong_cuotas_emitidas','ong_ddjj','ong_dispensas','ong_documentos',
    'ong_entidad','ong_feedback_clinico','ong_libros','ong_lotes','ong_pedidos',
    'ong_predios','ong_requisitos','ong_traslados','ong_visitas'
  ] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ═══ de 20260818000300_triggers_y_secuencias.sql ═══
-- Los triggers que faltaban, y la secuencia de recibos.
--
-- ⚠️ EL MÁS IMPORTANTE ES `al_crear_usuario`. Es el que hace que el PRIMER
-- usuario que se registra nazca `administrador` y activo, y del segundo en
-- adelante `auditor` inactivo hasta que un admin lo habilite.
--
-- Sin él, quien se registra no tiene fila en `perfiles_usuario`, `mi_rol()`
-- devuelve 'sin_perfil' y TODAS las policies le niegan todo: la app abre y no
-- muestra nada, sin un error que explique por qué. Y como nadie es admin, no
-- hay quien habilite a nadie — la instalación queda trabada sin salida por la
-- interfaz.

create sequence if not exists public.ong_recibo_seq;
-- ───────────────────────────────────────────────────────────────────────────
-- El alta de usuarios
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.crear_perfil_al_alta()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  es_el_primero boolean;
begin
  select not exists (select 1 from public.perfiles_usuario) into es_el_primero;

  insert into public.perfiles_usuario (id, nombre_completo, rol, activo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre_completo', split_part(new.email, '@', 1)),
    case when es_el_primero then 'administrador' else 'auditor' end,
    es_el_primero
  )
  on conflict (id) do nothing;

  return new;
end $function$;
drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_al_alta();
-- ⚠️ ACA IBA `asignar_codigo_paciente` Y SU TRIGGER, y se sacaron por ORDEN.
-- La funcion referencia `new.codigo`, y `pacientes.codigo` no existe hasta
-- 20260820000013_campos_sueltos. Dejarla aca no tumbaba ninguna migracion
-- —porque 20260820000003_codigo_paciente_automatico la reemplaza y es esa la
-- que crea el trigger— pero si alguien daba de alta un paciente en la ventana
-- entre una migracion y la otra, el insert fallaba.
--
-- Vive donde siempre: 20260820000003, que corre cuando la columna ya existe.

-- ───────────────────────────────────────────────────────────────────────────
-- El número de recibo
-- ───────────────────────────────────────────────────────────────────────────
--
-- Se asigna AL EMITIR, no al crear la dispensa: si se asignara antes, una
-- entrega que se borra deja un hueco en la numeración y un libro de recibos con
-- huecos no se puede defender.

CREATE OR REPLACE FUNCTION public.asignar_numero_recibo(p_dispensa uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  n integer;
begin
  if mi_rol() not in ('administrador', 'administrador_sistema', 'administrativo') then
    raise exception 'Sin permiso para emitir recibos';
  end if;

  select recibo_numero into n from ong_dispensas where id = p_dispensa for update;
  if not found then
    raise exception 'No existe la dispensa %', p_dispensa;
  end if;
  if n is not null then
    return n;
  end if;

  n := nextval('ong_recibo_seq');
  update ong_dispensas set recibo_numero = n where id = p_dispensa;
  return n;
end;
$function$;
revoke all on function public.crear_perfil_al_alta() from public, anon;
revoke all on function public.asignar_numero_recibo(uuid) from public, anon;
grant execute on function public.asignar_numero_recibo(uuid) to authenticated, service_role;
grant execute on function public.crear_perfil_al_alta() to service_role;

-- ═══ de 20260818000400_storage_buckets.sql ═══
-- Los tres buckets de Storage y sus permisos.
--
-- Mismo origen que las funciones de rol: se crearon desde el panel de Supabase
-- y nunca quedaron como archivo. Sin esto, subir la credencial de REPROCANN de
-- un paciente, la foto de una planta o la ficha de un comprobante falla — y
-- falla del lado del cliente, con un error de Storage que no dice que el bucket
-- no existe.
--
-- ⚠️ LOS TRES SON PRIVADOS (`public = false`). Acá se suben credenciales de
-- REPROCANN y comprobantes: un bucket público los deja accesibles por URL a
-- cualquiera que la tenga, sin sesión y sin pasar por ninguna policy.
--
-- El límite de tamaño va por bucket y es explícito, no el default de la
-- instalación: un PDF de credencial no pesa 50 MB, y el techo bajo es lo que
-- evita que alguien suba un video por error y se coma la cuota del plan free.

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('fotos',      'fotos',      false, 10485760),   -- 10 MB · fotos de plantas
  ('documentos', 'documentos', false, 20971520),   -- 20 MB · comprobantes y credenciales
  ('fichas',     'fichas',     false, 15728640)    -- 15 MB · fichas de proveedor
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;
-- ───────────────────────────────────────────────────────────────────────────
-- Las policies, por bucket y por rol
-- ───────────────────────────────────────────────────────────────────────────
--
-- ⚠️ EL CRITERIO ES EL MISMO QUE EL DE LA TABLA QUE REFERENCIA EL ARCHIVO, y
-- eso es deliberado. En la instalación de origen alcanzaba con estar
-- autenticado para entrar a cualquier bucket: alguien con rol `cultivador`
-- —que no puede ver una ficha clínica— igual podía bajarse la credencial de
-- REPROCANN de cualquier paciente, porque el archivo no sabía de roles.
--
-- `documentos` tiene un tratamiento aparte para `institucional/%`: el estatuto
-- y las actas los tiene que poder leer el director médico, que NO ve la plata
-- y por lo tanto no entra al resto del bucket.

do $$
declare
  p record;
  s text;
begin
  for p in
    select policyname from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname in (
         'fotos_ver','fotos_escribir','fotos_borrar',
         'documentos_ver','documentos_escribir','documentos_borrar',
         'documentos_institucional_ver','documentos_institucional_escribir',
         'documentos_institucional_borrar',
         'fichas_ver','fichas_escribir','fichas_borrar')
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;

  foreach s in array array[
    -- FOTOS de plantas: las ve todo rol real, las sube y borra quien cultiva.
    'create policy "fotos_ver" on storage.objects for select to authenticated using ((bucket_id = ''fotos'') and (mi_rol() <> all (array[''sin_perfil'',''demo''])))',
    'create policy "fotos_escribir" on storage.objects for insert to authenticated with check ((bucket_id = ''fotos'') and (mi_rol() = any (array[''administrador'',''cultivador''])))',
    'create policy "fotos_borrar" on storage.objects for delete to authenticated using ((bucket_id = ''fotos'') and (mi_rol() = any (array[''administrador'',''cultivador''])))',

    -- DOCUMENTOS: comprobantes y credenciales. El cultivo no entra.
    'create policy "documentos_ver" on storage.objects for select to authenticated using ((bucket_id = ''documentos'') and (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo'',''auditor''])))',
    'create policy "documentos_escribir" on storage.objects for insert to authenticated with check ((bucket_id = ''documentos'') and (mi_rol() = any (array[''administrador'',''administrador_sistema'',''director_medico'',''administrativo'',''mostrador''])))',
    'create policy "documentos_borrar" on storage.objects for delete to authenticated using ((bucket_id = ''documentos'') and es_admin())',

    -- El legajo INSTITUCIONAL vive dentro de `documentos` pero se lee al revés:
    -- lo ve todo rol real, incluido el director médico, que no ve la plata.
    'create policy "documentos_institucional_ver" on storage.objects for select to authenticated using ((bucket_id = ''documentos'') and (name like ''institucional/%'') and (mi_rol() <> all (array[''sin_perfil'',''demo''])))',
    'create policy "documentos_institucional_escribir" on storage.objects for insert to authenticated with check ((bucket_id = ''documentos'') and (name like ''institucional/%'') and (mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo''])))',
    'create policy "documentos_institucional_borrar" on storage.objects for delete to authenticated using ((bucket_id = ''documentos'') and (name like ''institucional/%'') and (mi_rol() = any (array[''administrador'',''administrador_sistema''])))',

    -- FICHAS de proveedor: siguen a la plata.
    'create policy "fichas_ver" on storage.objects for select to authenticated using ((bucket_id = ''fichas'') and puede_ver_plata())',
    'create policy "fichas_escribir" on storage.objects for insert to authenticated with check ((bucket_id = ''fichas'') and (mi_rol() = any (array[''administrador'',''administrativo''])))',
    'create policy "fichas_borrar" on storage.objects for delete to authenticated using ((bucket_id = ''fichas'') and (mi_rol() = any (array[''administrador'',''administrativo''])))'
  ] loop
    execute s;
  end loop;
end $$;

-- ═══ de 20260818000500_rls_automatico.sql ═══
-- Prende RLS solo en cada tabla nueva de `public`.
--
-- Es una RED DE SEGURIDAD, no el mecanismo principal: cada migración debería
-- prender RLS en lo que crea. Esto cubre el caso de que alguien se olvide, que
-- es el error más fácil de cometer y el más difícil de notar — una tabla sin
-- RLS no falla, no avisa, y se lee entera con la publishable key.
--
-- ⚠️ PRENDER RLS NO ES LO MISMO QUE TENER POLICIES. Una tabla con RLS y sin
-- policies no la lee nadie, que es el estado seguro; el trigger deja la tabla
-- cerrada, no protegida. Las reglas hay que escribirlas igual.
--
-- Va en `pg_catalog` como search_path y `security definer` porque un event
-- trigger corre con el rol de quien ejecutó el DDL, que puede no tener permiso
-- para alterar la tabla recién creada.

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public')
        AND cmd.schema_name NOT IN ('pg_catalog','information_schema')
        AND cmd.schema_name NOT LIKE 'pg_toast%'
        AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          -- No se corta el DDL por esto: si falla, la tabla se crea igual y el
          -- log lo deja anotado. Un event trigger que aborta un CREATE TABLE
          -- rompe migraciones enteras por un caso de borde.
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (schema %)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;
drop event trigger if exists ensure_rls;
create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();
revoke all on function public.rls_auto_enable() from public, anon;

-- ═══ de 20260818000600_policies_resto.sql ═══
-- ───────────────────────────────────────────────────────────────────────────
-- `anon` afuera de todo
-- ───────────────────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'actividades','ambiente_lecturas','ambiente_salas','aplicaciones',
    'asistencias','cosechas','costos','cultivadores','cultivo_areas','cultivo_grupos',
    'cultivo_lotes','econometria_config','eventos','fichas_comerciales','geneticas',
    'instalaciones_items','insumos','jornadas','mantenimientos','ofertas_instalacion',
    'pacientes','perfiles_usuario','plantas',
    'presupuesto_instalacion_items','presupuestos_instalacion','proveedores_instalacion',
    'recordatorios','riegos'
  ] loop
    begin
      execute format('revoke all on public.%I from anon', t);
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    exception when undefined_table then null;
      when invalid_table_definition then null;  -- growflow ya tiene su clave primaria
    end;
  end loop;
end $$;

-- ═══ de 20260819000002_ambiente_manual.sql ═══
-- Ambiente por carga manual.
--
-- Se aplico el 19/08/2026 directo sobre la base y el archivo quedo sin
-- versionar; esto lo reconstruye tal como esta en produccion. Es idempotente
-- para que correrlo de nuevo no rompa la base que ya lo tiene.
--
-- Panacea no tiene sensores: las lecturas las carga una persona con el
-- termohigrometro, dos veces por dia. El VPD NO se guarda, se calcula: un
-- derivado guardado se desincroniza del dato que lo origino apenas alguien
-- corrige la temperatura.

create table if not exists public.ambiente_salas (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null,
  -- La etapa vive en la SALA, no en la lectura: es lo que hace que el semaforo
  -- compare contra el rango correcto (el VPD ideal en vegetativo no es el de floracion).
  etapa     text not null default 'vegetativo' check (etapa in ('vegetativo','floracion')),
  activa    boolean not null default true,
  orden     integer not null default 0,
  creado_en timestamptz not null default now()
);
create table if not exists public.ambiente_lecturas (
  id          uuid primary key default gen_random_uuid(),
  sala_id     uuid not null references public.ambiente_salas(id) on delete cascade,
  medido_en   timestamptz not null default now(),
  temp_c      numeric not null check (temp_c >= -10 and temp_c <= 60),
  humedad_pct numeric not null check (humedad_pct >= 0 and humedad_pct <= 100),
  nota        text,
  creado_en   timestamptz not null default now()
);
create index if not exists ambiente_lecturas_sala_fecha
  on public.ambiente_lecturas (sala_id, medido_en desc);
alter table public.ambiente_salas    enable row level security;
alter table public.ambiente_lecturas enable row level security;
-- Patron de `riegos`: ve todo rol real, escribe administrador y cultivador.
drop policy if exists ambiente_salas_ver on public.ambiente_salas;
create policy ambiente_salas_ver on public.ambiente_salas
  for select using (mi_rol() <> all (array['sin_perfil','demo']));
drop policy if exists ambiente_salas_escribir on public.ambiente_salas;
create policy ambiente_salas_escribir on public.ambiente_salas
  for all
  using      (mi_rol() = any (array['administrador','cultivador']))
  with check (mi_rol() = any (array['administrador','cultivador']));
drop policy if exists ambiente_lecturas_ver on public.ambiente_lecturas;
create policy ambiente_lecturas_ver on public.ambiente_lecturas
  for select using (mi_rol() <> all (array['sin_perfil','demo']));
drop policy if exists ambiente_lecturas_escribir on public.ambiente_lecturas;
create policy ambiente_lecturas_escribir on public.ambiente_lecturas
  for all
  using      (mi_rol() = any (array['administrador','cultivador']))
  with check (mi_rol() = any (array['administrador','cultivador']));

-- ═══ de 20260819000003_cultivo_areas.sql ═══
-- Areas de cultivo: carpas, camas, sectores.
--
-- Antes esto era una constante en app/src/pages/PaginaSala.tsx con la
-- disposicion fisica de la instalacion de origen. Al forkear, Panacea veia cinco
-- carpas que nunca habia creado, todas en 0/0. Ahora las crea cada instalacion
-- desde la pantalla.
--
-- El `slot` de una planta sigue siendo `<area.id>-<indice>`: el prefijo dice en
-- que area esta. No se cambio el formato para no romper plantas ya ubicadas.

create table if not exists public.cultivo_areas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  tipo       text not null default 'carpa'
             check (tipo in ('carpa','cama','sector','sala','mesa','invernadero')),
  -- Medidas del espacio real, en metros. Son informativas: lo que dibuja la
  -- grilla es cols x rows. Se guardan para que el cartel diga "1.2 x 1.2 m".
  ancho_m    numeric(6,2) check (ancho_m is null or ancho_m > 0),
  largo_m    numeric(6,2) check (largo_m is null or largo_m > 0),
  -- La grilla. La capacidad es cols * rows: no se guarda aparte para que no se
  -- desincronice del dibujo (mismo criterio que el VPD en ambiente).
  cols       int not null check (cols between 1 and 40),
  rows       int not null check (rows between 1 and 40),
  orden      int not null default 0,
  activa     boolean not null default true,
  creado_en  timestamptz not null default now()
);
create index if not exists cultivo_areas_orden_idx on public.cultivo_areas (orden, nombre);
alter table public.cultivo_areas enable row level security;
-- Patron de `riegos`: ve todo rol real, escribe administrador y cultivador.
drop policy if exists cultivo_areas_ver on public.cultivo_areas;
create policy cultivo_areas_ver on public.cultivo_areas
  for select using (mi_rol() <> all (array['sin_perfil','demo']));
drop policy if exists cultivo_areas_escribir on public.cultivo_areas;
create policy cultivo_areas_escribir on public.cultivo_areas
  for all
  using      (mi_rol() = any (array['administrador','cultivador']))
  with check (mi_rol() = any (array['administrador','cultivador']));

-- ═══ de 20260820000001_lotes_origen_costo.sql ═══
-- Origen y costo del lote (A1 de la orden de trabajo).
--
-- El modelo asumia que todo el material sale del cultivo propio: un lote nacia
-- de una cosecha (`cosecha_id`) y el costo por gramo lo calculaba Econometria a
-- partir de los insumos del ciclo. Panacea opera al reves — compra el material a
-- terceros con una orden de servicio — y con ese modelo su margen por lote no lo
-- calcula nadie: 101 lotes cargados, 0 cosechas, y $57.616.000 de compras que no
-- tienen donde imputarse.
--
-- Tres columnas alcanzan para cerrarlo:
--   origen           de donde salio el material. Es lo que permite sumar el
--                    ingreso real sin contar dos veces un lote propio, que ya
--                    viene contado en `cosechas`.
--   costo_por_gramo  lo que costo el gramo puesto en el estante. Nullable: el
--                    dato lo carga la persona, y un cero fingido daria margenes
--                    inventados.
--   proveedor        a quien se le compro. Texto libre a proposito: la planilla
--                    trae nombres sueltos y todavia no hay tabla de proveedores
--                    del lado ONG.

alter table public.ong_lotes
  add column if not exists origen text not null default 'propio'
    check (origen in ('propio','comprado')),
  add column if not exists costo_por_gramo numeric(12,2)
    check (costo_por_gramo is null or costo_por_gramo >= 0),
  add column if not exists proveedor text;
comment on column public.ong_lotes.origen is
  'propio = salio de una cosecha de la instalacion; comprado = se adquirio a un tercero.';
comment on column public.ong_lotes.costo_por_gramo is
  'Costo del gramo puesto en el estante. Null = todavia no se cargo, no cero.';
-- SOLO PARA LA BASE DE PANACEA (TU_PROJECT_ID).
--
-- La regla general es que toda migracion va a las dos bases, pero esta no: A1
-- resuelve un problema de Panacea —que compra el material a terceros— y el repo
-- de Gaston (grancobud/growflow) no tiene el codigo que usa estas columnas. Se
-- aplico ahi por error el 20/08/2026 y se revirtio el mismo dia. Si algun dia se
-- porta A1 a growflow, se aplica esta migracion en esa base recien entonces.
--
-- Backfill: un lote que no viene de ninguna cosecha no pudo salir del cultivo
-- propio. En Panacea marca los 101 como comprados, que es lo que son.
update public.ong_lotes
   set origen = 'comprado'
 where cosecha_id is null
   and origen = 'propio';
create index if not exists ong_lotes_origen_idx on public.ong_lotes (origen);

-- ═══ de 20260820000002_ambiente_rangos_sala.sql ═══
-- Rangos de ambiente por sala (B4 de la orden de trabajo).
--
-- Hasta ahora el semaforo comparaba siempre contra `RANGOS[etapa]`, una
-- constante de app/src/lib/ambiente.ts sacada de la bibliografia de indoor. Con
-- eso, 27 C en vegetativo da verde — y el target real de Panacea es 24-26. Una
-- constante del codigo no puede saber a que apunta cada sala.
--
-- Las seis columnas son NULLABLE a proposito: null = "usa el rango de la etapa".
-- Asi una sala recien creada se comporta igual que antes, y quien quiera afinar
-- toca solo el limite que le importa sin tener que redefinir los seis.
--
-- No se guarda el rango de VPD derivado de temp/humedad: el VPD tiene su propio
-- par porque su rango util no se deduce de los otros dos (mismo criterio por el
-- que el VPD medido se calcula y no se guarda).

alter table public.ambiente_salas
  add column if not exists temp_min numeric(5,2) check (temp_min is null or temp_min between -10 and 60),
  add column if not exists temp_max numeric(5,2) check (temp_max is null or temp_max between -10 and 60),
  add column if not exists hum_min  numeric(5,2) check (hum_min  is null or hum_min  between 0 and 100),
  add column if not exists hum_max  numeric(5,2) check (hum_max  is null or hum_max  between 0 and 100),
  add column if not exists vpd_min  numeric(4,2) check (vpd_min  is null or vpd_min  between 0 and 6),
  add column if not exists vpd_max  numeric(4,2) check (vpd_max  is null or vpd_max  between 0 and 6);
-- Un minimo por encima del maximo deja el semaforo en rojo permanente sin que
-- se entienda por que. Se rechaza en la base y no solo en el formulario: la
-- Edge Function `ingesta` y el SQL a mano no pasan por el formulario.
alter table public.ambiente_salas
  drop constraint if exists ambiente_salas_rangos_coherentes;
alter table public.ambiente_salas
  add constraint ambiente_salas_rangos_coherentes check (
    (temp_min is null or temp_max is null or temp_min < temp_max) and
    (hum_min  is null or hum_max  is null or hum_min  < hum_max)  and
    (vpd_min  is null or vpd_max  is null or vpd_min  < vpd_max)
  );
comment on column public.ambiente_salas.temp_min is
  'Null = usa el rango de la etapa (RANGOS en app/src/lib/ambiente.ts).';

-- ═══ de 20260820000003_codigo_paciente_automatico.sql ═══
-- El codigo PAC-XXX lo asigna la base, no una persona.
--
-- SOLO PARA LA BASE DE PANACEA. El repo de Gaston no tiene este circuito.
--
-- Contexto: Panacea capta socios con un formulario de Google. Habia un script en
-- una notebook que asignaba el correlativo; la notebook se rompio y desde
-- entonces el numero lo pone una persona a mano, mirando la planilla. Eso es lo
-- que se automatiza, y automatizar una asignacion que se calcula leyendo el
-- maximo trae un problema nuevo: dos altas simultaneas leen el mismo maximo y se
-- llevan el mismo numero. A mano casi no pasaba; con un trigger de formulario,
-- pasa.
--
-- Por eso el lock. `pg_advisory_xact_lock` serializa la asignacion y se suelta
-- solo al terminar la transaccion. Serializa los altas de pacientes, que son
-- ~200 por ano: no es un costo que se note.
--
-- Se calcula max+1 leyendo la tabla en vez de usar una sequence a proposito: una
-- sequence se desincroniza de los datos apenas alguien inserta un codigo a mano
-- o se restaura un backup, y despues choca. Leer el maximo siempre dice la
-- verdad.

create or replace function public.asignar_codigo_paciente()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  proximo int;
begin
  -- Ya viene con codigo (backfill de la planilla, carga a mano): se respeta.
  -- El trigger completa lo que falta, no pisa lo que hay.
  if coalesce(new.notas, '') ~ '^\s*PAC-\d+' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('pacientes_codigo'));

  -- Solo se miran las filas que YA tienen codigo: sobre las demas el
  -- regexp_replace devolveria cualquier cosa.
  select coalesce(max(nullif(regexp_replace(split_part(notas, '|', 1), '\D', '', 'g'), '')::int), 0) + 1
    into proximo
    from public.pacientes
   where notas ~ '^\s*PAC-\d+';

  -- Relleno a 3 digitos para que ordene igual como texto que como numero, que es
  -- el formato que ya tienen los 211 cargados (PAC-001 .. PAC-216).
  new.notas := 'PAC-' || lpad(proximo::text, 3, '0') || '|' || coalesce(new.notas, '');
  return new;
end;
$$;
drop trigger if exists pacientes_asignar_codigo on public.pacientes;
create trigger pacientes_asignar_codigo
  before insert on public.pacientes
  for each row execute function public.asignar_codigo_paciente();
comment on function public.asignar_codigo_paciente() is
  'Asigna PAC-XXX correlativo si el paciente entra sin codigo. Serializado con advisory lock.';

-- ═══ de 20260820000005_unidad_del_lote.sql ═══
-- La unidad del lote y de la dispensa (A3 de la orden de trabajo).
--
-- SOLO PARA LA BASE DE PANACEA.
--
-- El modelo asumia que todo se mide en gramos: la columna se llama
-- `gramos_totales` y el balance de materia suma esa columna sin preguntar. Pero
-- Panacea dispensa tambien aceite (frascos), papeles, filtros, picadores y seda.
--
-- Hoy eso esta mezclado en la base:
--   - 5 lotes de "Aceite de Cannabis" con 21 en `gramos_totales` que son 21
--     FRASCOS, sumados junto a 2.719 g de flores.
--   - 37 dispensas / 80 "gramos" que no son gramos, dentro de los 6.747,5 del
--     balance. El material vegetal real es 6.667,5 g.
--
-- No se renombra `gramos_totales`: lo referencian la app, la Edge Function
-- `ingesta` y los scripts del backfill. Se agrega la unidad al lado y el codigo
-- filtra por ella.

alter table public.ong_lotes
  add column if not exists unidad text not null default 'g'
    check (unidad in ('g','u','ml'));
alter table public.ong_dispensas
  add column if not exists unidad text not null default 'g'
    check (unidad in ('g','u','ml'));
comment on column public.ong_lotes.unidad is
  'g = gramos de material vegetal · u = unidades (frascos, accesorios) · ml = mililitros. Solo lo marcado como g entra al balance de materia.';
-- Backfill por nombre de producto. Es lo unico que tenemos: la planilla nunca
-- registro la unidad. Se marca por patron y queda a la vista para corregir a
-- mano lo que haga falta.
update public.ong_lotes
   set unidad = 'u'
 where producto ~* 'aceite|papel|filtro|picador|seda|programa|grinder|encendedor|bandeja'
   and unidad = 'g';
update public.ong_dispensas
   set unidad = 'u'
 where producto ~* 'aceite|papel|filtro|picador|seda|programa|grinder|encendedor|bandeja'
   and unidad = 'g';
create index if not exists ong_dispensas_unidad_idx on public.ong_dispensas (unidad);

-- ═══ de 20260820000006_riego_ec_y_area_potencia.sql ═══
-- B3 (EC del riego) y B5 (potencia del area) de la orden de trabajo.
--
-- SOLO PARA LA BASE DE PANACEA.
--
-- B3 -- `riegos` guardaba `ppm` y nada mas. Dos problemas:
--
--   1. Un ppm sin factor de conversion no significa nada. Los medidores baratos
--      leen EC (mS/cm) y muestran ppm multiplicando por 500 o por 700 segun la
--      marca. "600 ppm" es EC 1,2 con factor 500 y EC 0,857 con factor 700: son
--      soluciones distintas. El fertirriego del Proyecto Panacea del 16/08 se
--      anoto como "EC 1,2 = 600 ppm con factor 500" justamente por eso.
--   2. Panacea mide en EC, no en ppm. Obligar a convertir a mano antes de cargar
--      es pedir que alguien haga una cuenta que la computadora puede hacer.
--
-- Se guardan los dos y el factor: se conserva lo que se midio en vez de un
-- derivado, y el otro valor se calcula. Mismo criterio que el VPD en ambiente.
--
-- B5 -- `cultivo_areas` no tenia potencia. Econometria tiene las categorias
-- "Luz (consumo)" y "Luz (abono)" pero el costo se carga a mano por ciclo: no
-- hay forma de saber cuanto consume cada area, ni de repartir la factura entre
-- ellas. Con los watts instalados y las horas de luz, el consumo sale solo.

alter table public.riegos
  add column if not exists ec numeric(5,2)
    check (ec is null or (ec >= 0 and ec <= 20)),
  add column if not exists ppm_factor int not null default 500
    check (ppm_factor in (500, 700));
comment on column public.riegos.ec is
  'Conductividad en mS/cm. Es lo que mide el instrumento; el ppm se deriva multiplicando por ppm_factor.';
comment on column public.riegos.ppm_factor is
  'Factor del medidor: 500 (Hanna/EEUU) o 700 (Truncheon/EU). Sin esto un ppm no se puede interpretar.';
-- Backfill: los riegos que ya tienen ppm cargado se completan con el EC que les
-- corresponde segun el factor por defecto. No se inventa nada — es la misma
-- lectura expresada en la otra unidad.
update public.riegos
   set ec = round((ppm::numeric / 500), 2)
 where ppm is not null and ppm > 0 and ec is null;
alter table public.cultivo_areas
  add column if not exists watts int
    check (watts is null or (watts >= 0 and watts <= 100000)),
  add column if not exists horas_luz numeric(4,1)
    check (horas_luz is null or (horas_luz >= 0 and horas_luz <= 24));
comment on column public.cultivo_areas.watts is
  'Potencia de iluminacion instalada en el area. Null = sin cargar, no cero.';
comment on column public.cultivo_areas.horas_luz is
  'Horas de luz por dia. Con watts alcanza para estimar el consumo diario del area.';

-- ═══ de 20260820000007_lotes_grupos_cultivo.sql ═══
-- B1 (lote y grupos de cultivo) y B2 (eventos de grupo).
--
-- SOLO PARA LA BASE DE PANACEA.
--
-- B1 -- Hoy el grupo experimental vive en el PREFIJO DEL APODO. Las 60 plantas
-- del Proyecto Panacea se llaman "PA-A #1".."PA-A #45" y "PA-B #1".."PA-B #15",
-- y esa cadena es lo unico que dice que son dos grupos con sustratos distintos
-- (A: coco+perlita 5 L, B: organico 7 L). Renombrar una planta rompe el dato.
--
-- Son dos conceptos, no uno:
--   * LOTE   -- la corrida: mismo dia de germinacion, misma genetica. Es lo que
--               se compara contra otra corrida.
--   * GRUPO  -- la division DENTRO de la corrida: lo que se hace distinto a
--               proposito para comparar. Es la unidad del experimento.
--
-- Se llaman `cultivo_lotes` / `cultivo_grupos` y no `lotes`: `ong_lotes` ya
-- existe y es otra cosa (la partida fraccionada para dispensar). Dos cosas
-- distintas con el mismo nombre en la misma base terminan mal.
--
-- B2 -- `eventos` y `riegos` cuelgan de `planta_id` y nada mas. Regar las 60
-- plantas son 60 filas de riego y 60 de evento: hay 600 riegos en apenas 10
-- fechas, y 600 de los 724 eventos son Riego. Ademas corregir un riego obliga a
-- corregir 60 filas.
--
-- Con `grupo_id` un riego al grupo es UNA fila. No se migra lo ya cargado:
-- reescribir un ano de registros para ahorrar filas es riesgo sin beneficio.
-- Las dos formas conviven y la linea de tiempo de una planta muestra las dos.

create table if not exists public.cultivo_lotes (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,
  fecha_germinacion date,
  genetica_id       uuid references public.geneticas(id) on delete set null,
  area_id           uuid references public.cultivo_areas(id) on delete set null,
  notas             text,
  activo            boolean not null default true,
  creado_en         timestamptz not null default now()
);
create table if not exists public.cultivo_grupos (
  id        uuid primary key default gen_random_uuid(),
  lote_id   uuid not null references public.cultivo_lotes(id) on delete cascade,
  nombre    text not null,
  -- Lo que se hace distinto en este grupo. Nullable: un lote sin experimento
  -- tiene un solo grupo y estos campos vacios.
  sustrato  text,
  maceta    text,
  -- La hipotesis en una linea. Es lo que despues explica por que se compararon.
  variable  text,
  notas     text,
  orden     int not null default 0,
  creado_en timestamptz not null default now()
);
create index if not exists cultivo_grupos_lote_idx on public.cultivo_grupos (lote_id, orden);
-- La planta apunta al GRUPO, no al lote: el lote sale del grupo. Un solo camino
-- para llegar al dato evita que planta y grupo digan lotes distintos.
alter table public.plantas
  add column if not exists grupo_id uuid references public.cultivo_grupos(id) on delete set null;
create index if not exists plantas_grupo_idx on public.plantas (grupo_id);
-- B2: un evento o un riego cuelgan de UNA de tres cosas: planta, grupo o lote.
--
-- El nivel LOTE hace falta y no es teorico: la base ya tiene cuatro eventos
-- huerfanos, sin planta, que la sesion anterior escribio con el nivel metido en
-- el texto porque no habia donde ponerlo —
--   "[Lote] Proyecto Panacea - siembra. 60 plantas..."
--   "[Lote] Inoculacion inicial: micorrizas y trichodermas..."
--   "[Grupo A] Fase de consolidacion radicular..."
--   "[Grupo B] Mayor expansion foliar basal."
-- Al no colgar de ninguna planta no aparecen en ninguna linea de tiempo: estan
-- guardados y no se ven. El backfill de mas abajo los reubica.
alter table public.eventos
  add column if not exists grupo_id uuid references public.cultivo_grupos(id) on delete cascade,
  add column if not exists lote_id  uuid references public.cultivo_lotes(id)  on delete cascade;
alter table public.riegos
  add column if not exists grupo_id uuid references public.cultivo_grupos(id) on delete cascade,
  add column if not exists lote_id  uuid references public.cultivo_lotes(id)  on delete cascade;
create index if not exists eventos_grupo_idx on public.eventos (grupo_id, fecha);
create index if not exists eventos_lote_idx  on public.eventos (lote_id, fecha);
create index if not exists riegos_grupo_idx  on public.riegos  (grupo_id, fecha);
create index if not exists riegos_lote_idx   on public.riegos  (lote_id, fecha);
-- 4. Recien ahora el check: exactamente UNO de los tres.
alter table public.eventos alter column planta_id drop not null;
alter table public.riegos  alter column planta_id drop not null;
alter table public.eventos drop constraint if exists eventos_planta_o_grupo;
alter table public.eventos add constraint eventos_planta_o_grupo
  check ((planta_id is not null)::int + (grupo_id is not null)::int + (lote_id is not null)::int = 1);
alter table public.riegos drop constraint if exists riegos_planta_o_grupo;
-- GrowFlow: A LO SUMO uno, no exactamente uno. Tiene 49 riegos generales (de la
-- carpa, sin planta), y el modulo de riego los sigue cargando asi. Con `= 1` la
-- migracion no aplica y ademas no se podria volver a cargar un riego general.
alter table public.riegos add constraint riegos_planta_o_grupo
  check ((planta_id is not null)::int + (grupo_id is not null)::int + (lote_id is not null)::int <= 1);
alter table public.cultivo_lotes  enable row level security;
alter table public.cultivo_grupos enable row level security;
-- Patron de `riegos`: ve todo rol real, escribe administrador y cultivador.
drop policy if exists cultivo_lotes_ver on public.cultivo_lotes;
create policy cultivo_lotes_ver on public.cultivo_lotes
  for select using (mi_rol() <> all (array['sin_perfil','demo']));
drop policy if exists cultivo_lotes_escribir on public.cultivo_lotes;
create policy cultivo_lotes_escribir on public.cultivo_lotes
  for all
  using      (mi_rol() = any (array['administrador','cultivador']))
  with check (mi_rol() = any (array['administrador','cultivador']));
drop policy if exists cultivo_grupos_ver on public.cultivo_grupos;
create policy cultivo_grupos_ver on public.cultivo_grupos
  for select using (mi_rol() <> all (array['sin_perfil','demo']));
drop policy if exists cultivo_grupos_escribir on public.cultivo_grupos;
create policy cultivo_grupos_escribir on public.cultivo_grupos
  for all
  using      (mi_rol() = any (array['administrador','cultivador']))
  with check (mi_rol() = any (array['administrador','cultivador']));

-- ═══ de 20260820000008_drenaje_ph_ec.sql ═══
-- pH y EC del DRENAJE (extension de B3).
--
-- SOLO PARA LA BASE DE PANACEA.
--
-- `riegos` guardaba `escurrido_ml` —cuanto salio— pero no QUE salio. En
-- sustrato, el pH y el EC del drenaje son la medicion mas diagnostica que hay:
-- comparados contra los del riego dicen si se estan acumulando sales.
--
-- El caso que lo destapo es del 20/08/2026, del cultivador:
--   riego al organico   -> EC 0.24 (120 ppm), pH 6.5
--   drenaje recuperado  -> 300 cc, pH 5.8, EC 2.03 (1020 ppm)
--
-- El drenaje sale con OCHO VECES el EC del riego. Ese salto es todo el dato: sin
-- las dos lecturas no se ve, y guardar solo el volumen lo perdia. De paso, sus
-- numeros confirman el factor del medidor: 1020 / 2.03 = 502, o sea 500.

alter table public.riegos
  add column if not exists escurrido_ph numeric(4,2)
    check (escurrido_ph is null or (escurrido_ph >= 0 and escurrido_ph <= 14)),
  add column if not exists escurrido_ec numeric(5,2)
    check (escurrido_ec is null or (escurrido_ec >= 0 and escurrido_ec <= 20)),
  add column if not exists escurrido_ppm int
    check (escurrido_ppm is null or (escurrido_ppm >= 0 and escurrido_ppm <= 20000));
comment on column public.riegos.escurrido_ec is
  'EC del drenaje en mS/cm. Contra `ec` (la del riego) dice si el sustrato acumula sales: mucho mas alto = hay que lavar.';
comment on column public.riegos.escurrido_ph is
  'pH del drenaje. Contra `ph` dice como esta amortiguando el sustrato.';

-- ═══ de 20260820000009_tarifas_por_nivel.sql ═══
-- A2: tarifas por nivel de socio.
--
-- SOLO PARA LA BASE DE PANACEA.
--
-- EL CRITERIO, EN PALABRAS DE PANACEA (20/08/2026):
--   "calidad y cantidad que se dispensa, generalmente usuarios nuevos y random
--    15, usuarios que estan desde que empezamos x ej 12 y determinados usuarios
--    x cantidad y frecuencia 10"
--
-- Existia y no estaba escrito en ningun lado: se aplicaba a ojo, entrega por
-- entrega. Contrastado contra el ano cargado, el criterio se confirma:
--
--   nivel       pacientes  dias activos  g por entrega
--   antiguo 12k     37         148           4,6      <- los del dia 1
--   frecuente 10k   21          84           5,9      <- los de mas volumen
--   nuevo 15k       32          81           4,0      <- nuevos y ocasionales
--
-- La antiguedad explica los 12k (148 dias contra 81-84), y la cantidad por
-- entrega ordena los tres de forma monotona.
--
-- DOS DECISIONES QUE IMPORTAN
--
-- 1. La tarifa lleva `vigente_desde` y no es un valor unico. Los datos muestran
--    que se movio: la mediana paso de 12.000 a 15.000 en 2026-T2. Sin vigencia
--    no se puede reconstruir que regia cuando se hizo una entrega, y un recibo
--    viejo dejaria de poder explicarse.
--
-- 2. La tarifa SUGIERE, no impone. 703 de los 704 aportes cargados son multiplos
--    de $1.000: cobran en pesos redondos y la tarifa por gramo es el resultado,
--    no la entrada. Ademas la calidad del lote la modula. Un sistema que
--    obligara a `gramos * tarifa` estaria peleado con como trabajan.

create table if not exists public.ong_tarifas (
  id               uuid primary key default gen_random_uuid(),
  nivel            text not null check (nivel in ('nuevo','antiguo','frecuente')),
  aporte_por_gramo numeric(12,2) not null check (aporte_por_gramo >= 0),
  vigente_desde    date not null,
  notas            text,
  creado_en        timestamptz not null default now(),
  unique (nivel, vigente_desde)
);
create index if not exists ong_tarifas_nivel_idx on public.ong_tarifas (nivel, vigente_desde desc);
alter table public.pacientes
  add column if not exists nivel_tarifa text not null default 'nuevo'
    check (nivel_tarifa in ('nuevo','antiguo','frecuente'));
comment on column public.pacientes.nivel_tarifa is
  'nuevo = tarifa plena · antiguo = desde el inicio · frecuente = por cantidad y frecuencia. El default es `nuevo`, la mas alta: una persona sin evaluar no entra por la mas barata.';
-- Las tarifas vigentes hoy, tal como las dicta Panacea.
-- ⚠️ ACA IBA LA MATRIZ DE TARIFAS DE LA INSTALACION DE ORIGEN, con sus importes
-- por gramo y sus notas («socios desde el inicio de la cooperativa»). Se saco:
-- cada asociacion define las suyas y las carga desde la app, en
-- O.N.G. › Asociados › tarifas.
--
-- No se reemplaza por valores de ejemplo a proposito: un importe puesto por el
-- sistema se termina cobrando sin que nadie lo haya decidido. La tabla arranca
-- vacia y la app no sugiere ningun aporte hasta que la completen.


-- Backfill del nivel: la tarifa que MAS uso cada paciente en su historia. Es lo
-- que ya se le venia cobrando, no una clasificacion nueva. Quien no tenga
-- historia suficiente queda en `nuevo`, que es el default y la tarifa mas alta:
-- errar hacia arriba se corrige devolviendo, errar hacia abajo no se corrige.
with d as (
  select paciente_id, round(aporte / nullif(gramos,0)) pg
  from public.ong_dispensas
  where modalidad='Paciente' and unidad='g' and gramos>0 and aporte>0 and paciente_id is not null
), moda as (
  select paciente_id, mode() within group (order by pg) tarifa
  from d group by 1
)
update public.pacientes p
   set nivel_tarifa = case m.tarifa
                        when 10000 then 'frecuente'
                        when 12000 then 'antiguo'
                        else 'nuevo'
                      end
  from moda m
 where m.paciente_id = p.id
   and m.tarifa in (10000, 12000, 15000);
alter table public.ong_tarifas enable row level security;
drop policy if exists ong_tarifas_ver on public.ong_tarifas;
create policy ong_tarifas_ver on public.ong_tarifas
  for select using (mi_rol() <> all (array['sin_perfil','demo']));
drop policy if exists ong_tarifas_escribir on public.ong_tarifas;
create policy ong_tarifas_escribir on public.ong_tarifas
  for all
  using      (mi_rol() = any (array['administrador','administrativo']))
  with check (mi_rol() = any (array['administrador','administrativo']));

-- ═══ de 20260820000010_tarifa_reprocann.sql ═══
-- A2 v2: la tarifa combina NIVEL DE SOCIO y REPROCANN.
--
-- SOLO PARA LA BASE DE PANACEA.
--
-- Decision de Panacea del 20/08/2026: al criterio de nivel se le suma el
-- REPROCANN, con el objetivo explicito de EMPUJAR A QUE LO TRAMITEN. Quien lo
-- tiene o lo esta tramitando paga menos; quien no, paga la tarifa de transicion
-- mientras lo gestiona.
--
-- EL PROBLEMA QUE HABIA QUE RESOLVER PRIMERO
--
-- Los 211 pacientes estaban en 'En tramite'. No porque lo esten: el formulario
-- ofrecia UNA sola opcion que decia "Tengo REPROCANN VIGENTE / VENCIDO /
-- PENDIENTE" —tres estados en una casilla— y la carga del ano pasado, bien, los
-- puso a todos en el estado no habilitado antes que marcar a alguien como
-- habilitado sin prueba.
--
-- Con todos en el mismo estado, el criterio nuevo no distingue a nadie y el
-- incentivo no existe. Panacea define el corte: "los que tienen numero de
-- registro se inicio y se autorizo el tramite". O sea, el NUMERO es la prueba.
--
-- Se agrega el estado 'Sin registro' y los 141 sin numero pasan ahi. Ojo con lo
-- que esto NO hace: no habilita a nadie. 'Sin registro' es tan no-habilitado
-- como 'En tramite'; lo unico que cambia es que ahora se distinguen, que es lo
-- que hace falta para que la tarifa signifique algo. Es reversible: el dia que
-- alguien traiga su numero, se carga y vuelve a 'En tramite'.

alter table public.pacientes drop constraint if exists pacientes_reprocann_estado_check;
alter table public.pacientes add constraint pacientes_reprocann_estado_check
  check (reprocann_estado = any (array['Vigente','En tramite','Vencido','Rechazado','Sin registro']));
update public.pacientes
   set reprocann_estado = 'Sin registro'
 where reprocann_estado = 'En tramite'
   and (reprocann_nro is null or btrim(reprocann_nro) = '');
-- LA MATRIZ
--
-- `reprocann` nullable a proposito: las filas historicas quedan en NULL porque
-- el criterio viejo NO distinguia por REPROCANN. Sin eso, un recibo de 2025 no
-- se podria explicar con la tabla. La busqueda prefiere la fila que matchea
-- nivel + reprocann y cae a la de nivel + NULL si no hay.
alter table public.ong_tarifas
  add column if not exists reprocann text
    check (reprocann is null or reprocann in ('si','tramite','no'));
alter table public.ong_tarifas drop constraint if exists ong_tarifas_nivel_vigente_desde_key;
drop index if exists ong_tarifas_combo_uk;
create unique index if not exists ong_tarifas_combo_uk
  on public.ong_tarifas (nivel, coalesce(reprocann,'-'), vigente_desde);
comment on column public.ong_tarifas.reprocann is
  'si = vigente · tramite = iniciado (tiene numero) · no = sin registro. NULL = fila del criterio viejo, que no distinguia.';

-- ═══ de 20260820000011_pagos_proveedor.sql ═══
-- La deuda con proveedores, consultable (hueco encontrado en la auditoria).
--
-- SOLO PARA LA BASE DE PANACEA.
--
-- EL PROBLEMA
-- La hoja `PAGO PROVEEDORES` (157 filas) es la unica fuente que liga PAGO con
-- ORDEN DE SERVICIO, y no se estaba leyendo. En la base quedo asi:
--
--   112 ordenes de servicio cargadas
--    55 con "SALDO PENDIENTE $X" escrito ADENTRO de la descripcion
--     0 columnas de saldo consultables
--     0 asientos de caja identificables como pago a proveedor
--
-- O sea: la plata esta en `ong_caja`, pero no se puede preguntar "cuanto le
-- debemos a tal proveedor". El saldo quedo en un texto, que sirve para leerlo de
-- a uno y para nada mas. Con $57.616.000 de compras y 20 proveedores, es el
-- hueco mas grande que quedaba.
--
-- POR QUE UNA TABLA DE PAGOS Y NO UNA COLUMNA `pagado`
-- Una orden se paga en varias veces —para eso existe la columna PAGO PARCIAL en
-- la planilla—. Con una columna `pagado` habria que mantenerla sincronizada a
-- mano y se desincroniza al primer pago que alguien corrija. Con una fila por
-- pago, el saldo se CALCULA y no puede mentir. Mismo criterio que el VPD y la
-- capacidad del area.

create table if not exists public.ong_pagos_proveedor (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid(),
  -- Se liga por el NUMERO de la orden (OS112), no por id: es lo que la planilla
  -- tiene y lo que la gente dice. `ong_documentos.numero` guarda ese mismo
  -- texto. Un pago puede llegar antes que su orden, y esto lo tolera.
  orden_servicio text,
  proveedor      text,
  fecha          date not null,
  monto          numeric(14,2) not null check (monto > 0),
  medio          text,
  -- ID Pago de la planilla: es la marca de idempotencia contra el reenvio.
  referencia     text,
  notas          text,
  creado_en      timestamptz not null default now()
);
create index if not exists ong_pagos_prov_os_idx   on public.ong_pagos_proveedor (orden_servicio);
create index if not exists ong_pagos_prov_prov_idx on public.ong_pagos_proveedor (proveedor);
create index if not exists ong_pagos_prov_fecha_idx on public.ong_pagos_proveedor (fecha desc);
-- Saldo POR ORDEN DE SERVICIO. Se calcula, no se guarda.
create or replace view public.v_saldo_ordenes as
select d.numero                                   as orden_servicio,
       d.proveedor,
       d.fecha,
       d.monto                                    as total,
       coalesce(sum(p.monto), 0)                  as pagado,
       d.monto - coalesce(sum(p.monto), 0)        as saldo,
       count(p.id)                                as pagos
  from public.ong_documentos d
  left join public.ong_pagos_proveedor p on p.orden_servicio = d.numero
 where d.numero is not null and d.numero <> '' and d.monto is not null
 group by d.numero, d.proveedor, d.fecha, d.monto;
-- Saldo POR PROVEEDOR: la pregunta que hoy no se puede hacer.
create or replace view public.v_saldo_proveedores as
select coalesce(proveedor, 'Sin proveedor')       as proveedor,
       count(*)                                    as ordenes,
       sum(total)                                  as comprado,
       sum(pagado)                                 as pagado,
       sum(saldo)                                  as saldo,
       count(*) filter (where saldo > 0)           as ordenes_con_saldo
  from public.v_saldo_ordenes
 group by 1;
alter table public.ong_pagos_proveedor enable row level security;
-- Patron de `ong_caja`: es informacion economica, la ve todo rol real y la
-- escriben los que manejan plata.
drop policy if exists ong_pagos_prov_ver on public.ong_pagos_proveedor;
create policy ong_pagos_prov_ver on public.ong_pagos_proveedor
  for select using (mi_rol() <> all (array['sin_perfil','demo']));
drop policy if exists ong_pagos_prov_escribir on public.ong_pagos_proveedor;
create policy ong_pagos_prov_escribir on public.ong_pagos_proveedor
  for all
  using      (mi_rol() = any (array['administrador','administrativo']))
  with check (mi_rol() = any (array['administrador','administrativo']));

-- ═══ de 20260820000012_vistas_saldo_security_invoker.sql ═══
-- Cerrar las dos vistas de saldo, que nacieron abiertas.
--
-- SOLO PARA LA BASE DE PANACEA.
--
-- Una vista en Postgres corre con los permisos de SU DUENO, no del que la
-- consulta: sin `security_invoker` se saltea el RLS de `ong_documentos` y
-- `ong_pagos_proveedor`. Y PostgREST le da SELECT a `anon` por defecto.
--
-- O sea que la deuda con proveedores —$32M, 20 proveedores— quedaba legible SIN
-- AUTENTICAR. Aparecio al ir a leer las vistas desde la app, en el commit
-- siguiente al que las creo.
--
-- LA REGLA: crear una vista NO es como crear una tabla. Una tabla nueva sin
-- policies no la lee nadie; una vista nueva la lee cualquiera. Toda vista sobre
-- datos con RLS necesita las dos lineas de abajo, y hay que verificarlo con
-- has_table_privilege('anon', ...) despues de crearla.

alter view public.v_saldo_ordenes     set (security_invoker = on);
alter view public.v_saldo_proveedores set (security_invoker = on);
revoke all on public.v_saldo_ordenes     from anon;
revoke all on public.v_saldo_proveedores from anon;
grant select on public.v_saldo_ordenes     to authenticated;
grant select on public.v_saldo_proveedores to authenticated;

-- ═══ de 20260820000013_campos_sueltos.sql ═══
-- C3 (codigo de paciente) y C4 (sub-fase). Los dos ultimos de la orden de trabajo.
--
-- SOLO PARA LA BASE DE PANACEA.
--
-- C3 -- `pacientes` no tenia campo de codigo, asi que el PAC-001 no tenia donde
-- ir y termino viviendo en `notas`, como prefijo antes de un `|`. Eso obliga a
-- que TODO el que quiera el codigo haga split_part(notas,'|',1) —lo hacen la
-- Edge Function, el trigger y media consulta que escribi hoy— y deja el dato
-- expuesto a que alguien edite las notas y lo borre sin darse cuenta.
--
-- ORDEN IMPORTANTE: la Edge Function ya se deployo leyendo `codigo` con
-- fallback a `notas`, ANTES de esta migracion. Si se hiciera al reves, entre el
-- momento de limpiar las notas y el de redeployar la funcion, las dispensas
-- entrarian sin poder vincular a su paciente.

alter table public.pacientes
  add column if not exists codigo text;
create unique index if not exists pacientes_codigo_uk
  on public.pacientes (codigo) where codigo is not null;
comment on column public.pacientes.codigo is
  'PAC-XXX. Antes vivia como prefijo de `notas`; se mudo aca para que no dependa de que nadie edite ese texto.';
-- 1. Mudar el codigo de notas a su columna.
update public.pacientes
   set codigo = btrim(split_part(notas, '|', 1))
 where codigo is null
   and notas ~ '^\s*PAC-\d+';
-- 2. Sacar el prefijo de notas. Lo que queda es lo que siempre fue: el texto
--    crudo del formulario.
update public.pacientes
   set notas = nullif(btrim(substr(notas, strpos(notas, '|') + 1)), '')
 where codigo is not null
   and notas ~ '^\s*PAC-\d+\s*\|';
-- 3. El trigger pasa a escribir la columna. Sigue respetando el que ya viene
--    cargado y sigue serializado con el advisory lock: dos altas simultaneas no
--    pueden llevarse el mismo numero.
create or replace function public.asignar_codigo_paciente()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  proximo int;
begin
  if coalesce(new.codigo, '') ~ '^\s*PAC-\d+' then
    return new;
  end if;

  -- Compatibilidad: si alguien todavia manda el codigo dentro de notas, se
  -- respeta y se mueve a su lugar en vez de asignar uno nuevo.
  if coalesce(new.notas, '') ~ '^\s*PAC-\d+' then
    new.codigo := btrim(split_part(new.notas, '|', 1));
    new.notas  := nullif(btrim(substr(new.notas, strpos(new.notas, '|') + 1)), '');
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('pacientes_codigo'));

  select coalesce(max(nullif(regexp_replace(codigo, '\D', '', 'g'), '')::int), 0) + 1
    into proximo
    from public.pacientes
   where codigo ~ '^\s*PAC-\d+';

  new.codigo := 'PAC-' || lpad(proximo::text, 3, '0');
  return new;
end;
$$;
-- C4 -- La sub-fase. Columna suelta y NO una fase nueva: FASES_COSECHABLES y
-- media app razonan sobre `fase`, y meter variantes ahi obligaria a revisar
-- cada comparacion. Como sub-fase suma cuando esta y no molesta cuando falta.
alter table public.plantas
  add column if not exists subfase text;
comment on column public.plantas.subfase is
  'Detalle dentro de la fase: "Temprano", "Engorde", "Lavado". Opcional. Ver SUBFASES en app/src/lib/cultivo.ts.';

-- ═══ de 20260821000001_orden_lote.sql ═══
-- Ligar cada orden de servicio con su lote.
--
-- SOLO PARA LA BASE DE PANACEA.
--
-- Aparecio revisando la hoja INGRESOS. Esa hoja tiene columnas separadas para
-- Producto/Servicio, Lote, Cantidad, Costo Unitario y SALDO, y el mapper del
-- Apps Script las aplasta TODAS dentro de `descripcion`:
--
--   "MPK - lote MPK-L3112 - 25 gr/ud a $7000 c/u - SALDO PENDIENTE $..."
--
-- El saldo ya se rescato con `ong_pagos_proveedor` y las vistas. Lo que seguia
-- perdido era el lote: con el codigo adentro de una oracion no se puede
-- preguntar de que orden vino un lote, que es LA pregunta de trazabilidad.
--
-- El texto se recupera sin ambiguedad: de las 124 ordenes, 115 tienen codigo de
-- lote y las 115 matchean un lote real. Cero huerfanos.

alter table public.ong_documentos
  add column if not exists lote_codigo text;
comment on column public.ong_documentos.lote_codigo is
  'Lote que trajo esta orden de servicio. Cruza contra ong_lotes.codigo.';
-- Backfill desde la descripcion. Solo escribe donde matchea un lote que EXISTE:
-- un codigo suelto que no corresponde a nada es peor que no tener nada.
update public.ong_documentos d
   set lote_codigo = l.codigo
  from public.ong_lotes l
 where d.categoria = 'Aprovisionamiento'
   and d.lote_codigo is null
   and l.codigo = nullif(btrim((regexp_match(d.descripcion, 'lote\s+([^·|]+?)\s*(·|$)'))[1]), '');
create index if not exists ix_ong_documentos_lote on public.ong_documentos (lote_codigo);
-- La vista pasa a mostrarlo, asi la pantalla no vuelve a parsear texto.
--
-- Se respeta la definicion que ya estaba: el WHERE filtra por `numero` no vacio
-- (NO por categoria) y el GROUP BY mantiene separadas dos ordenes que compartan
-- numero pero difieran en fecha o monto. Cambiar eso aca seria meter un cambio
-- de semantica de contrabando en una migracion que agrega una columna.
--
-- OJO, BUG PREEXISTENTE QUE NO SE TOCA: el join de pagos es por `numero`, asi
-- que si un numero esta repetido, los pagos se cuentan una vez POR CADA fila.
-- Hoy no rompe nada porque el unico repetido (OS38) tiene cero pagos, pero el
-- dia que le paguen el `pagado` va a salir duplicado. El cruce nuevo de
-- Coherencia avisa del numero repetido; arreglar la vista necesita antes que
-- Panacea decida si son dos ordenes distintas o una cargada dos veces.
-- ⚠️ CASCADE, y no por comodidad: `v_saldo_proveedores` (creada en
-- 20260820000011) depende de esta vista, asi que un drop pelado falla con
-- «cannot drop view ... because other objects depend on it». En la base de
-- origen no se noto porque la vista ya existia con la forma nueva y este drop
-- nunca llego a correr de verdad. En una instalacion desde cero, rompe.
--
-- La dependiente se recrea al final de este archivo.
drop view if exists public.v_saldo_ordenes cascade;
create view public.v_saldo_ordenes
with (security_invoker = on) as
 SELECT d.numero AS orden_servicio,
    d.proveedor,
    d.fecha,
    d.lote_codigo,
    d.monto AS total,
    COALESCE(sum(p.monto), 0::numeric) AS pagado,
    d.monto - COALESCE(sum(p.monto), 0::numeric) AS saldo,
    count(p.id) AS pagos
   FROM public.ong_documentos d
     LEFT JOIN public.ong_pagos_proveedor p ON p.orden_servicio = d.numero
  WHERE d.numero IS NOT NULL AND d.numero <> ''::text AND d.monto IS NOT NULL
  GROUP BY d.numero, d.proveedor, d.fecha, d.lote_codigo, d.monto;
revoke all on public.v_saldo_ordenes from anon;
-- `v_saldo_proveedores` se la llevo el cascade de arriba. Se recrea con la
-- misma definicion que tenia en 20260820000011; 20260824040000 la vuelve a
-- reemplazar mas adelante, asi que el estado final es el mismo.
create or replace view public.v_saldo_proveedores
with (security_invoker = on) as
with de_ordenes as (
  select coalesce(proveedor, 'Sin proveedor') as proveedor,
         count(*) as ordenes,
         sum(total) as comprado,
         sum(pagado) as pagado,
         sum(saldo) as saldo,
         count(*) filter (where saldo > 0) as ordenes_con_saldo
    from public.v_saldo_ordenes
   group by coalesce(proveedor, 'Sin proveedor')
), de_lotes as (
  select distinct btrim(proveedor) as proveedor
    from public.ong_lotes
   where proveedor is not null and btrim(proveedor) <> ''
)
select coalesce(o.proveedor, l.proveedor) as proveedor,
       coalesce(o.ordenes, 0) as ordenes,
       coalesce(o.comprado, 0) as comprado,
       coalesce(o.pagado, 0) as pagado,
       coalesce(o.saldo, 0) as saldo,
       coalesce(o.ordenes_con_saldo, 0) as ordenes_con_saldo
  from de_ordenes o
  full join de_lotes l on l.proveedor = o.proveedor;
revoke all on public.v_saldo_proveedores from anon;
grant select on public.v_saldo_proveedores to authenticated;

-- ═══ de 20260821190000_lote_en_los_traslados.sql ═══
-- Los traslados dicen QUE material movieron.
-- SOLO PARA LA BASE DE PANACEA.
--
-- El pack de plantillas pide `{{lotes_geneticas_detalle}}` en la guia de
-- transito interno, y `{{producto_lote_codigo}}` en la DDJJ de transporte a
-- domicilio. `ong_traslados` no tenia de donde sacarlo: guardaba fecha, origen,
-- destino, tipo de material y cantidad, pero no que lote viajaba.
--
-- Una guia de transito que no dice que lote se movio no sirve para lo unico
-- para lo que existe. Si una inspeccion pregunta de donde salio el material que
-- esta en la sede, la respuesta tiene que poder seguirse hasta el lote; con
-- "40 g de flores" no se sigue a ningun lado.
--
-- EL DATO SE DERIVA, NO SE PIDE. `20260821060000_traslados_desde_ordenes` armo
-- los 102 viajes agrupando las ordenes de servicio por (proveedor, fecha).
-- Esas mismas ordenes tienen `lote_codigo`, asi que el vinculo ya existia: se
-- reagrupa con el mismo criterio con el que se creo el traslado. No es un match
-- aproximado, es la misma clave.
--
-- LA COLUMNA ES PLURAL. Un viaje puede traer varios lotes: cuando el proveedor
-- mando dos ordenes el mismo dia, viajaron juntas. Hay 10 traslados con mas de
-- un lote y el maximo es 4. Guardar un solo `lote_codigo` obligaria a elegir
-- uno y esconder los otros tres.
--
-- Se guarda el texto de los codigos y no una tabla puente porque es lo que se
-- imprime, y porque `ong_traslados` se edita a mano desde la pantalla: un
-- traslado cargado por el operador puede llevar lotes que no vienen de ninguna
-- orden.
--
-- LOS 6 QUE QUEDAN VACIOS. Tienen orden de servicio pero la orden no tiene
-- lote: son servicios y deudas, no compra de material. No se les inventa uno.
--
-- RESULTADO: 0 -> 96 traslados con su lote (86 con uno solo, 10 con varios).
alter table public.ong_traslados
  add column if not exists lotes text;
comment on column public.ong_traslados.lotes is
  'Codigos de lote que viajaron, separados por coma. Plural porque un viaje '
  'puede traer varias ordenes del mismo proveedor el mismo dia.';
update public.ong_traslados t
set lotes = s.lotes
from (
  select d.fecha, d.proveedor,
         string_agg(distinct d.lote_codigo, ', ' order by d.lote_codigo) lotes
    from public.ong_documentos d
   where d.categoria = 'Aprovisionamiento'
     and d.lote_codigo is not null
     and d.proveedor is not null
   group by d.fecha, d.proveedor
) s
where t.lotes is null
  and t.fecha = s.fecha
  and t.origen = s.proveedor;

-- ═══ de 20260821200000_numerar_recibos_al_emitir.sql ═══
-- Numeracion de recibos: correlativa, atomica, y asignada al EMITIR.
-- SOLO PARA LA BASE DE PANACEA.
--
-- `ong_dispensas.recibo_numero` esta en NULL en las 1.241, asi que el recibo
-- sale con "RECIBO OFICIAL NO COMERCIAL N° [numero]" en las 1.241.
--
-- POR QUE NO SE NUMERAN LAS 1.241 DE UNA. Un numero de recibo no es un dato que
-- se descubre: es un identificador que la entidad asigna cuando emite el papel.
-- Numerar las 1.241 hacia atras seria declarar que se emitieron 1.241 recibos
-- correlativos que nunca existieron, y ademas fabricar la evidencia de una
-- numeracion prolija que no ocurrio. Eso es exactamente lo que el resto de este
-- repo se niega a hacer.
--
-- LO QUE SI SE PUEDE: que el numero salga cuando el recibo se emite de verdad.
-- Una dispensa vieja de la que hoy se necesita el papel se numera hoy, y a
-- partir de ahi ese numero es suyo para siempre.
--
-- POR QUE UNA SECUENCIA Y NO max(recibo_numero) + 1. Dos personas emitiendo al
-- mismo tiempo con max+1 se llevan el mismo numero, y dos recibos con el mismo
-- numero es peor que ninguno numerado: rompe justamente la garantia por la que
-- un recibo se numera. `nextval` es atomico.
--
-- El indice unico es el cinturon: aunque alguien escriba el numero a mano desde
-- la pantalla, la base no deja que se repita. Es parcial (where not null)
-- porque los 1.241 NULL de hoy tienen que poder convivir.
--
-- LA SECUENCIA ARRANCA EN 1. Si Panacea ya tiene un talonario en papel empezado,
-- hay que correrla ANTES de emitir el primero:
--     select setval('public.ong_recibo_seq', <ultimo numero usado>);
-- Si no, el primer recibo de la app va a chocar con uno que ya existe en papel.
create sequence if not exists public.ong_recibo_seq as integer start 1;
create unique index if not exists ong_dispensas_recibo_numero_uk
  on public.ong_dispensas (recibo_numero)
  where recibo_numero is not null;
-- Idempotente a proposito: si la dispensa ya tiene numero devuelve el que
-- tiene, sin consumir uno nuevo. Reabrir un recibo emitido no puede
-- renumerarlo, y tocar el boton dos veces no puede quemar dos numeros.
create or replace function public.asignar_numero_recibo(p_dispensa uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  -- `security definer` saltea RLS, asi que el permiso se chequea a mano: sin
  -- esto cualquier usuario logueado podria numerar recibos.
  if mi_rol() not in ('administrador', 'administrativo') then
    raise exception 'Sin permiso para emitir recibos';
  end if;

  select recibo_numero into n from ong_dispensas where id = p_dispensa for update;
  if not found then
    raise exception 'No existe la dispensa %', p_dispensa;
  end if;
  if n is not null then
    return n;
  end if;

  n := nextval('ong_recibo_seq');
  update ong_dispensas set recibo_numero = n where id = p_dispensa;
  return n;
end;
$$;
revoke all on function public.asignar_numero_recibo(uuid) from public;
grant execute on function public.asignar_numero_recibo(uuid) to authenticated;

-- ═══ de 20260822210000_solicitudes_de_alta.sql ═══
-- Solicitudes de alta: la puerta publica para sumarse a la asociacion.
--
-- EL PROBLEMA
--
-- Hoy /sumate muestra tres links y nada mas. Quien los completa queda sin saber
-- si su formulario llego, si lo dieron de alta, o si tiene que esperar. Vuelve a
-- entrar y ve exactamente lo mismo. Del otro lado, quien atiende tipea la ficha
-- a mano desde lo que le llego por otro canal.
--
-- LA FORMA, Y POR QUE ES ASI
--
-- Esta es la UNICA escritura publica de todo el sistema, contra una base con
-- 211 pacientes reales y datos de salud. El diseño arranca de ahi:
--
--   1. `anon` NO tiene acceso a la tabla. Ni select, ni insert, ni nada. Se
--      revoca explicito ademas de no darle policy, porque una policy que
--      alguien agregue despues por comodidad abriria la tabla entera.
--
--   2. La unica puerta son dos funciones `security definer` de superficie
--      minima: una crea, la otra devuelve el estado de UNA solicitud a quien
--      tenga su token. Nada mas.
--
--   3. `solicitud_estado` NO devuelve el DNI. Si el link se reenvia o queda en
--      un historial compartido, lo que se expone es un nombre y un estado, no
--      un documento.
--
--   4. NO existe «busca mi solicitud por DNI». Seria un buscador publico que
--      confirma quien es paciente de cannabis de la asociacion: con probar
--      documentos se arma el padron. El token se entrega UNA vez, en el momento
--      de crear la solicitud, a quien la crea.
--
-- Lo que NO defiende: alguien puede crear solicitudes basura con documentos
-- inventados. Sin captcha ni edge function no hay forma de distinguirlas. Se
-- acotan con los dos frenos de abajo; lo que queda es ruido en una bandeja, no
-- una fuga.

create table if not exists public.ong_solicitudes (
  id              uuid primary key default gen_random_uuid(),
  -- El secreto. Va indexado y unico: es por donde entra la persona.
  token           text not null unique,
  nombre          text not null,
  dni             text not null,
  email           text,
  telefono        text,
  notas           text,
  estado          text not null default 'pendiente'
                  check (estado in ('pendiente', 'en_revision', 'aceptada', 'rechazada')),
  -- Por que se rechazo, para poder decirselo a la persona en su propia pantalla.
  motivo          text,
  -- Con que ficha quedo resuelta, cuando se acepta.
  paciente_id     uuid references public.pacientes(id) on delete set null,
  asociado_id     uuid references public.ong_asociados(id) on delete set null,
  creada_en       timestamptz not null default now(),
  actualizada_en  timestamptz not null default now(),
  revisada_por    uuid references auth.users(id) on delete set null
);
comment on table public.ong_solicitudes is
  'Solicitudes de alta que entran por /sumate. Unica escritura publica del sistema: anon solo llega por solicitud_crear() y solicitud_estado().';
create index if not exists ong_solicitudes_estado_idx
  on public.ong_solicitudes (estado, creada_en desc);
create index if not exists ong_solicitudes_dni_idx
  on public.ong_solicitudes (dni);
alter table public.ong_solicitudes enable row level security;
-- Del lado de adentro, los mismos roles que el resto de la O.N.G.
drop policy if exists ong_solicitudes_ver on public.ong_solicitudes;
create policy ong_solicitudes_ver on public.ong_solicitudes
  for select to authenticated
  using (mi_rol() = any (array['administrador', 'director_medico', 'administrativo', 'auditor']));
drop policy if exists ong_solicitudes_escribir on public.ong_solicitudes;
create policy ong_solicitudes_escribir on public.ong_solicitudes
  for all to authenticated
  using (mi_rol() = any (array['administrador', 'director_medico', 'administrativo']))
  with check (mi_rol() = any (array['administrador', 'director_medico', 'administrativo']));
-- Explicito, no por omision. Ver el punto 1 del encabezado.
revoke all on public.ong_solicitudes from anon;
-- ---------------------------------------------------------------------------
-- Crear una solicitud. Devuelve el token, UNA sola vez.
-- ---------------------------------------------------------------------------
create or replace function public.solicitud_crear(
  p_nombre   text,
  p_dni      text,
  p_email    text default null,
  p_telefono text default null,
  p_notas    text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_dni    text;
  v_token  text;
  v_ultima timestamptz;
begin
  v_nombre := btrim(coalesce(p_nombre, ''));
  -- Solo digitos: «12.345.678» y «12345678» son el mismo documento, y guardar
  -- las dos formas rompe el chequeo de duplicados de abajo.
  v_dni := regexp_replace(coalesce(p_dni, ''), '\D', '', 'g');

  if length(v_nombre) < 3 then
    raise exception 'Falta el nombre y apellido';
  end if;
  if length(v_dni) < 7 or length(v_dni) > 9 then
    raise exception 'El documento no parece valido';
  end if;

  -- Freno 1: la misma persona, de nuevo. Es sobre todo contra el doble clic y
  -- contra quien reenvia el formulario porque no supo si llego.
  select creada_en into v_ultima
    from ong_solicitudes
   where dni = v_dni
     and estado in ('pendiente', 'en_revision')
     and creada_en > now() - interval '24 hours'
   limit 1;
  if found then
    raise exception 'Ya hay una solicitud en curso con ese documento, del %. Usá el link que te dimos para ver como va.',
      to_char(v_ultima, 'DD/MM/YYYY');
  end if;

  -- Freno 2: el techo por hora. No impide el abuso decidido —para eso hace
  -- falta un captcha— pero acota cuanto puede crecer la bandeja en un rato.
  if (select count(*) from ong_solicitudes
       where creada_en > now() - interval '1 hour') >= 40 then
    raise exception 'Hay demasiadas solicitudes en curso. Probá de nuevo en un rato.';
  end if;

  -- Dos uuid v4 pegados: 244 bits de azar, sin depender de pgcrypto. Adivinar
  -- un token no es una via de entrada.
  v_token := replace(gen_random_uuid()::text, '-', '')
          || replace(gen_random_uuid()::text, '-', '');

  insert into ong_solicitudes (token, nombre, dni, email, telefono, notas)
  values (
    v_token, v_nombre, v_dni,
    nullif(btrim(coalesce(p_email, '')), ''),
    nullif(btrim(coalesce(p_telefono, '')), ''),
    nullif(btrim(coalesce(p_notas, '')), '')
  );

  return v_token;
end;
$$;
-- ---------------------------------------------------------------------------
-- Como va MI solicitud. Solo para quien tenga el token.
-- ---------------------------------------------------------------------------
--
-- Devuelve tambien el codigo de vinculacion de la entidad, que es el dato que
-- la persona necesita para designarla en REPROCANN: es el paso donde se traba
-- el alta, y hasta ahora se lo pasaban por WhatsApp de memoria. No es un
-- secreto — es un numero que la asociacion reparte a proposito.
--
-- Sin token valido devuelve CERO filas. No dice «no existe»: dice nada.
create or replace function public.solicitud_estado(p_token text)
returns table (
  estado             text,
  nombre             text,
  creada_en          timestamptz,
  actualizada_en     timestamptz,
  motivo             text,
  entidad            text,
  codigo_vinculacion text
)
language sql
security definer
set search_path = public
stable
as $$
  select s.estado, s.nombre, s.creada_en, s.actualizada_en, s.motivo,
         e.razon_social, e.codigo_vinculacion
    from ong_solicitudes s
    left join lateral (
      select razon_social, codigo_vinculacion from ong_entidad limit 1
    ) e on true
   where s.token = p_token
     -- Un token vacio o de largo raro no puede pescar la primera fila.
     and length(coalesce(p_token, '')) = 64;
$$;
revoke all on function public.solicitud_crear(text, text, text, text, text) from public;
grant execute on function public.solicitud_crear(text, text, text, text, text) to anon, authenticated;
revoke all on function public.solicitud_estado(text) from public;
grant execute on function public.solicitud_estado(text) to anon, authenticated;

-- ═══ de 20260823210000_mandato_firmado_al_sumarse.sql ═══
-- El Mandato de Gestion Operativa, firmado en el momento de sumarse.
--
-- EL PROBLEMA
--
-- Al 23/08/2026 hay 209 asociados activos y CERO con el mandato firmado. No es
-- un papel mas: es el que sostiene que lo que la persona paga es el reembolso
-- del costo de un cultivo hecho por su cuenta, y no la compra de un producto.
-- Sin el, la regla RN-03 marca error en cada entrega, con este texto:
--
--     «Sin el, la entrega no tiene respaldo para sostener que es un reembolso
--      de costos y no una compraventa.»
--
-- Las columnas para guardarlo YA EXISTEN en ong_asociados —mandato_aceptado,
-- mandato_fecha, mandato_hora, ip_firma_mandato, mandato_version— desde que se
-- modelo la tabla. Nunca se uso porque no habia donde firmarlo: el alta la
-- tipeaba alguien a mano desde lo que le llegaba por otro canal.
--
-- Ahora que /sumate recibe la solicitud, el momento natural de firmarlo es ese:
-- la persona lo lee y lo acepta cuando pide el alta, y queda con fecha, hora y
-- version. Al aprobarse la solicitud, eso se copia al asociado.
--
-- LA FORMA, Y POR QUE ES ASI
--
-- Se mantiene todo lo que decidio la migracion de solicitudes: `anon` NO toca
-- la tabla, la unica puerta sigue siendo solicitud_crear(), y solicitud_estado()
-- sigue sin devolver el DNI. Lo unico que cambia es que la funcion acepta dos
-- datos mas.
--
-- LA VERSION DEL TEXTO SE GUARDA, y no es un detalle: si el mandato se
-- reescribe, quien firmo la version vieja firmo OTRA cosa. Sin el numero de
-- version no hay forma de saber despues que acepto cada persona.
--
-- LA IP NO SE PIDE ACA. La funcion corre en la base y ve la IP del pooler, no
-- la de la persona: guardarla seria guardar un dato falso con apariencia de
-- prueba. Queda en null hasta que haya un borde (Edge Function) que la vea de
-- verdad.

-- ---------------------------------------------------------------------------
-- 1 . La solicitud guarda lo que la persona acepto
-- ---------------------------------------------------------------------------

alter table public.ong_solicitudes
  add column if not exists mandato_aceptado boolean not null default false,
  add column if not exists mandato_version  text,
  add column if not exists mandato_fecha    timestamptz;
comment on column public.ong_solicitudes.mandato_aceptado is
  'Si la persona acepto el Mandato de Gestion Operativa al pedir el alta.';
comment on column public.ong_solicitudes.mandato_version is
  'Que version del texto acepto. Sin esto no se sabe QUE firmo si el mandato se reescribe.';
-- ---------------------------------------------------------------------------
-- 2 . solicitud_crear acepta la firma
--
-- Los dos parametros van AL FINAL y con default, asi la firma vieja de la
-- funcion sigue andando: un cliente todavia no desplegado la puede llamar sin
-- ellos y no se rompe nada.
-- ---------------------------------------------------------------------------

-- Se DROPEA la de cinco parametros antes de crear la de siete, y no es opcional:
-- Postgres sobrecarga por firma, asi que `create or replace` con dos parametros
-- mas no reemplaza a la vieja, crea otra al lado. Con las dos vivas, una llamada
-- de cinco argumentos queda ambigua —los nuevos tienen default— y la base
-- responde «function is not unique». Ademas la vieja no guarda la firma, asi que
-- todo cliente que quedara apuntandole daria de alta sin mandato en silencio.
drop function if exists public.solicitud_crear(text, text, text, text, text);
create or replace function public.solicitud_crear(
  p_nombre   text,
  p_dni      text,
  p_email    text default null,
  p_telefono text default null,
  p_notas    text default null,
  p_mandato_aceptado boolean default false,
  p_mandato_version  text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if coalesce(btrim(p_nombre), '') = '' then
    raise exception 'Hace falta el nombre';
  end if;
  if coalesce(btrim(p_dni), '') = '' then
    raise exception 'Hace falta el DNI';
  end if;

  v_token := encode(gen_random_bytes(24), 'hex');

  insert into public.ong_solicitudes
    (token, nombre, dni, email, telefono, notas, estado,
     mandato_aceptado, mandato_version, mandato_fecha)
  values
    (v_token, btrim(p_nombre), btrim(p_dni), nullif(btrim(p_email), ''),
     nullif(btrim(p_telefono), ''), nullif(btrim(p_notas), ''), 'pendiente',
     coalesce(p_mandato_aceptado, false),
     nullif(btrim(p_mandato_version), ''),
     -- La fecha la pone la base, no el cliente: una fecha de firma que manda
     -- quien firma no prueba nada.
     case when coalesce(p_mandato_aceptado, false) then now() else null end);

  return v_token;
end;
$$;
revoke all on function public.solicitud_crear(text, text, text, text, text, boolean, text) from public;
grant execute on function public.solicitud_crear(text, text, text, text, text, boolean, text) to anon, authenticated;
-- ---------------------------------------------------------------------------
-- 3 . Al aprobar la solicitud, la firma viaja al asociado
--
-- Es un trigger y no codigo del cliente a proposito: la firma tiene que llegar
-- al asociado por el mismo camino SIEMPRE, se apruebe desde la bandeja, desde
-- el alta automatica, o a mano por SQL.
-- ---------------------------------------------------------------------------

create or replace function public.solicitud_pasar_mandato()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.asociado_id is not null
     and new.mandato_aceptado
     and (old.asociado_id is distinct from new.asociado_id)
  then
    update public.ong_asociados
       set mandato_aceptado = true,
           mandato_fecha    = coalesce(new.mandato_fecha::date, current_date),
           mandato_hora     = coalesce(new.mandato_fecha::time, current_time),
           mandato_version  = new.mandato_version
     where id = new.asociado_id
       -- Nunca pisar una firma que ya esta: si el asociado ya firmo, esa firma
       -- es la buena y la de la solicitud es vieja.
       and coalesce(mandato_aceptado, false) = false;
  end if;
  return new;
end;
$$;
drop trigger if exists solicitud_pasar_mandato_tg on public.ong_solicitudes;
create trigger solicitud_pasar_mandato_tg
  after update on public.ong_solicitudes
  for each row
  execute function public.solicitud_pasar_mandato();

-- ═══ de 20260823230000_rinde_esperado_y_director_tecnico.sql ═══
-- El rinde esperado por planta, y quien lo declara.
--
-- La cadena de justificacion no puede juzgar la biomasa sin este numero: con
-- tantas plantas en floracion y tanto rinde por planta se sabe cuanto material
-- puede haber salido del cultivo. Sin el, el eslabon dice «no se puede saber»,
-- que es la verdad pero no sirve para nada.
--
-- LO DECLARA EL DIRECTOR TECNICO DE CULTIVO, que es una figura distinta del
-- Director Medico que la app ya tenia: el medico firma los informes clinicos
-- semestrales de los pacientes, el tecnico responde por el cultivo. Son dos
-- roles y hasta ahora solo estaba modelado uno.
--
-- Queda en NULL a proposito. Un rinde por defecto seria el sistema declarando
-- en nombre del DT algo que solo el puede firmar, y el numero que sale de ahi
-- es el que decide si la biomasa cierra o no.

alter table public.ong_entidad
  add column if not exists rinde_esperado_planta_g numeric,
  add column if not exists director_tecnico        text,
  add column if not exists director_tecnico_matricula text;
comment on column public.ong_entidad.rinde_esperado_planta_g is
  'Gramos que se espera de cada planta en floracion. Lo declara el Director Tecnico de cultivo. NULL = todavia no declarado, y la cadena lo dice en vez de estimarlo.';
comment on column public.ong_entidad.director_tecnico is
  'Director Tecnico de CULTIVO. Distinto del Director Medico, que firma los informes clinicos.';

-- ═══ de 20260824030000_origen_regularizacion_en_lotes.sql ═══
-- Un ajuste de inventario no es una compra, y hasta ahora habia que disfrazarlo
-- de una.
--
-- `ong_lotes.origen` solo aceptaba 'propio' o 'comprado'. Cuando aparece
-- material que ya se entrego y cuyo ingreso no quedo documentado —el 24/08/2026
-- fueron 1.684,5 g, al completar 107 entregas cargadas con el aporte cobrado y
-- la cantidad en cero— no hay forma honesta de registrarlo con esas dos
-- opciones: 'propio' diria que salio del cultivo, y 'comprado' diria que se le
-- compro a alguien. Las dos serian falsas, y la segunda ademas obliga a
-- inventar un proveedor.
--
-- 'regularizacion' dice lo unico que se sabe de verdad: que ese material estuvo,
-- y que su ingreso no esta documentado. Declarar el hueco es lo que se espera de
-- quien ordena sus registros; taparlo con un proveedor que no se puede
-- verificar es lo contrario, y deja peor parada a la asociacion que el hueco.
--
-- Para el BALANCE DE MATERIA sigue contando como ingreso —el material existio y
-- se entrego— y por eso `loteEsComprado` lo toma igual: mira que no sea 'propio'
-- y que no tenga cosecha, y eso no cambia.

alter table public.ong_lotes drop constraint if exists ong_lotes_origen_check;
alter table public.ong_lotes add constraint ong_lotes_origen_check
  check (origen = any (array['propio'::text, 'comprado'::text, 'regularizacion'::text]));
comment on column public.ong_lotes.origen is
  'propio = salio del cultivo. comprado = se le compro a un proveedor. regularizacion = material que estuvo y cuyo ingreso no quedo documentado; NO se le inventa proveedor.';

-- ═══ de 20260824040000_proveedores_incluye_los_de_lotes.sql ═══
-- La lista de proveedores mostraba solo a quienes se les compro CON ORDEN.
--
-- v_saldo_proveedores salia de v_saldo_ordenes, que sale de los documentos con
-- numero de orden. Un proveedor del que entro material pero cuyo comprobante
-- nunca se cargo NO aparecia en ningun lado: el 24/08/2026 fue el caso de Tanex,
-- que tiene el lote TANEX-L01 con 22 g y ninguna orden.
--
-- Eso es un hueco del diseño, no de la carga: alguien de quien se recibio
-- material ES un proveedor, tenga o no el papel. Y esconderlo es justo al reves
-- de lo que conviene — el que NO tiene comprobante es el que hay que ver.
--
-- Ahora la lista los incluye con la compra en cero, asi que se distinguen solos:
-- un proveedor con ordenes en 0 y lotes a su nombre es uno al que le falta la
-- documentacion de compra.
--
-- Las columnas son las mismas y en el mismo orden: Economia y la cadena de
-- justificacion siguen leyendo igual.

create or replace view public.v_saldo_proveedores as
with de_ordenes as (
  select coalesce(proveedor, 'Sin proveedor'::text) as proveedor,
         count(*) as ordenes,
         sum(total) as comprado,
         sum(pagado) as pagado,
         sum(saldo) as saldo,
         count(*) filter (where saldo > 0::numeric) as ordenes_con_saldo
  from public.v_saldo_ordenes
  group by 1
),
de_lotes as (
  select distinct btrim(proveedor) as proveedor
  from public.ong_lotes
  where proveedor is not null and btrim(proveedor) <> ''
)
select coalesce(o.proveedor, l.proveedor) as proveedor,
       coalesce(o.ordenes, 0::bigint) as ordenes,
       coalesce(o.comprado, 0::numeric) as comprado,
       coalesce(o.pagado, 0::numeric) as pagado,
       coalesce(o.saldo, 0::numeric) as saldo,
       coalesce(o.ordenes_con_saldo, 0::bigint) as ordenes_con_saldo
from de_ordenes o
full outer join de_lotes l on l.proveedor = o.proveedor;

-- ═══ de 20260824120000_nivel_tarifa_acuerdo.sql ═══
-- Agrega el nivel 'acuerdo' para que los aportes pactados por fuera del esquema
-- general figuren como lo que son, en vez de quedar como una anomalia silenciosa.
--
-- El esquema general va de $10.000 a $15.000 por gramo. Habia dos socios aportando
-- muy por debajo de ese piso mientras figuraban catalogados en el nivel mas caro:
--   PAC-053 — 69 entregas, 1.472 g, $5.844.880 aportados, $3.971/g real, nivel 'nuevo'
--   PAC-184 — 15 entregas,   131 g,   $771.000 aportados, $5.885/g real, nivel 'nuevo'
--
-- El nivel 'acuerdo' no lleva un precio unico: el monto se pacta caso por caso y queda
-- asentado en las notas de cada socio. Por eso aporte_por_gramo va en 0, que aca
-- significa "no aplica una tarifa de lista", no "no aporta".

alter table pacientes drop constraint pacientes_nivel_tarifa_check;
alter table pacientes add constraint pacientes_nivel_tarifa_check
  check (nivel_tarifa = any (array['nuevo','antiguo','frecuente','acuerdo']));
alter table ong_tarifas drop constraint ong_tarifas_nivel_check;
alter table ong_tarifas add constraint ong_tarifas_nivel_check
  check (nivel = any (array['nuevo','antiguo','frecuente','acuerdo']));

-- ═══ de 20260824140000_saldo_ordenes_solo_gastos.sql ═══
-- v_saldo_ordenes tomaba de ong_documentos CUALQUIER documento con numero y monto, sin
-- mirar el tipo. Mientras los recibos de dispensa no estaban numerados no se notaba;
-- al emitir los 846 recibos de reembolso, cada uno entro a la vista como si fuera una
-- orden de compra a un proveedor.
--
-- Efecto: la deuda con proveedores figuraba en $91.254.145 cuando son $32.422.000. Los
-- $58.832.145 de diferencia son los recibos —agrupados bajo "Sin proveedor", porque un
-- recibo a un socio no tiene proveedor, que era la pista—. Eso inflaba los costos
-- operativos de la cadena de justificacion a $163.767.005 y hacia decir que faltaban
-- $91.213.466 para cubrirlos.
--
-- El monto correcto se verifica contra la planilla de Drive, que declara $32.388.000 de
-- saldo a pagar: $34.000 de diferencia sobre $32,4 M.
--
-- Una orden de servicio es un GASTO. Filtrar por tipo es lo que faltaba.

create or replace view v_saldo_ordenes as
select d.numero as orden_servicio,
  d.proveedor,
  d.fecha,
  d.lote_codigo,
  d.monto as total,
  coalesce(sum(p.monto), 0::numeric) as pagado,
  d.monto - coalesce(sum(p.monto), 0::numeric) as saldo,
  count(p.id) as pagos
from ong_documentos d
  left join ong_pagos_proveedor p on p.orden_servicio = d.numero
where d.numero is not null and d.numero <> '' and d.monto is not null
  and d.tipo = 'gasto'
group by d.numero, d.proveedor, d.fecha, d.lote_codigo, d.monto;

-- ═══ de 20260824180000_vistas_saldo_security_invoker_otra_vez.sql ═══
-- Las dos vistas de saldo volvieron a quedar SIN security_invoker. Segunda vez.
--
-- El 20/08 la migracion 20260820000012 las cerro con `alter view ... set
-- (security_invoker = on)`. El 24/08 volvieron a estar abiertas: el linter de
-- Supabase las marcaba como ERROR `security_definer_view` y en pg_class tenian
-- reloptions = null.
--
-- POR QUE PASO — la trampa, que es la razon de ser de este comentario:
--
--   `CREATE OR REPLACE VIEW` SIN la clausula `WITH (...)` BORRA las reloptions
--   que la vista ya tenia. No las conserva. No avisa. La vista sigue andando
--   igual, devolviendo las mismas filas, y en silencio vuelve a correr con los
--   permisos de su DUENO (postgres) en vez de los del que consulta.
--
-- O sea: alcanza con tocar el SELECT de una vista para reabrirla. Paso dos
-- veces el 24/08, en dos migraciones que solo querian arreglar el calculo:
--
--   20260824040000_proveedores_incluye_los_de_lotes.sql  -> v_saldo_proveedores
--   20260824140000_saldo_ordenes_solo_gastos.sql         -> v_saldo_ordenes
--
-- Ninguna de las dos tenia nada que ver con permisos, y las dos los rompieron.
--
-- Efecto de tenerlas abiertas: se saltean el RLS de ong_documentos,
-- ong_pagos_proveedor y ong_lotes. Hoy `anon` no tiene SELECT sobre las vistas
-- (eso lo saco la migracion del 20/08 y sigue en pie), asi que la deuda con
-- proveedores no queda publica como en agosto; pero cualquier usuario logueado
-- ve TODO, sin importar lo que su RLS le permita en las tablas de abajo.
--
-- LA REGLA, para que no haya una tercera vez:
--
--   Toda vista sobre datos con RLS se define SIEMPRE con
--   `WITH (security_invoker = 'true')` en el propio CREATE OR REPLACE.
--   Nunca con un `alter view ... set` aparte, porque ese alter queda lejos y el
--   siguiente que edite el SELECT no lo va a ver. La opcion tiene que viajar
--   pegada a la definicion.
--
-- Comparar contra public.resumen_plantas, que nacio con la opcion en su propio
-- CREATE y por eso nunca la perdio.
--
-- Aplicar en Panacea (TU_PROJECT_ID) y en Cultivando Salud Chaco
-- (la otra instalacion), que clono el esquema el 24/08/2026 y heredo el
-- problema. NO aplicar en otra instalacion: ahi estas
-- vistas no existen.
--
-- Las definiciones de abajo salen tal cual de pg_get_viewdef() sobre Panacea: no
-- cambia ni una fila, esto es solo el envoltorio de permisos.

-- Primero v_saldo_ordenes: v_saldo_proveedores depende de ella.
create or replace view public.v_saldo_ordenes
with (security_invoker = 'true') as
select d.numero as orden_servicio,
    d.proveedor,
    d.fecha,
    d.lote_codigo,
    d.monto as total,
    coalesce(sum(p.monto), 0::numeric) as pagado,
    d.monto - coalesce(sum(p.monto), 0::numeric) as saldo,
    count(p.id) as pagos
   from ong_documentos d
     left join ong_pagos_proveedor p on p.orden_servicio = d.numero
  where d.numero is not null and d.numero <> ''::text and d.monto is not null and d.tipo = 'gasto'::text
  group by d.numero, d.proveedor, d.fecha, d.lote_codigo, d.monto;
create or replace view public.v_saldo_proveedores
with (security_invoker = 'true') as
 with de_ordenes as (
         select coalesce(v_saldo_ordenes.proveedor, 'Sin proveedor'::text) as proveedor,
            count(*) as ordenes,
            sum(v_saldo_ordenes.total) as comprado,
            sum(v_saldo_ordenes.pagado) as pagado,
            sum(v_saldo_ordenes.saldo) as saldo,
            count(*) filter (where v_saldo_ordenes.saldo > 0::numeric) as ordenes_con_saldo
           from v_saldo_ordenes
          group by (coalesce(v_saldo_ordenes.proveedor, 'Sin proveedor'::text))
        ), de_lotes as (
         select distinct btrim(ong_lotes.proveedor) as proveedor
           from ong_lotes
          where ong_lotes.proveedor is not null and btrim(ong_lotes.proveedor) <> ''::text
        )
 select coalesce(o.proveedor, l.proveedor) as proveedor,
    coalesce(o.ordenes, 0::bigint) as ordenes,
    coalesce(o.comprado, 0::numeric) as comprado,
    coalesce(o.pagado, 0::numeric) as pagado,
    coalesce(o.saldo, 0::numeric) as saldo,
    coalesce(o.ordenes_con_saldo, 0::bigint) as ordenes_con_saldo
   from de_ordenes o
     full join de_lotes l on l.proveedor = o.proveedor;
-- Repetir los permisos por las dudas: CREATE OR REPLACE los conserva, pero si
-- alguna base quedo a medio camino esto la deja igual que las demas.
revoke all on public.v_saldo_ordenes     from anon;
revoke all on public.v_saldo_proveedores from anon;
grant select on public.v_saldo_ordenes     to authenticated;
grant select on public.v_saldo_proveedores to authenticated;

-- ═══ de 20260824190000_pacientes_min_solo_roles_reales.sql ═══
-- pacientes_min dejaba ver los nombres de los pacientes a quien no tiene perfil.
--
-- La vista se creo el 19/08 (migracion suelta `roles_pacientes_ficha_clinica`,
-- aplicada por fuera del repo: hasta hoy no habia archivo para ella) con este
-- filtro:
--
--     where mi_rol() <> 'demo'
--
-- En ese momento los unicos roles eran los reales y 'demo'. Despues aparecio
-- 'sin_perfil' —el que devuelve mi_rol() cuando el usuario no tiene perfil, o lo
-- tiene inactivo— y el filtro nunca se actualizo. `<> 'demo'` lo deja pasar.
--
-- Efecto: como el registro de Supabase es abierto y `authenticated` tiene SELECT
-- sobre la vista, CUALQUIERA que se creara una cuenta —sin que nadie se la
-- aprobara— veia la lista completa de nombres de pacientes. En Panacea son 223.
-- Es justo lo contrario de lo que declara el resumen de roles del 19/08: "Un
-- usuario sin perfil, o con perfil inactivo, es 'sin_perfil': no ve nada".
--
-- Ademas en Chaco la vista todavia tenia SELECT para `anon`, o sea sin siquiera
-- registrarse. Ahi no llego a filtrarse nada porque la base tiene 0 pacientes,
-- pero era cuestion de cargar el primero. En Panacea ese grant ya estaba sacado a
-- mano; como la vista no vivia en el repo, la clonacion del 24/08 se llevo el
-- estado viejo. Por eso ahora la vista SI queda escrita aca.
--
-- El arreglo es alinear el filtro al idiom que ya usa todo el resto del esquema
-- (ambiente_lecturas, cultivo_areas, lotes, tarifas, pagos_proveedor):
--
--     mi_rol() <> all (array['sin_perfil','demo'])
--
-- Los cinco roles reales —administrador, cultivador, director_medico,
-- administrativo, auditor— siguen viendo los nombres igual que antes. No cambia
-- para nadie que deba estar adentro.
--
-- OJO, ESTA VISTA ES SECURITY DEFINER A PROPOSITO. No ponerle security_invoker.
-- El RLS de `pacientes` es `puede_ver_clinico()`, que son solo administrador y
-- director_medico. pacientes_min existe justamente para que cultivador,
-- administrativo y auditor vean el NOMBRE sin ver la ficha clinica: si corriera
-- con los permisos del que consulta, esos tres verian cero filas y se romperia
-- la columna "nombres" de la tabla de roles. Su barrera es el WHERE de aca
-- adentro, no el RLS de abajo.
--
-- El linter de Supabase la marca igual como ERROR `security_definer_view`. En
-- este caso es un falso positivo conocido: es el unico que queda y se ignora a
-- proposito. No "arreglarlo" poniendole la opcion.
--
-- (Distinto de v_saldo_ordenes / v_saldo_proveedores, que SI deben ser
-- security_invoker — ver 20260824180000.)
--
-- Aplicar en Panacea (TU_PROJECT_ID) y en Cultivando Salud Chaco
-- (la otra instalacion). NO en otra instalacion.

create or replace view public.pacientes_min as
select id,
       nombre_completo,
       activo,
       socio
  from public.pacientes
 where mi_rol() <> all (array['sin_perfil','demo']);
-- La vista es la puerta para los roles que no ven la ficha; el anonimo no es uno
-- de ellos. Idempotente a proposito: Panacea ya lo tenia, Chaco no.
revoke all on public.pacientes_min from anon;
grant select on public.pacientes_min to authenticated;

-- ═══ de 20260825144622_respaldo_pacientes_antes_de_fusionar_duplicados.sql ═══
-- Respaldo completo de pacientes ANTES de fusionar los duplicados y limpiar el
-- import del formulario.
--
-- Se guardan las filas ENTERAS, no sólo las que voy a tocar: si mañana aparece
-- que el criterio de fusión fue el equivocado, con esto se puede reconstruir
-- cualquier ficha tal como estaba hoy. Es la clase de cambio que toca datos de
-- personas y no tiene "deshacer" en la app.
--
-- La tabla queda sin RLS habilitada a propósito NO: se le pone RLS y se le
-- niega todo al rol anon, igual que la tabla original. Un respaldo con los
-- mismos datos personales y sin las mismas defensas es una filtración esperando
-- que alguien encuentre el nombre.

create table if not exists public.pacientes_respaldo_20260825 as
select *, now() as respaldado_en from public.pacientes;
alter table public.pacientes_respaldo_20260825 enable row level security;
-- Sin políticas: con RLS habilitada y ninguna policy, nadie que pase por
-- PostgREST lee nada. Sólo se llega desde una conexión de servicio.
revoke all on public.pacientes_respaldo_20260825 from anon, authenticated;

-- ═══ de 20260826120000_solicitud_crear_no_arrancaba.sql ═══
-- solicitud_crear no funcionaba. Nunca. Desde el 23/08/2026.
--
-- Los 0 registros de ong_solicitudes no eran falta de uso: era que NADIE PODIA.
-- Cualquiera que completara /sumate recibia un error y se iba. Se descubrio el
-- 26/08/2026, al revisar el circuito antes de mandarle el link a los 211 socios.
--
-- Eran DOS bugs en fila, y el segundo solo se ve despues de arreglar el primero.
--
-- BUG 1 — la funcion se caia en la linea del token.
--
-- La migracion del mandato (20260823210000) reescribio solicitud_crear y cambio
-- la generacion del token a `encode(gen_random_bytes(24), 'hex')`. Pero
-- gen_random_bytes es de pgcrypto, y en Supabase pgcrypto vive en el schema
-- `extensions`, no en `public`. La funcion declara `set search_path = public`,
-- asi que el nombre no resuelve:
--
--     ERROR: function gen_random_bytes(integer) does not exist
--
-- La migracion ORIGINAL usaba dos gen_random_uuid() pegados y lo decia en un
-- comentario —«sin depender de pgcrypto»—. Ese comentario era la advertencia
-- exacta de lo que despues paso, y se perdio junto con el codigo.
--
-- BUG 2 — el token tenia el largo equivocado.
--
-- gen_random_bytes(24) en hex son 48 caracteres. Pero solicitud_estado exige
-- `length(p_token) = 64` —el largo de los dos uuid— y devuelve CERO filas si no
-- da. O sea que, aun arreglando el bug 1, cada persona se llevaba un link que
-- no abria nada, para siempre y sin mensaje de error.
--
-- Volver a los dos uuid arregla los dos bugs de una, y sin tocar
-- solicitud_estado: 64 caracteres es lo que esa funcion siempre espero.
--
-- DE PASO, LO QUE LA MIGRACION DEL MANDATO SE HABIA COMIDO
--
-- Al reescribir la funcion entera para sumarle dos parametros, se perdio todo
-- lo que el cuerpo original tenia y que no estaba relacionado con el mandato:
--
--   · La normalizacion del DNI a digitos. «12.345.678» y «12345678» son el
--     mismo documento; guardar las dos formas rompe el chequeo de duplicados.
--   · La validacion de largo del documento (7 a 9 digitos).
--   · El freno de «la misma persona dentro de 24 h», que es sobre todo contra
--     el doble clic y contra quien reenvia porque no supo si llego.
--   · El techo de 40 solicitudes por hora.
--
-- Los dos frenos importan justo ahora: la campana que viene le manda el link a
-- 211 personas de golpe, y no hay captcha.
--
-- Se conserva TODO lo que la migracion del mandato agrego: los dos parametros,
-- la firma con su version, y la fecha puesta por la base.

create or replace function public.solicitud_crear(
  p_nombre   text,
  p_dni      text,
  p_email    text default null,
  p_telefono text default null,
  p_notas    text default null,
  p_mandato_aceptado boolean default false,
  p_mandato_version  text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_dni    text;
  v_token  text;
  v_ultima timestamptz;
begin
  v_nombre := btrim(coalesce(p_nombre, ''));
  v_dni    := regexp_replace(coalesce(p_dni, ''), '\D', '', 'g');

  if length(v_nombre) < 3 then
    raise exception 'Falta el nombre y apellido';
  end if;
  if length(v_dni) < 7 or length(v_dni) > 9 then
    raise exception 'El documento no parece valido';
  end if;

  -- Freno 1: la misma persona, de nuevo.
  select creada_en into v_ultima
    from ong_solicitudes
   where dni = v_dni
     and estado in ('pendiente', 'en_revision')
     and creada_en > now() - interval '24 hours'
   limit 1;
  if found then
    raise exception 'Ya hay una solicitud en curso con ese documento, del %. Usa el link que te dimos para ver como va.',
      to_char(v_ultima, 'DD/MM/YYYY');
  end if;

  -- Freno 2: el techo por hora. No frena al abuso decidido —para eso hace falta
  -- un captcha— pero acota cuanto puede crecer la bandeja en un rato.
  if (select count(*) from ong_solicitudes
       where creada_en > now() - interval '1 hour') >= 40 then
    raise exception 'Hay demasiadas solicitudes en curso. Proba de nuevo en un rato.';
  end if;

  -- Dos uuid v4 pegados: 244 bits de azar, SIN depender de pgcrypto y con los
  -- 64 caracteres que solicitud_estado valida. No cambiar esto por
  -- gen_random_bytes: rompe las dos cosas a la vez. Ver el encabezado.
  v_token := replace(gen_random_uuid()::text, '-', '')
          || replace(gen_random_uuid()::text, '-', '');

  insert into public.ong_solicitudes
    (token, nombre, dni, email, telefono, notas, estado,
     mandato_aceptado, mandato_version, mandato_fecha)
  values
    (v_token, v_nombre, v_dni,
     nullif(btrim(coalesce(p_email, '')), ''),
     nullif(btrim(coalesce(p_telefono, '')), ''),
     nullif(btrim(coalesce(p_notas, '')), ''),
     'pendiente',
     coalesce(p_mandato_aceptado, false),
     nullif(btrim(coalesce(p_mandato_version, '')), ''),
     -- La fecha la pone la base: una fecha de firma que manda quien firma no
     -- prueba nada.
     case when coalesce(p_mandato_aceptado, false) then now() else null end);

  return v_token;
end;
$$;
revoke all on function public.solicitud_crear(text, text, text, text, text, boolean, text) from public;
grant execute on function public.solicitud_crear(text, text, text, text, text, boolean, text) to anon, authenticated;

-- ═══ de 20260826140000_reprocann_en_la_solicitud.sql ═══
-- La persona adjunta su REPROCANN desde su propio link.
--
-- POR QUE EN LA PANTALLA DEL TOKEN Y NO EN EL FORMULARIO
--
-- Quien recien se suma TODAVIA NO TIENE REPROCANN: sacarlo es el paso 2 del
-- circuito. Pedirle la constancia en el formulario inicial es pedirsela justo
-- en el unico momento en que seguro no la tiene.
--
-- La pantalla del token, en cambio, hoy le dice «vinacula tu REPROCANN» y no le
-- da donde. Es el lugar natural: la persona vuelve cuando ya lo tramito.
--
-- QUE SE LE PIDE, Y QUE NO
--
-- El NUMERO y el ARCHIVO. NO se le pide que elija el estado —vigente, vencido,
-- en tramite—, y es a proposito: el 25/08/2026 hubo que limpiar 12 fichas
-- porque el formulario anterior guardo la ETIQUETA de esa pregunta
-- («Tengo REPROCANN VIGENTE / VENCIDO/ PENDIENTE») dentro del campo del numero,
-- y eso las dejo en estado «En tramite» — el estado con el que se puede
-- dispensar sin marcar la entrega como sin respaldo. Gente que declaro NO tener
-- REPROCANN quedo habilitada a retirar.
--
-- El estado lo pone quien revisa, mirando el archivo. Un desplegable menos es
-- una via menos de que vuelva a pasar.
--
-- EL ARCHIVO NO PASA POR ACA
--
-- Lo sube la Edge Function `solicitud-adjunto`, que valida el token y escribe
-- con service role. `anon` sigue sin un solo permiso sobre esta tabla y sin
-- permiso de escritura en el bucket: darle INSERT sobre `documentos` seria
-- abrir escritura publica en un bucket que ya guarda credenciales reales.
-- Aca solo queda el PATH, como en el resto del sistema; nunca una URL publica.

alter table public.ong_solicitudes
  add column if not exists reprocann_nro       text,
  add column if not exists reprocann_path      text,
  add column if not exists reprocann_subido_en timestamptz;
comment on column public.ong_solicitudes.reprocann_nro is
  'Numero de credencial que declaro la persona. Validado como 4+ digitos antes de guardarse (ver lib/datosDelFormulario.ts): el campo libre ya se lleno una vez con la etiqueta de la pregunta.';
comment on column public.ong_solicitudes.reprocann_path is
  'PATH dentro del bucket `documentos`, NO una URL. Se lee con createSignedUrl, igual que las credenciales de pacientes.';
-- ---------------------------------------------------------------------------
-- solicitud_estado avisa si ya adjunto, para no pedirselo dos veces
-- ---------------------------------------------------------------------------
--
-- Devuelve un BOOLEANO, no el path. El path es interno: con el token no se
-- llega a ningun archivo, solo se sabe que ya se subio uno. Se mantiene todo lo
-- demas como estaba, el DNI incluido: sigue sin devolverse.
--
-- ⚠ El `length(p_token) = 64` de abajo NO es decorativo y NO se toca sin mirar
-- solicitud_crear: el 26/08/2026 se descubrio que la funcion generaba tokens de
-- 48 caracteres contra este 64, asi que ningun link abria nada. Los dos numeros
-- tienen que seguir siendo el mismo.
drop function if exists public.solicitud_estado(text);
create or replace function public.solicitud_estado(p_token text)
returns table (
  estado             text,
  nombre             text,
  creada_en          timestamptz,
  actualizada_en     timestamptz,
  motivo             text,
  entidad            text,
  codigo_vinculacion text,
  reprocann_cargado  boolean,
  reprocann_nro      text
)
language sql
security definer
set search_path = public
stable
as $$
  select s.estado, s.nombre, s.creada_en, s.actualizada_en, s.motivo,
         e.razon_social, e.codigo_vinculacion,
         (s.reprocann_path is not null) as reprocann_cargado,
         s.reprocann_nro
    from ong_solicitudes s
    left join lateral (
      select razon_social, codigo_vinculacion from ong_entidad limit 1
    ) e on true
   where s.token = p_token
     and length(coalesce(p_token, '')) = 64;
$$;
revoke all on function public.solicitud_estado(text) from public;
grant execute on function public.solicitud_estado(text) to anon, authenticated;

-- ═══ de 20260826200000_el_trigger_del_mandato_no_casteaba.sql ═══
-- El trigger del mandato tiraba error de tipos, y volteaba la aprobacion entera.
--
-- `ong_asociados.mandato_hora` es TIMESTAMPTZ, pero solicitud_pasar_mandato le
-- asignaba `new.mandato_fecha::time` — un `time with time zone`. Postgres no
-- convierte solo:
--
--     ERROR: column "mandato_hora" is of type timestamp with time zone
--            but expression is of type time with time zone
--
-- Y como el trigger corre DENTRO del update que engancha el asociado, el error
-- no queda en el trigger: voltea el update. O sea que APROBAR UNA SOLICITUD
-- FALLABA, siempre, sin importar desde donde se aprobara.
--
-- POR QUE NADIE LO VIO
--
-- Estaba tapado por el bug de solicitud_crear (ver 20260826120000): como no se
-- podia crear ninguna solicitud, nunca hubo una que aprobar y el trigger nunca
-- llego a dispararse. Al arreglar el primero, este quedo al descubierto — y
-- justo a tiempo, porque el alta automatica habria fallado en cada persona.
--
-- Es el TERCER bug de la misma migracion del mandato (20260823210000), y los
-- tres son de la misma familia: codigo que nunca se ejecuto.
--
-- EL ARREGLO
--
-- La columna es timestamptz, asi que guarda el INSTANTE de la firma, no una
-- hora suelta. `new.mandato_fecha` ya es exactamente eso. El `::time` sobraba y
-- ademas perdia el dia.
--
-- Se conserva el `coalesce`: una firma sin fecha —que no deberia pasar, la pone
-- la base— igual queda registrada con el momento en que se aprobo.

create or replace function public.solicitud_pasar_mandato()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.asociado_id is not null
     and new.mandato_aceptado
     and (old.asociado_id is distinct from new.asociado_id)
  then
    update public.ong_asociados
       set mandato_aceptado = true,
           mandato_fecha    = coalesce(new.mandato_fecha::date, current_date),
           -- timestamptz contra timestamptz. El `::time` de antes no casteaba
           -- y ademas tiraba el dia a la basura.
           mandato_hora     = coalesce(new.mandato_fecha, now()),
           mandato_version  = new.mandato_version
     where id = new.asociado_id
       -- Nunca pisar una firma que ya esta: si el asociado ya firmo, esa firma
       -- es la buena y la de la solicitud es vieja.
       and coalesce(mandato_aceptado, false) = false;
  end if;
  return new;
end;
$$;
-- El trigger lo dispara la base, no un usuario: nadie necesita EXECUTE sobre
-- esta funcion. Antes era invocable por `anon` via /rest/v1/rpc, por el default
-- de Postgres que otorga EXECUTE a PUBLIC.
revoke all on function public.solicitud_pasar_mandato() from public, anon, authenticated;

-- ═══ de 20260826220000_legajo_de_admision.sql ═══
-- El legajo de admision entra por /sumate, no por un Google Form.
--
-- POR QUE
--
-- La asociacion tenia un Google Form («Legajo de Admision») que hacia cosas que
-- /sumate no hacia: cuatro consentimientos bien redactados, el diagnostico como
-- lista cerrada, y ramificacion segun tenga o no el carnet. Pero no escribia en
-- la base: alguien importaba a mano. De ahi salieron los dos padrones con los
-- mismos codigos apuntando a personas distintas, y las doce fichas que hubo que
-- limpiar en Panacea.
--
-- Esto trae lo bueno del formulario para adentro, para que haya UN circuito de
-- alta y no dos.
--
-- LAS TRES PREGUNTAS QUE EL FORMULARIO NO HACIA
--
--   1. `reprocann_vinculado` — ¿designaste a ESTA asociacion como tu cultivador?
--      Es LA pregunta, y no estaba. El 26/08/2026 las cuatro credenciales
--      cargadas en Chaco dicen «Paciente con autocultivo» y ninguna nombra a la
--      asociacion: las cuatro habrian contestado «SI» a «tenes REPROCANN?» y
--      las cuatro siguen sin habilitar a nadie. Tener credencial y haber
--      designado a la entidad son dos cosas distintas, y el sistema ya las
--      separa (pacientes.reprocann_estado vs ong_asociados.vinculado_reprocann).
--
--   2. `reprocann_nro` y `reprocann_vencimiento` — el formulario subia el PDF y
--      nada mas, asi que alguien tenia que abrir cada archivo y tipearlos. Con
--      el vencimiento cargado el sistema avisa solo cuando esta por caducar.
--
--   3. `dni_path` — la declaracion jurada del formulario dice «la documentacion
--      adjunta (DNI y REPROCANN, de corresponder)», pero NO habia ninguna
--      pregunta para subir el DNI. La persona juraba sobre un documento que
--      nunca entrego.
--
-- LA CANTIDAD VA PARTIDA EN NUMERO Y UNIDAD
--
-- En el Google Form era texto libre y produjo «10», «40gramos», «15 gramos» y
-- «200 gramos flores frescas». Sin unidad no se puede sumar ni comparar contra
-- un tope. Y sigue SIN ser un tope: es lo que la persona estima necesitar. El
-- tope lo fija la asociacion, en pacientes.tope_mensual_g, y se carga aparte.

alter table public.ong_solicitudes
  add column if not exists fecha_nacimiento    date,
  add column if not exists domicilio           text,
  add column if not exists localidad           text,
  add column if not exists provincia           text,
  add column if not exists patologia           text,
  add column if not exists formatos            text[],
  add column if not exists cantidad_mensual    numeric,
  add column if not exists cantidad_unidad     text,
  add column if not exists medico_tratante     text,
  add column if not exists matricula_medico    text,
  add column if not exists reprocann_tiene     boolean,
  add column if not exists reprocann_vinculado text,
  add column if not exists reprocann_vencimiento date,
  add column if not exists compromiso_regularizar boolean not null default false,
  add column if not exists dni_path            text,
  add column if not exists consentimientos_version text,
  add column if not exists consent_veracidad       boolean not null default false,
  add column if not exists consent_uso_personal    boolean not null default false,
  add column if not exists consent_responsabilidad boolean not null default false,
  add column if not exists consent_jurisdiccion    boolean not null default false;
do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'ong_solicitudes_cantidad_unidad_chk') then
    alter table public.ong_solicitudes add constraint ong_solicitudes_cantidad_unidad_chk
      check (cantidad_unidad is null or cantidad_unidad in ('g','ml','u'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ong_solicitudes_repro_vinc_chk') then
    alter table public.ong_solicitudes add constraint ong_solicitudes_repro_vinc_chk
      check (reprocann_vinculado is null or reprocann_vinculado in ('si','no','no_se'));
  end if;
end $mig$;
comment on column public.ong_solicitudes.reprocann_vinculado is
  'Si la persona DECLARA haber designado a esta asociacion como su cultivador en REPROCANN. Es declarado, no verificado: lo confirma quien revisa mirando la credencial, y recien ahi se toca ong_asociados.vinculado_reprocann.';
comment on column public.ong_solicitudes.cantidad_mensual is
  'Lo que la persona ESTIMA necesitar por mes. NO es un tope: el tope lo fija la asociacion en pacientes.tope_mensual_g.';
comment on column public.ong_solicitudes.dni_path is
  'PATH en el bucket documentos, NO una URL. Lo sube la Edge Function solicitud-adjunto.';
-- ---------------------------------------------------------------------------
-- solicitud_crear recibe el legajo como UN jsonb
-- ---------------------------------------------------------------------------
--
-- Un parametro por campo serian veinte argumentos posicionales, y agregar uno
-- mas obligaria a dropear y recrear la funcion cada vez —con el riesgo de
-- perder los grants, que ya mordio el 26/08—. Con jsonb la firma no se mueve.
--
-- Lo que no viene, no se inventa: cada campo se lee con ->> y queda null.
create or replace function public.solicitud_crear(
  p_nombre   text,
  p_dni      text,
  p_email    text default null,
  p_telefono text default null,
  p_notas    text default null,
  p_mandato_aceptado boolean default false,
  p_mandato_version  text default null,
  p_legajo   jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_nombre text;
  v_dni    text;
  v_token  text;
  v_ultima timestamptz;
  v_l      jsonb := coalesce(p_legajo, '{}'::jsonb);
  v_cant   numeric;
  v_uni    text;
  v_vinc   text;
begin
  v_nombre := btrim(coalesce(p_nombre, ''));
  v_dni    := regexp_replace(coalesce(p_dni, ''), '\D', '', 'g');

  if length(v_nombre) < 3 then
    raise exception 'Falta el nombre y apellido';
  end if;
  if length(v_dni) < 7 or length(v_dni) > 9 then
    raise exception 'El documento no parece valido';
  end if;

  select creada_en into v_ultima
    from ong_solicitudes
   where dni = v_dni
     and estado in ('pendiente', 'en_revision')
     and creada_en > now() - interval '24 hours'
   limit 1;
  if found then
    raise exception 'Ya hay una solicitud en curso con ese documento, del %. Usa el link que te dimos para ver como va.',
      to_char(v_ultima, 'DD/MM/YYYY');
  end if;

  if (select count(*) from ong_solicitudes
       where creada_en > now() - interval '1 hour') >= 40 then
    raise exception 'Hay demasiadas solicitudes en curso. Proba de nuevo en un rato.';
  end if;

  -- La cantidad: si no es un numero, no entra. Un texto en una columna numerica
  -- explota el insert entero, y el formulario viejo mandaba cosas como «10» y
  -- «200 gramos flores frescas» en el mismo campo.
  begin
    v_cant := nullif(btrim(coalesce(v_l->>'cantidad_mensual','')), '')::numeric;
  exception when others then
    v_cant := null;
  end;
  if v_cant is not null and (v_cant <= 0 or v_cant > 100000) then
    v_cant := null;
  end if;

  v_uni := nullif(btrim(coalesce(v_l->>'cantidad_unidad','')), '');
  if v_uni is not null and v_uni not in ('g','ml','u') then v_uni := null; end if;

  v_vinc := nullif(btrim(coalesce(v_l->>'reprocann_vinculado','')), '');
  if v_vinc is not null and v_vinc not in ('si','no','no_se') then v_vinc := null; end if;

  v_token := replace(gen_random_uuid()::text, '-', '')
          || replace(gen_random_uuid()::text, '-', '');

  insert into ong_solicitudes (
    token, nombre, dni, email, telefono, notas, estado,
    mandato_aceptado, mandato_version, mandato_fecha,
    fecha_nacimiento, domicilio, localidad, provincia,
    patologia, formatos, cantidad_mensual, cantidad_unidad,
    medico_tratante, matricula_medico,
    reprocann_tiene, reprocann_nro, reprocann_vinculado, reprocann_vencimiento,
    compromiso_regularizar, consentimientos_version,
    consent_veracidad, consent_uso_personal, consent_responsabilidad, consent_jurisdiccion
  ) values (
    v_token, v_nombre, v_dni,
    nullif(btrim(coalesce(p_email, '')), ''),
    nullif(btrim(coalesce(p_telefono, '')), ''),
    nullif(btrim(coalesce(p_notas, '')), ''),
    'pendiente',
    coalesce(p_mandato_aceptado, false),
    nullif(btrim(coalesce(p_mandato_version, '')), ''),
    case when coalesce(p_mandato_aceptado, false) then now() else null end,
    -- Una fecha mal escrita no puede voltear el alta entera.
    (select case when (v_l->>'fecha_nacimiento') ~ '^\d{4}-\d{2}-\d{2}$'
                 then (v_l->>'fecha_nacimiento')::date end),
    nullif(btrim(coalesce(v_l->>'domicilio','')), ''),
    nullif(btrim(coalesce(v_l->>'localidad','')), ''),
    nullif(btrim(coalesce(v_l->>'provincia','')), ''),
    nullif(btrim(coalesce(v_l->>'patologia','')), ''),
    case when jsonb_typeof(v_l->'formatos') = 'array'
         then array(select jsonb_array_elements_text(v_l->'formatos')) end,
    v_cant, v_uni,
    nullif(btrim(coalesce(v_l->>'medico_tratante','')), ''),
    nullif(btrim(coalesce(v_l->>'matricula_medico','')), ''),
    (v_l->>'reprocann_tiene')::boolean,
    -- El numero pasa el mismo filtro que el importador: una tirada de 4+
    -- digitos. Sin esto vuelve a entrar la respuesta de un desplegable.
    (select case when (v_l->>'reprocann_nro') ~ '[0-9]{4,}'
                 then btrim(v_l->>'reprocann_nro') end),
    v_vinc,
    (select case when (v_l->>'reprocann_vencimiento') ~ '^\d{4}-\d{2}-\d{2}$'
                 then (v_l->>'reprocann_vencimiento')::date end),
    coalesce((v_l->>'compromiso_regularizar')::boolean, false),
    nullif(btrim(coalesce(v_l->>'consentimientos_version','')), ''),
    coalesce((v_l->>'consent_veracidad')::boolean, false),
    coalesce((v_l->>'consent_uso_personal')::boolean, false),
    coalesce((v_l->>'consent_responsabilidad')::boolean, false),
    coalesce((v_l->>'consent_jurisdiccion')::boolean, false)
  );

  return v_token;
end;
$fn$;
revoke all on function public.solicitud_crear(text,text,text,text,text,boolean,text,jsonb) from public;
grant execute on function public.solicitud_crear(text,text,text,text,text,boolean,text,jsonb) to anon, authenticated;
-- La de 7 parametros se va: con las dos vivas, una llamada sin el jsonb queda
-- ambigua —el nuevo tiene default— y la base responde «function is not unique».
drop function if exists public.solicitud_crear(text,text,text,text,text,boolean,text);

-- ═══ de 20260829000000_pacientes_tope_mensual.sql ═══
-- `pacientes.tope_mensual_g`, que no la creaba ninguna migración.
--
-- Mismo origen que `mi_rol()` y las tablas `ong_*`: se agregó a mano sobre la
-- base de la primera instalación y nunca quedó como archivo.
--
-- ⚠️ LO QUE ROMPÍA ERA MÁS GRANDE QUE UNA COLUMNA. La usan seis migraciones
-- posteriores y siete archivos del front, pero lo caro es que
-- `20260831010000` la nombra al crear `pacientes_segun_rol` — la vista que el
-- padrón usa para mostrar las columnas filtradas por rol. Sin la columna, esa
-- migración corta a la mitad: entran los triggers y `dispensas_segun_rol`, y la
-- vista del padrón NO SE CREA. Después caen en fila las cuatro migraciones que
-- la tocan.
--
-- Va fechada el 29/08 para entrar antes de la primera que la nombra.
--
-- `numeric` y NULLABLE, como en la instalación de referencia: null es «sin
-- tope», que no es lo mismo que cero. Un default en cero le pondría techo cero
-- a todo el padrón y nadie podría retirar nada.

alter table public.pacientes
  add column if not exists tope_mensual_g numeric;
comment on column public.pacientes.tope_mensual_g is
  'Tope mensual en gramos para esta persona. NULL = sin tope propio.';

-- ═══ de 20260830020000_desglose_del_pago_de_una_entrega.sql ═══
-- El desglose del pago de una entrega, por medio.
--
-- POR QUÉ
--
-- El modelo tenía UN `medio_pago` por entrega y la realidad tiene pagos
-- partidos. En Panacea eso dejó 158 asientos de caja por $8.936.000 con el
-- concepto «Dispensa a PAC-xxx» y `dispensa_id` en null: casi siempre de a dos,
-- porque son el desglose —efectivo tanto, transferencia tanto— de entregas que
-- ADEMÁS quedaron cargadas con su total como «Mixto».
--
-- Caso verificado: PAC-187 del 03/08. Una entrega de $90.000, su asiento de
-- $90.000 «Mixto», y encima dos sueltos de $75.000 y $15.000. La caja cuenta
-- $180.000 por una entrega de $90.000.
--
-- «Mixto» decía que el pago fue con dos medios sin decir cuánto de cada uno, y
-- por eso el arqueo no podía separarlos: $9.825.594 quedaban «sin discriminar»
-- sobre 1.827 asientos, y el efectivo daba −$9.076.000, que es un número
-- imposible — no se pueden sacar más billetes de los que entraron.
--
-- QUÉ FORMA TIENE
--
-- `{"Efectivo": 75000, "Transferencia": 15000}`. Cuando está cargado, `aporte`
-- es la suma de sus valores y `medio_pago` queda en 'Mixto'. Del lado de la app,
-- `cobrosDeEntrega` es el único lugar que lo lee, y `asientoDeEntrega` escribe
-- UN asiento por medio, cada uno atado a la entrega.
--
-- jsonb y no dos columnas fijas: los medios de pago son cinco (Efectivo,
-- Transferencia, Mixto, Billetera virtual, Otro) y mañana pueden ser otros. Dos
-- columnas obligarían a una migración por cada medio nuevo.
--
-- NO ARREGLA LOS DATOS VIEJOS. Es aditiva y nullable: las 1.241 entregas
-- existentes siguen exactamente igual, con su `medio_pago` simple. Los 158
-- asientos sueltos quedan donde están y los marca el cruce de Coherencia
-- «Asientos sueltos en la caja», porque limpiarlos requiere decidir caso por
-- caso —con dos entregas del mismo paciente el mismo día no hay forma de saber
-- cuál es la dueña del pago— y adivinar sobre plata es peor que dejarlo visible.

alter table ong_dispensas
  add column if not exists aporte_desglose jsonb;
comment on column ong_dispensas.aporte_desglose is
  'Desglose del reembolso por medio de pago, ej {"Efectivo":75000,"Transferencia":15000}. Null = pago con un solo medio (ver medio_pago). Cuando está cargado, aporte = suma de sus valores.';

-- ═══ de 20260830210000_la_plata_que_se_leia_sin_permiso.sql ═══
-- Tres tablas con plata que leia cualquiera que tuviera cuenta.
--
-- Ya aplicado a mano sobre TU_PROJECT_ID el 30/08/2026. NO en Chaco.
--
-- Salio de probar el rol `administrador_sistema`: en Tablas se veian los pagos a
-- proveedores con importe, proveedor y medio de pago. El rol prometia no mostrar
-- plata y mostraba $800.000, $1.330.000, $1.780.000.
--
-- EL AGUJERO NO ERA DEL ROL NUEVO. `ong_pagos_proveedor` y `ong_tarifas` tenian
-- la lectura en `mi_rol() <> ALL (ARRAY['sin_perfil','demo'])`, o sea ABIERTA a
-- todo el mundo menos la cuenta de muestra. Un `cultivador` —que por diseno no
-- ve «cuanto cuesta producir»— podia leerlas desde antes de que este rol
-- existiera.
--
-- LA LECCION: yo las habia excluido a mano del barrido de policies del rol nuevo
-- y me quede tranquilo. Excluir de una lista no cierra lo que nunca estuvo
-- cerrado. Al agregar un rol restringido hay que mirar que leen las OTRAS
-- policies de la tabla, no solo la que uno toca.
--
-- `ong_documentos` es otro caso: la lectura si estaba acotada, pero incluia al
-- rol nuevo, y esa tabla tiene $152,8 millones en 1.551 comprobantes
-- —aprovisionamiento, gastos operativos y las retribuciones de los socios—. De
-- ahi salia el «Retiros por socio: $16.767.870» que se veia en Movimientos.
--
-- Verificado ejecutando COMO el rol: caja 0, cuotas 0, pagos 0, tarifas 0,
-- documentos 0, y plantas 75 —que si tiene que ver—.
--
-- QUEDA SIN DECIDIR, y son de cultivo, no de la caja:
--   · `sustancias_nutrientes.costo_kg`  · `cosechas.valoracion`
-- Las dos siguen abiertas a cualquiera con cuenta. Un cultivador probablemente
-- las necesita; hay que decidirlo, no barrerlo.

alter policy ong_pagos_prov_ver on public.ong_pagos_proveedor
  using (public.puede_ver_plata());
alter policy ong_tarifas_ver on public.ong_tarifas
  using (public.puede_ver_plata());
alter policy ong_documentos_ver on public.ong_documentos
  using (public.puede_ver_plata() or mi_rol() = 'director_medico');
alter policy ong_documentos_escribir on public.ong_documentos
  using (mi_rol() = any (array['administrador','director_medico','administrativo']))
  with check (mi_rol() = any (array['administrador','director_medico','administrativo']));

-- ═══ de 20260830220000_el_costo_por_kilo_de_las_sales.sql ═══
-- `sustancias_nutrientes.costo_kg` es lo que sale el kilo de cada sal.
--
-- Ya aplicado a mano sobre TU_PROJECT_ID el 30/08/2026. NO en Chaco.
--
-- Era la ultima tabla con un importe que leia cualquiera con cuenta. Queda como
-- sus tres hermanas —`inventario_nutrientes`, `proveedores_nutrientes` y
-- `fichas_comerciales`—, que ya se leian con `puede_ver_plata()`. Era la unica
-- de la familia que habia quedado afuera.
--
-- Cerrarla hoy no le saca nada a nadie: cero filas, y la Calculadora de
-- Fertilizantes no forma parte de esta instalacion (ver el comentario en
-- app/src/App.tsx: `lib/nutrientes.ts` ya no entra al bundle). Se cierra ahora
-- por eso mismo: cuando alguien cargue precios, la puerta ya va a estar tapada.
--
-- LO QUE NO SE CIERRA, Y ES UNA CORRECCION MIA
--
-- `cosechas.valoracion` NO es plata: es una NOTA DE CALIDAD. La pantalla la
-- muestra como «★ 4.5» con un decimal (RendimientoDeCultivo.tsx). La habia
-- marcado como importe un detector que mira NOMBRES de columna, y `valor…`
-- matcheaba. Cerrar `cosechas` le sacaria las cosechas al cultivador —que es
-- justo lo que tiene que ver— a cambio de nada.
--
-- El nombre de una columna sugiere; no decide. Hay que mirar como se usa.

-- ⚠️ Tolera que la policy no exista. En una instalacion que NO tiene el modulo
-- de nutrientes, `sustancias_nutrientes` llega con la policy generica que le
-- puso el paquete base y no con `sustancias_nutrientes_ver`, asi que el alter
-- no encuentra nada y tumba la migracion entera — que ademas trae otras cosas.
do $$
begin
  alter policy sustancias_nutrientes_ver on public.sustancias_nutrientes
    using (public.puede_ver_plata());
exception
  when undefined_object then null;   -- no existe la policy
  when undefined_table  then null;   -- ni la tabla
end $$;

-- ═══ de 20260830230000_vista_lotes_stock_sin_plata.sql ═══
-- El stock de cada lote, SIN lo que cuesta.
--
-- Ya aplicado a mano sobre TU_PROJECT_ID el 30/08/2026. NO en Chaco.
--
-- POR QUE UNA VISTA Y NO ABRIRLE `ong_lotes` AL CULTIVADOR
--
-- Esa tabla mezcla dos cosas: cuanto material hay —que es trabajo del cultivo— y
-- cuanto sale el gramo, que es plata. Tenia `costo_por_gramo` cargado en 97 de
-- 105 lotes, a $8.801 el gramo promedio: $73.899.250 de material valorizado.
-- Darle la tabla entera al cultivador para que vea el stock seria entregarle eso
-- de paso.
--
-- Y el RLS no sabe de columnas: una policy deja pasar la fila entera o ninguna.
-- Los GRANT por columna tampoco sirven, porque todos los usuarios de la app
-- entran con el MISMO rol de Postgres (`authenticated`) y el rol de la
-- asociacion vive en una tabla, no en el motor.
--
-- EL `where` ES LA PUERTA, NO UN FILTRO
--
-- Las vistas no tienen RLS propio, y esta corre con los permisos de su dueno (no
-- lleva `security_invoker`), o sea que pasa por encima del RLS de `ong_lotes` y
-- `ong_dispensas` — que es lo que se busca: dejar entrar al cultivador, que a
-- esas tablas no entra. Sacar el `where` abre el stock a cualquiera con cuenta.
--
-- LO ENTREGADO VIENE SUMADO POR LOTE
--
-- Para saber que queda hay que restar lo que salio, y eso vive en
-- `ong_dispensas`, donde esta a que paciente se le dio y cuanto aporto. Aca sale
-- sumado: «de este lote salieron 400 g». Es el dato que el cultivo necesita, sin
-- una sola fila que diga a quien.
--
-- `restante` puede dar NEGATIVO y se deja asi: significa que se entrego mas de
-- lo que el lote declara. Recortarlo a cero esconderia el problema.
--
-- Verificado ejecutando COMO cultivador: ve 105 filas de `lotes_stock` y CERO de
-- `ong_lotes`, `ong_dispensas`, `pacientes` y `ong_caja`.

create or replace view public.lotes_stock as
select
  l.id, l.codigo, l.producto, l.genetica_id, l.cosecha_id,
  l.gramos_totales, l.unidad, l.fecha_elaboracion, l.origen, l.proveedor, l.activo,
  -- El analisis es trazabilidad, no plata: dice que tiene adentro el material.
  l.thc_pct, l.cbd_pct, l.laboratorio, l.fecha_analisis, l.analisis_path,
  l.notas, l.creado_en,
  coalesce(d.entregado, 0) as entregado,
  l.gramos_totales - coalesce(d.entregado, 0) as restante
from public.ong_lotes l
left join (
  -- Normalizado: `ong_dispensas` engancha por texto escrito a mano, asi que
  -- comparar crudo deja `CO-01` y `co-01 ` como lotes distintos.
  select upper(trim(lote_codigo)) cod, sum(coalesce(gramos, 0)) entregado
  from public.ong_dispensas
  where lote_codigo is not null and trim(lote_codigo) <> ''
  group by 1
) d on d.cod = upper(trim(l.codigo))
where public.mi_rol() <> all (array['sin_perfil'::text, 'demo'::text]);
comment on view public.lotes_stock is
  'Lotes con entrado/entregado/restante, SIN las columnas de plata y SIN una sola '
  'fila de a quien se le entrego. Es lo que ve el cultivo. El `where` es la puerta.';
revoke all on public.lotes_stock from public;
grant select on public.lotes_stock to authenticated;

-- ═══ de 20260830240000_el_admin_de_sistema_ve_todo.sql ═══
-- `administrador_sistema` pasa a ver TODO, plata incluida.
--
-- Ya aplicado a mano sobre TU_PROJECT_ID el 30/08/2026. NO en Chaco.
--
-- Decision de Gaston, cambiando la de esa misma manana: el rol habia nacido como
-- «administra todo MENOS la caja» y queda como «administra todo». El nombre lo
-- dice: es el administrador del sistema.
--
-- OJO AL LEER ESTO MAS ADELANTE: con este cambio el rol es funcionalmente
-- IDENTICO a `administrador`. Mismas tablas, mismos permisos. La diferencia pasa
-- a ser de etiqueta —cual es la cuenta de la asociacion y cual una persona que
-- administra—, no de acceso. Esta dicho a proposito para que nadie busque
-- despues una diferencia tecnica que no existe.
--
-- Antes de esto se habia arreglado tambien `puede_ver_clinico()`, que no lo
-- incluia: el rol veia la pestana Pacientes y la base le devolvia cero filas.
--
-- LO QUE NO SE TOCA, Y SIGUE SIRVIENDO: el filtro de pantallas por `ver_plata`
-- —`TABS_DE_PLATA` en la O.N.G. y el flag `plata` en Tablas—. Este rol ahora lo
-- pasa, pero sigue escondiendole la caja al `cultivador` y al `director_medico`,
-- que es para quienes se escribio.
--
-- Verificado ejecutando COMO el rol: caja 1741, documentos 1551, pagos 161,
-- tarifas 16, costos 5, pacientes 223, lotes 105, plantas 75.

create or replace function public.puede_ver_clinico()
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select public.mi_rol() in ('administrador', 'administrador_sistema', 'director_medico');
$$;
create or replace function public.puede_ver_plata()
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select public.mi_rol() in
    ('administrador', 'administrador_sistema', 'administrativo', 'auditor');
$$;
-- Y escribirla: las tablas de plata llevan la lista de roles a mano.
do $$
declare r record; q text; w text; tocadas int := 0;
begin
  for r in
    select tablename, policyname, qual, with_check from pg_policies
    where schemaname = 'public'
      and (coalesce(qual,'') like '%''administrador''%'
        or coalesce(with_check,'') like '%''administrador''%')
      and coalesce(qual,'') not like '%administrador_sistema%'
      and coalesce(with_check,'') not like '%administrador_sistema%'
  loop
    q := replace(r.qual, '''administrador''::text',
                 '''administrador''::text, ''administrador_sistema''::text');
    w := replace(r.with_check, '''administrador''::text',
                 '''administrador''::text, ''administrador_sistema''::text');
    if r.with_check is null then
      execute format('alter policy %I on public.%I using (%s)', r.policyname, r.tablename, q);
    else
      execute format('alter policy %I on public.%I using (%s) with check (%s)',
                     r.policyname, r.tablename, q, w);
    end if;
    tocadas := tocadas + 1;
  end loop;
  raise notice 'policies actualizadas: %', tocadas;
end $$;

-- ═══ de 20260831000000_tres_decisiones_de_rol.sql ═══
-- Las tres decisiones que quedaron abiertas al cerrar el 30/08/2026.
--
-- Decididas por Gaston el 31/08/2026. Cada una responde una pregunta distinta y
-- van juntas porque las tres mueven la misma superficie: quien lee que.
--
-- Verificado antes de escribir esto, ejecutando contra la base:
--   · `pacientes` leia `puede_ver_clinico()`  -> administrativo recibia 0 filas
--   · `ong_documentos` leia `puede_ver_plata() or director_medico`
--   · `ong_entidad` leia `mi_rol() <> 'sin_perfil'`  -> demo entraba
--
-- ---------------------------------------------------------------------------
-- 1. EL ADMINISTRATIVO VE EL PADRON COMPLETO
--
-- Es el rol que lleva cuotas y caja, o sea el que tiene que saber quien pago.
-- Veia 1.248 entregas y no podia decir de quien era ninguna, porque
-- `pacientes` estaba en `puede_ver_clinico()`. Y la pestana Pacientes NO esta
-- filtrada por permiso —solo lo estan Usuarios y las de plata—, asi que la
-- pantalla se le mostraba VACIA, que es como se ve una pantalla rota, no una
-- prohibida.
--
-- POR QUE UNA FUNCION NUEVA Y NO SUMARLO A `puede_ver_clinico()`.
-- Esa funcion tambien gobierna `ong_feedback_clinico`, que es el seguimiento
-- medico: sumarlo ahi le abriria los reportes de salud de paso, sin que nadie
-- lo haya pedido. `puede_ver_padron()` separa las dos cosas: el padron —quien
-- es, como se contacta, cuanto puede retirar— del dato clinico.
--
-- Son ahora CINCO funciones las que deciden todo, no cuatro:
--   mi_rol() · es_admin() · puede_ver_plata() · puede_ver_clinico()
--   · puede_ver_padron()
create or replace function public.puede_ver_padron()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select public.puede_ver_clinico() or public.mi_rol() = 'administrativo';
$$;
revoke all on function public.puede_ver_padron() from public;
grant execute on function public.puede_ver_padron() to authenticated;
-- Las tres de `pacientes` pasan a la funcion nueva. Va tambien en escritura:
-- la pestana no esconde el boton de editar —ningun permiso de la UI lo hace,
-- el clinico es RLS y nada mas—, asi que dejarlo solo en lectura le pinta un
-- boton que falla al guardar. Un boton que existe y no funciona es peor que uno
-- que no esta.
alter policy pacientes_ver_ficha on public.pacientes
  using (public.puede_ver_padron());
alter policy pacientes_escribir on public.pacientes
  with check (public.puede_ver_padron());
alter policy pacientes_actualizar on public.pacientes
  using (public.puede_ver_padron())
  with check (public.puede_ver_padron());
-- `ong_feedback_clinico` NO se toca: sigue en `puede_ver_clinico()`. Es la
-- linea que separa esta decision de «el administrativo ve datos de salud».

-- ---------------------------------------------------------------------------
-- 2. EL DIRECTOR MEDICO NO VE PLATA, Y ESO INCLUYE LOS RECIBOS
--
-- El `or mi_rol() = 'director_medico'` del 30/08 no agregaba un acceso: le
-- conservaba uno que ya tenia. La tabla tiene $152,8M en 1.551 comprobantes.
--
-- SE MIRO SI HABIA UNA MITAD CLINICA QUE PRESERVAR Y NO LA HAY. Las 1.551
-- filas tienen monto, las 1.551:
--   · `emitido`  847 filas · $58,9M · recibos de reembolso, uno por paciente
--   · `gasto`    704 filas · $93,9M · Aprovisionamiento $57,6M, Gasto Operativo
--                                     $19,4M, Retribucion $16,8M (los retiros
--                                     de los socios)
-- Las credenciales de REPROCANN y los informes NO viven aca: estan en columnas
-- de `pacientes` y en el bucket `documentos`. Cerrar esta tabla no le saca ni
-- un dato clinico.
--
-- Gaston lo definio asi: que vea todo de los pacientes y nada de plata. Los
-- recibos de reembolso son plata, aunque tengan un paciente al lado, asi que
-- tambien salen. Queda en 0 de 1.551.
--
-- NO ROMPE NINGUNA PANTALLA: `documentos` ya esta en `TABS_DE_PLATA`, o sea que
-- la pestana no se le mostraba desde antes. Esto alinea la base con la UI, que
-- es al reves del error tipico —la pantalla abierta y la base cerrada—.
alter policy ong_documentos_ver on public.ong_documentos
  using (public.puede_ver_plata());
-- Y la escritura tambien: si no puede leerlos, cargarlos no significa nada.
alter policy ong_documentos_escribir on public.ong_documentos
  using (public.mi_rol() = any (array['administrador','administrador_sistema','administrativo']))
  with check (public.mi_rol() = any (array['administrador','administrador_sistema','administrativo']));
-- ---------------------------------------------------------------------------
-- 3. LA CUENTA DEMO NO VE LA ENTIDAD
--
-- `ong_entidad` tiene razon social, CUIT, domicilio, el CODIGO DE VINCULACION
-- de REPROCANN y el director tecnico con su matricula. La demo existe para
-- mostrar pantallas reales VACIAS, no para publicar los datos de la asociacion.
--
-- Hoy esos campos estan en NULL, asi que el cambio no se nota. Es justamente el
-- momento de hacerlo: el dia que se carguen —y hay que cargarlos, es lo que
-- traba el REPROCANN— quedan filtrados solos, sin que nadie se acuerde.
--
-- NO DEJA LA DEMO ROTA: `getEntidad()` devuelve null cuando no hay fila, y la
-- portada cae en «Asociacion civil» (PaginaONG.tsx:461).
--
-- El filtro es contra la lista completa, nunca `<> 'demo'` a secas: `mi_rol()`
-- devuelve 'sin_perfil' para toda cuenta sin perfil o con perfil inactivo.
alter policy ong_entidad_ver on public.ong_entidad
  using (public.mi_rol() <> all (array['sin_perfil','demo']));

-- ═══ de 20260831010000_cada_rol_ve_las_columnas_de_su_funcion.sql ═══
-- El dato sensible y el importe salen de la fila, no de la tabla.
--
-- 31/08/2026. Sale de preguntarse que dice la NORMA que tiene que ver cada uno,
-- en vez de a quien le tenemos confianza.
--
-- EL MARCO. Ley 25.326 art. 2: los datos de salud son datos SENSIBLES. Art. 4:
-- tienen que ser pertinentes y NO EXCESIVOS respecto de la finalidad. Art. 8:
-- los profesionales de la salud pueden tratarlos respetando el secreto
-- profesional. Ley 26.529: la historia clinica es del paciente y su acceso es
-- restringido. Codigo Penal 156: violacion de secreto profesional. Y la Ley
-- 27.350 con el Decreto 883/2020 y la Res. 800/2021 son las que ponen un medico
-- a INDICAR y a hacer el SEGUIMIENTO, que es de donde sale que necesita.
--
-- El criterio que sale de ahi es MINIMIZACION: cada rol ve lo que su funcion
-- necesita. Para cobrar una cuota no hace falta el diagnostico; para hacer
-- seguimiento clinico no hace falta cuanto se cobro.
--
-- EL PROBLEMA TECNICO ES QUE `pacientes` MEZCLA TRES NATURALEZAS EN UNA TABLA:
--   · sensible      patologia, medico_tratante, matricula_medico, credencial_url
--   · habilitacion  reprocann_*, modalidad, tope_mensual_g, plantas_habilitadas
--   · administrativo nombre, dni, contacto, domicilio, codigo, nivel_tarifa
-- y el RLS de Postgres NO SABE DE COLUMNAS: decide filas enteras. Es el mismo
-- problema que ya resolvio `lotes_stock` para el stock sin el precio.
--
-- SE HACE AHORA PORQUE ESTA VACIO. Medido hoy: patologia 0 de 223,
-- medico_tratante 0, matricula_medico 0, credencial_url 0. Cerrar un campo
-- despues de cargarlo es avisar tarde; el momento es antes.
--
-- ---------------------------------------------------------------------------
-- POR QUE UNA SOLA VISTA Y NO UNA POR ROL
--
-- Una vista por rol obliga al front a elegir la fuente, y elegir mal se ve como
-- una pantalla vacia, que se lee como rota. Con una sola vista que ANULA la
-- columna segun quien pregunta, el front lee siempre lo mismo y la decision
-- vive en un solo lugar: aca.
--
-- Las vistas van SECURITY DEFINER (el default de Postgres), igual que
-- `pacientes_min` y por la misma razon: su barrera es el WHERE de adentro, no
-- el RLS de la tabla de abajo. Ponerles `security_invoker` las dejaria en cero
-- filas para todos los roles que la vista existe para atender.

create or replace view public.pacientes_segun_rol as
select
  id, nombre_completo, dni, fecha_nacimiento, telefono, email,
  localidad, provincia, domicilio, foto_url,
  reprocann_nro, reprocann_estado, reprocann_emision, reprocann_vencimiento,
  modalidad,
  socio, fecha_alta, activo, notas, creado_en,
  plantas_habilitadas, m2_habilitados, tope_mensual_g, nivel_tarifa, codigo,
  -- Las cuatro sensibles. Quien no atiende pacientes las recibe en NULL.
  case when public.puede_ver_clinico() then patologia         end as patologia,
  case when public.puede_ver_clinico() then medico_tratante   end as medico_tratante,
  case when public.puede_ver_clinico() then matricula_medico  end as matricula_medico,
  case when public.puede_ver_clinico() then credencial_url    end as credencial_url
from public.pacientes
where public.puede_ver_padron();
-- OJO CON `notas`: es texto libre y por eso puede tener adentro cualquier cosa,
-- dato de salud incluido —en Chaco se escribio ahi que alguien es cultivador
-- registrado, porque no habia columna—. Queda VISIBLE a proposito: es donde se
-- anota lo operativo y anularlo romperia el trabajo administrativo. Es un
-- riesgo conocido y la respuesta correcta no es esconderlo sino que lo clinico
-- tenga su campo.

create or replace view public.dispensas_segun_rol as
select
  id, user_id, paciente_id, fecha, producto, genetica_id, gramos, unidad,
  modalidad, entregado_por, con_receta, notas, creado_en,
  recibo_numero, lote_codigo,
  -- Los cuatro importes. Quien no ve plata recibe la entrega sin el dinero:
  -- fecha, gramos, producto, genetica y lote, que es la trazabilidad de la
  -- indicacion medica, sin cuanto se cobro.
  case when public.puede_ver_plata() then aporte          end as aporte,
  case when public.puede_ver_plata() then medio_pago      end as medio_pago,
  case when public.puede_ver_plata() then pago_referencia end as pago_referencia,
  case when public.puede_ver_plata() then aporte_desglose end as aporte_desglose
from public.ong_dispensas
where public.mi_rol() = any (array[
  'administrador','administrador_sistema','director_medico','administrativo','auditor']);
revoke all on public.pacientes_segun_rol from anon;
revoke all on public.dispensas_segun_rol from anon;
grant select on public.pacientes_segun_rol to authenticated;
grant select on public.dispensas_segun_rol to authenticated;
-- ---------------------------------------------------------------------------
-- Y AHORA LO QUE UNA VISTA SOLA NO TAPA: EL PISADO CON NULL
--
-- Si el administrativo abre una ficha, la columna `patologia` le llega NULL, y
-- al guardar el formulario manda el objeto entero: el UPDATE escribe NULL sobre
-- la patologia REAL. Es un borrado silencioso de dato clinico causado por una
-- medida de privacidad, que es la peor forma de fallar —nadie lo relaciona—.
--
-- No se arregla en el front. Un formulario que se porta bien hoy es un
-- formulario que alguien toca manana. Se arregla en la base: si quien escribe
-- no puede ver la columna, no la puede cambiar. La fila vieja gana.
--
-- LA GUARDA DE `auth.uid()` NO ES DECORATIVA: sin ella esto correria tambien
-- para el service_role y para el SQL a mano —donde `mi_rol()` devuelve
-- 'sin_perfil'— y congelaria las columnas para las migraciones y para la Edge
-- Function `ingesta`, que es como se carga la mitad de esta base.
create or replace function public.preservar_lo_clinico()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is not null and not public.puede_ver_clinico() then
    new.patologia        := old.patologia;
    new.medico_tratante  := old.medico_tratante;
    new.matricula_medico := old.matricula_medico;
    new.credencial_url   := old.credencial_url;
  end if;
  return new;
end $$;
drop trigger if exists preservar_lo_clinico on public.pacientes;
create trigger preservar_lo_clinico
  before update on public.pacientes
  for each row execute function public.preservar_lo_clinico();
create or replace function public.preservar_los_importes()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is not null and not public.puede_ver_plata() then
    new.aporte          := old.aporte;
    new.medio_pago      := old.medio_pago;
    new.pago_referencia := old.pago_referencia;
    new.aporte_desglose := old.aporte_desglose;
  end if;
  return new;
end $$;
drop trigger if exists preservar_los_importes on public.ong_dispensas;
create trigger preservar_los_importes
  before update on public.ong_dispensas
  for each row execute function public.preservar_los_importes();

-- ═══ de 20260831020000_resumen_plantas_la_leia_cualquiera.sql ═══
-- `resumen_plantas` la podia leer ANON, con el nombre del paciente adentro.
--
-- 31/08/2026. No aparecio buscandola: aparecio verificando OTRA cosa. Al listar
-- las vistas para confirmar que las dos nuevas no le quedaran abiertas a `anon`,
-- la consulta mostro tambien estas dos:
--
--   relname           reloptions              anon_lee
--   lotes_stock       null                    TRUE
--   resumen_plantas   null                    TRUE
--
-- `lotes_stock` estaba a salvo por accidente: su `where mi_rol() <> all (...)`
-- le devuelve cero filas a anon igual. El grant sobraba y se saco lo mismo.
--
-- `resumen_plantas` NO TENIA WHERE NINGUNO. Es security definer —el default de
-- una vista, que es justamente lo que se olvida— asi que corria con los
-- permisos de su dueno y se salteaba el RLS de `plantas` y de `pacientes`.
--
-- MEDIDO, no deducido, ejecutando `set local role anon`:
--   select count(*), max(paciente_nombre) from resumen_plantas
--   -> 75 filas, «Virginia Barnes»
--
-- Y la publishable key viaja en el bundle publico, asi que eso era alcanzable
-- con un GET a la API REST desde cualquier lado, sin cuenta. Expone que una
-- persona con nombre y apellido es paciente de cannabis medicinal: el dato
-- sensible del art. 2 de la Ley 25.326, que es la ley que uno cita cuando
-- discute esto.
--
-- DOS ARREGLOS, PORQUE UNO SOLO NO ALCANZA:
--
-- 1. El WHERE, igual que `lotes_stock`. Es la barrera de verdad: mientras la
--    vista sea security definer, el grant es lo unico que la separa del mundo, y
--    un grant se vuelve a poner solo el dia que alguien corre un `grant select on
--    all tables`.
-- 2. El nombre del paciente sale por `puede_ver_padron()`. El cultivador y el
--    auditor tienen que ver las plantas —es su trabajo— y ninguno de los dos ve
--    `pacientes`: que el nombre se les colara por esta vista contradecia lo que
--    la tabla ya decia que no.
--
-- LA LECCION, que es la de siempre en este repo y volvio a pasar: una vista NO
-- es una tabla. Una tabla sin policies no la lee nadie; una vista sin WHERE la
-- lee todo el mundo. Al crear una vista sobre datos con RLS hay que decidir su
-- barrera a mano, y despues MIRARLA:
--
--   select c.relname, c.reloptions,
--          has_table_privilege('anon', 'public.'||c.relname, 'SELECT')
--     from pg_class c join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname = 'public' and c.relkind = 'v';

create or replace view public.resumen_plantas as
select p.id,
    p.codigo,
    coalesce(p.apodo, g.nombre, 'Sin nombre'::text) as nombre,
    g.nombre as genetica,
    g.banco,
    g.tipo,
    p.fase,
    p.fecha_germinacion,
    current_date - p.fecha_germinacion as dias_de_vida,
    p.sustrato,
    p.maceta,
    p.ubicacion,
    p.slot,
    p.activa,
    p.paciente_id,
    case when public.puede_ver_padron() then pac.nombre_completo end as paciente_nombre,
    ( select max(e.fecha) from eventos e where e.planta_id = p.id and e.tipo = 'Riego'::text) as ultimo_riego,
    ( select count(*) from eventos e where e.planta_id = p.id) as total_eventos,
    p.genetica_id
   from plantas p
     left join geneticas g on g.id = p.genetica_id
     left join pacientes pac on pac.id = p.paciente_id
  where public.mi_rol() <> all (array['sin_perfil'::text, 'demo'::text]);
revoke all on public.resumen_plantas from anon;
grant select on public.resumen_plantas to authenticated;
revoke all on public.lotes_stock from anon;
grant select on public.lotes_stock to authenticated;

-- ═══ de 20260831030000_el_acuerdo_de_aporte_tiene_donde_vivir.sql ═══
-- El acuerdo de aporte vivia en `notas`, que la ve todo el que ve el padron.
--
-- 31/08/2026. Salio de revisar el punto que habia quedado abierto: «notas es
-- texto libre y puede tener dato clinico adentro». Medido sobre las 198 notas
-- con contenido, ese riesgo NO existe hoy:
--
--   con palabra clinica (patolog|diagn|dolor|epilep|...)   0 de 198
--   con importe en pesos                                   2
--   letras sueltas (V, N, R, O, X)                       117
--   resto: bitacora de auditoria de datos (DESVINCULADO, FICHA DUPLICADA,
--          DNI corregido, REPROCANN limpiado, TELEFONO COMPARTIDO)
--
-- El problema era el CONTRARIO del que se busco. Dos notas tenian el historial
-- economico completo de los dos socios de mayor volumen:
--
--   PAC-053  «Aporta $3.971 por gramo ... 1.472 g, $5.844.880 aportados ...
--             $6.160.320 que la asociacion absorbio»
--   PAC-184  «Aporta $5.885 por gramo ... 131 g, $771.000 aportados»
--
-- Al director medico se le habia cerrado la caja, los comprobantes y el aporte
-- de las 1.248 entregas horas antes, y esto le entraba igual por un campo de
-- texto. Una restriccion que se saltea por el costado no es una restriccion.
--
-- ---------------------------------------------------------------------------
-- POR QUE DOS COLUMNAS Y NO UNA
--
-- `aporte_acordado_g` sola no alcanzaba. Esas notas no son «una cifra suelta»:
-- son el analisis que dice cuanto absorbio la asociacion y que FALTA la
-- ratificacion del organo directivo. Sacarles los numeros para que entren en
-- `notas` mutila un analisis que alguien va a necesitar. Y dejarlas donde
-- estaban era el problema.
--
-- Asi que el numero va estructurado y el texto va a un campo que es plata. En
-- `notas` queda una linea que dice que el acuerdo existe y donde mirarlo: quien
-- no ve plata tiene que poder saber que hay un acuerdo, sin ver de cuanto.
--
-- LA CAUSA RAIZ ERA QUE NO HABIA DONDE PONERLO. Por eso no alcanzaba con
-- reescribir las dos notas: sin un lugar, el proximo acuerdo vuelve al mismo
-- campo de texto. El cruce `nota_con_importe` en Coherencia avisa si pasa.

alter table public.pacientes
  add column if not exists aporte_acordado_g numeric,
  add column if not exists notas_economicas  text;
comment on column public.pacientes.aporte_acordado_g is
  'Aporte pactado por gramo cuando nivel_tarifa = acuerdo. Nullable: null es «no hay acuerdo», no cero.';
comment on column public.pacientes.notas_economicas is
  'El analisis del acuerdo. Va aparte de notas porque notas la ve todo el que ve el padron y esto es plata.';
create or replace view public.pacientes_segun_rol as
select
  id, nombre_completo, dni, fecha_nacimiento, telefono, email,
  localidad, provincia, domicilio, foto_url,
  reprocann_nro, reprocann_estado, reprocann_emision, reprocann_vencimiento,
  modalidad,
  socio, fecha_alta, activo, notas, creado_en,
  plantas_habilitadas, m2_habilitados, tope_mensual_g, nivel_tarifa, codigo,
  case when public.puede_ver_clinico() then patologia         end as patologia,
  case when public.puede_ver_clinico() then medico_tratante   end as medico_tratante,
  case when public.puede_ver_clinico() then matricula_medico  end as matricula_medico,
  case when public.puede_ver_clinico() then credencial_url    end as credencial_url,
  case when public.puede_ver_plata()   then aporte_acordado_g end as aporte_acordado_g,
  case when public.puede_ver_plata()   then notas_economicas  end as notas_economicas
from public.pacientes
where public.puede_ver_padron();
revoke all on public.pacientes_segun_rol from anon;
grant select on public.pacientes_segun_rol to authenticated;
-- El trigger pasa a cubrir las DOS naturalezas, y por eso cambia de nombre:
-- `preservar_lo_clinico` ya no decia la verdad. La guarda de `auth.uid()` sube
-- al principio, que es lo mismo pero se lee de una.
create or replace function public.preservar_lo_que_no_puede_ver()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then return new; end if;
  if not public.puede_ver_clinico() then
    new.patologia        := old.patologia;
    new.medico_tratante  := old.medico_tratante;
    new.matricula_medico := old.matricula_medico;
    new.credencial_url   := old.credencial_url;
  end if;
  if not public.puede_ver_plata() then
    new.aporte_acordado_g := old.aporte_acordado_g;
    new.notas_economicas  := old.notas_economicas;
  end if;
  return new;
end $$;
drop trigger if exists preservar_lo_clinico on public.pacientes;
drop function if exists public.preservar_lo_clinico();
create trigger preservar_lo_que_no_puede_ver
  before update on public.pacientes
  for each row execute function public.preservar_lo_que_no_puede_ver();

-- ═══ de 20260831040000_borrar_un_usuario_no_borra_sus_lotes.sql ═══
-- Borrar un usuario le borraba los lotes. Era una bomba y estaba armada.
--
-- 31/08/2026. Gaston pidio poder eliminar usuarios —hasta hoy solo se podia
-- borrar a quien nunca habia entrado—. Antes de tocar la regla se miro que se
-- lleva puesto un borrado, y aparecio esto:
--
--   tabla         columna    al borrar el usuario
--   ong_lotes     user_id    CASCADE      <-- se borran los lotes
--   ong_pedidos   user_id    CASCADE      <-- se borran los pedidos
--
-- Y medido contra los datos reales, el alcance:
--
--   growflowpanacea@gmail.com   administrador          105 lotes, 1.248 dispensas
--   gastonrpersoglia@gmail.com administrador_sistema    0 lotes,     0 dispensas
--
-- O sea que borrar la cuenta de la asociacion habria borrado LOS 105 LOTES —el
-- inventario entero— y dejado las 1.248 entregas apuntando a un `lote_codigo`
-- que ya no existe. Las dispensas no se habrian ido con ellos, porque enganchan
-- por TEXTO y no por FK: habrian quedado huerfanas, que es exactamente lo que
-- cuenta el cruce `lote_codigo_huerfano`. La traza del material se cortaba
-- entera y ningun total lo habria delatado.
--
-- Abrir el borrado sin arreglar esto habria sido poner un boton de perder
-- datos, con el nombre de otra cosa.
--
-- SET NULL Y NO RESTRICT. Restrict haria que la cuenta de la asociacion sea
-- imborrable, que suena bien pero mueve el problema: la barrera de quien se
-- puede borrar es una decision de producto y vive en `usuarios-eliminar`, no en
-- una FK. Aca lo que se decide es otra cosa: que una fila NO desaparezca porque
-- se fue quien la cargo.
--
-- POR ESO `user_id` PASA A SER NULLABLE. Null no es «faltante»: es «no se sabe
-- quien lo cargo, porque esa cuenta ya no esta». Es un estado real del dato y
-- tiene que poder representarse. Lo que se pierde al borrar es la firma, no la
-- fila, y eso es lo que el aviso de la pantalla dice antes de confirmar.

alter table public.ong_lotes   alter column user_id drop not null;
alter table public.ong_pedidos alter column user_id drop not null;
alter table public.ong_lotes   drop constraint if exists ong_lotes_user_id_fkey;
alter table public.ong_lotes   add  constraint ong_lotes_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;
alter table public.ong_pedidos drop constraint if exists ong_pedidos_user_id_fkey;
alter table public.ong_pedidos add  constraint ong_pedidos_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;
comment on column public.ong_lotes.user_id is
  'Quien lo cargo. Nullable desde el 31/08/2026: null es «no se sabe» porque se borro el usuario. Era CASCADE y borrar una cuenta se llevaba sus lotes.';
comment on column public.ong_pedidos.user_id is
  'Quien lo cargo. Nullable: null es «no se sabe» porque se borro el usuario.';

-- ═══ de 20260831050000_rol_director_de_cultivo.sql ═══
-- El rol «Director de cultivo»: el responsable tecnico de la Res. 1780.
--
-- 31/08/2026. Es el `cultivador` MAS lo que hay que firmar por el cultivo:
-- traslados, declaraciones juradas y predios. Responde por el material que SALE
-- del predio, asi que la carta de porte es suya.
--
-- LOS CINCO LUGARES DONDE VIVE UN ROL (§3.3 del handoff). Este archivo cubre el
-- quinto; los otros cuatro son codigo:
--   1. `RolUsuario`                        app/src/types/index.ts
--   2. `PERMISOS_ROL`, `RUTA_DEFAULT_ROL`  app/src/hooks/useAuth.ts
--   3. `ROLES_ASIGNABLES`                  app/src/lib/usuarios.ts
--   4. `ROLES`                             supabase/functions/usuarios-invitar/
--   5. el CHECK de abajo, y las policies que nombran roles
--
-- ⚠ AL HACER EL 4 APARECIO QUE `administrador_sistema` NUNCA HABIA ENTRADO AHI.
-- El rol se creo el 30/08, la pantalla lo ofrecia, y la Edge Function lo habria
-- rechazado al invitar. Nadie lo habia probado porque no se invito a nadie con
-- ese rol. Es el error que el handoff ya documentaba en §7.3, en el cuarto
-- lugar en vez del quinto: la lista de roles se olvida SIEMPRE en el sitio que
-- no se ejercita.

alter table public.perfiles_usuario drop constraint if exists perfiles_usuario_rol_check;
alter table public.perfiles_usuario add constraint perfiles_usuario_rol_check
  check (rol = any (array[
    'administrador','administrador_sistema','administrativo','cultivador',
    'director_medico','director_cultivo','auditor','demo',
    'operador','supervisor']));
-- Donde escribe el cultivador, escribe el director de cultivo.
--
-- Se recorren las policies REALES en vez de escribir la lista a mano: son 21 y
-- una que se olvide deja un rol que entra y no puede guardar nada — el sintoma
-- exacto de §7.4, un permiso de pantalla sin respaldo en la base.
do $$
declare r record; nueva_qual text; nueva_check text;
begin
  for r in
    select tablename, policyname, qual, with_check
      from pg_policies
     where schemaname = 'public'
       and (qual like '%''cultivador''%' or with_check like '%''cultivador''%')
       and coalesce(qual, '') not like '%director_cultivo%'
  loop
    nueva_qual  := replace(r.qual,       '''cultivador''::text', '''cultivador''::text, ''director_cultivo''::text');
    nueva_check := replace(r.with_check, '''cultivador''::text', '''cultivador''::text, ''director_cultivo''::text');
    if r.with_check is null then
      execute format('alter policy %I on public.%I using (%s)', r.policyname, r.tablename, nueva_qual);
    elsif r.qual is null then
      execute format('alter policy %I on public.%I with check (%s)', r.policyname, r.tablename, nueva_check);
    else
      execute format('alter policy %I on public.%I using (%s) with check (%s)',
                     r.policyname, r.tablename, nueva_qual, nueva_check);
    end if;
  end loop;
end $$;
-- Lo propio del rol.
alter policy ong_traslados_ver on public.ong_traslados
  using (mi_rol() = any (array['administrador','administrador_sistema','director_medico',
                              'administrativo','auditor','director_cultivo']));
alter policy ong_traslados_escribir on public.ong_traslados
  using (mi_rol() = any (array['administrador','administrador_sistema','director_medico',
                              'administrativo','director_cultivo']))
  with check (mi_rol() = any (array['administrador','administrador_sistema','director_medico',
                                   'administrativo','director_cultivo']));
alter policy ong_ddjj_escribir on public.ong_ddjj
  using (mi_rol() = any (array['administrador','administrador_sistema','administrativo','director_cultivo']))
  with check (mi_rol() = any (array['administrador','administrador_sistema','administrativo','director_cultivo']));
alter policy ong_predios_escribir on public.ong_predios
  using (mi_rol() = any (array['administrador','administrador_sistema','administrativo','director_cultivo']))
  with check (mi_rol() = any (array['administrador','administrador_sistema','administrativo','director_cultivo']));
-- LAS SEIS INSTITUCIONALES DEJAN DE VERSE DESDE LA CUENTA DEMO.
--
-- Mismo caso que `ong_entidad` esa misma manana: el filtro era `<> 'sin_perfil'`
-- a secas, que NO excluye a la demo. Hoy estan casi vacias —0 actas, 0 libros,
-- 0 predios, 0 autoridades, 3 ddjj— y por eso es el momento: el dia que se
-- carguen las actas y los libros rubricados quedan filtradas solas.
alter policy ong_actas_ver       on public.ong_actas       using (mi_rol() <> all (array['sin_perfil','demo']));
alter policy ong_autoridades_ver on public.ong_autoridades using (mi_rol() <> all (array['sin_perfil','demo']));
alter policy ong_ddjj_ver        on public.ong_ddjj        using (mi_rol() <> all (array['sin_perfil','demo']));
alter policy ong_libros_ver      on public.ong_libros      using (mi_rol() <> all (array['sin_perfil','demo']));
alter policy ong_predios_ver     on public.ong_predios     using (mi_rol() <> all (array['sin_perfil','demo']));
alter policy ong_requisitos_ver  on public.ong_requisitos  using (mi_rol() <> all (array['sin_perfil','demo']));
-- El cupo, sin exponer una sola ficha.
--
-- `calcularCapacidad` recibe un CONTEO, no el padron, asi que alcanza con los
-- agregados. Sin esto el director de cultivo veria «N plantas en floracion de
-- 0», porque el tope sale de multiplicar la cantidad de pacientes: un cero ahi
-- no se lee como «no se», se lee como un tope real y MAS CHICO que el
-- verdadero, que es la peor forma de equivocar un limite normativo.
--
-- La usan TODOS los roles y no solo el que la necesita: un solo camino al dato.
-- Si el numero saliera del padron para unos y de aca para otros, dos pantallas
-- podrian mostrar cupos distintos sobre los mismos datos.
create or replace view public.cupo_conteos as
select
  (select count(*) from public.pacientes where activo)::int as pacientes_activos,
  (select count(*) from public.ong_predios where activo is not false)::int as predios_activos
where public.mi_rol() <> all (array['sin_perfil','demo']);
revoke all on public.cupo_conteos from anon;
grant select on public.cupo_conteos to authenticated;

-- ═══ de 20260902120000_codigo_vinculacion_es_del_paciente.sql ═══
-- EL CODIGO DE VINCULACION ES DE LA PERSONA, NO DE LA ENTIDAD (02/09/2026).
--
-- Lo corrigio Panacea: cada paciente saca SU codigo en REPROCANN -Mi Argentina,
-- gratis, lo hace solo- y se lo da a la asociacion, que con eso lo vincula. El
-- sistema lo tenia al reves: una sola columna en `ong_entidad` y una pantalla
-- que decia que la ONG le pasaba ese numero a la gente.
--
-- El circuito publico ya estaba bien: `/sumate` le dice a la persona que el
-- primer paso es sacar su codigo. Era el lado de adentro el que se contradecia
-- con el de afuera.
--
-- POR QUE NO SE BORRA `ong_entidad.codigo_vinculacion`: esa columna existe en
-- las TRES bases y las otras dos no tienen este codigo. Un `drop column` aca
-- deja el esquema divergente por una limpieza que no cambia nada -en Panacea
-- esta en NULL-, y el comentario alcanza para que nadie la vuelva a usar.
alter table public.pacientes
  add column if not exists codigo_vinculacion text;
comment on column public.pacientes.codigo_vinculacion is
  'El codigo que la persona saca en REPROCANN y le da a la asociacion para que '
  'lo vincule como su cultivador. Es de la PERSONA: uno por paciente.';
comment on column public.ong_entidad.codigo_vinculacion is
  'EN DESUSO desde el 02/09/2026. El codigo de vinculacion es de cada paciente '
  '(pacientes.codigo_vinculacion), no de la entidad. Se conserva la columna '
  'porque existe igual en las otras dos instalaciones, que no tienen este '
  'cambio. No leerla ni escribirla.';

-- ═══ de 20260902120100_el_codigo_de_vinculacion_llega_a_la_ficha.sql ═══
-- La columna nueva no llega sola: `getPacientes` lee la VISTA, y una vista
-- creada con columnas explicitas no se entera de lo que se agrega a la tabla.
--
-- Va SIN `CASE`: el codigo de vinculacion no es dato clinico ni plata. Quien
-- puede ver el padron necesita verlo, porque es justo lo que hace falta para
-- vincular a la persona.
--
-- OJO: `CREATE OR REPLACE VIEW` solo deja AGREGAR columnas al final, y ademas
-- borra las reloptions si no se las repite. Aca no hay ninguna que perder
-- -esta vista es SECURITY DEFINER a proposito, igual que `pacientes_min`: su
-- barrera es el `WHERE puede_ver_padron()` de adentro y no el RLS-, pero se
-- verifica despues igual.
create or replace view public.pacientes_segun_rol as
 SELECT id, nombre_completo, dni, fecha_nacimiento, telefono, email,
    localidad, provincia, domicilio, foto_url,
    reprocann_nro, reprocann_estado, reprocann_emision, reprocann_vencimiento,
    modalidad, socio, fecha_alta, activo, notas, creado_en,
    plantas_habilitadas, m2_habilitados, tope_mensual_g, nivel_tarifa, codigo,
        CASE WHEN puede_ver_clinico() THEN patologia ELSE NULL::text END AS patologia,
        CASE WHEN puede_ver_clinico() THEN medico_tratante ELSE NULL::text END AS medico_tratante,
        CASE WHEN puede_ver_clinico() THEN matricula_medico ELSE NULL::text END AS matricula_medico,
        CASE WHEN puede_ver_clinico() THEN credencial_url ELSE NULL::text END AS credencial_url,
        CASE WHEN puede_ver_plata() THEN aporte_acordado_g ELSE NULL::numeric END AS aporte_acordado_g,
        CASE WHEN puede_ver_plata() THEN notas_economicas ELSE NULL::text END AS notas_economicas,
    codigo_vinculacion
   FROM pacientes
  WHERE puede_ver_padron();

-- ═══ de 20260902140000_arqueo_de_caja_y_stock.sql ═══
-- EL ARQUEO: LO QUE ALGUIEN CONTO, CONTRA LO QUE EL SISTEMA DECIA.
--
-- Es lo que Cristian pidio el 02/09/2026 y lo que al panel le faltaba. El panel
-- MUESTRA la caja y el stock; nadie sabe si alguien los miro. Sus palabras:
-- «deberia quedar registro de cada movimiento», «Hugo controla y me pasas el
-- reporte», y el problema concreto: «hay veces que hay una merma, le pregunto a
-- Hugo, no saco, yo no saque, no sabemos donde va».
--
-- Sin esta tabla esa pregunta no tiene respuesta posible: no hay ningun momento
-- registrado en el que alguien haya dicho «habia tanto».
--
-- SE GUARDA LA DIFERENCIA, NO SE IMPUTA A NADIE. `contado_por` dice quien conto,
-- que es distinto de quien se llevo algo. Hoy la merma la absorbe Hugo como
-- faltante de su plata; un sistema que convierta eso en automatico deja de
-- cargarse la primera vez que alguien discuta un numero. El dato queda; que se
-- hace con el lo decide una persona.
create table if not exists public.arqueos (
  id uuid primary key default gen_random_uuid(),
  momento timestamptz not null default now(),

  -- LO QUE EL SISTEMA DECIA en ese momento, congelado.
  --
  -- Se guarda y no se recalcula: el esperado de hace tres semanas depende de
  -- asientos y dispensas que despues se corrigieron, asi que recalcularlo daria
  -- otro numero y la diferencia historica cambiaria sola. Un arqueo que cambia
  -- despues de firmado no sirve para nada.
  esperado_efectivo numeric(14,2),
  esperado_transferencia numeric(14,2),
  esperado_stock_g numeric(12,2),

  -- LO QUE SE CONTO. Nullable a proposito: se puede arquear solo la caja, solo
  -- el stock, o las dos. Obligar a contar todo junto es la forma segura de que
  -- no se cuente nada.
  contado_efectivo numeric(14,2),
  contado_transferencia numeric(14,2),
  contado_stock_g numeric(12,2),

  nota text,
  contado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now()
);
create index if not exists arqueos_momento_idx on public.arqueos (momento desc);
alter table public.arqueos enable row level security;
create policy arqueos_ver on public.arqueos
  for select to authenticated using (puede_ver_plata());
create policy arqueos_cargar on public.arqueos
  for insert to authenticated with check (puede_ver_plata());
-- NO HAY UPDATE NI DELETE, y es a proposito: un arqueo es una foto de un
-- momento. Si se conto mal, se carga otro; corregir el anterior borraria la
-- unica evidencia de que la diferencia existio.

-- Y `anon` no toca nada. La tabla nueva heredo el privilegio por el default de
-- Supabase; el 01/09 se lo quito sobre TODAS las tablas para que no alcance con
-- un solo error. Una tabla nueva vuelve a abrir ese agujero en silencio.
revoke all on public.arqueos from anon;
comment on table public.arqueos is
  'Lo que alguien conto de caja y stock, contra lo que el sistema decia. '
  'Sin update ni delete: un arqueo es una foto y se corrige cargando otro.';

-- ═══ de 20260902150000_rol_mostrador.sql ═══
-- EL ROL DE QUIEN ABRE LA SEDE.
--
-- Cristian lo definio con precision el 02/09/2026, mirando el panel: «este
-- acceso seria el que le daria al Hugo al dia de la fecha, para que abra la
-- sede, tome los valores de las salas, haga control de stock, dinero y pueda
-- hacer las tareas de los botones».
--
-- Es exactamente eso y nada mas: el panel de apertura, la lectura de ambiente,
-- el control de caja y stock, y las tres cosas del mostrador -entregar, cobrar,
-- anotar una visita-. NO ve el cultivo, ni lo institucional, ni las fichas
-- clinicas, ni los costos, ni las tablas, ni los usuarios.
--
-- ⚠️ ESTE MAPA VIVE EN DOS LADOS Y HAY QUE TOCAR LOS DOS. Aca estan las
-- funciones que usa el RLS; en `hooks/useAuth.ts` esta el mapa que decide que
-- se dibuja. Tocar solo uno deja una pantalla que se muestra y una base que
-- devuelve cero, que es como se ve un permiso mal hecho: rota, no prohibida.

create or replace function public.puede_ver_plata()
returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select public.mi_rol() in
    ('administrador', 'administrador_sistema', 'administrativo', 'auditor', 'mostrador');
$function$;
-- EL PADRON SI, LA FICHA CLINICA NO.
--
-- Para entregarle a alguien hay que poder encontrarlo y ver su cupo. Lo que no
-- ve es la patologia ni el medico tratante: eso lo corta `puede_ver_clinico()`
-- columna por columna en `pacientes_segun_rol`, que es la misma separacion que
-- ya tiene el administrativo.
create or replace function public.puede_ver_padron()
returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select public.puede_ver_clinico() or public.mi_rol() in ('administrativo', 'mostrador');
$function$;

-- ═══ de 20260902160000_plan_de_cultivo.sql ═══
-- EL PLAN DE CULTIVO: LO QUE SE DECLARA, CONTRA LO QUE HAY.
--
-- Lo pidio Cristian el 02/09/2026: «deberia alimentarse de un plan de cultivo,
-- el que se declara en el REPROCANN, diciendo cuanta gente, que genetica,
-- cuantas plantas, toda esa vaina», y «no le hace falta que este cargando
-- planta por planta».
--
-- PERO NO ES SOLO COMODIDAD DE CARGA, y esa es la parte que hace que valga la
-- pena tener una tabla: el plan es el DOCUMENTO QUE SE DECLARA. Con el cargado,
-- el sistema puede decir «declaraste 60 y hay 63 en la sala», que hoy es
-- imposible — no hay contra que comparar, solo plantas sueltas.
--
-- ⚠️ EL PLAN NO GENERA LAS PLANTAS, LAS CONTRASTA. Generarlas y listo suena
-- comodo y a los dos meses el plan es ficcion: murieron tres, se repusieron
-- dos, y nadie vuelve a mirarlo. El plan es la declaracion, las plantas son la
-- realidad, y Coherencia cruza las dos. Un plan que se edita para que cierre
-- deja de ser una declaracion.
create table if not exists public.planes_cultivo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  desde date,
  hasta date,

  -- LO QUE SE DECLARA. Los numeros son los que se cruzan; el resto es texto
  -- libre a proposito: es lo que va en el documento y cada organismo lo pide
  -- redactado distinto. Encasillarlo en catalogos obligaria a mantener una
  -- taxonomia que cambia con cada resolucion.
  plantas_previstas integer,
  pacientes_previstos integer,
  geneticas text,
  espacios text,
  riego text,
  fertilizacion text,
  luces text,
  notas text,

  activo boolean not null default true,
  creado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists planes_cultivo_activo_idx on public.planes_cultivo (activo, desde desc);
alter table public.planes_cultivo enable row level security;
create policy planes_ver on public.planes_cultivo
  for select to authenticated using (mi_rol() is not null);
create policy planes_escribir on public.planes_cultivo
  for all to authenticated
  using (mi_rol() in ('administrador','administrador_sistema','director_cultivo'))
  with check (mi_rol() in ('administrador','administrador_sistema','director_cultivo'));
revoke all on public.planes_cultivo from anon;
comment on table public.planes_cultivo is
  'El plan que se declara en REPROCANN. NO genera las plantas: se contrasta '
  'con ellas. Un plan que se edita para que cierre deja de ser una declaracion.';

-- ═══ de 20260903120000_documentos_institucionales.sql ═══
-- LOS PAPELES QUE CONSTITUYEN A LA ENTIDAD: estatuto, acta, matrícula, poder.
--
-- Lo pidió Gastón el 03/09/2026 con el acta en la mano: «¿Dónde podría cargar
-- el estatuto? Descargué el de la coop, aunque no esté operativa el estatuto
-- está vigente».
--
-- Y la respuesta era: en ningún lado. `ong_documentos` tiene
-- `check (tipo in ('emitido','gasto'))`, y el estatuto no es ninguno de los
-- dos: no lo emite la asociación a nombre de alguien, y no respalda que salió
-- plata. La base lo rechazaba.
--
-- ⚠️ POR QUÉ TABLA APARTE Y NO UN TERCER `tipo` EN `ong_documentos`.
--
-- Tres razones, y la primera es la que decide:
--
-- 1. La vista `v_saldo_ordenes` agrupa por `ong_documentos.numero` cualquier
--    fila con `numero` y `monto` no nulos, y la trata como una orden de
--    servicio con saldo. Una matrícula cargada como «Nº 1234» aparecería en el
--    saldo de proveedores. El estatuto contaminaría la plata.
-- 2. El permiso es el contrario. `ong_documentos` se ve con
--    `puede_ver_plata()`; el estatuto es institucional y lo tiene que poder
--    leer el director médico, que NO ve la plata. Mismo criterio que
--    `ong_entidad`, `ong_actas` y `ong_autoridades`, y por eso copia su RLS.
-- 3. No comparte ni un campo con un comprobante: no tiene monto, ni rubro, ni
--    proveedor, ni asociado, ni dispensa que respalde.

create table if not exists public.ong_documentos_institucionales (
  id            uuid primary key default gen_random_uuid(),
  -- Qué papel es. Cerrado a propósito: son los que existen, y un texto libre
  -- acá deja «Estatuto», «estatuto» y «ESTATUTO» como tres papeles distintos.
  tipo          text not null check (tipo in (
                  'Estatuto', 'Acta constitutiva', 'Reglamento interno',
                  'Matrícula / Resolución', 'Poder / Autorización',
                  'Reforma de estatuto', 'Otro')),
  titulo        text not null,
  -- El número del organismo, tal como viene. Para el acta de Panacea es
  -- «ACTA-2023-143072795-APN-DTD#JGM»: no es un número, es un identificador
  -- con letras y almohadilla, así que va como texto.
  numero        text,
  -- Nullable porque el sistema NUNCA frena al operador: quien tiene el PDF a
  -- mano puede no saber la fecha del acto, y trabarlo ahí garantiza que el
  -- papel no se suba nunca.
  fecha         date,
  /*
   * ⚠️ `vigente` NO ES `activo`.
   *
   * Es la distinción exacta que trajo Gastón: la cooperativa no está
   * operativa y el estatuto SÍ está vigente. Un estatuto deja de estar
   * vigente cuando se lo reforma, no cuando la entidad para de operar — y por
   * eso hay un tipo «Reforma de estatuto» que apunta al mismo lugar.
   */
  vigente       boolean not null default true,
  /*
   * De qué persona jurídica es este papel.
   *
   * Nace nullable y con motivo: el acta que se carga hoy es de la
   * COOPERATIVA DE TRABAJO «Panacea» LIMITADA, que no es la misma persona
   * jurídica que la entidad que opera en la app. Sin este campo, el estatuto
   * de la coop quedaría archivado como si fuera el de la asociación, que es
   * justo la confusión que un registro institucional tiene que evitar.
   * Vacío se lee como «la entidad de esta instalación».
   */
  persona_juridica text,
  -- Path en el bucket privado `documentos`, bajo el prefijo `institucional/`.
  -- Nunca una URL pública: se pide firmada (ver lib/archivos.ts).
  archivo_path  text,
  archivo_nombre text,
  notas         text,
  user_id       uuid references auth.users (id) on delete set null,
  creado_en     timestamptz not null default now()
);
create index if not exists ong_docs_inst_tipo_idx
  on public.ong_documentos_institucionales (tipo);
create index if not exists ong_docs_inst_fecha_idx
  on public.ong_documentos_institucionales (fecha desc nulls last);
alter table public.ong_documentos_institucionales enable row level security;
-- Copia literal del RLS de `ong_entidad` / `ong_actas` / `ong_autoridades`: lo
-- ve cualquiera con un perfil de verdad, lo escribe la administración. El
-- auditor lee y no toca, que es el punto de que exista un auditor.
drop policy if exists ong_docs_inst_ver on public.ong_documentos_institucionales;
create policy ong_docs_inst_ver on public.ong_documentos_institucionales
  for select using (public.mi_rol() not in ('sin_perfil', 'demo'));
drop policy if exists ong_docs_inst_escribir on public.ong_documentos_institucionales;
create policy ong_docs_inst_escribir on public.ong_documentos_institucionales
  for all using (public.mi_rol() in ('administrador', 'administrador_sistema', 'administrativo'))
  with check (public.mi_rol() in ('administrador', 'administrador_sistema', 'administrativo'));
-- ⚠️ `anon` HEREDA LOS GRANTS DEL ESQUEMA. Sin este revoke la tabla queda
-- legible desde la clave pública del navegador aunque el RLS diga otra cosa
-- para los logueados. Ya pasó con `arqueos` y con `planes_cultivo` el 02/09.
revoke all on public.ong_documentos_institucionales from anon;
grant select, insert, update, delete
  on public.ong_documentos_institucionales to authenticated;
-- ─────────────────────────────────────────────────────────────────────────────
-- El archivo: mismo bucket `documentos`, prefijo `institucional/`.
--
-- Reusa el bucket en vez de crear otro porque la máquina de URLs firmadas ya
-- está escrita para él. Pero las políticas del bucket están atadas a los
-- roles de plata, así que el prefijo institucional necesita las suyas: si no,
-- el director médico ve la FICHA del estatuto y no puede abrir el PDF, que es
-- peor que no verlo — una pantalla que promete un archivo y falla al tocarlo.

drop policy if exists documentos_institucional_ver on storage.objects;
create policy documentos_institucional_ver on storage.objects
  for select using (
    bucket_id = 'documentos'
    and name like 'institucional/%'
    and public.mi_rol() not in ('sin_perfil', 'demo'));
drop policy if exists documentos_institucional_escribir on storage.objects;
create policy documentos_institucional_escribir on storage.objects
  for insert with check (
    bucket_id = 'documentos'
    and name like 'institucional/%'
    and public.mi_rol() in ('administrador', 'administrador_sistema', 'administrativo'));
drop policy if exists documentos_institucional_borrar on storage.objects;
create policy documentos_institucional_borrar on storage.objects
  for delete using (
    bucket_id = 'documentos'
    and name like 'institucional/%'
    and public.mi_rol() in ('administrador', 'administrador_sistema'));
-- ─────────────────────────────────────────────────────────────────────────────
-- Y de paso, un agujero que estaba al lado: `administrador_sistema` podía
-- escribir la FILA de `ong_documentos` (su RLS lo incluye) pero no subir el
-- archivo al bucket (`documentos_escribir` no lo nombraba). Cargar un
-- comprobante le fallaba recién en el upload, después de llenar el formulario.
drop policy if exists documentos_escribir on storage.objects;
create policy documentos_escribir on storage.objects
  for insert with check (
    bucket_id = 'documentos'
    and public.mi_rol() in (
      'administrador', 'administrador_sistema', 'director_medico', 'administrativo'));
drop policy if exists documentos_ver on storage.objects;
create policy documentos_ver on storage.objects
  for select using (
    bucket_id = 'documentos'
    and public.mi_rol() in (
      'administrador', 'administrador_sistema', 'director_medico',
      'administrativo', 'auditor'));

-- ═══ de 20260903160000_mostrador_entra_en_la_lista_de_roles.sql ═══
-- EL ROL `mostrador` NO SE PODIA ASIGNAR. La pantalla lo ofrecia y la base lo
-- rechazaba.
--
-- Apareció el 03/09/2026 al hacer por fin lo que el traspaso venía pidiendo:
-- **probar el rol EJECUTANDO como el rol**, y no leyendo definiciones. El
-- primer intento de crear un perfil `mostrador` —dentro de una transacción que
-- se revierte, sin crear ninguna cuenta— murió acá:
--
--   ERROR 23514: new row for relation "perfiles_usuario" violates check
--   constraint "perfiles_usuario_rol_check"
--
-- La migración del 02/09 que creó el rol tocó `puede_ver_plata()` y
-- `puede_ver_padron()`, y su propio encabezado avisa que «este mapa vive en DOS
-- lados». Vivía en cuatro. Faltaban los otros dos, y los dos son los que de
-- verdad dejan entrar a una persona:
--
--   1. este CHECK, que decide qué se puede guardar en la columna;
--   2. la lista `ROLES` de la Edge Function `usuarios-invitar`, que decide qué
--      se puede invitar y que se corrige en el mismo commit.
--
-- ⚠️ ES LA TERCERA VEZ QUE PASA LO MISMO. El 31/08, al sumar
-- `director_cultivo`, se descubrió que `administrador_sistema` —creado el
-- 30/08— nunca había entrado en este CHECK: el rol existía, la pantalla lo
-- ofrecía, y nadie lo había notado porque no se invitó a nadie con ese rol. La
-- lista de roles se olvida SIEMPRE en el lugar que no se ejercita, y el lugar
-- que no se ejercita es siempre el mismo: el alta.
--
-- Hugo iba a ser la primera persona con este rol. Crear su cuenta habría
-- fallado dos veces —al invitar y al guardar—, después de elegir «Mostrador» en
-- un desplegable que lo ofrecía.

alter table public.perfiles_usuario drop constraint if exists perfiles_usuario_rol_check;
alter table public.perfiles_usuario add constraint perfiles_usuario_rol_check
  check (rol = any (array[
    'administrador', 'administrador_sistema', 'administrativo', 'mostrador',
    'cultivador', 'director_cultivo', 'director_medico', 'auditor', 'demo']));

-- ═══ de 20260903170000_el_rol_mostrador_puede_trabajar.sql ═══
-- EL ROL `mostrador` EXISTÍA Y NO PODÍA TRABAJAR.
--
-- Se creó el 02/09/2026 y nunca se ejecutó: los tres usuarios de la instalación
-- son `administrador`. El 03/09 se lo probó por fin **corriendo como el rol** —en
-- una transacción que se revierte, prestándole el rol a un perfil existente, sin
-- crear ninguna cuenta— y contando filas tabla por tabla. El resultado:
--
--   tabla             total   lo que veía mostrador
--   ong_dispensas     1.253   0     ← no podía entregar ni ver lo entregado
--   ong_lotes           109   0     ← el paso 3 del panel salía VACÍO
--   ong_asociados       211   0
--   ong_visitas         947   0     ← una de sus tres tareas
--   ong_caja          1.746   1.746 ✔
--   pacientes           237   237   ✔
--   ong_feedback_clin.    2   0     ✔ correcto: no debe verlo
--
-- Hugo habría abierto la sede, visto la caja, y el control de stock —el motivo
-- por el que se hizo todo esto— le habría mostrado que no hay nada que contar.
--
-- ⚠️ POR QUÉ PASÓ, Y ES LA MISMA RAZÓN DE SIEMPRE.
--
-- Las tablas cuyo `select` usa `puede_ver_plata()` funcionaron solas: la
-- migración del 02/09 tocó esa función y listo. Las que fallaron tienen la lista
-- de roles **escrita a mano** en la policy, y a esas hay que ir una por una.
-- Cuando un rol nuevo se suma a un predicado, hereda todo lo que ese predicado
-- gobierna; cuando la policy tiene un array literal, no hereda nada y no avisa.
--
-- LO QUE SE LE DA, Y NO ES MÁS QUE SU DEFINICIÓN. Cristian la dictó así:
-- «que abra la sede, tome los valores de las salas, haga control de stock,
-- dinero y pueda hacer las tareas de los botones». Eso es exactamente esto.

-- ── Lo que necesita para el paso 3 y para entregar ─────────────────────────
-- Ver y escribir: entregar, devolver, retirar una reserva, cargar un lote.

drop policy if exists ong_dispensas_ver on public.ong_dispensas;
create policy ong_dispensas_ver on public.ong_dispensas for select using (
  public.mi_rol() = any (array['administrador','administrador_sistema',
    'director_medico','administrativo','auditor','mostrador']));
drop policy if exists ong_dispensas_escribir on public.ong_dispensas;
create policy ong_dispensas_escribir on public.ong_dispensas for all
  using (public.mi_rol() = any (array['administrador','administrador_sistema',
    'director_medico','administrativo','mostrador']))
  with check (public.mi_rol() = any (array['administrador','administrador_sistema',
    'director_medico','administrativo','mostrador']));
drop policy if exists ong_lotes_ver on public.ong_lotes;
create policy ong_lotes_ver on public.ong_lotes for select using (
  public.mi_rol() = any (array['administrador','administrador_sistema',
    'director_medico','administrativo','auditor','mostrador']));
drop policy if exists ong_lotes_escribir on public.ong_lotes;
create policy ong_lotes_escribir on public.ong_lotes for all
  using (public.mi_rol() = any (array['administrador','administrador_sistema',
    'director_medico','administrativo','mostrador']))
  with check (public.mi_rol() = any (array['administrador','administrador_sistema',
    'director_medico','administrativo','mostrador']));
drop policy if exists ong_pedidos_ver on public.ong_pedidos;
create policy ong_pedidos_ver on public.ong_pedidos for select using (
  public.mi_rol() = any (array['administrador','administrador_sistema',
    'director_medico','administrativo','auditor','mostrador']));
drop policy if exists ong_pedidos_escribir on public.ong_pedidos;
create policy ong_pedidos_escribir on public.ong_pedidos for all
  using (public.mi_rol() = any (array['administrador','administrador_sistema',
    'director_medico','administrativo','mostrador']))
  with check (public.mi_rol() = any (array['administrador','administrador_sistema',
    'director_medico','administrativo','mostrador']));
-- ── Anotar una visita ──────────────────────────────────────────────────────
drop policy if exists ong_visitas_ver on public.ong_visitas;
create policy ong_visitas_ver on public.ong_visitas for select using (
  public.mi_rol() = any (array['administrador','administrador_sistema',
    'director_medico','administrativo','auditor','mostrador']));
drop policy if exists ong_visitas_escribir on public.ong_visitas;
create policy ong_visitas_escribir on public.ong_visitas for all
  using (public.mi_rol() = any (array['administrador','administrador_sistema',
    'director_medico','administrativo','mostrador']))
  with check (public.mi_rol() = any (array['administrador','administrador_sistema',
    'director_medico','administrativo','mostrador']));
-- ── El padrón societario: LEER Y NADA MÁS ──────────────────────────────────
--
-- Lo necesita para encontrar a la persona y para que la botonera sepa si hay
-- socios activos. **No escribe**: el alta de un asociado se resuelve en
-- Comisión Directiva y se referencia contra un acta. Que la dé de alta quien
-- atiende el mostrador sería saltear el acto que la habilita.
drop policy if exists ong_asociados_ver on public.ong_asociados;
create policy ong_asociados_ver on public.ong_asociados for select using (
  public.mi_rol() = any (array['administrador','administrador_sistema',
    'director_medico','administrativo','auditor','mostrador']));
-- ── El paso 1: cargar la lectura de la sala ────────────────────────────────
--
-- Es la razón de ser del rol y era lo único que no podía hacer. Ojo: se suma a
-- `ambiente_lecturas` y **no** a `ambiente_salas` — cargar una lectura es operar
-- la sede; crear una sala es armar la instalación, y eso no es del mostrador.
drop policy if exists ambiente_lecturas_escribir on public.ambiente_lecturas;
create policy ambiente_lecturas_escribir on public.ambiente_lecturas for all
  using (public.mi_rol() = any (array['administrador','administrador_sistema',
    'cultivador','director_cultivo','mostrador']))
  with check (public.mi_rol() = any (array['administrador','administrador_sistema',
    'cultivador','director_cultivo','mostrador']));
-- ── «Dinero»: asentar en caja, y el comprobante que lo respalda ────────────
--
-- `ong_documentos` va junto con `ong_caja` a propósito: Cristian le pidió a Hugo
-- que registre los gastos, y un gasto sin su comprobante es medio registro. Es
-- la misma decisión que ya se había tomado al dejarle visible la pestaña.
drop policy if exists ong_caja_escribir on public.ong_caja;
create policy ong_caja_escribir on public.ong_caja for all
  using (public.mi_rol() = any (array['administrador','administrador_sistema',
    'administrativo','mostrador']))
  with check (public.mi_rol() = any (array['administrador','administrador_sistema',
    'administrativo','mostrador']));
drop policy if exists ong_documentos_escribir on public.ong_documentos;
create policy ong_documentos_escribir on public.ong_documentos for all
  using (public.mi_rol() = any (array['administrador','administrador_sistema',
    'administrativo','mostrador']))
  with check (public.mi_rol() = any (array['administrador','administrador_sistema',
    'administrativo','mostrador']));
-- Y el archivo del comprobante, que vive en el bucket y tiene su propia lista.
drop policy if exists documentos_escribir on storage.objects;
create policy documentos_escribir on storage.objects for insert with check (
  bucket_id = 'documentos'
  and public.mi_rol() = any (array['administrador','administrador_sistema',
    'director_medico','administrativo','mostrador']));

-- ═══ de 20260908005157_dispensas_tipo_movimiento.sql ═══
-- Nombrar el movimiento.
--
-- Hasta ahora una fila de `ong_dispensas` mezclaba seis hechos distintos y solo
-- se distinguian mirando si algun numero daba cero: una entrega normal, un
-- retiro a cuenta, un cobro de deuda, el consumo interno, una merma y un ajuste
-- de stock. Por eso el balance de materia marcaba como error una operacion
-- normal, y el promedio de aporte por gramo se envenenaba con cobros que no
-- tienen gramos.
--
-- Lo confirmo Panacea el 08/09/2026: la plata que entra sin salir gramos es el
-- pago de una deuda; los gramos que salen sin entrar plata son un retiro a
-- cuenta.
--
-- NULLABLE A PROPOSITO: null es "todavia no se clasifico", no un tipo mas.
-- Mismo criterio que `ong_lotes.costo_por_gramo`, donde null es "no lo se" y
-- no cero.
alter table public.ong_dispensas
  add column if not exists tipo_movimiento text;
alter table public.ong_dispensas
  drop constraint if exists ong_dispensas_tipo_movimiento_check;
alter table public.ong_dispensas
  add constraint ong_dispensas_tipo_movimiento_check
  check (tipo_movimiento is null or tipo_movimiento = any (array[
    'entrega',            -- sale material y entra el aporte, todo junto
    'entrega_a_cuenta',   -- sale material, el socio queda debiendo
    'cobro_de_deuda',     -- entra plata por entregas anteriores, no sale material
    'consumo_interno',    -- CI: sale material y no hay socio del otro lado
    'merma',              -- perdida de material
    'ajuste'              -- correccion de stock, no es una operacion con nadie
  ]));
comment on column public.ong_dispensas.tipo_movimiento is
  'Que fue este movimiento. null = sin clasificar. Un cobro_de_deuda no lleva gramos y una entrega_a_cuenta no lleva aporte: los dos son normales y no hay que contarlos como error.';
create index if not exists ong_dispensas_tipo_movimiento_idx
  on public.ong_dispensas (tipo_movimiento);
-- Backfill de lo que los numeros dicen sin ambiguedad. Consumo interno, merma y
-- ajuste NO se deducen: los tres se parecen a una entrega a cuenta, y forzarlos
-- escribiria una mentira. En una base nueva esto no toca nada.
update public.ong_dispensas set tipo_movimiento = 'cobro_de_deuda'
 where tipo_movimiento is null and gramos = 0 and coalesce(aporte, 0) > 0;
update public.ong_dispensas set tipo_movimiento = 'entrega_a_cuenta'
 where tipo_movimiento is null and gramos > 0 and coalesce(aporte, 0) = 0
   and paciente_id is not null;
update public.ong_dispensas set tipo_movimiento = 'entrega'
 where tipo_movimiento is null and gramos > 0 and coalesce(aporte, 0) > 0;

-- ═══ de 20260908005521_caja_paciente_id.sql ═══
-- Un cobro de deuda no deberia fabricar una dispensa fantasma.
--
-- Hasta ahora, para registrar que un socio pago lo que adeudaba, habia que
-- inventar una fila de `ong_dispensas` de 0 gramos: la plata ya vivia en la
-- caja y la dispensa existia solo para colgarle el asiento. Con esta columna el
-- asiento se ata al socio directo, y el balance de materia deja de tener que
-- ignorar filas que no mueven material.
--
-- ON DELETE SET NULL, nunca CASCADE: archivar o borrar una ficha no puede
-- llevarse puesta la plata que esa persona pago.
alter table public.ong_caja
  add column if not exists paciente_id uuid references public.pacientes(id) on delete set null;
create index if not exists ong_caja_paciente_id_idx
  on public.ong_caja (paciente_id) where paciente_id is not null;
comment on column public.ong_caja.paciente_id is
  'El socio del otro lado del movimiento, cuando lo hay. Lo usa el cobro de deuda: plata que entra por entregas anteriores, sin material saliendo hoy.';

-- ═══ de 20260908011500_retribucion_en_especie.sql ═══
-- Lo que retira el equipo no es deuda, es parte de su pago.
--
-- Hugo (PAC-001) y Cristian (PAC-002) concentraban 566 g de los 1.534 sin
-- cobrar: el 37%. Contarlos como entrega_a_cuenta les inventaba una deuda
-- millonaria a las dos personas que sostienen la sede.
--
-- Y tampoco es consumo_interno: CI es lo que consume la organizacion EN COMUN.
-- La retribucion es de una persona y es parte de su pago. Aplanarlas pierde la
-- unica de las dos que se puede valuar como gasto.
alter table public.ong_dispensas
  drop constraint if exists ong_dispensas_tipo_movimiento_check;
alter table public.ong_dispensas
  add constraint ong_dispensas_tipo_movimiento_check
  check (tipo_movimiento is null or tipo_movimiento = any (array[
    'entrega',                 -- sale material y entra el aporte, todo junto
    'entrega_a_cuenta',        -- sale material, el socio queda debiendo
    'cobro_de_deuda',          -- entra plata por entregas anteriores, no sale material
    'retribucion_en_especie',  -- se lo lleva quien trabaja, como parte de su pago
    'consumo_interno',         -- CI: lo que consume la organizacion en comun
    'merma',                   -- perdida de material
    'ajuste'                   -- correccion de stock, no es una operacion con nadie
  ]));
-- LA REGLA VIVE EN LA FICHA, NO EN UNA LISTA DE CODIGOS.
--
-- Si dependiera de "PAC-001 y PAC-002", el dia que entre alguien mas al equipo
-- sus retiros nacerian como deuda y nadie se enteraria hasta que alguien mire
-- una cuenta corriente y vea un numero que no existe.
alter table public.pacientes
  add column if not exists retira_como_retribucion boolean not null default false;
comment on column public.pacientes.retira_como_retribucion is
  'Quien trabaja en la asociacion y se lleva material como parte de su pago. Sus retiros sin aporte son retribucion_en_especie, no una deuda.';
-- Reclasificacion. En una base nueva no toca nada: nadie tiene la marca puesta.
update public.ong_dispensas d set tipo_movimiento = 'retribucion_en_especie'
  from public.pacientes p
 where p.id = d.paciente_id
   and p.retira_como_retribucion
   and d.tipo_movimiento = 'entrega_a_cuenta';

-- ═══ de 20260908014500_las_vistas_ven_las_columnas_nuevas.sql ═══
-- UNA COLUMNA NUEVA NO LLEGA SOLA A LA APP.
--
-- La app no lee las tablas: lee `pacientes_segun_rol` y `dispensas_segun_rol`,
-- y una vista con columnas explicitas no se entera de lo que se le agrega a la
-- tabla de abajo. Sin esto, `tipo_movimiento` y `retira_como_retribucion`
-- llegaban SIEMPRE en undefined, y el interruptor "queda a deber" hubiera
-- clasificado como deuda hasta lo que retira el equipo. En silencio.
--
-- LAS COLUMNAS NUEVAS VAN AL FINAL: `create or replace view` no deja insertar
-- una en el medio ("cannot change name of view column"). Renombra por posicion,
-- no por nombre.
--
-- Las dos siguen SECURITY DEFINER, que es como estaban: `pacientes_segun_rol`
-- existe justamente para que cada rol vea lo suyo, y su barrera es el WHERE de
-- adentro. No se les toca ni el WHERE ni un solo CASE.

create or replace view public.pacientes_segun_rol as
 SELECT id, nombre_completo, dni, fecha_nacimiento, telefono, email, localidad,
    provincia, domicilio, foto_url, reprocann_nro, reprocann_estado,
    reprocann_emision, reprocann_vencimiento, modalidad, socio, fecha_alta,
    activo, notas, creado_en, plantas_habilitadas, m2_habilitados,
    tope_mensual_g, nivel_tarifa, codigo,
        CASE WHEN puede_ver_clinico() THEN patologia ELSE NULL::text END AS patologia,
        CASE WHEN puede_ver_clinico() THEN medico_tratante ELSE NULL::text END AS medico_tratante,
        CASE WHEN puede_ver_clinico() THEN matricula_medico ELSE NULL::text END AS matricula_medico,
        CASE WHEN puede_ver_clinico() THEN credencial_url ELSE NULL::text END AS credencial_url,
        CASE WHEN puede_ver_plata() THEN aporte_acordado_g ELSE NULL::numeric END AS aporte_acordado_g,
        CASE WHEN puede_ver_plata() THEN notas_economicas ELSE NULL::text END AS notas_economicas,
    codigo_vinculacion,
    -- No es dato clinico ni plata: es una condicion laboral, y la ve todo el
    -- que ve el padron. El mostrador la necesita para que el interruptor
    -- "queda a deber" diga la verdad.
    retira_como_retribucion
   FROM pacientes
  WHERE puede_ver_padron();
create or replace view public.dispensas_segun_rol as
 SELECT id, user_id, paciente_id, fecha, producto, genetica_id, gramos, unidad,
    modalidad, entregado_por, con_receta, notas, creado_en, recibo_numero,
    lote_codigo,
        CASE WHEN puede_ver_plata() THEN aporte ELSE NULL::numeric END AS aporte,
        CASE WHEN puede_ver_plata() THEN medio_pago ELSE NULL::text END AS medio_pago,
        CASE WHEN puede_ver_plata() THEN pago_referencia ELSE NULL::text END AS pago_referencia,
        CASE WHEN puede_ver_plata() THEN aporte_desglose ELSE NULL::jsonb END AS aporte_desglose,
    -- Que fue el movimiento no es plata: es lo que permite que el balance de
    -- materia deje de leer una operacion normal como un error.
    tipo_movimiento
   FROM ong_dispensas
  WHERE mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'auditor'::text]);
revoke all on public.pacientes_segun_rol from anon;
revoke all on public.dispensas_segun_rol from anon;
grant select on public.pacientes_segun_rol to authenticated;
grant select on public.dispensas_segun_rol to authenticated;

-- ═══ de 20260908020000_dispensas_aporte_esperado.sql ═══
-- LA DEUDA SE DECLARA, NO SE DEDUCE.
--
-- Lo intuitivo seria calcularla como gramos x tarifa, y no funciona: la tarifa
-- SUGIERE pero no impone, y 703 de 704 aportes son multiplos de $1.000. O sea
-- que cobran en pesos redondos y la tarifa por gramo es el RESULTADO, no la
-- entrada. Una deuda deducida de la tarifa es un numero que nadie firmo, y el
-- primer socio que lo discuta se lleva puesta la confianza en la pantalla.
--
-- `aporte` es lo que efectivamente entro. `aporte_esperado` es lo que se acordo
-- cobrar por esa entrega. La deuda es la resta, y es aritmetica exacta.
--
-- NULLABLE A PROPOSITO, y esta vez importa mas que nunca: null es "no se cuanto
-- se acordo", y las 198 entregas a cuenta que ya estan cargadas nacen asi. Un
-- cero diria "se acordo no cobrar nada", que es una condonacion y no un dato
-- faltante.
alter table public.ong_dispensas
  add column if not exists aporte_esperado numeric;
alter table public.ong_dispensas
  drop constraint if exists ong_dispensas_aporte_esperado_check;
alter table public.ong_dispensas
  add constraint ong_dispensas_aporte_esperado_check
  check (aporte_esperado is null or aporte_esperado >= 0);
comment on column public.ong_dispensas.aporte_esperado is
  'Lo que se acordo cobrar por esta entrega. La deuda es aporte_esperado - aporte. null = no se sabe cuanto se acordo, que NO es lo mismo que cero.';
-- La app no lee la tabla, lee la vista. Una columna nueva no llega sola, y va
-- al final: create or replace view renombra por posicion.
create or replace view public.dispensas_segun_rol as
 SELECT id, user_id, paciente_id, fecha, producto, genetica_id, gramos, unidad,
    modalidad, entregado_por, con_receta, notas, creado_en, recibo_numero,
    lote_codigo,
        CASE WHEN puede_ver_plata() THEN aporte ELSE NULL::numeric END AS aporte,
        CASE WHEN puede_ver_plata() THEN medio_pago ELSE NULL::text END AS medio_pago,
        CASE WHEN puede_ver_plata() THEN pago_referencia ELSE NULL::text END AS pago_referencia,
        CASE WHEN puede_ver_plata() THEN aporte_desglose ELSE NULL::jsonb END AS aporte_desglose,
    tipo_movimiento,
    -- Es plata: quien no ve plata no ve cuanto se le debe a la asociacion.
        CASE WHEN puede_ver_plata() THEN aporte_esperado ELSE NULL::numeric END AS aporte_esperado
   FROM ong_dispensas
  WHERE mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'auditor'::text]);
revoke all on public.dispensas_segun_rol from anon;
grant select on public.dispensas_segun_rol to authenticated;

-- ═══ de 20260909120000_documentos_notas_preview.sql ═══
-- EL TEXTO DEL PAPEL NO TIENE QUE VIAJAR EN EL LISTADO.
--
-- Medido el 09/09/2026: `ong_documentos` pesa 1.230 kB y se baja entero cada
-- vez que se abre O.N.G. De esos, 950 kB son la columna `notas`, y ahi adentro
-- esta el TEXTO COMPLETO de cada recibo emitido: 846 papeles de unos 1.100
-- caracteres cada uno. Es el 40% de todo lo que baja la pantalla.
--
-- Guardar el texto esta BIEN y no se toca: un documento emitido tiene que poder
-- reimprimirse dentro de dos anos tal como se emitio, no recalculado con los
-- datos de hoy. Lo que esta mal es traerlo para dibujar una lista que muestra
-- sesenta caracteres.
--
-- GENERADA Y NO UN CAMPO QUE ALGUIEN MANTIENE: se actualiza sola con `notas`, y
-- asi no puede desincronizarse. Mismo criterio que el VPD y que la capacidad de
-- las areas: un derivado guardado a mano se desincroniza del dato que lo
-- origino apenas alguien lo corrige.
--
-- 120 caracteres porque el listado corta en 60: alcanza para la primera linea y
-- deja margen para que la UI decida cuanto muestra sin volver a la base.
alter table public.ong_documentos
  add column if not exists notas_preview text
  generated always as (left(notas, 120)) stored;
comment on column public.ong_documentos.notas_preview is
  'Los primeros 120 caracteres de notas, para el listado. Generada: se mantiene sola. El texto completo se pide al abrir el documento.';

-- ═══ de 20260909140000_pacientes_apellido.sql ═══
-- EL APELLIDO PRIMERO, EN TODOS LADOS. Y para eso hay que SABER cual es.
--
-- `nombre_completo` es un solo campo de texto libre cargado con dos criterios
-- distintos: hay «Juan Pablo Duarte» (nombre primero) y hay «Alvarez Walter
-- Ariel» (apellido primero). Con eso no se puede ordenar por apellido: tomar la
-- ultima palabra pondria a «Alvarez Walter Ariel» en la A de Ariel.
--
-- NO SE TOCA `nombre_completo`. Sigue siendo lo que alguien escribio, y es lo
-- que se compara contra el REPROCANN y contra la planilla. Estas columnas son
-- la LECTURA de ese texto, no su reemplazo.
alter table public.pacientes
  add column if not exists apellido text,
  add column if not exists nombres text,
  -- El backfill ADIVINA. Esta marca separa «alguien lo confirmo» de «lo dedujo
  -- el sistema», y es lo unico que evita que el orden por apellido se lea como
  -- un dato verificado cuando no lo es.
  add column if not exists apellido_confirmado boolean not null default false;
comment on column public.pacientes.apellido is
  'El apellido, para mostrar y ordenar. Deducido de nombre_completo si apellido_confirmado es false.';
comment on column public.pacientes.nombres is
  'El resto del nombre. nombre_completo NO se toca: es lo que se compara contra el REPROCANN.';
comment on column public.pacientes.apellido_confirmado is
  'true = lo reviso una persona. false = lo dedujo el sistema y puede estar mal.';
-- BACKFILL PROPUESTO: la ULTIMA palabra como apellido. Es la convencion del
-- formulario («Nombre y Apellido») y acierta en la mayoria, pero se equivoca en
-- los que estan al reves. Queda sin confirmar a proposito.
update public.pacientes
   set apellido = (regexp_split_to_array(trim(nombre_completo), ' '))[
         array_length(regexp_split_to_array(trim(nombre_completo), ' '), 1)],
       nombres = nullif(trim(regexp_replace(trim(nombre_completo), '\s+\S+$', '')), '')
 where not apellido_confirmado and coalesce(trim(nombre_completo), '') <> '';
create index if not exists pacientes_apellido_idx on public.pacientes (apellido);
-- La app lee la vista, no la tabla: una columna nueva no llega sola. Van al
-- FINAL porque create or replace view renombra por posicion.
create or replace view public.pacientes_segun_rol as
 SELECT id, nombre_completo, dni, fecha_nacimiento, telefono, email, localidad,
    provincia, domicilio, foto_url, reprocann_nro, reprocann_estado,
    reprocann_emision, reprocann_vencimiento, modalidad, socio, fecha_alta,
    activo, notas, creado_en, plantas_habilitadas, m2_habilitados,
    tope_mensual_g, nivel_tarifa, codigo,
        CASE WHEN puede_ver_clinico() THEN patologia ELSE NULL::text END AS patologia,
        CASE WHEN puede_ver_clinico() THEN medico_tratante ELSE NULL::text END AS medico_tratante,
        CASE WHEN puede_ver_clinico() THEN matricula_medico ELSE NULL::text END AS matricula_medico,
        CASE WHEN puede_ver_clinico() THEN credencial_url ELSE NULL::text END AS credencial_url,
        CASE WHEN puede_ver_plata() THEN aporte_acordado_g ELSE NULL::numeric END AS aporte_acordado_g,
        CASE WHEN puede_ver_plata() THEN notas_economicas ELSE NULL::text END AS notas_economicas,
    codigo_vinculacion, retira_como_retribucion,
    apellido, nombres, apellido_confirmado
   FROM pacientes
  WHERE puede_ver_padron();
revoke all on public.pacientes_segun_rol from anon;
grant select on public.pacientes_segun_rol to authenticated;

-- ═══ de 20260916230000_fechas_por_defecto_en_hora_argentina.sql ═══
-- Las fechas por defecto salian en UTC: despues de las 21 h de Argentina, «hoy»
-- ya era mañana.
--
-- `current_date` usa la zona de la sesion, y el servidor de Supabase esta en UTC.
-- Cualquier fila que se guardara sin fecha explicita entre las 21:00 y la
-- medianoche quedaba con el dia siguiente. Es el mismo bug que tenia el front
-- con `toISOString()`, arreglado en `lib/fechaLocal.ts` el mismo dia: el
-- 08/09/2026 tres entregas cargadas a las 22 h quedaron con fecha 09/09.
--
-- Se fija la zona en la expresion y no en la base (`alter database set timezone`)
-- a proposito: cambiar la zona de la sesion mueve tambien como se muestran todos
-- los timestamptz y los `now()` de funciones que hoy dan bien.

alter table public.ong_dispensas   alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.ong_caja        alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.ong_documentos  alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.ong_visitas     alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.ong_traslados   alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.ong_lotes       alter column fecha_elaboracion set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.pacientes       alter column fecha_alta        set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.eventos         alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.riegos          alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.cosechas        alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.aplicaciones    alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.recordatorios   alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.jornadas        alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.mantenimientos  alter column fecha_realizado   set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
-- El mandato: `new.mandato_fecha::date` sobre un timestamptz tambien corta en UTC.
-- CREATE OR REPLACE (no drop + create) para no perder los grants.
create or replace function public.solicitud_pasar_mandato()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if new.asociado_id is not null
     and new.mandato_aceptado
     and (old.asociado_id is distinct from new.asociado_id)
  then
    update public.ong_asociados
       set mandato_aceptado = true,
           mandato_fecha    = (coalesce(new.mandato_fecha, now()) at time zone 'America/Argentina/Buenos_Aires')::date,
           mandato_hora     = coalesce(new.mandato_fecha, now()),
           mandato_version  = new.mandato_version
     where id = new.asociado_id
       and coalesce(mandato_aceptado, false) = false;
  end if;
  return new;
end;
$function$;

-- ═══ de 20260917000000_storage_documentos_solo_authenticated.sql ═══
-- Las reglas del bucket `documentos` pasan de `public` a `authenticated`.
--
-- `public` incluye a `anon`, o sea a cualquiera sin sesion. Hoy no dejaban pasar
-- a nadie de afuera, porque cada una exige ademas un rol real con `mi_rol()`, que
-- devuelve 'sin_perfil' para anon. Pero entonces la unica barrera era esa
-- condicion: basta con que alguien la afloje para abrir las credenciales de
-- REPROCANN y los comprobantes. Con `authenticated` hacen falta dos errores.
--
-- Es el criterio que ya siguen `fotos` y `fichas`, y el que pide la skill:
-- "siempre to authenticated, nunca public".
--
-- No afecta al circuito publico de /sumate: la subida del REPROCANN pasa por la
-- Edge Function `solicitud-adjunto`, que usa la clave de servicio y no estas reglas.
--
-- Medido antes y despues ejecutando como cada rol (855 archivos, 2 institucionales):
--   anon 0 · administrador/administrativo/auditor/director_medico 855/2 ·
--   cultivador/mostrador 2/2

alter policy documentos_escribir               on storage.objects to authenticated;
alter policy documentos_institucional_borrar   on storage.objects to authenticated;
alter policy documentos_institucional_escribir on storage.objects to authenticated;
alter policy documentos_institucional_ver      on storage.objects to authenticated;
alter policy documentos_ver                    on storage.objects to authenticated;

-- ═══ de 20260917001000_resumen_plantas_dias_en_hora_argentina.sql ═══
-- `resumen_plantas` calculaba los dias de vida con CURRENT_DATE, que es UTC.
--
-- Despues de las 21 h de Argentina cada planta figuraba con un dia de mas, y
-- `faseEfectiva` (lib/cultivo.ts) deduce la floracion de las automaticas desde
-- `dias_de_vida`: una planta podia pasar a floracion un dia antes, justo de noche.
-- Es el mismo bug que 20260916230000_fechas_por_defecto_en_hora_argentina, que se
-- le paso a esta vista porque aquella migracion solo miraba defaults y funciones.
--
-- Sigue siendo SECURITY DEFINER a proposito (filtra por rol adentro, como
-- pacientes_min). CREATE OR REPLACE conserva los grants y la vista no tenia
-- reloptions que perder. Mismas columnas, mismo orden.

create or replace view public.resumen_plantas as
 SELECT p.id,
    p.codigo,
    COALESCE(p.apodo, g.nombre, 'Sin nombre'::text) AS nombre,
    g.nombre AS genetica,
    g.banco,
    g.tipo,
    p.fase,
    p.fecha_germinacion,
    (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date - p.fecha_germinacion AS dias_de_vida,
    p.sustrato,
    p.maceta,
    p.ubicacion,
    p.slot,
    p.activa,
    p.paciente_id,
        CASE
            WHEN puede_ver_padron() THEN pac.nombre_completo
            ELSE NULL::text
        END AS paciente_nombre,
    ( SELECT max(e.fecha) AS max
           FROM eventos e
          WHERE e.planta_id = p.id AND e.tipo = 'Riego'::text) AS ultimo_riego,
    ( SELECT count(*) AS count
           FROM eventos e
          WHERE e.planta_id = p.id) AS total_eventos,
    p.genetica_id,
    g.tiempo_vege_dias
   FROM plantas p
     LEFT JOIN geneticas g ON g.id = p.genetica_id
     LEFT JOIN pacientes pac ON pac.id = p.paciente_id
  WHERE mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text]);

-- ═══ de 20260917002000_rls_authenticated_y_funciones_sin_anon.sql ═══
-- Endurecimiento sin cambio de acceso (17/09/2026), a partir del Security Advisor.
-- Ninguno de estos era un agujero abierto: `anon` no tiene grants sobre las
-- tablas y cada regla ya exige un rol real. Lo que se busca es que abrir algo
-- necesite DOS errores en vez de uno.
--
-- Medido ejecutando como cada rol, antes y despues, sobre las 14 tablas y
-- perfiles_usuario: mismo numero de filas en los 8 roles.

-- 1. Las 24 reglas que estaban `to public` pasan a `to authenticated`.
--    `public` incluye a anon. Es el mismo ajuste que 20260917000000 en Storage.
alter policy ambiente_lecturas_escribir on public.ambiente_lecturas              to authenticated;
alter policy cultivo_areas_escribir     on public.cultivo_areas                  to authenticated;
alter policy cultivo_areas_ver          on public.cultivo_areas                  to authenticated;
alter policy cultivo_grupos_escribir    on public.cultivo_grupos                 to authenticated;
alter policy cultivo_grupos_ver         on public.cultivo_grupos                 to authenticated;
alter policy cultivo_lotes_escribir     on public.cultivo_lotes                  to authenticated;
alter policy cultivo_lotes_ver          on public.cultivo_lotes                  to authenticated;
alter policy ong_asociados_ver          on public.ong_asociados                  to authenticated;
alter policy ong_caja_escribir          on public.ong_caja                       to authenticated;
alter policy ong_dispensas_escribir     on public.ong_dispensas                  to authenticated;
alter policy ong_dispensas_ver          on public.ong_dispensas                  to authenticated;
alter policy ong_documentos_escribir    on public.ong_documentos                 to authenticated;
alter policy ong_docs_inst_escribir     on public.ong_documentos_institucionales to authenticated;
alter policy ong_docs_inst_ver          on public.ong_documentos_institucionales to authenticated;
alter policy ong_lotes_escribir         on public.ong_lotes                      to authenticated;
alter policy ong_lotes_ver              on public.ong_lotes                      to authenticated;
alter policy ong_pagos_prov_escribir    on public.ong_pagos_proveedor            to authenticated;
alter policy ong_pagos_prov_ver         on public.ong_pagos_proveedor            to authenticated;
alter policy ong_pedidos_escribir       on public.ong_pedidos                    to authenticated;
alter policy ong_pedidos_ver            on public.ong_pedidos                    to authenticated;
alter policy ong_tarifas_escribir       on public.ong_tarifas                    to authenticated;
alter policy ong_tarifas_ver            on public.ong_tarifas                    to authenticated;
alter policy ong_visitas_escribir       on public.ong_visitas                    to authenticated;
alter policy ong_visitas_ver            on public.ong_visitas                    to authenticated;
-- 2. Las funciones internas dejan de poder llamarse sin sesion.
--    OJO: revocar solo a `anon` no alcanza, porque Postgres da EXECUTE a PUBLIC
--    por defecto. Se revoca a los dos y se devuelve explicito a authenticated.
--    Quedan abiertas a proposito solicitud_crear y solicitud_estado: son las del
--    formulario publico /sumate.
do $$
declare f text;
begin
  foreach f in array array[
    'public.asignar_numero_recibo(uuid)',
    'public.es_admin()',
    'public.marcar_acceso()',
    'public.mi_rol()',
    'public.preservar_lo_que_no_puede_ver()',
    'public.preservar_los_importes()',
    'public.puede_escribir()',
    'public.puede_ver_clinico()',
    'public.puede_ver_padron()',
    'public.puede_ver_plata()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;
-- 3. perfiles_ver: `(select auth.uid())` se evalua una vez por consulta en vez de
--    una vez por fila. Mismo resultado.
alter policy perfiles_ver on public.perfiles_usuario
  using ((id = (select auth.uid())) or es_admin());
-- 4. administrador_sistema puede emitir recibos, como administrador. Faltaba en
--    la lista de adentro de la funcion. CREATE OR REPLACE conserva los grants.
create or replace function public.asignar_numero_recibo(p_dispensa uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  n integer;
begin
  if mi_rol() not in ('administrador', 'administrador_sistema', 'administrativo') then
    raise exception 'Sin permiso para emitir recibos';
  end if;

  select recibo_numero into n from ong_dispensas where id = p_dispensa for update;
  if not found then
    raise exception 'No existe la dispensa %', p_dispensa;
  end if;
  if n is not null then
    return n;
  end if;

  n := nextval('ong_recibo_seq');
  update ong_dispensas set recibo_numero = n where id = p_dispensa;
  return n;
end;
$function$;

-- ═══ de 20260818000600_policies_resto.sql ═══
-- Las policies de todo lo que NO es `ong_*`: cultivo, plata, padrón y perfiles.
--
-- Esto es lo que traían las otras nueve migraciones que lista
-- `20260819_sistema_de_roles.sql` y que tampoco existían como archivo. El PR
-- anterior cerró las tablas `ong_*`; sin esto, las ~29 restantes se quedaban
-- con las reglas `using (true)` que se habían puesto para poder trabajar, o sea
-- abiertas — y entre ellas están `pacientes` (el padrón con las fichas
-- clínicas) y `perfiles_usuario` (quién es quién).
--
-- ⚠️ SE ESCRIBE POR GRUPOS Y NO UNA POR UNA a propósito. Son 62 reglas con
-- cuatro formas distintas; copiadas una por una, la próxima vez que haya que
-- sumar un rol hay que acordarse de tocar 62 lugares y siempre se escapa uno.
-- Así, sumar un rol al cultivo es editar UNA lista.

do $$
declare
  t text;
  p record;

  -- Quién escribe en el CULTIVO. El mostrador NO: puede tomar una lectura de
  -- ambiente (ver más abajo), pero no toca plantas ni riegos.
  cultivo_escribe text := 'mi_rol() = any (array[''administrador'',''administrador_sistema'',''cultivador'',''director_cultivo''])';

  -- Quién escribe en la PLATA. El cultivo no entra, y el auditor tampoco:
  -- mira todo y no escribe nada, que es el punto de que exista.
  plata_escribe text := 'mi_rol() = any (array[''administrador'',''administrador_sistema'',''administrativo''])';

  -- Lo ve todo rol REAL. El filtro es contra los dos no-roles, no `<> 'demo'`:
  -- como el registro de Supabase es abierto, cualquiera que se cree una cuenta
  -- cae en 'sin_perfil' y pasaría un filtro que sólo mire 'demo'.
  ve_todo_rol text := 'mi_rol() <> all (array[''sin_perfil'',''demo''])';

  -- Las tablas del cultivo: se ven entre todos, las escribe quien cultiva.
  tablas_cultivo text[] := array[
    'actividades','ambiente_salas','aplicaciones','asistencias','cosechas',
    'cultivadores','cultivo_areas','cultivo_grupos','cultivo_lotes','eventos',
    'geneticas','jornadas','mantenimientos','plantas','recordatorios','riegos'];

  -- Las tablas de plata: sólo las ve quien puede ver plata.
  tablas_plata text[] := array[
    'costos','econometria_config','fichas_comerciales','instalaciones_items',
    'insumos','ofertas_instalacion','presupuesto_instalacion_items',
    'presupuestos_instalacion','proveedores_instalacion'];

  todas text[];
begin
  -- ⚠️ `arqueos` y `planes_cultivo` NO estan aca: sus tablas se crean recien en
  -- 20260902140000 y 20260902160000, despues de esta migracion, y ademas esas
  -- dos ya traen sus propias policies identicas. Incluirlas hacia fallar este
  -- archivo entero en una instalacion desde cero.
  todas := tablas_cultivo || tablas_plata || array[
    'ambiente_lecturas','pacientes','perfiles_usuario'];

  -- 1. Fuera lo que haya, incluidas las permisivas puestas para destrabar.
  for p in
    select policyname, tablename from pg_policies
     where schemaname='public' and tablename = any(todas)
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;

  -- 2. RLS prendido en todas.
  foreach t in array todas loop
    execute format('alter table if exists public.%I enable row level security', t);
  end loop;

  -- 3. Cultivo.
  foreach t in array tablas_cultivo loop
    execute format('create policy %I on public.%I for select to authenticated using (%s)',
                   t || '_ver', t, ve_todo_rol);
    execute format('create policy %I on public.%I for all to authenticated using (%s) with check (%s)',
                   t || '_escribir', t, cultivo_escribe, cultivo_escribe);
  end loop;

  -- 4. Plata.
  foreach t in array tablas_plata loop
    execute format('create policy %I on public.%I for select to authenticated using (puede_ver_plata())',
                   t || '_ver', t);
    execute format('create policy %I on public.%I for all to authenticated using (%s) with check (%s)',
                   t || '_escribir', t, plata_escribe, plata_escribe);
  end loop;
end $$;
-- ───────────────────────────────────────────────────────────────────────────
-- Las cuatro que no siguen ningún patrón
-- ───────────────────────────────────────────────────────────────────────────

-- AMBIENTE · lecturas. Es la única tabla de cultivo donde el MOSTRADOR escribe:
-- tomar la lectura de la sala es el paso 1 de abrir la sede, y lo hace quien
-- abre. Crear una SALA, en cambio, es armar la instalación y queda en cultivo.
create policy "ambiente_lecturas_ver" on public.ambiente_lecturas
  for select to authenticated
  using (mi_rol() <> all (array['sin_perfil','demo']));
create policy "ambiente_lecturas_escribir" on public.ambiente_lecturas
  for all to authenticated
  using (mi_rol() = any (array['administrador','administrador_sistema','cultivador','director_cultivo','mostrador']))
  with check (mi_rol() = any (array['administrador','administrador_sistema','cultivador','director_cultivo','mostrador']));
-- PACIENTES · el padrón. Se parte por operación porque BORRAR una persona no es
-- lo mismo que corregirle el teléfono: lo primero queda sólo en administración.
create policy "pacientes_ver_ficha" on public.pacientes
  for select to authenticated using (puede_ver_padron());
create policy "pacientes_escribir" on public.pacientes
  for insert to authenticated with check (puede_ver_padron());
create policy "pacientes_actualizar" on public.pacientes
  for update to authenticated using (puede_ver_padron()) with check (puede_ver_padron());
create policy "pacientes_borrar" on public.pacientes
  for delete to authenticated using (es_admin());
-- PERFILES · cada uno ve el suyo, el admin ve todos.
-- ⚠️ `(select auth.uid())` entre paréntesis y no `auth.uid()` pelado: así
-- Postgres lo evalúa una vez por consulta en lugar de una vez por fila.
create policy "perfiles_ver" on public.perfiles_usuario
  for select to authenticated
  using ((id = (select auth.uid())) or es_admin());
create policy "perfiles_admin" on public.perfiles_usuario
  for all to authenticated using (es_admin()) with check (es_admin());

-- ═══ de 20260818000100_tablas_ong.sql ═══
-- ───────────────────────────────────────────────────────────────────────────
-- 2. Claves, FKs y checks
-- ───────────────────────────────────────────────────────────────────────────
--
-- Van en un bloque que ignora el duplicado, porque `alter table ... add
-- constraint` no tiene `if not exists` y la migración tiene que poder correrse
-- sobre una base que ya tenga parte hecha.

do $$
declare s text;
begin
  foreach s in array array[
    'alter table public.ong_actas add constraint ong_actas_pkey primary key (id)',
    'alter table public.ong_asociados add constraint ong_asociados_pkey primary key (id)',
    'alter table public.ong_autoridades add constraint ong_autoridades_pkey primary key (id)',
    'alter table public.ong_caja add constraint ong_caja_pkey primary key (id)',
    'alter table public.ong_categorias_socio add constraint ong_categorias_socio_pkey primary key (id)',
    'alter table public.ong_cuotas add constraint ong_cuotas_pkey primary key (id)',
    'alter table public.ong_cuotas_emitidas add constraint ong_cuotas_emitidas_pkey primary key (id)',
    'alter table public.ong_ddjj add constraint ong_ddjj_pkey primary key (id)',
    'alter table public.ong_dispensas add constraint ong_dispensas_pkey primary key (id)',
    'alter table public.ong_documentos add constraint ong_documentos_pkey primary key (id)',
    'alter table public.ong_entidad add constraint ong_entidad_pkey primary key (id)',
    'alter table public.ong_feedback_clinico add constraint ong_feedback_clinico_pkey primary key (id)',
    'alter table public.ong_libros add constraint ong_libros_pkey primary key (id)',
    'alter table public.ong_lotes add constraint ong_lotes_pkey primary key (id)',
    'alter table public.ong_pedidos add constraint ong_pedidos_pkey primary key (id)',
    'alter table public.ong_predios add constraint ong_predios_pkey primary key (id)',
    'alter table public.ong_requisitos add constraint ong_requisitos_pkey primary key (id)',
    'alter table public.ong_traslados add constraint ong_traslados_pkey primary key (id)',
    'alter table public.ong_visitas add constraint ong_visitas_pkey primary key (id)',

    'alter table public.ong_ddjj add constraint ong_ddjj_periodo_key unique (periodo)',
    'alter table public.ong_feedback_clinico add constraint ong_feedback_clinico_dispensa_id_key unique (dispensa_id)',
    'alter table public.ong_lotes add constraint ong_lotes_user_id_codigo_key unique (user_id, codigo)',
    'alter table public.ong_pedidos add constraint ong_pedidos_user_id_codigo_reserva_key unique (user_id, codigo_reserva)',

    'alter table public.ong_actas add constraint ong_actas_libro_id_fkey foreign key (libro_id) references ong_libros(id) on delete set null',
    'alter table public.ong_asociados add constraint ong_asociados_acta_alta_id_fkey foreign key (acta_alta_id) references ong_actas(id) on delete set null',
    'alter table public.ong_asociados add constraint ong_asociados_acta_baja_id_fkey foreign key (acta_baja_id) references ong_actas(id) on delete set null',
    'alter table public.ong_asociados add constraint ong_asociados_paciente_id_fkey foreign key (paciente_id) references pacientes(id) on delete set null',
    'alter table public.ong_caja add constraint ong_caja_cuota_id_fkey foreign key (cuota_id) references ong_cuotas_emitidas(id) on delete set null',
    'alter table public.ong_caja add constraint ong_caja_dispensa_id_fkey foreign key (dispensa_id) references ong_dispensas(id) on delete set null',
    'alter table public.ong_caja add constraint ong_caja_documento_id_fkey foreign key (documento_id) references ong_documentos(id) on delete set null',
    'alter table public.ong_caja add constraint ong_caja_paciente_id_fkey foreign key (paciente_id) references pacientes(id) on delete set null',
    'alter table public.ong_cuotas add constraint ong_cuotas_acta_id_fkey foreign key (acta_id) references ong_actas(id) on delete set null',
    'alter table public.ong_cuotas_emitidas add constraint ong_cuotas_emitidas_asociado_id_fkey foreign key (asociado_id) references ong_asociados(id) on delete cascade',
    'alter table public.ong_dispensas add constraint ong_dispensas_genetica_id_fkey foreign key (genetica_id) references geneticas(id) on delete set null',
    'alter table public.ong_dispensas add constraint ong_dispensas_paciente_id_fkey foreign key (paciente_id) references pacientes(id) on delete set null',
    'alter table public.ong_dispensas add constraint ong_dispensas_visita_id_fkey foreign key (visita_id) references ong_visitas(id) on delete set null',
    'alter table public.ong_documentos add constraint ong_documentos_asociado_id_fkey foreign key (asociado_id) references ong_asociados(id) on delete set null',
    'alter table public.ong_documentos add constraint ong_documentos_dispensa_id_fkey foreign key (dispensa_id) references ong_dispensas(id) on delete set null',
    'alter table public.ong_documentos add constraint ong_documentos_paciente_id_fkey foreign key (paciente_id) references pacientes(id) on delete set null',
    'alter table public.ong_feedback_clinico add constraint ong_feedback_clinico_dispensa_id_fkey foreign key (dispensa_id) references ong_dispensas(id) on delete cascade',
    'alter table public.ong_feedback_clinico add constraint ong_feedback_clinico_paciente_id_fkey foreign key (paciente_id) references pacientes(id) on delete set null',
    'alter table public.ong_lotes add constraint ong_lotes_cosecha_id_fkey foreign key (cosecha_id) references cosechas(id) on delete set null',
    'alter table public.ong_lotes add constraint ong_lotes_genetica_id_fkey foreign key (genetica_id) references geneticas(id) on delete set null',
    'alter table public.ong_lotes add constraint ong_lotes_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null',
    'alter table public.ong_pedidos add constraint ong_pedidos_asociado_id_fkey foreign key (asociado_id) references ong_asociados(id) on delete set null',
    'alter table public.ong_pedidos add constraint ong_pedidos_dispensa_id_fkey foreign key (dispensa_id) references ong_dispensas(id) on delete set null',
    'alter table public.ong_pedidos add constraint ong_pedidos_lote_id_fkey foreign key (lote_id) references ong_lotes(id) on delete restrict',
    'alter table public.ong_pedidos add constraint ong_pedidos_paciente_id_fkey foreign key (paciente_id) references pacientes(id) on delete set null',
    'alter table public.ong_pedidos add constraint ong_pedidos_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null',
    'alter table public.ong_traslados add constraint ong_traslados_paciente_id_fkey foreign key (paciente_id) references pacientes(id) on delete set null',
    'alter table public.ong_visitas add constraint ong_visitas_paciente_id_fkey foreign key (paciente_id) references pacientes(id) on delete set null',
    'alter table public.ong_visitas add constraint ong_visitas_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null',

    'alter table public.ong_caja add constraint ong_caja_monto_check check ((monto > (0)::numeric))',
    'alter table public.ong_caja add constraint ong_caja_tipo_check check ((tipo = any (array[''ingreso''::text, ''egreso''::text])))',
    'alter table public.ong_dispensas add constraint ong_dispensas_aporte_esperado_check check (((aporte_esperado is null) or (aporte_esperado >= (0)::numeric)))',
    'alter table public.ong_dispensas add constraint ong_dispensas_tipo_movimiento_check check (((tipo_movimiento is null) or (tipo_movimiento = any (array[''entrega''::text, ''entrega_a_cuenta''::text, ''cobro_de_deuda''::text, ''retribucion_en_especie''::text, ''consumo_interno''::text, ''merma''::text, ''ajuste''::text]))))',
    'alter table public.ong_dispensas add constraint ong_dispensas_unidad_check check ((unidad = any (array[''g''::text, ''u''::text, ''ml''::text])))',
    'alter table public.ong_documentos add constraint ong_documentos_tipo_check check ((tipo = any (array[''emitido''::text, ''gasto''::text])))',
    'alter table public.ong_entidad add constraint ong_entidad_cierre_ejercicio_dia_check check (((cierre_ejercicio_dia >= 1) and (cierre_ejercicio_dia <= 31)))',
    'alter table public.ong_entidad add constraint ong_entidad_cierre_ejercicio_mes_check check (((cierre_ejercicio_mes >= 1) and (cierre_ejercicio_mes <= 12)))',
    'alter table public.ong_feedback_clinico add constraint ong_feedback_clinico_escala_alivio_check check (((escala_alivio >= 1) and (escala_alivio <= 5)))',
    'alter table public.ong_lotes add constraint ong_lotes_costo_por_gramo_check check (((costo_por_gramo is null) or (costo_por_gramo >= (0)::numeric)))',
    'alter table public.ong_lotes add constraint ong_lotes_gramos_totales_check check ((gramos_totales > (0)::numeric))',
    'alter table public.ong_lotes add constraint ong_lotes_origen_check check ((origen = any (array[''propio''::text, ''comprado''::text, ''regularizacion''::text, ''propio_sin_cosecha''::text])))',
    'alter table public.ong_lotes add constraint ong_lotes_unidad_check check ((unidad = any (array[''g''::text, ''u''::text, ''ml''::text])))',
    'alter table public.ong_pedidos add constraint ong_pedidos_estado_pago_check check ((estado_pago = any (array[''Pendiente_Verificacion''::text, ''Pendiente_Efectivo''::text, ''Abonado''::text, ''Rechazado''::text])))',
    'alter table public.ong_pedidos add constraint ong_pedidos_estado_pedido_check check ((estado_pedido = any (array[''Reservado''::text, ''Listo_Para_Retiro''::text, ''Entregado''::text, ''Expirado''::text, ''Cancelado''::text])))',
    'alter table public.ong_pedidos add constraint ong_pedidos_gramos_check check ((gramos > (0)::numeric))',
    'alter table public.ong_pedidos add constraint ong_pedidos_metodo_pago_check check ((metodo_pago = any (array[''Transferencia_Billetera''::text, ''Efectivo_Sede''::text])))',
    'alter table public.ong_pedidos add constraint ong_pedidos_monto_reembolso_check check ((monto_reembolso >= (0)::numeric))',
    'alter table public.ong_traslados add constraint ong_traslados_tipo_material_check check ((tipo_material = any (array[''flores''::text, ''frascos''::text, ''plantas''::text])))',
    'alter table public.ong_visitas add constraint ong_visitas_alguien check (((paciente_id is not null) or (coalesce(btrim(nombre_libre), ''''::text) <> ''''::text)))',
    'alter table public.ong_visitas add constraint ong_visitas_motivo check ((motivo = any (array[''Primera vez''::text, ''Consulta o informacion''::text, ''Retiro''::text, ''Seguimiento''::text, ''Tramite REPROCANN''::text, ''Entrega de documentacion''::text, ''Otro''::text])))',
    'alter table public.ong_visitas add constraint ong_visitas_origen_check check ((origen = any (array[''registrada''::text, ''derivada_de_dispensa''::text])))',
    'alter table public.ong_visitas add constraint ong_visitas_resultado check (((resultado is null) or (resultado = any (array[''Se le entrego''::text, ''Quedo en volver''::text, ''Se lo oriento con el REPROCANN''::text, ''Se lo dio de alta''::text, ''Se lo derivo''::text, ''Solo informacion''::text, ''Otro''::text]))))'
  ] loop
    begin
      execute s;
    exception
      when duplicate_object then null;   -- ya estaba
      when duplicate_table then null;
      when undefined_table then null;    -- la referida llega en una migracion posterior
      when invalid_table_definition then null;  -- growflow ya tiene su clave primaria
    end;
  end loop;
end $$;

-- ═══ de 20260919120000_fk_caja_pago.sql ═══
-- La FK de `ong_caja.pago_id` a `ong_pagos_proveedor`.
--
-- Va acá y no junto al resto de las FKs de `ong_caja` por una razón de ORDEN:
-- `ong_pagos_proveedor` se crea en `20260820000011_pagos_proveedor.sql`, y las
-- tablas base van antes (20260818) porque las migraciones del 19 y 20 de agosto
-- ya las alteran. Una FK no puede apuntar a una tabla que todavía no existe.

do $$
begin
  alter table public.ong_caja
    add constraint ong_caja_pago_id_fkey
    foreign key (pago_id) references public.ong_pagos_proveedor(id) on delete cascade;
exception
  when duplicate_object then null;
  when undefined_table  then null;
end $$;

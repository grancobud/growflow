--
-- PostgreSQL database dump
--


-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
-- SET transaction_timeout = 0;  (Postgres 17+: el SQL Editor de Supabase lo acepta, se deja comentado por compatibilidad)
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: aplicar_cambio_fase(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aplicar_cambio_fase() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if new.tipo = 'CambioFase' and new.planta_id is not null and new.detalle is not null then
    update plantas set fase = new.detalle
    where id = new.planta_id
      and new.detalle in ('Germinacion','Plantula','Vegetativo','Floracion','Secado','Curado','Cosechada','Muerta');

    if new.detalle = 'Cosechada' then
      update plantas set activa = false, slot = null where id = new.planta_id;
    end if;
  end if;
  return new;
end $$;


--
-- Name: asignar_codigo_paciente(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.asignar_codigo_paciente() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
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


--
-- Name: FUNCTION asignar_codigo_paciente(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.asignar_codigo_paciente() IS 'Asigna PAC-XXX correlativo si el paciente entra sin codigo. Serializado con advisory lock.';


--
-- Name: asignar_numero_recibo(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.asignar_numero_recibo(p_dispensa uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: crear_perfil_al_alta(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crear_perfil_al_alta() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
end $$;


--
-- Name: es_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.es_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select public.mi_rol() in ('administrador', 'administrador_sistema');
$$;


--
-- Name: marcar_acceso(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.marcar_acceso() RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  update public.perfiles_usuario
  set ultimo_acceso = now()
  where id = auth.uid();
$$;


--
-- Name: marcar_planta_cosechada(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.marcar_planta_cosechada() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if new.planta_id is not null then
    update plantas
       set activa = false, slot = null, fase = 'Cosechada'
     where id = new.planta_id and activa;
  end if;
  return new;
end $$;


--
-- Name: match_documentos(public.vector, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_documentos(query_embedding public.vector, match_count integer DEFAULT 5) RETURNS TABLE(id bigint, fuente text, contenido text, similitud double precision)
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'extensions'
    AS $$
  select d.id, d.fuente, d.contenido,
         1 - (d.embedding <=> query_embedding) as similitud
  from public.documentos d
  where d.embedding is not null
  order by d.embedding <=> query_embedding
  limit match_count;
$$;


--
-- Name: mi_rol(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mi_rol() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(
    (select rol from public.perfiles_usuario where id = auth.uid() and activo is not false),
    'sin_perfil'
  );
$$;


--
-- Name: preservar_lo_que_no_puede_ver(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.preservar_lo_que_no_puede_ver() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: preservar_los_importes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.preservar_los_importes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if auth.uid() is not null and not public.puede_ver_plata() then
    new.aporte          := old.aporte;
    new.medio_pago      := old.medio_pago;
    new.pago_referencia := old.pago_referencia;
    new.aporte_desglose := old.aporte_desglose;
  end if;
  return new;
end $$;


--
-- Name: puede_escribir(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.puede_escribir() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select public.mi_rol() in ('administrador', 'cultivador', 'director_medico', 'administrativo');
$$;


--
-- Name: puede_ver_clinico(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.puede_ver_clinico() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select public.mi_rol() in ('administrador', 'administrador_sistema', 'director_medico');
$$;


--
-- Name: puede_ver_padron(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.puede_ver_padron() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select public.puede_ver_clinico() or public.mi_rol() in ('administrativo', 'mostrador');
$$;


--
-- Name: puede_ver_plata(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.puede_ver_plata() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select public.mi_rol() in
    ('administrador', 'administrador_sistema', 'administrativo', 'auditor', 'mostrador');
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
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
$$;


--
-- Name: set_actualizado_en(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_actualizado_en() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  new.actualizado_en := now();
  return new;
end $$;


--
-- Name: solicitud_crear(text, text, text, text, text, boolean, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.solicitud_crear(p_nombre text, p_dni text, p_email text DEFAULT NULL::text, p_telefono text DEFAULT NULL::text, p_notas text DEFAULT NULL::text, p_mandato_aceptado boolean DEFAULT false, p_mandato_version text DEFAULT NULL::text, p_legajo jsonb DEFAULT '{}'::jsonb) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
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
$_$;


--
-- Name: solicitud_estado(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.solicitud_estado(p_token text) RETURNS TABLE(estado text, nombre text, creada_en timestamp with time zone, actualizada_en timestamp with time zone, motivo text, entidad text, codigo_vinculacion text, reprocann_cargado boolean, reprocann_nro text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: solicitud_pasar_mandato(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.solicitud_pasar_mandato() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: actividades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.actividades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    jornada_id uuid,
    hora text,
    tipo text DEFAULT 'Otro'::text NOT NULL,
    descripcion text,
    cultivador_id uuid,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT actividades_tipo_check CHECK ((tipo = ANY (ARRAY['Riego'::text, 'Fumigacion'::text, 'Poda'::text, 'Trasplante'::text, 'Cosecha'::text, 'Mantenimiento'::text, 'Limpieza'::text, 'Reunion'::text, 'Otro'::text])))
);


--
-- Name: ambiente_lecturas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ambiente_lecturas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sala_id uuid NOT NULL,
    medido_en timestamp with time zone DEFAULT now() NOT NULL,
    temp_c numeric NOT NULL,
    humedad_pct numeric NOT NULL,
    nota text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ambiente_lecturas_humedad_pct_check CHECK (((humedad_pct >= (0)::numeric) AND (humedad_pct <= (100)::numeric))),
    CONSTRAINT ambiente_lecturas_temp_c_check CHECK (((temp_c >= ('-10'::integer)::numeric) AND (temp_c <= (60)::numeric)))
);


--
-- Name: ambiente_salas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ambiente_salas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    etapa text DEFAULT 'vegetativo'::text NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    temp_min numeric(5,2),
    temp_max numeric(5,2),
    hum_min numeric(5,2),
    hum_max numeric(5,2),
    vpd_min numeric(4,2),
    vpd_max numeric(4,2),
    CONSTRAINT ambiente_salas_etapa_check CHECK ((etapa = ANY (ARRAY['vegetativo'::text, 'floracion'::text]))),
    CONSTRAINT ambiente_salas_hum_max_check CHECK (((hum_max IS NULL) OR ((hum_max >= (0)::numeric) AND (hum_max <= (100)::numeric)))),
    CONSTRAINT ambiente_salas_hum_min_check CHECK (((hum_min IS NULL) OR ((hum_min >= (0)::numeric) AND (hum_min <= (100)::numeric)))),
    CONSTRAINT ambiente_salas_rangos_coherentes CHECK ((((temp_min IS NULL) OR (temp_max IS NULL) OR (temp_min < temp_max)) AND ((hum_min IS NULL) OR (hum_max IS NULL) OR (hum_min < hum_max)) AND ((vpd_min IS NULL) OR (vpd_max IS NULL) OR (vpd_min < vpd_max)))),
    CONSTRAINT ambiente_salas_temp_max_check CHECK (((temp_max IS NULL) OR ((temp_max >= ('-10'::integer)::numeric) AND (temp_max <= (60)::numeric)))),
    CONSTRAINT ambiente_salas_temp_min_check CHECK (((temp_min IS NULL) OR ((temp_min >= ('-10'::integer)::numeric) AND (temp_min <= (60)::numeric)))),
    CONSTRAINT ambiente_salas_vpd_max_check CHECK (((vpd_max IS NULL) OR ((vpd_max >= (0)::numeric) AND (vpd_max <= (6)::numeric)))),
    CONSTRAINT ambiente_salas_vpd_min_check CHECK (((vpd_min IS NULL) OR ((vpd_min >= (0)::numeric) AND (vpd_min <= (6)::numeric))))
);


--
-- Name: COLUMN ambiente_salas.temp_min; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ambiente_salas.temp_min IS 'Null = usa el rango de la etapa (RANGOS en app/src/lib/ambiente.ts).';


--
-- Name: aplicaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aplicaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    planta_id uuid,
    fecha date DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date NOT NULL,
    categoria text DEFAULT 'Fumigacion'::text NOT NULL,
    producto text,
    dosis text,
    metodo text,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT aplicaciones_categoria_check CHECK ((categoria = ANY (ARRAY['Fumigacion'::text, 'Insecticida'::text, 'Fungicida'::text, 'Foliar'::text, 'Acaricida'::text, 'Bactericida'::text, 'Otro'::text])))
);


--
-- Name: arqueos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arqueos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    momento timestamp with time zone DEFAULT now() NOT NULL,
    esperado_efectivo numeric(14,2),
    esperado_transferencia numeric(14,2),
    esperado_stock_g numeric(12,2),
    contado_efectivo numeric(14,2),
    contado_transferencia numeric(14,2),
    contado_stock_g numeric(12,2),
    nota text,
    contado_por uuid,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE arqueos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.arqueos IS 'Lo que alguien conto de caja y stock, contra lo que el sistema decia. Sin update ni delete: un arqueo es una foto y se corrige cargando otro.';


--
-- Name: asistencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asistencias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    jornada_id uuid,
    cultivador_id uuid,
    presente boolean DEFAULT true NOT NULL,
    hora_entrada text,
    hora_salida text,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cosechas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cosechas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    planta_id uuid,
    fecha date DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date NOT NULL,
    peso_humedo_g numeric(7,1),
    peso_seco_g numeric(7,1),
    notas_curado text,
    notas_sabor text,
    valoracion integer,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cosechas_valoracion_check CHECK (((valoracion >= 1) AND (valoracion <= 10)))
);


--
-- Name: costos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.costos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    tipo text DEFAULT 'fijo'::text NOT NULL,
    categoria text,
    monto numeric DEFAULT 0 NOT NULL,
    periodicidad text DEFAULT 'mensual'::text NOT NULL,
    cantidad numeric DEFAULT 1,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT costos_periodicidad_check CHECK ((periodicidad = ANY (ARRAY['unico'::text, 'mensual'::text, 'bimestral'::text, 'por_ciclo'::text, 'anual'::text]))),
    CONSTRAINT costos_tipo_check CHECK ((tipo = ANY (ARRAY['fijo'::text, 'variable'::text])))
);


--
-- Name: cultivadores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cultivadores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    rol text DEFAULT 'Cultivador'::text NOT NULL,
    telefono text,
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cultivadores_rol_check CHECK ((rol = ANY (ARRAY['Cultivador'::text, 'Responsable'::text, 'Encargado'::text, 'Voluntario'::text])))
);


--
-- Name: cultivo_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cultivo_areas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    tipo text DEFAULT 'carpa'::text NOT NULL,
    ancho_m numeric(6,2),
    largo_m numeric(6,2),
    cols integer NOT NULL,
    rows integer NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    watts integer,
    horas_luz numeric(4,1),
    CONSTRAINT cultivo_areas_ancho_m_check CHECK (((ancho_m IS NULL) OR (ancho_m > (0)::numeric))),
    CONSTRAINT cultivo_areas_cols_check CHECK (((cols >= 1) AND (cols <= 40))),
    CONSTRAINT cultivo_areas_horas_luz_check CHECK (((horas_luz IS NULL) OR ((horas_luz >= (0)::numeric) AND (horas_luz <= (24)::numeric)))),
    CONSTRAINT cultivo_areas_largo_m_check CHECK (((largo_m IS NULL) OR (largo_m > (0)::numeric))),
    CONSTRAINT cultivo_areas_rows_check CHECK (((rows >= 1) AND (rows <= 40))),
    CONSTRAINT cultivo_areas_tipo_check CHECK ((tipo = ANY (ARRAY['carpa'::text, 'cama'::text, 'sector'::text, 'sala'::text, 'mesa'::text, 'invernadero'::text]))),
    CONSTRAINT cultivo_areas_watts_check CHECK (((watts IS NULL) OR ((watts >= 0) AND (watts <= 100000))))
);


--
-- Name: COLUMN cultivo_areas.watts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cultivo_areas.watts IS 'Potencia de iluminacion instalada en el area. Null = sin cargar, no cero.';


--
-- Name: COLUMN cultivo_areas.horas_luz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cultivo_areas.horas_luz IS 'Horas de luz por dia. Con watts alcanza para estimar el consumo diario del area.';


--
-- Name: cultivo_grupos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cultivo_grupos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lote_id uuid NOT NULL,
    nombre text NOT NULL,
    sustrato text,
    maceta text,
    variable text,
    notas text,
    orden integer DEFAULT 0 NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cultivo_lotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cultivo_lotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    fecha_germinacion date,
    genetica_id uuid,
    area_id uuid,
    notas text,
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ong_predios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_predios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    nombre text NOT NULL,
    direccion text,
    localidad text,
    provincia text,
    municipio text,
    georreferenciado boolean DEFAULT false,
    municipio_notificado boolean DEFAULT false,
    activo boolean DEFAULT true,
    notas text,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: pacientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pacientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre_completo text NOT NULL,
    dni text,
    fecha_nacimiento date,
    telefono text,
    email text,
    localidad text,
    provincia text,
    domicilio text,
    foto_url text,
    reprocann_nro text,
    reprocann_estado text DEFAULT 'En tramite'::text NOT NULL,
    reprocann_emision date,
    reprocann_vencimiento date,
    modalidad text,
    credencial_url text,
    patologia text,
    medico_tratante text,
    matricula_medico text,
    socio boolean DEFAULT true NOT NULL,
    fecha_alta date DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date,
    activo boolean DEFAULT true NOT NULL,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    plantas_habilitadas integer,
    m2_habilitados numeric(6,2),
    tope_mensual_g numeric,
    nivel_tarifa text DEFAULT 'nuevo'::text NOT NULL,
    codigo text,
    aporte_acordado_g numeric,
    notas_economicas text,
    codigo_vinculacion text,
    retira_como_retribucion boolean DEFAULT false NOT NULL,
    apellido text,
    nombres text,
    apellido_confirmado boolean DEFAULT false NOT NULL,
    CONSTRAINT pacientes_modalidad_check CHECK ((modalidad = ANY (ARRAY['Cultivo propio'::text, 'Cultivo solidario'::text, 'Tercero/ONG'::text]))),
    CONSTRAINT pacientes_nivel_tarifa_check CHECK ((nivel_tarifa = ANY (ARRAY['nuevo'::text, 'antiguo'::text, 'frecuente'::text, 'acuerdo'::text]))),
    CONSTRAINT pacientes_reprocann_estado_check CHECK ((reprocann_estado = ANY (ARRAY['Vigente'::text, 'En tramite'::text, 'Vencido'::text, 'Rechazado'::text, 'Sin registro'::text])))
);


--
-- Name: COLUMN pacientes.tope_mensual_g; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pacientes.tope_mensual_g IS 'Tope mensual en gramos para esta persona. NULL = sin tope propio.';


--
-- Name: COLUMN pacientes.nivel_tarifa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pacientes.nivel_tarifa IS 'nuevo = tarifa plena · antiguo = desde el inicio · frecuente = por cantidad y frecuencia. El default es `nuevo`, la mas alta: una persona sin evaluar no entra por la mas barata.';


--
-- Name: COLUMN pacientes.codigo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pacientes.codigo IS 'PAC-XXX. Antes vivia como prefijo de `notas`; se mudo aca para que no dependa de que nadie edite ese texto.';


--
-- Name: COLUMN pacientes.aporte_acordado_g; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pacientes.aporte_acordado_g IS 'Aporte pactado por gramo cuando nivel_tarifa = acuerdo. Nullable: null es «no hay acuerdo», no cero.';


--
-- Name: COLUMN pacientes.notas_economicas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pacientes.notas_economicas IS 'El analisis del acuerdo. Va aparte de notas porque notas la ve todo el que ve el padron y esto es plata.';


--
-- Name: COLUMN pacientes.codigo_vinculacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pacientes.codigo_vinculacion IS 'El codigo que la persona saca en REPROCANN y le da a la asociacion para que lo vincule como su cultivador. Es de la PERSONA: uno por paciente.';


--
-- Name: COLUMN pacientes.retira_como_retribucion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pacientes.retira_como_retribucion IS 'Quien trabaja en la asociacion y se lleva material como parte de su pago. Sus retiros sin aporte son retribucion_en_especie, no una deuda.';


--
-- Name: COLUMN pacientes.apellido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pacientes.apellido IS 'El apellido, para mostrar y ordenar. Deducido de nombre_completo si apellido_confirmado es false.';


--
-- Name: COLUMN pacientes.nombres; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pacientes.nombres IS 'El resto del nombre. nombre_completo NO se toca: es lo que se compara contra el REPROCANN.';


--
-- Name: COLUMN pacientes.apellido_confirmado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pacientes.apellido_confirmado IS 'true = lo reviso una persona. false = lo dedujo el sistema y puede estar mal.';


--
-- Name: cupo_conteos; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cupo_conteos AS
 SELECT (( SELECT count(*) AS count
           FROM public.pacientes
          WHERE pacientes.activo))::integer AS pacientes_activos,
    (( SELECT count(*) AS count
           FROM public.ong_predios
          WHERE (ong_predios.activo IS NOT FALSE)))::integer AS predios_activos
  WHERE (public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text]));


--
-- Name: ong_dispensas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_dispensas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    paciente_id uuid,
    fecha date DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date NOT NULL,
    producto text DEFAULT 'flor'::text,
    genetica_id uuid,
    gramos numeric NOT NULL,
    aporte numeric,
    modalidad text DEFAULT 'retiro'::text,
    entregado_por text,
    con_receta boolean DEFAULT false,
    notas text,
    creado_en timestamp with time zone DEFAULT now(),
    recibo_numero integer,
    medio_pago text,
    pago_referencia text,
    lote_codigo text,
    visita_id uuid,
    unidad text DEFAULT 'g'::text NOT NULL,
    aporte_desglose jsonb,
    tipo_movimiento text,
    aporte_esperado numeric,
    CONSTRAINT ong_dispensas_aporte_esperado_check CHECK (((aporte_esperado IS NULL) OR (aporte_esperado >= (0)::numeric))),
    CONSTRAINT ong_dispensas_tipo_movimiento_check CHECK (((tipo_movimiento IS NULL) OR (tipo_movimiento = ANY (ARRAY['entrega'::text, 'entrega_a_cuenta'::text, 'cobro_de_deuda'::text, 'retribucion_en_especie'::text, 'consumo_interno'::text, 'merma'::text, 'ajuste'::text])))),
    CONSTRAINT ong_dispensas_unidad_check CHECK ((unidad = ANY (ARRAY['g'::text, 'u'::text, 'ml'::text])))
);


--
-- Name: COLUMN ong_dispensas.aporte_desglose; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_dispensas.aporte_desglose IS 'Desglose del reembolso por medio de pago, ej {"Efectivo":75000,"Transferencia":15000}. Null = pago con un solo medio (ver medio_pago). Cuando está cargado, aporte = suma de sus valores.';


--
-- Name: COLUMN ong_dispensas.tipo_movimiento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_dispensas.tipo_movimiento IS 'Que fue este movimiento. null = sin clasificar. Un cobro_de_deuda no lleva gramos y una entrega_a_cuenta no lleva aporte: los dos son normales y no hay que contarlos como error.';


--
-- Name: COLUMN ong_dispensas.aporte_esperado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_dispensas.aporte_esperado IS 'Lo que se acordo cobrar por esta entrega. La deuda es aporte_esperado - aporte. null = no se sabe cuanto se acordo, que NO es lo mismo que cero.';


--
-- Name: dispensas_segun_rol; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.dispensas_segun_rol AS
 SELECT id,
    user_id,
    paciente_id,
    fecha,
    producto,
    genetica_id,
    gramos,
    unidad,
    modalidad,
    entregado_por,
    con_receta,
    notas,
    creado_en,
    recibo_numero,
    lote_codigo,
        CASE
            WHEN public.puede_ver_plata() THEN aporte
            ELSE NULL::numeric
        END AS aporte,
        CASE
            WHEN public.puede_ver_plata() THEN medio_pago
            ELSE NULL::text
        END AS medio_pago,
        CASE
            WHEN public.puede_ver_plata() THEN pago_referencia
            ELSE NULL::text
        END AS pago_referencia,
        CASE
            WHEN public.puede_ver_plata() THEN aporte_desglose
            ELSE NULL::jsonb
        END AS aporte_desglose,
    tipo_movimiento,
        CASE
            WHEN public.puede_ver_plata() THEN aporte_esperado
            ELSE NULL::numeric
        END AS aporte_esperado
   FROM public.ong_dispensas
  WHERE (public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'auditor'::text]));


--
-- Name: documentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documentos (
    id bigint NOT NULL,
    fuente text NOT NULL,
    chunk_idx integer DEFAULT 0 NOT NULL,
    contenido text NOT NULL,
    embedding public.vector(1024),
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: econometria_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.econometria_config (
    clave text NOT NULL,
    valor jsonb NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: eventos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eventos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    planta_id uuid,
    tipo text DEFAULT 'Nota'::text NOT NULL,
    fecha date DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date NOT NULL,
    detalle text,
    foto_url text,
    mensaje_original text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    grupo_id uuid,
    lote_id uuid,
    CONSTRAINT eventos_planta_o_grupo CHECK ((((((planta_id IS NOT NULL))::integer + ((grupo_id IS NOT NULL))::integer) + ((lote_id IS NOT NULL))::integer) = 1)),
    CONSTRAINT eventos_tipo_check CHECK ((tipo = ANY (ARRAY['Riego'::text, 'Fertilizacion'::text, 'Poda'::text, 'Trasplante'::text, 'CambioFase'::text, 'Entrenamiento'::text, 'Problema'::text, 'Foto'::text, 'Nota'::text])))
);


--
-- Name: evolucion_clinica; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evolucion_clinica (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    paciente_id uuid NOT NULL,
    fecha date DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date NOT NULL,
    tipo text DEFAULT 'evolucion'::text NOT NULL,
    texto text NOT NULL,
    firmado_por text,
    matricula text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT evolucion_tipo_check CHECK ((tipo = ANY (ARRAY['evolucion'::text, 'consulta'::text, 'ajuste_dosis'::text, 'alta'::text, 'suspension'::text, 'nota'::text])))
);


--
-- Name: fichas_comerciales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fichas_comerciales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    marca text NOT NULL,
    producto text NOT NULL,
    linea text,
    forma text DEFAULT 'liquido'::text,
    densidad numeric,
    npk text,
    dosis_ml_l numeric,
    composicion jsonb DEFAULT '{}'::jsonb,
    sales_origen text[] DEFAULT '{}'::text[],
    sal_id text,
    verificado boolean DEFAULT false,
    nota text,
    pdf_path text,
    pdf_nombre text,
    pdf_tam integer,
    creado_en timestamp with time zone DEFAULT now(),
    precio_envase numeric,
    envase_cant numeric,
    envase_unidad text,
    precio_fuente text,
    CONSTRAINT fichas_comerciales_forma_check CHECK ((forma = ANY (ARRAY['liquido'::text, 'polvo'::text])))
);


--
-- Name: geneticas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geneticas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    banco text,
    tipo text DEFAULT 'Desconocido'::text NOT NULL,
    thc_estimado numeric(4,1),
    cbd_estimado numeric(4,1),
    tiempo_flora_dias integer,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    genotipo text,
    indica_pct integer,
    sativa_pct integer,
    linaje text,
    tiempo_vege_dias integer,
    altura text,
    rendimiento_g text,
    dificultad text,
    terpenos text,
    efectos text,
    usos_medicinales text,
    ambiente text,
    resistencia text,
    stretch text,
    foto_url text,
    color text,
    inicio_flora date,
    CONSTRAINT geneticas_tipo_check CHECK ((tipo = ANY (ARRAY['Feminizada'::text, 'Automatica'::text, 'Regular'::text, 'Esqueje'::text, 'Desconocido'::text])))
);


--
-- Name: instalaciones_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instalaciones_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    nombre text NOT NULL,
    sistema text DEFAULT 'Otro'::text NOT NULL,
    marca text,
    modelo text,
    proveedor_id uuid,
    precio numeric,
    unidad text DEFAULT 'u'::text,
    specs text,
    url text,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    favorito boolean DEFAULT false NOT NULL
);


--
-- Name: insumos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insumos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    categoria text DEFAULT 'Otro'::text NOT NULL,
    marca text,
    modelo text,
    cantidad numeric DEFAULT 0 NOT NULL,
    unidad text DEFAULT 'u'::text,
    potencia_w numeric,
    specs text,
    dosis text,
    uso text,
    stock_minimo numeric DEFAULT 0,
    proveedor text,
    precio numeric,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    clase_costo text,
    CONSTRAINT insumos_categoria_check CHECK ((categoria = ANY (ARRAY['Fertilizante'::text, 'Iluminacion'::text, 'Climatizacion'::text, 'Riego'::text, 'CO2'::text, 'Sustrato'::text, 'Sanidad'::text, 'Medicion'::text, 'Herramienta'::text, 'Otro'::text]))),
    CONSTRAINT insumos_clase_costo_check CHECK ((clase_costo = ANY (ARRAY['capex'::text, 'consumible'::text, 'recurrente'::text])))
);


--
-- Name: insumos_faltantes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insumos_faltantes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    sal_id text,
    nombre text NOT NULL,
    cantidad numeric,
    unidad text,
    prioridad text DEFAULT 'media'::text NOT NULL,
    nota text,
    comprado boolean DEFAULT false NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    precio numeric,
    link text,
    imagen text,
    imagen_thumb text,
    tiene_imagen boolean GENERATED ALWAYS AS ((imagen IS NOT NULL)) STORED,
    categoria text,
    clase_costo text,
    CONSTRAINT insumos_faltantes_prioridad_check CHECK ((prioridad = ANY (ARRAY['alta'::text, 'media'::text, 'baja'::text])))
);


--
-- Name: inventario_nutrientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario_nutrientes (
    sal_id text NOT NULL,
    user_id uuid,
    costo_kg numeric,
    stock numeric,
    unidad text,
    nota text,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jornadas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jornadas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fecha date DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date NOT NULL,
    responsable text,
    clima text,
    resumen text,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ong_lotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_lotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid DEFAULT auth.uid(),
    codigo text NOT NULL,
    producto text DEFAULT 'flor'::text NOT NULL,
    genetica_id uuid,
    cosecha_id uuid,
    gramos_totales numeric NOT NULL,
    fecha_elaboracion date DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date,
    thc_pct numeric,
    cbd_pct numeric,
    laboratorio text,
    fecha_analisis date,
    analisis_path text,
    aporte_por_gramo numeric,
    activo boolean DEFAULT true NOT NULL,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    origen text DEFAULT 'propio'::text NOT NULL,
    costo_por_gramo numeric(12,2),
    proveedor text,
    unidad text DEFAULT 'g'::text NOT NULL,
    CONSTRAINT ong_lotes_costo_por_gramo_check CHECK (((costo_por_gramo IS NULL) OR (costo_por_gramo >= (0)::numeric))),
    CONSTRAINT ong_lotes_gramos_totales_check CHECK ((gramos_totales > (0)::numeric)),
    CONSTRAINT ong_lotes_origen_check CHECK ((origen = ANY (ARRAY['propio'::text, 'comprado'::text, 'regularizacion'::text]))),
    CONSTRAINT ong_lotes_unidad_check CHECK ((unidad = ANY (ARRAY['g'::text, 'u'::text, 'ml'::text])))
);


--
-- Name: COLUMN ong_lotes.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_lotes.user_id IS 'Quien lo cargo. Nullable desde el 31/08/2026: null es «no se sabe» porque se borro el usuario. Era CASCADE y borrar una cuenta se llevaba sus lotes.';


--
-- Name: COLUMN ong_lotes.origen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_lotes.origen IS 'propio = salio del cultivo. comprado = se le compro a un proveedor. regularizacion = material que estuvo y cuyo ingreso no quedo documentado; NO se le inventa proveedor.';


--
-- Name: COLUMN ong_lotes.costo_por_gramo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_lotes.costo_por_gramo IS 'Costo del gramo puesto en el estante. Null = todavia no se cargo, no cero.';


--
-- Name: COLUMN ong_lotes.unidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_lotes.unidad IS 'g = gramos de material vegetal · u = unidades (frascos, accesorios) · ml = mililitros. Solo lo marcado como g entra al balance de materia.';


--
-- Name: lotes_stock; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.lotes_stock AS
 SELECT l.id,
    l.codigo,
    l.producto,
    l.genetica_id,
    l.cosecha_id,
    l.gramos_totales,
    l.unidad,
    l.fecha_elaboracion,
    l.origen,
    l.proveedor,
    l.activo,
    l.thc_pct,
    l.cbd_pct,
    l.laboratorio,
    l.fecha_analisis,
    l.analisis_path,
    l.notas,
    l.creado_en,
    COALESCE(d.entregado, (0)::numeric) AS entregado,
    (l.gramos_totales - COALESCE(d.entregado, (0)::numeric)) AS restante
   FROM (public.ong_lotes l
     LEFT JOIN ( SELECT upper(TRIM(BOTH FROM ong_dispensas.lote_codigo)) AS cod,
            sum(COALESCE(ong_dispensas.gramos, (0)::numeric)) AS entregado
           FROM public.ong_dispensas
          WHERE ((ong_dispensas.lote_codigo IS NOT NULL) AND (TRIM(BOTH FROM ong_dispensas.lote_codigo) <> ''::text))
          GROUP BY (upper(TRIM(BOTH FROM ong_dispensas.lote_codigo)))) d ON ((d.cod = upper(TRIM(BOTH FROM l.codigo)))))
  WHERE (public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text]));


--
-- Name: VIEW lotes_stock; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.lotes_stock IS 'Lotes con entrado/entregado/restante, SIN las columnas de plata y SIN una sola fila de a quien se le entrego. Es lo que ve el cultivo. El `where` es la puerta.';


--
-- Name: mantenimientos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mantenimientos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    insumo_id uuid,
    equipo text,
    tipo text DEFAULT 'Limpieza'::text NOT NULL,
    fecha_realizado date DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date NOT NULL,
    frecuencia_dias integer,
    proximo date,
    responsable text,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mantenimientos_tipo_check CHECK ((tipo = ANY (ARRAY['Limpieza'::text, 'Recarga'::text, 'Cambio de filtro'::text, 'Calibracion'::text, 'Revision'::text, 'Reemplazo'::text, 'Lubricacion'::text, 'Desinfeccion'::text, 'Otro'::text])))
);


--
-- Name: ofertas_instalacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ofertas_instalacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    proveedor_id uuid,
    precio numeric,
    presentacion text,
    imagen text,
    nota text,
    elegido boolean DEFAULT false NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ong_actas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_actas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    tipo text NOT NULL,
    numero integer NOT NULL,
    fecha date NOT NULL,
    lugar text,
    hora_inicio text,
    hora_fin text,
    asistentes integer,
    quorum_ok boolean DEFAULT true,
    segunda_convocatoria boolean DEFAULT false,
    orden_del_dia jsonb DEFAULT '[]'::jsonb,
    firmantes text,
    estado text DEFAULT 'borrador'::text,
    libro_id uuid,
    folio integer,
    notas text,
    creado_en timestamp with time zone DEFAULT now(),
    asistentes_nombres jsonb DEFAULT '[]'::jsonb,
    quorum_requerido integer
);


--
-- Name: ong_asociados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_asociados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    nombre text NOT NULL,
    dni text,
    categoria text,
    paciente_id uuid,
    fecha_alta date,
    acta_alta_id uuid,
    fecha_baja date,
    acta_baja_id uuid,
    activo boolean DEFAULT true,
    fundador boolean DEFAULT false,
    notas text,
    creado_en timestamp with time zone DEFAULT now(),
    vinculado_reprocann boolean DEFAULT false,
    fecha_vinculacion date,
    mandato_aceptado boolean DEFAULT false,
    mandato_fecha date,
    legajo text,
    mandato_hora timestamp with time zone,
    ip_firma_mandato text,
    mandato_version text
);


--
-- Name: ong_autoridades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_autoridades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    nombre text NOT NULL,
    cargo text NOT NULL,
    organo text DEFAULT 'Comisión Directiva'::text,
    desde date,
    hasta date,
    activo boolean DEFAULT true,
    notas text,
    creado_en timestamp with time zone DEFAULT now(),
    antecedentes_penales_ok boolean,
    cuit_activa boolean,
    reprocann_activo boolean,
    grupo_familiar text,
    fundador boolean DEFAULT false
);


--
-- Name: ong_caja; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_caja (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    fecha date DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date NOT NULL,
    tipo text DEFAULT 'ingreso'::text NOT NULL,
    concepto text NOT NULL,
    detalle text,
    monto numeric NOT NULL,
    medio text,
    dispensa_id uuid,
    cuota_id uuid,
    documento_id uuid,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    pago_id uuid,
    paciente_id uuid,
    CONSTRAINT ong_caja_monto_check CHECK ((monto > (0)::numeric)),
    CONSTRAINT ong_caja_tipo_check CHECK ((tipo = ANY (ARRAY['ingreso'::text, 'egreso'::text])))
);


--
-- Name: COLUMN ong_caja.paciente_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_caja.paciente_id IS 'El socio del otro lado del movimiento, cuando lo hay. Lo usa el cobro de deuda: plata que entra por entregas anteriores, sin material saliendo hoy.';


--
-- Name: ong_categorias_socio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_categorias_socio (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    nombre text NOT NULL,
    requiere_reprocann boolean DEFAULT false,
    con_voto boolean DEFAULT true,
    cuota numeric,
    notas text,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: ong_cuotas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_cuotas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    categoria text,
    valor numeric NOT NULL,
    vigente_desde date,
    acta_id uuid,
    notas text,
    creado_en timestamp with time zone DEFAULT now(),
    tipo text DEFAULT 'social'::text
);


--
-- Name: ong_cuotas_emitidas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_cuotas_emitidas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    asociado_id uuid,
    periodo text NOT NULL,
    tipo text DEFAULT 'social'::text,
    monto numeric NOT NULL,
    pagada boolean DEFAULT false,
    fecha_pago date,
    medio text,
    notas text,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: ong_ddjj; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_ddjj (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    periodo text NOT NULL,
    fecha_presentacion date,
    plantas_total integer,
    plantas_floracion integer,
    pacientes_vinculados integer,
    variedades text,
    presentada boolean DEFAULT false NOT NULL,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ong_documentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_documentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo text DEFAULT 'emitido'::text NOT NULL,
    subtipo text,
    numero text,
    fecha date DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date NOT NULL,
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
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    lote_codigo text,
    notas_preview text GENERATED ALWAYS AS ("left"(notas, 120)) STORED,
    CONSTRAINT ong_documentos_tipo_check CHECK ((tipo = ANY (ARRAY['emitido'::text, 'gasto'::text])))
);


--
-- Name: COLUMN ong_documentos.lote_codigo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_documentos.lote_codigo IS 'Lote que trajo esta orden de servicio. Cruza contra ong_lotes.codigo.';


--
-- Name: COLUMN ong_documentos.notas_preview; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_documentos.notas_preview IS 'Los primeros 120 caracteres de notas, para el listado. Generada: se mantiene sola. El texto completo se pide al abrir el documento.';


--
-- Name: ong_documentos_institucionales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_documentos_institucionales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo text NOT NULL,
    titulo text NOT NULL,
    numero text,
    fecha date,
    vigente boolean DEFAULT true NOT NULL,
    persona_juridica text,
    archivo_path text,
    archivo_nombre text,
    notas text,
    user_id uuid,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ong_documentos_institucionales_tipo_check CHECK ((tipo = ANY (ARRAY['Estatuto'::text, 'Acta constitutiva'::text, 'Reglamento interno'::text, 'Matrícula / Resolución'::text, 'Poder / Autorización'::text, 'Reforma de estatuto'::text, 'Otro'::text])))
);


--
-- Name: ong_entidad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_entidad (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    tope_pacientes integer DEFAULT 150,
    plantas_por_paciente integer DEFAULT 9,
    tope_predios integer DEFAULT 3,
    notas text,
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now(),
    codigo_vinculacion text,
    objeto_cannabis boolean DEFAULT false,
    objeto_social text,
    perfil_reprocann text DEFAULT 'ONG vinculada a la Salud'::text,
    ultima_revision_libros date,
    director_medico text,
    director_medico_matricula text,
    director_medico_dni text,
    director_medico_vence date,
    director_medico_refeps boolean,
    proveedor_propio text,
    modo_beta boolean DEFAULT false NOT NULL,
    rinde_esperado_planta_g numeric,
    director_tecnico text,
    director_tecnico_matricula text,
    CONSTRAINT ong_entidad_cierre_ejercicio_dia_check CHECK (((cierre_ejercicio_dia >= 1) AND (cierre_ejercicio_dia <= 31))),
    CONSTRAINT ong_entidad_cierre_ejercicio_mes_check CHECK (((cierre_ejercicio_mes >= 1) AND (cierre_ejercicio_mes <= 12)))
);


--
-- Name: COLUMN ong_entidad.codigo_vinculacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_entidad.codigo_vinculacion IS 'EN DESUSO desde el 02/09/2026. El codigo de vinculacion es de cada paciente (pacientes.codigo_vinculacion), no de la entidad. Se conserva la columna porque existe igual en las otras dos instalaciones, que no tienen este cambio. No leerla ni escribirla.';


--
-- Name: COLUMN ong_entidad.rinde_esperado_planta_g; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_entidad.rinde_esperado_planta_g IS 'Gramos que se espera de cada planta en floracion. Lo declara el Director Tecnico de cultivo. NULL = todavia no declarado, y la cadena lo dice en vez de estimarlo.';


--
-- Name: COLUMN ong_entidad.director_tecnico; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_entidad.director_tecnico IS 'Director Tecnico de CULTIVO. Distinto del Director Medico, que firma los informes clinicos.';


--
-- Name: ong_feedback_clinico; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_feedback_clinico (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    dispensa_id uuid NOT NULL,
    paciente_id uuid,
    escala_alivio integer NOT NULL,
    efectos_adversos jsonb DEFAULT '[]'::jsonb NOT NULL,
    efectos_detalle text,
    dosificacion_real text NOT NULL,
    observaciones text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ong_feedback_clinico_escala_alivio_check CHECK (((escala_alivio >= 1) AND (escala_alivio <= 5)))
);


--
-- Name: ong_libros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_libros (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    tipo text NOT NULL,
    numero integer DEFAULT 1,
    rubricado boolean DEFAULT false,
    fecha_rubrica date,
    organismo text,
    digital boolean DEFAULT false,
    folios_totales integer,
    folios_usados integer DEFAULT 0,
    estado text DEFAULT 'vigente'::text,
    notas text,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: ong_pagos_proveedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_pagos_proveedor (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid DEFAULT auth.uid() NOT NULL,
    orden_servicio text,
    proveedor text,
    fecha date NOT NULL,
    monto numeric(14,2) NOT NULL,
    medio text,
    referencia text,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ong_pagos_proveedor_monto_check CHECK ((monto > (0)::numeric))
);


--
-- Name: ong_pedidos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_pedidos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid DEFAULT auth.uid(),
    codigo_reserva text NOT NULL,
    lote_id uuid NOT NULL,
    paciente_id uuid,
    asociado_id uuid,
    gramos numeric NOT NULL,
    monto_reembolso numeric DEFAULT 0 NOT NULL,
    metodo_pago text DEFAULT 'Efectivo_Sede'::text NOT NULL,
    estado_pago text DEFAULT 'Pendiente_Efectivo'::text NOT NULL,
    estado_pedido text DEFAULT 'Reservado'::text NOT NULL,
    fecha_expiracion timestamp with time zone DEFAULT (now() + '72:00:00'::interval) NOT NULL,
    comprobante_path text,
    comprobante_nombre text,
    dispensa_id uuid,
    entregado_en timestamp with time zone,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ong_pedidos_estado_pago_check CHECK ((estado_pago = ANY (ARRAY['Pendiente_Verificacion'::text, 'Pendiente_Efectivo'::text, 'Abonado'::text, 'Rechazado'::text]))),
    CONSTRAINT ong_pedidos_estado_pedido_check CHECK ((estado_pedido = ANY (ARRAY['Reservado'::text, 'Listo_Para_Retiro'::text, 'Entregado'::text, 'Expirado'::text, 'Cancelado'::text]))),
    CONSTRAINT ong_pedidos_gramos_check CHECK ((gramos > (0)::numeric)),
    CONSTRAINT ong_pedidos_metodo_pago_check CHECK ((metodo_pago = ANY (ARRAY['Transferencia_Billetera'::text, 'Efectivo_Sede'::text]))),
    CONSTRAINT ong_pedidos_monto_reembolso_check CHECK ((monto_reembolso >= (0)::numeric))
);


--
-- Name: COLUMN ong_pedidos.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_pedidos.user_id IS 'Quien lo cargo. Nullable: null es «no se sabe» porque se borro el usuario.';


--
-- Name: ong_recibo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ong_recibo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ong_requisitos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_requisitos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    clave text NOT NULL,
    titulo text NOT NULL,
    detalle text,
    cumplido boolean DEFAULT false,
    vence date,
    responsable text,
    nota text,
    orden integer DEFAULT 0,
    creado_en timestamp with time zone DEFAULT now(),
    acreditacion text,
    acreditado boolean DEFAULT false
);


--
-- Name: ong_solicitudes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_solicitudes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    nombre text NOT NULL,
    dni text NOT NULL,
    email text,
    telefono text,
    notas text,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    motivo text,
    paciente_id uuid,
    asociado_id uuid,
    creada_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizada_en timestamp with time zone DEFAULT now() NOT NULL,
    revisada_por uuid,
    mandato_aceptado boolean DEFAULT false NOT NULL,
    mandato_version text,
    mandato_fecha timestamp with time zone,
    reprocann_nro text,
    reprocann_path text,
    reprocann_subido_en timestamp with time zone,
    fecha_nacimiento date,
    domicilio text,
    localidad text,
    provincia text,
    patologia text,
    formatos text[],
    cantidad_mensual numeric,
    cantidad_unidad text,
    medico_tratante text,
    matricula_medico text,
    reprocann_tiene boolean,
    reprocann_vinculado text,
    reprocann_vencimiento date,
    compromiso_regularizar boolean DEFAULT false NOT NULL,
    dni_path text,
    consentimientos_version text,
    consent_veracidad boolean DEFAULT false NOT NULL,
    consent_uso_personal boolean DEFAULT false NOT NULL,
    consent_responsabilidad boolean DEFAULT false NOT NULL,
    consent_jurisdiccion boolean DEFAULT false NOT NULL,
    CONSTRAINT ong_solicitudes_cantidad_unidad_chk CHECK (((cantidad_unidad IS NULL) OR (cantidad_unidad = ANY (ARRAY['g'::text, 'ml'::text, 'u'::text])))),
    CONSTRAINT ong_solicitudes_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'en_revision'::text, 'aceptada'::text, 'rechazada'::text]))),
    CONSTRAINT ong_solicitudes_repro_vinc_chk CHECK (((reprocann_vinculado IS NULL) OR (reprocann_vinculado = ANY (ARRAY['si'::text, 'no'::text, 'no_se'::text]))))
);


--
-- Name: TABLE ong_solicitudes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ong_solicitudes IS 'Solicitudes de alta que entran por /sumate. Unica escritura publica del sistema: anon solo llega por solicitud_crear() y solicitud_estado().';


--
-- Name: COLUMN ong_solicitudes.mandato_aceptado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_solicitudes.mandato_aceptado IS 'Si la persona acepto el Mandato de Gestion Operativa al pedir el alta.';


--
-- Name: COLUMN ong_solicitudes.mandato_version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_solicitudes.mandato_version IS 'Que version del texto acepto. Sin esto no se sabe QUE firmo si el mandato se reescribe.';


--
-- Name: COLUMN ong_solicitudes.reprocann_nro; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_solicitudes.reprocann_nro IS 'Numero de credencial que declaro la persona. Validado como 4+ digitos antes de guardarse (ver lib/datosDelFormulario.ts): el campo libre ya se lleno una vez con la etiqueta de la pregunta.';


--
-- Name: COLUMN ong_solicitudes.reprocann_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_solicitudes.reprocann_path IS 'PATH dentro del bucket `documentos`, NO una URL. Se lee con createSignedUrl, igual que las credenciales de pacientes.';


--
-- Name: COLUMN ong_solicitudes.cantidad_mensual; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_solicitudes.cantidad_mensual IS 'Lo que la persona ESTIMA necesitar por mes. NO es un tope: el tope lo fija la asociacion en pacientes.tope_mensual_g.';


--
-- Name: COLUMN ong_solicitudes.reprocann_vinculado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_solicitudes.reprocann_vinculado IS 'Si la persona DECLARA haber designado a esta asociacion como su cultivador en REPROCANN. Es declarado, no verificado: lo confirma quien revisa mirando la credencial, y recien ahi se toca ong_asociados.vinculado_reprocann.';


--
-- Name: COLUMN ong_solicitudes.dni_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_solicitudes.dni_path IS 'PATH en el bucket documentos, NO una URL. Lo sube la Edge Function solicitud-adjunto.';


--
-- Name: ong_tarifas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_tarifas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nivel text NOT NULL,
    aporte_por_gramo numeric(12,2) NOT NULL,
    vigente_desde date NOT NULL,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    reprocann text,
    CONSTRAINT ong_tarifas_aporte_por_gramo_check CHECK ((aporte_por_gramo >= (0)::numeric)),
    CONSTRAINT ong_tarifas_nivel_check CHECK ((nivel = ANY (ARRAY['nuevo'::text, 'antiguo'::text, 'frecuente'::text, 'acuerdo'::text]))),
    CONSTRAINT ong_tarifas_reprocann_check CHECK (((reprocann IS NULL) OR (reprocann = ANY (ARRAY['si'::text, 'tramite'::text, 'no'::text]))))
);


--
-- Name: COLUMN ong_tarifas.reprocann; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_tarifas.reprocann IS 'si = vigente · tramite = iniciado (tiene numero) · no = sin registro. NULL = fila del criterio viejo, que no distinguia.';


--
-- Name: ong_traslados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_traslados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    fecha date DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date NOT NULL,
    hora_salida text,
    hora_llegada text,
    origen text,
    destino text,
    ruta text,
    transportista text,
    transportista_dni text,
    destinatario text,
    tipo_material text DEFAULT 'flores'::text NOT NULL,
    cantidad numeric,
    paciente_id uuid,
    carta_porte_presentada boolean DEFAULT false NOT NULL,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    lotes text,
    CONSTRAINT ong_traslados_tipo_material_check CHECK ((tipo_material = ANY (ARRAY['flores'::text, 'frascos'::text, 'plantas'::text])))
);


--
-- Name: COLUMN ong_traslados.lotes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ong_traslados.lotes IS 'Codigos de lote que viajaron, separados por coma. Plural porque un viaje puede traer varias ordenes del mismo proveedor el mismo dia.';


--
-- Name: ong_visitas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ong_visitas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fecha date DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date NOT NULL,
    hora time without time zone,
    paciente_id uuid,
    nombre_libre text,
    contacto text,
    motivo text NOT NULL,
    resultado text,
    atendio text,
    user_id uuid,
    notas text,
    creada_en timestamp with time zone DEFAULT now() NOT NULL,
    origen text DEFAULT 'registrada'::text NOT NULL,
    CONSTRAINT ong_visitas_alguien CHECK (((paciente_id IS NOT NULL) OR (COALESCE(btrim(nombre_libre), ''::text) <> ''::text))),
    CONSTRAINT ong_visitas_motivo CHECK ((motivo = ANY (ARRAY['Primera vez'::text, 'Consulta o informacion'::text, 'Retiro'::text, 'Seguimiento'::text, 'Tramite REPROCANN'::text, 'Entrega de documentacion'::text, 'Otro'::text]))),
    CONSTRAINT ong_visitas_origen_check CHECK ((origen = ANY (ARRAY['registrada'::text, 'derivada_de_dispensa'::text]))),
    CONSTRAINT ong_visitas_resultado CHECK (((resultado IS NULL) OR (resultado = ANY (ARRAY['Se le entrego'::text, 'Quedo en volver'::text, 'Se lo oriento con el REPROCANN'::text, 'Se lo dio de alta'::text, 'Se lo derivo'::text, 'Solo informacion'::text, 'Otro'::text]))))
);


--
-- Name: pacientes_clinica; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pacientes_clinica (
    paciente_id uuid NOT NULL,
    antecedentes text,
    medicacion_concomitante text,
    alergias text,
    contraindicaciones text,
    objetivo_terapeutico text,
    notas_medico text,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_por text
);


--
-- Name: pacientes_min; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.pacientes_min AS
 SELECT id,
    nombre_completo,
    activo,
    socio
   FROM public.pacientes
  WHERE (public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text]));


--
-- Name: pacientes_segun_rol; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.pacientes_segun_rol AS
 SELECT id,
    nombre_completo,
    dni,
    fecha_nacimiento,
    telefono,
    email,
    localidad,
    provincia,
    domicilio,
    foto_url,
    reprocann_nro,
    reprocann_estado,
    reprocann_emision,
    reprocann_vencimiento,
    modalidad,
    socio,
    fecha_alta,
    activo,
    notas,
    creado_en,
    plantas_habilitadas,
    m2_habilitados,
    tope_mensual_g,
    nivel_tarifa,
    codigo,
        CASE
            WHEN public.puede_ver_clinico() THEN patologia
            ELSE NULL::text
        END AS patologia,
        CASE
            WHEN public.puede_ver_clinico() THEN medico_tratante
            ELSE NULL::text
        END AS medico_tratante,
        CASE
            WHEN public.puede_ver_clinico() THEN matricula_medico
            ELSE NULL::text
        END AS matricula_medico,
        CASE
            WHEN public.puede_ver_clinico() THEN credencial_url
            ELSE NULL::text
        END AS credencial_url,
        CASE
            WHEN public.puede_ver_plata() THEN aporte_acordado_g
            ELSE NULL::numeric
        END AS aporte_acordado_g,
        CASE
            WHEN public.puede_ver_plata() THEN notas_economicas
            ELSE NULL::text
        END AS notas_economicas,
    codigo_vinculacion,
    retira_como_retribucion,
    apellido,
    nombres,
    apellido_confirmado
   FROM public.pacientes
  WHERE public.puede_ver_padron();


--
-- Name: perfiles_nutrientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.perfiles_nutrientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    nombre text NOT NULL,
    perfil jsonb DEFAULT '{}'::jsonb NOT NULL,
    agua jsonb DEFAULT '{}'::jsonb NOT NULL,
    sales jsonb DEFAULT '[]'::jsonb NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    rangos jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: perfiles_usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.perfiles_usuario (
    id uuid NOT NULL,
    nombre_completo text NOT NULL,
    rol text DEFAULT 'administrador'::text NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    ultimo_acceso timestamp with time zone,
    email text,
    CONSTRAINT perfiles_usuario_rol_check CHECK ((rol = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text, 'mostrador'::text, 'cultivador'::text, 'director_cultivo'::text, 'director_medico'::text, 'auditor'::text, 'demo'::text])))
);


--
-- Name: planes_cultivo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planes_cultivo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    desde date,
    hasta date,
    plantas_previstas integer,
    pacientes_previstos integer,
    geneticas text,
    espacios text,
    riego text,
    fertilizacion text,
    luces text,
    notas text,
    activo boolean DEFAULT true NOT NULL,
    creado_por uuid,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE planes_cultivo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.planes_cultivo IS 'El plan que se declara en REPROCANN. NO genera las plantas: se contrasta con ellas. Un plan que se edita para que cierre deja de ser una declaracion.';


--
-- Name: plantas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plantas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    genetica_id uuid,
    madre_id uuid,
    apodo text,
    fecha_germinacion date,
    fase text DEFAULT 'Germinacion'::text NOT NULL,
    sustrato text,
    maceta text,
    ubicacion text,
    activa boolean DEFAULT true NOT NULL,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    slot text,
    codigo text,
    paciente_id uuid,
    fecha_cosecha date,
    fecha_envasado date,
    grupo_id uuid,
    subfase text,
    CONSTRAINT plantas_fase_check CHECK ((fase = ANY (ARRAY['Germinacion'::text, 'Plantula'::text, 'Vegetativo'::text, 'Floracion'::text, 'Secado'::text, 'Curado'::text, 'Cosechada'::text, 'Muerta'::text])))
);


--
-- Name: COLUMN plantas.subfase; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plantas.subfase IS 'Detalle dentro de la fase: "Temprano", "Engorde", "Lavado". Opcional. Ver SUBFASES en app/src/lib/cultivo.ts.';


--
-- Name: presupuesto_instalacion_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presupuesto_instalacion_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    presupuesto_id uuid NOT NULL,
    item_id uuid,
    nombre text NOT NULL,
    sistema text DEFAULT 'Otro'::text NOT NULL,
    proveedor text,
    precio_unit numeric DEFAULT 0 NOT NULL,
    cantidad numeric DEFAULT 1 NOT NULL,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: presupuestos_instalacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presupuestos_instalacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    nombre text NOT NULL,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: proveedores_instalacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proveedores_instalacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    nombre text NOT NULL,
    contacto text,
    url text,
    zona text,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: proveedores_nutrientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proveedores_nutrientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    sal_id text NOT NULL,
    nombre_local text NOT NULL,
    telefono text,
    pagina text,
    precio numeric,
    unidad text DEFAULT 'kg'::text,
    presentacion text,
    calidad text DEFAULT 'alta'::text,
    imagen text,
    nota text,
    creado_en timestamp with time zone DEFAULT now(),
    email text,
    provincia text,
    elegido boolean DEFAULT false,
    imagen_thumb text,
    tiene_imagen boolean GENERATED ALWAYS AS ((imagen IS NOT NULL)) STORED
);


--
-- Name: recordatorios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recordatorios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo text NOT NULL,
    tipo text DEFAULT 'Recordatorio'::text NOT NULL,
    fecha date DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date NOT NULL,
    hora time without time zone,
    repeticion text DEFAULT 'ninguna'::text NOT NULL,
    intervalo integer,
    hasta date,
    planta_id uuid,
    notas text,
    hecho boolean DEFAULT false NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recordatorios_repeticion_check CHECK ((repeticion = ANY (ARRAY['ninguna'::text, 'diaria'::text, 'cada_n_dias'::text, 'semanal'::text, 'mensual'::text]))),
    CONSTRAINT recordatorios_tipo_check CHECK ((tipo = ANY (ARRAY['Riego'::text, 'Fertilizacion'::text, 'Poda'::text, 'Trasplante'::text, 'Fumigacion'::text, 'Cosecha'::text, 'Mantenimiento'::text, 'Recordatorio'::text, 'Otro'::text])))
);


--
-- Name: resumen_plantas; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.resumen_plantas AS
 SELECT p.id,
    p.codigo,
    COALESCE(p.apodo, g.nombre, 'Sin nombre'::text) AS nombre,
    g.nombre AS genetica,
    g.banco,
    g.tipo,
    p.fase,
    p.fecha_germinacion,
    (((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date - p.fecha_germinacion) AS dias_de_vida,
    p.sustrato,
    p.maceta,
    p.ubicacion,
    p.slot,
    p.activa,
    p.paciente_id,
        CASE
            WHEN public.puede_ver_padron() THEN pac.nombre_completo
            ELSE NULL::text
        END AS paciente_nombre,
    ( SELECT max(e.fecha) AS max
           FROM public.eventos e
          WHERE ((e.planta_id = p.id) AND (e.tipo = 'Riego'::text))) AS ultimo_riego,
    ( SELECT count(*) AS count
           FROM public.eventos e
          WHERE (e.planta_id = p.id)) AS total_eventos,
    p.genetica_id,
    g.tiempo_vege_dias
   FROM ((public.plantas p
     LEFT JOIN public.geneticas g ON ((g.id = p.genetica_id)))
     LEFT JOIN public.pacientes pac ON ((pac.id = p.paciente_id)))
  WHERE (public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text]));


--
-- Name: riegos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.riegos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    planta_id uuid,
    fecha date DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date NOT NULL,
    volumen_ml numeric,
    ppm numeric,
    ph numeric(3,1),
    escurrio boolean DEFAULT false NOT NULL,
    escurrido_ml numeric,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    ec numeric(5,2),
    ppm_factor integer DEFAULT 500 NOT NULL,
    grupo_id uuid,
    lote_id uuid,
    escurrido_ph numeric(4,2),
    escurrido_ec numeric(5,2),
    escurrido_ppm integer,
    CONSTRAINT riegos_ec_check CHECK (((ec IS NULL) OR ((ec >= (0)::numeric) AND (ec <= (20)::numeric)))),
    CONSTRAINT riegos_escurrido_ec_check CHECK (((escurrido_ec IS NULL) OR ((escurrido_ec >= (0)::numeric) AND (escurrido_ec <= (20)::numeric)))),
    CONSTRAINT riegos_escurrido_ph_check CHECK (((escurrido_ph IS NULL) OR ((escurrido_ph >= (0)::numeric) AND (escurrido_ph <= (14)::numeric)))),
    CONSTRAINT riegos_escurrido_ppm_check CHECK (((escurrido_ppm IS NULL) OR ((escurrido_ppm >= 0) AND (escurrido_ppm <= 20000)))),
    CONSTRAINT riegos_planta_o_grupo CHECK ((((((planta_id IS NOT NULL))::integer + ((grupo_id IS NOT NULL))::integer) + ((lote_id IS NOT NULL))::integer) <= 1)),
    CONSTRAINT riegos_ppm_factor_check CHECK ((ppm_factor = ANY (ARRAY[500, 700])))
);


--
-- Name: COLUMN riegos.ec; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.riegos.ec IS 'Conductividad en mS/cm. Es lo que mide el instrumento; el ppm se deriva multiplicando por ppm_factor.';


--
-- Name: COLUMN riegos.ppm_factor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.riegos.ppm_factor IS 'Factor del medidor: 500 (Hanna/EEUU) o 700 (Truncheon/EU). Sin esto un ppm no se puede interpretar.';


--
-- Name: COLUMN riegos.escurrido_ph; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.riegos.escurrido_ph IS 'pH del drenaje. Contra `ph` dice como esta amortiguando el sustrato.';


--
-- Name: COLUMN riegos.escurrido_ec; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.riegos.escurrido_ec IS 'EC del drenaje en mS/cm. Contra `ec` (la del riego) dice si el sustrato acumula sales: mucho mas alto = hay que lavar.';


--
-- Name: sustancias_nutrientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sustancias_nutrientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    nombre text NOT NULL,
    formula text,
    comp jsonb DEFAULT '{}'::jsonb NOT NULL,
    bidon text DEFAULT 'B'::text NOT NULL,
    liquido boolean DEFAULT false NOT NULL,
    densidad numeric,
    costo_kg numeric,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sustancias_nutrientes_bidon_check CHECK ((bidon = ANY (ARRAY['A'::text, 'B'::text, 'C'::text])))
);


--
-- Name: tableros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tableros (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    nombre text NOT NULL,
    ubicacion text,
    tension text DEFAULT 'mono'::text NOT NULL,
    acometida_a numeric,
    proteccion_general text,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tableros_tension_check CHECK ((tension = ANY (ARRAY['mono'::text, 'tri'::text])))
);


--
-- Name: tableros_circuitos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tableros_circuitos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tablero_id uuid NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    nombre text NOT NULL,
    tipo text DEFAULT 'otro'::text NOT NULL,
    potencia_w numeric,
    corriente_a numeric,
    proteccion text,
    contactor text,
    seccion_cable_mm2 numeric,
    sala text,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tableros_circuitos_tipo_check CHECK ((tipo = ANY (ARRAY['luz'::text, 'ac'::text, 'deshumi'::text, 'ventilacion'::text, 'extraccion'::text, 'bomba'::text, 'co2'::text, 'osmosis'::text, 'otro'::text])))
);


--
-- Name: v_saldo_ordenes; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_saldo_ordenes WITH (security_invoker='true') AS
 SELECT d.numero AS orden_servicio,
    d.proveedor,
    d.fecha,
    d.lote_codigo,
    d.monto AS total,
    COALESCE(sum(p.monto), (0)::numeric) AS pagado,
    (d.monto - COALESCE(sum(p.monto), (0)::numeric)) AS saldo,
    count(p.id) AS pagos
   FROM (public.ong_documentos d
     LEFT JOIN public.ong_pagos_proveedor p ON ((p.orden_servicio = d.numero)))
  WHERE ((d.numero IS NOT NULL) AND (d.numero <> ''::text) AND (d.monto IS NOT NULL) AND (d.tipo = 'gasto'::text))
  GROUP BY d.numero, d.proveedor, d.fecha, d.lote_codigo, d.monto;


--
-- Name: v_saldo_proveedores; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_saldo_proveedores WITH (security_invoker='true') AS
 WITH de_ordenes AS (
         SELECT COALESCE(v_saldo_ordenes.proveedor, 'Sin proveedor'::text) AS proveedor,
            count(*) AS ordenes,
            sum(v_saldo_ordenes.total) AS comprado,
            sum(v_saldo_ordenes.pagado) AS pagado,
            sum(v_saldo_ordenes.saldo) AS saldo,
            count(*) FILTER (WHERE (v_saldo_ordenes.saldo > (0)::numeric)) AS ordenes_con_saldo
           FROM public.v_saldo_ordenes
          GROUP BY COALESCE(v_saldo_ordenes.proveedor, 'Sin proveedor'::text)
        ), de_lotes AS (
         SELECT DISTINCT btrim(ong_lotes.proveedor) AS proveedor
           FROM public.ong_lotes
          WHERE ((ong_lotes.proveedor IS NOT NULL) AND (btrim(ong_lotes.proveedor) <> ''::text))
        )
 SELECT COALESCE(o.proveedor, l.proveedor) AS proveedor,
    COALESCE(o.ordenes, (0)::bigint) AS ordenes,
    COALESCE(o.comprado, (0)::numeric) AS comprado,
    COALESCE(o.pagado, (0)::numeric) AS pagado,
    COALESCE(o.saldo, (0)::numeric) AS saldo,
    COALESCE(o.ordenes_con_saldo, (0)::bigint) AS ordenes_con_saldo
   FROM (de_ordenes o
     FULL JOIN de_lotes l ON ((l.proveedor = o.proveedor)));


--
-- Name: actividades actividades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actividades
    ADD CONSTRAINT actividades_pkey PRIMARY KEY (id);


--
-- Name: ambiente_lecturas ambiente_lecturas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ambiente_lecturas
    ADD CONSTRAINT ambiente_lecturas_pkey PRIMARY KEY (id);


--
-- Name: ambiente_salas ambiente_salas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ambiente_salas
    ADD CONSTRAINT ambiente_salas_pkey PRIMARY KEY (id);


--
-- Name: aplicaciones aplicaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aplicaciones
    ADD CONSTRAINT aplicaciones_pkey PRIMARY KEY (id);


--
-- Name: arqueos arqueos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arqueos
    ADD CONSTRAINT arqueos_pkey PRIMARY KEY (id);


--
-- Name: asistencias asistencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_pkey PRIMARY KEY (id);


--
-- Name: cosechas cosechas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cosechas
    ADD CONSTRAINT cosechas_pkey PRIMARY KEY (id);


--
-- Name: costos costos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.costos
    ADD CONSTRAINT costos_pkey PRIMARY KEY (id);


--
-- Name: cultivadores cultivadores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cultivadores
    ADD CONSTRAINT cultivadores_pkey PRIMARY KEY (id);


--
-- Name: cultivo_areas cultivo_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cultivo_areas
    ADD CONSTRAINT cultivo_areas_pkey PRIMARY KEY (id);


--
-- Name: cultivo_grupos cultivo_grupos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cultivo_grupos
    ADD CONSTRAINT cultivo_grupos_pkey PRIMARY KEY (id);


--
-- Name: cultivo_lotes cultivo_lotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cultivo_lotes
    ADD CONSTRAINT cultivo_lotes_pkey PRIMARY KEY (id);


--
-- Name: documentos documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_pkey PRIMARY KEY (id);


--
-- Name: econometria_config econometria_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.econometria_config
    ADD CONSTRAINT econometria_config_pkey PRIMARY KEY (clave);


--
-- Name: eventos eventos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos
    ADD CONSTRAINT eventos_pkey PRIMARY KEY (id);


--
-- Name: evolucion_clinica evolucion_clinica_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evolucion_clinica
    ADD CONSTRAINT evolucion_clinica_pkey PRIMARY KEY (id);


--
-- Name: fichas_comerciales fichas_comerciales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fichas_comerciales
    ADD CONSTRAINT fichas_comerciales_pkey PRIMARY KEY (id);


--
-- Name: geneticas geneticas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geneticas
    ADD CONSTRAINT geneticas_pkey PRIMARY KEY (id);


--
-- Name: instalaciones_items instalaciones_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instalaciones_items
    ADD CONSTRAINT instalaciones_items_pkey PRIMARY KEY (id);


--
-- Name: insumos_faltantes insumos_faltantes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumos_faltantes
    ADD CONSTRAINT insumos_faltantes_pkey PRIMARY KEY (id);


--
-- Name: insumos insumos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumos
    ADD CONSTRAINT insumos_pkey PRIMARY KEY (id);


--
-- Name: inventario_nutrientes inventario_nutrientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_nutrientes
    ADD CONSTRAINT inventario_nutrientes_pkey PRIMARY KEY (sal_id);


--
-- Name: jornadas jornadas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornadas
    ADD CONSTRAINT jornadas_pkey PRIMARY KEY (id);


--
-- Name: mantenimientos mantenimientos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mantenimientos
    ADD CONSTRAINT mantenimientos_pkey PRIMARY KEY (id);


--
-- Name: ofertas_instalacion ofertas_instalacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ofertas_instalacion
    ADD CONSTRAINT ofertas_instalacion_pkey PRIMARY KEY (id);


--
-- Name: ong_actas ong_actas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_actas
    ADD CONSTRAINT ong_actas_pkey PRIMARY KEY (id);


--
-- Name: ong_asociados ong_asociados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_asociados
    ADD CONSTRAINT ong_asociados_pkey PRIMARY KEY (id);


--
-- Name: ong_autoridades ong_autoridades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_autoridades
    ADD CONSTRAINT ong_autoridades_pkey PRIMARY KEY (id);


--
-- Name: ong_caja ong_caja_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_caja
    ADD CONSTRAINT ong_caja_pkey PRIMARY KEY (id);


--
-- Name: ong_categorias_socio ong_categorias_socio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_categorias_socio
    ADD CONSTRAINT ong_categorias_socio_pkey PRIMARY KEY (id);


--
-- Name: ong_cuotas_emitidas ong_cuotas_emitidas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_cuotas_emitidas
    ADD CONSTRAINT ong_cuotas_emitidas_pkey PRIMARY KEY (id);


--
-- Name: ong_cuotas ong_cuotas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_cuotas
    ADD CONSTRAINT ong_cuotas_pkey PRIMARY KEY (id);


--
-- Name: ong_ddjj ong_ddjj_periodo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_ddjj
    ADD CONSTRAINT ong_ddjj_periodo_key UNIQUE (periodo);


--
-- Name: ong_ddjj ong_ddjj_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_ddjj
    ADD CONSTRAINT ong_ddjj_pkey PRIMARY KEY (id);


--
-- Name: ong_dispensas ong_dispensas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_dispensas
    ADD CONSTRAINT ong_dispensas_pkey PRIMARY KEY (id);


--
-- Name: ong_documentos_institucionales ong_documentos_institucionales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_documentos_institucionales
    ADD CONSTRAINT ong_documentos_institucionales_pkey PRIMARY KEY (id);


--
-- Name: ong_documentos ong_documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_documentos
    ADD CONSTRAINT ong_documentos_pkey PRIMARY KEY (id);


--
-- Name: ong_entidad ong_entidad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_entidad
    ADD CONSTRAINT ong_entidad_pkey PRIMARY KEY (id);


--
-- Name: ong_feedback_clinico ong_feedback_clinico_dispensa_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_feedback_clinico
    ADD CONSTRAINT ong_feedback_clinico_dispensa_id_key UNIQUE (dispensa_id);


--
-- Name: ong_feedback_clinico ong_feedback_clinico_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_feedback_clinico
    ADD CONSTRAINT ong_feedback_clinico_pkey PRIMARY KEY (id);


--
-- Name: ong_libros ong_libros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_libros
    ADD CONSTRAINT ong_libros_pkey PRIMARY KEY (id);


--
-- Name: ong_lotes ong_lotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_lotes
    ADD CONSTRAINT ong_lotes_pkey PRIMARY KEY (id);


--
-- Name: ong_lotes ong_lotes_user_id_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_lotes
    ADD CONSTRAINT ong_lotes_user_id_codigo_key UNIQUE (user_id, codigo);


--
-- Name: ong_pagos_proveedor ong_pagos_proveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_pagos_proveedor
    ADD CONSTRAINT ong_pagos_proveedor_pkey PRIMARY KEY (id);


--
-- Name: ong_pedidos ong_pedidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_pedidos
    ADD CONSTRAINT ong_pedidos_pkey PRIMARY KEY (id);


--
-- Name: ong_pedidos ong_pedidos_user_id_codigo_reserva_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_pedidos
    ADD CONSTRAINT ong_pedidos_user_id_codigo_reserva_key UNIQUE (user_id, codigo_reserva);


--
-- Name: ong_predios ong_predios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_predios
    ADD CONSTRAINT ong_predios_pkey PRIMARY KEY (id);


--
-- Name: ong_requisitos ong_requisitos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_requisitos
    ADD CONSTRAINT ong_requisitos_pkey PRIMARY KEY (id);


--
-- Name: ong_solicitudes ong_solicitudes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_solicitudes
    ADD CONSTRAINT ong_solicitudes_pkey PRIMARY KEY (id);


--
-- Name: ong_solicitudes ong_solicitudes_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_solicitudes
    ADD CONSTRAINT ong_solicitudes_token_key UNIQUE (token);


--
-- Name: ong_tarifas ong_tarifas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_tarifas
    ADD CONSTRAINT ong_tarifas_pkey PRIMARY KEY (id);


--
-- Name: ong_traslados ong_traslados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_traslados
    ADD CONSTRAINT ong_traslados_pkey PRIMARY KEY (id);


--
-- Name: ong_visitas ong_visitas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_visitas
    ADD CONSTRAINT ong_visitas_pkey PRIMARY KEY (id);


--
-- Name: pacientes_clinica pacientes_clinica_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacientes_clinica
    ADD CONSTRAINT pacientes_clinica_pkey PRIMARY KEY (paciente_id);


--
-- Name: pacientes pacientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacientes
    ADD CONSTRAINT pacientes_pkey PRIMARY KEY (id);


--
-- Name: perfiles_nutrientes perfiles_nutrientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfiles_nutrientes
    ADD CONSTRAINT perfiles_nutrientes_pkey PRIMARY KEY (id);


--
-- Name: perfiles_usuario perfiles_usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfiles_usuario
    ADD CONSTRAINT perfiles_usuario_pkey PRIMARY KEY (id);


--
-- Name: planes_cultivo planes_cultivo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes_cultivo
    ADD CONSTRAINT planes_cultivo_pkey PRIMARY KEY (id);


--
-- Name: plantas plantas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantas
    ADD CONSTRAINT plantas_pkey PRIMARY KEY (id);


--
-- Name: presupuesto_instalacion_items presupuesto_instalacion_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_instalacion_items
    ADD CONSTRAINT presupuesto_instalacion_items_pkey PRIMARY KEY (id);


--
-- Name: presupuestos_instalacion presupuestos_instalacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuestos_instalacion
    ADD CONSTRAINT presupuestos_instalacion_pkey PRIMARY KEY (id);


--
-- Name: proveedores_instalacion proveedores_instalacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores_instalacion
    ADD CONSTRAINT proveedores_instalacion_pkey PRIMARY KEY (id);


--
-- Name: proveedores_nutrientes proveedores_nutrientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores_nutrientes
    ADD CONSTRAINT proveedores_nutrientes_pkey PRIMARY KEY (id);


--
-- Name: recordatorios recordatorios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recordatorios
    ADD CONSTRAINT recordatorios_pkey PRIMARY KEY (id);


--
-- Name: riegos riegos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riegos
    ADD CONSTRAINT riegos_pkey PRIMARY KEY (id);


--
-- Name: sustancias_nutrientes sustancias_nutrientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sustancias_nutrientes
    ADD CONSTRAINT sustancias_nutrientes_pkey PRIMARY KEY (id);


--
-- Name: tableros_circuitos tableros_circuitos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tableros_circuitos
    ADD CONSTRAINT tableros_circuitos_pkey PRIMARY KEY (id);


--
-- Name: tableros tableros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tableros
    ADD CONSTRAINT tableros_pkey PRIMARY KEY (id);


--
-- Name: ambiente_lecturas_sala_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ambiente_lecturas_sala_fecha ON public.ambiente_lecturas USING btree (sala_id, medido_en DESC);


--
-- Name: arqueos_momento_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX arqueos_momento_idx ON public.arqueos USING btree (momento DESC);


--
-- Name: cultivo_areas_orden_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cultivo_areas_orden_idx ON public.cultivo_areas USING btree (orden, nombre);


--
-- Name: cultivo_grupos_lote_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cultivo_grupos_lote_idx ON public.cultivo_grupos USING btree (lote_id, orden);


--
-- Name: eventos_grupo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX eventos_grupo_idx ON public.eventos USING btree (grupo_id, fecha);


--
-- Name: eventos_lote_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX eventos_lote_idx ON public.eventos USING btree (lote_id, fecha);


--
-- Name: ix_ong_documentos_lote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ong_documentos_lote ON public.ong_documentos USING btree (lote_codigo);


--
-- Name: ong_caja_paciente_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ong_caja_paciente_id_idx ON public.ong_caja USING btree (paciente_id) WHERE (paciente_id IS NOT NULL);


--
-- Name: ong_dispensas_recibo_numero_uk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ong_dispensas_recibo_numero_uk ON public.ong_dispensas USING btree (recibo_numero) WHERE (recibo_numero IS NOT NULL);


--
-- Name: ong_dispensas_tipo_movimiento_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ong_dispensas_tipo_movimiento_idx ON public.ong_dispensas USING btree (tipo_movimiento);


--
-- Name: ong_dispensas_unidad_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ong_dispensas_unidad_idx ON public.ong_dispensas USING btree (unidad);


--
-- Name: ong_docs_inst_fecha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ong_docs_inst_fecha_idx ON public.ong_documentos_institucionales USING btree (fecha DESC NULLS LAST);


--
-- Name: ong_docs_inst_tipo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ong_docs_inst_tipo_idx ON public.ong_documentos_institucionales USING btree (tipo);


--
-- Name: ong_lotes_origen_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ong_lotes_origen_idx ON public.ong_lotes USING btree (origen);


--
-- Name: ong_pagos_prov_fecha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ong_pagos_prov_fecha_idx ON public.ong_pagos_proveedor USING btree (fecha DESC);


--
-- Name: ong_pagos_prov_os_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ong_pagos_prov_os_idx ON public.ong_pagos_proveedor USING btree (orden_servicio);


--
-- Name: ong_pagos_prov_prov_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ong_pagos_prov_prov_idx ON public.ong_pagos_proveedor USING btree (proveedor);


--
-- Name: ong_solicitudes_dni_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ong_solicitudes_dni_idx ON public.ong_solicitudes USING btree (dni);


--
-- Name: ong_solicitudes_estado_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ong_solicitudes_estado_idx ON public.ong_solicitudes USING btree (estado, creada_en DESC);


--
-- Name: ong_tarifas_combo_uk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ong_tarifas_combo_uk ON public.ong_tarifas USING btree (nivel, COALESCE(reprocann, '-'::text), vigente_desde);


--
-- Name: ong_tarifas_nivel_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ong_tarifas_nivel_idx ON public.ong_tarifas USING btree (nivel, vigente_desde DESC);


--
-- Name: pacientes_apellido_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pacientes_apellido_idx ON public.pacientes USING btree (apellido);


--
-- Name: pacientes_codigo_uk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pacientes_codigo_uk ON public.pacientes USING btree (codigo) WHERE (codigo IS NOT NULL);


--
-- Name: planes_cultivo_activo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planes_cultivo_activo_idx ON public.planes_cultivo USING btree (activo, desde DESC);


--
-- Name: plantas_grupo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plantas_grupo_idx ON public.plantas USING btree (grupo_id);


--
-- Name: riegos_grupo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX riegos_grupo_idx ON public.riegos USING btree (grupo_id, fecha);


--
-- Name: riegos_lote_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX riegos_lote_idx ON public.riegos USING btree (lote_id, fecha);


--
-- Name: pacientes pacientes_asignar_codigo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pacientes_asignar_codigo BEFORE INSERT ON public.pacientes FOR EACH ROW EXECUTE FUNCTION public.asignar_codigo_paciente();


--
-- Name: pacientes preservar_lo_que_no_puede_ver; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER preservar_lo_que_no_puede_ver BEFORE UPDATE ON public.pacientes FOR EACH ROW EXECUTE FUNCTION public.preservar_lo_que_no_puede_ver();


--
-- Name: ong_dispensas preservar_los_importes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER preservar_los_importes BEFORE UPDATE ON public.ong_dispensas FOR EACH ROW EXECUTE FUNCTION public.preservar_los_importes();


--
-- Name: ong_solicitudes solicitud_pasar_mandato_tg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER solicitud_pasar_mandato_tg AFTER UPDATE ON public.ong_solicitudes FOR EACH ROW EXECUTE FUNCTION public.solicitud_pasar_mandato();


--
-- Name: cosechas trg_cosecha_libera_slot; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cosecha_libera_slot AFTER INSERT ON public.cosechas FOR EACH ROW EXECUTE FUNCTION public.marcar_planta_cosechada();


--
-- Name: eventos trg_eventos_cambio_fase; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_eventos_cambio_fase AFTER INSERT ON public.eventos FOR EACH ROW EXECUTE FUNCTION public.aplicar_cambio_fase();


--
-- Name: plantas trg_plantas_actualizado; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_plantas_actualizado BEFORE UPDATE ON public.plantas FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: actividades actividades_cultivador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actividades
    ADD CONSTRAINT actividades_cultivador_id_fkey FOREIGN KEY (cultivador_id) REFERENCES public.cultivadores(id) ON DELETE SET NULL;


--
-- Name: actividades actividades_jornada_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actividades
    ADD CONSTRAINT actividades_jornada_id_fkey FOREIGN KEY (jornada_id) REFERENCES public.jornadas(id) ON DELETE CASCADE;


--
-- Name: ambiente_lecturas ambiente_lecturas_sala_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ambiente_lecturas
    ADD CONSTRAINT ambiente_lecturas_sala_id_fkey FOREIGN KEY (sala_id) REFERENCES public.ambiente_salas(id) ON DELETE CASCADE;


--
-- Name: aplicaciones aplicaciones_planta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aplicaciones
    ADD CONSTRAINT aplicaciones_planta_id_fkey FOREIGN KEY (planta_id) REFERENCES public.plantas(id) ON DELETE CASCADE;


--
-- Name: arqueos arqueos_contado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arqueos
    ADD CONSTRAINT arqueos_contado_por_fkey FOREIGN KEY (contado_por) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: asistencias asistencias_cultivador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_cultivador_id_fkey FOREIGN KEY (cultivador_id) REFERENCES public.cultivadores(id) ON DELETE CASCADE;


--
-- Name: asistencias asistencias_jornada_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_jornada_id_fkey FOREIGN KEY (jornada_id) REFERENCES public.jornadas(id) ON DELETE CASCADE;


--
-- Name: cosechas cosechas_planta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cosechas
    ADD CONSTRAINT cosechas_planta_id_fkey FOREIGN KEY (planta_id) REFERENCES public.plantas(id) ON DELETE CASCADE;


--
-- Name: cultivo_grupos cultivo_grupos_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cultivo_grupos
    ADD CONSTRAINT cultivo_grupos_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.cultivo_lotes(id) ON DELETE CASCADE;


--
-- Name: cultivo_lotes cultivo_lotes_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cultivo_lotes
    ADD CONSTRAINT cultivo_lotes_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.cultivo_areas(id) ON DELETE SET NULL;


--
-- Name: cultivo_lotes cultivo_lotes_genetica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cultivo_lotes
    ADD CONSTRAINT cultivo_lotes_genetica_id_fkey FOREIGN KEY (genetica_id) REFERENCES public.geneticas(id) ON DELETE SET NULL;


--
-- Name: eventos eventos_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos
    ADD CONSTRAINT eventos_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.cultivo_grupos(id) ON DELETE CASCADE;


--
-- Name: eventos eventos_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos
    ADD CONSTRAINT eventos_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.cultivo_lotes(id) ON DELETE CASCADE;


--
-- Name: eventos eventos_planta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos
    ADD CONSTRAINT eventos_planta_id_fkey FOREIGN KEY (planta_id) REFERENCES public.plantas(id) ON DELETE CASCADE;


--
-- Name: evolucion_clinica evolucion_clinica_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evolucion_clinica
    ADD CONSTRAINT evolucion_clinica_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE CASCADE;


--
-- Name: instalaciones_items instalaciones_items_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instalaciones_items
    ADD CONSTRAINT instalaciones_items_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedores_instalacion(id) ON DELETE SET NULL;


--
-- Name: mantenimientos mantenimientos_insumo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mantenimientos
    ADD CONSTRAINT mantenimientos_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id) ON DELETE SET NULL;


--
-- Name: ofertas_instalacion ofertas_instalacion_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ofertas_instalacion
    ADD CONSTRAINT ofertas_instalacion_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.instalaciones_items(id) ON DELETE CASCADE;


--
-- Name: ofertas_instalacion ofertas_instalacion_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ofertas_instalacion
    ADD CONSTRAINT ofertas_instalacion_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedores_instalacion(id) ON DELETE SET NULL;


--
-- Name: ong_actas ong_actas_libro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_actas
    ADD CONSTRAINT ong_actas_libro_id_fkey FOREIGN KEY (libro_id) REFERENCES public.ong_libros(id) ON DELETE SET NULL;


--
-- Name: ong_asociados ong_asociados_acta_alta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_asociados
    ADD CONSTRAINT ong_asociados_acta_alta_id_fkey FOREIGN KEY (acta_alta_id) REFERENCES public.ong_actas(id) ON DELETE SET NULL;


--
-- Name: ong_asociados ong_asociados_acta_baja_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_asociados
    ADD CONSTRAINT ong_asociados_acta_baja_id_fkey FOREIGN KEY (acta_baja_id) REFERENCES public.ong_actas(id) ON DELETE SET NULL;


--
-- Name: ong_asociados ong_asociados_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_asociados
    ADD CONSTRAINT ong_asociados_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE SET NULL;


--
-- Name: ong_caja ong_caja_cuota_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_caja
    ADD CONSTRAINT ong_caja_cuota_id_fkey FOREIGN KEY (cuota_id) REFERENCES public.ong_cuotas_emitidas(id) ON DELETE SET NULL;


--
-- Name: ong_caja ong_caja_dispensa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_caja
    ADD CONSTRAINT ong_caja_dispensa_id_fkey FOREIGN KEY (dispensa_id) REFERENCES public.ong_dispensas(id) ON DELETE SET NULL;


--
-- Name: ong_caja ong_caja_documento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_caja
    ADD CONSTRAINT ong_caja_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES public.ong_documentos(id) ON DELETE SET NULL;


--
-- Name: ong_caja ong_caja_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_caja
    ADD CONSTRAINT ong_caja_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE SET NULL;


--
-- Name: ong_caja ong_caja_pago_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_caja
    ADD CONSTRAINT ong_caja_pago_id_fkey FOREIGN KEY (pago_id) REFERENCES public.ong_pagos_proveedor(id) ON DELETE CASCADE;


--
-- Name: ong_cuotas ong_cuotas_acta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_cuotas
    ADD CONSTRAINT ong_cuotas_acta_id_fkey FOREIGN KEY (acta_id) REFERENCES public.ong_actas(id) ON DELETE SET NULL;


--
-- Name: ong_cuotas_emitidas ong_cuotas_emitidas_asociado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_cuotas_emitidas
    ADD CONSTRAINT ong_cuotas_emitidas_asociado_id_fkey FOREIGN KEY (asociado_id) REFERENCES public.ong_asociados(id) ON DELETE CASCADE;


--
-- Name: ong_dispensas ong_dispensas_genetica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_dispensas
    ADD CONSTRAINT ong_dispensas_genetica_id_fkey FOREIGN KEY (genetica_id) REFERENCES public.geneticas(id) ON DELETE SET NULL;


--
-- Name: ong_dispensas ong_dispensas_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_dispensas
    ADD CONSTRAINT ong_dispensas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE SET NULL;


--
-- Name: ong_dispensas ong_dispensas_visita_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_dispensas
    ADD CONSTRAINT ong_dispensas_visita_id_fkey FOREIGN KEY (visita_id) REFERENCES public.ong_visitas(id) ON DELETE SET NULL;


--
-- Name: ong_documentos ong_documentos_asociado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_documentos
    ADD CONSTRAINT ong_documentos_asociado_id_fkey FOREIGN KEY (asociado_id) REFERENCES public.ong_asociados(id) ON DELETE SET NULL;


--
-- Name: ong_documentos ong_documentos_dispensa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_documentos
    ADD CONSTRAINT ong_documentos_dispensa_id_fkey FOREIGN KEY (dispensa_id) REFERENCES public.ong_dispensas(id) ON DELETE SET NULL;


--
-- Name: ong_documentos_institucionales ong_documentos_institucionales_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_documentos_institucionales
    ADD CONSTRAINT ong_documentos_institucionales_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: ong_documentos ong_documentos_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_documentos
    ADD CONSTRAINT ong_documentos_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE SET NULL;


--
-- Name: ong_feedback_clinico ong_feedback_clinico_dispensa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_feedback_clinico
    ADD CONSTRAINT ong_feedback_clinico_dispensa_id_fkey FOREIGN KEY (dispensa_id) REFERENCES public.ong_dispensas(id) ON DELETE CASCADE;


--
-- Name: ong_feedback_clinico ong_feedback_clinico_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_feedback_clinico
    ADD CONSTRAINT ong_feedback_clinico_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE SET NULL;


--
-- Name: ong_lotes ong_lotes_cosecha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_lotes
    ADD CONSTRAINT ong_lotes_cosecha_id_fkey FOREIGN KEY (cosecha_id) REFERENCES public.cosechas(id) ON DELETE SET NULL;


--
-- Name: ong_lotes ong_lotes_genetica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_lotes
    ADD CONSTRAINT ong_lotes_genetica_id_fkey FOREIGN KEY (genetica_id) REFERENCES public.geneticas(id) ON DELETE SET NULL;


--
-- Name: ong_lotes ong_lotes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_lotes
    ADD CONSTRAINT ong_lotes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: ong_pedidos ong_pedidos_asociado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_pedidos
    ADD CONSTRAINT ong_pedidos_asociado_id_fkey FOREIGN KEY (asociado_id) REFERENCES public.ong_asociados(id) ON DELETE SET NULL;


--
-- Name: ong_pedidos ong_pedidos_dispensa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_pedidos
    ADD CONSTRAINT ong_pedidos_dispensa_id_fkey FOREIGN KEY (dispensa_id) REFERENCES public.ong_dispensas(id) ON DELETE SET NULL;


--
-- Name: ong_pedidos ong_pedidos_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_pedidos
    ADD CONSTRAINT ong_pedidos_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.ong_lotes(id) ON DELETE RESTRICT;


--
-- Name: ong_pedidos ong_pedidos_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_pedidos
    ADD CONSTRAINT ong_pedidos_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE SET NULL;


--
-- Name: ong_pedidos ong_pedidos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_pedidos
    ADD CONSTRAINT ong_pedidos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: ong_solicitudes ong_solicitudes_asociado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_solicitudes
    ADD CONSTRAINT ong_solicitudes_asociado_id_fkey FOREIGN KEY (asociado_id) REFERENCES public.ong_asociados(id) ON DELETE SET NULL;


--
-- Name: ong_solicitudes ong_solicitudes_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_solicitudes
    ADD CONSTRAINT ong_solicitudes_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE SET NULL;


--
-- Name: ong_solicitudes ong_solicitudes_revisada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_solicitudes
    ADD CONSTRAINT ong_solicitudes_revisada_por_fkey FOREIGN KEY (revisada_por) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: ong_traslados ong_traslados_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_traslados
    ADD CONSTRAINT ong_traslados_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE SET NULL;


--
-- Name: ong_visitas ong_visitas_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_visitas
    ADD CONSTRAINT ong_visitas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE SET NULL;


--
-- Name: ong_visitas ong_visitas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ong_visitas
    ADD CONSTRAINT ong_visitas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: pacientes_clinica pacientes_clinica_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacientes_clinica
    ADD CONSTRAINT pacientes_clinica_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE CASCADE;


--
-- Name: perfiles_usuario perfiles_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfiles_usuario
    ADD CONSTRAINT perfiles_usuario_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: planes_cultivo planes_cultivo_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes_cultivo
    ADD CONSTRAINT planes_cultivo_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: plantas plantas_genetica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantas
    ADD CONSTRAINT plantas_genetica_id_fkey FOREIGN KEY (genetica_id) REFERENCES public.geneticas(id) ON DELETE SET NULL;


--
-- Name: plantas plantas_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantas
    ADD CONSTRAINT plantas_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.cultivo_grupos(id) ON DELETE SET NULL;


--
-- Name: plantas plantas_madre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantas
    ADD CONSTRAINT plantas_madre_id_fkey FOREIGN KEY (madre_id) REFERENCES public.plantas(id) ON DELETE SET NULL;


--
-- Name: plantas plantas_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantas
    ADD CONSTRAINT plantas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE SET NULL;


--
-- Name: presupuesto_instalacion_items presupuesto_instalacion_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_instalacion_items
    ADD CONSTRAINT presupuesto_instalacion_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.instalaciones_items(id) ON DELETE SET NULL;


--
-- Name: presupuesto_instalacion_items presupuesto_instalacion_items_presupuesto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_instalacion_items
    ADD CONSTRAINT presupuesto_instalacion_items_presupuesto_id_fkey FOREIGN KEY (presupuesto_id) REFERENCES public.presupuestos_instalacion(id) ON DELETE CASCADE;


--
-- Name: recordatorios recordatorios_planta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recordatorios
    ADD CONSTRAINT recordatorios_planta_id_fkey FOREIGN KEY (planta_id) REFERENCES public.plantas(id) ON DELETE SET NULL;


--
-- Name: riegos riegos_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riegos
    ADD CONSTRAINT riegos_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.cultivo_grupos(id) ON DELETE CASCADE;


--
-- Name: riegos riegos_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riegos
    ADD CONSTRAINT riegos_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.cultivo_lotes(id) ON DELETE CASCADE;


--
-- Name: riegos riegos_planta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riegos
    ADD CONSTRAINT riegos_planta_id_fkey FOREIGN KEY (planta_id) REFERENCES public.plantas(id) ON DELETE CASCADE;


--
-- Name: tableros_circuitos tableros_circuitos_tablero_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tableros_circuitos
    ADD CONSTRAINT tableros_circuitos_tablero_id_fkey FOREIGN KEY (tablero_id) REFERENCES public.tableros(id) ON DELETE CASCADE;


--
-- Name: actividades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;

--
-- Name: actividades actividades_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY actividades_escribir ON public.actividades TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: actividades actividades_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY actividades_ver ON public.actividades FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: ambiente_lecturas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ambiente_lecturas ENABLE ROW LEVEL SECURITY;

--
-- Name: ambiente_lecturas ambiente_lecturas_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ambiente_lecturas_escribir ON public.ambiente_lecturas TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text, 'mostrador'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text, 'mostrador'::text])));


--
-- Name: ambiente_lecturas ambiente_lecturas_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ambiente_lecturas_ver ON public.ambiente_lecturas FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: ambiente_salas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ambiente_salas ENABLE ROW LEVEL SECURITY;

--
-- Name: ambiente_salas ambiente_salas_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ambiente_salas_escribir ON public.ambiente_salas TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: ambiente_salas ambiente_salas_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ambiente_salas_ver ON public.ambiente_salas FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: aplicaciones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.aplicaciones ENABLE ROW LEVEL SECURITY;

--
-- Name: aplicaciones aplicaciones_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aplicaciones_escribir ON public.aplicaciones TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: aplicaciones aplicaciones_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aplicaciones_ver ON public.aplicaciones FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: arqueos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.arqueos ENABLE ROW LEVEL SECURITY;

--
-- Name: arqueos arqueos_cargar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY arqueos_cargar ON public.arqueos FOR INSERT TO authenticated WITH CHECK (public.puede_ver_plata());


--
-- Name: arqueos arqueos_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY arqueos_ver ON public.arqueos FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: asistencias; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;

--
-- Name: asistencias asistencias_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY asistencias_escribir ON public.asistencias TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: asistencias asistencias_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY asistencias_ver ON public.asistencias FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: pacientes_clinica clinica_actualizar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clinica_actualizar ON public.pacientes_clinica FOR UPDATE TO authenticated USING (public.puede_ver_clinico()) WITH CHECK (public.puede_ver_clinico());


--
-- Name: pacientes_clinica clinica_borrar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clinica_borrar ON public.pacientes_clinica FOR DELETE TO authenticated USING (public.es_admin());


--
-- Name: pacientes_clinica clinica_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clinica_escribir ON public.pacientes_clinica FOR INSERT TO authenticated WITH CHECK (public.puede_ver_clinico());


--
-- Name: pacientes_clinica clinica_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clinica_ver ON public.pacientes_clinica FOR SELECT TO authenticated USING (public.puede_ver_clinico());


--
-- Name: cosechas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cosechas ENABLE ROW LEVEL SECURITY;

--
-- Name: cosechas cosechas_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cosechas_escribir ON public.cosechas TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: cosechas cosechas_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cosechas_ver ON public.cosechas FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: costos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.costos ENABLE ROW LEVEL SECURITY;

--
-- Name: costos costos_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY costos_escribir ON public.costos TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: costos costos_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY costos_ver ON public.costos FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: cultivadores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cultivadores ENABLE ROW LEVEL SECURITY;

--
-- Name: cultivadores cultivadores_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cultivadores_escribir ON public.cultivadores TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: cultivadores cultivadores_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cultivadores_ver ON public.cultivadores FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: cultivo_areas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cultivo_areas ENABLE ROW LEVEL SECURITY;

--
-- Name: cultivo_areas cultivo_areas_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cultivo_areas_escribir ON public.cultivo_areas TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: cultivo_areas cultivo_areas_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cultivo_areas_ver ON public.cultivo_areas FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: cultivo_grupos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cultivo_grupos ENABLE ROW LEVEL SECURITY;

--
-- Name: cultivo_grupos cultivo_grupos_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cultivo_grupos_escribir ON public.cultivo_grupos TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: cultivo_grupos cultivo_grupos_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cultivo_grupos_ver ON public.cultivo_grupos FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: cultivo_lotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cultivo_lotes ENABLE ROW LEVEL SECURITY;

--
-- Name: cultivo_lotes cultivo_lotes_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cultivo_lotes_escribir ON public.cultivo_lotes TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: cultivo_lotes cultivo_lotes_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cultivo_lotes_ver ON public.cultivo_lotes FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: documentos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

--
-- Name: documentos documentos_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documentos_escribir ON public.documentos TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: documentos documentos_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documentos_ver ON public.documentos FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: econometria_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.econometria_config ENABLE ROW LEVEL SECURITY;

--
-- Name: econometria_config econometria_config_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY econometria_config_escribir ON public.econometria_config TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: econometria_config econometria_config_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY econometria_config_ver ON public.econometria_config FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: eventos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

--
-- Name: eventos eventos_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY eventos_escribir ON public.eventos TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: eventos eventos_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY eventos_ver ON public.eventos FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: evolucion_clinica evolucion_actualizar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evolucion_actualizar ON public.evolucion_clinica FOR UPDATE TO authenticated USING (public.puede_ver_clinico()) WITH CHECK (public.puede_ver_clinico());


--
-- Name: evolucion_clinica evolucion_borrar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evolucion_borrar ON public.evolucion_clinica FOR DELETE TO authenticated USING (public.es_admin());


--
-- Name: evolucion_clinica; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.evolucion_clinica ENABLE ROW LEVEL SECURITY;

--
-- Name: evolucion_clinica evolucion_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evolucion_escribir ON public.evolucion_clinica FOR INSERT TO authenticated WITH CHECK (public.puede_ver_clinico());


--
-- Name: evolucion_clinica evolucion_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evolucion_ver ON public.evolucion_clinica FOR SELECT TO authenticated USING (public.puede_ver_clinico());


--
-- Name: ong_feedback_clinico feedback_cargar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feedback_cargar ON public.ong_feedback_clinico FOR INSERT TO authenticated WITH CHECK (public.puede_ver_clinico());


--
-- Name: ong_feedback_clinico feedback_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feedback_ver ON public.ong_feedback_clinico FOR SELECT TO authenticated USING (public.puede_ver_clinico());


--
-- Name: fichas_comerciales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fichas_comerciales ENABLE ROW LEVEL SECURITY;

--
-- Name: fichas_comerciales fichas_comerciales_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fichas_comerciales_escribir ON public.fichas_comerciales TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: fichas_comerciales fichas_comerciales_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fichas_comerciales_ver ON public.fichas_comerciales FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: geneticas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.geneticas ENABLE ROW LEVEL SECURITY;

--
-- Name: geneticas geneticas_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY geneticas_escribir ON public.geneticas TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: geneticas geneticas_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY geneticas_ver ON public.geneticas FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: instalaciones_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.instalaciones_items ENABLE ROW LEVEL SECURITY;

--
-- Name: instalaciones_items instalaciones_items_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY instalaciones_items_escribir ON public.instalaciones_items TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: instalaciones_items instalaciones_items_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY instalaciones_items_ver ON public.instalaciones_items FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: insumos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;

--
-- Name: insumos insumos_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insumos_escribir ON public.insumos TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: insumos_faltantes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.insumos_faltantes ENABLE ROW LEVEL SECURITY;

--
-- Name: insumos_faltantes insumos_faltantes_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insumos_faltantes_escribir ON public.insumos_faltantes TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: insumos_faltantes insumos_faltantes_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insumos_faltantes_ver ON public.insumos_faltantes FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: insumos insumos_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insumos_ver ON public.insumos FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: inventario_nutrientes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventario_nutrientes ENABLE ROW LEVEL SECURITY;

--
-- Name: inventario_nutrientes inventario_nutrientes_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventario_nutrientes_escribir ON public.inventario_nutrientes TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: inventario_nutrientes inventario_nutrientes_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventario_nutrientes_ver ON public.inventario_nutrientes FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: jornadas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;

--
-- Name: jornadas jornadas_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY jornadas_escribir ON public.jornadas TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: jornadas jornadas_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY jornadas_ver ON public.jornadas FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: mantenimientos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mantenimientos ENABLE ROW LEVEL SECURITY;

--
-- Name: mantenimientos mantenimientos_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mantenimientos_escribir ON public.mantenimientos TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: mantenimientos mantenimientos_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mantenimientos_ver ON public.mantenimientos FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: ofertas_instalacion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ofertas_instalacion ENABLE ROW LEVEL SECURITY;

--
-- Name: ofertas_instalacion ofertas_instalacion_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ofertas_instalacion_escribir ON public.ofertas_instalacion TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: ofertas_instalacion ofertas_instalacion_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ofertas_instalacion_ver ON public.ofertas_instalacion FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: ong_actas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_actas ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_actas ong_actas_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_actas_escribir ON public.ong_actas TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: ong_actas ong_actas_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_actas_ver ON public.ong_actas FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: ong_asociados; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_asociados ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_asociados ong_asociados_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_asociados_escribir ON public.ong_asociados TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text])));


--
-- Name: ong_asociados ong_asociados_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_asociados_ver ON public.ong_asociados FOR SELECT TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'auditor'::text, 'mostrador'::text])));


--
-- Name: ong_autoridades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_autoridades ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_autoridades ong_autoridades_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_autoridades_escribir ON public.ong_autoridades TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: ong_autoridades ong_autoridades_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_autoridades_ver ON public.ong_autoridades FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: ong_caja; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_caja ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_caja ong_caja_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_caja_escribir ON public.ong_caja TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text, 'mostrador'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text, 'mostrador'::text])));


--
-- Name: ong_caja ong_caja_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_caja_ver ON public.ong_caja FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: ong_categorias_socio; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_categorias_socio ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_categorias_socio ong_categorias_socio_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_categorias_socio_escribir ON public.ong_categorias_socio TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: ong_categorias_socio ong_categorias_socio_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_categorias_socio_ver ON public.ong_categorias_socio FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: ong_cuotas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_cuotas ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_cuotas_emitidas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_cuotas_emitidas ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_cuotas_emitidas ong_cuotas_emitidas_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_cuotas_emitidas_escribir ON public.ong_cuotas_emitidas TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: ong_cuotas_emitidas ong_cuotas_emitidas_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_cuotas_emitidas_ver ON public.ong_cuotas_emitidas FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: ong_cuotas ong_cuotas_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_cuotas_escribir ON public.ong_cuotas TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: ong_cuotas ong_cuotas_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_cuotas_ver ON public.ong_cuotas FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: ong_ddjj; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_ddjj ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_ddjj ong_ddjj_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_ddjj_escribir ON public.ong_ddjj TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text, 'director_cultivo'::text])));


--
-- Name: ong_ddjj ong_ddjj_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_ddjj_ver ON public.ong_ddjj FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: ong_dispensas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_dispensas ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_dispensas ong_dispensas_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_dispensas_escribir ON public.ong_dispensas TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'mostrador'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'mostrador'::text])));


--
-- Name: ong_dispensas ong_dispensas_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_dispensas_ver ON public.ong_dispensas FOR SELECT TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'auditor'::text, 'mostrador'::text])));


--
-- Name: ong_documentos_institucionales ong_docs_inst_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_docs_inst_escribir ON public.ong_documentos_institucionales TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: ong_documentos_institucionales ong_docs_inst_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_docs_inst_ver ON public.ong_documentos_institucionales FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: ong_documentos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_documentos ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_documentos ong_documentos_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_documentos_escribir ON public.ong_documentos TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text, 'mostrador'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text, 'mostrador'::text])));


--
-- Name: ong_documentos_institucionales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_documentos_institucionales ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_documentos ong_documentos_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_documentos_ver ON public.ong_documentos FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: ong_entidad; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_entidad ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_entidad ong_entidad_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_entidad_escribir ON public.ong_entidad TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: ong_entidad ong_entidad_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_entidad_ver ON public.ong_entidad FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: ong_feedback_clinico; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_feedback_clinico ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_libros; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_libros ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_libros ong_libros_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_libros_escribir ON public.ong_libros TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: ong_libros ong_libros_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_libros_ver ON public.ong_libros FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: ong_lotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_lotes ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_lotes ong_lotes_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_lotes_escribir ON public.ong_lotes TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'mostrador'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'mostrador'::text])));


--
-- Name: ong_lotes ong_lotes_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_lotes_ver ON public.ong_lotes FOR SELECT TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'auditor'::text, 'mostrador'::text])));


--
-- Name: ong_pagos_proveedor ong_pagos_prov_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_pagos_prov_escribir ON public.ong_pagos_proveedor TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: ong_pagos_proveedor ong_pagos_prov_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_pagos_prov_ver ON public.ong_pagos_proveedor FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: ong_pagos_proveedor; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_pagos_proveedor ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_pedidos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_pedidos ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_pedidos ong_pedidos_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_pedidos_escribir ON public.ong_pedidos TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'mostrador'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'mostrador'::text])));


--
-- Name: ong_pedidos ong_pedidos_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_pedidos_ver ON public.ong_pedidos FOR SELECT TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'auditor'::text, 'mostrador'::text])));


--
-- Name: ong_predios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_predios ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_predios ong_predios_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_predios_escribir ON public.ong_predios TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text, 'director_cultivo'::text])));


--
-- Name: ong_predios ong_predios_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_predios_ver ON public.ong_predios FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: ong_requisitos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_requisitos ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_requisitos ong_requisitos_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_requisitos_escribir ON public.ong_requisitos TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: ong_requisitos ong_requisitos_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_requisitos_ver ON public.ong_requisitos FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: ong_solicitudes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_solicitudes ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_solicitudes ong_solicitudes_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_solicitudes_escribir ON public.ong_solicitudes TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text])));


--
-- Name: ong_solicitudes ong_solicitudes_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_solicitudes_ver ON public.ong_solicitudes FOR SELECT TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'auditor'::text])));


--
-- Name: ong_tarifas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_tarifas ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_tarifas ong_tarifas_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_tarifas_escribir ON public.ong_tarifas TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: ong_tarifas ong_tarifas_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_tarifas_ver ON public.ong_tarifas FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: ong_traslados; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_traslados ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_traslados ong_traslados_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_traslados_escribir ON public.ong_traslados TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'director_cultivo'::text])));


--
-- Name: ong_traslados ong_traslados_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_traslados_ver ON public.ong_traslados FOR SELECT TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'auditor'::text, 'director_cultivo'::text])));


--
-- Name: ong_visitas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ong_visitas ENABLE ROW LEVEL SECURITY;

--
-- Name: ong_visitas ong_visitas_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_visitas_escribir ON public.ong_visitas TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'mostrador'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'mostrador'::text])));


--
-- Name: ong_visitas ong_visitas_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ong_visitas_ver ON public.ong_visitas FOR SELECT TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_medico'::text, 'administrativo'::text, 'auditor'::text, 'mostrador'::text])));


--
-- Name: pacientes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

--
-- Name: pacientes pacientes_actualizar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pacientes_actualizar ON public.pacientes FOR UPDATE TO authenticated USING (public.puede_ver_padron()) WITH CHECK (public.puede_ver_padron());


--
-- Name: pacientes pacientes_borrar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pacientes_borrar ON public.pacientes FOR DELETE TO authenticated USING (public.es_admin());


--
-- Name: pacientes_clinica; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pacientes_clinica ENABLE ROW LEVEL SECURITY;

--
-- Name: pacientes pacientes_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pacientes_escribir ON public.pacientes FOR INSERT TO authenticated WITH CHECK (public.puede_ver_padron());


--
-- Name: pacientes pacientes_ver_ficha; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pacientes_ver_ficha ON public.pacientes FOR SELECT TO authenticated USING (public.puede_ver_padron());


--
-- Name: perfiles_usuario perfiles_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY perfiles_admin ON public.perfiles_usuario TO authenticated USING (public.es_admin()) WITH CHECK (public.es_admin());


--
-- Name: perfiles_nutrientes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.perfiles_nutrientes ENABLE ROW LEVEL SECURITY;

--
-- Name: perfiles_nutrientes perfiles_nutrientes_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY perfiles_nutrientes_escribir ON public.perfiles_nutrientes TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: perfiles_nutrientes perfiles_nutrientes_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY perfiles_nutrientes_ver ON public.perfiles_nutrientes FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: perfiles_usuario; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.perfiles_usuario ENABLE ROW LEVEL SECURITY;

--
-- Name: perfiles_usuario perfiles_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY perfiles_ver ON public.perfiles_usuario FOR SELECT TO authenticated USING (((id = ( SELECT auth.uid() AS uid)) OR public.es_admin()));


--
-- Name: planes_cultivo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.planes_cultivo ENABLE ROW LEVEL SECURITY;

--
-- Name: planes_cultivo planes_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY planes_escribir ON public.planes_cultivo TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'director_cultivo'::text])));


--
-- Name: planes_cultivo planes_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY planes_ver ON public.planes_cultivo FOR SELECT TO authenticated USING ((public.mi_rol() IS NOT NULL));


--
-- Name: plantas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plantas ENABLE ROW LEVEL SECURITY;

--
-- Name: plantas plantas_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plantas_escribir ON public.plantas TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: plantas plantas_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plantas_ver ON public.plantas FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: presupuesto_instalacion_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.presupuesto_instalacion_items ENABLE ROW LEVEL SECURITY;

--
-- Name: presupuesto_instalacion_items presupuesto_instalacion_items_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presupuesto_instalacion_items_escribir ON public.presupuesto_instalacion_items TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: presupuesto_instalacion_items presupuesto_instalacion_items_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presupuesto_instalacion_items_ver ON public.presupuesto_instalacion_items FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: presupuestos_instalacion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.presupuestos_instalacion ENABLE ROW LEVEL SECURITY;

--
-- Name: presupuestos_instalacion presupuestos_instalacion_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presupuestos_instalacion_escribir ON public.presupuestos_instalacion TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: presupuestos_instalacion presupuestos_instalacion_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presupuestos_instalacion_ver ON public.presupuestos_instalacion FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: proveedores_instalacion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proveedores_instalacion ENABLE ROW LEVEL SECURITY;

--
-- Name: proveedores_instalacion proveedores_instalacion_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY proveedores_instalacion_escribir ON public.proveedores_instalacion TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: proveedores_instalacion proveedores_instalacion_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY proveedores_instalacion_ver ON public.proveedores_instalacion FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: proveedores_nutrientes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proveedores_nutrientes ENABLE ROW LEVEL SECURITY;

--
-- Name: proveedores_nutrientes proveedores_nutrientes_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY proveedores_nutrientes_escribir ON public.proveedores_nutrientes TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'administrativo'::text])));


--
-- Name: proveedores_nutrientes proveedores_nutrientes_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY proveedores_nutrientes_ver ON public.proveedores_nutrientes FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: recordatorios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recordatorios ENABLE ROW LEVEL SECURITY;

--
-- Name: recordatorios recordatorios_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY recordatorios_escribir ON public.recordatorios TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: recordatorios recordatorios_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY recordatorios_ver ON public.recordatorios FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: riegos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.riegos ENABLE ROW LEVEL SECURITY;

--
-- Name: riegos riegos_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY riegos_escribir ON public.riegos TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: riegos riegos_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY riegos_ver ON public.riegos FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: sustancias_nutrientes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sustancias_nutrientes ENABLE ROW LEVEL SECURITY;

--
-- Name: sustancias_nutrientes sustancias_nutrientes_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sustancias_nutrientes_escribir ON public.sustancias_nutrientes TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: sustancias_nutrientes sustancias_nutrientes_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sustancias_nutrientes_ver ON public.sustancias_nutrientes FOR SELECT TO authenticated USING (public.puede_ver_plata());


--
-- Name: tableros; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tableros ENABLE ROW LEVEL SECURITY;

--
-- Name: tableros_circuitos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tableros_circuitos ENABLE ROW LEVEL SECURITY;

--
-- Name: tableros_circuitos tableros_circuitos_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tableros_circuitos_escribir ON public.tableros_circuitos TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: tableros_circuitos tableros_circuitos_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tableros_circuitos_ver ON public.tableros_circuitos FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- Name: tableros tableros_escribir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tableros_escribir ON public.tableros TO authenticated USING ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text]))) WITH CHECK ((public.mi_rol() = ANY (ARRAY['administrador'::text, 'administrador_sistema'::text, 'cultivador'::text, 'director_cultivo'::text])));


--
-- Name: tableros tableros_ver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tableros_ver ON public.tableros FOR SELECT TO authenticated USING ((public.mi_rol() <> ALL (ARRAY['sin_perfil'::text, 'demo'::text])));


--
-- PostgreSQL database dump complete
--



SELECT pg_catalog.set_config('search_path', 'public, extensions', false);

-- ═══ Permisos ═══
-- Cada uno tolera que el objeto ya no exista (firmas viejas de funciones reemplazadas).
do $g$ begin execute 'revoke all on function public.crear_perfil_al_alta() from public, anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on function public.asignar_numero_recibo(uuid) from public, anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant execute on function public.asignar_numero_recibo(uuid) to authenticated, service_role'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant execute on function public.crear_perfil_al_alta() to service_role'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on function public.rls_auto_enable() from public, anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.v_saldo_ordenes     from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.v_saldo_proveedores from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant select on public.v_saldo_ordenes     to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant select on public.v_saldo_proveedores to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.v_saldo_ordenes from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.v_saldo_proveedores from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant select on public.v_saldo_proveedores to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on function public.asignar_numero_recibo(uuid) from public'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant execute on function public.asignar_numero_recibo(uuid) to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.ong_solicitudes from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on function public.solicitud_crear(text, text, text, text, text) from public'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant execute on function public.solicitud_crear(text, text, text, text, text) to anon, authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on function public.solicitud_estado(text) from public'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant execute on function public.solicitud_estado(text) to anon, authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on function public.solicitud_crear(text, text, text, text, text, boolean, text) from public'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant execute on function public.solicitud_crear(text, text, text, text, text, boolean, text) to anon, authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.v_saldo_ordenes     from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.v_saldo_proveedores from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant select on public.v_saldo_ordenes     to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant select on public.v_saldo_proveedores to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.pacientes_min from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant select on public.pacientes_min to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on function public.solicitud_crear(text, text, text, text, text, boolean, text) from public'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant execute on function public.solicitud_crear(text, text, text, text, text, boolean, text) to anon, authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on function public.solicitud_estado(text) from public'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant execute on function public.solicitud_estado(text) to anon, authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on function public.solicitud_pasar_mandato() from public, anon, authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on function public.solicitud_crear(text,text,text,text,text,boolean,text,jsonb) from public'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant execute on function public.solicitud_crear(text,text,text,text,text,boolean,text,jsonb) to anon, authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.lotes_stock from public'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant select on public.lotes_stock to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on function public.puede_ver_padron() from public'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant execute on function public.puede_ver_padron() to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.pacientes_segun_rol from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.dispensas_segun_rol from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant select on public.pacientes_segun_rol to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant select on public.dispensas_segun_rol to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.resumen_plantas from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant select on public.resumen_plantas to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.lotes_stock from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant select on public.lotes_stock to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.pacientes_segun_rol from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant select on public.pacientes_segun_rol to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.cupo_conteos from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant select on public.cupo_conteos to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.arqueos from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.planes_cultivo from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.ong_documentos_institucionales from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant select, insert, update, delete
  on public.ong_documentos_institucionales to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.pacientes_segun_rol from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.dispensas_segun_rol from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant select on public.pacientes_segun_rol to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant select on public.dispensas_segun_rol to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.dispensas_segun_rol from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant select on public.dispensas_segun_rol to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'revoke all on public.pacientes_segun_rol from anon'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;
do $g$ begin execute 'grant select on public.pacientes_segun_rol to authenticated'; exception when undefined_function or undefined_table or undefined_object then null; end $g$;

-- ═══ Storage: buckets y reglas ═══
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
-- Y el archivo del comprobante, que vive en el bucket y tiene su propia lista.
drop policy if exists documentos_escribir on storage.objects;
create policy documentos_escribir on storage.objects for insert with check (
  bucket_id = 'documentos'
  and public.mi_rol() = any (array['administrador','administrador_sistema',
    'director_medico','administrativo','mostrador']));
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

-- Permisos por rol: el administrativo ve lo clínico y el auditor lee el padrón.
--
-- Decisión de Gastón del 12/10/2026, después de comparar la pantalla con la base
-- y encontrar que no coincidían. Spec: openspec/specs/acceso/permisos-por-rol.
--
-- 1. ADMINISTRATIVO EN LO CLÍNICO. La pantalla ya le daba ver y editar la
--    historia clínica; la base le devolvía cero filas, así que se veía rota.
--    `puede_ver_clinico()` gobierna historia clínica, evolución, seguimiento
--    médico, las columnas de salud de la vista y el trigger que las protege:
--    sumarlo acá lo deja igual en todos esos lugares a la vez.
--
-- 2. AUDITOR EN EL PADRÓN, SOLO LECTURA Y SIN DATOS DE SALUD. Va por una función
--    nueva que se usa SOLO en el WHERE de la vista. No se toca:
--      - la policy de la tabla `pacientes`: abrírsela le daría la patología y el
--        médico por la API, que la vista anula;
--      - `puede_ver_padron()`: gobierna el alta y la edición, y el auditor no
--        modifica nada.

create or replace function public.puede_ver_clinico()
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select public.mi_rol() in ('administrador', 'administrador_sistema', 'director_medico', 'administrativo');
$$;

create or replace function public.puede_leer_padron()
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select public.puede_ver_padron() or public.mi_rol() = 'auditor';
$$;

revoke all on function public.puede_leer_padron() from public, anon;
grant execute on function public.puede_leer_padron() to authenticated;

-- La vista es SECURITY DEFINER A PROPÓSITO (pozo 7): filtra por rol adentro y
-- anula las columnas de salud. No tiene opciones `WITH (...)` que se puedan
-- perder. Se recrea con las MISMAS columnas, en el mismo orden; solo cambia el
-- WHERE, de `puede_ver_padron()` a `puede_leer_padron()`.
create or replace view public.pacientes_segun_rol as
 select id,
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
        case
            when puede_ver_clinico() then patologia
            else null::text
        end as patologia,
        case
            when puede_ver_clinico() then medico_tratante
            else null::text
        end as medico_tratante,
        case
            when puede_ver_clinico() then matricula_medico
            else null::text
        end as matricula_medico,
        case
            when puede_ver_clinico() then credencial_url
            else null::text
        end as credencial_url,
        case
            when puede_ver_plata() then aporte_acordado_g
            else null::numeric
        end as aporte_acordado_g,
        case
            when puede_ver_plata() then notas_economicas
            else null::text
        end as notas_economicas,
    codigo_vinculacion,
    retira_como_retribucion,
    apellido,
    nombres,
    apellido_confirmado
   from pacientes
  where puede_leer_padron();

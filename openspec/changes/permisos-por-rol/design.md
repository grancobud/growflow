# Design

## Context

La pantalla decide qué se ve con `PERMISOS_ROL` (`hooks/useAuth.ts`) y `PERMISO_DE_TAB` (`lib/pestanasOng.ts`). La base decide qué se devuelve con `puede_ver_clinico()`, `puede_ver_padron()` y la función de recursos, que usan las policies RLS, la vista `pacientes_segun_rol` (SECURITY DEFINER a propósito: anula las columnas de salud según el rol) y el trigger `preservar_lo_que_no_puede_ver`. La app lee el padrón **siempre por la vista**; la tabla `pacientes` solo se usa para escribir.

## Goals / Non-Goals

**Goals:** aplicar las dos decisiones de Gastón sin abrir datos de salud de más, y atar pantalla y base con una prueba.

**Non-Goals:** tocar `storage` (ya coincide) ni las policies de escritura del padrón.

## Decisions

**1. Administrativo: se suma a `puede_ver_clinico()`.** Es la única función que gobiernan historia clínica, evolución y seguimiento, y el trigger que protege las columnas de salud. Con eso la base pasa a decir lo mismo que la pantalla, que ya le daba `ver_clinico` y `editar_clinico`. Se descartó crear otra función solo para él: dejaría dos reglas clínicas que se pueden separar sin aviso.

**2. Auditor: función nueva `puede_leer_padron()` = `puede_ver_padron()` o auditor, usada solo en el `WHERE` de la vista.** No se toca la policy de la tabla: si se le abriera la tabla, por la API leería la patología y el médico, que la vista anula. Tampoco se toca `puede_ver_padron()`, porque gobierna el alta y la edición, y el auditor no modifica.

**3. Permiso de pantalla nuevo `ver_padron`** para las pestañas Pacientes y Nómina, que hoy cuelgan de `ver_clinico`. Lo tienen los cuatro roles clínicos más el auditor. Pacientes deja de depender de lo clínico porque mostrar nombres y mostrar diagnósticos son permisos distintos.

**4. Botones según lo que la base acepta:** alta y edición con `editar_clinico` (los mismos roles que escriben el padrón, salvo mostrador, que no llega a esta pantalla); borrar con `gestionar_usuarios`, que son exactamente los roles de `es_admin()`.

**5. Prueba de coincidencia leyendo las migraciones.** La prueba busca la **última** definición de cada función en `supabase/migrations/` y compara su lista de roles con `PERMISOS_ROL`. Es una prueba estática: no habla con la base, así corre en el CI sin claves. La verificación contra la base real se hace al aplicar la migración, prestándole cada rol a un perfil dentro de una transacción que se revierte (pozo 6 del CLAUDE.md).

## Risks / Trade-offs

- [El administrativo pasa a ver diagnósticos] → es la decisión pedida; queda escrita en la spec y en el comentario del rol.
- [`CREATE OR REPLACE VIEW` borra las opciones de la vista] → la vista no tiene opciones (es SECURITY DEFINER a propósito); se recrea con la misma lista de columnas y solo cambia el `WHERE`.
- [La prueba estática no ve cambios hechos a mano en la base] → la verificación con roles prestados se repite al aplicar.

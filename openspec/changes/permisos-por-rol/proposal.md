# Proposal

## Why

Los permisos de cada rol viven en dos lugares que se escribieron por separado: lo que **muestra la pantalla** (`PERMISOS_ROL`, `PERMISO_DE_TAB`) y lo que **deja leer la base** (las funciones `puede_ver_*()` y el RLS). Al compararlos el 12/10/2026 aparecieron dos contradicciones:

- **Administrativo:** la pantalla le da ver y editar lo clínico, pero la base le devuelve cero filas de historia clínica y de seguimiento médico. Se ve roto, no prohibido.
- **Auditor:** no tiene acceso al padrón ni en la pantalla ni en la base, aunque el rol está pensado para «ver todo lo que no es dato de salud».

Gastón decidió: **el administrativo ve la historia clínica** y **el auditor ve el padrón**.

## What Changes

- El administrativo pasa a ver y editar lo clínico **también en la base**.
- El auditor ve la pestaña Pacientes y la nómina, **en solo lectura y sin datos de salud** (sin patología, médico, matrícula ni credencial), también por la API.
- En Pacientes, los botones de alta y edición solo aparecen a quien puede editar el padrón, y el de borrar solo a los administradores, que es lo que ya exige la base.
- Pruebas que comparan la pantalla con la base: si una regla cambia en un lado y no en el otro, el CI falla.

**Fuera del alcance:**
- Las instalaciones hermanas (Aguara, Chaco): tienen su propia base y se portan aparte.
- Rediseñar los roles o sumar roles nuevos.
- Los permisos de archivos (`storage`): ya coinciden con esta decisión.

## Capabilities

### New Capabilities
- `acceso/permisos-por-rol`: qué ve y qué puede modificar cada rol (historia clínica, padrón, recursos), y la obligación de que la pantalla y la base digan lo mismo.

### Modified Capabilities

## Impact

- Base: migración que suma `administrativo` a `puede_ver_clinico()`, crea `puede_leer_padron()` (padrón + auditor) y la usa en la vista `pacientes_segun_rol`. La tabla `pacientes` **no** se le abre al auditor.
- Front: permiso nuevo `ver_padron` para las pestañas Pacientes y Nómina; `PaginaPacientes` oculta lo que el rol no puede hacer.
- Tests nuevos en `app/src/lib/__tests__/permisosPorRol.test.ts`.

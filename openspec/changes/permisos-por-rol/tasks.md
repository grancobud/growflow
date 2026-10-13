# Tasks

## 1. Prueba de coincidencia pantalla ↔ base

- [x] 1.1 Escribir `app/src/lib/__tests__/permisosPorRol.test.ts`: la matriz de la spec contra `PERMISOS_ROL` y `PERMISO_DE_TAB`, y la última definición de `puede_ver_clinico()` y `puede_leer_padron()` en las migraciones contra los roles de la pantalla. Verificar que falla: `npm --prefix app test -- permisosPorRol`.

## 2. Base

- [x] 2.1 Migración `supabase/migrations/20261012230000_permisos_administrativo_y_auditor.sql`: administrativo en `puede_ver_clinico()`, función `puede_leer_padron()` y vista `pacientes_segun_rol` con ese `WHERE`. Verificar: la parte de base de la prueba 1.1 pasa.

## 3. Pantalla

- [x] 3.1 Permiso `ver_padron` en `PERMISOS_ROL` y en las pestañas Pacientes y Nómina; actualizar los comentarios de administrativo y auditor. Verificar: la prueba 1.1 pasa entera y las pruebas de pestañas existentes siguen verdes.
- [x] 3.2 `PaginaPacientes`: alta y edición solo con `editar_clinico`, borrar solo con `gestionar_usuarios`. Verificar: `npm --prefix app run lint` sin warnings.

## 4. Verificación

- [x] 4.1 Correr test, lint y build y mostrar el resultado.
- [x] 4.2 Aplicar la migración en Supabase y verificar con roles prestados (transacción revertida): administrativo lee historia clínica, auditor lee la vista sin columnas de salud y cero filas de la tabla, cultivador cero, sin perfil cero.

## Workflow follow-up

- Después de mergear: `openspec archive permisos-por-rol`.
- Portar a Aguara y Chaco si Gastón lo pide (bases separadas).

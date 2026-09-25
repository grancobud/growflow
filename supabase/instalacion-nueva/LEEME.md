# Instalación nueva de GrowFlow

`esquema-completo.sql` arma la base entera desde cero: tablas, vistas, funciones,
RLS y buckets de Storage. Se pega en el SQL Editor de un proyecto de Supabase
**vacío** y se corre una vez. El paso a paso completo está en `ARRANQUE.md`.

Se generó el 24/09/2026 a partir del esquema real de la instalación de Gastón más
la migración `20260924200000_integrar_mejoras_de_aguara_y_panacea.sql`, y se
verificó cargándolo sobre una base vacía (PGlite): el resultado es idéntico.

Si cambia el esquema de la base de Gastón, este archivo hay que regenerarlo; no se
actualiza solo.

**25/09/2026:** se sacaron las siete tablas de respaldo de julio y agosto
(`_backup_*_20260725`, `pacientes_respaldo_20260825`, `respaldo_*_fantasma_20260826`)
y las policies de `pacientes_clinica` / `evolucion_clinica` pasaron a
`TO authenticated`, igual que en la base real (migraciones `20260925010000` y
`20260925020000`). Verificado cargándolo en PGlite.
Ese mismo día se sumó `perfiles_usuario.email` y `crear_perfil_al_alta()` la
completa al dar de alta una cuenta (migración `20260925030000`): la pantalla de
Usuarios y `usuarios-invitar` la usaban y la base no la tenía.
Y los índices de las 30 claves foráneas que no tenían uno (migración
`20260925040000`), al final del archivo.

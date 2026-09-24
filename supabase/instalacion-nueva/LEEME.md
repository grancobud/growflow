# Instalación nueva de GrowFlow

`esquema-completo.sql` arma la base entera desde cero: tablas, vistas, funciones,
RLS y buckets de Storage. Se pega en el SQL Editor de un proyecto de Supabase
**vacío** y se corre una vez. El paso a paso completo está en `ARRANQUE.md`.

Se generó el 24/09/2026 a partir del esquema real de la instalación de Gastón más
la migración `20260924200000_integrar_mejoras_de_aguara_y_panacea.sql`, y se
verificó cargándolo sobre una base vacía (PGlite): el resultado es idéntico.

Si cambia el esquema de la base de Gastón, este archivo hay que regenerarlo; no se
actualiza solo.

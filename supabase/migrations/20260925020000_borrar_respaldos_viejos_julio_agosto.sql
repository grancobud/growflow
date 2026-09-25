-- Respaldos puntuales de julio y agosto 2026, borrados a pedido del dueno de la
-- base el 25/09/2026. Antes de borrar se verifico que ninguna vista ni FK
-- dependiera de ellos y que el codigo no los usara. Nadie los podia leer desde
-- la app (RLS sin policies o solo admin).
--
-- Se conserva el esquema respaldo_20260924, el respaldo previo a la integracion
-- de Aguara/Chaco/Panacea.
drop table if exists public._backup_instalaciones_20260725;
drop table if exists public._backup_ofertas_20260725;
drop table if exists public.pacientes_respaldo_20260825;
drop table if exists public.respaldo_aplicaciones_fantasma_20260826;
drop table if exists public.respaldo_eventos_fantasma_20260826;
drop table if exists public.respaldo_plantas_fantasma_20260826;
drop table if exists public.respaldo_riegos_fantasma_20260826;

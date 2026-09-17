-- Las fechas por defecto salian en UTC: despues de las 21 h de Argentina, «hoy»
-- ya era mañana.
--
-- `current_date` usa la zona de la sesion, y el servidor de Supabase esta en UTC.
-- Portado de Aguara (misma fecha), donde tres entregas cargadas a las 22 h del
-- 08/09/2026 quedaron con fecha 09/09. El front se arreglo en `lib/fechaLocal.ts`.
--
-- Se fija la zona en la expresion y no en la base (`alter database set timezone`)
-- a proposito: eso moveria tambien como se muestran todos los timestamptz.
--
-- Esta base no tiene `ong_visitas` ni `solicitud_pasar_mandato` (son de Aguara),
-- y si tiene `evolucion_clinica`.

alter table public.aplicaciones      alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.cosechas          alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.eventos           alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.evolucion_clinica alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.jornadas          alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.mantenimientos    alter column fecha_realizado   set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.ong_caja          alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.ong_dispensas     alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.ong_documentos    alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.ong_lotes         alter column fecha_elaboracion set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.ong_traslados     alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.pacientes         alter column fecha_alta        set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.recordatorios     alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.riegos            alter column fecha             set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;

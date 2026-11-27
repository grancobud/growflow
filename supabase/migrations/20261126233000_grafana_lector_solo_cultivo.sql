-- Grafana local de Gastón (26/11/2026): lectura de datos de CULTIVO, nunca de pacientes.
-- Esquema propio "grafana" con vistas sin datos personales (sin paciente_id, nombres, DNI, socios,
-- dispensas, caja). El rol grafana_lector solo ve este esquema.
-- La clave se setea aparte y NO va en el repo (vive en Infisical /grafana):
--   alter role grafana_lector login password 'SCRAM-SHA-256$...';
-- Las vistas corren con los permisos del dueño (postgres) y no pasan por el RLS de las tablas
-- (pozo 7 del CLAUDE.md): por eso solo exponen columnas de cultivo, y el esquema "grafana" queda
-- cerrado para anon/authenticated y fuera de la API de Supabase.

create schema if not exists grafana;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'grafana_lector') then
    create role grafana_lector nologin noinherit nocreatedb nocreaterole connection limit 5;
  end if;
end $$;
alter role grafana_lector set default_transaction_read_only = on;
alter role grafana_lector set statement_timeout = '15s';
alter role grafana_lector set search_path = grafana;

create or replace view grafana.plantas as
select p.codigo, p.apodo, p.fase, p.subfase, p.activa, p.fecha_germinacion, p.fecha_cosecha,
       p.ubicacion, p.sustrato, p.maceta, g.nombre as genetica, l.nombre as lote, p.creado_en
from public.plantas p
left join public.geneticas g on g.id = p.genetica_id
left join public.cultivo_grupos cg on cg.id = p.grupo_id
left join public.cultivo_lotes l on l.id = cg.lote_id;

create or replace view grafana.riegos as
select r.fecha, r.creado_en, r.volumen_ml, r.ph, r.ec, r.ppm, r.escurrio, r.escurrido_ml,
       r.escurrido_ph, r.escurrido_ec, r.escurrido_ppm, p.codigo as planta, g.nombre as genetica,
       l.nombre as lote
from public.riegos r
left join public.plantas p on p.id = r.planta_id
left join public.geneticas g on g.id = p.genetica_id
left join public.cultivo_lotes l on l.id = r.lote_id;

create or replace view grafana.eventos as
select e.fecha, e.creado_en, e.tipo, p.codigo as planta, g.nombre as genetica
from public.eventos e
left join public.plantas p on p.id = e.planta_id
left join public.geneticas g on g.id = p.genetica_id;

create or replace view grafana.aplicaciones as
select a.fecha, a.categoria, a.producto, a.dosis, a.metodo, p.codigo as planta
from public.aplicaciones a
left join public.plantas p on p.id = a.planta_id;

create or replace view grafana.cosechas as
select c.fecha, c.peso_humedo_g, c.peso_seco_g, c.valoracion, p.codigo as planta, g.nombre as genetica
from public.cosechas c
left join public.plantas p on p.id = c.planta_id
left join public.geneticas g on g.id = p.genetica_id;

create or replace view grafana.geneticas as
select nombre, banco, tipo, thc_estimado, cbd_estimado, tiempo_vege_dias, tiempo_flora_dias
from public.geneticas;

create or replace view grafana.insumos as
select nombre, categoria, marca, cantidad, unidad, stock_minimo,
       (stock_minimo is not null and cantidad < stock_minimo) as bajo_minimo
from public.insumos;

create or replace view grafana.ambiente as
select s.nombre as sala, s.etapa, l.medido_en, l.temp_c, l.humedad_pct
from public.ambiente_lecturas l
join public.ambiente_salas s on s.id = l.sala_id;

revoke all on schema grafana from public, anon, authenticated;
revoke all on all tables in schema grafana from public, anon, authenticated;
grant usage on schema grafana to grafana_lector;
grant select on all tables in schema grafana to grafana_lector;

-- Indices para las 30 claves foraneas que no tenian uno (advisor de
-- rendimiento de Supabase, «unindexed foreign keys»). Aplicada en la base de
-- GrowFlow el 25/09/2026.
--
-- Solo agrega. Con el volumen de hoy no cambia nada que se note; sirve cuando
-- las tablas crezcan: sin indice, cada join por esa columna y cada borrado en la
-- tabla referenciada recorre la tabla entera.
create index if not exists idx_arqueos_contado_por on public.arqueos (contado_por);
create index if not exists idx_cultivo_lotes_area_id on public.cultivo_lotes (area_id);
create index if not exists idx_cultivo_lotes_genetica_id on public.cultivo_lotes (genetica_id);
create index if not exists idx_ong_actas_libro_id on public.ong_actas (libro_id);
create index if not exists idx_ong_asociados_acta_alta_id on public.ong_asociados (acta_alta_id);
create index if not exists idx_ong_asociados_acta_baja_id on public.ong_asociados (acta_baja_id);
create index if not exists idx_ong_asociados_paciente_id on public.ong_asociados (paciente_id);
create index if not exists idx_ong_caja_cuota_id on public.ong_caja (cuota_id);
create index if not exists idx_ong_caja_dispensa_id on public.ong_caja (dispensa_id);
create index if not exists idx_ong_caja_documento_id on public.ong_caja (documento_id);
create index if not exists idx_ong_caja_pago_id on public.ong_caja (pago_id);
create index if not exists idx_ong_cuotas_acta_id on public.ong_cuotas (acta_id);
create index if not exists idx_ong_dispensas_genetica_id on public.ong_dispensas (genetica_id);
create index if not exists idx_ong_dispensas_visita_id on public.ong_dispensas (visita_id);
create index if not exists idx_ong_documentos_asociado_id on public.ong_documentos (asociado_id);
create index if not exists idx_ong_documentos_dispensa_id on public.ong_documentos (dispensa_id);
create index if not exists idx_ong_documentos_paciente_id on public.ong_documentos (paciente_id);
create index if not exists idx_ong_documentos_institucionales_user_id on public.ong_documentos_institucionales (user_id);
create index if not exists idx_ong_lotes_cosecha_id on public.ong_lotes (cosecha_id);
create index if not exists idx_ong_lotes_genetica_id on public.ong_lotes (genetica_id);
create index if not exists idx_ong_pedidos_asociado_id on public.ong_pedidos (asociado_id);
create index if not exists idx_ong_pedidos_dispensa_id on public.ong_pedidos (dispensa_id);
create index if not exists idx_ong_pedidos_paciente_id on public.ong_pedidos (paciente_id);
create index if not exists idx_ong_solicitudes_asociado_id on public.ong_solicitudes (asociado_id);
create index if not exists idx_ong_solicitudes_paciente_id on public.ong_solicitudes (paciente_id);
create index if not exists idx_ong_solicitudes_revisada_por on public.ong_solicitudes (revisada_por);
create index if not exists idx_ong_traslados_paciente_id on public.ong_traslados (paciente_id);
create index if not exists idx_ong_visitas_paciente_id on public.ong_visitas (paciente_id);
create index if not exists idx_ong_visitas_user_id on public.ong_visitas (user_id);
create index if not exists idx_planes_cultivo_creado_por on public.planes_cultivo (creado_por);

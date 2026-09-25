-- Las 8 policies de la historia clinica estaban para el rol public (incluye
-- anon), en vez de authenticated, que es la norma del proyecto.
--
-- No exponia nada: la condicion de cada una (puede_ver_clinico(), es_admin())
-- ya le niega todo a quien no tiene sesion. Es endurecer, no tapar un agujero.
-- ALTER POLICY cambia solo el rol: la condicion queda igual y no hay un instante
-- sin policy. Aplicada en la base de GrowFlow el 25/09/2026.
alter policy clinica_ver          on public.pacientes_clinica to authenticated;
alter policy clinica_escribir     on public.pacientes_clinica to authenticated;
alter policy clinica_actualizar   on public.pacientes_clinica to authenticated;
alter policy clinica_borrar       on public.pacientes_clinica to authenticated;
alter policy evolucion_ver        on public.evolucion_clinica to authenticated;
alter policy evolucion_escribir   on public.evolucion_clinica to authenticated;
alter policy evolucion_actualizar on public.evolucion_clinica to authenticated;
alter policy evolucion_borrar     on public.evolucion_clinica to authenticated;

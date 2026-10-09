-- En proveedores_instalacion se mezclaban proveedores reales con los socios que
-- compraron o pusieron la plata (Joa, Lao, "Sala"...). Se agrega el tipo para
-- separarlos sin borrar nada: los ítems y ofertas siguen apuntando al mismo id.
-- Solo aditiva. Solo esta instalación: el código de Aguara/Chaco no lo usa.

alter table public.proveedores_instalacion
  add column if not exists tipo text not null default 'proveedor'
  check (tipo in ('proveedor', 'socio'));

-- Clasificación confirmada por Gastón el 09/10/2026: proveedores reales son
-- Aquahome, Easy, Extractores Buenos Aires, Netafim, MercadoLibre y Emilio
-- (electricista). El resto son socios.
update public.proveedores_instalacion
   set tipo = 'socio'
 where lower(trim(nombre)) in (
   'gaston', 'joa', 'lao', 'juani', 'juan ignacio', 'jeronimo',
   'joaquín medina', 'presto joa', 'sala', 'araña/sala', 'joa/sala'
 );

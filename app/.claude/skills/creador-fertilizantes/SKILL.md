---
name: creador-fertilizantes
description: Configurar/extender el Creador de Fertilizantes de growflow (calculadora tipo HydroBuddy en /nutrientes). Usar al agregar sales, productos comerciales, precios, kits, presets, ajustar el solver o clonar marcas. Incluye la química, la arquitectura, las tablas Supabase y el knowledge de cómo formula cada marca.
---

# Creador de Fertilizantes (growflow) — guía de configuración

Calculadora tipo HydroBuddy en español, en growflow. Ruta `/nutrientes` → sidebar "Calculadora Fertilizantes". Online en https://growflow-5vs.pages.dev (Cloudflare Pages, auto-deploy desde `main` de github.com/grancobud/growflow). Supabase real: proyecto `rtnidtpalynprizpbnuz` (NO es modo demo; usa auto-login demo:demo a cuenta real).

## Archivos
- `app/src/lib/nutrientes.ts` — MOTOR: tipos, base de sales `SALES_DEFECTO`, presets, `KITS_SALES`, solver NNLS, `kitParaPerfil()`, conversión óxidos, pH, concentrados, ratios, costos, persistencia (services), `categoriaSal()`, `esComercial/marcaDe`, `recomendarEstabilizantes`.
- `app/src/components/nutrientes/CreadorNutrientes.tsx` — UI, 9 sub-pestañas (Calculadora, Clonar marca, Sustancias, Agua, Concentrados A/B, Estabilizantes, pH, Comparar, Ratios y costo).
- `app/src/pages/PaginaCreadorNutrientes.tsx` — página. Ruteada en `App.tsx` (`/nutrientes`), ítem en `Sidebar.tsx`.
- Migraciones: `supabase/migrations/20260629000001..3_*.sql`.

## Modelo químico (clave)
16 nutrientes, igual HydroBuddy: `NO3, NH4, P, K, Mg, Ca, S, Fe, Zn, B, Cu, Mo, Mn, Na, Si, Cl`. N total = NO3+NH4 (`nTotal()`).
Composición de cada sal = fracción elemental (0-1), W/W. ppm = fracción × g/L × 1000.
Óxido→elemental (`OXIDOS`/`oxidoAElemental`): P₂O₅×0.4364, K₂O×0.8301, CaO×0.7147, MgO×0.6030, SO₃×0.4005, Na₂O×0.7419.
Bidones: A=calcio, B=base/sulfatos/fosfatos, C=micros. Regla: Ca NO va con sulfato/fosfato en concentrado (precipita). `compatibilidad(sal)` lo deriva solo.

## Cómo agregar una SAL/insumo (en lib SALES_DEFECTO)
```ts
{ id: 'unico', nombre: '...', formula: '...', bidon: 'A'|'B'|'C',
  comp: { Ca: 0.19, NO3: 0.144 },   // fracciones; {} si es aditivo sin nutrientes
  liquido?: true, densidad?: 1.1,    // si concentrado líquido
  aditivo?: true,                    // estabilizante/hormona: el solver lo IGNORA (comp {})
  descripcion: 'qué es / para qué / con qué va' }
```

## Cómo agregar un PRODUCTO COMERCIAL (para clonar)
Mismo formato, id con prefijo de marca: `ryano_`, `an_sensi_`, `athena_`, `jacks_`, `canna_`, `plagron_` (así `esComercial()` los detecta y `categoriaSal()` los agrupa por marca). Convertir la etiqueta (óxidos) a fracción elemental. OJO: en casi todas las marcas la "parte B/Core/Calcis" es el CALCIO (nitrato de Ca), no solo N.

## Cómo cargar/actualizar un PRECIO (Supabase, NO es código)
Tabla `inventario_nutrientes` (sal_id text PK, costo_kg, stock, unidad, nota). Upsert vía supabase MCP, project_id `rtnidtpalynprizpbnuz`:
```sql
insert into inventario_nutrientes (sal_id, costo_kg, unidad, nota)
values ('epsom', 2123.08, 'kg', 'Epsom 25kg ...')
on conflict (sal_id) do update set costo_kg=excluded.costo_kg, nota=excluded.nota, actualizado_en=now();
```
`aplicarInventario()` mergea el precio sobre la sal en runtime (badge $/kg en la ficha).
REGLA DE GASTÓN: NO pisar marcas. Cada marca/fuente de la misma materia prima = sustancia ALTERNATIVA propia (tabla `sustancias_nutrientes`, con su comp + costo_kg), no overwrite. Ej: nitrato de Ca Yara (default cano3_ag) vs Manuchar+B vs cristales = 3 entradas.
Precios actuales y proveedores: ver memoria `reference_precios_sales_fertirriego_ar`. ML NO se puede scrapear (403/JS) → Gastón pasa CAPTURA y se lee el precio de la imagen.

## Solver y CALIDAD (lo importante para "que no confunda")
- Solver: `calcularReceta(perfil, salesDisp, agua)` → NNLS multiplicativo, minimiza ||Ax-b||² con x>=0.
- PROBLEMA conocido: si hay muchas sales activas equivalentes, el solver reparte (8 calcios) y abusa sales multi-elemento (usa sulfato de Mn/Zn para conseguir S → arrastra Mn/Zn; Epsom para S → arrastra Mg).
- SOLUCIÓN: `kitParaPerfil(perfil)` elige 1 fuente LIMPIA por nutriente y SOLO los micros que se piden. Se aplica auto al elegir preset y al clonar. Esto es lo que da recetas de calidad pro. Si agregás features, mantené este principio: pocas sales, una por rol, micros solo si están en el objetivo.
- `KITS_SALES`: kits manuales (limpio/económico/finish). El finish NO debe incluir sulfatos de micros ni Epsom (arrastran Mn/Zn/Mg); el S sale de K₂SO₄+yeso.
- Rangos `RANGOS_FLORA_COCO` son referencia de FLORA → solo se muestran en veg/flora (en finish se limpian para no confundir).

## Lógica de N/K en kitParaPerfil (afinada con tests reales)
- N amoniacal: si has('NO3')→nh4no3 (NH4+NO3 limpio); elif has('S')→amsulf; elif has('P')→map; else amsulf. (Casos: AN Grow A alto NH4 bajo S→nh4no3; Maikro NH4+S→amsulf.)
- Potasio: kno3 SOLO si has('NO3') (no contaminar perfiles amoniacales como Makro); k2so4 si has('S'); khco3 SIEMPRE como K puro de respaldo (perfiles K alto como AN Bloom A que no llegan con kno3/k2so4/mkp).
- Solver: toFixed(6) en gramosPorL y umbral nnls 1e-6 (micros traza como Mo, antes daban doble por redondeo a 4 dec).
- DOSIS_REC: dosis recomendada por producto, autocompleta al clonar (Ryanodine 4ml/L, Athena 0.9g/L, AN 1g/L, etc).
- Input de litros en la receta (gramosPorL × litros = total a pesar).
- LÍMITE de química conocido: NO3 alto con Ca/K/NH4 limitados no se alcanza 100% (no existe nitrato puro salvo ácido nítrico); el solver da el óptimo (~80-92%). Es correcto, no bug.

## Clon fiel por marca (opcionesDeMarca)
`kitParaPerfil(perfil, opts)` acepta `{feChelate, microsQuelatados}`. `opcionesDeMarca(salId)` por prefijo: Athena→Fe-DTPA+micros EDTA; AN/Ryanodine→Fe-EDDHA+micros EDTA; Jacks/Canna/Plagron→sulfatos+EDDHA. La Clonar pasa el id del producto → usa el hierro/micros exactos de esa marca. Las 6 sales base son iguales en todas (cano3+mkp+kno3+k2so4+epsom+micros); la diferencia real es el quelato de hierro y si micros son EDTA vs sulfato. NH4+P → MAP cubre el amoniacal. Si→ksilic. Cl/Na no se sourcean (intencional, clon más limpio).

## Cómo formula cada marca (para clonar fiel)
- **Athena Pro Line**: Core (14-0-0, nitrato de Ca + micros EDTA, bidón A, SIEMPRE) + Grow (2-8-20) o Bloom (0-12-24) (MKP+K₂SO₄+Epsom+Fe-DTPA, bidón B). Fade = finish de Ca (CaCl₂+micros, sin N, mete Cl). Balance=silicato K. Cleanse=HOCl (sanitizante).
- **Advanced Nutrients Sensi Pro** (polvo, discontinuado): A=base PK+micros (3 Fe quelatos)+urea; B=el CALCIO (nitrato Ca-amónico). Grow 9-10-28/15-0-0, Bloom ~3-16-30/17-0-6. Micros estimados.
- **Ryanodine**: Calcis(C)=nitrato Ca+N nítrico (bidón A); Makro(A)=N amoniacal+P+K+S; Mikro(B)=Mg+micros; Maikro(AB)=A+B fusionado; Finis=0-15-25 polvo (PK+Ca+S, sin N). Radics=enraizante IBA (no nutriente).
- **Jacks 321**: A 5-12-26 (compuesta) + nitrato de Ca + Epsom (3 sales).
- **Plagron**: Terra (3-1-3/2-2-4), Coco/Hydro A+B, Alga orgánico, Green Sensation 0-8-9, boosters (Sugar Royal/Power Roots/Pure Zym = aditivos).
- Patrón general para clonar: nitrato de Ca (A) + MKP + nitrato/sulfato K + Epsom (B) + micros (C). `kitParaPerfil` ya lo hace.

## Estabilizantes (para concentrados que no decanten)
`recomendarEstabilizantes(dosis, volumenL)` + `ADITIVOS_ESTAB`. Clave: separar A/B, pH ~5, exceso de quelante; benzoato de Na 150-250 mg/L (conservante); ác. cítrico (buffer+quelante+antiox); goma xántica (anti-sedimentante). Detalle en memoria `reference_estabilizantes_fertilizantes_liquidos`.

## Flujo de cambios
1. Editar lib/componente. 2. `cd app && npx tsc -b --pretty false && npx eslint <archivos> && npm run build` (todo en verde; NO tocar el `Fila=Record<string,any>` preexistente de demoStore). 3. Commit + push a main (auto-deploy Cloudflare ~50s). 4. Precios = SQL directo (no requiere deploy, runtime). 5. Verificar deploy con cloudflare-admin MCP si hace falta.

## Memorias relacionadas
`project_growflow_creador_nutrientes`, `reference_precios_sales_fertirriego_ar`, `reference_hidroponia_sales_calcio`, `reference_estabilizantes_fertilizantes_liquidos`.

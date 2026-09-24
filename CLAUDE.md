# GrowFlow

Trazabilidad de cultivo de cannabis medicinal (Ley 27.350) y gestión de la
asociación civil que lo ampara: cultivo, cosecha, ambiente en vivo (Growcast),
calendario, calculadora de fertilizantes, instalación (hardware, riego, tablero),
econometría, O.N.G., estadísticas y manual.

Es la instalación de Gastón. Reúne lo propio de GrowFlow con todas las mejoras
hechas en las instalaciones hermanas (Aguara, Chaco, Panacea) hasta el 24/09/2026.

## Coordenadas de esta instalación

| | |
|---|---|
| Sitio | `https://growflow-5vs.pages.dev` (Cloudflare Pages, proyecto `growflow`) |
| Repo | `grancobud/growflow` (privado), branch `main` |
| Supabase | project id `rtnidtpalynprizpbnuz` (sa-east-1) |
| URL de la base | `https://rtnidtpalynprizpbnuz.supabase.co` |
| Sensores | Worker `growcast-bridge` → `VITE_GROWCAST_WEBHOOK_URL` |
| MCP de consulta | `growflow` (tools `gf_*`, solo lectura) |

**Las claves de Supabase NO van en el repo.** Viven como variables de entorno del
proyecto de Cloudflare Pages (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), en
production y en preview.

**Lo propio de GrowFlow que NO tienen las instalaciones hermanas** —y que al
portar algo de ellas no se puede perder—: los menús Cultivo, Cosecha y Ambiente
separados, Calendario, Calculadora de Fertilizantes (`/nutrientes`), Instalación
(`/hardware-diy`, `/riego`, `/tablero`, `/insumos-faltantes`), la pestaña «En
vivo» de Ambiente (Growcast), la historia clínica del paciente y sus tablas
(`perfiles_nutrientes`, `sustancias_nutrientes`, `inventario_nutrientes`,
`proveedores_nutrientes`, `insumos_faltantes`, `tableros`, `tableros_circuitos`,
`pacientes_clinica`, `evolucion_clinica`). La migración
`20260919130000_sacar_tablas_de_modulos_ausentes` de Panacea **no se aplica acá
nunca**: borraba esas tablas.

## Stack

React 19 + Vite + TypeScript + Tailwind 4, Supabase (Postgres + RLS), deploy en
Cloudflare Pages (`root_dir: app`, `npm run build`, salida `dist`), auto-deploy
al pushear a `main`.

```bash
npm --prefix app install     # una vez
npm --prefix app run dev     # desarrollo (puerto 5199)
npm --prefix app test        # 1000 tests, ~8 s
npm --prefix app run lint    # linea base: 0 errores + 58 warnings
npm --prefix app run build
```

## Idioma y estilo

Español rioplatense, términos técnicos en inglés. Conciso y directo.
**Nunca declarar algo listo sin haber corrido el build o los tests y mostrado el
resultado.**

---

# LOS POZOS QUE MÁS CUESTAN

Cada punto de acá abajo costó una sesión entera de debugging en alguna de las
instalaciones hermanas. Leerlos antes de tocar código.

## 1. El dev local corre en modo DEMO, contra `localStorage`, no contra Supabase

Es el más caro de todos. Una tabla nueva hay que registrarla en **tres** lugares:

1. La migración, en `supabase/migrations/`.
2. `TABLAS_CONOCIDAS` en `app/src/lib/demo/demoStore.ts`.
3. `TABLAS` en `app/src/pages/PaginaTablas.tsx`.

**Si falta la segunda, el insert se pierde en silencio y la pantalla muestra el
toast de éxito igual.** El toast NO prueba que se haya guardado nada.

Si además tocás `sembrar()`, subí `VERSION_SEED` o el seed viejo queda pegado en
el navegador. Y ojo: **subir la versión no borra lo que ya estaba**. Por eso
`sembrar()` ahora vacía todas las tablas antes de escribir — sin eso, quien
tenía datos viejos los sigue viendo y parece que el cambio no se aplicó.

**Esta instalación arranca VACÍA.** El seed de ejemplo que traía el código de
origen (pacientes, lotes, caja, riegos) se sacó entero: mostraba nombres y
números inventados que se confunden fácil con datos reales. Lo único que se
escribe es el perfil del usuario del modo demo, que no es un dato de la
asociación sino lo que le da rol de administrador a la sesión que el dev local
auto-loguea. Sin él, `mi_rol()` devuelve `sin_perfil` y no se entra a ninguna
pantalla.

Consecuencia medida: en la revisión de diseño, **7 de 126 chequeos quedan
saltados** —con el motivo escrito— porque son formularios que solo se abren
desde una fila que todavía no existe. No se borraron de la lista: el día que la
instalación tenga datos, vuelven a medirse solos.

## 2. En los `insert`, las banderas van EXPLÍCITAS

`activa: true`, `activo: true` — nunca dejarlas al default de la columna. El
default lo pone Postgres, y el dev local no habla con Postgres: la fila se
guarda, la pantalla la filtra por `activa = true` y no aparece nunca. Alta con
toast de éxito y pantalla vacía. Ya pasó tres veces (áreas de cultivo, salas de
ambiente, plan de cultivo).

## 3. Las fechas de "hoy" van en hora de Argentina

**Nunca `new Date().toISOString().slice(0, 10)`.** Es UTC: desde las 21 h ya es
mañana. Usar `hoyLocal()` y `fechaLocal(d)` de `app/src/lib/fechaLocal.ts`.
`toISOString()` entero sigue siendo correcto para un TIMESTAMP.

En la base, igual: `current_date` es UTC porque el servidor está en UTC. Los
defaults usan `(now() at time zone 'America/Argentina/Buenos_Aires')::date`.

Un test que arme fechas relativas también tiene que usar `fechaLocal`, o falla
solo de noche.

## 4. Un valor nuevo en una columna de texto TUMBA la pantalla

Si el front indexa un `Record` con un valor que vino de la base y no está en el
mapa, devuelve `undefined`, y leerle `.text` tira toda la pestaña al
ErrorBoundary. Pasó en producción, con 211 personas afectadas.

**Todo `Record` indexado por un valor de la base va detrás de un accesor con
`??`**: `colorFase(f)`, `iconoCal(t)`, `colorDe(e)`, `sufijoUnidad(u)`. Nunca el
`[...]` directo. El tipo de TypeScript da una falsa sensación de exhaustividad:
la base se migra por SQL y por Edge Functions, y ninguna de las dos pasa por
TypeScript.

Al revés también: al sumar un valor a un `check` de la base, buscar en el front
cada `Record` indexado por esa columna.

## 5. Para confirmar un deploy, el marcador tiene que ser una cadena NUEVA

Buscar una que ya existía da un falso positivo y se da por deployado algo que no
subió. Las tres reglas:

1. **Cadena completa, nunca un prefijo.**
2. **Chequearla contra TODO `app/src`**, no solo el archivo editado — incluido
   `app/src/contenido/manual.md`, que es texto largo en español y tiene chances
   de contener cualquier frase natural.
3. **String literal, no identificador**: el minificador renombra los
   identificadores; el texto que ve el usuario sobrevive.

```bash
git grep -c "<marcador>" <commit-anterior> -- app/src   # tiene que dar 0
```

Y **el marcador puede vivir en un chunk lazy**, no en el index: buscar solo en el
index da cero y parece que no deployó. Un build de Pages tarda ~90 s, así que si
el loop de espera corta en el primer intento, es un falso positivo.

## 6. RLS: el filtro de rol correcto

Es `mi_rol() <> all (array['sin_perfil','demo'])`, **nunca `<> 'demo'` solo**.
`mi_rol()` devuelve `'sin_perfil'` para todo usuario sin perfil o con perfil
inactivo, y como el registro de Supabase es abierto, `<> 'demo'` deja entrar a
cualquiera que se cree una cuenta.

Después de tocar RLS, verificar que no queden policies permisivas:

```sql
select tablename, policyname, qual from pg_policies
 where schemaname='public' and qual = 'true';   -- tiene que dar 0 filas
```

**El service role saltea RLS**: contar filas con él no prueba nada. Para probar
permisos de verdad, prestarle el rol a un perfil existente dentro de una
transacción que se revierte.

## 7. Las vistas no son como las tablas

Una tabla sin policies no la lee nadie; **una vista la lee `anon` por defecto y
se saltea el RLS** de las tablas de abajo. Toda vista sobre datos con RLS
necesita:

```sql
alter view public.v_x set (security_invoker = on);
revoke all on public.v_x from anon;
grant select on public.v_x to authenticated;
```

Y **`CREATE OR REPLACE VIEW` sin la cláusula `WITH (...)` BORRA esas opciones**,
sin avisar: alcanza con tocar el SELECT de una vista para reabrirla. La opción va
pegada al `CREATE`, nunca en un `alter view` suelto.

Excepción: hay vistas que son `SECURITY DEFINER` **a propósito**, porque filtran
por rol adentro y existen para que un rol vea el nombre sin la ficha clínica.
Ponerles `security_invoker` las deja devolviendo cero filas.

## 8. Un rol nuevo vive en CUATRO lugares

1. `PERMISOS_ROL` + `ROLES_ASIGNABLES` en `hooks/useAuth.ts` — lo que se dibuja.
2. Las funciones `puede_ver_*()` **y las policies RLS** — lo que la base deja.
3. El CHECK `perfiles_usuario_rol_check` — lo que se puede guardar.
4. `ROLES` en la Edge Function `usuarios-invitar` — lo que se puede invitar.

Los cuatro se olvidaron alguna vez, y siempre el que no se ejercita. Ojo además
con las policies que tienen la lista de roles **escrita a mano** en vez de llamar
a `puede_ver_*()`: un rol nuevo no hereda nada ahí, no falla ningún test y no
avisa.

```sql
select tablename, policyname, cmd, coalesce(qual, with_check)
  from pg_policies where schemaname = 'public'
   and coalesce(qual, with_check) like '%ARRAY%';
```

Y las **acciones** también tienen permiso, en `lib/accionesOng.ts`. Una acción
ofrecida sin respaldo en la base es un botón que no hace nada.

## 9. Un formulario que no abre NO falla: no pasa nada

Sin error de consola y sin build roto, así que se parece a "no entendí cómo se
usa" y nadie lo reporta.

- El valor de `?nueva=` tiene que ser **igual a la clave** que la pantalla le
  pasa a `useAbrirAlLlegar`, y **no siempre es `1`**.
- Si la pantalla tiene solapas, la ruta dice cuál (`?vista=catalogo`).
- **El mismo destino está escrito en `lib/accionesOng.ts` Y en `lib/flujosOng.ts`.**

Para verificarlo hay que **recargar la página entera**: navegando dentro de la
SPA el componente no se remonta y la ruta rota parece andar.

## 10. Cuidado con las constantes duplicadas

Antes de escribir una constante nueva en una página, buscarla. Ya pasó dos veces
que la misma constante vivía en dos pantallas, y cambiarla en una dejaba a las
dos ofreciendo cosas distintas sobre la misma columna. Las compartidas viven en
`lib/cultivo.ts`.

Y **antes de un `Write` en `lib/`, mirar si el archivo existe**: la herramienta
no avisa cuando sobreescribe, solo cambia "created" por "updated".

## 11. El parser de `manual.md` es propio y no soporta bloques de código

Está en `app/src/lib/markdown.ts`. Los bloques cercados salen literales en
pantalla y **el build no lo detecta** — compila verde igual. Para fórmulas o
pasos, usar listas numeradas o tablas.

## 12. La marca vive en UN solo lugar

`app/src/components/Marca.tsx`, y las rutas de los archivos de logo en
`app/src/lib/marca.ts`. También llevan la marca `app/index.html` (title,
description, apple-mobile-web-app-title) y el manifest PWA en
`app/vite.config.ts`.

Antes estaba copiada en cuatro lugares, y por eso quedaban nombres viejos dando
vueltas por la app. Si cambia el nombre o el logo, se toca ahí y nada más.

## 13. Accesibilidad y contraste: hay línea base medida

- El gris de rótulos es `#8a8a9c`. **No reintroducir uno más oscuro**;
  `#6e6e80` existe pero es **solo para iconos** (a un icono le alcanza 3:1).
- Las áreas táctiles van a 44px en mobile: `min-h-[44px] sm:min-h-0`.
- Los modales usan `useDialogo` (`app/src/lib/useDialogo.ts`): el ref va en el
  elemento `fixed inset-0`, no en la caja de adentro. Da rol de diálogo, foco
  que entra y vuelve, y cierre con Escape y con el atrás del teléfono.

Hay una revisión automatizada que mide todo esto:

```bash
npm --prefix app run revision:diseno   # con el dev server levantado
```

---

# HERMANAS: hay otras instalaciones del mismo código

Este código corre en más de una asociación, cada una con **su propio repo y su
propia base**. No hay sincronización automática y **no se hace merge entre los
repos**. Para llevar un arreglo de una a otra se pasa como parche
(`git format-patch` / `git apply`).

Lo que **nunca** se porta: el README, los `.env*` y **la marca**.

Y la regla antes de aplicar una migración que vino de otra instalación:
**¿el código de acá usa esto?** Si la respuesta es no, no se aplica todavía — si
no, queda drift silencioso: columnas que ningún código deployado usa.

# Arranque — poner esta app en marcha desde cero

Este documento está escrito para que lo lea Claude Code y lo ejecute con vos al
lado. Son cinco pasos; al final hay una app publicada, con su base propia y su
primer usuario.

**Estado de partida:** el código está limpio y verificado. 1000 tests en verde,
lint en 0 errores, build OK. Lo que falta es todo lo que vive fuera del repo: la
base, el sitio y las claves que los unen.

---

## Antes de empezar, en tu máquina

- **Node 20 o superior** y **git**. Nada más es obligatorio.
- Verificalo: `node --version` y `git --version`.

Y tres cuentas:

- **GitHub** — donde vive el código.
- **Supabase** — la base de datos.
- **Cloudflare** — donde se publica el sitio.

---

## Paso 1 — Instalar y ver que corre

```bash
npm --prefix app install
npm --prefix app test
npm --prefix app run dev
```

Los tests tienen que dar **1000 passed**. El dev server abre en
`http://localhost:5199`.

⚠️ **El dev local corre en modo DEMO**: guarda todo en el navegador, no en
Supabase, y auto-loguea sin pedir contraseña. Sirve para ver la app y trabajar en
el código, pero **nada de lo que cargues ahí se guarda de verdad**. Por eso la
pantalla de login no se puede ver en local — hay que mirar el sitio publicado.

---

## Paso 2 — El repo en GitHub

**Esta carpeta YA es un repositorio git**, con cinco commits que cuentan cómo se
armó. **No corras `git init`**: no hace falta y solo agrega ruido.

En github.com creá un repositorio nuevo:

- Nombre: `growflow`
- **Private**, no público.
- ⚠️ **No tildes ninguna de las casillas de abajo** (README, .gitignore,
  license). Tiene que quedar completamente vacío, o el primer push choca y hay
  que resolverlo a mano.

Después, desde esta carpeta:

```bash
git remote add origin https://github.com/<TU_USUARIO>/growflow.git
git push -u origin main
```

Si te pide credenciales, usá un **Personal Access Token** en lugar de la
contraseña (GitHub no acepta contraseña desde hace años): github.com → Settings
→ Developer settings → Personal access tokens.

**Privado, no público.** Acá no hay datos de nadie, pero el repo va a ser el lugar
donde se escriban las particularidades de la asociación, y es más fácil nacer
cerrado que cerrar después.

---

## Paso 3 — La base en Supabase

**3.1.** Creá un proyecto nuevo en [supabase.com](https://supabase.com).
Región: **South America (São Paulo)** — `sa-east-1`. Guardá la contraseña de la
base donde la puedas encontrar; no la vas a usar seguido, pero cuando la
necesites no hay forma de recuperarla.

**3.2.** Anotá el **project id** (lo ves en la URL del panel) y completá la tabla
de coordenadas en `CLAUDE.md`.

**3.3.** Cargá el esquema. Es **un solo archivo**:
`supabase/instalacion-nueva/esquema-completo.sql`. Abrilo, copiá todo y pegalo en
el SQL Editor del panel de Supabase → Run. (O que Claude lo aplique con el MCP de
Supabase.)

Crea las tablas, vistas, funciones, reglas de acceso (RLS) y los buckets de
Storage de una sola vez. Está verificado: carga desde una base vacía y queda
idéntico al esquema de la instalación de Gastón.

⚠️ **`supabase/migrations/` NO es para una instalación nueva**: es el historial de
cambios de la base de Gastón, que arrancó antes y tiene su propio camino. Aplicar
esas migraciones sobre una base vacía no arma el esquema completo.

**3.4.** Verificá que quedó bien:

```sql
select
  (select count(*) from pg_tables   where schemaname='public') as tablas,
  (select count(*) from pg_policies where schemaname='public') as policies,
  (select count(*) from pg_policies where schemaname='public' and qual='true') as permisivas;
```

**`permisivas` tiene que dar 0.** Si da otra cosa, hay una policy que deja
entrar a cualquiera y hay que encontrarla antes de seguir.

---

## Paso 4 — El sitio en Cloudflare Pages

**4.1.** En el panel de Cloudflare: Workers & Pages → Create → Pages → Connect to
Git, y elegí el repo.

**4.2.** Configuración del build:

| campo | valor |
|---|---|
| Root directory | `app` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Production branch | `main` |

**4.3.** Las variables de entorno — **este es el paso que más se olvida**. En
Settings → Environment variables, cargalas en **production Y en preview**:

| variable | de dónde sale |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project_id>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → **publishable** |

⚠️ La publishable key es pública por diseño: viaja embebida en el bundle y está
protegida por RLS. **No uses la `service_role`** — esa saltea RLS y no va nunca
en el frontend.

⚠️ Si estas dos variables faltan, **el sitio compila igual y sale en modo demo**.
Anda, guarda todo en el navegador, y nadie se entera hasta que alguien busca un
dato que cargó la semana pasada y no está.

**4.4.** Después del primer deploy, verificá que el bundle pega contra tu base:

```bash
idx=$(curl -s https://<tu-proyecto>.pages.dev/ | grep -oP '/assets/[A-Za-z0-9_.-]+\.js' | head -1)
curl -s "https://<tu-proyecto>.pages.dev$idx" > /tmp/a.js
sup=$(curl -s "https://<tu-proyecto>.pages.dev/assets/$(grep -oP 'supabase-[A-Za-z0-9_-]+\.js' /tmp/a.js | head -1)")
echo "$sup" | grep -c "<TU_PROJECT_ID>"   # tiene que dar 1
```

---

## Paso 5 — El primer usuario

⚠️ **La app no tiene auto-registro.** No hay «crear cuenta» en el login: nadie
puede darse de alta solo. Las cuentas las crea un administrador desde el panel
de Supabase, y la persona define su contraseña al entrar por el enlace.

### 5.1 · Antes que nada, la Site URL

**Hacelo ANTES de invitar a nadie**, o los enlaces van a llevar a `localhost`.

En el panel de Supabase → **Authentication → URL Configuration**:

| Campo | Valor |
|---|---|
| Site URL | `https://<tu-sitio>.pages.dev` |
| Redirect URLs | agregar `https://<tu-sitio>.pages.dev/**` |

Recién creado, Supabase deja `http://localhost:3000` por defecto. Si lo dejás
así, quien reciba una invitacion va a caer en su propia maquina, con un error
en la barra de direcciones y nada que hacer.

### 5.2 · Tu cuenta

**Authentication → Users → Add user → Create new user**

1. Tu mail y una contraseña que elegís vos.
2. ⚠️ Tildá **«Auto Confirm User»**. Si no, queda esperando un mail de
   confirmación y no podés entrar.
3. Create user.

Para vos conviene este camino y no la invitación: elegís la clave en el
momento y no dependés de que llegue ningún mail.

⚠️ **Creá la tuya PRIMERO, antes que la de nadie.** El trigger
`al_crear_usuario` es `after insert on auth.users`, así que se dispara venga
el alta de donde venga: **la primera cuenta que exista se lleva el rol de
administrador** y las demás nacen `auditor` inactivas. Si se lo lleva otro,
hay que arreglarlo por SQL.

Ya con eso entrás por el login del sitio publicado.

### Para sumar a alguien después

Ahí sí conviene **invitar**, no crear la cuenta con una contraseña que tendrías
que transmitirle:

**Authentication → Users → Invite user** → su mail.

Le llega un mail, entra por el enlace y **la app le pide que defina su
contraseña** antes de dejarlo pasar (`PaginaClave`). Vos nunca ves ni manejás
esa clave.

⚠️ **El enlace vive UNA HORA** (`mailer_otp_exp`, 3600 s). Un mail que se abre a
la tarde ya no sirve: la app lo detecta y avisa que hay que pedir otra
invitación, pero avisale vos también para que la abra al toque. Se puede subir
ese tiempo en Authentication → Providers → Email.

Cuando entre, le asignás el rol desde la app o por SQL:

```sql
select
  (select count(*) from pg_tables   where schemaname='public') as tablas,
  (select count(*) from pg_policies where schemaname='public') as policies,
  (select count(*) from pg_policies where schemaname='public' and qual='true') as permisivas;
```

**`permisivas` tiene que dar 0.** Si da otra cosa, hay una policy que deja
entrar a cualquiera y hay que encontrarla antes de seguir.

---

## Paso 4 — El sitio en Cloudflare Pages

**4.1.** En el panel de Cloudflare: Workers & Pages → Create → Pages → Connect to
Git, y elegí el repo.

**4.2.** Configuración del build:

| campo | valor |
|---|---|
| Root directory | `app` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Production branch | `main` |

**4.3.** Las variables de entorno — **este es el paso que más se olvida**. En
Settings → Environment variables, cargalas en **production Y en preview**:

| variable | de dónde sale |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project_id>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → **publishable** |

⚠️ La publishable key es pública por diseño: viaja embebida en el bundle y está
protegida por RLS. **No uses la `service_role`** — esa saltea RLS y no va nunca
en el frontend.

⚠️ Si estas dos variables faltan, **el sitio compila igual y sale en modo demo**.
Anda, guarda todo en el navegador, y nadie se entera hasta que alguien busca un
dato que cargó la semana pasada y no está.

**4.4.** Después del primer deploy, verificá que el bundle pega contra tu base:

```bash
idx=$(curl -s https://<tu-proyecto>.pages.dev/ | grep -oP '/assets/[A-Za-z0-9_.-]+\.js' | head -1)
curl -s "https://<tu-proyecto>.pages.dev$idx" > /tmp/a.js
sup=$(curl -s "https://<tu-proyecto>.pages.dev/assets/$(grep -oP 'supabase-[A-Za-z0-9_-]+\.js' /tmp/a.js | head -1)")
echo "$sup" | grep -c "<TU_PROJECT_ID>"   # tiene que dar 1
```

---

## Paso 5 — El primer usuario

⚠️ **La app no tiene auto-registro.** No hay «crear cuenta» en el login: nadie
puede darse de alta solo. Las cuentas las crea un administrador desde el panel
de Supabase, y la persona define su contraseña al entrar por el enlace.

### 5.1 · Antes que nada, la Site URL

**Hacelo ANTES de invitar a nadie**, o los enlaces van a llevar a `localhost`.

En el panel de Supabase → **Authentication → URL Configuration**:

| Campo | Valor |
|---|---|
| Site URL | `https://<tu-sitio>.pages.dev` |
| Redirect URLs | agregar `https://<tu-sitio>.pages.dev/**` |

Recién creado, Supabase deja `http://localhost:3000` por defecto. Si lo dejás
así, quien reciba una invitacion va a caer en su propia maquina, con un error
en la barra de direcciones y nada que hacer.

### 5.2 · Tu cuenta

**Authentication → Users → Add user → Create new user**

1. Tu mail y una contraseña que elegís vos.
2. ⚠️ Tildá **«Auto Confirm User»**. Si no, queda esperando un mail de
   confirmación y no podés entrar.
3. Create user.

Para vos conviene este camino y no la invitación: elegís la clave en el
momento y no dependés de que llegue ningún mail.

⚠️ **Creá la tuya PRIMERO, antes que la de nadie.** El trigger
`al_crear_usuario` es `after insert on auth.users`, así que se dispara venga
el alta de donde venga: **la primera cuenta que exista se lleva el rol de
administrador** y las demás nacen `auditor` inactivas. Si se lo lleva otro,
hay que arreglarlo por SQL.

Ya con eso entrás por el login del sitio publicado.

### Para sumar a alguien después

Mismo camino —se la creás desde el panel— y después le asignás el rol, desde
la app o por SQL:

```sql
update public.perfiles_usuario
   set rol = 'cultivador', activo = true, nombre_completo = 'Nombre Apellido'
 where id = '<uuid del usuario>';
```

Roles: `administrador`, `administrador_sistema`, `cultivador`,
`director_medico`, `director_cultivo`, `administrativo`, `mostrador`,
`auditor`, `demo`.

⚠️ **No manejes contraseñas ajenas.** Creale la cuenta y que cada uno se ponga
la suya con «recuperar contraseña» — o que la cambie apenas entre.
---

# El logo

El emblema de GrowFlow es un SVG: `app/public/logo-growflow.svg` (256×256). De ahí
salen la marca de la app (`app/src/components/Marca.tsx`, que lee la ruta de
`app/src/lib/marca.ts`) y todos los íconos de la app instalable.

Para cambiarlo, reemplazar el SVG y regenerar los íconos:

```bash
node app/scripts/generar-iconos.mjs
```

Después verificar la PWA contra el sitio publicado:

```bash
PWA_BASE_URL=https://<tu-proyecto>.pages.dev node app/scripts/verificar-pwa.mjs
```

Tiene que terminar en "TODO OK".

⚠️ **Un 200 no prueba que un archivo exista**: `_redirects` devuelve el
`index.html` para cualquier ruta, así que un ícono que no subiste igual responde
200. Verificá por `content-type` o por un marcador adentro del archivo.

# Lo que conviene leer antes de tocar código

**`CLAUDE.md`**, en la raíz. Son trece pozos concretos, cada uno de los cuales
costó una sesión entera de debugging en una instalación hermana. El más caro es
el primero: el dev local corre en modo demo, y una tabla nueva hay que
registrarla en tres lugares o el insert se pierde en silencio **mostrando un
toast de éxito igual**.

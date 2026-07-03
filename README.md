# GrowFlow

Diario de cultivo personal de cannabis, self-hosted y 100% local. Registrá genéticas, plantas, riegos, podas, cambios de fase y cosechas, y chateá con una IA local que conoce el estado de tu cultivo.

![stack](https://img.shields.io/badge/stack-React%2019%20%2B%20Vite%20%2B%20Supabase-a3e635)

## Features

- **Plantas y genéticas**: alta rápida, fases (germinación → curado), sustrato, maceta, ubicación.
- **Eventos con un click**: riego, fertilización, poda, trasplante, notas; historial por planta.
- **Cosechas**: peso húmedo/seco, notas de curado y valoración.
- **Panel** con KPIs: plantas activas, en floración, riegos del día, gramos cosechados.
- **Chat IA opcional**: conectalo a un webhook (ej. n8n + Ollama) y preguntale a tu cultivo en lenguaje natural. Todo corre en tu máquina.
- Dark UI (lima/violeta), mobile-first, instalable como PWA.

## Stack

- Frontend: React 19 + Vite + Tailwind CSS 4 (TypeScript)
- Base de datos y auth: Supabase (cloud o self-hosted)
- Chat IA (opcional): cualquier webhook que reciba `{"messages":[...]}` y devuelva `{"reply":"..."}` — el setup de referencia usa n8n + Ollama (qwen3:14b)

## Cómo está desplegado (producción)

- **Frontend:** Cloudflare Pages — proyecto `growflow`, root `app/`, build `npm run build`.
  **Deploy automático** al pushear a `main`. Sitio: https://growflow-5vs.pages.dev
- **Base de datos:** Supabase cloud. Las credenciales (`VITE_SUPABASE_*`) están en las env vars de
  Cloudflare Pages, **no en el repo**.

No hace falta Docker ni nginx para trabajar: para desarrollar alcanza con `npm run dev` (ver abajo).

## Setup local

### 1. Frontend (lo único que necesitás para empezar)

```bash
cd app
cp .env.example .env   # opcional; sin esto arranca en MODO DEMO (localStorage)
npm install
npm run dev            # http://localhost:5173
npm run build          # verificar antes de pushear (= tsc -b && vite build)
```
**Sin `.env` funciona todo** (guarda en el navegador). Para usar la base real, completá
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

### 2. Base de datos propia (opcional, solo si querés tu propio backend)

Creá un proyecto en [supabase.com](https://supabase.com) y aplicá las migraciones de
`supabase/migrations/` desde el SQL editor. (O local con Supabase CLI: `supabase start`.)

### 3. Chat IA (opcional)

Apuntá `VITE_CHAT_WEBHOOK_URL` a un endpoint POST que reciba `{"messages":[{"role":"user","content":"..."}]}` y responda `{"reply":"..."}`. El setup de referencia es un workflow de n8n que junta el estado del cultivo desde Supabase y le pasa todo a Ollama. Sin esa variable, la sección de chat queda deshabilitada.

## Estructura

```
app/                  Frontend React (paginas en src/pages, datos en src/lib/cultivo.ts)
supabase/migrations/  Esquema: geneticas, plantas, eventos, cosechas + vista resumen_plantas
deploy/nginx.conf     Config nginx para servir el build como SPA
```

## Calculadora creadora de fertilizantes

Módulo tipo **HydroBuddy** en español (ruta `/nutrientes`, sidebar *Calculadora Fertilizantes*).
Arma recetas de fertilizante desde cero o **clonando marcas comerciales** (Ryanodine, Athena,
Advanced Nutrients, Jacks, Canna, Plagron) con sales crudas baratas.

**Mapa del código (todo en `app/src`):**
- **`lib/nutrientes.ts`** — el MOTOR: base de sales (composición elemental), solver NNLS,
  `kitParaPerfil`, presets, clonado de marcas, conversiones (óxido→elemental, EC por balance
  iónico, ppm↔meq), costos, `usosDeSal`, y los servicios Supabase (perfiles, sustancias,
  inventario, proveedores).
- **`components/nutrientes/CreadorNutrientes.tsx`** — la UI: 12 sub-pestañas (Calculadora,
  Clonar marca, Sustancias, Proveedores, Agua, Soluciones madre, Estabilizantes, Ajuste de pH,
  Comparar, Ratios y costo, Conversor, Ayuda/Guía).
- **`pages/PaginaCreadorNutrientes.tsx`** — la página (ruteada en `App.tsx`).
- **`pages/PaginaTablas.tsx`** — editor genérico de tablas (grilla estilo NocoDB).

**Modelo químico:** 16 nutrientes (NO3, NH4, P, K, Mg, Ca, S, Fe, Zn, B, Cu, Mo, Mn, Na, Si, Cl).
Composición de cada sal = fracción elemental (0-1); ppm = fracción × g/L × 1000. Etiquetas en
óxidos se convierten a elemental (P2O5×0.4364, K2O×0.8301, etc.).

**Tablas Supabase:** `perfiles_nutrientes`, `sustancias_nutrientes`, `inventario_nutrientes`
(precios), `proveedores_nutrientes` (dónde comprar). Al crear una tabla nueva, registrala también
en `pages/PaginaTablas.tsx` y `lib/demo/demoStore.ts` para que sea editable desde la app.

## Para colaboradores

1. `git clone` + `cd app` + `npm install` + `npm run dev`. **Sin `.env` corre en modo demo**
   (datos en localStorage) — alcanza para trabajar en la calculadora.
2. Antes de pushear: `cd app && npm run build` (debe quedar en verde; NO corre eslint).
3. La rama `main` **deploya sola** en Cloudflare Pages → no rompas `main`. Ideal: trabajar en un
   branch y abrir Pull Request.
4. Las credenciales de Supabase **no están en el repo** (están en Cloudflare). Pedilas aparte solo
   si necesitás la base real; si no, modo demo.

## Licencia

MIT. Usalo, modificalo y compartilo como quieras.

> GrowFlow es una herramienta de registro personal. Verificá la legislación sobre cultivo de cannabis en tu jurisdicción.

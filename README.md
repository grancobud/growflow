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

## Setup

### 1. Base de datos

Con [Supabase CLI](https://supabase.com/docs/guides/local-development) (corre todo en Docker):

```bash
supabase start        # desde la raiz del repo; aplica las migraciones de supabase/migrations
```

O creá un proyecto en [supabase.com](https://supabase.com) y aplicá las migraciones de `supabase/migrations/` con el SQL editor.

### 2. Usuario

Creá un usuario en Supabase Auth (Studio → Authentication → Add user) y agregale un perfil:

```sql
insert into perfiles_usuario (id, nombre_completo, rol)
select id, 'Tu Nombre', 'administrador' from auth.users where email = 'tu@email.com';
```

### 3. Frontend

```bash
cd app
cp .env.example .env   # completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm install
npm run dev            # desarrollo
npm run build          # produccion (sirve dist/ con cualquier estatico; hay nginx.conf en deploy/)
```

### 4. Servirlo permanente (opcional)

```bash
docker run -d --name growflow --restart always -p 5180:80 \
  -v ./app/dist:/usr/share/nginx/html:ro \
  -v ./deploy/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:alpine
```

### 5. Chat IA (opcional)

Apuntá `VITE_CHAT_WEBHOOK_URL` a un endpoint POST que reciba `{"messages":[{"role":"user","content":"..."}]}` y responda `{"reply":"..."}`. El setup de referencia es un workflow de n8n que junta el estado del cultivo desde Supabase y le pasa todo a Ollama. Sin esa variable, la sección de chat queda deshabilitada.

## Estructura

```
app/                  Frontend React (paginas en src/pages, datos en src/lib/cultivo.ts)
supabase/migrations/  Esquema: geneticas, plantas, eventos, cosechas + vista resumen_plantas
deploy/nginx.conf     Config nginx para servir el build como SPA
```

## Licencia

MIT. Usalo, modificalo y compartilo como quieras.

> GrowFlow es una herramienta de registro personal. Verificá la legislación sobre cultivo de cannabis en tu jurisdicción.

# GrowFlow

**Del esqueje al recibo firmado.** Trazabilidad de cultivo de cannabis medicinal y gestión de la
asociación civil que lo ampara: las plantas, lo que cuesta producirlas, a quién se le entrega y los
papeles que eso exige.

[![sitio](https://img.shields.io/badge/app-growflow--5vs.pages.dev-a3e635?style=flat-square)](https://growflow-5vs.pages.dev)
![stack](https://img.shields.io/badge/React%2019-Vite%208-61dafb?style=flat-square)
![supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3ecf8e?style=flat-square)


> **¿Recién empezás?** Leé [`ARRANQUE.md`](ARRANQUE.md): son los cinco pasos para
> poner esto en marcha desde cero (base, sitio, claves y primer usuario). Y antes de
> tocar código, [`CLAUDE.md`](CLAUDE.md), que junta los pozos conocidos.

Pensado para el marco argentino: **Ley 27.350**, **Decreto 883/2020** y **Resolución 1780/2025**.
El cupo de plantas sale de los REPROCANN cargados, el aporte de un paciente se compara contra el
costo real de producción, y cada entrega deja su dispensa, su asiento en el libro de caja y su recibo.

---

## Qué es esta instalación

Es la instalación de **Gastón**: base propia, usuarios propios, sitio propio. Reúne lo propio de
GrowFlow —Calendario, Calculadora de Fertilizantes, Instalación (hardware, riego y tablero),
Ambiente en vivo con Growcast, historia clínica— con todas las mejoras de las instalaciones
hermanas (Aguara, Cultivando Salud Chaco, Panacea) al 24/09/2026. El código no contiene datos de
producción: las plantas, los pacientes y los costos viven únicamente en su base de Supabase.

| | |
|---|---|
| Sitio | https://growflow-5vs.pages.dev |
| Base | Supabase `rtnidtpalynprizpbnuz`, región sa-east-1 |
| Deploy | Cloudflare Pages, proyecto `growflow` (push a `main` = deploy) |
| Sensores | Growcast, por el Worker `growcast-bridge` |

---

## Cómo se accede

**Cuenta de demostración:** el botón de demo del login entra solo con el rol `demo`, que en la base
**lee cero filas** (verificado): sirve para mostrar la interfaz sin exponer nada. Las cuentas reales
las invita un administrador desde la app o desde el panel de Supabase, y después les asigna el rol.

El primer usuario de la base nace **administrador y activo**. Del segundo en adelante entran como
`auditor` inactivo, y un administrador tiene que habilitarlos — así nadie que consiga registrarse
ve datos por el solo hecho de tener una cuenta.

| Rol | Qué ve |
|---|---|
| `administrador` | Todo, incluida la gestión de usuarios |
| `cultivador` | Panel, cultivo, ambiente, cosecha y estadísticas. Edita cultivo |
| `director_medico` | Lo clínico y la O.N.G., más el cultivo en modo lectura |
| `administrativo` | La parte de dinero: econometría, costos y O.N.G. |
| `auditor` | Lectura de todo lo suyo, sin editar nada |

Los permisos no los decide la interfaz: los decide Postgres. Las policies de Row Level Security
filtran por rol, así que aunque alguien saltee la aplicación y pegue directo contra la API, ve lo
mismo que vería en pantalla.

---

## Qué hace

| Módulo | Adentro | Para qué |
|---|---|---|
| **Panel** | — | Plantas activas, en floración, riegos del día, gramos cosechados |
| **Cultivo** | Plantas · Genéticas · Línea de tiempo · Sala | El ciclo completo: alta, fases, riegos por carpa, historial y QR por planta |
| **Cosecha** | — | Peso húmedo/seco, merma, valoración y ranking por genética |
| **Ambiente** | — | Temperatura, humedad, CO₂ y VPD + estado de cada equipo |
| **Calendario** | — | Riegos, podas, fumigaciones, cosechas y mantenimientos |
| **Econometría** | Resumen · Costos · Inventario · Mantenimiento | Cuánto cuesta producir un gramo y de dónde sale ese número |
| **O.N.G.** | 15 pestañas | Pacientes, entregas, libros, actas, DDJJ y todo lo que pide la 1780 |
| **Estadísticas** | — | Rendimiento por genética, gramos por vatio, merma de secado |
| **Tablas** | — | Editor genérico de las 48 tablas, celda por celda |
| **Manual** | — | El manual de operación, adentro de la app, con buscador |

---

## El circuito de la ONG

Seis pasos, cada uno habilita el siguiente, y el sistema no deja saltear ninguno:

```
paciente → asociado → mandato firmado → reserva (72 h) → retiro en sede → reporte de seguimiento
                                            │                   │                  │
                                        QR + cupo          dispensa +          desbloquea la
                                                          caja + recibo        próxima entrega
```

| Regla | Qué exige |
|---|---|
| **RN-01** | REPROCANN vigente y vinculado a la entidad |
| **RN-02** | Tope de gramos en 30 días, contando lo entregado **más lo reservado sin retirar** |
| **RN-03** | Mandato de Gestión Operativa firmado (queda timestamp e IP) |
| **RN-04** | El aporte no puede superar el costo de producción — si no, deja de ser reembolso |
| **RN-05** | La entrega anterior necesita su reporte antes de habilitar la siguiente |
| **RN-06** | La reserva vence a las 72 h y el material vuelve al inventario |
| **RN-07** | El reporte clínico es inmutable: la base rechaza el update aunque la UI se equivoque |

Cuando algo se bloquea, la pantalla dice qué regla es y cómo destrabarla. Si faltan tres cosas, se
ven las tres.

---

## Stack

| Capa | Qué |
|---|---|
| Frontend | React 19 · Vite 8 · TypeScript · Tailwind CSS 4 |
| Datos | Supabase (Postgres + RLS + Storage) — 48 tablas |
| Ruteo y estado | React Router 7 · TanStack Query |
| Deploy | Cloudflare Pages |
| Extras | PWA instalable · QR (generación y escaneo) · lectura de PDF · export a Excel |

---

## Arrancar

```bash
cd app
npm install
npm run dev          # http://localhost:5173 — modo demo local, sin configurar nada
```

Sin `.env` la app arranca en **modo demo**: guarda todo en `localStorage`, con datos de ejemplo
ficticios y todo habilitado. No toca la base real y sirve para desarrollar.

Para trabajar contra la base real, copiá `app/.env.example` a `app/.env` y completá
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

> **Ningún `.env` se versiona.** El `.gitignore` los bloquea a todos menos el `.example`.
> Las claves de producción van en las variables de entorno de Cloudflare Pages, nunca en el repo.

Antes de pushear:

```bash
npm run build        # tsc -b && vite build — tiene que quedar en verde
```

---

## Estructura

```
app/
  src/
    pages/          66 pantallas
    components/     por dominio: ong/, econometria/, layout/, manual/
    lib/            la lógica de verdad vive acá, no en los componentes
      ong.ts            reglas de la asociación, cupos, vencimientos
      portal.ts         autodispensación: reservas, 72 h, disponibilidad
      informeMedico.ts  el informe semestral del Director Médico
      econometria.ts    costos, amortización, costo por gramo
      documentos*.ts    generadores de los documentos legales
    contenido/
      manual.md       el manual: se edita acá y la pantalla se actualiza sola
supabase/migrations/  esquema completo
```

**La lógica va en `lib/`, no en los componentes.** Es lo que permite verificar una regla sin montar
una pantalla, y que la misma regla valga en todas las pantallas que la usan.

---

## Convenciones

- **Toda tabla nueva se registra en dos lugares**: `pages/PaginaTablas.tsx` (para que sea editable)
  y `lib/demo/demoStore.ts` (para que exista en modo demo). Si falta una, la tabla no aparece.
- **RLS siempre `to authenticated`.** Una policy sobre `public` incluye a `anon`: los datos quedan
  legibles sin login. Se verifica con la clave publicable, no con el service role — el service role
  saltea RLS y no prueba nada.
- **Las policies se combinan con OR.** Una sola permisiva anula al resto. Después de tocar RLS,
  listar las que quedaron: `select * from pg_policies where schemaname='public' and qual='true'`.
- **Móvil primero.** Los inputs van en `text-[16px]` en celular o iOS hace zoom y descuadra el
  formulario; los botones, mínimo 44 px de alto.
- **Un guion no es un cero.** Cuando falta un dato para calcular se muestra `—`. Un `$0` diría que
  producir no cuesta nada.
- **Un build verde no dice que la pantalla abre.** Antes de dar algo por terminado, abrirlo.

---

## Licencia

MIT.

> GrowFlow es una herramienta de registro y gestión. No sustituye asesoramiento legal ni médico.
> Verificá la normativa vigente en tu jurisdicción antes de operar.

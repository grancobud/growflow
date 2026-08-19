# GrowFlow

**Del esqueje al recibo firmado.** Trazabilidad de cultivo de cannabis medicinal y gestión de la
asociación civil que lo ampara, en un solo sistema: las plantas, lo que cuesta producirlas, a quién
se le entrega y los papeles que eso exige.

[![sitio](https://img.shields.io/badge/app-growflow--5vs.pages.dev-a3e635?style=flat-square)](https://growflow-5vs.pages.dev)
![stack](https://img.shields.io/badge/React%2019-Vite%208-61dafb?style=flat-square)
![supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3ecf8e?style=flat-square)
![licencia](https://img.shields.io/badge/licencia-MIT-blue?style=flat-square)

Pensado para el marco argentino: **Ley 27.350**, **Decreto 883/2020** y **Resolución 1780/2025**.
No es un diario de cultivo con una planilla al lado — el cupo de plantas sale de los REPROCANN
cargados, el aporte de un paciente se compara contra el costo real de producción, y cada entrega
deja su dispensa, su asiento en el libro de caja y su recibo.

---

## Qué hace

| Módulo | Adentro | Para qué |
|---|---|---|
| **Panel** | — | Plantas activas, en floración, riegos del día, gramos cosechados |
| **Cultivo** | Plantas · Genéticas · Línea de tiempo · Sala | El ciclo completo: alta, fases, riegos por carpa, historial y QR por planta |
| **Cosecha** | — | Peso húmedo/seco, merma, valoración y ranking por genética |
| **Ambiente** | — | Temperatura, humedad, CO₂ y VPD en vivo + estado de cada equipo |
| **Calendario** | — | Riegos, podas, fumigaciones, cosechas y mantenimientos |
| **Calculadora Fertilizantes** | 17 sub-pestañas | Recetas de sales desde cero, clonado de marcas y preparados DIY |
| **Instalación** | Hardware DIY · Riego · Tablero · Faltantes | Cómo está armado el equipamiento y qué falta comprar |
| **Econometría** | Resumen · Costos · Inventario · Mantenimiento · Instalaciones | Cuánto cuesta producir un gramo y de dónde sale ese número |
| **O.N.G.** | 15 pestañas | Pacientes, entregas, libros, actas, DDJJ y todo lo que pide la 1780 |
| **Estadísticas** | — | Rendimiento por genética, gramos por vatio, merma de secado |
| **Tablas** | — | Editor genérico de las 48 tablas, celda por celda |
| **Manual** | — | El manual de operación, adentro de la app, con buscador |

---

## El circuito de la ONG

Es la parte que distingue a GrowFlow de un registro de cultivo. Seis pasos, cada uno habilita el
siguiente, y el sistema no deja saltear ninguno:

```
paciente → asociado → mandato firmado → reserva (72 h) → retiro en sede → reporte de seguimiento
                                            │                   │                  │
                                        QR + cupo          dispensa +          desbloquea la
                                                          caja + recibo        próxima entrega
```

### Las reglas que el sistema hace cumplir

Cuando algo se bloquea, la pantalla dice qué regla es y cómo destrabarla. No se muestran de a una:
si faltan tres cosas, se ven las tres.

| Regla | Qué exige |
|---|---|
| **RN-01** | REPROCANN vigente y vinculado a la entidad |
| **RN-02** | Tope de gramos en 30 días, contando lo entregado **más lo reservado sin retirar** |
| **RN-03** | Mandato de Gestión Operativa firmado (queda timestamp e IP) |
| **RN-04** | El aporte no puede superar el costo de producción — si no, deja de ser reembolso |
| **RN-05** | La entrega anterior necesita su reporte antes de habilitar la siguiente |
| **RN-06** | La reserva vence a las 72 h y el material vuelve al inventario |
| **RN-07** | El reporte clínico es inmutable: la base rechaza el update aunque la UI se equivoque |

<details>
<summary><b>Por qué el cupo cuenta las reservas</b></summary>

El cupo de 30 días suma lo entregado **más lo reservado y todavía sin retirar**. Contando sólo
entregas, cinco reservas hechas el mismo día pasarían el tope las cinco, y el exceso aparecería
recién en el mostrador con el material ya comprometido.

</details>

<details>
<summary><b>Documentos que genera</b></summary>

Se completan con lo que ya está cargado; lo que falta sale entre corchetes en vez de inventado.

- Recibo oficial por reembolso de costos, con la leyenda legal obligatoria al pie
- Comprobante de dispensación y guía de tránsito interno
- Actas para transcribir al libro, con control de quórum y firmantes
- Designaciones de Director Médico y Responsable Técnico
- Comodatos de sede y de predio de cultivo
- Informe de variedades genéticas y compromiso de análisis
- Declaración Jurada de Vinculación Exclusiva y Mandato de Gestión Operativa
- Informe semestral del Director Médico (diagnóstico → lotes → curva de alivio → efectos adversos)

</details>

---

## Stack

| Capa | Qué |
|---|---|
| Frontend | React 19 · Vite 8 · TypeScript · Tailwind CSS 4 |
| Datos | Supabase (Postgres + RLS + Storage) — 48 tablas, 30 migraciones |
| Ruteo y estado | React Router 7 · TanStack Query |
| Deploy | Cloudflare Pages, automático al pushear a `main` |
| Extras | PWA instalable · QR (generación y escaneo) · lectura de PDF · export a Excel |

Sin `.env` la app arranca en **modo demo**: guarda todo en `localStorage` y no necesita backend.
Es suficiente para desarrollar y para probar el sistema entero.

---

## Arrancar

```bash
cd app
npm install
npm run dev          # http://localhost:5173 — modo demo, sin configurar nada
```

Para usar una base real, copiá `.env.example` a `.env` y completá `VITE_SUPABASE_URL` y
`VITE_SUPABASE_ANON_KEY`. Las migraciones están en `supabase/migrations/` y se aplican desde el SQL
editor de Supabase (o con `supabase start` para una base local).

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
    components/     por dominio: ong/, econometria/, nutrientes/, layout/, manual/
    lib/            la lógica de verdad vive acá, no en los componentes
      ong.ts            reglas de la asociación, cupos, vencimientos
      portal.ts         autodispensación: reservas, 72 h, disponibilidad
      informeMedico.ts  el informe semestral del Director Médico
      nutrientes.ts     motor de la calculadora: sales, solver NNLS, conversiones
      econometria.ts    costos, amortización, costo por gramo
      documentos*.ts    generadores de los documentos legales
    contenido/
      manual.md       el manual: se edita acá y la pantalla se actualiza sola
supabase/migrations/  esquema completo
scripts/              utilidades (versión web del manual, etc.)
```

**La lógica va en `lib/`, no en los componentes.** Es lo que permite verificar una regla sin montar
una pantalla, y que la misma regla valga en todas las pantallas que la usan.

---

## La calculadora de fertilizantes

Módulo tipo **HydroBuddy** en español (`/nutrientes`). Arma recetas desde cero o **clonando marcas
comerciales** (Athena, Advanced Nutrients, Jacks, Canna, Plagron, Ryanodine) con sales crudas.

- **`lib/nutrientes.ts`** — el motor: base de sales con composición elemental, solver NNLS,
  `kitParaPerfil`, presets por etapa, conversiones (óxido→elemental, EC por balance iónico,
  ppm↔meq), costos y los servicios de Supabase.
- **`components/nutrientes/CreadorNutrientes.tsx`** — la UI, con sus 17 sub-pestañas.

Además de la receta, el módulo trae los **preparados DIY** que normalmente se compran hechos, con
su fórmula y sus proveedores: gel de enraizado, elicitor, bioestimulantes e hipocloroso. Y las
herramientas alrededor: análisis del agua de partida, soluciones madre A/B, ajuste de pH,
estabilizantes y comparador de recetas.

**Modelo químico:** 16 nutrientes (NO3, NH4, P, K, Mg, Ca, S, Fe, Zn, B, Cu, Mo, Mn, Na, Si, Cl).
La composición de cada sal es su fracción elemental (0-1), y `ppm = fracción × g/L × 1000`. Las
etiquetas en óxidos se convierten a elemental (P₂O₅ × 0.4364, K₂O × 0.8301).

---

## Convenciones

Cosas que conviene saber antes de tocar el código:

- **Toda tabla nueva se registra en dos lugares**: `pages/PaginaTablas.tsx` (para que sea editable)
  y `lib/demo/demoStore.ts` (para que exista en modo demo). Si falta una, la tabla no aparece.
- **RLS siempre `to authenticated`.** Una policy sobre `public` incluye a `anon`: los datos quedan
  legibles sin login. Se verifica con la clave publicable, no con el service role — el service role
  saltea RLS y no prueba nada.
- **Móvil primero.** Los inputs van en `text-[16px]` en celular o iOS hace zoom y descuadra el
  formulario; los botones, mínimo 44 px de alto.
- **Un guion no es un cero.** Cuando falta un dato para calcular se muestra `—`. Un `$0` diría que
  producir no cuesta nada.
- **Un build verde no dice que la pantalla abre.** Antes de dar algo por terminado, abrirlo.

---

## Licencia

MIT. Usalo, modificalo y compartilo.

> GrowFlow es una herramienta de registro y gestión. No sustituye asesoramiento legal ni médico.
> Verificá la normativa vigente en tu jurisdicción antes de operar.

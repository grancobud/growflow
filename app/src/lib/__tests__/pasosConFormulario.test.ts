// Invariante: un paso que promete formulario, lo abre de verdad.
//
// Un paso de flujo dice «La entrega» y manda a `/ong/dispensas?nueva=1`. Ese
// `nueva=1` no lo entiende el router: lo lee `useAbrirAlLlegar` DENTRO del
// componente de esa pantalla, con la clave que le hayan pasado. Si la pantalla
// no lo lee, o lo lee con otra clave, no pasa nada visible: la persona llega a
// la lista con el parametro colgado en la URL y tiene que buscar el boton a
// mano, que es justo el trabajo que el flujo venia a sacar del medio.
//
// Y no da error en ningun lado. El paso apunta a una pantalla que existe, la
// pantalla carga, el test de rutas pasa. Lo unico que falta es lo que el paso
// prometia.
//
// Por eso se cruzan las dos puntas: la clave que el paso pide contra la clave
// que el archivo de esa pantalla realmente escucha.

import { describe, it, expect } from 'vitest'
import { FLUJOS } from '../flujosOng'
import { accionesOng } from '../accionesOng'
import type { Entidad, Asociado, Cuota, LoteIngreso } from '../ong'

/** Todo cargado: asi ninguna accion queda bloqueada y se miran todas. */
const completo = () => ({
  entidad: { id: 'e', cuit: '30-1234-5' } as Entidad,
  pacientes: 10,
  lotes: [{ gramos_totales: 500 }] as LoteIngreso[],
  asociados: [{ id: 'a', nombre: 'X', activo: true }] as Asociado[],
  cuotas: [{ id: 'c', valor: 5000 }] as Cuota[],
})

// Por `import.meta.glob` de Vite y no por `fs`, igual que el test de los
// modales: el codigo entra como texto sin depender de los tipos de node ni del
// directorio desde el que se corra vitest.
const FUENTES = Object.entries(
  import.meta.glob('../../**/*.tsx', { query: '?raw', import: 'default', eager: true }),
) as [string, string][]

/** El texto de un archivo, buscado por el final de su ruta. */
function fuente(sufijo: string): string {
  const hit = FUENTES.find(([ruta]) => ruta.endsWith(sufijo))
  if (!hit) throw new Error(`No existe el archivo declarado en PANTALLAS: ${sufijo}`)
  return hit[1]
}

/**
 * Donde vive el formulario de cada pestaña de la O.N.G.
 *
 * Se declara a mano y no se descubre solo a proposito: una pestaña sin entrada
 * acá hace fallar el test en vez de saltearse, asi que agregar un paso con
 * formulario obliga a decir en que archivo se abre.
 */
const PANTALLAS: Record<string, string[]> = {
  autoridades: ['pages/PaginaONG.tsx'],
  predios: ['pages/PaginaONG.tsx'],
  libros: ['components/ong/LibrosYActas.tsx'],
  actas: ['components/ong/LibrosYActas.tsx'],
  pacientes: ['pages/PaginaPacientes.tsx'],
  asociados: ['components/ong/AsociadosYCoherencia.tsx'],
  visitas: ['components/ong/Visitas.tsx'],
  dispensas: ['components/ong/Dispensas.tsx'],
  documentos: ['components/ong/Documentos.tsx'],
  seguimiento: ['components/ong/Seguimiento.tsx'],
  economia: ['components/ong/LibroDeCaja.tsx'],
  portal: ['components/ong/portal/Catalogo.tsx'],
  declaraciones: ['components/ong/Declaraciones.tsx'],
  // Las de cultivo, que no son pestañas de la O.N.G. sino rutas propias. Se
  // sumaron el 31/08 al extender el cruce a las TARJETAS: los flujos sólo pasan
  // por `/ong/*`, así que sin esto las acciones de cultivo no se miraban.
  plantas: ['pages/PaginaPlantas.tsx'],
  geneticas: ['pages/PaginaGeneticas.tsx'],
  sala: ['pages/PaginaSala.tsx'],
  cosecha: ['pages/PaginaCosecha.tsx'],
  // `/econometria` y `/stock` son la MISMA ruta del router (las dos montan
  // `PaginaEconometria`), pero el alta de insumo y la de mantenimiento viven en
  // la pantalla de adentro. El mapa apunta a donde esta el hook, no a donde
  // empieza la ruta.
  econometria: ['pages/PaginaEconometria.tsx'],
  stock: ['pages/PaginaStockInsumos.tsx'],
}

/** Los pasos que prometen formulario: `[flujo, paso, pestaña, clave]`. */
function pasosConFormulario(): [string, number, string, string][] {
  const out: [string, number, string, string][] = []
  for (const id of Object.keys(FLUJOS)) {
    FLUJOS[id].pasos.forEach((p, i) => {
      const [ruta, query] = p.ruta.split('?')
      const clave = new URLSearchParams(query).get('nueva')
      if (!clave) return
      out.push([id, i + 1, ruta.replace('/ong/', ''), clave])
    })
  }
  return out
}

/**
 * Si el archivo escucha `useAbrirAlLlegar` con esa clave.
 *
 * El hook acepta un tercer argumento —si el formulario está abierto— así que la
 * llamada puede terminar en `)` o seguir con una coma. Sin el `[^)]*` acá, el
 * test empezó a fallar cuando se agregó ese argumento, que es exactamente lo
 * que tiene que hacer un test de forma: avisar cuando la forma cambia.
 */
function escucha(fuente: string, clave: string): boolean {
  // Sin segundo argumento la clave es '1', que es el valor por defecto del hook.
  if (clave === '1' && /useAbrirAlLlegar\(\s*[\w.]+\s*\)/.test(fuente)) return true
  const conClave = new RegExp(
    String.raw`useAbrirAlLlegar\(\s*[\w.]+\s*,\s*['"]` + clave + String.raw`['"]\s*[,)]`)
  return conClave.test(fuente)
}

/**
 * Los pasos que a propósito NO abren formulario, con el motivo.
 *
 * Son de tres clases y ninguna admite un formulario honesto:
 *  · VERIFICACIÓN: el paso es mirar si algo cerró, no cargar nada.
 *  · TRÁMITE EXTERNO: se hace fuera de la app, y abrir el tilde acá empujaría a
 *    declarar hecho algo que todavía no pasó.
 *  · PANTALLA-FORMULARIO: la pantalla entera YA es el formulario, sin modal que
 *    abrir.
 */
const SIN_FORMULARIO: Record<string, string> = {
  'arranque[1]': 'pantalla-formulario: /ong/entidad se edita en la pantalla misma',
  'arranque[5]': 'verificación: es revisar que todas las fichas tengan tope, no dar un alta',
  'comprar[4]': 'verificación: mirar si el balance de materia cierra',
  'mover[2]': 'trámite externo: la carta de porte se presenta por TAD, y el tilde ' +
    'declara que YA se presentó — abrirlo acá empuja a marcar algo que no pasó',
  'presentar[1]': 'verificación: contar si el padrón llega al mínimo de cinco',
  'presentar[3]': 'verificación: mirar si Coherencia quedó sin observables',
  'cerrar[1]': 'acción masiva: emitir las cuotas del período es un botón, no una ficha',
  'cerrar[2]': 'acción masiva: los dos registros del mes salen de las plantillas',
  'cerrar[3]': 'verificación: mirar si Coherencia quedó sin observables',
}

describe('los pasos que abren un formulario', () => {
  it('hay pasos que prometen formulario, si no el test no prueba nada', () => {
    expect(pasosConFormulario().length).toBeGreaterThan(5)
  })

  it('toda pestaña que un paso usa está declarada acá', () => {
    const sinDeclarar = pasosConFormulario()
      .filter(([, , tab]) => !PANTALLAS[tab])
      .map(([f, n, tab]) => `${f}[${n}]: la pestaña "${tab}" no está en PANTALLAS`)
    expect(sinDeclarar).toEqual([])
  })

  it('la pantalla de destino escucha la clave que el paso le manda', () => {
    const sordas = pasosConFormulario()
      .filter(([, , tab]) => PANTALLAS[tab])
      .filter(([, , tab, clave]) =>
        !PANTALLAS[tab].some(f => escucha(fuente(f), clave)))
      .map(([f, n, tab, clave]) =>
        `${f}[${n}] manda ?nueva=${clave} a ${tab}, y ahí nadie lo escucha`)
    expect(sordas).toEqual([])
  })

  it('todo paso o abre su formulario, o está declarado como excepción con motivo', () => {
    // El pedido era que la secuencia fuera operativa y no un cartel que indica
    // adonde ir. Un paso sin formulario es una pantalla de lectura en el medio
    // del camino, y ahi la persona se queda parada buscando el boton.
    //
    // Las excepciones no se saltean en silencio: hay que escribirlas acá con el
    // motivo. Asi un paso nuevo sin formulario hace fallar el test, y quien lo
    // agrega decide a propósito en vez de olvidarse.
    const huerfanos: string[] = []
    for (const id of Object.keys(FLUJOS)) {
      FLUJOS[id].pasos.forEach((p, i) => {
        const clave = `${id}[${i + 1}]`
        if (p.ruta.includes('nueva=')) {
          if (SIN_FORMULARIO[clave]) huerfanos.push(`${clave} abre formulario Y está exceptuado`)
          return
        }
        if (!SIN_FORMULARIO[clave]) huerfanos.push(`${clave} «${p.titulo}» no abre nada: ${p.ruta}`)
      })
    }
    expect(huerfanos).toEqual([])
  })

  // ---------------------------------------------------------------------
  // LO MISMO PARA LAS TARJETAS DE «¿QUE QUERES HACER?» (31/08/2026)
  //
  // El cruce de arriba mira los FLUJOS y ahi tenia razon, pero los tres bugs de
  // esta clase que aparecieron el 31/08 estaban en las TARJETAS, que no pasaban
  // por ningun test de pares:
  //
  //   · «Cargar plantas» dejaba en la lista. `PaginaPlantas` esperaba
  //     `nueva=planta` desde siempre; se lo mandaba el paso 2 del flujo de
  //     cosecha, que se retiro el 29/08 al volverlo de un solo paso.
  //   · «Dar de alta un asociado» igual, con el hook `1` ya escrito.
  //   · Y antes, el 27/08, «Crear un lote» mandaba la clave equivocada.
  //
  // Una tarjeta es la puerta mas usada del sistema: si promete un alta y suelta
  // en una lista, la persona cree que la app no la deja hacer lo que pidio.
  // ---------------------------------------------------------------------

  /** Las tarjetas que prometen formulario: `[id, pantalla, clave]`. */
  function tarjetasConFormulario(): [string, string, string][] {
    const out: [string, string, string][] = []
    for (const a of accionesOng(completo())) {
      const [ruta, query] = a.ruta.split('?')
      const clave = new URLSearchParams(query).get('nueva')
      if (!clave) continue
      // `/ong/pacientes` -> `pacientes`; `/plantas` -> `plantas`.
      out.push([a.id, ruta.replace('/ong/', '').replace(/^\//, ''), clave])
    }
    return out
  }

  it('hay tarjetas que prometen formulario, si no el test no prueba nada', () => {
    expect(tarjetasConFormulario().length).toBeGreaterThan(5)
  })

  it('la pantalla de destino escucha la clave que la tarjeta le manda', () => {
    const sordas = tarjetasConFormulario()
      .filter(([, tab]) => PANTALLAS[tab])
      .filter(([, tab, clave]) => !PANTALLAS[tab].some(f => escucha(fuente(f), clave)))
      .map(([id, tab, clave]) => `la tarjeta "${id}" manda ?nueva=${clave} a ${tab}, y ahí nadie lo escucha`)
    expect(sordas).toEqual([])
  })

  it('toda pantalla que una tarjeta usa está declarada acá', () => {
    const sinDeclarar = tarjetasConFormulario()
      .filter(([, tab]) => !PANTALLAS[tab])
      .map(([id, tab]) => `la tarjeta "${id}" va a "${tab}", que no está en PANTALLAS`)
    expect(sinDeclarar).toEqual([])
  })

  it('ninguna excepción sobra: todas apuntan a un paso que existe', () => {
    // Una excepción que quedó de un paso borrado tapa el proximo paso que caiga
    // en ese mismo numero.
    const fantasmas = Object.keys(SIN_FORMULARIO).filter(k => {
      const m = /^(\w+)\[(\d+)\]$/.exec(k)
      return !m || !FLUJOS[m[1]]?.pasos[Number(m[2]) - 1]
    })
    expect(fantasmas).toEqual([])
  })
})

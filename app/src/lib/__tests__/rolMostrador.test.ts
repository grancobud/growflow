import { describe, it, expect } from 'vitest'
import { PERMISOS_ROL } from '../../hooks/useAuth'
import { PERMISO_DE_TAB, TABS } from '../pestanasOng'
import { accionesOng } from '../accionesOng'

// EL ROL DE QUIEN ABRE LA SEDE, FIJADO POR LO QUE **NO** VE.
//
// Cristian lo definio el 02/09/2026: «para que abra la sede, tome los valores de
// las salas, haga control de stock, dinero y pueda hacer las tareas de los
// botones». Lo dificil de un rol asi no es darle lo que necesita —eso se nota
// enseguida cuando falta— sino que no se le cuele nada mas. Un permiso de mas no
// rompe ninguna pantalla, no falla ningun test, y no se ve hasta que alguien
// abre algo que no le tocaba.
//
// Por eso la mitad de este archivo son negaciones.

const puede = (permiso: string) => PERMISOS_ROL.mostrador.includes(permiso)

describe('rol mostrador — lo que necesita para su rutina', () => {
  it('el panel, que es su pantalla', () => {
    expect(puede('ver_panel')).toBe(true)
  })

  it('cargar la lectura de ambiente (paso 1)', () => {
    expect(puede('ver_ambiente')).toBe(true)
  })

  it('ver la caja y anotarle movimientos (pasos 2 y 4)', () => {
    expect(puede('ver_plata')).toBe(true)
    expect(puede('editar_plata')).toBe(true)
  })

  it('llegar al mostrador: entregar, el catálogo y las visitas', () => {
    expect(puede('ver_ong')).toBe(true)
    expect(puede('ver_mostrador')).toBe(true)
  })
})

describe('rol mostrador — lo que NO le toca', () => {
  it('nada del estatuto: entidad, libros, actas, socios, solicitudes', () => {
    expect(puede('ver_institucional')).toBe(false)
  })

  it('ninguna ficha clínica', () => {
    expect(puede('ver_clinico')).toBe(false)
    expect(puede('editar_clinico')).toBe(false)
  })

  it('el cultivo no: el paso 1 es cargar una lectura, no mirar las sesenta plantas', () => {
    expect(puede('ver_cultivo')).toBe(false)
    expect(puede('editar_cultivo')).toBe(false)
    expect(puede('ver_cosecha')).toBe(false)
  })

  it('ni los costos, ni las tablas, ni los usuarios', () => {
    expect(puede('ver_econometria')).toBe(false)
    expect(puede('ver_tablas')).toBe(false)
    expect(puede('gestionar_usuarios')).toBe(false)
  })

  it('ni lo que se declara: cupo, DDJJ, predios', () => {
    expect(puede('ver_cumplimiento')).toBe(false)
  })
})

describe('las pestañas de O.N.G. que le quedan', () => {
  const suyas = TABS
    .filter(t => PERMISOS_ROL.mostrador.includes(PERMISO_DE_TAB[t.id]))
    .map(t => t.id)
    .sort()

  it('son exactamente las del mostrador y las de la caja', () => {
    // Si esta lista crece sin que nadie lo haya decidido, es que a alguna
    // pestaña le cambiaron el permiso y se la llevó puesta de regalo. Este test
    // ya lo agarró una vez: `documentos` entró sin que nadie lo pensara, porque
    // vive en `TABS_DE_PLATA` —son 1.551 comprobantes de gastos, o sea el libro
    // de plata en otra forma—.
    //
    // Se decidió DEJARLO: Cristian pidió que Hugo pueda «cargar lo que cobrás,
    // lo que gastás», y un gasto sin su comprobante es media anotación. Las
    // cuatro de plata vienen juntas con `ver_plata` y las cuatro son de su
    // trabajo: la caja, el movimiento, a quién se le compró y con qué papel.
    expect(suyas).toEqual(
      ['dispensas', 'documentos', 'economia', 'movimientos', 'portal', 'proveedores', 'visitas'].sort())
  })

  it('y NO están las dieciséis del estatuto', () => {
    for (const t of ['entidad', 'autoridades', 'libros', 'actas', 'asociados', 'solicitudes', 'estado', 'coherencia', 'pacientes', 'seguimiento', 'cupo', 'declaraciones', 'predios', 'usuarios']) {
      expect(suyas).not.toContain(t)
    }
  })
})

describe('las acciones que le quedan, contra lo que la base le deja escribir', () => {
  // ⚠️ ESTE BLOQUE NACIÓ DE PROBAR EL ROL EJECUTÁNDOLO, el 03/09/2026.
  //
  // Hasta ese día el rol se había revisado leyendo definiciones, y por eso los
  // tests de arriba pasaban con el rol ROTO: `PERMISOS_ROL` decía la verdad,
  // pero la base no la acompañaba. Corriendo como el rol —en una transacción
  // que se revierte— aparecieron cuatro tablas en cero que tenían 1.253, 109,
  // 211 y 947 filas, y dos acciones que la pantalla ofrecía y el RLS negaba.
  //
  // Lo que este bloque fija es la parte que SÍ se puede fijar desde un test de
  // unidad: que ninguna acción ofrecida al mostrador escriba en una tabla que
  // la base le niega. La lista de la derecha es la de la migración
  // `20260903170000_el_rol_mostrador_puede_trabajar.sql`, copiada a mano a
  // propósito — si alguien la cambia allá y no acá, este test se cae y obliga a
  // mirar los dos lados.
  const acciones = accionesOng({
    entidad: null, pacientes: 5, lotes: [], asociados: [], cuotas: [],
  }).filter(a => PERMISOS_ROL.mostrador.includes(a.permiso)).map(a => a.id).sort()

  it('las seis del mostrador siguen siendo suyas', () => {
    for (const id of ['entregar', 'devolucion', 'lote', 'visita', 'reserva', 'retiro']) {
      expect(acciones).toContain(id)
    }
  })

  it('y las de plata también: es «cargar lo que cobrás, lo que gastás»', () => {
    for (const id of ['gasto', 'comprar', 'movimiento', 'documento']) {
      expect(acciones).toContain(id)
    }
  })

  it('cargar la lectura de ambiente, que es el paso 1', () => {
    expect(acciones).toContain('lectura')
  })

  it('NO crear una sala de ambiente: eso es armar la instalación', () => {
    // Pedía `ver_ambiente`, que el mostrador tiene. Se pasó a `editar_cultivo`
    // porque la policy de `ambiente_salas` no lo tiene a él, ni al director
    // médico, ni al auditor — los tres la veían y la base los rechazaba.
    expect(acciones).not.toContain('salaAmbiente')
  })

  it('NO emitir las cuotas del mes', () => {
    // Pedía `ver_plata`. Escribe en `ong_cuotas_emitidas`, cuya policy es
    // administrador, administrador_sistema y administrativo. De ahí el permiso
    // `editar_cuotas`, que copia esa lista exacta.
    expect(acciones).not.toContain('cobrar')
  })

  it('ni nada del cultivo, ni el seguimiento, ni lo institucional', () => {
    for (const id of ['plantas', 'genetica', 'riego', 'cosecha', 'floracion',
                      'seguimiento', 'acta', 'libro', 'asociado', 'entidad',
                      'autoridad', 'sumar']) {
      expect(acciones).not.toContain(id)
    }
  })
})

describe('editar_cuotas lo tienen exactamente los que la base autoriza', () => {
  // La policy de `ong_cuotas_emitidas` es administrador, administrador_sistema
  // y administrativo. Ni uno más ni uno menos: un permiso de pantalla sin
  // respaldo en la base es una acción que se ofrece y falla al guardar.
  it('los tres, y sólo los tres', () => {
    const conCuotas = (Object.keys(PERMISOS_ROL) as (keyof typeof PERMISOS_ROL)[])
      .filter(r => PERMISOS_ROL[r].includes('editar_cuotas')).sort()
    expect(conCuotas).toEqual(['administrador', 'administrador_sistema', 'administrativo'])
  })
})

describe('el permiso nuevo no le sacó nada a nadie', () => {
  // `ver_mostrador` SEPARA tres pestañas de `ver_institucional`. Si algún rol
  // que las tenía se quedó sin ellas, esto lo dice.
  const conInstitucional = (Object.keys(PERMISOS_ROL) as (keyof typeof PERMISOS_ROL)[])
    .filter(r => PERMISOS_ROL[r].includes('ver_institucional'))

  it('todos los que veían lo institucional siguen viendo el mostrador', () => {
    expect(conInstitucional.length).toBeGreaterThan(0)
    for (const rol of conInstitucional) {
      expect(PERMISOS_ROL[rol], `el rol ${rol} perdió el mostrador`).toContain('ver_mostrador')
    }
  })
})

describe('las acciones que Hugo puede hacer', () => {
  // Los tres botones que Cristian aprobó —cargar lote, dispensar/retirar,
  // registrar gasto— más lo que va con ellos. Se verifica por permiso y no por
  // nombre: los rótulos cambian, el criterio no.
  //
  // Se le pasa una instalación CON datos: varias acciones se ofrecen sólo si
  // hay lotes o pacientes, y con todo vacío la lista mentiría por otro motivo.
  const suyas = accionesOng({
    entidad: { razon_social: 'AC' } as never,
    pacientes: 3,
    lotes: [{ id: 'l1', codigo: 'LOT-1', gramos_totales: 100 }] as never,
    asociados: [],
    cuotas: [],
  }).filter(a => PERMISOS_ROL.mostrador.includes(a.permiso)).map(a => a.id)

  it('carga un lote, entrega, y anota la visita', () => {
    for (const id of ['lote', 'entregar', 'visita', 'retiro']) {
      expect(suyas, `le falta «${id}», que es de su trabajo`).toContain(id)
    }
  })

  it('pero no toca el estatuto ni el padrón institucional', () => {
    for (const id of ['acta', 'libro', 'autoridad', 'entidad', 'asociado']) {
      expect(suyas, `«${id}» no es del mostrador`).not.toContain(id)
    }
  })
})

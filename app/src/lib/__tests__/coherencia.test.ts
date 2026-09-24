// Tests de los cruces de Coherencia que se agregaron el 20 y 21/08/2026.
//
// Cada uno salió de contrastar la planilla de Panacea contra la base y encontrar
// algo que no daba. Son la única defensa contra que ese problema vuelva sin que
// nadie lo note, así que un cruce que deja de disparar es peor que no tenerlo:
// la pantalla dice "En regla" y el problema sigue.
//
// Se testea la rama que ENCUENTRA y la que NO. Un cruce que siempre dispara es
// ruido; uno que nunca dispara es decorado.

import { describe, it, expect } from 'vitest'
import {
  chequeosCoherencia, devolucionDeAporteNegativo, DONDE_SE_ARREGLA,
  credencialesDelPadron, diasHasta, DIAS_AVISO_CREDENCIAL,
  resumenCaja, asientosDeMovimientoInterno, revisarMovimientoInterno, asientoDePago,
  esSalidaSinPaciente, MODALIDAD_AJUSTE,
  type Chequeo, type Dispensa, type DocumentoONG, type PacienteCoherencia,
  type AsientoCaja,
} from '../ong'
import { fechaLocal } from '../fechaLocal'

/** Lo mínimo que la función exige. Cada test agrega sólo lo suyo. */
function correr(extra: Record<string, unknown> = {}): Chequeo[] {
  return chequeosCoherencia({
    entidad: null, actas: [], libros: [], asociados: [], categorias: [],
    cuotas: [], pacientes: 0, plantasFloracion: 0,
    ...extra,
  } as Parameters<typeof chequeosCoherencia>[0])
}

const buscar = (cs: Chequeo[], clave: string) => cs.find(c => c.clave === clave)

let n = 0
const disp = (o: Partial<Dispensa>): Dispensa =>
  ({ id: String(++n), fecha: '2026-08-01', gramos: 5, ...o }) as Dispensa

describe('beneficiarios_grafia', () => {
  it('detecta el mismo nombre escrito de dos formas', () => {
    // El caso real: Cristian y CRISTIAN sumaban por separado y el total por
    // beneficiario mostraba a la misma persona partida en dos.
    const c = buscar(correr({ beneficiarios: ['Cristian', 'CRISTIAN', 'Hugo'] }), 'beneficiarios_grafia')!
    expect(c.estado).toBe('alerta')
    expect(c.detalle).toContain('CRISTIAN')
  })

  it('no se queja cuando estan unificados', () => {
    const c = buscar(correr({ beneficiarios: ['Cristian', 'Hugo'] }), 'beneficiarios_grafia')!
    expect(c.estado).toBe('ok')
  })

  it('detecta nombres ABREVIADOS, no solo grafias', () => {
    // El caso real: "Damian" contra "Diego Ramirez" en los pagos. La versión
    // que sólo comparaba mayúsculas y acentos no lo veía. Se confirmó por la
    // orden de servicio, que nombra al proveedor.
    const c = buscar(correr({ beneficiarios: ['Diego', 'Diego Ramirez'] }), 'beneficiarios_grafia')!
    expect(c.estado).toBe('alerta')
    expect(c.detalle).toContain('Diego Ramirez')
  })

  it('NO confunde a dos personas con nombres parecidos', () => {
    // Sin exigir el corte en una palabra, "Ana" saldría como abreviatura de
    // "Anabela", que es otra persona.
    const c = buscar(correr({ beneficiarios: ['Ana', 'Anabela'] }), 'beneficiarios_grafia')!
    expect(c.estado).toBe('ok')
  })

  it('ignora N/A, que es el marcador de no-aplica de los gastos operativos', () => {
    // Si contara, "N/A" aparecería como una persona más.
    const c = buscar(correr({ beneficiarios: ['N/A', 'N/A', 'Hugo'] }), 'beneficiarios_grafia')!
    expect(c.estado).toBe('ok')
  })
})

describe('aporte_negativo', () => {
  it('marca los aportes negativos', () => {
    // Dos reales, -$30.000 en total. Un aporte es plata que entra.
    const ds = [disp({ aporte: -20000 }), disp({ aporte: -10000 }), disp({ aporte: 5000 })]
    const c = buscar(correr({ dispensas: ds }), 'aporte_negativo')!
    expect(c.estado).toBe('error')
    expect(c.valor).toContain('30.000')
  })

  it('en regla sin negativos', () => {
    const c = buscar(correr({ dispensas: [disp({ aporte: 5000 })] }), 'aporte_negativo')!
    expect(c.estado).toBe('ok')
  })
})

describe('credenciales_vencidas', () => {
  // Hasta el 27/08/2026 no hacía falta: 4 credenciales y ninguna cerca de
  // vencer. Ese día pasaron a 10, una ya vencida y dos venciendo el mismo día.
  // Un vencimiento no mueve ningún total —la misma gente, las mismas plantas—
  // así que ningún cruce que sume lo iba a ver.
  const dias = (n: number) => {
    const f = new Date()
    f.setDate(f.getDate() + n)
    // En hora local, igual que la app. Con toISOString, entre las 21 h y la
    // medianoche de Argentina «ayer» salia como hoy y este test fallaba de noche.
    return fechaLocal(f)
  }
  const pac = (o: Record<string, unknown>) =>
    ({ id: String(Math.random()), activo: true, ...o }) as PacienteCoherencia

  it('marca la vencida', () => {
    const c = buscar(correr({
      padron: [pac({ nombre_completo: 'Sergio Vera', reprocann_vencimiento: dias(-53) })],
    }), 'credenciales_vencidas')!
    expect(c.estado).toBe('error')
    expect(c.detalle).toContain('Sergio Vera')
  })

  it('avisa de la que está por vencer, todavía vigente', () => {
    // El punto entero: avisar cuando se puede hacer algo, no cuando ya no se le
    // puede entregar.
    const c = buscar(correr({
      padron: [pac({ nombre_completo: 'María Luz Argüello', reprocann_vencimiento: dias(40) })],
    }), 'credenciales_vencidas')!
    expect(c.estado).toBe('alerta')
    expect(c.valor).toContain('60 días')
  })

  it('la vencida gana sobre la que está por vencer', () => {
    // Con las dos cosas a la vez, lo urgente es lo que YA no cubre a nadie.
    const c = buscar(correr({
      padron: [pac({ reprocann_vencimiento: dias(-10) }), pac({ reprocann_vencimiento: dias(30) })],
    }), 'credenciales_vencidas')!
    expect(c.estado).toBe('error')
  })

  it('en regla cuando falta mucho', () => {
    const c = buscar(correr({
      padron: [pac({ reprocann_vencimiento: dias(1000) })],
    }), 'credenciales_vencidas')!
    expect(c.estado).toBe('ok')
  })

  it('NO mira el estado guardado, mira la fecha', () => {
    // `reprocann_estado` dice «Vigente» hasta que alguien entra a la ficha y lo
    // cambia, y nadie entra el día que se vence. Si el cruce creyera en el
    // estado, no detectaria nunca la primera vencida.
    const c = buscar(correr({
      padron: [pac({ reprocann_estado: 'Vigente', reprocann_vencimiento: dias(-1) })],
    }), 'credenciales_vencidas')!
    expect(c.estado).toBe('error')
  })

  it('ignora a los archivados', () => {
    // Una ficha dada de baja no recibe nada, asi que su credencial no importa.
    expect(buscar(correr({
      padron: [pac({ activo: false, reprocann_vencimiento: dias(-100) })],
    }), 'credenciales_vencidas')).toBeUndefined()
  })

  it('sin credenciales cargadas no opina', () => {
    // Es el estado del que se viene: sin fechas, el cruce diria «en regla» y eso
    // seria mentir por omision.
    expect(buscar(correr({ padron: [pac({ nombre_completo: 'Sin credencial' })] }), 'credenciales_vencidas'))
      .toBeUndefined()
  })
})

describe('lote_codigo_huerfano', () => {
  // `ong_dispensas` no guarda `lote_id`: engancha por `lote_codigo`, texto
  // contra texto. Por eso el vínculo se puede romper sin que nada falle, y por
  // eso hace falta un cruce que lo CUENTE. Es la misma lección de las entregas
  // en cero: un error que no mueve ningún total no lo detecta ningún cruce que
  // sume.
  const lote = (codigo: string) => ({ codigo, gramos_totales: 100 })

  it('marca la entrega que apunta a un lote que no existe', () => {
    const ds = [disp({ lote_codigo: 'LOTE-001' }), disp({ lote_codigo: 'LOTE-999' })]
    const c = buscar(correr({ dispensas: ds, lotes: [lote('LOTE-001')] }), 'lote_codigo_huerfano')!
    expect(c.estado).toBe('error')
    expect(c.detalle).toContain('LOTE-999')
  })

  it('en regla cuando todas encuentran su lote', () => {
    const c = buscar(correr({
      dispensas: [disp({ lote_codigo: 'LOTE-001' })], lotes: [lote('LOTE-001')],
    }), 'lote_codigo_huerfano')!
    expect(c.estado).toBe('ok')
  })

  it('no le importan las mayúsculas ni los espacios', () => {
    // Si comparara crudo, un lote guardado como `LOTE-001` y una entrega que
    // dice ` lote-001 ` se verían como huérfanos, y el cruce gritaría por algo
    // que para cualquiera que lo lea es el mismo lote.
    const c = buscar(correr({
      dispensas: [disp({ lote_codigo: ' lote-001 ' })], lotes: [lote('LOTE-001')],
    }), 'lote_codigo_huerfano')!
    expect(c.estado).toBe('ok')
  })

  it('la entrega sin lote no es asunto de este cruce', () => {
    // Que no declare lote es otra cosa, y de eso se ocupa el balance de materia.
    // Contarla acá haría que el cruce grite por un problema que no es el suyo.
    const c = buscar(correr({
      dispensas: [disp({ lote_codigo: null }), disp({ lote_codigo: 'LOTE-001' })],
      lotes: [lote('LOTE-001')],
    }), 'lote_codigo_huerfano')!
    expect(c.estado).toBe('ok')
    expect(c.valor).toContain('1 entrega')
  })

  it('sin lotes cargados no opina', () => {
    // Una instalación que todavía no cargó ningún lote tendría TODAS las
    // entregas como huérfanas, que es ruido y no un hallazgo.
    expect(buscar(correr({ dispensas: [disp({ lote_codigo: 'X' })], lotes: [] }), 'lote_codigo_huerfano'))
      .toBeUndefined()
  })
})

describe('entregas_sin_cantidad', () => {
  it('marca lo cobrado con cantidad en cero', () => {
    // 133 reales por $15,5M. Es la falla más cara: rompe el balance, el lote y
    // el cupo a la vez, y no la detecta ningún otro cruce porque sumar cero no
    // cambia ningún total.
    const ds = [
      disp({ aporte: 1000000, gramos: 0, unidad: 'g' }),
      disp({ aporte: 115710, gramos: 10, unidad: 'g' }),
    ]
    const c = buscar(correr({ dispensas: ds }), 'entregas_sin_cantidad')!
    expect(c.estado).toBe('error')
    expect(c.valor).toContain('1.000.000')
  })

  it('estima los gramos faltantes con el aporte por gramo de las sanas', () => {
    // 10 sanas a 11.571/g, y una en cero por 115.710 -> 10 g estimados.
    const ds = [
      ...Array.from({ length: 10 }, () => disp({ aporte: 115710, gramos: 10, unidad: 'g' })),
      disp({ aporte: 115710, gramos: 0, unidad: 'g' }),
    ]
    const c = buscar(correr({ dispensas: ds }), 'entregas_sin_cantidad')!
    expect(c.detalle).toContain('10 g')
  })

  it('no confunde una entrega sin aporte con una sin cantidad', () => {
    // Consumo interno y merma no aportan, y eso es normal.
    const c = buscar(correr({ dispensas: [disp({ aporte: 0, gramos: 0 })] }), 'entregas_sin_cantidad')!
    expect(c.estado).toBe('ok')
  })

  it('el saldo inicial y la merma NO son entregas, aunque lleven plata', () => {
    // Al 24/08/2026 el cruce marcaba seis filas que no eran entregas: los dos
    // asientos con que arrancó la caja del sistema —MIGRA-CAJA-EF y
    // MIGRA-CAJA-TRANSF, saldo inicial— y consumo interno y merma con aporte.
    // Ninguna va a una persona, y el cruce habla del cupo de 30 días «de esas
    // personas»: estaba contando lo que no entra en su propia definición.
    //
    // Un observable que marca lo que está bien enseña a ignorarlo.
    const ds = [
      disp({ aporte: 144000, gramos: 0, unidad: 'g', modalidad: 'Saldo inicial' }),
      disp({ aporte: 220000, gramos: 0, unidad: 'g', modalidad: 'Merma' }),
      disp({ aporte: 150000, gramos: 0, unidad: 'g', modalidad: 'Consumo interno' }),
    ]
    expect(buscar(correr({ dispensas: ds }), 'entregas_sin_cantidad')!.estado).toBe('ok')
  })

  it('pero una entrega A UNA PERSONA sin cantidad sigue siendo error', () => {
    const ds = [
      disp({ aporte: 144000, gramos: 0, unidad: 'g', modalidad: 'Saldo inicial' }),
      disp({ aporte: 200000, gramos: 0, unidad: 'g', modalidad: 'Paciente' }),
    ]
    const c = buscar(correr({ dispensas: ds }), 'entregas_sin_cantidad')!
    expect(c.estado).toBe('error')
    expect(c.valor).toContain('200.000')
  })
})

describe('movimiento_sin_clasificar', () => {
  // Al 09/09/2026 eran 55 filas en la base de Panacea, la más vieja de agosto de
  // 2025. Ninguna la acusaba ningún cruce: la plata está en la caja —37 de las
  // 38 con aporte tienen su asiento por el monto exacto— y el material entra al
  // balance, así que todos los totales cierran. Lo único que falta es saber qué
  // fueron, y eso no mueve ningún total.

  it('cuenta los que no dicen qué fueron', () => {
    const ds = [
      disp({ tipo_movimiento: 'entrega', gramos: 10, aporte: 100000 }),
      disp({ tipo_movimiento: null, gramos: 5, aporte: 60000 }),
    ]
    const c = buscar(correr({ dispensas: ds }), 'movimiento_sin_clasificar')!
    expect(c.estado).toBe('alerta')
    expect(c.valor).toContain('1 sin clasificar')
  })

  it('con todos clasificados dice que está en regla', () => {
    // La rama que NO encuentra. Un cruce que siempre dispara es ruido.
    const ds = [
      disp({ tipo_movimiento: 'entrega', gramos: 10, aporte: 100000 }),
      disp({ tipo_movimiento: 'consumo_interno', gramos: 5, aporte: 0 }),
    ]
    const c = buscar(correr({ dispensas: ds }), 'movimiento_sin_clasificar')!
    expect(c.estado).toBe('ok')
  })

  it('separa los tres grupos, porque son tres preguntas distintas', () => {
    // Sin el desglose son «42 filas raras». Con él, cada grupo va a alguien
    // distinto: el que tiene material y plata lo decide Panacea, y los vacíos
    // ya se revisaron el 24/08 y se dejaron así a propósito.
    const ds = [
      disp({ tipo_movimiento: null, gramos: 5, aporte: 60000 }),
      disp({ tipo_movimiento: null, gramos: 0, aporte: 280000 }),
      disp({ tipo_movimiento: null, gramos: 0, aporte: 0 }),
    ]
    const c = buscar(correr({ dispensas: ds }), 'movimiento_sin_clasificar')!
    expect(c.detalle).toContain('1 con material y plata')
    expect(c.detalle).toContain('1 con plata y sin material')
    expect(c.detalle).toContain('1 sin una cosa ni la otra')
  })

  it('informa los gramos y la plata que están en juego', () => {
    const ds = [
      disp({ tipo_movimiento: null, gramos: 100, aporte: 500000 }),
      disp({ tipo_movimiento: null, gramos: 35, aporte: 460800 }),
    ]
    const c = buscar(correr({ dispensas: ds }), 'movimiento_sin_clasificar')!
    expect(c.detalle).toContain('135 g')
    expect(c.detalle).toContain('960.800')
  })

  it('el desglose suma el total, aunque haya un caso que los grupos no prevén', () => {
    // Se vio en producción: la tarjeta decía «42 sin clasificar» y el desglose
    // sumaba 41. El que faltaba era el único con material y aporte NEGATIVO
    // —20/08/2026, 5 g, −$60.000—, que no entra en «con plata» ni en «sin plata
    // ni material». Un número que no cierra contra sí mismo en la misma tarjeta
    // enseña a desconfiar del cruce entero.
    const ds = [
      disp({ tipo_movimiento: null, gramos: 5, aporte: 60000 }),
      disp({ tipo_movimiento: null, gramos: 0, aporte: 280000 }),
      disp({ tipo_movimiento: null, gramos: 0, aporte: 0 }),
      disp({ tipo_movimiento: null, gramos: 5, aporte: -60000 }),
    ]
    const c = buscar(correr({ dispensas: ds }), 'movimiento_sin_clasificar')!
    expect(c.valor).toContain('4 sin clasificar')
    expect(c.detalle).toContain('1 con el aporte en negativo')
    // La invariante, medida y no supuesta: los números del desglose suman el total.
    const suma = [...(c.detalle ?? '').matchAll(/(\d+) con |(\d+) sin una/g)]
      .reduce((s, m) => s + Number(m[1] ?? m[2]), 0)
    expect(suma).toBe(4)
  })

  it('es una ALERTA y no un error: los datos están, falta declararlos', () => {
    // Un error manda a corregir algo que está mal. Acá no hay nada mal cargado:
    // hay algo que nadie declaró todavía, y quien lo declara es Panacea. Marcarlo
    // en rojo lo pondría al lado de la caja negativa, que sí es un problema.
    const c = buscar(correr({ dispensas: [disp({ tipo_movimiento: null })] }), 'movimiento_sin_clasificar')!
    expect(c.estado).toBe('alerta')
  })

  it('sin dispensas cargadas no opina', () => {
    expect(buscar(correr({ dispensas: [] }), 'movimiento_sin_clasificar')).toBeUndefined()
  })
})

describe('entregas_sin_reprocann', () => {
  const padron: PacienteCoherencia[] = [
    { id: 'p1', reprocann_nro: 'RP-1', reprocann_estado: 'En tramite' },
    { id: 'p2', reprocann_nro: null, reprocann_estado: 'Sin registro' },
  ]

  it('cuenta lo entregado a quien no tiene numero', () => {
    const ds = [
      disp({ paciente_id: 'p1', gramos: 50, unidad: 'g' }),
      disp({ paciente_id: 'p2', gramos: 150, unidad: 'g' }),
    ]
    const c = buscar(correr({ padron, dispensas: ds }), 'entregas_sin_reprocann')!
    expect(c.estado).toBe('error')
    expect(c.valor).toContain('75%')   // 150 de 200
  })

  it('En tramite CON numero cuenta como respaldo', () => {
    // Decisión de Panacea: quien tiene número ya inició el trámite y la dispensa
    // no se bloquea. Lo que se exige es el número, no el estado.
    const ds = [disp({ paciente_id: 'p1', gramos: 50, unidad: 'g' })]
    const c = buscar(correr({ padron, dispensas: ds }), 'entregas_sin_reprocann')!
    expect(c.estado).toBe('ok')
  })
})

describe('ficha_paciente', () => {
  it('avisa lo que le falta a la ficha', () => {
    const padron: PacienteCoherencia[] = [
      { id: 'p1', dni: '30000001', patologia: null, medico_tratante: null },
    ]
    const c = buscar(correr({ padron }), 'ficha_paciente')!
    expect(c.estado).toBe('alerta')
    expect(c.detalle).toContain('patología')
    expect(c.detalle).toContain('médico')
  })

  it('en regla con la ficha completa', () => {
    const padron: PacienteCoherencia[] = [
      { id: 'p1', dni: '30000001', patologia: 'Dolor cronico', medico_tratante: 'Dra. X' },
    ]
    expect(buscar(correr({ padron }), 'ficha_paciente')!.estado).toBe('ok')
  })
})

describe('ordenes_repetidas', () => {
  it('detecta un numero de orden usado dos veces', () => {
    // OS38 real: los pagos se ligan por número, así que con el número repetido
    // no se puede saber a cuál se le pagó.
    const docs = [
      { numero: 'OS38', fecha: '2025-09-06', monto: 88000 },
      { numero: 'OS38', fecha: '2025-09-15', monto: 72000 },
      { numero: 'OS39', fecha: '2025-09-20', monto: 10000 },
    ] as DocumentoONG[]
    const c = buscar(correr({ documentos: docs }), 'ordenes_repetidas')!
    expect(c.estado).toBe('alerta')
    expect(c.valor).toContain('OS38')
  })

  it('en regla con numeros unicos', () => {
    const docs = [{ numero: 'OS38' }, { numero: 'OS39' }] as DocumentoONG[]
    expect(buscar(correr({ documentos: docs }), 'ordenes_repetidas')!.estado).toBe('ok')
  })
})

describe('fechas_futuras', () => {
  it('marca lo fechado despues de hoy', () => {
    // OS59 estaba en 31/12/2026, cuatro meses adelante.
    const docs = [{ numero: 'OS59', fecha: '2099-12-31', monto: 1 }] as DocumentoONG[]
    const c = buscar(correr({ documentos: docs }), 'fechas_futuras')!
    expect(c.estado).toBe('alerta')
  })

  it('en regla con fechas pasadas', () => {
    const docs = [{ numero: 'OS1', fecha: '2020-01-01', monto: 1 }] as DocumentoONG[]
    expect(buscar(correr({ documentos: docs }), 'fechas_futuras')!.estado).toBe('ok')
  })
})

describe('lotes_sobregirados', () => {
  it('detecta que salio mas de lo que entro', () => {
    // KK-A190126 real: entraron 30 g y salieron 33.
    const lotes = [{ codigo: 'KK-A190126', gramos_totales: 30, unidad: 'g' }]
    const ds = [disp({ lote_codigo: 'KK-A190126', gramos: 33, unidad: 'g' })]
    const c = buscar(correr({ lotes, dispensas: ds }), 'lotes_sobregirados')!
    expect(c.estado).toBe('error')
    expect(c.valor).toContain('3 g')
  })

  it('en regla cuando el lote alcanza', () => {
    const lotes = [{ codigo: 'L1', gramos_totales: 30, unidad: 'g' }]
    const ds = [disp({ lote_codigo: 'L1', gramos: 20, unidad: 'g' })]
    expect(buscar(correr({ lotes, dispensas: ds }), 'lotes_sobregirados')!.estado).toBe('ok')
  })
})

describe('el orden de la pantalla', () => {
  it('pone los errores primero y los ok al final', () => {
    // Quien abre Coherencia tiene que ver lo roto sin scrollear.
    const cs = correr({
      dispensas: [disp({ aporte: -1 })],
      beneficiarios: ['Hugo'],
    })
    const orden = { error: 0, alerta: 1, sin_datos: 2, ok: 3 } as const
    const vals = cs.map(c => orden[c.estado])
    expect(vals).toEqual([...vals].sort((a, b) => a - b))
  })
})

// --- 21/08/2026: dos cruces que marcaban en rojo filas bien cargadas.
//
// Los dos daban el mismo síntoma —un número grande y alarmante en el panel— por
// la misma causa: comparar sin mirar de qué tipo de fila se trataba.

describe('dispensa_sin_paciente', () => {
  it('no cuenta consumo interno, merma ni saldo inicial', () => {
    // Estas tres descuentan stock igual que una entrega, pero no van a nadie:
    // pedirles paciente marcaba 184 filas correctas como error. En la planilla
    // venían con "CI", "Merma" y "SAI" en la columna de código de paciente.
    const c = buscar(correr({
      dispensas: [
        disp({ modalidad: 'Consumo interno' }),
        disp({ modalidad: 'Merma' }),
        disp({ modalidad: 'Saldo inicial' }),
      ],
    }), 'dispensa_sin_paciente')
    expect(c).toBeUndefined()
  })

  it('sigue marcando una entrega a paciente que quedó sin paciente', () => {
    const c = buscar(correr({
      dispensas: [disp({ modalidad: 'Paciente' })],
    }), 'dispensa_sin_paciente')!
    expect(c.estado).toBe('error')
    expect(c.valor).toBe('1')
  })
})

describe('dispensa_tope', () => {
  it('no cuenta las que no están medidas en gramos', () => {
    // El caso real: 50 unidades de "Programa REPROCANN" se leían como 50 g y
    // disparaban el tope de traslado, que es un límite en gramos de material.
    const c = buscar(correr({
      dispensas: [disp({ gramos: 50, unidad: 'u', paciente_id: 'p1' })],
    }), 'dispensa_tope')
    expect(c).toBeUndefined()
  })

  it('sigue marcando 50 g sin receta', () => {
    const c = buscar(correr({
      dispensas: [disp({ gramos: 50, unidad: 'g', paciente_id: 'p1' })],
    }), 'dispensa_tope')!
    expect(c.estado).toBe('alerta')
    expect(c.valor).toBe('1')
  })

  it('no marca 50 g cuando hay receta que lo respalda', () => {
    const c = buscar(correr({
      dispensas: [disp({ gramos: 50, unidad: 'g', con_receta: true, paciente_id: 'p1' })],
    }), 'dispensa_tope')
    expect(c).toBeUndefined()
  })

  it('no le pide receta a la merma ni al consumo interno', () => {
    // El tope mide lo que UNA PERSONA lleva encima. Una merma de 79 g y un
    // consumo interno de 58 g no van a nadie, así que exigirles receta no
    // significa nada. Estaban contando: el chequeo de al lado ya excluía las
    // salidas sin paciente y éste no, en el mismo bloque.
    const c = buscar(correr({
      dispensas: [
        disp({ gramos: 79, unidad: 'g', modalidad: 'Merma' }),
        disp({ gramos: 58, unidad: 'g', modalidad: 'Consumo interno' }),
        disp({ gramos: 45, unidad: 'g', modalidad: 'Saldo inicial' }),
      ],
    }), 'dispensa_tope')
    expect(c).toBeUndefined()
  })

  it('sí se lo pide a la retribución en especie, que va a una persona', () => {
    const c = buscar(correr({
      dispensas: [disp({ gramos: 72, unidad: 'g', modalidad: 'Retribución en especie',
                         paciente_id: 'p1' })],
    }), 'dispensa_tope')!
    expect(c.estado).toBe('alerta')
    expect(c.valor).toBe('1')
  })

  it('a la retribución no le manda a buscar una receta', () => {
    // Quien retira retribución en especie cobra por operar el cultivo, no
    // consume como paciente: pedirle "receta que respalde la necesidad
    // medicinal" lo manda a buscar un papel que nadie le va a dar. El tope se
    // le aplica igual, pero lo que corresponde respaldar es el traslado.
    const c = buscar(correr({
      dispensas: [disp({ gramos: 72, unidad: 'g', modalidad: 'Retribución en especie',
                         paciente_id: 'p1' })],
    }), 'dispensa_tope')!
    expect(c.detalle).toContain('documentación del traslado')
    expect(c.detalle).toContain('no hace falta receta')
  })

  it('cuando hay de las dos clases, dice cuántas son de cada una', () => {
    const c = buscar(correr({
      dispensas: [
        disp({ gramos: 100, unidad: 'g', modalidad: 'Paciente', paciente_id: 'p1' }),
        disp({ gramos: 95, unidad: 'g', modalidad: 'Paciente', paciente_id: 'p2' }),
        disp({ gramos: 72, unidad: 'g', modalidad: 'Retribución en especie', paciente_id: 'p3' }),
      ],
    }), 'dispensa_tope')!
    expect(c.valor).toBe('3')
    expect(c.detalle).toContain('2 son entregas a pacientes')
    expect(c.detalle).toContain('La otra es retribución')
  })

  it('sin retribución de por medio, el mensaje queda como estaba', () => {
    const c = buscar(correr({
      dispensas: [disp({ gramos: 100, unidad: 'g', modalidad: 'Paciente', paciente_id: 'p1' })],
    }), 'dispensa_tope')!
    expect(c.detalle).toContain('sin receta que respalde')
    expect(c.detalle).not.toContain('retribución')
  })
})

describe('fechas_futuras', () => {
  it('no marca el registro mensual del mes en curso', () => {
    // `emitirRegistrosMensuales` fecha el documento al CIERRE del período a
    // propósito, para que diga qué mes cubre. El del mes en curso queda con
    // fecha futura y está bien: marcarlo mandaba a buscar un año mal tipeado
    // que no existe.
    const enUnMes = new Date(Date.now() + 20 * 864e5).toLocaleDateString('en-CA')
    const c = buscar(correr({
      documentos: [{ id: 'd1', tipo: 'emitido', subtipo: 'Registro mensual',
                     fecha: enUnMes } as DocumentoONG],
    }), 'fechas_futuras')!
    expect(c.estado).toBe('ok')
  })

  it('sigue marcando un comprobante con fecha que todavía no llegó', () => {
    const enUnMes = new Date(Date.now() + 20 * 864e5).toLocaleDateString('en-CA')
    const c = buscar(correr({
      documentos: [{ id: 'd1', tipo: 'gasto', subtipo: 'Factura B',
                     fecha: enUnMes } as DocumentoONG],
    }), 'fechas_futuras')!
    expect(c.estado).toBe('alerta')
    expect(c.valor).toBe('1 registro')
  })
})

describe('ficha_paciente', () => {
  const pac = (o: Partial<PacienteCoherencia>): PacienteCoherencia =>
    ({ id: String(++n), ...o }) as PacienteCoherencia

  it('no cuenta las fichas dadas de baja', () => {
    // Al fusionar duplicados la ficha sobrante queda con activo=false. Contarla
    // como incompleta infla el número con trabajo que no existe: esa ficha no
    // se presenta a ningún lado.
    const c = buscar(correr({
      padron: [
        pac({ dni: '1', patologia: 'x', medico_tratante: 'y' }),
        pac({ activo: false }),
      ],
    }), 'ficha_paciente')!
    expect(c.estado).toBe('ok')
    expect(c.valor).toBe('1 fichas')
  })

  it('sigue marcando la ficha incompleta de un paciente activo', () => {
    const c = buscar(correr({
      padron: [pac({ dni: '1' })],
    }), 'ficha_paciente')!
    expect(c.estado).toBe('alerta')
    expect(c.valor).toBe('0 de 1')
    expect(c.detalle).toContain('sin patología')
  })
})

describe('devolucionDeAporteNegativo', () => {
  it('convierte el negativo en un egreso de caja por el valor absoluto', () => {
    // El caso real: PAC-184, dos entregas de 3 g cargadas con el reembolso en
    // negativo. La plata devuelta no figuraba en ningún libro, porque el
    // asiento en caja sólo mira los aportes positivos.
    const c = devolucionDeAporteNegativo(
      disp({ aporte: -20000, gramos: 3, lote_codigo: 'G-LEG8626', medio_pago: 'Efectivo' }))!
    expect(c.asiento.tipo).toBe('egreso')
    expect(c.asiento.concepto).toBe('Devolución de aporte')
    expect(c.asiento.monto).toBe(20000)
    expect(c.asiento.medio).toBe('Efectivo')
    expect(c.asiento.detalle).toContain('G-LEG8626')
  })

  it('deja la entrega sin aporte, para que no reste del total declarado', () => {
    const c = devolucionDeAporteNegativo(disp({ aporte: -10000, gramos: 3 }))!
    expect(c.aporteCorregido).toBe(0)
  })

  it('ata el egreso a la dispensa, para poder seguir la plata hasta su origen', () => {
    const d = disp({ aporte: -5000, gramos: 1 })
    expect(devolucionDeAporteNegativo(d)!.asiento.dispensa_id).toBe(d.id)
  })

  it('no toca un aporte positivo ni uno en cero', () => {
    expect(devolucionDeAporteNegativo(disp({ aporte: 15000 }))).toBeNull()
    expect(devolucionDeAporteNegativo(disp({ aporte: 0 }))).toBeNull()
    expect(devolucionDeAporteNegativo(disp({ aporte: null }))).toBeNull()
  })
})

describe('caja_negativa', () => {
  // El caso real de Panacea, 28/08/2026. Las trece facturas de luz —$700.000 por
  // mes durante un año— estaban cargadas sin medio de pago. Puestas en efectivo,
  // que es como se pagan, la caja quedó en −$9.076.000.
  //
  // El dato nuevo no está mal: lo que falta son los cobros que las financiaron.
  //
  // ⚠ EL MENSAJE DE ESTE CRUCE DECÍA ALGO FALSO hasta el 31/08/2026: «faltan
  // ingresos en efectivo por cargar». Medido contra la base: los aportes de las
  // entregas suman $63.518.539 y la caja tiene EXACTAMENTE $63.518.539 en
  // asientos ligados a una entrega, con CERO entregas cobradas sin asiento. No
  // faltaba ni un ingreso de dispensa, así que el cruce mandaba a una búsqueda
  // imposible — y un control que hace eso se aprende a ignorar.
  //
  // Hoy distingue las dos causas por el saldo TOTAL, que es lo que las separa.
  const asiento = (o: Partial<AsientoCaja>): AsientoCaja =>
    ({ id: String(++n), fecha: '2026-08-01', tipo: 'egreso', monto: 0, ...o }) as AsientoCaja

  it('marca error cuando el efectivo da negativo', () => {
    const c = buscar(correr({ caja: [
      { ...asiento({ tipo: 'ingreso', medio: 'Efectivo', monto: 24_000 }) },
      { ...asiento({ tipo: 'egreso', medio: 'Efectivo', monto: 9_100_000 }) },
    ] }), 'caja_negativa')
    expect(c?.estado).toBe('error')
    expect(c?.valor).toContain('9.076.000')
  })

  it('nombra cuánto hay sin discriminar, que es donde está la explicación', () => {
    const c = buscar(correr({ caja: [
      { ...asiento({ tipo: 'egreso', medio: 'Efectivo', monto: 1000 }) },
      { ...asiento({ tipo: 'ingreso', medio: 'Mixto', monto: 7_190_000 }) },
    ] }), 'caja_negativa')
    expect(c?.estado).toBe('error')
    expect(c?.detalle).toContain('7.190.000')
  })

  // Una cuenta bancaria SÍ puede quedar en descubierto, así que un negativo ahí
  // puede ser correcto. Marcarlo sería un falso positivo, y los falsos positivos
  // son lo que enseña a ignorar el panel entero.
  it('no marca nada si el negativo es en transferencia', () => {
    const c = buscar(correr({ caja: [
      { ...asiento({ tipo: 'egreso', medio: 'Transferencia', monto: 500_000 }) },
      { ...asiento({ tipo: 'ingreso', medio: 'Efectivo', monto: 1000 }) },
    ] }), 'caja_negativa')
    expect(c?.estado).toBe('ok')
  })

  it('sin libro de caja no dice nada', () => {
    expect(buscar(correr(), 'caja_negativa')).toBeUndefined()
  })

  // Las dos causas son distintas y llevan a trabajos distintos. Confundirlas es
  // lo que hacía el mensaje viejo.
  it('si el TOTAL también está en rojo, no culpa al reparto entre medios', () => {
    // Salió más de lo que entró: ningún asiento de medio de pago arregla eso, y
    // decir «faltan ingresos en efectivo» manda a buscar lo que no existe.
    const c = buscar(correr({ caja: [
      { ...asiento({ tipo: 'ingreso', medio: 'Efectivo', monto: 100 }) },
      { ...asiento({ tipo: 'egreso', medio: 'Efectivo', monto: 5_000 }) },
    ] }), 'caja_negativa')
    expect(c?.estado).toBe('error')
    expect(c?.detalle).toContain('saldo TOTAL')
    expect(c?.detalle).toContain('salió más de lo que entró')
    // Y NO puede seguir afirmando que faltan ingresos por cargar.
    expect(c?.detalle).not.toContain('Faltan ingresos en efectivo por cargar')
  })

  it('si el total está bien y sólo el efectivo está en rojo, es el reparto', () => {
    // La plata está: pasó del banco a la mano y nadie anotó la extracción.
    const c = buscar(correr({ caja: [
      { ...asiento({ tipo: 'ingreso', medio: 'Transferencia', monto: 900_000 }) },
      { ...asiento({ tipo: 'egreso', medio: 'Efectivo', monto: 500_000 }) },
    ] }), 'caja_negativa')
    expect(c?.estado).toBe('error')
    expect(c?.detalle).toContain('del banco a la mano')
    expect(c?.detalle).not.toContain('salió más de lo que entró')
  })
})

describe('pagos_sin_asiento', () => {
  // La red del arreglo del 01/09/2026: si el asiento vuelve a fallar, o alguien
  // carga un pago por SQL, la deuda baja y el saldo no se entera. Da cero cuando
  // todo está bien, y ésa es la gracia.
  const pg = (o: Record<string, unknown>) =>
    ({ id: 'x', proveedor: 'Graciela', fecha: '2026-09-05', monto: 100_000, ...o })
  const asi = (o: Record<string, unknown>) =>
    ({ id: 'a', fecha: '2026-09-05', tipo: 'egreso', monto: 100_000, concepto: 'Pago a Graciela', ...o }) as AsientoCaja

  it('marca el pago que no salió de la caja', () => {
    const c = buscar(correr({
      pagosProveedor: [pg({ id: 'p1' })],
      caja: [asi({ id: 'a1' })],          // sin `pago_id`: no está enganchado
      fechaCorte: '2026-08-29',
    }), 'pagos_sin_asiento')
    expect(c?.estado).toBe('error')
    expect(c?.detalle).toContain('no salió de la caja')
  })

  it('no marca nada cuando el pago tiene su asiento', () => {
    const c = buscar(correr({
      pagosProveedor: [pg({ id: 'p1' })],
      caja: [asi({ id: 'a1', pago_id: 'p1' })],
      fechaCorte: '2026-08-29',
    }), 'pagos_sin_asiento')
    expect(c?.estado).toBe('ok')
  })

  it('NO marca el pago del DIA del corte: su plata ya está en la apertura', () => {
    // ⚠ EL CASO REAL. El 01/09/2026 este cruce marcó un pago de $40.000 del
    // 29/08 —el día del corte— y lo que pedía era agregarle su asiento. Hacerlo
    // habría dejado la caja en $150.000 contra los $190.000 que declara el
    // Consolidado: el control mandando a romper el número que debería cuidar.
    //
    // Por eso es `>` y no `>=`: todo lo anterior al corte INCLUIDO ya está
    // absorbido en el saldo de apertura.
    const c = buscar(correr({
      pagosProveedor: [pg({ id: 'delCorte', fecha: '2026-08-29', monto: 40_000 })],
      caja: [asi({ id: 'a1' })],
      fechaCorte: '2026-08-29',
    }), 'pagos_sin_asiento')
    expect(c?.estado).toBe('ok')
  })

  it('NO marca los 161 pagos anteriores al corte', () => {
    // Vienen de la planilla y su plata ya está en la caja por la importación,
    // con un match que no es uno a uno. Marcarlos sería un falso positivo
    // permanente — y los falsos positivos son lo que enseña a ignorar el panel.
    const c = buscar(correr({
      pagosProveedor: [pg({ id: 'viejo', fecha: '2026-02-17' })],
      caja: [asi({ id: 'a1' })],
      fechaCorte: '2026-08-29',
    }), 'pagos_sin_asiento')
    expect(c?.estado).toBe('ok')
  })

  it('sin corte cargado se cruzan todos, que es lo correcto para una instalación nueva', () => {
    const c = buscar(correr({
      pagosProveedor: [pg({ id: 'p1', fecha: '2026-02-17' })],
      caja: [asi({ id: 'a1' })],
    }), 'pagos_sin_asiento')
    expect(c?.estado).toBe('error')
  })

  it('sin pagos cargados no dice nada', () => {
    expect(buscar(correr({ caja: [asi({ id: 'a1' })] }), 'pagos_sin_asiento')).toBeUndefined()
  })
})

describe('asientoDePago', () => {
  // POR QUE EXISTE: `registrarPago` guardaba el pago a proveedor y NO escribía
  // nada en la caja. Pagarle a alguien desde la app bajaba la deuda y la plata
  // nunca salía del libro. Los $25,2M de «Pago a …» que sí están en la caja
  // entraron por la importación de la planilla, no por la app — así que cuanto
  // más se usara la app, más se separaban la deuda y el saldo.

  const pago = {
    id: 'p1', proveedor: 'Graciela', fecha: '2026-09-01', monto: 150_000,
    medio: 'Efectivo', orden_servicio: 'OS109', referencia: 'P-FORM-200',
  }

  it('es un EGRESO por el importe del pago', () => {
    const a = asientoDePago(pago)
    expect(a.tipo).toBe('egreso')
    expect(a.monto).toBe(150_000)
    expect(a.medio).toBe('Efectivo')
  })

  it('sigue la convención de concepto de los 157 asientos ya importados', () => {
    // Si inventara una categoría propia, los pagos nuevos caerían en un rubro
    // distinto que los viejos en Estadísticas y el total por proveedor se
    // partiría en dos sin que nadie lo pida.
    expect(asientoDePago(pago).concepto).toBe('Pago a Graciela')
  })

  it('queda enganchado al pago, que es lo que evita el huérfano', () => {
    expect(asientoDePago(pago).pago_id).toBe('p1')
  })

  it('un importe negativo no le SUMA plata a la caja', () => {
    // El signo lo da `tipo`, no el número. Un egreso de −150.000 sumaría al
    // saldo en vez de restarlo.
    const a = asientoDePago({ ...pago, monto: -150_000 })
    expect(a.tipo).toBe('egreso')
    expect(a.monto).toBe(150_000)
  })

  it('el detalle deja el rastro de contra qué orden se pagó', () => {
    expect(asientoDePago(pago).detalle).toContain('OS109')
    expect(asientoDePago(pago).detalle).toContain('P-FORM-200')
    // Y sin orden ni referencia no inventa un detalle vacío con separadores.
    expect(asientoDePago({ ...pago, orden_servicio: null, referencia: null }).detalle).toBeNull()
  })

  it('el asiento RESTA del saldo, que es todo el punto', () => {
    const r = resumenCaja([
      { id: 'a', fecha: '2026-09-01', tipo: 'ingreso', medio: 'Efectivo', monto: 200_000 },
      { id: 'b', ...asientoDePago(pago) },
    ] as AsientoCaja[])
    expect(r.neto).toBe(50_000)
    expect(r.netoEfectivo).toBe(50_000)
  })
})

describe('movimiento interno', () => {
  // POR QUE EXISTE: la caja de efectivo de Panacea daba −$10,2M, que es
  // físicamente imposible. Medido: CINCO asientos de traspaso en trece meses por
  // $692.000, contra $9,1M de facturas de luz que se pagan en efectivo. Ese
  // efectivo salió del banco y esa extracción no la anotó nadie — porque
  // anotarla eran dos asientos a mano con el mismo importe.
  //
  // EL INVARIANTE es lo que hace segura a la pantalla: mueve el REPARTO entre
  // medios y NUNCA el total. Desde ahí no se puede inventar un ingreso ni tapar
  // un déficit, que es justo lo que no hay que poder hacer desde un formulario.

  const mov = { fecha: '2026-09-01', desde: 'Transferencia', hacia: 'Efectivo',
                monto: 700_000 } as const

  it('son DOS asientos: uno que sale y otro que entra', () => {
    const par = asientosDeMovimientoInterno(mov)
    expect(par).toHaveLength(2)
    expect(par[0]).toMatchObject({ tipo: 'egreso', medio: 'Transferencia', monto: 700_000 })
    expect(par[1]).toMatchObject({ tipo: 'ingreso', medio: 'Efectivo', monto: 700_000 })
  })

  it('NO cambia el total, y sí cambia el reparto', () => {
    const antes = resumenCaja([
      { id: 'a', fecha: '2026-08-01', tipo: 'ingreso', medio: 'Transferencia', monto: 1_000_000 },
      { id: 'b', fecha: '2026-08-02', tipo: 'egreso', medio: 'Efectivo', monto: 700_000 },
    ] as AsientoCaja[])
    const despues = resumenCaja([
      { id: 'a', fecha: '2026-08-01', tipo: 'ingreso', medio: 'Transferencia', monto: 1_000_000 },
      { id: 'b', fecha: '2026-08-02', tipo: 'egreso', medio: 'Efectivo', monto: 700_000 },
      ...asientosDeMovimientoInterno(mov).map((x, i) => ({ id: 'm' + i, ...x })),
    ] as AsientoCaja[])

    // El total, intacto. Es el invariante.
    expect(despues.neto).toBe(antes.neto)
    // Y la caja de efectivo, que estaba en imposible, deja de estarlo.
    expect(antes.netoEfectivo).toBe(-700_000)
    expect(despues.netoEfectivo).toBe(0)
    expect(despues.netoTransferencia).toBe(antes.netoTransferencia - 700_000)
  })

  it('un importe negativo no puede sacarle plata al total', () => {
    // Si alguien escribe −700.000 esperando invertir el sentido, el par tiene
    // que seguir sumando cero en vez de restar 1,4 millones.
    const par = asientosDeMovimientoInterno({ ...mov, monto: -700_000 })
    const r = resumenCaja(par.map((x, i) => ({ id: 'z' + i, ...x })) as AsientoCaja[])
    expect(r.neto).toBe(0)
    expect(par.every(x => Number(x.monto) >= 0)).toBe(true)
  })

  it('no deja mover plata del mismo medio al mismo medio', () => {
    // Serían dos asientos que se anulan y ensucian un libro de 1.700 filas sin
    // decir nada.
    expect(revisarMovimientoInterno({ ...mov, hacia: 'Transferencia' })).toContain('distintos')
    expect(revisarMovimientoInterno({ ...mov, monto: 0 })).toContain('cuánto')
    expect(revisarMovimientoInterno(mov)).toBeNull()
  })
})

describe('DONDE_SE_ARREGLA', () => {
  // El panel dice qué no cierra; el mapa dice dónde se arregla. Un cruce sin
  // destino queda mudo: te avisa del problema y no te lleva a ninguna parte,
  // que es justo lo que hacía antes el panel entero.
  //
  // Se corre sobre una entidad vacía a propósito: así disparan casi todos los
  // controles y el test ve la lista larga, no tres.
  const todosLosChequeos = () => [
    ...correr(),
    ...correr({ entidad: { id: 'e', razon_social: 'X' } as never }),
    ...correr({ dispensas: [disp({ aporte: -1 }), disp({ gramos: 99, paciente_id: 'p' })] }),
    ...correr({ documentos: [{ id: 'd', tipo: 'gasto', numero: 'A', fecha: '2020-01-01' } as DocumentoONG] }),
    ...correr({ padron: [{ id: 'p1' } as PacienteCoherencia] }),
    ...correr({ traslados: [{ id: 't', fecha: '2026-01-01' } as never] }),
    ...correr({ ddjj: [], pacientes: 1, plantasFloracion: 99 }),
    ...correr({ caja: [{ id: 'c', fecha: '2026-08-01', tipo: 'egreso', medio: 'Efectivo', monto: 1 }] }),
  ]

  it('todos los cruces saben dónde se arreglan', () => {
    const sinDestino = [...new Set(todosLosChequeos().map(c => c.clave))]
      .filter(k => !DONDE_SE_ARREGLA[k])
    expect(sinDestino).toEqual([])
  })

  it('ningún destino apunta a una pestaña que no existe', () => {
    const TABS = ['estado', 'coherencia', 'pacientes', 'cupo', 'portal', 'dispensas',
      'seguimiento', 'declaraciones', 'documentos', 'movimientos', 'economia',
      'proveedores', 'libros', 'actas', 'asociados', 'entidad', 'autoridades', 'predios']
    // La pestaña es lo que va antes del `?`. Un destino puede llevar parámetros
    // —`/ong/portal?vista=catalogo` elige la solapa de adentro— y eso no lo
    // convierte en otra pestaña: es la misma convención que usan las rutas de
    // `accionesOng`, donde el portal abre en Reservas si nadie pide otra cosa.
    const pestana = (ruta: string) => ruta.slice('/ong/'.length).split('?')[0]
    const malas = Object.entries(DONDE_SE_ARREGLA)
      .filter(([, d]) => d.ruta.startsWith('/ong/'))
      .filter(([, d]) => !TABS.includes(pestana(d.ruta)))
      .map(([k, d]) => `${k} -> ${d.ruta}`)
    expect(malas).toEqual([])
  })

  it('todos los destinos tienen un texto para el link', () => {
    const mudos = Object.entries(DONDE_SE_ARREGLA)
      .filter(([, d]) => !d.donde.trim()).map(([k]) => k)
    expect(mudos).toEqual([])
  })
})

describe('orden de Coherencia', () => {
  it('la gravedad manda: los errores van antes que las alertas', () => {
    const cs = correr({
      dispensas: [disp({ aporte: -1 })],                       // error
      documentos: [{ id: 'd', tipo: 'gasto', numero: 'A',
                     fecha: '2020-01-01' } as DocumentoONG],
    })
    const estados = cs.map(c => c.estado)
    const orden = { error: 0, alerta: 1, sin_datos: 2, ok: 3 }
    const ordenados = [...estados].sort((a, b) => orden[a] - orden[b])
    expect(estados).toEqual(ordenados)
  })

  it('dentro de la misma gravedad, primero lo que habilita al resto', () => {
    // Sin la entidad cargada, el CUIT tiene que aparecer ANTES que las actas:
    // un acta redactada sin CUIT sale con [CUIT] entre corchetes y hay que
    // rehacerla. Ordenar sólo por gravedad las mezclaba.
    const errores = correr({ asociados: [{ id: 'a', nombre: 'X', activo: true } as never] })
      .filter(c => c.estado === 'error')
      .map(c => DONDE_SE_ARREGLA[c.clave]?.paso ?? 99)
    const ordenados = [...errores].sort((a, b) => a - b)
    expect(errores).toEqual(ordenados)
  })

  it('todos los destinos declaran su paso', () => {
    const sinPaso = Object.entries(DONDE_SE_ARREGLA)
      .filter(([, d]) => typeof d.paso !== 'number').map(([k]) => k)
    expect(sinPaso).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// El código de vinculación y quién sacó su REPROCANN antes que la ONG.
//
// Los dos salieron del caso real de Cultivando Salud Chaco (26/08/2026): las
// cuatro credenciales cargadas decían «Paciente con autocultivo», ninguna
// nombraba a la asociación, y el código de vinculación estaba sin cargar.

// EL CODIGO ES DE CADA PERSONA, NO DE LA ENTIDAD (corregido el 02/09/2026).
//
// Estos tests fijaban el modelo al reves: uno solo, en `ong_entidad`, que la
// asociacion le pasaba a la gente. Lo corrigio Panacea — cada uno saca el suyo
// en Mi Argentina y se lo da a la asociacion. No se «arreglaron» los tests
// para que pasaran: cambio lo que el sistema afirma, y con eso lo que hay que
// verificar.
describe('codigo_vinculacion', () => {
  const conCodigo = { id: 'a', nombre_completo: 'Ana', activo: true, codigo_vinculacion: 'VIN-1' }
  const sinCodigo = { id: 'b', nombre_completo: 'Beto', activo: true }

  it('los que faltan se cuentan, y se dice quiénes son', () => {
    const c = buscar(correr({ padron: [conCodigo, sinCodigo] }), 'codigo_vinculacion')!
    expect(c.estado).toBe('error')
    expect(c.valor).toBe('faltan 1 de 2')
    expect(c.detalle).toContain('Beto')
  })

  it('con todos cargados queda ok', () => {
    const c = buscar(correr({ padron: [conCodigo] }), 'codigo_vinculacion')!
    expect(c.estado).toBe('ok')
    expect(c.valor).toBe('1 de 1')
  })

  it('un código con espacios de más no cuenta como cargado', () => {
    const c = buscar(correr({ padron: [{ ...conCodigo, codigo_vinculacion: '   ' }] }), 'codigo_vinculacion')!
    expect(c.estado).toBe('error')
  })

  it('una ficha archivada no espera vincularse: no cuenta', () => {
    const c = buscar(correr({ padron: [conCodigo, { ...sinCodigo, activo: false }] }), 'codigo_vinculacion')!
    expect(c.estado).toBe('ok')
  })

  it('sin padrón cargado el cruce no aparece, en vez de decir cero', () => {
    // Un «0 de 0» se leería como que están todos, que es lo contrario de lo
    // que pasa cuando el padrón todavía no se cargó.
    expect(buscar(correr({ padron: [] }), 'codigo_vinculacion')).toBeUndefined()
  })

  it('se arregla en Pacientes, que es donde vive el código de cada uno', () => {
    expect(DONDE_SE_ARREGLA.codigo_vinculacion.ruta).toBe('/ong/pacientes')
  })
})

describe('reprocann_previo_a_la_ong', () => {
  // Las cuatro fechas son las de las credenciales reales de Chaco, y la
  // inscripción de la entidad es la que figura en su ficha.
  const entidad = { razon_social: 'AC', reprocann_inscripcion: '2026-07-23' }
  const pac = (nombre: string, emision: string | null): PacienteCoherencia =>
    ({ id: nombre, nombre_completo: nombre, activo: true, reprocann_emision: emision })

  it('marca a quienes tramitaron antes de que la entidad existiera en REPROCANN', () => {
    const c = buscar(correr({
      entidad,
      padron: [
        pac('Juan Carlos Monzón', '2025-12-19'),
        pac('Gonzalo Javier González', '2026-05-30'),
        pac('Nelson Ávalos', '2026-06-02'),
        pac('Aníbal Fabian Suarez', '2026-06-04'),
      ],
    }), 'reprocann_previo_a_la_ong')!
    expect(c.estado).toBe('error')
    expect(c.valor).toBe('4 personas')
    expect(c.detalle).toContain('Monzón')
  })

  // Es la diferencia que cambia el mensaje que se le manda a esa persona.
  it('dice MODIFICAR el trámite, no rehacerlo', () => {
    const c = buscar(correr({
      entidad, padron: [pac('Alguien', '2026-01-01')],
    }), 'reprocann_previo_a_la_ong')!
    expect(c.detalle).toMatch(/no tienen que rehacer/i)
    expect(c.detalle).toMatch(/MODIFICARLO/)
  })

  it('quien tramitó despues no cuenta', () => {
    const c = buscar(correr({
      entidad, padron: [pac('Posterior', '2026-08-01')],
    }), 'reprocann_previo_a_la_ong')!
    expect(c.estado).toBe('ok')
  })

  it('los dados de baja no cuentan', () => {
    const c = buscar(correr({
      entidad,
      padron: [{ id: 'x', nombre_completo: 'Baja', activo: false, reprocann_emision: '2026-01-01' }],
    }), 'reprocann_previo_a_la_ong')!
    expect(c.estado).toBe('ok')
  })

  // Sin la fecha de inscripción no hay contra qué comparar: el cruce no corre en
  // vez de inventar un resultado.
  it('no corre si la entidad no tiene fecha de inscripcion', () => {
    const c = buscar(correr({
      entidad: { razon_social: 'AC' }, padron: [pac('Alguien', '2026-01-01')],
    }), 'reprocann_previo_a_la_ong')
    expect(c).toBeUndefined()
  })
})

// El estado de las credenciales del padron.
//
// Se prueba aparte del cruce porque ahora lo leen DOS pantallas: Coherencia y
// el Panel. `hoy` entra por parametro justamente para esto — un test que
// dependa del reloj pasa hoy y falla en noviembre.
//
// Las fechas son las diez credenciales reales de Chaco al 27/08/2026.
describe('credencialesDelPadron', () => {
  const HOY = '2026-08-27'
  const pac = (id: string, nombre: string, vence: string | null, activo = true): PacienteCoherencia =>
    ({ id, nombre_completo: nombre, reprocann_vencimiento: vence, activo })

  const PADRON = [
    pac('9', 'Varela', '2026-07-05'),        // vencida hace 53 dias
    pac('18', 'Lanjinestra', '2026-11-01'),  // 66 dias
    pac('11', 'Arguello', '2026-11-01'),     // 66 dias
    pac('13', 'Vargas', '2029-05-19'),
    pac('29', 'Gomez Bresla', '2027-06-28'),
    pac('99', 'Sin credencial', null),
  ]

  it('encuentra la vencida y no cuenta a la que no tiene credencial', () => {
    const r = credencialesDelPadron(PADRON, HOY)
    expect(r.vencidas.map(p => p.nombre_completo)).toEqual(['Varela'])
    expect(r.conVencimiento).toHaveLength(5)
  })

  it('las del 01/11 TODAVIA no entran en la ventana de aviso', () => {
    // Es el caso real y es facil equivocarse leyendolo: faltan 66 dias y la
    // ventana es de 60. El aviso no esta roto, todavia no le toca.
    const r = credencialesDelPadron(PADRON, HOY)
    expect(r.porVencer).toEqual([])
    expect(diasHasta('2026-11-01', HOY)).toBe(66)
  })

  it('entran cuando faltan exactamente los dias del aviso', () => {
    const r = credencialesDelPadron(PADRON, '2026-09-02')
    expect(diasHasta('2026-11-01', '2026-09-02')).toBe(DIAS_AVISO_CREDENCIAL)
    expect(r.porVencer.map(p => p.nombre_completo).sort()).toEqual(['Arguello', 'Lanjinestra'])
  })

  it('una ficha dada de baja no avisa', () => {
    // Su credencial se vence igual, pero ya no se le entrega nada: avisarlo
    // seria mandar a renovar un tramite que no hace falta.
    const r = credencialesDelPadron([pac('1', 'De baja', '2026-01-01', false)], HOY)
    expect(r.vencidas).toEqual([])
    expect(r.conVencimiento).toEqual([])
  })

  it('la que se vence HOY cuenta como vigente, no como vencida', () => {
    // El dia del vencimiento la credencial todavia vale.
    const r = credencialesDelPadron([pac('1', 'Justo hoy', HOY)], HOY)
    expect(r.vencidas).toEqual([])
    expect(r.porVencer.map(p => p.nombre_completo)).toEqual(['Justo hoy'])
    expect(diasHasta(HOY, HOY)).toBe(0)
  })

  it('sin padron no rompe', () => {
    expect(credencialesDelPadron(undefined, HOY).conVencimiento).toEqual([])
  })
})

describe('diasHasta', () => {
  it('cuenta para atras cuando ya paso', () => {
    expect(diasHasta('2026-07-05', '2026-08-27')).toBe(-53)
  })
  it('ignora la hora que venga pegada a la fecha', () => {
    expect(diasHasta('2026-11-01T18:30:00', '2026-08-27')).toBe(66)
  })
})

// La deuda de trazabilidad: material propio que nunca se trazo a una cosecha.
//
// Sale del caso de Panacea: 4.722 g de produccion propia cargados como compra a
// si mismos, porque la planilla de origen no tenia el concepto de cultivo
// propio. Marcarlos `propio` los sacaba del ingreso —su cosecha «ya estaria
// contada»— y el stock quedaba en -4.453 g. `propio_sin_cosecha` afirma solo lo
// que se puede afirmar: es nuestro y la cosecha no se registro.
describe('origen_sin_trazar', () => {
  const lote = (o: Record<string, unknown>) =>
    ({ codigo: 'L1', gramos_totales: 100, unidad: 'g', ...o })

  it('cuenta los lotes propios sin cosecha y sus gramos', () => {
    const c = buscar(correr({
      lotes: [lote({ codigo: 'A', origen: 'propio_sin_cosecha', gramos_totales: 4722 }),
              lote({ codigo: 'B', origen: 'comprado' })],
    }), 'origen_sin_trazar')!
    expect(c.estado).toBe('alerta')
    expect(c.valor).toContain('1 lote')
    expect(c.detalle).toContain('4.722')
  })

  it('no opina cuando no hay ninguno', () => {
    // Es el caso normal y el de Chaco: sin lotes en ese estado, el cruce no
    // aparece en absoluto en vez de decir «en regla» sobre algo que no existe.
    expect(buscar(correr({ lotes: [lote({ origen: 'comprado' })] }), 'origen_sin_trazar'))
      .toBeUndefined()
    expect(buscar(correr({ lotes: [] }), 'origen_sin_trazar')).toBeUndefined()
  })

  it('es ALERTA y no error', () => {
    // El dato esta declarado con honestidad; lo que falta es completar la
    // cadena hacia atras, y eso no se hace en un dia. Un error rojo permanente
    // sobre algo que no se arregla hoy deja de leerse.
    const c = buscar(correr({ lotes: [lote({ origen: 'propio_sin_cosecha' })] }), 'origen_sin_trazar')!
    expect(c.estado).toBe('alerta')
  })

  it('solo suma gramos de lo que se mide en gramos', () => {
    // El aceite se cuenta en frascos: sumarlo daria un numero que no significa
    // nada, el mismo criterio que balanceMateria.
    const c = buscar(correr({
      lotes: [lote({ origen: 'propio_sin_cosecha', gramos_totales: 50, unidad: 'g' }),
              lote({ codigo: 'C', origen: 'propio_sin_cosecha', gramos_totales: 900, unidad: 'u' })],
    }), 'origen_sin_trazar')!
    expect(c.valor).toContain('2 lotes')
    expect(c.detalle).toContain('50 g')
  })

  // La fecha de corte. Antes esto era una alerta que no se podia apagar nunca:
  // la cosecha de un material que ya se entrego y se consumio no se registra
  // despues sin inventar de que plantas salio. Un aviso que no se puede apagar
  // deja de leerse, y tapa al que si importa.
  it('lo anterior al corte queda EN REGLA, con constancia', () => {
    const c = buscar(correr({
      lotes: [lote({ origen: 'propio_sin_cosecha', fecha_elaboracion: '2026-08-21',
                     gramos_totales: 4837 })],
    }), 'origen_sin_trazar')!
    expect(c.estado).toBe('ok')
    expect(c.valor).toContain('constancia')
    expect(c.detalle).toContain('4.837')
  })

  // Y que no se lea como amnistia: uno posterior al corte sigue saltando, y el
  // detalle nombra los dos grupos por separado en vez de sumarlos.
  it('uno posterior al corte sigue saltando aunque haya anteriores', () => {
    const c = buscar(correr({
      lotes: [lote({ codigo: 'A', origen: 'propio_sin_cosecha', fecha_elaboracion: '2026-08-21',
                     gramos_totales: 4837 }),
              lote({ codigo: 'B', origen: 'propio_sin_cosecha', fecha_elaboracion: '2026-08-27',
                     gramos_totales: 120 })],
    }), 'origen_sin_trazar')!
    expect(c.estado).toBe('alerta')
    expect(c.valor).toContain('1 lote')
    expect(c.detalle).toContain('120 g')
    expect(c.detalle).toContain('4.837')
  })
})

// De que lote salio cada entrega. Es lo que `lote_codigo_huerfano` deja afuera
// a proposito: aquel mira las que DECLARAN un lote y no lo encuentran, esta las
// que no declaran ninguno.
describe('entrega_sin_lote', () => {
  const ent = (o: Record<string, unknown>) =>
    ({ id: 'D1', fecha: '2026-08-27', gramos: 5, lote_codigo: 'CO-01', ...o })

  it('en regla cuando todas dicen su lote', () => {
    const c = buscar(correr({ dispensas: [ent({})] }), 'entrega_sin_lote')!
    expect(c.estado).toBe('ok')
  })

  it('lo anterior al corte queda en regla, con constancia', () => {
    const c = buscar(correr({
      dispensas: [ent({ fecha: '2025-10-22', lote_codigo: null })],
    }), 'entrega_sin_lote')!
    expect(c.estado).toBe('ok')
    expect(c.valor).toContain('constancia')
  })

  // El caso real de Panacea: 7 de la planilla y una del 24/08/2026. Que quede
  // UNA en falta es la prueba de que el corte no es una amnistia.
  it('una posterior al corte salta, y dice cuantas llevan constancia', () => {
    const c = buscar(correr({
      dispensas: [ent({ id: 'A', fecha: '2025-10-22', lote_codigo: null }),
                  ent({ id: 'B', fecha: '2026-01-30', lote_codigo: null }),
                  ent({ id: 'C', fecha: '2026-08-24', lote_codigo: null })],
    }), 'entrega_sin_lote')!
    expect(c.estado).toBe('error')
    expect(c.valor).toContain('1 entrega')
    expect(c.detalle).toContain('2 entregas')
    // Concordancia: con UNA es «no dice», no «no dicen». Salio en vivo.
    expect(c.detalle).toContain('no dice de qué lote')
  })

  it('con varias en falta concuerda en plural', () => {
    const c = buscar(correr({
      dispensas: [ent({ id: 'A', fecha: '2026-08-24', lote_codigo: null }),
                  ent({ id: 'B', fecha: '2026-08-25', lote_codigo: null })],
    }), 'entrega_sin_lote')!
    expect(c.detalle).toContain('2 entregas posteriores')
    expect(c.detalle).toContain('no dicen de qué lote')
  })
})

// El punto ciego del cruce de vencidas.
//
// `credenciales_vencidas` mira la FECHA y no el estado guardado, que es lo
// correcto. Pero por eso mismo no ve nada de lo que no tiene fecha: en Panacea,
// al 27/08/2026, las 65 fichas que declaran «Vigente» tienen numero de
// REPROCANN y NINGUNA tiene vencimiento. El cruce de vencidas ni aparecia, y la
// pantalla se leia como si no hubiera nada que mirar.
describe('credencial_sin_fecha', () => {
  const pac = (o: Record<string, unknown>) =>
    ({ id: String(Math.random()), activo: true, ...o }) as PacienteCoherencia

  it('marca las que dicen Vigente y no tienen fecha', () => {
    const c = buscar(correr({
      padron: [pac({ reprocann_estado: 'Vigente' }),
               pac({ reprocann_estado: 'Vigente', reprocann_vencimiento: '2029-01-01' })],
    }), 'credencial_sin_fecha')!
    expect(c.estado).toBe('error')
    expect(c.valor).toContain('1 sin vencimiento')
    expect(c.detalle).toContain('1 de 2')
  })

  it('en regla cuando todas las vigentes tienen fecha', () => {
    const c = buscar(correr({
      padron: [pac({ reprocann_estado: 'Vigente', reprocann_vencimiento: '2029-01-01' })],
    }), 'credencial_sin_fecha')!
    expect(c.estado).toBe('ok')
  })

  it('no opina si nadie declara estar vigente', () => {
    // Es el caso de una entidad que recien arranca: decir «en regla» sobre algo
    // que no existe seria mentir por omision, el mismo criterio que el resto.
    expect(buscar(correr({ padron: [pac({ reprocann_estado: 'Sin registro' })] }), 'credencial_sin_fecha'))
      .toBeUndefined()
    expect(buscar(correr({ padron: [] }), 'credencial_sin_fecha')).toBeUndefined()
  })

  it('ignora a los archivados', () => {
    expect(buscar(correr({
      padron: [pac({ activo: false, reprocann_estado: 'Vigente' })],
    }), 'credencial_sin_fecha')).toBeUndefined()
  })

  it('los otros estados no cuentan: solo Vigente habilita', () => {
    // «En tramite» y «Sin registro» no habilitan a nadie, asi que que no tengan
    // fecha no es una contradiccion — es lo esperable.
    expect(buscar(correr({
      padron: [pac({ reprocann_estado: 'En tramite' }), pac({ reprocann_estado: 'Vencido' })],
    }), 'credencial_sin_fecha')).toBeUndefined()
  })
})

// Entregas con aporte que no llegaron a la caja.
//
// Es el cruce que reemplaza al botón «Asentar reembolsos». El botón se podía
// olvidar en silencio; esto no se olvida.
describe('entregas_sin_asiento', () => {
  const ent = (id: string, aporte: number): Dispensa =>
    ({ id, fecha: '2026-08-30', gramos: 10, aporte } as Dispensa)
  const ing = (dispensa_id: string): AsientoCaja => ({
    id: 'A-' + dispensa_id, fecha: '2026-08-30', tipo: 'ingreso',
    concepto: 'Reembolso de costos operativos', monto: 1000, dispensa_id,
  })

  it('marca las que faltan, con cuántas y cuánta plata', () => {
    const ch = buscar(correr({
      dispensas: [ent('D1', 5000), ent('D2', 3000)],
      caja: [ing('D1')],
    }), 'entregas_sin_asiento')
    expect(ch?.estado).toBe('error')
    expect(ch?.valor).toContain('1')
    expect(ch?.valor).toContain('3.000')
  })

  it('da en regla cuando todas están asentadas', () => {
    const ch = buscar(correr({
      dispensas: [ent('D1', 5000)], caja: [ing('D1')],
    }), 'entregas_sin_asiento')
    expect(ch?.estado).toBe('ok')
  })

  it('una entrega sin aporte no necesita asiento', () => {
    const ch = buscar(correr({
      dispensas: [ent('D1', 5000), ent('D2', 0)], caja: [ing('D1')],
    }), 'entregas_sin_asiento')
    expect(ch?.estado).toBe('ok')
  })

  it('un egreso no cuenta como asiento de la entrega', () => {
    const ch = buscar(correr({
      dispensas: [ent('D1', 5000)],
      caja: [{ ...ing('D1'), tipo: 'egreso' as const, concepto: 'Devolución de aporte' }],
    }), 'entregas_sin_asiento')
    expect(ch?.estado).toBe('error')
  })
})

// Ingresos que dicen ser de una entrega y no están atados a ninguna.
//
// En Panacea eran 158 por $8.936.000. El 30/08/2026 se corrigieron: eran el
// desglose por medio de pago de entregas que ADEMÁS quedaron cargadas con su
// total, o sea plata contada dos veces. Quedan 12 por $714.000 a nombre de
// `CI`, `SAI` y `Merma` —códigos que no son personas del padrón, así que la
// entrega no se pudo cargar—: esa plata entró UNA sola vez, lo que falta es el
// papel que diga qué salió a cambio.
//
// El cruce cuenta sólo eso. Un egreso no es un huérfano, y un ingreso con su
// reversa espejo tampoco: ver los tests de abajo.
describe('asientos_sin_entrega', () => {
  const suelto = (id: string, monto: number, cod = 'PAC-003'): AsientoCaja => ({
    id, fecha: '2026-08-14', tipo: 'ingreso',
    concepto: `Dispensa a ${cod}`, monto, dispensa_id: null,
  })

  it('los cuenta y dice cuánta plata es', () => {
    const ch = buscar(correr({
      caja: [suelto('A1', 20000), suelto('A2', 150000)],
    }), 'asientos_sin_entrega')
    expect(ch?.estado).toBe('error')
    expect(ch?.valor).toContain('2')
    expect(ch?.valor).toContain('170.000')
  })

  it('da en regla cuando todos están atados a su entrega', () => {
    const ch = buscar(correr({
      caja: [{ ...suelto('A1', 20000), dispensa_id: 'D1' }],
    }), 'asientos_sin_entrega')
    expect(ch?.estado).toBe('ok')
  })

  it('un asiento que no dice ser de una entrega no cuenta', () => {
    const ch = buscar(correr({
      caja: [{ ...suelto('A1', 20000), concepto: 'Alquiler' }],
    }), 'asientos_sin_entrega')
    expect(ch?.estado).toBe('ok')
  })

  // Un EGRESO no es un huerfano. El cruce filtraba por concepto y no por tipo,
  // asi que se llevaba puestas las diez reversas de Panacea: marcaba 33 asientos
  // por $2.079.000 cuando lo suelto de verdad eran 12 por $714.000.
  // `asientoDeEntrega` no toca un egreso nunca.
  it('un egreso no cuenta como suelto', () => {
    const ch = buscar(correr({
      caja: [{ ...suelto('A1', 20000), tipo: 'egreso' }],
    }), 'asientos_sin_entrega')
    expect(ch?.estado).toBe('ok')
  })

  // El par con el que la planilla reclasifica el medio de pago: un negativo en
  // una columna y el positivo en la otra. Suman cero y mueven la plata de un
  // medio al otro, que es exactamente lo que se queria.
  it('un ingreso con su reversa espejo no cuenta', () => {
    const ch = buscar(correr({
      caja: [
        { ...suelto('A1', 100000), medio: 'Transferencia' },
        { ...suelto('A2', 100000), tipo: 'egreso', medio: 'Efectivo',
          detalle: 'REVERSA de un ingreso (importe negativo en la planilla)' },
      ],
    }), 'asientos_sin_entrega')
    expect(ch?.estado).toBe('ok')
  })

  // La reversa tapa SOLO a su espejo exacto: mismo dia, mismo concepto, mismo
  // importe. Si el importe no coincide, el ingreso sigue suelto.
  it('una reversa de otro importe no tapa al ingreso', () => {
    const ch = buscar(correr({
      caja: [
        suelto('A1', 100000),
        { ...suelto('A2', 55000), tipo: 'egreso',
          detalle: 'REVERSA de un ingreso (importe negativo en la planilla)' },
      ],
    }), 'asientos_sin_entrega')
    expect(ch?.estado).toBe('error')
    expect(ch?.valor).toContain('1')
    expect(ch?.valor).toContain('100.000')
  })

  // Los que quedan en Panacea: `CI`, `SAI` y `Merma` no son personas del padron,
  // asi que la entrega no se pudo cargar. La plata es real y entro una sola vez.
  it('nombra los codigos que quedaron sueltos', () => {
    const ch = buscar(correr({
      caja: [suelto('A1', 24000, 'CI'), suelto('A2', 15000, 'Merma')],
    }), 'asientos_sin_entrega')
    expect(ch?.estado).toBe('error')
    expect(ch?.detalle).toContain('CI')
    expect(ch?.detalle).toContain('Merma')
    expect(ch?.detalle).not.toContain('contada dos veces')
  })
})

// EL AJUSTE CONTRA EL SISTEMA DE GESTION (04/09/2026).
//
// Panacea opero un ano con una planilla y decidio que esa es la fuente correcta.
// Al conciliar, 220 g quedaron como salida sin paciente y sin aporte. Si esa
// modalidad no estuviera en MODALIDADES_SIN_PACIENTE, Coherencia marcaria las
// cuatro filas como «dispensa sin paciente» — cuatro errores rojos por un
// ajuste que se hizo bien.
describe('la modalidad de ajuste no ensucia Coherencia', () => {
  it('cuenta como salida sin paciente', () => {
    expect(esSalidaSinPaciente({ modalidad: MODALIDAD_AJUSTE })).toBe(true)
  })

  it('y las otras tres siguen contando', () => {
    for (const m of ['Consumo interno', 'Merma', 'Saldo inicial']) {
      expect(esSalidaSinPaciente({ modalidad: m })).toBe(true)
    }
  })

  it('pero una entrega a paciente NO', () => {
    expect(esSalidaSinPaciente({ modalidad: 'Paciente' })).toBe(false)
    // La retribucion y la muestra van a alguien concreto: llevan paciente.
    expect(esSalidaSinPaciente({ modalidad: 'Retribución en especie' })).toBe(false)
    expect(esSalidaSinPaciente({ modalidad: 'Muestra' })).toBe(false)
  })
})

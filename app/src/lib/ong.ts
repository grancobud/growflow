import { supabase } from './supabase'

/**
 * Capa institucional de la asociación civil.
 *
 * El resto de la app cubre la operación (plantas, cosecha, costos). Esto cubre
 * lo otro: los plazos que, si se vencen, te frenan todos los trámites aunque el
 * cultivo ande perfecto. Las dos cosas que más cuelgan a una ONG son el mandato
 * de autoridades vencido y la reinscripción anual del REPROCANN.
 */

export interface Entidad {
  id: string
  razon_social?: string | null
  cuit?: string | null
  jurisdiccion?: string | null
  organismo_control?: string | null
  sede_domicilio?: string | null
  sede_localidad?: string | null
  sede_provincia?: string | null
  fecha_constitucion?: string | null
  cierre_ejercicio_dia?: number | null
  cierre_ejercicio_mes?: number | null
  mandato_anios?: number | null
  mandato_desde?: string | null
  reprocann_inscripcion?: string | null
  reprocann_vencimiento?: string | null
  tope_pacientes?: number | null
  plantas_por_paciente?: number | null
  tope_predios?: number | null
  /** El estatuto tiene que declarar explícitamente el objeto cannábico. */
  objeto_cannabis?: boolean
  objeto_social?: string | null
  /** Código que la ONG le pasa al paciente para vincularse desde Mi Argentina. */
  codigo_vinculacion?: string | null
  perfil_reprocann?: string | null
  notas?: string | null
}

export interface Autoridad {
  id: string
  nombre: string
  cargo: string
  organo?: string | null
  desde?: string | null
  hasta?: string | null
  activo?: boolean
  notas?: string | null
}

export interface Requisito {
  id?: string
  clave: string
  titulo: string
  detalle?: string | null
  cumplido?: boolean
  vence?: string | null
  responsable?: string | null
  nota?: string | null
  orden?: number | null
  /** Título que acredita al responsable (postgrado, diplomatura). */
  acreditacion?: string | null
  acreditado?: boolean
}

/**
 * Los cinco requisitos de la Resolución 1780 viven en el código, no en la base.
 * Los fija la norma, no el usuario: si dependieran de filas precargadas, una
 * instalación nueva mostraría la lista vacía. La tabla guarda sólo el ESTADO
 * (cumplido, vencimiento, responsable) contra la clave.
 */
export const REQUISITOS_1780: Omit<Requisito, 'id' | 'cumplido'>[] = [
  { clave: 'director_medico', orden: 1, titulo: 'Director médico',
    detalle: 'Médico que hace el seguimiento de los pacientes de la ONG.' },
  { clave: 'responsable_tecnico', orden: 2, titulo: 'Responsable técnico',
    detalle: 'Quien responde por el cultivo. Puede ser un integrante con curso de cannabis acreditado.' },
  { clave: 'georreferenciacion', orden: 3, titulo: 'Georreferenciación',
    detalle: 'Coordenadas declaradas de cada predio de cultivo.' },
  { clave: 'notificacion_municipio', orden: 4, titulo: 'Notificación al municipio',
    detalle: 'Aviso formal al municipio de cada predio. Antes de clausurar intiman: recién a la tercera sin respuesta pueden clausurar y sacar plantas.' },
  { clave: 'pacientes_minimos', orden: 5, titulo: 'Mínimo 5 pacientes',
    detalle: 'Listado de al menos cinco pacientes vinculados a la ONG.' },
]

export interface Predio {
  id: string
  nombre: string
  direccion?: string | null
  localidad?: string | null
  provincia?: string | null
  municipio?: string | null
  georreferenciado?: boolean
  municipio_notificado?: boolean
  activo?: boolean
  notas?: string | null
}

export const CARGOS = [
  'Presidente', 'Vicepresidente', 'Secretario', 'Tesorero',
  'Vocal titular', 'Vocal suplente',
  'Revisor de cuentas titular', 'Revisor de cuentas suplente',
] as const

export const ORGANOS = ['Comisión Directiva', 'Comisión Revisora de Cuentas'] as const

const lanzar = (e: { message: string } | null) => { if (e) throw new Error(e.message) }

export const ongService = {
  /** La entidad es una sola fila. Si todavía no existe, devuelve null. */
  async getEntidad(): Promise<Entidad | null> {
    const { data, error } = await supabase.from('ong_entidad').select('*').limit(1)
    lanzar(error)
    return (data?.[0] as Entidad) ?? null
  },
  async guardarEntidad(e: Partial<Entidad>): Promise<Entidad> {
    const { data: u } = await supabase.auth.getUser()
    const payload = { ...e, user_id: u?.user?.id ?? null, actualizado_en: new Date().toISOString() }
    const q = e.id
      ? supabase.from('ong_entidad').update(payload).eq('id', e.id).select().single()
      : supabase.from('ong_entidad').insert(payload).select().single()
    const { data, error } = await q
    lanzar(error)
    return data as Entidad
  },

  async getAutoridades(): Promise<Autoridad[]> {
    const { data, error } = await supabase.from('ong_autoridades').select('*').order('cargo')
    lanzar(error)
    return (data ?? []) as Autoridad[]
  },
  async guardarAutoridad(a: Partial<Autoridad>): Promise<void> {
    const { data: u } = await supabase.auth.getUser()
    const payload = { ...a, user_id: u?.user?.id ?? null }
    const { error } = a.id
      ? await supabase.from('ong_autoridades').update(payload).eq('id', a.id)
      : await supabase.from('ong_autoridades').insert(payload)
    lanzar(error)
  },
  async borrarAutoridad(id: string): Promise<void> {
    lanzar((await supabase.from('ong_autoridades').delete().eq('id', id)).error)
  },

  /**
   * La lista siempre sale completa: se parte de REQUISITOS_1780 y se le pega
   * encima el estado guardado. Nunca devuelve vacío, ni en una instalación
   * nueva ni en modo demo.
   */
  async getRequisitos(): Promise<Requisito[]> {
    const { data, error } = await supabase.from('ong_requisitos').select('*')
    lanzar(error)
    const guardados = new Map((data ?? []).map(r => [(r as Requisito).clave, r as Requisito]))
    return REQUISITOS_1780.map(base => ({ ...base, cumplido: false, ...(guardados.get(base.clave) ?? {}) }))
  },
  /** Upsert por clave: la fila puede no existir todavía. */
  async actualizarRequisito(clave: string, campos: Partial<Requisito>): Promise<void> {
    const base = REQUISITOS_1780.find(r => r.clave === clave)
    const { data: u } = await supabase.auth.getUser()
    const { data: hay } = await supabase.from('ong_requisitos').select('id').eq('clave', clave).limit(1)
    if (hay?.[0]) {
      lanzar((await supabase.from('ong_requisitos').update(campos).eq('id', (hay[0] as { id: string }).id)).error)
    } else {
      lanzar((await supabase.from('ong_requisitos').insert({
        clave, titulo: base?.titulo ?? clave, detalle: base?.detalle ?? null,
        orden: base?.orden ?? 0, user_id: u?.user?.id ?? null, ...campos,
      })).error)
    }
  },

  async getPredios(): Promise<Predio[]> {
    const { data, error } = await supabase.from('ong_predios').select('*').order('nombre')
    lanzar(error)
    return (data ?? []) as Predio[]
  },
  async guardarPredio(p: Partial<Predio>): Promise<void> {
    const { data: u } = await supabase.auth.getUser()
    const payload = { ...p, user_id: u?.user?.id ?? null }
    const { error } = p.id
      ? await supabase.from('ong_predios').update(payload).eq('id', p.id)
      : await supabase.from('ong_predios').insert(payload)
    lanzar(error)
  },
  async borrarPredio(id: string): Promise<void> {
    lanzar((await supabase.from('ong_predios').delete().eq('id', id)).error)
  },

  // --- libros, actas, asociados ---
  async getLibros(): Promise<Libro[]> {
    const { data, error } = await supabase.from('ong_libros').select('*').order('tipo')
    lanzar(error); return (data ?? []) as Libro[]
  },
  async guardarLibro(l: Partial<Libro>): Promise<void> {
    const { data: u } = await supabase.auth.getUser()
    const p = { ...l, user_id: u?.user?.id ?? null }
    lanzar((l.id
      ? await supabase.from('ong_libros').update(p).eq('id', l.id)
      : await supabase.from('ong_libros').insert(p)).error)
  },
  async borrarLibro(id: string): Promise<void> {
    lanzar((await supabase.from('ong_libros').delete().eq('id', id)).error)
  },

  async getActas(): Promise<Acta[]> {
    const { data, error } = await supabase.from('ong_actas').select('*').order('fecha', { ascending: false })
    lanzar(error); return (data ?? []) as Acta[]
  },
  async guardarActa(a: Partial<Acta>): Promise<void> {
    const { data: u } = await supabase.auth.getUser()
    const p = { ...a, user_id: u?.user?.id ?? null }
    lanzar((a.id
      ? await supabase.from('ong_actas').update(p).eq('id', a.id)
      : await supabase.from('ong_actas').insert(p)).error)
  },
  async borrarActa(id: string): Promise<void> {
    lanzar((await supabase.from('ong_actas').delete().eq('id', id)).error)
  },
  /** Siguiente número libre de la serie de ese tipo de acta. */
  async proximoNumeroActa(tipo: string): Promise<number> {
    const { data } = await supabase.from('ong_actas').select('numero').eq('tipo', tipo)
    const nums = (data ?? []).map(r => (r as { numero: number }).numero)
    return nums.length ? Math.max(...nums) + 1 : 1
  },

  async getAsociados(): Promise<Asociado[]> {
    const { data, error } = await supabase.from('ong_asociados').select('*').order('nombre')
    lanzar(error); return (data ?? []) as Asociado[]
  },
  async guardarAsociado(a: Partial<Asociado>): Promise<void> {
    const { data: u } = await supabase.auth.getUser()
    const p = { ...a, user_id: u?.user?.id ?? null }
    lanzar((a.id
      ? await supabase.from('ong_asociados').update(p).eq('id', a.id)
      : await supabase.from('ong_asociados').insert(p)).error)
  },
  async borrarAsociado(id: string): Promise<void> {
    lanzar((await supabase.from('ong_asociados').delete().eq('id', id)).error)
  },

  async getCategorias(): Promise<CategoriaSocio[]> {
    const { data, error } = await supabase.from('ong_categorias_socio').select('*').order('nombre')
    lanzar(error); return (data ?? []) as CategoriaSocio[]
  },
  async guardarCategoria(c: Partial<CategoriaSocio>): Promise<void> {
    const { data: u } = await supabase.auth.getUser()
    const p = { ...c, user_id: u?.user?.id ?? null }
    lanzar((c.id
      ? await supabase.from('ong_categorias_socio').update(p).eq('id', c.id)
      : await supabase.from('ong_categorias_socio').insert(p)).error)
  },
  async borrarCategoria(id: string): Promise<void> {
    lanzar((await supabase.from('ong_categorias_socio').delete().eq('id', id)).error)
  },

  async getCuotas(): Promise<Cuota[]> {
    const { data, error } = await supabase.from('ong_cuotas').select('*').order('vigente_desde', { ascending: false })
    lanzar(error); return (data ?? []) as Cuota[]
  },
  async guardarCuota(c: Partial<Cuota>): Promise<void> {
    const { data: u } = await supabase.auth.getUser()
    const p = { ...c, user_id: u?.user?.id ?? null }
    lanzar((c.id
      ? await supabase.from('ong_cuotas').update(p).eq('id', c.id)
      : await supabase.from('ong_cuotas').insert(p)).error)
  },
  async borrarCuota(id: string): Promise<void> {
    lanzar((await supabase.from('ong_cuotas').delete().eq('id', id)).error)
  },

  async getDispensas(): Promise<Dispensa[]> {
    const { data, error } = await supabase.from('ong_dispensas').select('*').order('fecha', { ascending: false })
    lanzar(error); return (data ?? []) as Dispensa[]
  },
  async guardarDispensa(d: Partial<Dispensa>): Promise<void> {
    const { data: u } = await supabase.auth.getUser()
    const p = { ...d, user_id: u?.user?.id ?? null }
    lanzar((d.id
      ? await supabase.from('ong_dispensas').update(p).eq('id', d.id)
      : await supabase.from('ong_dispensas').insert(p)).error)
  },
  async borrarDispensa(id: string): Promise<void> {
    lanzar((await supabase.from('ong_dispensas').delete().eq('id', id)).error)
  },

  async getCuotasEmitidas(): Promise<CuotaEmitida[]> {
    const { data, error } = await supabase.from('ong_cuotas_emitidas').select('*').order('periodo', { ascending: false })
    lanzar(error); return (data ?? []) as CuotaEmitida[]
  },
  async guardarCuotaEmitida(c: Partial<CuotaEmitida>): Promise<void> {
    const { data: u } = await supabase.auth.getUser()
    const p = { ...c, user_id: u?.user?.id ?? null }
    lanzar((c.id
      ? await supabase.from('ong_cuotas_emitidas').update(p).eq('id', c.id)
      : await supabase.from('ong_cuotas_emitidas').insert(p)).error)
  },
  async borrarCuotaEmitida(id: string): Promise<void> {
    lanzar((await supabase.from('ong_cuotas_emitidas').delete().eq('id', id)).error)
  },

  async getDocumentos(): Promise<DocumentoONG[]> {
    const { data, error } = await supabase.from('ong_documentos').select('*').order('fecha', { ascending: false })
    lanzar(error); return (data ?? []) as DocumentoONG[]
  },
  async guardarDocumento(d: Partial<DocumentoONG>): Promise<void> {
    const { data: u } = await supabase.auth.getUser()
    const p = { ...d, user_id: u?.user?.id ?? null }
    lanzar((d.id
      ? await supabase.from('ong_documentos').update(p).eq('id', d.id)
      : await supabase.from('ong_documentos').insert(p)).error)
  },
  async borrarDocumento(d: DocumentoONG): Promise<void> {
    // El archivo se va con la ficha: si no, queda basura en el bucket que nadie
    // puede ver ni borrar desde la app.
    if (d.archivo_path) {
      const { error } = await supabase.storage.from(BUCKET_DOCS).remove([d.archivo_path])
      // Un archivo que ya no está no debería impedir borrar la ficha.
      if (error && !/not found/i.test(error.message)) throw new Error(error.message)
    }
    lanzar((await supabase.from('ong_documentos').delete().eq('id', d.id)).error)
  },
  /** Sube el archivo al bucket privado y devuelve el path (nunca una URL pública). */
  async subirArchivoDocumento(file: File): Promise<{ path: string; nombre: string }> {
    const limpio = file.name.replace(/[^\w.-]+/g, '_')
    const path = `ong/${Date.now()}_${limpio}`
    const { error } = await supabase.storage.from(BUCKET_DOCS).upload(path, file, {
      contentType: file.type || 'application/octet-stream', upsert: false,
    })
    if (error) throw new Error(error.message)
    return { path, nombre: file.name }
  },
  /**
   * Emite la cuota del período a todos los asociados activos que todavía no la
   * tengan. Es el paso que faltaba para poder cruzar asociados contra ingresos.
   */
  async emitirCuotasDelPeriodo(
    periodo: string, asociados: Asociado[], cuotas: Cuota[], yaEmitidas: CuotaEmitida[],
  ): Promise<number> {
    const { data: u } = await supabase.auth.getUser()
    const valorDe = (a: Asociado, tipo: string) =>
      cuotas.find(c => c.tipo === tipo && c.categoria === a.categoria)?.valor
      ?? cuotas.find(c => c.tipo === tipo && !c.categoria)?.valor ?? null
    const nuevas = asociados
      .filter(a => a.activo !== false)
      .flatMap(a => (['social'] as const).map(tipo => ({ a, tipo, valor: valorDe(a, tipo) })))
      .filter(x => x.valor != null)
      .filter(x => !yaEmitidas.some(e => e.asociado_id === x.a.id && e.periodo === periodo && e.tipo === x.tipo))
      .map(x => ({
        asociado_id: x.a.id, periodo, tipo: x.tipo, monto: x.valor as number,
        pagada: false, user_id: u?.user?.id ?? null,
      }))
    if (!nuevas.length) return 0
    lanzar((await supabase.from('ong_cuotas_emitidas').insert(nuevas)).error)
    return nuevas.length
  },
}

export interface CuotaEmitida {
  id: string
  asociado_id?: string | null
  periodo: string
  tipo?: string | null
  monto: number
  pagada?: boolean
  fecha_pago?: string | null
  medio?: string | null
  notas?: string | null
}

/**
 * Papeles de la asociación, de las dos puntas:
 * - `emitido`: lo que la ONG entrega (constancia de socio, recibo de cuota,
 *   comprobante de dispensa). Va a nombre de alguien.
 * - `gasto`: lo que la ONG recibe al comprar. Es el respaldo de que la plata
 *   salió, y sin eso el costo por gramo es una afirmación sin prueba.
 */
export interface DocumentoONG {
  id: string
  tipo: 'emitido' | 'gasto'
  subtipo?: string | null
  numero?: string | null
  fecha: string
  descripcion?: string | null
  monto?: number | null
  proveedor?: string | null
  categoria?: string | null
  asociado_id?: string | null
  paciente_id?: string | null
  dispensa_id?: string | null
  archivo_path?: string | null
  archivo_nombre?: string | null
  notas?: string | null
}

/** Bucket privado donde viven los archivos. Ver lib/archivos.ts. */
export const BUCKET_DOCS = 'documentos'

export const SUBTIPOS_EMITIDO = [
  'Constancia de socio', 'Recibo de cuota', 'Comprobante de dispensa',
  'Certificado de vinculación', 'Nota / carta', 'Otro',
] as const

export const SUBTIPOS_GASTO = [
  'Factura A', 'Factura B', 'Factura C', 'Ticket', 'Remito',
  'Recibo', 'Comprobante de transferencia', 'Otro',
] as const

/** Rubros de gasto, alineados con las categorías de Econometría. */
export const CATEGORIAS_GASTO = [
  'Nutrientes', 'Sustrato', 'Energía', 'Equipamiento', 'Alquiler',
  'Sanidad', 'Análisis de laboratorio', 'Honorarios', 'Impuestos y tasas',
  'Insumos varios', 'Otro',
] as const

export interface ResumenDocumentos {
  emitidos: number
  gastos: number
  /** Gastos que tienen el archivo subido: los otros son una anotación sin respaldo. */
  gastosConArchivo: number
  emitidosConArchivo: number
  totalGastos: number
  porCategoria: { categoria: string; monto: number; n: number }[]
}

export function resumenDocumentos(docs: DocumentoONG[]): ResumenDocumentos {
  const emitidos = docs.filter(d => d.tipo === 'emitido')
  const gastos = docs.filter(d => d.tipo === 'gasto')
  const porCat = new Map<string, { monto: number; n: number }>()
  for (const g of gastos) {
    const k = g.categoria || 'Sin categoría'
    const a = porCat.get(k) ?? { monto: 0, n: 0 }
    porCat.set(k, { monto: a.monto + (Number(g.monto) || 0), n: a.n + 1 })
  }
  return {
    emitidos: emitidos.length,
    gastos: gastos.length,
    gastosConArchivo: gastos.filter(d => d.archivo_path).length,
    emitidosConArchivo: emitidos.filter(d => d.archivo_path).length,
    totalGastos: gastos.reduce((s, d) => s + (Number(d.monto) || 0), 0),
    porCategoria: [...porCat.entries()]
      .map(([categoria, v]) => ({ categoria, ...v }))
      .sort((a, b) => b.monto - a.monto),
  }
}

export interface ResumenCobranza {
  periodo: string
  emitidas: number
  pagadas: number
  montoEmitido: number
  montoCobrado: number
  asociadosActivos: number
  /** Activos que no tienen cuota emitida en el período. */
  sinEmitir: number
}

export function resumenCobranza(
  periodo: string, emitidas: CuotaEmitida[], asociados: Asociado[],
): ResumenCobranza {
  const delPeriodo = emitidas.filter(e => e.periodo === periodo)
  const activos = asociados.filter(a => a.activo !== false)
  const conCuota = new Set(delPeriodo.map(e => e.asociado_id))
  return {
    periodo,
    emitidas: delPeriodo.length,
    pagadas: delPeriodo.filter(e => e.pagada).length,
    montoEmitido: delPeriodo.reduce((s, e) => s + (Number(e.monto) || 0), 0),
    montoCobrado: delPeriodo.filter(e => e.pagada).reduce((s, e) => s + (Number(e.monto) || 0), 0),
    asociadosActivos: activos.length,
    sinEmitir: activos.filter(a => !conCuota.has(a.id)).length,
  }
}

/** Período actual en formato YYYY-MM. */
export function periodoActual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Dispensas.
// ---------------------------------------------------------------------------

export interface Dispensa {
  id: string
  paciente_id?: string | null
  fecha: string
  producto?: string | null
  genetica_id?: string | null
  gramos: number
  aporte?: number | null
  modalidad?: string | null
  entregado_por?: string | null
  con_receta?: boolean
  notas?: string | null
}

export const PRODUCTOS_DISPENSA = ['flor', 'extracto', 'aceite', 'otro'] as const

/**
 * Revisa una dispensa contra las reglas que más exponen:
 * - entregar a alguien sin REPROCANN vinculado
 * - pasar los 40 g de un traslado sin receta que lo respalde
 * - cobrar por encima del costo, que deja de ser aporte y pasa a ser venta
 */
export interface AvisoDispensa { nivel: 'error' | 'alerta'; texto: string }

export function revisarDispensa(
  d: Dispensa, opts: { pacienteVinculado?: boolean; costoPorGramo?: number | null },
): AvisoDispensa[] {
  const av: AvisoDispensa[] = []
  if (opts.pacienteVinculado === false) {
    av.push({ nivel: 'error', texto: 'El paciente no figura como vinculado en REPROCANN. Sólo se dispensa a pacientes vinculados a esta ONG.' })
  }
  if (!d.paciente_id) {
    av.push({ nivel: 'error', texto: 'Sin paciente asignado: una dispensa siempre va a una persona identificada.' })
  }
  if (d.gramos > TOPE_TRASLADO_INDIVIDUAL_G && !d.con_receta) {
    av.push({ nivel: 'alerta', texto: `${d.gramos} g en un solo traslado supera los ${TOPE_TRASLADO_INDIVIDUAL_G} g. Si la necesidad medicinal lo justifica, respaldalo con receta o entregalo en más de una vez.` })
  }
  if (opts.costoPorGramo != null && opts.costoPorGramo > 0 && d.aporte != null && d.gramos > 0) {
    const porGramo = d.aporte / d.gramos
    if (porGramo > opts.costoPorGramo * 1.05) {
      av.push({ nivel: 'alerta', texto: `El aporte da $${Math.round(porGramo).toLocaleString('es-AR')}/g y tu costo real es $${Math.round(opts.costoPorGramo).toLocaleString('es-AR')}/g. El aporte cubre gastos: por encima del costo deja de ser aporte.` })
    }
  }
  return av
}

export interface ResumenDispensas {
  total: number
  gramos: number
  aporte: number
  pacientes: number
  aportePorGramo: number | null
}

/**
 * Balance de materia: lo primero que se pregunta en cualquier control de
 * trazabilidad. Cosechaste tanto, entregaste tanto: la diferencia es lo que
 * tenés que poder mostrar.
 */
export interface BalanceMateria {
  cosechado: number
  dispensado: number
  stock: number
  /** Porcentaje de lo cosechado que ya se entregó. */
  pctDispensado: number | null
  /** Dispensar más de lo cosechado es imposible: hay un error de carga. */
  inconsistente: boolean
}

export function balanceMateria(gramosCosechados: number, dispensas: Dispensa[]): BalanceMateria {
  const dispensado = dispensas.reduce((s, d) => s + (Number(d.gramos) || 0), 0)
  return {
    cosechado: gramosCosechados,
    dispensado,
    stock: gramosCosechados - dispensado,
    pctDispensado: gramosCosechados > 0 ? (dispensado / gramosCosechados) * 100 : null,
    inconsistente: dispensado > gramosCosechados,
  }
}

export function resumirDispensas(ds: Dispensa[]): ResumenDispensas {
  const gramos = ds.reduce((s, d) => s + (Number(d.gramos) || 0), 0)
  const aporte = ds.reduce((s, d) => s + (Number(d.aporte) || 0), 0)
  return {
    total: ds.length, gramos, aporte,
    pacientes: new Set(ds.map(d => d.paciente_id).filter(Boolean)).size,
    // Un aporte total en 0 es "todavía no lo cargaste", no "se entregó gratis":
    // devolver 0 haría que el tablero diera por comparado algo que no lo está.
    aportePorGramo: gramos > 0 && aporte > 0 ? aporte / gramos : null,
  }
}

// ---------------------------------------------------------------------------
// Vencimientos: lo que hace que la ONG pueda o no operar.
// ---------------------------------------------------------------------------

export type Urgencia = 'vencido' | 'critico' | 'proximo' | 'ok'

export interface Vencimiento {
  clave: string
  titulo: string
  fecha: string | null
  dias: number | null          // negativo = ya venció
  urgencia: Urgencia
  queSignifica: string
  comoSeResuelve: string
}

const HOY = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
const dias = (iso: string | null | undefined): number | null => {
  if (!iso) return null
  return Math.round((new Date(iso + 'T00:00:00').getTime() - HOY().getTime()) / 86400000)
}
const urgenciaDe = (d: number | null): Urgencia =>
  d == null ? 'ok' : d < 0 ? 'vencido' : d <= 30 ? 'critico' : d <= 90 ? 'proximo' : 'ok'

/** Próxima ocurrencia de un día/mes del calendario, a partir de hoy. */
export function proximoAniversario(dia?: number | null, mes?: number | null): string | null {
  if (!dia || !mes) return null
  const hoy = HOY()
  let a = hoy.getFullYear()
  const arma = (anio: number) => new Date(anio, mes - 1, dia)
  if (arma(a) < hoy) a += 1
  const d = arma(a)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Fin del mandato = inicio + duración en años, ambos del estatuto. */
export function finDeMandato(desde?: string | null, anios?: number | null): string | null {
  if (!desde || !anios) return null
  const d = new Date(desde + 'T00:00:00')
  d.setFullYear(d.getFullYear() + anios)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function calcularVencimientos(e: Entidad | null): Vencimiento[] {
  if (!e) return []
  const v: Vencimiento[] = []

  const mandato = finDeMandato(e.mandato_desde, e.mandato_anios)
  v.push({
    clave: 'mandato', titulo: 'Mandato de autoridades', fecha: mandato, dias: dias(mandato),
    urgencia: urgenciaDe(dias(mandato)),
    queSignifica: 'Con las autoridades vencidas no podés hacer ningún trámite: ni banco, ni registro, ni REPROCANN.',
    comoSeResuelve: 'Asamblea que renueve el mandato y después inscribir las nuevas autoridades en el registro.',
  })

  v.push({
    clave: 'reprocann', titulo: 'Reinscripción REPROCANN', fecha: e.reprocann_vencimiento ?? null,
    dias: dias(e.reprocann_vencimiento), urgencia: urgenciaDe(dias(e.reprocann_vencimiento)),
    queSignifica: 'Para la ONG dura 1 año. Si no se reinscribe a tiempo NO se vence: se cae, y hay que rehacer el trámite.',
    comoSeResuelve: 'Volver a presentar la documentación con los informes del director médico y del responsable técnico.',
  })

  const cierre = proximoAniversario(e.cierre_ejercicio_dia, e.cierre_ejercicio_mes)
  v.push({
    clave: 'cierre', titulo: 'Cierre de ejercicio', fecha: cierre, dias: dias(cierre),
    urgencia: urgenciaDe(dias(cierre)),
    queSignifica: 'La fecha la fija el estatuto, no se elige cada año. Desde acá se arman los estados contables.',
    comoSeResuelve: 'Pasarle al contador los movimientos del ejercicio para que confeccione el balance.',
  })

  // El balance se trata después del cierre; se toma como referencia práctica un
  // trimestre, que es el plazo con el que suelen trabajar los organismos.
  if (cierre) {
    const b = new Date(cierre + 'T00:00:00'); b.setMonth(b.getMonth() + 3)
    const iso = `${b.getFullYear()}-${String(b.getMonth() + 1).padStart(2, '0')}-${String(b.getDate()).padStart(2, '0')}`
    v.push({
      clave: 'balance', titulo: 'Presentación de balance', fecha: iso, dias: dias(iso),
      urgencia: urgenciaDe(dias(iso)),
      queSignifica: 'Es obligatorio todos los años, incluso en cero si no diste de alta los impuestos.',
      comoSeResuelve: 'Contador arma → lo trata la Comisión Directiva → lo aprueba la Asamblea → se presenta en el organismo de control.',
    })
  }

  const orden: Record<Urgencia, number> = { vencido: 0, critico: 1, proximo: 2, ok: 3 }
  return v.sort((a, b) =>
    orden[a.urgencia] - orden[b.urgencia] || (a.dias ?? 9e9) - (b.dias ?? 9e9))
}

// ---------------------------------------------------------------------------
// Capacidad: los tres topes de la Resolución 1780.
// ---------------------------------------------------------------------------

export interface LineaCapacidad {
  titulo: string
  usado: number
  tope: number
  detalle: string
}

export function calcularCapacidad(
  e: Entidad | null, pacientes: number, plantasEnFloracion: number, predios: number,
): LineaCapacidad[] {
  const topePac = e?.tope_pacientes ?? 150
  const porPac = e?.plantas_por_paciente ?? 9
  const topePre = e?.tope_predios ?? 3
  // El tope de plantas no es fijo: sale de cuántos pacientes hay vinculados.
  const topePlantas = pacientes * porPac
  return [
    { titulo: 'Pacientes vinculados', usado: pacientes, tope: topePac,
      detalle: 'Tope de la 1780. Es ampliable por solicitud si la asociación lo supera.' },
    // El límite es sobre plantas EN FLORACIÓN, no sobre el total del cultivo:
    // las que están en vegetativo o enraizando no cuentan contra el tope.
    { titulo: 'Plantas en floración', usado: plantasEnFloracion, tope: topePlantas,
      detalle: `${porPac} plantas en floración por paciente vinculado. Con ${pacientes} paciente${pacientes === 1 ? '' : 's'} el techo es ${topePlantas}. Las que están en vegetativo no cuentan.` },
    { titulo: 'Predios', usado: predios, tope: topePre,
      detalle: 'La sede social es declarativa y puede estar en otra jurisdicción que el cultivo.' },
  ]
}

// ---------------------------------------------------------------------------
// Cupo REPROCANN: qué planta se ampara en el permiso de qué persona.
//
// El cupo del cultivo no es un número propio de la ONG: es la suma de los
// permisos que aportó cada paciente. Por eso la pregunta que hay que poder
// contestar planta por planta es "¿de quién es el REPROCANN que la habilita?".
// Una planta en floración sin persona asignada no está amparada por nadie.
// ---------------------------------------------------------------------------

export interface CupoPersona {
  pacienteId: string
  nombre: string
  reprocann: string | null
  estado: string | null
  vencimiento: string | null
  vencido: boolean
  cupo: number
  asignadas: number
  enFloracion: number
  libres: number
  excedida: boolean
}

export interface CupoReprocann {
  personas: CupoPersona[]
  /** Personas que efectivamente aportaron su REPROCANN vigente. */
  aportantes: number
  cupoTotal: number
  asignadas: number
  enFloracion: number
  /** Plantas activas que no se imputan al permiso de nadie. */
  sinAsignar: number
  /** Las críticas: en floración y sin respaldo. */
  sinAsignarEnFloracion: number
}

interface PlantaCupo { paciente_id: string | null; fase: string; activa?: boolean }
interface PacienteCupo {
  id: string; nombre_completo: string; reprocann_nro: string | null
  reprocann_estado: string | null; reprocann_vencimiento: string | null
  plantas_habilitadas: number | null; activo?: boolean
}

export function cupoReprocann(
  pacientes: PacienteCupo[], plantas: PlantaCupo[], porPacienteDefault = 9,
): CupoReprocann {
  const activas = plantas.filter(p => p.activa !== false)
  const hoy = new Date().toISOString().slice(0, 10)

  const personas: CupoPersona[] = pacientes
    .filter(p => p.activo !== false)
    .map(p => {
      const suyas = activas.filter(x => x.paciente_id === p.id)
      const enFloracion = suyas.filter(x => x.fase === 'Floracion').length
      const cupo = p.plantas_habilitadas ?? porPacienteDefault
      return {
        pacienteId: p.id, nombre: p.nombre_completo,
        reprocann: p.reprocann_nro, estado: p.reprocann_estado,
        vencimiento: p.reprocann_vencimiento,
        vencido: !!p.reprocann_vencimiento && p.reprocann_vencimiento < hoy,
        cupo, asignadas: suyas.length, enFloracion,
        libres: Math.max(0, cupo - enFloracion),
        // El tope se mide contra las de floración, igual que en la 1780.
        excedida: enFloracion > cupo,
      }
    })
    .sort((a, b) => b.enFloracion - a.enFloracion || a.nombre.localeCompare(b.nombre))

  const sinAsignarPlantas = activas.filter(p => !p.paciente_id)
  // Sólo suma al cupo quien tiene REPROCANN cargado y no vencido.
  const aportan = personas.filter(p => p.reprocann && !p.vencido)

  return {
    personas,
    aportantes: aportan.length,
    cupoTotal: aportan.reduce((s, p) => s + p.cupo, 0),
    asignadas: activas.filter(p => p.paciente_id).length,
    enFloracion: activas.filter(p => p.fase === 'Floracion').length,
    sinAsignar: sinAsignarPlantas.length,
    sinAsignarEnFloracion: sinAsignarPlantas.filter(p => p.fase === 'Floracion').length,
  }
}

/** Gramos que la ONG puede mover entre sus propios predios. */
export function topeTransporteG(pacientes: number, gramosPorPaciente = 40): number {
  return pacientes * gramosPorPaciente
}

/** Tope de un traslado individual, independiente de la necesidad total. */
export const TOPE_TRASLADO_INDIVIDUAL_G = 40

// ---------------------------------------------------------------------------
// Libros, actas y coherencia.
// ---------------------------------------------------------------------------

export const TIPOS_LIBRO = [
  { id: 'actas_cd', nombre: 'Actas de Comisión Directiva', grupo: 'social' },
  { id: 'actas_asamblea', nombre: 'Actas de Asamblea', grupo: 'social' },
  { id: 'asistencia', nombre: 'Asistencia a reuniones', grupo: 'social' },
  { id: 'actas_revisora', nombre: 'Actas de Comisión Revisora de Cuentas', grupo: 'social' },
  { id: 'registro_asociados', nombre: 'Registro de Asociados', grupo: 'social' },
  { id: 'diario', nombre: 'Libro Diario', grupo: 'contable' },
  { id: 'inventario_balances', nombre: 'Inventario y Balances', grupo: 'contable' },
] as const

export const TIPOS_ACTA = [
  { id: 'cd', nombre: 'Comisión Directiva', libro: 'actas_cd' },
  { id: 'asamblea_ordinaria', nombre: 'Asamblea Ordinaria', libro: 'actas_asamblea' },
  { id: 'asamblea_extraordinaria', nombre: 'Asamblea Extraordinaria', libro: 'actas_asamblea' },
  { id: 'revisora', nombre: 'Comisión Revisora de Cuentas', libro: 'actas_revisora' },
] as const

export const ESTADOS_ACTA = ['borrador', 'firmada', 'en_libro', 'inscripta'] as const

export interface PuntoOrdenDia {
  punto: string
  resultado?: 'aprobado' | 'rechazado' | 'pendiente'
  favor?: number
  contra?: number
  abstenciones?: number
}

export interface Libro {
  id: string
  tipo: string
  numero?: number | null
  rubricado?: boolean
  fecha_rubrica?: string | null
  organismo?: string | null
  digital?: boolean
  folios_totales?: number | null
  folios_usados?: number | null
  estado?: string | null
  notas?: string | null
}

export interface Acta {
  id: string
  tipo: string
  numero: number
  fecha: string
  lugar?: string | null
  hora_inicio?: string | null
  hora_fin?: string | null
  asistentes?: number | null
  quorum_ok?: boolean
  segunda_convocatoria?: boolean
  orden_del_dia?: PuntoOrdenDia[]
  firmantes?: string | null
  estado?: string | null
  libro_id?: string | null
  folio?: number | null
  notas?: string | null
}

export interface Asociado {
  id: string
  nombre: string
  dni?: string | null
  categoria?: string | null
  paciente_id?: string | null
  fecha_alta?: string | null
  acta_alta_id?: string | null
  fecha_baja?: string | null
  activo?: boolean
  fundador?: boolean
  vinculado_reprocann?: boolean
  fecha_vinculacion?: string | null
  notas?: string | null
}

export interface CategoriaSocio {
  id: string
  nombre: string
  requiere_reprocann?: boolean
  con_voto?: boolean
  cuota?: number | null
  notas?: string | null
}

export interface Cuota {
  id: string
  tipo?: string | null
  categoria?: string | null
  valor: number
  vigente_desde?: string | null
  acta_id?: string | null
  notas?: string | null
}

/** Al 75% de ocupación ya hay que rubricar el libro siguiente. */
export const UMBRAL_RUBRICA_NUEVA = 0.75

export function ocupacionLibro(l: Libro): number | null {
  if (!l.folios_totales || l.folios_totales <= 0) return null
  return (l.folios_usados ?? 0) / l.folios_totales
}

/**
 * La numeración de actas es correlativa POR TIPO: cada órgano lleva su serie.
 * Devuelve los huecos y los repetidos, que es lo que genera observaciones.
 */
export interface ProblemaCorrelatividad {
  tipo: string
  faltantes: number[]
  repetidos: number[]
  fueraDeOrden: { numero: number; fecha: string }[]
}

export function revisarCorrelatividad(actas: Acta[]): ProblemaCorrelatividad[] {
  const porTipo = new Map<string, Acta[]>()
  for (const a of actas) {
    if (!porTipo.has(a.tipo)) porTipo.set(a.tipo, [])
    porTipo.get(a.tipo)!.push(a)
  }
  const out: ProblemaCorrelatividad[] = []
  for (const [tipo, lista] of porTipo) {
    const ordenadas = [...lista].sort((a, b) => a.numero - b.numero)
    const nums = ordenadas.map(a => a.numero)
    const faltantes: number[] = []
    for (let n = 1; n <= Math.max(...nums); n++) if (!nums.includes(n)) faltantes.push(n)
    const repetidos = [...new Set(nums.filter((n, i) => nums.indexOf(n) !== i))]
    // Si el número sube, la fecha no puede bajar.
    const fueraDeOrden: { numero: number; fecha: string }[] = []
    for (let i = 1; i < ordenadas.length; i++) {
      if (ordenadas[i].fecha < ordenadas[i - 1].fecha) {
        fueraDeOrden.push({ numero: ordenadas[i].numero, fecha: ordenadas[i].fecha })
      }
    }
    if (faltantes.length || repetidos.length || fueraDeOrden.length) {
      out.push({ tipo, faltantes, repetidos, fueraDeOrden })
    }
  }
  return out
}

/** Mayorías. Las abstenciones no suman a ningún lado pero bajan el total emitido. */
export type Mayoria = 'simple' | 'absoluta' | 'agravada' | 'unanimidad'

export function resultadoVotacion(
  p: PuntoOrdenDia, totalMiembros: number, mayoria: Mayoria = 'simple', fraccion = 2 / 3,
): { aprobado: boolean; explicacion: string } {
  const favor = p.favor ?? 0, contra = p.contra ?? 0, abst = p.abstenciones ?? 0
  const emitidos = favor + contra
  switch (mayoria) {
    case 'unanimidad':
      return { aprobado: favor > 0 && contra === 0 && abst === 0,
        explicacion: 'Unanimidad: todos a favor, sin votos en contra ni abstenciones.' }
    case 'absoluta':
      return { aprobado: favor > totalMiembros / 2,
        explicacion: `Mayoría absoluta: más de la mitad del total de miembros (${Math.floor(totalMiembros / 2) + 1} de ${totalMiembros}).` }
    case 'agravada':
      return { aprobado: favor >= Math.ceil(totalMiembros * fraccion),
        explicacion: `Mayoría agravada: ${Math.round(fraccion * 100)}% del total (${Math.ceil(totalMiembros * fraccion)} de ${totalMiembros}).` }
    default:
      return { aprobado: favor > contra,
        explicacion: `Mayoría simple sobre ${emitidos} votos emitidos. Las ${abst} abstenciones no cuentan pero reducen el total.` }
  }
}

// ---------------------------------------------------------------------------
// Coherencia: los cruces que hace una inspección.
// ---------------------------------------------------------------------------

export interface Chequeo {
  clave: string
  titulo: string
  estado: 'ok' | 'alerta' | 'error' | 'sin_datos'
  valor: string
  detalle: string
}

export function chequeosCoherencia(datos: {
  entidad: Entidad | null
  actas: Acta[]
  libros: Libro[]
  asociados: Asociado[]
  categorias: CategoriaSocio[]
  cuotas: Cuota[]
  pacientes: number
  plantasFloracion: number
  dispensas?: Dispensa[]
  costoPorGramo?: number | null
  gramosCosechados?: number
  cuotasEmitidas?: CuotaEmitida[]
  periodo?: string
}): Chequeo[] {
  const { entidad, actas, libros, asociados, categorias, cuotas, pacientes, plantasFloracion } = datos
  const c: Chequeo[] = []
  const activos = asociados.filter(a => a.activo !== false)

  // 1. Correlatividad de actas.
  const problemas = revisarCorrelatividad(actas)
  c.push(problemas.length === 0
    ? { clave: 'correlatividad', titulo: 'Actas correlativas', estado: actas.length ? 'ok' : 'sin_datos',
        valor: actas.length ? `${actas.length} actas` : 'sin actas',
        detalle: 'Numeración sin huecos ni repetidos, y las fechas acompañan al número.' }
    : { clave: 'correlatividad', titulo: 'Actas correlativas', estado: 'error',
        valor: `${problemas.length} serie${problemas.length === 1 ? '' : 's'} con problemas`,
        detalle: problemas.map(p => {
          const t = TIPOS_ACTA.find(x => x.id === p.tipo)?.nombre ?? p.tipo
          const partes: string[] = []
          if (p.faltantes.length) partes.push(`faltan ${p.faltantes.join(', ')}`)
          if (p.repetidos.length) partes.push(`repetidos ${p.repetidos.join(', ')}`)
          if (p.fueraDeOrden.length) partes.push(`${p.fueraDeOrden.length} fuera de orden cronológico`)
          return `${t}: ${partes.join(' · ')}`
        }).join(' | ') })

  // 2. Cada asociado activo tiene que estar aprobado en un acta.
  const sinActa = activos.filter(a => !a.acta_alta_id && !a.fundador)
  c.push(activos.length === 0
    ? { clave: 'altas_en_acta', titulo: 'Altas respaldadas en acta', estado: 'sin_datos', valor: 'sin asociados', detalle: 'Todavía no cargaste asociados.' }
    : sinActa.length === 0
      ? { clave: 'altas_en_acta', titulo: 'Altas respaldadas en acta', estado: 'ok', valor: `${activos.length}/${activos.length}`,
          detalle: 'Todos los asociados activos tienen su alta aprobada en un acta de Comisión Directiva.' }
      : { clave: 'altas_en_acta', titulo: 'Altas respaldadas en acta', estado: 'error',
          valor: `${sinActa.length} sin acta`,
          detalle: `El alta se aprueba primero en acta de CD y recién después va al Registro de Asociados. Sin acta: ${sinActa.slice(0, 5).map(a => a.nombre).join(', ')}${sinActa.length > 5 ? '…' : ''}.` })

  // 3. Categorías inventadas: las que usa un asociado tienen que existir en el estatuto.
  const nombresCat = new Set(categorias.map(x => x.nombre))
  const inventadas = [...new Set(activos.map(a => a.categoria).filter(x => x && !nombresCat.has(x)) as string[])]
  c.push(categorias.length === 0
    ? { clave: 'categorias', titulo: 'Categorías del estatuto', estado: 'sin_datos', valor: 'sin cargar',
        detalle: 'Cargá las categorías tal como figuran en el estatuto para poder validar contra ellas.' }
    : inventadas.length === 0
      ? { clave: 'categorias', titulo: 'Categorías del estatuto', estado: 'ok', valor: `${categorias.length} categorías`,
          detalle: 'Ningún asociado usa una categoría que no exista en el estatuto.' }
      : { clave: 'categorias', titulo: 'Categorías del estatuto', estado: 'error', valor: `${inventadas.length} inventada${inventadas.length === 1 ? '' : 's'}`,
          detalle: `Estas categorías no están en el estatuto: ${inventadas.join(', ')}. Es uno de los errores que más observan.` })

  // 4. El valor de la cuota tiene que estar aprobado en un acta.
  const cuotaSinActa = cuotas.filter(x => !x.acta_id)
  c.push(cuotas.length === 0
    ? { clave: 'cuota_en_acta', titulo: 'Cuota aprobada en acta', estado: 'sin_datos', valor: 'sin cuota cargada',
        detalle: 'Sin una cuota aprobada en acta no hay forma de probar cuál es la cuota social de la entidad.' }
    : cuotaSinActa.length === 0
      ? { clave: 'cuota_en_acta', titulo: 'Cuota aprobada en acta', estado: 'ok', valor: `${cuotas.length} vigente${cuotas.length === 1 ? '' : 's'}`,
          detalle: 'Cada valor de cuota tiene el acta que lo aprobó.' }
      : { clave: 'cuota_en_acta', titulo: 'Cuota aprobada en acta', estado: 'error', valor: `${cuotaSinActa.length} sin acta`,
          detalle: 'Una reunión informal no alcanza: el valor tiene que estar aprobado por el órgano y pasado al libro.' })

  // 5. Libros rubricados. Sin rúbrica el libro no vale.
  const sinRubrica = libros.filter(l => !l.rubricado)
  c.push(libros.length === 0
    ? { clave: 'rubrica', titulo: 'Libros rubricados', estado: 'sin_datos', valor: 'sin libros cargados', detalle: 'La rúbrica es la autorización del registro para usar el libro.' }
    : sinRubrica.length === 0
      ? { clave: 'rubrica', titulo: 'Libros rubricados', estado: 'ok', valor: `${libros.length}/${libros.length}`, detalle: 'Todos los libros cargados están rubricados.' }
      : { clave: 'rubrica', titulo: 'Libros rubricados', estado: 'error', valor: `${sinRubrica.length} sin rúbrica`,
          detalle: `Un acta pasada a un libro sin rubricar no se inscribe en ningún lado. Falta: ${sinRubrica.map(l => TIPOS_LIBRO.find(t => t.id === l.tipo)?.nombre ?? l.tipo).join(', ')}.` })

  // 6. Libros por encima del 75%: hay que rubricar el siguiente.
  const llenos = libros.filter(l => { const o = ocupacionLibro(l); return o != null && o >= UMBRAL_RUBRICA_NUEVA })
  if (llenos.length) {
    c.push({ clave: 'ocupacion', titulo: 'Libros por reponer', estado: 'alerta', valor: `${llenos.length} sobre el 75%`,
      detalle: `Conviene rubricar el libro siguiente antes de quedarte sin folios: ${llenos.map(l => TIPOS_LIBRO.find(t => t.id === l.tipo)?.nombre ?? l.tipo).join(', ')}.` })
  }

  // 7. Los siete libros obligatorios.
  const faltanLibros = TIPOS_LIBRO.filter(t => !libros.some(l => l.tipo === t.id))
  if (faltanLibros.length) {
    c.push({ clave: 'libros_faltantes', titulo: 'Libros obligatorios', estado: 'alerta',
      valor: `faltan ${faltanLibros.length} de ${TIPOS_LIBRO.length}`,
      detalle: `Sin cargar: ${faltanLibros.map(t => t.nombre).join(', ')}.` })
  }

  // 8. Plantas en floración contra el tope de la 1780.
  const topePlantas = pacientes * (entidad?.plantas_por_paciente ?? 9)
  c.push({
    clave: 'plantas', titulo: 'Plantas en floración vs. tope',
    estado: pacientes === 0 ? 'sin_datos' : plantasFloracion > topePlantas ? 'error' : 'ok',
    valor: `${plantasFloracion} / ${topePlantas}`,
    detalle: pacientes === 0
      ? 'Sin pacientes vinculados no hay plantas habilitadas.'
      : `${entidad?.plantas_por_paciente ?? 9} en floración por paciente vinculado. Las de vegetativo no cuentan.`,
  })

  // 9. Objeto social: el estatuto tiene que declarar el objeto cannábico.
  c.push(entidad?.objeto_cannabis
    ? { clave: 'objeto', titulo: 'Objeto social cannábico', estado: 'ok', valor: 'declarado',
        detalle: 'El estatuto declara el objeto de estudio, investigación y/o uso medicinal del cannabis.' }
    : { clave: 'objeto', titulo: 'Objeto social cannábico', estado: 'error', valor: 'sin declarar',
        detalle: 'Sin objeto cannábico en el estatuto no se puede inscribir la ONG en REPROCANN. Una asociación preexistente se adecúa reformando el estatuto.' })

  // 10. Dispensas: a quién se entregó y si el aporte se pasó del costo.
  const ds = datos.dispensas ?? []
  if (ds.length) {
    const r = resumirDispensas(ds)
    const sinPaciente = ds.filter(d => !d.paciente_id).length
    const excedidas = ds.filter(d => d.gramos > TOPE_TRASLADO_INDIVIDUAL_G && !d.con_receta).length
    if (sinPaciente > 0) {
      c.push({ clave: 'dispensa_sin_paciente', titulo: 'Dispensas sin paciente', estado: 'error',
        valor: `${sinPaciente}`, detalle: 'Una dispensa siempre va a una persona identificada y vinculada en REPROCANN.' })
    }
    if (excedidas > 0) {
      c.push({ clave: 'dispensa_tope', titulo: 'Dispensas sobre los 40 g', estado: 'alerta', valor: `${excedidas}`,
        detalle: `Un traslado individual no puede superar los ${TOPE_TRASLADO_INDIVIDUAL_G} g sin receta que respalde la necesidad medicinal.` })
    }
    // El aporte tiene que cubrir el costo, no superarlo: ahí deja de ser aporte.
    const costo = datos.costoPorGramo ?? null
    if (costo && r.aportePorGramo != null) {
      c.push(r.aportePorGramo > costo * 1.05
        ? { clave: 'aporte', titulo: 'Aporte vs. costo real', estado: 'error',
            valor: `$${Math.round(r.aportePorGramo).toLocaleString('es-AR')}/g`,
            detalle: `Tu costo real es $${Math.round(costo).toLocaleString('es-AR')}/g. El aporte cubre gastos: por encima del costo deja de ser un aporte solidario.` }
        : { clave: 'aporte', titulo: 'Aporte vs. costo real', estado: 'ok',
            valor: `$${Math.round(r.aportePorGramo).toLocaleString('es-AR')}/g`,
            detalle: `Por debajo del costo real de $${Math.round(costo).toLocaleString('es-AR')}/g: el aporte está cubriendo gastos, como corresponde.` })
    }
  }

  // 11. Balance de materia: lo cosechado tiene que dar cuenta de lo entregado.
  const gCos = datos.gramosCosechados ?? 0
  if (gCos > 0 || ds.length) {
    const b = balanceMateria(gCos, ds)
    c.push(b.inconsistente
      ? { clave: 'balance', titulo: 'Balance de materia', estado: 'error',
          valor: `faltan ${Math.round(b.dispensado - b.cosechado)} g`,
          detalle: `Dispensaste ${Math.round(b.dispensado)} g pero tenés ${Math.round(b.cosechado)} g cosechados. No se puede entregar lo que no se cosechó: hay un error de carga en cosechas o en dispensas.` }
      : { clave: 'balance', titulo: 'Balance de materia', estado: 'ok',
          valor: `${Math.round(b.stock)} g en stock`,
          detalle: `${Math.round(b.cosechado)} g cosechados menos ${Math.round(b.dispensado)} g entregados. Es lo que tenés que poder mostrar si te lo piden.` })
  }

  // 12. El cruce que mas observan: asociados registrados vs ingresos por cuotas.
  const em = datos.cuotasEmitidas ?? []
  if (activos.length > 0) {
    const per = datos.periodo ?? periodoActual()
    const r = resumenCobranza(per, em, asociados)
    c.push(r.emitidas === 0
      ? { clave: 'cuotas_periodo', titulo: 'Cuotas del período', estado: 'alerta',
          valor: `0 de ${r.asociadosActivos}`,
          detalle: `No emitiste las cuotas de ${per}. El cruce entre asociados registrados e ingresos por cuotas es la comparación que más observaciones genera.` }
      : r.sinEmitir > 0
        ? { clave: 'cuotas_periodo', titulo: 'Cuotas del período', estado: 'error',
            valor: `${r.emitidas} de ${r.asociadosActivos}`,
            detalle: `${r.sinEmitir} asociado${r.sinEmitir === 1 ? '' : 's'} activo${r.sinEmitir === 1 ? '' : 's'} sin cuota emitida en ${per}. Si figura como asociado, tiene que tener su cuota.` }
        : { clave: 'cuotas_periodo', titulo: 'Cuotas del período', estado: 'ok',
            valor: `${r.pagadas}/${r.emitidas} cobradas`,
            detalle: `Todos los activos tienen cuota emitida en ${per}. Cobrado ${Math.round(r.montoCobrado).toLocaleString('es-AR')} de ${Math.round(r.montoEmitido).toLocaleString('es-AR')}.` })
  }

  const orden: Record<Chequeo['estado'], number> = { error: 0, alerta: 1, sin_datos: 2, ok: 3 }
  return c.sort((a, b) => orden[a.estado] - orden[b.estado])
}

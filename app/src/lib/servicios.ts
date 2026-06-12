// ============================================================================
// CannTrace - Servicios Supabase (capa de datos)
// Toda interaccion con la DB pasa por aca
// ============================================================================

import { supabase } from './supabase'
import type {
  PerfilUsuario,
  TipoOperacion, EstadoOperacion
} from '../types'

// ============================================================================
// AUTH
// ============================================================================

export const authService = {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    return data
  },

  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  async getPerfil(): Promise<PerfilUsuario | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('perfiles_usuario')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) return null
    return data as PerfilUsuario
  },

  onAuthChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// ============================================================================
// STOCK / LOTES
// ============================================================================

export const stockService = {
  async getStockActual() {
    const { data, error } = await supabase
      .from('vista_stock_actual')
      .select('*')
      .order('creado_en', { ascending: false })

    if (error) throw new Error(error.message)
    return data
  },

  async getLotes(estado?: string) {
    let query = supabase
      .from('lotes')
      .select(`
        *,
        productos:producto_id (nombre, tipo_producto, unidad_medida),
        instalaciones:instalacion_id (nombre, tipo)
      `)
      .eq('eliminado', false)
      .order('creado_en', { ascending: false })

    if (estado) query = query.eq('estado', estado)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data
  },

  async getIndividuos(loteId?: string) {
    let query = supabase
      .from('individuos')
      .select(`
        *,
        productos:producto_id (nombre),
        lotes:lote_id (codigo_lote),
        instalaciones:instalacion_id (nombre)
      `)
      .eq('eliminado', false)
      .eq('estado', 'activo')

    if (loteId) query = query.eq('lote_id', loteId)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data
  },

  async getMovimientosLote(loteId: string) {
    const { data, error } = await supabase
      .from('operaciones')
      .select(`
        *,
        instalacion_origen:instalacion_origen_id (nombre),
        instalacion_destino:instalacion_destino_id (nombre)
      `)
      .or(`lote_origen_id.eq.${loteId},lote_destino_id.eq.${loteId}`)
      .order('fecha_operacion', { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)
    return data
  }
}

// ============================================================================
// OPERACIONES
// ============================================================================

export const operacionesService = {
  async getOperaciones(limit = 50) {
    const { data, error } = await supabase
      .from('operaciones')
      .select(`
        *,
        instalacion_origen:instalacion_origen_id (nombre),
        instalacion_destino:instalacion_destino_id (nombre),
        lote_origen:lote_origen_id (codigo_lote),
        lote_destino:lote_destino_id (codigo_lote)
      `)
      .order('fecha_operacion', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return data
  },

  async crearOperacion(datos: {
    tipo_operacion: TipoOperacion
    instalacion_origen_id?: string
    lote_origen_id?: string
    instalacion_destino_id?: string
    lote_destino_id?: string
    cantidad_entrada?: number
    cantidad_salida?: number
    responsable?: string
    observaciones?: string
    notas_sanitarias?: string
    peso_fresco_kg?: number
    peso_seco_kg?: number
    peso_neto_g?: number
    rendimiento_porcentaje?: number
    temperatura_c?: number
    humedad_porcentaje?: number
    texto_original?: string
    json_estructurado?: Record<string, unknown>
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    const { data, error } = await supabase
      .from('operaciones')
      .insert({
        ...datos,
        estado: 'borrador' as EstadoOperacion,
        creado_por: user.id,
      })
      .select()

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) throw new Error('No se pudo crear la operacion')
    return data[0]
  },

  async confirmarOperacion(operacionId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    const { data, error } = await supabase
      .from('operaciones')
      .update({
        estado: 'confirmada' as EstadoOperacion,
        confirmado_por: user.id,
        confirmado_en: new Date().toISOString(),
      })
      .eq('id', operacionId)
      .select()

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) throw new Error('No se pudo confirmar la operacion')
    return data[0]
  },

  async getEstadisticas() {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const [lotesRes, individuosRes, opsHoyRes] = await Promise.all([
      supabase.from('lotes').select('id', { count: 'exact', head: true }).eq('estado', 'activo').eq('eliminado', false),
      supabase.from('individuos').select('id', { count: 'exact', head: true }).eq('estado', 'activo').eq('eliminado', false),
      supabase.from('operaciones').select('id', { count: 'exact', head: true }).gte('fecha_operacion', hoy.toISOString()),
    ])

    return {
      lotesActivos: lotesRes.count || 0,
      individuosActivos: individuosRes.count || 0,
      operacionesHoy: opsHoyRes.count || 0,
    }
  }
}

// ============================================================================
// CATALOGO (productos, instalaciones, almacenes)
// ============================================================================

export const catalogoService = {
  async getProductos() {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .eq('eliminado', false)
      .order('nombre')
    if (error) throw new Error(error.message)
    return data
  },

  async getInstalaciones() {
    const { data, error } = await supabase
      .from('instalaciones')
      .select('*, almacenes:almacen_id (nombre)')
      .eq('activo', true)
      .eq('eliminado', false)
      .order('nombre')
    if (error) throw new Error(error.message)
    return data
  },

  async getVariedades() {
    const { data, error } = await supabase
      .from('variedades')
      .select('*')
      .eq('activo', true)
      .eq('eliminado', false)
      .order('nombre')
    if (error) throw new Error(error.message)
    return data
  },

  async getConfiguracion() {
    const { data, error } = await supabase
      .from('configuracion_sistema')
      .select('*')
      .order('categoria', { ascending: true })
    if (error) throw new Error(error.message)
    return data
  }
}

// ============================================================================
// TRAZABILIDAD
// ============================================================================

export const trazabilidadService = {
  async getCadenaInversa(loteId: string) {
    // Usa la vista recursiva para obtener toda la cadena
    const { data, error } = await supabase
      .from('vista_trazabilidad_inversa')
      .select('*')
      .eq('id', loteId)

    if (error) throw new Error(error.message)

    // Si no hay resultado directo, buscar por codigo_lote
    if (!data || data.length === 0) {
      const { data: dataByCode, error: errCode } = await supabase
        .from('vista_trazabilidad_inversa')
        .select('*')

      if (errCode) throw new Error(errCode.message)
      return dataByCode
    }

    return data
  },

  async buscarPorCodigo(codigo: string) {
    // Buscar en lotes
    const { data: lotes } = await supabase
      .from('lotes')
      .select('*, productos:producto_id (nombre, tipo_producto), instalaciones:instalacion_id (nombre)')
      .ilike('codigo_lote', `%${codigo}%`)
      .limit(10)

    // Buscar en individuos
    const { data: individuos } = await supabase
      .from('individuos')
      .select('*, productos:producto_id (nombre), lotes:lote_id (codigo_lote), instalaciones:instalacion_id (nombre)')
      .ilike('codigo_serie', `%${codigo}%`)
      .limit(10)

    return { lotes: lotes || [], individuos: individuos || [] }
  }
}

// ============================================================================
// AUDITORIA
// ============================================================================

export const auditoriaService = {
  async getRegistros(limit = 100) {
    const { data, error } = await supabase
      .from('registro_auditoria')
      .select('*')
      .order('marca_tiempo', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return data
  },

  async verificarIntegridad() {
    const { data, error } = await supabase.rpc('verificar_integridad_cadena')
    if (error) throw new Error(error.message)
    return data
  }
}

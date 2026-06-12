// Componente compartido: renderiza los inputs especificos de un registro CUMCS
// segun (grupo, codigo). Usado por PaginaRegistros (CUMCS) y FormularioOperacion.

import InputConSugerencias from './InputConSugerencias'
import { useSugerencias, formatearIdLote } from '../../lib/sugerenciasCumcs'

interface Props {
  grupo: string
  codigo: string
  formCampos: Record<string, string>
  setFormCampo: (k: string, v: string) => void
  /** Callback opcional cuando el operador marca un ID lote como nuevo. */
  onMarcarLoteNuevo?: (valor: string) => void
}

export default function CamposCumcs({ grupo, codigo, formCampos, setFormCampo, onMarcarLoteNuevo }: Props) {
  const i = "w-full px-3 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
  const cod = codigo
  const sugerencias = useSugerencias(codigo)

  // ===== G01 Condiciones Ambientales =====
  if (grupo === 'G01') {
    const esCompleto = ['CM-RE-0101','CM-RE-0102','CM-RE-0103','CM-RE-0104','CM-RE-0105'].includes(cod)
    const esClonacion = cod === 'CM-RE-0103'
    const esVegFlora = ['CM-RE-0104','CM-RE-0105'].includes(cod)
    const esSecado = cod === 'CM-RE-0106'
    const esSimple = ['CM-RE-0106','CM-RE-0107','CM-RE-0108'].includes(cod)
    const esPmCoco = cod === 'CM-RE-0102'
    const esPmHidro = cod === 'CM-RE-0101'
    const esPlantaMadre = esPmHidro || esPmCoco
    return <>
      {/* Encabezado Planta Madre — variedad (ambos) + identificacion PM (solo Coco, en Hidro va por ID LOTE) */}
      {esPlantaMadre && <div className="grid grid-cols-2 gap-3">
        {esPmCoco && (
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Identificacion de planta madre</label>
            <InputConSugerencias
              value={formCampos.id_planta_madre || ''}
              onChange={v => setFormCampo('id_planta_madre', v)}
              sugerencias={sugerencias.id_planta_madre ?? sugerencias.id_lote ?? []}
              placeholder="25.PM4"
              autoFormat={formatearIdLote}
              marcarNuevoSiNoEsta
              onMarcarNuevo={onMarcarLoteNuevo}
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Variedad</label>
          <InputConSugerencias
            value={formCampos.variedad || 'Pete Hope'}
            onChange={v => setFormCampo('variedad', v)}
            sugerencias={sugerencias.variedad ?? []}
            placeholder="Pete Hope"
          />
        </div>
      </div>}
      <div className="grid grid-cols-2 gap-3">
        {esCompleto && <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Sistema</label>
          <select value={formCampos.sistema || 'RDWC'} onChange={e => setFormCampo('sistema', e.target.value)} className={i}>
            <option value="RDWC">RDWC</option><option value="COCO">COCO</option>
          </select>
        </div>}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">ID LOTE</label>
          <InputConSugerencias
            value={formCampos.id_lote || ''}
            onChange={v => setFormCampo('id_lote', v)}
            sugerencias={sugerencias.id_lote ?? []}
            placeholder="25.PM4, CL15, C7..."
            autoFormat={formatearIdLote}
            marcarNuevoSiNoEsta
            onMarcarNuevo={onMarcarLoteNuevo}
          />
        </div>
        {!esCompleto && <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Sistema</label>
          <select value={formCampos.sistema || 'RDWC'} onChange={e => setFormCampo('sistema', e.target.value)} className={i}>
            <option value="RDWC">RDWC</option><option value="COCO">COCO</option>
          </select>
        </div>}
      </div>
      {esClonacion && <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Aeroclonador Nº</label>
          <input type="number" placeholder="1" value={formCampos.aeroclonador || ''} onChange={e => setFormCampo('aeroclonador', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Sustrato</label>
          <input type="text" placeholder="Hidroponia" value={formCampos.sustrato || 'Hidroponia'} onChange={e => setFormCampo('sustrato', e.target.value)} className={i} />
        </div>
      </div>}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Humedad (%)</label>
          <input type="number" step="0.1" placeholder="65.0" value={formCampos.humedad || ''} onChange={e => setFormCampo('humedad', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Temperatura °C</label>
          <input type="number" step="0.1" placeholder="24.0" value={formCampos.temperatura || ''} onChange={e => setFormCampo('temperatura', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">T° A.A</label>
          <input type="number" step="0.1" placeholder="17.0" value={formCampos.temp_aa || ''} onChange={e => setFormCampo('temp_aa', e.target.value)} className={i} />
        </div>
      </div>
      {esCompleto && <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">T° H20</label>
          <input type="number" step="0.1" placeholder="20.0" value={formCampos.temp_h2o || ''} onChange={e => setFormCampo('temp_h2o', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">EC</label>
          <input type="number" step="0.1" placeholder="678" value={formCampos.ec || ''} onChange={e => setFormCampo('ec', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">{esVegFlora ? 'ORP' : 'VPD (kpa)'}</label>
          <input type="number" step="0.01" placeholder={esVegFlora ? '200' : '0.84'} value={(esVegFlora ? formCampos.orp : formCampos.vpd_kpa) || ''} onChange={e => setFormCampo(esVegFlora ? 'orp' : 'vpd_kpa', e.target.value)} className={i} />
        </div>
      </div>}
      {esCompleto && <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">pH Inicial</label>
          <input type="number" step="0.01" placeholder="5.92" value={formCampos.ph_inicial || ''} onChange={e => setFormCampo('ph_inicial', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">ML (pH+/-)</label>
          <input type="text" placeholder="-" value={formCampos.ph_ml || ''} onChange={e => setFormCampo('ph_ml', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">pH Corregido</label>
          <input type="text" placeholder="-" value={formCampos.ph_corregido || ''} onChange={e => setFormCampo('ph_corregido', e.target.value)} className={i} />
        </div>
      </div>}
      {!esSimple && <div className="grid grid-cols-2 gap-3">
        {!esVegFlora && <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">CO2 (ppm)</label>
          <input type="number" placeholder="633" value={formCampos.co2_ppm || ''} onChange={e => setFormCampo('co2_ppm', e.target.value)} className={i} />
        </div>}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Ventilación</label>
          <input type="text" placeholder="V 3" value={formCampos.ventilacion || ''} onChange={e => setFormCampo('ventilacion', e.target.value)} className={i} />
        </div>
        {(esVegFlora || esClonacion) && <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Extraccion</label>
          <input type="text" placeholder="" value={formCampos.extraccion || ''} onChange={e => setFormCampo('extraccion', e.target.value)} className={i} />
        </div>}
      </div>}
      {/* Observaciones (CM-RE-0101 / 0102 / 0103 / 0104 / 0105) */}
      {esCompleto && <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Observaciones</label>
        <textarea rows={2} placeholder="PPFD, notas, eventos del dia..." value={formCampos.observaciones || ''} onChange={e => setFormCampo('observaciones', e.target.value)}
          className="w-full px-3 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none" />
      </div>}
      {esSecado && <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Presencia de insectos</label>
          <select value={formCampos.insectos || 'No'} onChange={e => setFormCampo('insectos', e.target.value)} className={i}>
            <option>No</option><option>Si</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Presencia de hongos</label>
          <select value={formCampos.hongos || 'No'} onChange={e => setFormCampo('hongos', e.target.value)} className={i}>
            <option>No</option><option>Si</option>
          </select>
        </div>
      </div>}
    </>
  }

  // ===== G02 Trazabilidad =====
  if (grupo === 'G02') return <>
    {cod === 'CM-RE-0201' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Código ID *</label>
          <InputConSugerencias
            value={formCampos.codigo_id || ''}
            onChange={v => setFormCampo('codigo_id', v)}
            sugerencias={sugerencias.codigo_id ?? sugerencias.id_lote ?? []}
            placeholder="25.PM10"
            autoFormat={formatearIdLote}
            marcarNuevoSiNoEsta
            onMarcarNuevo={onMarcarLoteNuevo}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Sistema *</label>
          <select value={formCampos.sistema || 'RDWC'} onChange={e => setFormCampo('sistema', e.target.value)} className={i}>
            <option value="RDWC">RDWC</option><option value="COCO">COCO</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Fecha de ingreso *</label>
          <input type="date" value={formCampos.fecha_ingreso || ''} onChange={e => setFormCampo('fecha_ingreso', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Fecha de baja</label>
          <input type="date" value={formCampos.fecha_baja || ''} onChange={e => setFormCampo('fecha_baja', e.target.value)} className={i} />
          <p className="text-[10px] text-surface-400 mt-0.5">Dejar vacio si esta vigente</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Nº Clonación que da origen PM</label>
          <InputConSugerencias
            value={formCampos.clonacion_origen || ''}
            onChange={v => setFormCampo('clonacion_origen', v)}
            sugerencias={sugerencias.clonacion_origen ?? sugerencias.cod_traza ?? []}
            placeholder="CL16, Inicial..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">ID Madre que da origen</label>
          <InputConSugerencias
            value={formCampos.madre_origen || ''}
            onChange={v => setFormCampo('madre_origen', v)}
            sugerencias={sugerencias.madre_origen ?? sugerencias.id_planta_madre ?? sugerencias.id_lote ?? []}
            placeholder="25.PM9, Inicial..."
          />
        </div>
      </div>
    </>}
    {cod === 'CM-RE-0202' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Cod. Traza *</label>
          <input type="text" placeholder="1 PM8.1" value={formCampos.cod_traza || ''} onChange={e => setFormCampo('cod_traza', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Camada *</label>
          <input type="text" placeholder="15, 16..." value={formCampos.camada || ''} onChange={e => setFormCampo('camada', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Planta Madre *</label>
          <input type="text" placeholder="8, 9..." value={formCampos.planta_madre || ''} onChange={e => setFormCampo('planta_madre', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Bandeja Nº *</label>
          <input type="number" placeholder="1-7" value={formCampos.bandeja || ''} onChange={e => setFormCampo('bandeja', e.target.value)} className={i} />
        </div>
      </div>
    </>}
    {(cod === 'CM-RE-0203' || cod === 'CM-RE-0204') && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Cod. Traza *</label>
          <input type="text" placeholder={cod === 'CM-RE-0203' ? '25.SF2.Li1-VG001-PM4-C07' : '25.SF2.Li1-FL001-PM4-C07'} value={formCampos.cod_traza || ''} onChange={e => setFormCampo('cod_traza', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Camada *</label>
          <input type="text" placeholder="C7, C9..." value={formCampos.camada || ''} onChange={e => setFormCampo('camada', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Sistema *</label>
          <select value={formCampos.sistema || 'RDWC'} onChange={e => setFormCampo('sistema', e.target.value)} className={i}>
            <option value="RDWC">RDWC</option><option value="Coco">Coco</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Sala</label>
          <input type="text" placeholder="Flora 2" value={formCampos.sala || ''} onChange={e => setFormCampo('sala', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Fila</label>
          <input type="text" placeholder="Fila 1" value={formCampos.fila || ''} onChange={e => setFormCampo('fila', e.target.value)} className={i} />
        </div>
      </div>
    </>}
    {cod === 'CM-RE-0205' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Cod. Traza *</label>
          <input type="text" placeholder="25.CDS22-SFL2-FL8-C7" value={formCampos.cod_traza || ''} onChange={e => setFormCampo('cod_traza', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Camada *</label>
          <input type="text" placeholder="C7, C9..." value={formCampos.camada || ''} onChange={e => setFormCampo('camada', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Sistema</label>
          <select value={formCampos.sistema || 'RDWC'} onChange={e => setFormCampo('sistema', e.target.value)} className={i}>
            <option value="RDWC">RDWC</option><option value="COCO">COCO</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Nº Cuadro *</label>
          <input type="text" placeholder="22" value={formCampos.cuadro || ''} onChange={e => setFormCampo('cuadro', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Fecha Inicio *</label>
          <input type="date" value={formCampos.fecha_inicio || ''} onChange={e => setFormCampo('fecha_inicio', e.target.value)} className={i} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Fecha Fin Secado</label>
        <input type="date" value={formCampos.fecha_fin || ''} onChange={e => setFormCampo('fecha_fin', e.target.value)} className={i} />
      </div>
    </>}
    {cod === 'CM-RE-0206' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Cod. Traza *</label>
          <input type="text" placeholder="25.Tr22.Ka.PM4.C7" value={formCampos.cod_traza || ''} onChange={e => setFormCampo('cod_traza', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Camada *</label>
          <input type="text" placeholder="C7, C9..." value={formCampos.camada || ''} onChange={e => setFormCampo('camada', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Sistema</label>
          <select value={formCampos.sistema || 'RDWC'} onChange={e => setFormCampo('sistema', e.target.value)} className={i}>
            <option value="RDWC">RDWC</option><option value="COCO">COCO</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Fecha Ingreso Trimeo *</label>
          <input type="date" value={formCampos.fecha_ingreso || ''} onChange={e => setFormCampo('fecha_ingreso', e.target.value)} className={i} />
        </div>
      </div>
    </>}
    {cod === 'CM-RE-0207' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Cod. Traza *</label>
          <input type="text" placeholder="25. AL8 Ka BI1 PM4.C7" value={formCampos.cod_traza || ''} onChange={e => setFormCampo('cod_traza', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Camada *</label>
          <input type="text" placeholder="C7, C9..." value={formCampos.camada || ''} onChange={e => setFormCampo('camada', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Sistema</label>
          <select value={formCampos.sistema || 'RDWC'} onChange={e => setFormCampo('sistema', e.target.value)} className={i}>
            <option value="RDWC">RDWC</option><option value="COCO">COCO</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Fecha Ingreso Almacenamiento</label>
          <input type="date" value={formCampos.fecha_ingreso || ''} onChange={e => setFormCampo('fecha_ingreso', e.target.value)} className={i} />
        </div>
      </div>
    </>}
    {cod === 'CM-RE-0208' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">ID Bolsa (cod interno) *</label>
          <input type="text" placeholder="25. AL8 Ka BI1 PM4.C7" value={formCampos.cod_traza || ''} onChange={e => setFormCampo('cod_traza', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Camada *</label>
          <input type="text" placeholder="C7" value={formCampos.camada || ''} onChange={e => setFormCampo('camada', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Nº Fila</label>
          <input type="number" placeholder="4" value={formCampos.fila || ''} onChange={e => setFormCampo('fila', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Nº CDS</label>
          <input type="number" placeholder="8" value={formCampos.cuadro || ''} onChange={e => setFormCampo('cuadro', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Gr/Bolsa *</label>
          <input type="number" placeholder="400" value={formCampos.peso || ''} onChange={e => setFormCampo('peso', e.target.value)} className={i} />
        </div>
      </div>
    </>}
    {cod === 'CM-RE-0209' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Codigo Comercial *</label>
          <input type="text" placeholder="25.FIS.BI1.C7.8" value={formCampos.cod_comercial || ''} onChange={e => setFormCampo('cod_comercial', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">ID Bolsa (cod interno) *</label>
          <input type="text" placeholder="25. AL8 Ka BI1 PM4.C7" value={formCampos.cod_traza || ''} onChange={e => setFormCampo('cod_traza', e.target.value)} className={i} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Camada *</label>
        <input type="text" placeholder="C7" value={formCampos.camada || ''} onChange={e => setFormCampo('camada', e.target.value)} className={i} />
      </div>
    </>}
  </>

  // ===== G03 Fertilizantes =====
  if (grupo === 'G03') return <>
    {cod === 'CM-RE-0301' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Tanque *</label>
          <input type="text" placeholder="Ablandador, Tanque 1..." value={formCampos.tanque || ''} onChange={e => setFormCampo('tanque', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Destino Solucion *</label>
          <select value={formCampos.destino || ''} onChange={e => setFormCampo('destino', e.target.value)} className={i}>
            <option value="">Seleccionar...</option>
            <option>Sala Flora 1</option><option>Sala Flora 2</option>
            <option>Plantas Madres</option><option>Vegetativo</option><option>Clonacion</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Pro Core (kg/g)</label>
          <input type="number" step="0.01" placeholder="2260" value={formCampos.pro_core || ''} onChange={e => setFormCampo('pro_core', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Pro Grow (kg/g)</label>
          <input type="number" step="0.01" placeholder="2260" value={formCampos.pro_grow || ''} onChange={e => setFormCampo('pro_grow', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Pro Bloom (kg/g)</label>
          <input type="number" step="0.01" placeholder="3796" value={formCampos.pro_bloom || ''} onChange={e => setFormCampo('pro_bloom', e.target.value)} className={i} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Litros Sol. Nutritiva</label>
        <input type="number" placeholder="4000" value={formCampos.litros || ''} onChange={e => setFormCampo('litros', e.target.value)} className={i} />
      </div>
    </>}
    {cod === 'CM-RE-0303' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Sala *</label>
          <select value={formCampos.sala || ''} onChange={e => setFormCampo('sala', e.target.value)} className={i}>
            <option value="">Seleccionar...</option>
            <option>Plantas Madres</option><option>Floracion</option><option>Vegetativo</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">ID Lote *</label>
          <input type="text" placeholder="PM6, C12..." value={formCampos.id_lote || ''} onChange={e => setFormCampo('id_lote', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Etapa</label>
          <input type="text" placeholder="Vegetativo, Floracion..." value={formCampos.etapa || ''} onChange={e => setFormCampo('etapa', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Tipo *</label>
          <select value={formCampos.tipo_gasto || ''} onChange={e => setFormCampo('tipo_gasto', e.target.value)} className={i}>
            <option value="">Seleccionar...</option>
            <option>Renovacion</option><option>Reposicion</option>
          </select>
        </div>
      </div>
    </>}
    {cod === 'CM-RE-0304' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Producto *</label>
          <select value={formCampos.producto || ''} onChange={e => setFormCampo('producto', e.target.value)} className={i}>
            <option value="">Seleccionar...</option>
            <option>ATHENA PRO GROW</option><option>ATHENA PRO CORE</option>
            <option>ATHENA PRO BLOOM</option><option>ATHENA BALANCE</option>
            <option>ATHENA FADE</option><option>Otro</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Fecha Entrada/Salida</label>
          <input type="date" value={formCampos.fecha_mov || ''} onChange={e => setFormCampo('fecha_mov', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Entrada (kg/lt)</label>
          <input type="number" step="0.01" placeholder="40" value={formCampos.entrada || ''} onChange={e => setFormCampo('entrada', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Salida (kg/lt)</label>
          <input type="number" step="0.01" placeholder="0" value={formCampos.salida || ''} onChange={e => setFormCampo('salida', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Saldo (kg/lt)</label>
          <input type="number" step="0.01" placeholder="" value={formCampos.saldo || ''} onChange={e => setFormCampo('saldo', e.target.value)} className={i} />
        </div>
      </div>
    </>}
    {cod === 'CM-RE-0305' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Producto *</label>
          <select value={formCampos.producto || ''} onChange={e => setFormCampo('producto', e.target.value)} className={i}>
            <option value="">Seleccionar...</option>
            <option>Fertilizantes Athena</option><option>Fibra de Coco</option>
            <option>Balance</option><option>FADE Athena</option>
            <option>Secuestrante SFC</option><option>Trichoderma</option>
            <option>Acido Borico</option><option>Micorrizas</option>
            <option>STACK</option><option>Azufre Agricola</option><option>OXIDAL</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Fecha</label>
          <input type="date" value={formCampos.fecha_mov || ''} onChange={e => setFormCampo('fecha_mov', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Entrada (kg)</label>
          <input type="number" step="0.01" value={formCampos.entrada || ''} onChange={e => setFormCampo('entrada', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Salida (kg)</label>
          <input type="number" step="0.01" value={formCampos.salida || ''} onChange={e => setFormCampo('salida', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Saldo (kg)</label>
          <input type="number" step="0.01" value={formCampos.saldo || ''} onChange={e => setFormCampo('saldo', e.target.value)} className={i} />
        </div>
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm text-surface-700">
          <input type="checkbox" checked={formCampos.verificada === 'SI'} onChange={e => setFormCampo('verificada', e.target.checked ? 'SI' : 'NO')} className="rounded" />
          Verificada
        </label>
      </div>
    </>}
    {cod === 'CM-RE-0306' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Sector *</label>
          <input type="text" placeholder="Mantenimiento, Produccion..." value={formCampos.sector || ''} onChange={e => setFormCampo('sector', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Evento</label>
          <input type="text" placeholder="Grupo Electrogeno, Limpieza..." value={formCampos.evento || ''} onChange={e => setFormCampo('evento', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Insumos *</label>
          <input type="text" placeholder="Filtro combustible, etc" value={formCampos.insumos || ''} onChange={e => setFormCampo('insumos', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Cantidad</label>
          <input type="number" placeholder="2" value={formCampos.cantidad || ''} onChange={e => setFormCampo('cantidad', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Prioridad</label>
          <select value={formCampos.prioridad || 'Normal'} onChange={e => setFormCampo('prioridad', e.target.value)} className={i}>
            <option>Alto</option><option>Normal</option><option>Bajo</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Estado</label>
          <select value={formCampos.estado_pedido || 'Informado'} onChange={e => setFormCampo('estado_pedido', e.target.value)} className={i}>
            <option>Informado</option><option>En Proceso</option><option>Comprado</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Detalle/Fundamento</label>
        <input type="text" placeholder="Fundamento de compra" value={formCampos.detalle || ''} onChange={e => setFormCampo('detalle', e.target.value)} className={i} />
      </div>
    </>}
    {cod === 'CM-RE-0302' && <p className="text-sm text-surface-400 italic">Sin estructura de datos en Excel para este registro</p>}
  </>

  // ===== G04 Agua =====
  if (grupo === 'G04') return <>
    {cod === 'CM-RE-0401' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Agua tratada (lts) *</label>
          <input type="number" step="1" placeholder="54000" value={formCampos.volumen || ''} onChange={e => setFormCampo('volumen', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Producto utilizado</label>
          <input type="text" placeholder="Cloro" value={formCampos.producto || ''} onChange={e => setFormCampo('producto', e.target.value)} className={i} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Cant. producto usado (ml)</label>
        <input type="number" step="1" placeholder="3240" value={formCampos.cant_producto || ''} onChange={e => setFormCampo('cant_producto', e.target.value)} className={i} />
        <p className="text-[10px] text-surface-400 mt-0.5">Dosis ref: 360ml/6.000 lts (1 tanque)</p>
      </div>
    </>}
    {cod === 'CM-RE-0402' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Punto de muestreo *</label>
          <input type="text" placeholder="M1: perforacion" value={formCampos.punto_muestreo || ''} onChange={e => setFormCampo('punto_muestreo', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Hora muestreo</label>
          <input type="time" value={formCampos.hora || ''} onChange={e => setFormCampo('hora', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">F. Extraccion</label>
          <input type="date" value={formCampos.fecha_extraccion || ''} onChange={e => setFormCampo('fecha_extraccion', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">F. Recepcion lab</label>
          <input type="date" value={formCampos.fecha_recepcion || ''} onChange={e => setFormCampo('fecha_recepcion', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">F. Inicio ensayo</label>
          <input type="date" value={formCampos.fecha_inicio_ensayo || ''} onChange={e => setFormCampo('fecha_inicio_ensayo', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Laboratorio</label>
          <input type="text" placeholder="INTI NEA" value={formCampos.laboratorio || ''} onChange={e => setFormCampo('laboratorio', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Nº Protocolo</label>
          <input type="text" placeholder="OT 218-756" value={formCampos.protocolo || ''} onChange={e => setFormCampo('protocolo', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">pH</label>
          <input type="number" step="0.01" value={formCampos.ph || ''} onChange={e => setFormCampo('ph', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">EC (mS)</label>
          <input type="number" step="0.01" value={formCampos.ec || ''} onChange={e => setFormCampo('ec', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Cloro (ppm)</label>
          <input type="number" step="0.01" value={formCampos.cloro || ''} onChange={e => setFormCampo('cloro', e.target.value)} className={i} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Tipo analisis</label>
        <select value={formCampos.tipo_analisis || ''} onChange={e => setFormCampo('tipo_analisis', e.target.value)} className={i}>
          <option value="">Seleccionar...</option>
          <option>Microbiologico y Fco-Qco</option>
          <option>Microbiologico</option>
          <option>Fisicoquimico</option>
          <option>Metales pesados</option>
          <option>Otro</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Resultados (texto libre)</label>
        <textarea rows={2} placeholder="Bacterias coliformes 48 UFC/mL ; Aerobios 195 UFC/mL" value={formCampos.resultados_texto || ''} onChange={e => setFormCampo('resultados_texto', e.target.value)} className={i + ' resize-none'} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Resultado</label>
          <select value={formCampos.resultado || 'conforme'} onChange={e => setFormCampo('resultado', e.target.value)} className={i}>
            <option value="conforme">Conforme</option>
            <option value="no_conforme">No conforme</option>
            <option value="pendiente">Pendiente</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Documento relacionado</label>
          <input type="text" placeholder="PROTOCOLO OT 218-756" value={formCampos.documento || ''} onChange={e => setFormCampo('documento', e.target.value)} className={i} />
        </div>
      </div>
    </>}
    {cod === 'CM-RE-0403' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Volumen (lts) *</label>
          <input type="number" step="1" placeholder="4000" value={formCampos.volumen || ''} onChange={e => setFormCampo('volumen', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Destino</label>
          <select value={formCampos.destino || ''} onChange={e => setFormCampo('destino', e.target.value)} className={i}>
            <option value="">Seleccionar...</option>
            <option>Sala Flora 1</option>
            <option>Sala Flora 2</option>
            <option>Plantas Madres</option>
            <option>Vegetativo</option>
            <option>Clonacion</option>
          </select>
        </div>
      </div>
    </>}
  </>

  // ===== G05 Plagas =====
  if (grupo === 'G05') return <>
    {cod === 'CM-RE-0501' && <>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Cebo Nº *</label>
          <input type="number" placeholder="1" value={formCampos.cebo_n || ''} onChange={e => setFormCampo('cebo_n', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Ubicacion</label>
          <select value={formCampos.ubicacion || 'Interior'} onChange={e => setFormCampo('ubicacion', e.target.value)} className={i}>
            <option>Interior</option><option>Exterior</option><option>Perimetral</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Accion</label>
          <select value={formCampos.control_tipo || 'C'} onChange={e => setFormCampo('control_tipo', e.target.value)} className={i}>
            <option value="C">Control</option><option value="R">Reposicion</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Producto / Principio activo</label>
          <input type="text" placeholder="Difethialone 0,0025 g / Adhesiva" value={formCampos.producto || ''} onChange={e => setFormCampo('producto', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Autorizado por</label>
          <input type="text" placeholder="Director Tecnico INASE" value={formCampos.autorizado || ''} onChange={e => setFormCampo('autorizado', e.target.value)} className={i} />
        </div>
      </div>
    </>}
    {cod === 'CM-RE-0502' && <>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Temporada</label>
          <input type="text" placeholder="2025" value={formCampos.temporada || new Date().getFullYear().toString()} onChange={e => setFormCampo('temporada', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Area *</label>
          <select value={formCampos.area || ''} onChange={e => setFormCampo('area', e.target.value)} className={i}>
            <option value="">Seleccionar...</option>
            <option>Plantas Madres</option><option>Clonacion</option>
            <option>Vegetativo</option><option>Floracion</option>
            <option>Secado</option><option>Almacenamiento</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Variedad</label>
          <input type="text" placeholder="PETE HOPE" value={formCampos.variedad || 'PETE HOPE'} onChange={e => setFormCampo('variedad', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Cultivo</label>
          <input type="text" placeholder="Plantas Madres" value={formCampos.cultivo || ''} onChange={e => setFormCampo('cultivo', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Plaga / Enfermedad detectada</label>
          <input type="text" placeholder="Ninguna / Trips / Oidio..." value={formCampos.plaga || ''} onChange={e => setFormCampo('plaga', e.target.value)} className={i} />
        </div>
      </div>
    </>}
    {cod === 'CM-RE-0503' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Producto comercial *</label>
          <input type="text" placeholder="Nombre del producto" value={formCampos.producto || ''} onChange={e => setFormCampo('producto', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Principio activo</label>
          <input type="text" placeholder="Ingrediente activo" value={formCampos.principio_activo || ''} onChange={e => setFormCampo('principio_activo', e.target.value)} className={i} />
        </div>
      </div>
      <p className="text-xs text-surface-500 italic">Se marca como aprobado por defecto al guardar.</p>
    </>}
    {cod === 'CM-RE-0504' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Variedad</label>
          <input type="text" placeholder="PETE HOPE" value={formCampos.variedad || 'PETE HOPE'} onChange={e => setFormCampo('variedad', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Ubicacion lote</label>
          <input type="text" placeholder="Sala Flora 2 / C7" value={formCampos.ubicacion || ''} onChange={e => setFormCampo('ubicacion', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Objetivo</label>
          <input type="text" placeholder="Trips / Oidio / Acaros" value={formCampos.objetivo || ''} onChange={e => setFormCampo('objetivo', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Producto comercial *</label>
          <input type="text" placeholder="Nombre comercial" value={formCampos.producto || ''} onChange={e => setFormCampo('producto', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Ingrediente activo</label>
          <input type="text" value={formCampos.principio_activo || ''} onChange={e => setFormCampo('principio_activo', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Dosis (ml/100L)</label>
          <input type="text" placeholder="50" value={formCampos.dosis || ''} onChange={e => setFormCampo('dosis', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Carencia (dias)</label>
          <input type="number" placeholder="7" value={formCampos.carencia || ''} onChange={e => setFormCampo('carencia', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Cond. ambientales</label>
          <input type="text" placeholder="Temp/HR" value={formCampos.cond_amb || ''} onChange={e => setFormCampo('cond_amb', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Equipo aplicacion</label>
          <input type="text" placeholder="Mochila / Atomizador" value={formCampos.equipo || ''} onChange={e => setFormCampo('equipo', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Operario</label>
          <input type="text" value={formCampos.operario || ''} onChange={e => setFormCampo('operario', e.target.value)} className={i} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Asesor que recomendo</label>
        <input type="text" value={formCampos.asesor || ''} onChange={e => setFormCampo('asesor', e.target.value)} className={i} />
      </div>
    </>}
    {cod === 'CM-RE-0505' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">ID Lote *</label>
          <input type="text" placeholder="C7, C9..." value={formCampos.id_lote || ''} onChange={e => setFormCampo('id_lote', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Producto aplicado</label>
          <input type="text" value={formCampos.producto || ''} onChange={e => setFormCampo('producto', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Fecha aplicacion</label>
          <input type="date" value={formCampos.fecha_aplicacion || ''} onChange={e => setFormCampo('fecha_aplicacion', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Fecha habilitacion *</label>
          <input type="date" value={formCampos.fecha_habilitacion || ''} onChange={e => setFormCampo('fecha_habilitacion', e.target.value)} className={i} />
        </div>
      </div>
    </>}
    {cod === 'CM-RE-0506' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">ID Lote *</label>
          <input type="text" placeholder="C7, C9..." value={formCampos.id_lote || ''} onChange={e => setFormCampo('id_lote', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Laboratorio</label>
          <input type="text" placeholder="INTI / Privado" value={formCampos.laboratorio || ''} onChange={e => setFormCampo('laboratorio', e.target.value)} className={i} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Principio activo analizado</label>
          <input type="text" value={formCampos.principio_activo || ''} onChange={e => setFormCampo('principio_activo', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Resultado LMR</label>
          <input type="text" placeholder="0.01 mg/kg" value={formCampos.resultado_lmr || ''} onChange={e => setFormCampo('resultado_lmr', e.target.value)} className={i} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Cumple LMR *</label>
        <select value={formCampos.cumple || 'SI'} onChange={e => setFormCampo('cumple', e.target.value)} className={i}>
          <option value="SI">SI - Cumple</option><option value="NO">NO - No cumple</option>
        </select>
      </div>
    </>}
    {cod === 'CM-RE-0507' && <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Producto / Envase *</label>
          <input type="text" placeholder="Producto descartado" value={formCampos.producto || ''} onChange={e => setFormCampo('producto', e.target.value)} className={i} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Cantidad</label>
          <input type="text" placeholder="5 envases / 2 lts" value={formCampos.cantidad || ''} onChange={e => setFormCampo('cantidad', e.target.value)} className={i} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Tipo gestion *</label>
        <select value={formCampos.gestion || ''} onChange={e => setFormCampo('gestion', e.target.value)} className={i}>
          <option value="">Seleccionar...</option>
          <option>Triple lavado</option>
          <option>Devolucion proveedor</option>
          <option>Centro de acopio</option>
          <option>Disposicion final autorizada</option>
          <option>Incineracion controlada</option>
        </select>
      </div>
    </>}
  </>

  // ===== G06 Cosecha =====
  if (grupo === 'G06') return <>
    {cod === 'CM-RE-0601' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Camada *</label><input type="text" placeholder="C7, C9..." value={formCampos.camada || ''} onChange={e => setFormCampo('camada', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Fila</label><input type="number" placeholder="1-8" value={formCampos.fila || ''} onChange={e => setFormCampo('fila', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Fecha transplante</label><input type="date" value={formCampos.fecha_transplante || ''} onChange={e => setFormCampo('fecha_transplante', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Fecha cosecha *</label><input type="date" value={formCampos.fecha_cosecha || ''} onChange={e => setFormCampo('fecha_cosecha', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Plantas cosechadas *</label><input type="number" placeholder="63" value={formCampos.plantas_cosechadas || ''} onChange={e => setFormCampo('plantas_cosechadas', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Estado producto</label><select value={formCampos.estado_producto || 'Frescas'} onChange={e => setFormCampo('estado_producto', e.target.value)} className={i}><option>Frescas</option><option>Secas</option><option>Trimeadas</option></select></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Sistema</label><select value={formCampos.sistema || 'COCO'} onChange={e => setFormCampo('sistema', e.target.value)} className={i}><option>COCO</option><option>RDWC</option></select></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Sala cultivo</label><input type="text" placeholder="SF 1, SF 2" value={formCampos.sala || ''} onChange={e => setFormCampo('sala', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Ubicacion</label><select value={formCampos.ubicacion_cultivo || 'Indoor'} onChange={e => setFormCampo('ubicacion_cultivo', e.target.value)} className={i}><option>Indoor</option><option>Outdoor</option><option>Greenhouse</option></select></div>
      </div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Genetica</label><input type="text" placeholder="PETE HOPE" value={formCampos.genetica || 'PETE HOPE'} onChange={e => setFormCampo('genetica', e.target.value)} className={i} /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cumple BPA</label><select value={formCampos.cumple_bpa || 'Si'} onChange={e => setFormCampo('cumple_bpa', e.target.value)} className={i}><option>Si</option><option>No</option></select></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cond. sanitaria</label><select value={formCampos.cond_sanitaria || 'Adecuadas'} onChange={e => setFormCampo('cond_sanitaria', e.target.value)} className={i}><option>Adecuadas</option><option>No adecuadas</option></select></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Instrumental</label><input type="text" placeholder="Tijeras" value={formCampos.instrumental || 'Tijeras'} onChange={e => setFormCampo('instrumental', e.target.value)} className={i} /></div>
      </div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Cod. trazabilidad</label><input type="text" placeholder="25.SF1.Li1.PM4.C9" value={formCampos.cod_traza_cosecha || ''} onChange={e => setFormCampo('cod_traza_cosecha', e.target.value)} className={i} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Resp. sala</label><input type="text" value={formCampos.responsable_sala || ''} onChange={e => setFormCampo('responsable_sala', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Resp. calidad</label><input type="text" value={formCampos.responsable_calidad || ''} onChange={e => setFormCampo('responsable_calidad', e.target.value)} className={i} /></div>
      </div>
    </>}
    {cod === 'CM-RE-0602' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Camada *</label><input type="text" placeholder="C9, C12..." value={formCampos.camada || ''} onChange={e => setFormCampo('camada', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Sala</label><input type="text" placeholder="SF 1, SF 2" value={formCampos.sala || ''} onChange={e => setFormCampo('sala', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cant. camas muestreadas</label><input type="number" placeholder="5" value={formCampos.cantidad || ''} onChange={e => setFormCampo('cantidad', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">% muestreo</label><input type="text" placeholder="15%" value={formCampos.rendimiento || ''} onChange={e => setFormCampo('rendimiento', e.target.value)} className={i} /></div>
      </div>
      <p className="text-[10px] text-surface-400">Referencia: croquis de distribucion plantas muestreadas (3 plantas por cama).</p>
    </>}
    {cod === 'CM-RE-0603' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Lote cultivo *</label><input type="text" placeholder="25.SF1.FL1-11.C12" value={formCampos.id_lote || ''} onChange={e => setFormCampo('id_lote', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Sistema</label><select value={formCampos.sistema || 'COCO'} onChange={e => setFormCampo('sistema', e.target.value)} className={i}><option>COCO</option><option>RDWC</option></select></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Sala</label><input type="text" placeholder="FLORACION 1" value={formCampos.sala || ''} onChange={e => setFormCampo('sala', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Camada</label><input type="text" value={formCampos.camada || ''} onChange={e => setFormCampo('camada', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cama Nº *</label><input type="number" placeholder="1" value={formCampos.cama || ''} onChange={e => setFormCampo('cama', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">ID Planta *</label><input type="text" placeholder="1, 2..." value={formCampos.id_planta || ''} onChange={e => setFormCampo('id_planta', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Kg humedo/planta *</label><input type="number" step="0.01" placeholder="0.45" value={formCampos.kg_humedo || ''} onChange={e => setFormCampo('kg_humedo', e.target.value)} className={i} /></div>
      </div>
    </>}
    {cod === 'CM-RE-0604' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Lote cultivo *</label><input type="text" placeholder="25.SF1.FL1-11.C12" value={formCampos.id_lote || ''} onChange={e => setFormCampo('id_lote', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cama Nº *</label><input type="number" placeholder="1" value={formCampos.cama || ''} onChange={e => setFormCampo('cama', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Promedio Kg/planta</label><input type="number" step="0.01" placeholder="0.45" value={formCampos.kg_humedo || ''} onChange={e => setFormCampo('kg_humedo', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cant. plantas</label><input type="number" placeholder="63" value={formCampos.plantas_cosechadas || ''} onChange={e => setFormCampo('plantas_cosechadas', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Total Kg humedo</label><input type="number" step="0.01" placeholder="28.35" value={formCampos.peso_fresco || ''} onChange={e => setFormCampo('peso_fresco', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Sistema</label><select value={formCampos.sistema || 'COCO'} onChange={e => setFormCampo('sistema', e.target.value)} className={i}><option>COCO</option><option>RDWC</option></select></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Camada</label><input type="text" value={formCampos.camada || ''} onChange={e => setFormCampo('camada', e.target.value)} className={i} /></div>
      </div>
    </>}
    {cod === 'CM-RE-0605' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Camada *</label><input type="text" placeholder="C9" value={formCampos.camada || ''} onChange={e => setFormCampo('camada', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Nombre lote (linea/fila)</label><input type="text" placeholder="8" value={formCampos.fila || ''} onChange={e => setFormCampo('fila', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Fecha cosecha</label><input type="date" value={formCampos.fecha_cosecha || ''} onChange={e => setFormCampo('fecha_cosecha', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Fecha traslado</label><input type="date" value={formCampos.fecha_traslado || ''} onChange={e => setFormCampo('fecha_traslado', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Fecha recepcion *</label><input type="date" value={formCampos.fecha_recepcion || ''} onChange={e => setFormCampo('fecha_recepcion', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cantidad recibida</label><input type="number" placeholder="2" value={formCampos.cantidad_recibida || ''} onChange={e => setFormCampo('cantidad_recibida', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cuadro secado *</label><input type="number" placeholder="22" value={formCampos.cuadro_secado || ''} onChange={e => setFormCampo('cuadro_secado', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cond. recepcion</label><select value={formCampos.cond_recepcion || 'Integro'} onChange={e => setFormCampo('cond_recepcion', e.target.value)} className={i}><option>Integro</option><option>Dañado</option><option>Parcial</option></select></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cod. traza cosecha</label><input type="text" placeholder="25.SF1.Li8.PM4.C9" value={formCampos.cod_traza_cosecha || ''} onChange={e => setFormCampo('cod_traza_cosecha', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cod. traza secado</label><input type="text" placeholder="25.CDS22-SFL1-FL8-C9" value={formCampos.cod_traza_secado || ''} onChange={e => setFormCampo('cod_traza_secado', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Resp. entrega</label><input type="text" value={formCampos.responsable_entrega || ''} onChange={e => setFormCampo('responsable_entrega', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Resp. recepcion</label><input type="text" value={formCampos.responsable_recepcion || ''} onChange={e => setFormCampo('responsable_recepcion', e.target.value)} className={i} /></div>
      </div>
    </>}
    {cod === 'CM-RE-0606' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Camada *</label><input type="text" placeholder="C7, C9..." value={formCampos.camada || ''} onChange={e => setFormCampo('camada', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Sistema</label><select value={formCampos.sistema || 'COCO'} onChange={e => setFormCampo('sistema', e.target.value)} className={i}><option>COCO</option><option>RDWC</option></select></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Fecha recepcion trimeo *</label><input type="date" value={formCampos.fecha_recepcion || ''} onChange={e => setFormCampo('fecha_recepcion', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Peso seco recibido (kg)</label><input type="number" step="0.01" value={formCampos.peso_seco || ''} onChange={e => setFormCampo('peso_seco', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cod. traza secado</label><input type="text" placeholder="25.CDS22-SFL2-FL8-C7" value={formCampos.cod_traza_secado || ''} onChange={e => setFormCampo('cod_traza_secado', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cod. traza trimeo</label><input type="text" placeholder="25.Tr22.Ka.PM4.C7" value={formCampos.cod_traza_trimeo || ''} onChange={e => setFormCampo('cod_traza_trimeo', e.target.value)} className={i} /></div>
      </div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Resp. recepcion trimeo</label><input type="text" value={formCampos.responsable_recepcion || ''} onChange={e => setFormCampo('responsable_recepcion', e.target.value)} className={i} /></div>
    </>}
    {cod === 'CM-RE-0607' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Camada *</label><input type="text" value={formCampos.camada || ''} onChange={e => setFormCampo('camada', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cod. traza trimeo</label><input type="text" placeholder="25.Tr22.Ka.PM4.C7" value={formCampos.cod_traza_trimeo || ''} onChange={e => setFormCampo('cod_traza_trimeo', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Fecha inicio cuarentena *</label><input type="date" value={formCampos.fecha_inicio_cuarentena || ''} onChange={e => setFormCampo('fecha_inicio_cuarentena', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Fecha fin cuarentena</label><input type="date" value={formCampos.fecha_fin_cuarentena || ''} onChange={e => setFormCampo('fecha_fin_cuarentena', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Peso ingresado (kg)</label><input type="number" step="0.01" value={formCampos.peso_seco || ''} onChange={e => setFormCampo('peso_seco', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cod. traza cuarentena</label><input type="text" value={formCampos.cod_traza_cuarentena || ''} onChange={e => setFormCampo('cod_traza_cuarentena', e.target.value)} className={i} /></div>
      </div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Notas sanitarias / muestra lab</label><input type="text" placeholder="Muestra lab CM-RE-0902 18/11" value={formCampos.obs_sanitarias || ''} onChange={e => setFormCampo('obs_sanitarias', e.target.value)} className={i} /></div>
    </>}
    {cod === 'CM-RE-0608' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Camada *</label><input type="text" placeholder="C7, C9..." value={formCampos.camada || ''} onChange={e => setFormCampo('camada', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cantidad bolsas</label><input type="number" placeholder="69" value={formCampos.cantidad_bolsas || ''} onChange={e => setFormCampo('cantidad_bolsas', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Peso total (kg)</label><input type="number" step="0.01" placeholder="30.18" value={formCampos.peso_seco || ''} onChange={e => setFormCampo('peso_seco', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Peso/bolsa (g)</label><input type="number" step="0.01" placeholder="437" value={formCampos.peso_neto_g || ''} onChange={e => setFormCampo('peso_neto_g', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cod. traza cuarentena</label><input type="text" value={formCampos.cod_traza_cuarentena || ''} onChange={e => setFormCampo('cod_traza_cuarentena', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cod. comercial inicial</label><input type="text" placeholder="25.FIS.BI1.C7.8" value={formCampos.cod_comercial || ''} onChange={e => setFormCampo('cod_comercial', e.target.value)} className={i} /></div>
      </div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Cod. traza almacenamiento</label><input type="text" placeholder="25. AL8 Ka BI1 PM4.C7" value={formCampos.cod_traza_almacenamiento || ''} onChange={e => setFormCampo('cod_traza_almacenamiento', e.target.value)} className={i} /></div>
    </>}
    {cod === 'CM-RE-0609' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Camada *</label><input type="text" value={formCampos.camada || ''} onChange={e => setFormCampo('camada', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cod. comercial *</label><input type="text" placeholder="25.FIS.BI1.C7.8" value={formCampos.cod_comercial || ''} onChange={e => setFormCampo('cod_comercial', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Fecha salida *</label><input type="date" value={formCampos.fecha_salida || ''} onChange={e => setFormCampo('fecha_salida', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cant. bolsas salida</label><input type="number" value={formCampos.cantidad_bolsas || ''} onChange={e => setFormCampo('cantidad_bolsas', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Peso total (kg)</label><input type="number" step="0.01" value={formCampos.peso_seco || ''} onChange={e => setFormCampo('peso_seco', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Destino</label><input type="text" placeholder="Farmacia / Cliente" value={formCampos.destino || ''} onChange={e => setFormCampo('destino', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Resp. salida</label><input type="text" value={formCampos.responsable_entrega || ''} onChange={e => setFormCampo('responsable_entrega', e.target.value)} className={i} /></div>
      </div>
    </>}
    {cod === 'CM-RE-0610' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cod. comercial *</label><input type="text" placeholder="25.FIS.BI1.C7.8" value={formCampos.cod_comercial || ''} onChange={e => setFormCampo('cod_comercial', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Camada</label><input type="text" value={formCampos.camada || ''} onChange={e => setFormCampo('camada', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Fecha salida</label><input type="date" value={formCampos.fecha_salida || ''} onChange={e => setFormCampo('fecha_salida', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cant. bolsas</label><input type="number" value={formCampos.cantidad_bolsas || ''} onChange={e => setFormCampo('cantidad_bolsas', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Peso (kg)</label><input type="number" step="0.01" value={formCampos.peso_seco || ''} onChange={e => setFormCampo('peso_seco', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Transporte</label><input type="text" placeholder="Empresa transportista" value={formCampos.transporte || ''} onChange={e => setFormCampo('transporte', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Patente</label><input type="text" placeholder="AAA000" value={formCampos.patente || ''} onChange={e => setFormCampo('patente', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Chofer</label><input type="text" value={formCampos.chofer || ''} onChange={e => setFormCampo('chofer', e.target.value)} className={i} /></div>
      </div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Destino</label><input type="text" placeholder="Direccion / Cliente" value={formCampos.destino || ''} onChange={e => setFormCampo('destino', e.target.value)} className={i} /></div>
    </>}
    {cod === 'CM-RE-0611' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Nº Lote propagacion *</label><input type="text" placeholder="CL15, CL16..." value={formCampos.num_lote_propagacion || ''} onChange={e => setFormCampo('num_lote_propagacion', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Camada destino</label><input type="text" placeholder="C15, C16..." value={formCampos.camada || ''} onChange={e => setFormCampo('camada', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cant. esquejes</label><input type="number" placeholder="324" value={formCampos.cantidad_esquejes || ''} onChange={e => setFormCampo('cantidad_esquejes', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Genetica</label><input type="text" value={formCampos.genetica || 'PETE HOPE'} onChange={e => setFormCampo('genetica', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cod. traza propagacion</label><input type="text" placeholder="25.PM10..." value={formCampos.cod_traza_propagacion || ''} onChange={e => setFormCampo('cod_traza_propagacion', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cumple BPA</label><select value={formCampos.cumple_bpa || 'Si'} onChange={e => setFormCampo('cumple_bpa', e.target.value)} className={i}><option>Si</option><option>No</option></select></div>
      </div>
    </>}
  </>

  // ===== G07 Mantenimiento (genérico) =====
  if (grupo === 'G07') return <>
    <div>
      <label className="block text-sm font-medium text-surface-700 mb-1">Equipo</label>
      <input type="text" placeholder="Nombre del equipo" value={formCampos.equipo || ''} onChange={e => setFormCampo('equipo', e.target.value)} className={i} />
    </div>
    <div>
      <label className="block text-sm font-medium text-surface-700 mb-1">Tipo mantenimiento</label>
      <select value={formCampos.tipo_mant || 'preventivo'} onChange={e => setFormCampo('tipo_mant', e.target.value)} className={i}>
        <option value="preventivo">Preventivo</option>
        <option value="correctivo">Correctivo</option>
        <option value="calibracion">Calibracion</option>
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium text-surface-700 mb-1">Resultado</label>
      <select value={formCampos.resultado || 'conforme'} onChange={e => setFormCampo('resultado', e.target.value)} className={i}>
        <option value="conforme">Conforme</option>
        <option value="no_conforme">No conforme</option>
        <option value="fuera_tolerancia">Fuera de tolerancia</option>
      </select>
    </div>
  </>

  // ===== G09 Calidad =====
  if (grupo === 'G09') return <>
    {cod === 'CM-RE-0901' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Nº Certificado *</label><input type="text" placeholder="COA-2025-001" value={formCampos.numero_certificado || ''} onChange={e => setFormCampo('numero_certificado', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Lote *</label><input type="text" placeholder="C7, 25.FIS.BI1.C7.8..." value={formCampos.id_lote || ''} onChange={e => setFormCampo('id_lote', e.target.value)} className={i} /></div>
      </div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Resultado / Estado *</label>
        <select value={formCampos.resultado || 'aprobado'} onChange={e => setFormCampo('resultado', e.target.value)} className={i}>
          <option value="aprobado">Aprobado</option><option value="rechazado">Rechazado</option><option value="pendiente">Pendiente</option>
        </select>
      </div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Hallazgos / Resultados clave</label>
        <textarea rows={2} placeholder="THC 8.2% ; CBD 0.3% ; coliformes <10 UFC/g..." value={formCampos.descripcion_hallazgo || ''} onChange={e => setFormCampo('descripcion_hallazgo', e.target.value)} className={i + ' resize-none'} />
      </div>
    </>}
    {cod === 'CM-RE-0902' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Lote (codigo) *</label><input type="text" placeholder="SF2-C7" value={formCampos.id_lote || ''} onChange={e => setFormCampo('id_lote', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cantidad muestras</label><input type="number" placeholder="1" value={formCampos.cantidad_muestra || ''} onChange={e => setFormCampo('cantidad_muestra', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Peso muestra (g)</label><input type="text" placeholder="20" value={formCampos.peso_muestra || ''} onChange={e => setFormCampo('peso_muestra', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Destino muestra</label><input type="text" placeholder="ANALISIS CALIDAD" value={formCampos.destino_muestra || 'ANALISIS CALIDAD'} onChange={e => setFormCampo('destino_muestra', e.target.value)} className={i} /></div>
      </div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Laboratorio destino</label><input type="text" placeholder="LAB - FACENA" value={formCampos.laboratorio || 'LAB - FACENA'} onChange={e => setFormCampo('laboratorio', e.target.value)} className={i} /></div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Estudio solicitado</label>
        <textarea rows={2} placeholder="Cannabinoides, Aflatoxinas, Met. pesados, Pesticidas, Microbiologico..." value={formCampos.estudio_solicitado || ''} onChange={e => setFormCampo('estudio_solicitado', e.target.value)} className={i + ' resize-none'} />
      </div>
    </>}
    {cod === 'CM-RE-0903' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Nº Contramuestra *</label><input type="text" placeholder="1" value={formCampos.numero_contramuestra || ''} onChange={e => setFormCampo('numero_contramuestra', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Lote *</label><input type="text" placeholder="SF2-C7" value={formCampos.id_lote || ''} onChange={e => setFormCampo('id_lote', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Destino almacenaje</label><input type="text" placeholder="Armario contramuestra" value={formCampos.destino_muestra || ''} onChange={e => setFormCampo('destino_muestra', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cond. conservacion</label><input type="text" placeholder="T 15-22°C ; HR 50-65%" value={formCampos.detalle || ''} onChange={e => setFormCampo('detalle', e.target.value)} className={i} /></div>
      </div>
    </>}
    {cod === 'CM-RE-0904' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Tipo sustrato *</label>
          <select value={formCampos.tipo_muestra || ''} onChange={e => setFormCampo('tipo_muestra', e.target.value)} className={i}>
            <option value="">Seleccionar...</option><option>Fibra de Coco</option><option>Solucion RDWC</option><option>Agua de riego</option><option>Otro</option>
          </select>
        </div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cantidad muestra</label><input type="text" placeholder="500 g / 1 L" value={formCampos.cantidad_muestra || ''} onChange={e => setFormCampo('cantidad_muestra', e.target.value)} className={i} /></div>
      </div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Destino almacenaje</label><input type="text" placeholder="Heladera contramuestra" value={formCampos.destino_muestra || ''} onChange={e => setFormCampo('destino_muestra', e.target.value)} className={i} /></div>
    </>}
    {cod === 'CM-RE-0905' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Protocolo Nº *</label><input type="text" placeholder="2025-021" value={formCampos.protocolo || ''} onChange={e => setFormCampo('protocolo', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Lote *</label><input type="text" placeholder="SF2-C7" value={formCampos.id_lote || ''} onChange={e => setFormCampo('id_lote', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Tipo muestra</label><input type="text" placeholder="Inflorescencia" value={formCampos.tipo_muestra || 'Inflorescencia'} onChange={e => setFormCampo('tipo_muestra', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Laboratorio</label><input type="text" placeholder="FACENA" value={formCampos.laboratorio || ''} onChange={e => setFormCampo('laboratorio', e.target.value)} className={i} /></div>
      </div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Estudio / Resultado</label>
        <textarea rows={2} placeholder="Cannabinoides CBN/CBD/THC ; Aflatoxinas ; Metales pesados ; Pesticidas..." value={formCampos.estudio_solicitado || ''} onChange={e => setFormCampo('estudio_solicitado', e.target.value)} className={i + ' resize-none'} />
      </div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Resultado *</label>
        <select value={formCampos.resultado || 'aprobado'} onChange={e => setFormCampo('resultado', e.target.value)} className={i}>
          <option value="aprobado">Aprobado</option><option value="rechazado">Rechazado</option><option value="pendiente">Pendiente</option>
        </select>
      </div>
    </>}
    {cod === 'CM-RE-0906' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cliente *</label><input type="text" placeholder="Nombre / Razon social" value={formCampos.cliente || ''} onChange={e => setFormCampo('cliente', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Lote afectado</label><input type="text" placeholder="25.FIS.BI1.C7.8" value={formCampos.id_lote || ''} onChange={e => setFormCampo('id_lote', e.target.value)} className={i} /></div>
      </div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Detalle del reclamo *</label><textarea rows={3} value={formCampos.detalle_reclamo || ''} onChange={e => setFormCampo('detalle_reclamo', e.target.value)} className={i + ' resize-none'} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Estado</label>
          <select value={formCampos.resultado || 'pendiente'} onChange={e => setFormCampo('resultado', e.target.value)} className={i}>
            <option value="pendiente">Pendiente</option><option value="cerrado">Cerrado</option><option value="rechazado">Rechazado</option>
          </select>
        </div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Fecha cierre</label><input type="date" value={formCampos.fecha_cierre || ''} onChange={e => setFormCampo('fecha_cierre', e.target.value)} className={i} /></div>
      </div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Accion correctiva</label><textarea rows={2} value={formCampos.accion_correctiva || ''} onChange={e => setFormCampo('accion_correctiva', e.target.value)} className={i + ' resize-none'} /></div>
    </>}
    {cod === 'CM-RE-0907' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Sector / Origen</label><input type="text" placeholder="Produccion, Calidad..." value={formCampos.cliente || ''} onChange={e => setFormCampo('cliente', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Lote o area</label><input type="text" value={formCampos.id_lote || ''} onChange={e => setFormCampo('id_lote', e.target.value)} className={i} /></div>
      </div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Detalle queja *</label><textarea rows={3} value={formCampos.detalle_reclamo || ''} onChange={e => setFormCampo('detalle_reclamo', e.target.value)} className={i + ' resize-none'} /></div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Estado</label>
        <select value={formCampos.resultado || 'pendiente'} onChange={e => setFormCampo('resultado', e.target.value)} className={i}>
          <option value="pendiente">Pendiente</option><option value="cerrado">Cerrado</option>
        </select>
      </div>
    </>}
    {cod === 'CM-RE-0908' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cliente *</label><input type="text" value={formCampos.cliente || ''} onChange={e => setFormCampo('cliente', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Lote devuelto *</label><input type="text" placeholder="25.FIS.BI1.C7.8" value={formCampos.id_lote || ''} onChange={e => setFormCampo('id_lote', e.target.value)} className={i} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cantidad devuelta</label><input type="text" placeholder="3 bolsas / 1.2 kg" value={formCampos.cantidad_muestra || ''} onChange={e => setFormCampo('cantidad_muestra', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Estado producto</label>
          <select value={formCampos.resultado || 'pendiente'} onChange={e => setFormCampo('resultado', e.target.value)} className={i}>
            <option value="aprobado">Reingresable</option><option value="rechazado">A destruir</option><option value="pendiente">Pendiente</option>
          </select>
        </div>
      </div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Motivo devolucion *</label><textarea rows={2} value={formCampos.detalle_reclamo || ''} onChange={e => setFormCampo('detalle_reclamo', e.target.value)} className={i + ' resize-none'} /></div>
    </>}
    {cod === 'CM-RE-0909' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Lote / Area afectada</label><input type="text" placeholder="C7, SF2..." value={formCampos.id_lote || ''} onChange={e => setFormCampo('id_lote', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Estado *</label>
          <select value={formCampos.resultado || 'pendiente'} onChange={e => setFormCampo('resultado', e.target.value)} className={i}>
            <option value="pendiente">Pendiente</option><option value="cerrado">Cerrado</option><option value="rechazado">Producto a destruir</option>
          </select>
        </div>
      </div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Descripcion hallazgo *</label><textarea rows={3} placeholder="Detalle del producto no conforme detectado" value={formCampos.descripcion_hallazgo || ''} onChange={e => setFormCampo('descripcion_hallazgo', e.target.value)} className={i + ' resize-none'} /></div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Accion correctiva</label><textarea rows={2} value={formCampos.accion_correctiva || ''} onChange={e => setFormCampo('accion_correctiva', e.target.value)} className={i + ' resize-none'} /></div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Accion preventiva</label><textarea rows={2} value={formCampos.accion_preventiva || ''} onChange={e => setFormCampo('accion_preventiva', e.target.value)} className={i + ' resize-none'} /></div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Fecha cierre</label><input type="date" value={formCampos.fecha_cierre || ''} onChange={e => setFormCampo('fecha_cierre', e.target.value)} className={i} /></div>
    </>}
    {cod === 'CM-RE-0910' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Lote / Identificacion *</label><input type="text" placeholder="C11, 25.PM4..." value={formCampos.id_lote || ''} onChange={e => setFormCampo('id_lote', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Sala</label>
          <select value={formCampos.tipo_residuo || ''} onChange={e => setFormCampo('tipo_residuo', e.target.value)} className={i}>
            <option value="">Seleccionar...</option><option>Plantas Madres</option><option>Clonacion</option><option>Vegetativo</option><option>Floracion 1</option><option>Floracion 2</option><option>Secado</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Cantidad / Tipo</label><input type="text" placeholder="132 clones / 5 plantas" value={formCampos.cantidad_residuo || ''} onChange={e => setFormCampo('cantidad_residuo', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Destino *</label>
          <select value={formCampos.metodo_disposicion || 'Compostera'} onChange={e => setFormCampo('metodo_disposicion', e.target.value)} className={i}>
            <option>Compostera</option><option>Incineracion</option><option>Disposicion final autorizada</option>
          </select>
        </div>
      </div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Encargado disposicion</label><input type="text" placeholder="Francisco Bertone" value={formCampos.cliente || ''} onChange={e => setFormCampo('cliente', e.target.value)} className={i} /></div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Acta destruccion (Nº)</label><input type="text" placeholder="ACTA-2025-001" value={formCampos.acta_destruccion || ''} onChange={e => setFormCampo('acta_destruccion', e.target.value)} className={i} /></div>
    </>}
    {cod === 'CM-RE-0911' && <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Encargado disposicion *</label><input type="text" placeholder="Juan Leiva" value={formCampos.cliente || ''} onChange={e => setFormCampo('cliente', e.target.value)} className={i} /></div>
        <div><label className="block text-sm font-medium text-surface-700 mb-1">Destino</label><input type="text" placeholder="Sector Residuos" value={formCampos.metodo_disposicion || 'Sector Residuos'} onChange={e => setFormCampo('metodo_disposicion', e.target.value)} className={i} /></div>
      </div>
      <div><label className="block text-sm font-medium text-surface-700 mb-1">Cant. bolsas (60x90)</label><input type="number" placeholder="3" value={formCampos.unidad_medida || ''} onChange={e => setFormCampo('unidad_medida', e.target.value)} className={i} /></div>
    </>}
  </>

  return null
}

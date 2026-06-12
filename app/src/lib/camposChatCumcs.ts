// Definicion declarativa de los campos de cada formulario CUMCS
// para el flow conversacional del chat. Cada codigo mapea a una lista
// ordenada de campos que el chat pregunta uno por uno.

export type TipoCampo = 'text' | 'number' | 'date' | 'time' | 'select' | 'textarea'

export interface CampoChat {
  key: string
  label: string
  pregunta: string  // Texto que el bot usa
  tipo: TipoCampo
  placeholder?: string
  opciones?: string[]   // Para tipo=select
  requerido?: boolean
  defaultValue?: string
}

// Campos por codigo CUMCS (ordenados en secuencia logica del formulario)
export const CAMPOS_CUMCS: Record<string, CampoChat[]> = {
  // G01 Condiciones Ambientales (8 formularios)
  // CM-RE-0101 — Condiciones Ambientales Planta Madre Hidro (RDWC)
  // Labels alineados al xlsx CM-RE-1010 v2 (incluye typos del original: T° H20, VPD (kpa))
  'CM-RE-0101': [
    { key: 'id_lote', label: 'ID LOTE', pregunta: 'ID LOTE?', tipo: 'text', placeholder: '25.PM6', requerido: true },
    { key: 'variedad', label: 'Variedad', pregunta: 'Variedad?', tipo: 'text', defaultValue: 'Pete Hope' },
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'sistema', label: 'Sistema', pregunta: 'Sistema?', tipo: 'select', opciones: ['RDWC'], defaultValue: 'RDWC', requerido: true },
    { key: 'humedad', label: 'Humedad (%)', pregunta: 'Humedad (%)?', tipo: 'number', placeholder: '70', requerido: true },
    { key: 'temperatura', label: 'Temperatura °C', pregunta: 'Temperatura °C?', tipo: 'number', placeholder: '24', requerido: true },
    { key: 'temp_aa', label: 'T° A.A', pregunta: 'T° A.A?', tipo: 'number', placeholder: '17' },
    { key: 'temp_h2o', label: 'T° H20', pregunta: 'T° H20?', tipo: 'number', placeholder: '20' },
    { key: 'ec', label: 'EC', pregunta: 'EC?', tipo: 'number', placeholder: '680' },
    { key: 'ph_inicial', label: 'pH Inicial', pregunta: 'pH Inicial?', tipo: 'number', placeholder: '5.9' },
    { key: 'ph_ml', label: 'ML (pH+/-)', pregunta: 'ML (pH+/-)?', tipo: 'text', placeholder: '-' },
    { key: 'ph_corregido', label: 'pH Corregido', pregunta: 'pH Corregido?', tipo: 'number', placeholder: '5.9' },
    { key: 'vpd_kpa', label: 'VPD (kpa)', pregunta: 'VPD (kpa)?', tipo: 'number', placeholder: '0.9' },
    { key: 'co2_ppm', label: 'CO2 (ppm)', pregunta: 'CO2 (ppm)?', tipo: 'number', placeholder: '650' },
    { key: 'ventilacion', label: 'Ventilación', pregunta: 'Ventilación?', tipo: 'text', placeholder: 'V3' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // CM-RE-0102 — Condiciones Ambientales Planta Madre Coco
  // Labels alineados al xlsx CM-RE-1010 v2 (incluye typos del original: T° H20, VPD (kpa), Identificacion sin tilde)
  'CM-RE-0102': [
    { key: 'id_planta_madre', label: 'Identificacion de planta madre', pregunta: 'Identificacion de planta madre?', tipo: 'text', placeholder: '25.PM4', requerido: true },
    { key: 'variedad', label: 'Variedad', pregunta: 'Variedad?', tipo: 'text', defaultValue: 'Pete Hope' },
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'sistema', label: 'Sistema', pregunta: 'Sistema?', tipo: 'select', opciones: ['COCO'], defaultValue: 'COCO', requerido: true },
    { key: 'humedad', label: 'Humedad (%)', pregunta: 'Humedad (%)?', tipo: 'number', placeholder: '70', requerido: true },
    { key: 'temperatura', label: 'Temperatura °C', pregunta: 'Temperatura °C?', tipo: 'number', placeholder: '24', requerido: true },
    { key: 'temp_aa', label: 'T° A.A', pregunta: 'T° A.A?', tipo: 'number', placeholder: '17' },
    { key: 'temp_h2o', label: 'T° H20', pregunta: 'T° H20?', tipo: 'number' },
    { key: 'ec', label: 'EC', pregunta: 'EC?', tipo: 'number', placeholder: '2.5' },
    { key: 'ph_inicial', label: 'pH Inicial', pregunta: 'pH Inicial?', tipo: 'number', placeholder: '6' },
    { key: 'ph_ml', label: 'ML (pH+/-)', pregunta: 'ML (pH+/-)?', tipo: 'text' },
    { key: 'ph_corregido', label: 'pH Corregido', pregunta: 'pH Corregido?', tipo: 'number' },
    { key: 'vpd_kpa', label: 'VPD (kpa)', pregunta: 'VPD (kpa)?', tipo: 'number', placeholder: '0.9' },
    { key: 'co2_ppm', label: 'CO2 (ppm)', pregunta: 'CO2 (ppm)?', tipo: 'number', placeholder: '650' },
    { key: 'ventilacion', label: 'Ventilación', pregunta: 'Ventilación?', tipo: 'text', placeholder: 'ok' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // CM-RE-0103 — Condiciones Ambientales Clonacion
  'CM-RE-0103': [
    { key: 'identificacion', label: 'ID Clonacion', pregunta: 'ID de clonacion? (ej CL11)', tipo: 'text', placeholder: 'CL11', requerido: true },
    { key: 'sustrato', label: 'Sustrato', pregunta: 'Sustrato?', tipo: 'select', opciones: ['Hidroponia', 'Coco'], defaultValue: 'Hidroponia' },
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'aeroclonador', label: 'Aeroclonador N°', pregunta: 'Numero de aeroclonador?', tipo: 'number', placeholder: '1' },
    { key: 'humedad', label: 'Humedad (%)', pregunta: 'Humedad %?', tipo: 'number', placeholder: '82', requerido: true },
    { key: 'temperatura', label: 'Temperatura (°C)', pregunta: 'Temperatura °C?', tipo: 'number', placeholder: '18.5', requerido: true },
    { key: 'temp_aa', label: 'T° A.A (°C)', pregunta: 'Temperatura A.A °C?', tipo: 'number' },
    { key: 'temp_h2o', label: 'T° H20 (°C)', pregunta: 'Temperatura agua °C?', tipo: 'number' },
    { key: 'ec', label: 'EC', pregunta: 'EC?', tipo: 'number', placeholder: '500' },
    { key: 'ph_inicial', label: 'pH inicial', pregunta: 'pH inicial?', tipo: 'number', placeholder: '5.99' },
    { key: 'ph_ml', label: 'pH ML (+/-)', pregunta: 'Correccion pH ml?', tipo: 'text' },
    { key: 'ph_corregido', label: 'pH corregido', pregunta: 'pH corregido?', tipo: 'number' },
    { key: 'vpd_kpa', label: 'VPD (kPa)', pregunta: 'VPD kPa?', tipo: 'number', placeholder: '0.4' },
    { key: 'ventilacion', label: 'Ventilacion', pregunta: 'Ventilacion?', tipo: 'text' },
    { key: 'extraccion', label: 'Extraccion', pregunta: 'Extraccion?', tipo: 'text' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // CM-RE-0104 — Condiciones Ambientales Etapa Vegetativa
  'CM-RE-0104': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'sistema', label: 'Sistema', pregunta: 'Sistema? (Sist1, Sist2...)', tipo: 'text', placeholder: 'Sist 1', requerido: true },
    { key: 'humedad', label: 'Humedad (%)', pregunta: 'Humedad %?', tipo: 'number', placeholder: '70', requerido: true },
    { key: 'temperatura', label: 'Temperatura (°C)', pregunta: 'Temperatura °C?', tipo: 'number', placeholder: '22', requerido: true },
    { key: 'temp_aa', label: 'T° A.A (°C)', pregunta: 'T° aire acondicionado?', tipo: 'number', placeholder: '23' },
    { key: 'temp_h2o', label: 'T° H20 (°C)', pregunta: 'T° agua?', tipo: 'number', placeholder: '18' },
    { key: 'ec', label: 'EC', pregunta: 'EC?', tipo: 'number', placeholder: '0.6' },
    { key: 'ph_inicial', label: 'pH inicial', pregunta: 'pH inicial?', tipo: 'number', placeholder: '6.5' },
    { key: 'ph_ml', label: 'pH ML (+/-)', pregunta: 'Correccion ml?', tipo: 'text' },
    { key: 'ph_corregido', label: 'pH corregido', pregunta: 'pH corregido?', tipo: 'number', placeholder: '5.9' },
    { key: 'orp', label: 'ORP', pregunta: 'ORP?', tipo: 'number', placeholder: '350' },
    { key: 'ventilacion', label: 'Ventilacion', pregunta: 'Ventilacion?', tipo: 'text', placeholder: 'off' },
    { key: 'extraccion', label: 'Extraccion', pregunta: 'Extraccion?', tipo: 'text' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // CM-RE-0105 — Condiciones Ambientales Etapa Floración
  'CM-RE-0105': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'sistema', label: 'Sistema / Sensor N°', pregunta: 'Sistema o sensor N°?', tipo: 'text', placeholder: 'Sist. 1', requerido: true },
    { key: 'estado_cultivo', label: 'Estado cultivo', pregunta: 'Estado de cultivo?', tipo: 'select', opciones: ['Floracion', 'Vegetativa', 'Transicion'], defaultValue: 'Floracion' },
    { key: 'humedad', label: 'Humedad (%)', pregunta: 'Humedad %?', tipo: 'number', placeholder: '65', requerido: true },
    { key: 'temperatura', label: 'Temperatura (°C)', pregunta: 'Temperatura °C?', tipo: 'number', placeholder: '24', requerido: true },
    { key: 'temp_aa', label: 'T° A.A (°C)', pregunta: 'T° A.A °C?', tipo: 'number', placeholder: '23' },
    { key: 'temp_h2o', label: 'T° H20 (°C)', pregunta: 'T° H20 °C?', tipo: 'number', placeholder: '20' },
    { key: 'ec', label: 'EC', pregunta: 'EC?', tipo: 'number', placeholder: '3' },
    { key: 'ph', label: 'pH', pregunta: 'pH?', tipo: 'number', placeholder: '6.2' },
    { key: 'vpd_kpa', label: 'VPD (kPa)', pregunta: 'VPD kPa?', tipo: 'number', placeholder: '0.85' },
    { key: 'co2_ppm', label: 'CO2 (ppm)', pregunta: 'CO2 ppm?', tipo: 'number', placeholder: '500' },
    { key: 'ventilacion', label: 'Ventilacion', pregunta: 'Ventilacion?', tipo: 'text', placeholder: 'ok' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // CM-RE-0106 — Condiciones Ambientales Area de Secado
  'CM-RE-0106': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'sistema', label: 'Sistema', pregunta: 'Sistema?', tipo: 'select', opciones: ['RDWC', 'Coco'], defaultValue: 'RDWC' },
    { key: 'id_lote', label: 'ID Lote', pregunta: 'ID del lote?', tipo: 'text', placeholder: '25.SF2FL1-8-C7', requerido: true },
    { key: 'humedad', label: 'Humedad (%)', pregunta: 'Humedad %?', tipo: 'number', placeholder: '50', requerido: true },
    { key: 'temperatura', label: 'Temperatura (°C)', pregunta: 'Temperatura °C?', tipo: 'number', placeholder: '18', requerido: true },
    { key: 'temp_aa', label: 'T° A.A (°C)', pregunta: 'T° A.A °C?', tipo: 'number', placeholder: '18' },
    { key: 'presencia_insectos', label: 'Presencia insectos', pregunta: 'Presencia de insectos?', tipo: 'select', opciones: ['No', 'Si'], defaultValue: 'No' },
    { key: 'presencia_hongos', label: 'Presencia hongos', pregunta: 'Presencia de hongos?', tipo: 'select', opciones: ['No', 'Si'], defaultValue: 'No' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // CM-RE-0107 — Condiciones Ambientales Almacenamiento
  'CM-RE-0107': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'id_lote', label: 'ID Lote', pregunta: 'ID del lote?', tipo: 'text', placeholder: 'C7', requerido: true },
    { key: 'humedad', label: 'Humedad (%)', pregunta: 'Humedad %?', tipo: 'number', placeholder: '60', requerido: true },
    { key: 'temperatura', label: 'Temperatura (°C)', pregunta: 'Temperatura °C?', tipo: 'number', placeholder: '15', requerido: true },
    { key: 'temp_aa', label: 'T° A.A (°C)', pregunta: 'T° A.A °C?', tipo: 'number', placeholder: '17' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // CM-RE-0108 — Condiciones Ambientales Cuarentena
  'CM-RE-0108': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'id_lote', label: 'ID Lote', pregunta: 'ID del lote?', tipo: 'text', placeholder: 'C11', requerido: true },
    { key: 'humedad', label: 'Humedad (%)', pregunta: 'Humedad %?', tipo: 'number', placeholder: '60', requerido: true },
    { key: 'temperatura', label: 'Temperatura (°C)', pregunta: 'Temperatura °C?', tipo: 'number', placeholder: '18', requerido: true },
    { key: 'temp_aa', label: 'T° A.A (°C)', pregunta: 'T° A.A °C?', tipo: 'number', placeholder: '17' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // G02 Trazabilidad — labels alineados al xlsx CM-RE-1010 v2
  'CM-RE-0201': [
    { key: 'codigo_id', label: 'Código ID', pregunta: 'Código ID?', tipo: 'text', placeholder: '25.PM10', requerido: true },
    { key: 'fecha_ingreso', label: 'Fecha de ingreso', pregunta: 'Fecha de ingreso?', tipo: 'date', requerido: true },
    { key: 'fecha_baja', label: 'Fecha de baja', pregunta: 'Fecha de baja? (vacío si sigue vigente)', tipo: 'date' },
    { key: 'sistema', label: 'Sistema', pregunta: 'Sistema?', tipo: 'select', opciones: ['RDWC', 'COCO'], defaultValue: 'RDWC', requerido: true },
    { key: 'clonacion_origen', label: 'Nº Clonación que da origen PM', pregunta: 'Nº Clonación que da origen PM?', tipo: 'text', placeholder: 'CL16' },
    { key: 'madre_origen', label: 'ID Madre que da origen', pregunta: 'ID Madre que da origen?', tipo: 'text', placeholder: '25.PM9' },
  ],
  'CM-RE-0202': [
    { key: 'cod_traza', label: 'Cod. Traza', pregunta: 'Codigo de trazabilidad? (ej 1 PM8.1)', tipo: 'text', placeholder: '1 PM8.1', requerido: true },
    { key: 'camada', label: 'Camada', pregunta: 'Nº de camada?', tipo: 'text', placeholder: '15, 16...', requerido: true },
    { key: 'planta_madre', label: 'Planta Madre', pregunta: 'Nº de planta madre origen?', tipo: 'text', placeholder: '8, 9...', requerido: true },
    { key: 'bandeja', label: 'Bandeja Nº', pregunta: 'Nº de bandeja?', tipo: 'number', placeholder: '1-7', requerido: true },
  ],
  'CM-RE-0203': [
    { key: 'cod_traza', label: 'Cod. Traza', pregunta: 'Codigo de trazabilidad?', tipo: 'text', placeholder: '25.SF2.Li1-VG001-PM4-C07', requerido: true },
    { key: 'camada', label: 'Camada', pregunta: 'Camada?', tipo: 'text', placeholder: 'C7, C9...', requerido: true },
    { key: 'sistema', label: 'Sistema', pregunta: 'Sistema?', tipo: 'select', opciones: ['RDWC', 'Coco'], defaultValue: 'RDWC', requerido: true },
    { key: 'sala', label: 'Sala', pregunta: 'Sala?', tipo: 'text', placeholder: 'Flora 2' },
    { key: 'fila', label: 'Fila', pregunta: 'Fila?', tipo: 'text', placeholder: 'Fila 1' },
  ],
  'CM-RE-0204': [
    { key: 'cod_traza', label: 'Cod. Traza', pregunta: 'Codigo de trazabilidad?', tipo: 'text', placeholder: '25.SF2.Li1-FL001-PM4-C07', requerido: true },
    { key: 'camada', label: 'Camada', pregunta: 'Camada?', tipo: 'text', placeholder: 'C7, C9...', requerido: true },
    { key: 'sistema', label: 'Sistema', pregunta: 'Sistema?', tipo: 'select', opciones: ['RDWC', 'Coco'], defaultValue: 'RDWC', requerido: true },
    { key: 'sala', label: 'Sala', pregunta: 'Sala?', tipo: 'text', placeholder: 'Flora 2' },
    { key: 'fila', label: 'Fila', pregunta: 'Fila?', tipo: 'text', placeholder: 'Fila 1' },
  ],
  'CM-RE-0208': [
    { key: 'cod_traza', label: 'ID Bolsa', pregunta: 'Codigo interno de la bolsa?', tipo: 'text', placeholder: '25. AL8 Ka BI1 PM4.C7', requerido: true },
    { key: 'camada', label: 'Camada', pregunta: 'Camada?', tipo: 'text', placeholder: 'C7', requerido: true },
    { key: 'fila', label: 'Nº Fila', pregunta: 'Nº de fila?', tipo: 'number', placeholder: '4' },
    { key: 'cuadro', label: 'Nº CDS', pregunta: 'Nº de CDS?', tipo: 'number', placeholder: '8' },
    { key: 'peso', label: 'Gr/Bolsa', pregunta: 'Peso por bolsa en gramos?', tipo: 'number', placeholder: '400', requerido: true },
  ],

  // CM-RE-0205 — Trazabilidad Secado
  'CM-RE-0205': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'camada', label: 'Camada', pregunta: 'Camada?', tipo: 'text', placeholder: 'C7', requerido: true },
    { key: 'cod_traza_cosecha', label: 'Cod. traza cosecha', pregunta: 'Codigo traza de cosecha?', tipo: 'text', placeholder: '25.SF1.Li1.PM4.C9' },
    { key: 'cod_traza_secado', label: 'Cod. traza secado', pregunta: 'Codigo traza de secado?', tipo: 'text', placeholder: '25.CDS22-SFL1-FL8-C9', requerido: true },
    { key: 'cuadro_secado', label: 'Cuadro secado', pregunta: 'Numero cuadro de secado?', tipo: 'number' },
    { key: 'peso_fresco', label: 'Peso fresco (kg)', pregunta: 'Peso fresco en kg?', tipo: 'number' },
    { key: 'peso_seco', label: 'Peso seco (kg)', pregunta: 'Peso seco final en kg?', tipo: 'number' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // CM-RE-0206 — Trazabilidad Trimeo
  'CM-RE-0206': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'camada', label: 'Camada', pregunta: 'Camada?', tipo: 'text', requerido: true },
    { key: 'cod_traza_secado', label: 'Cod. traza secado', pregunta: 'Codigo traza secado?', tipo: 'text' },
    { key: 'cod_traza_trimeo', label: 'Cod. traza trimeo', pregunta: 'Codigo traza trimeo?', tipo: 'text', placeholder: '25.Tr22.Ka.PM4.C7', requerido: true },
    { key: 'peso_seco', label: 'Peso pre-trimeo (kg)', pregunta: 'Peso pre-trimeo en kg?', tipo: 'number' },
    { key: 'peso_trimeado', label: 'Peso trimeado (kg)', pregunta: 'Peso post-trimeo en kg?', tipo: 'number' },
    { key: 'merma_pct', label: 'Merma %', pregunta: 'Porcentaje de merma?', tipo: 'number' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // CM-RE-0207 — Trazabilidad Almacenamiento
  'CM-RE-0207': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'camada', label: 'Camada', pregunta: 'Camada?', tipo: 'text', requerido: true },
    { key: 'cod_traza_trimeo', label: 'Cod. traza trimeo', pregunta: 'Codigo traza trimeo?', tipo: 'text' },
    { key: 'cod_traza_almacenamiento', label: 'Cod. traza almac.', pregunta: 'Codigo traza almacenamiento?', tipo: 'text', placeholder: '25. AL8 Ka BI1 PM4.C7', requerido: true },
    { key: 'ubicacion', label: 'Ubicacion', pregunta: 'Ubicacion fisica?', tipo: 'text', placeholder: 'Rack A - estanteria 3' },
    { key: 'peso_total', label: 'Peso total (kg)', pregunta: 'Peso total en kg?', tipo: 'number' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // CM-RE-0209 — Trazabilidad Comercial Final
  'CM-RE-0209': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha de despacho?', tipo: 'date', requerido: true },
    { key: 'camada', label: 'Camada', pregunta: 'Camada?', tipo: 'text', requerido: true },
    { key: 'cod_traza_almacenamiento', label: 'Cod. traza almac.', pregunta: 'Codigo traza almacenamiento origen?', tipo: 'text' },
    { key: 'cod_comercial', label: 'Cod. comercial', pregunta: 'Codigo comercial?', tipo: 'text', placeholder: '25.FIS.BI1.C7.8', requerido: true },
    { key: 'cliente', label: 'Cliente', pregunta: 'Cliente?', tipo: 'text' },
    { key: 'cantidad', label: 'Cantidad', pregunta: 'Cantidad despachada?', tipo: 'number' },
    { key: 'destino', label: 'Destino', pregunta: 'Destino/direccion?', tipo: 'text' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // CM-RE-0210 — Trazabilidad Maestra
  'CM-RE-0210': [
    { key: 'codigo', label: 'Codigo', pregunta: 'Codigo maestro?', tipo: 'text', requerido: true },
    { key: 'descripcion', label: 'Descripcion', pregunta: 'Descripcion?', tipo: 'textarea', requerido: true },
    { key: 'version', label: 'Version', pregunta: 'Version?', tipo: 'text', defaultValue: '1.0' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // CM-RE-0211 — Trazabilidad General
  'CM-RE-0211': [
    { key: 'codigo', label: 'Codigo', pregunta: 'Codigo?', tipo: 'text', requerido: true },
    { key: 'descripcion', label: 'Descripcion', pregunta: 'Descripcion?', tipo: 'textarea', requerido: true },
    { key: 'etapa', label: 'Etapa', pregunta: 'Etapa?', tipo: 'select', opciones: ['PM', 'Clonacion', 'Vegetativo', 'Floracion', 'Cosecha', 'Secado', 'Trimeo', 'Almacenamiento', 'Comercial'] },
    { key: 'vinculaciones', label: 'Vinculaciones', pregunta: 'Codigos vinculados?', tipo: 'textarea' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // G04 Agua, Riego y Sanitizacion (3 formularios)
  // CM-RE-0401 — Sanitizacion del Sistema de Agua Purificada
  'CM-RE-0401': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha sanitizacion?', tipo: 'date', requerido: true },
    { key: 'agua_tratada_lts', label: 'Agua tratada (lts)', pregunta: 'Cuantos litros de agua tratada?', tipo: 'number', placeholder: '54000', requerido: true },
    { key: 'producto', label: 'Producto Utilizado', pregunta: 'Producto utilizado? (ej Cloro)', tipo: 'text', placeholder: 'Cloro', requerido: true },
    { key: 'cantidad_producto_ml', label: 'Cant. producto (ml)', pregunta: 'Cantidad de producto en ml?', tipo: 'number', placeholder: '3240', requerido: true },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea', placeholder: 'agua para dos semanas de uso' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text', requerido: true },
  ],

  // CM-RE-0402 — Analisis de Agua
  'CM-RE-0402': [
    { key: 'numero_registro', label: 'N° Registro', pregunta: 'Numero de registro?', tipo: 'number', placeholder: '1', requerido: true },
    { key: 'punto_muestreo', label: 'Punto de Muestreo', pregunta: 'Punto de muestreo? (ej M1 perforacion)', tipo: 'text', placeholder: 'M1: perforación', requerido: true },
    { key: 'hora_muestreo', label: 'Hora Muestreo', pregunta: 'Hora del muestreo?', tipo: 'time' },
    { key: 'fecha_extraccion', label: 'Fecha extraccion', pregunta: 'Fecha extraccion de muestra?', tipo: 'date', requerido: true },
    { key: 'fecha_recepcion_lab', label: 'Fecha recepcion lab', pregunta: 'Fecha recepcion en lab?', tipo: 'date' },
    { key: 'fecha_inicio_ensayo', label: 'Fecha inicio ensayo', pregunta: 'Fecha inicio ensayo?', tipo: 'date' },
    { key: 'laboratorio', label: 'Laboratorio emisor', pregunta: 'Laboratorio emisor?', tipo: 'text', placeholder: 'INTI NEA' },
    { key: 'numero_protocolo', label: 'N° Protocolo', pregunta: 'Numero protocolo/informe?', tipo: 'text', placeholder: 'OT Nº 218-756' },
    { key: 'fecha_informe', label: 'Fecha informe', pregunta: 'Fecha del informe?', tipo: 'date' },
    { key: 'tipo_analisis', label: 'Tipo de analisis', pregunta: 'Tipo de analisis principal?', tipo: 'textarea', placeholder: 'Microbiologico / Fco-Qco / Metales pesados' },
    { key: 'objeto_analisis', label: 'Objeto analisis', pregunta: 'Objeto del analisis?', tipo: 'text' },
    { key: 'metodologia', label: 'Metodologia', pregunta: 'Metodologia empleada?', tipo: 'textarea' },
    { key: 'resultados', label: 'Resultados', pregunta: 'Resultados del analisis?', tipo: 'textarea', requerido: true },
    { key: 'responsable', label: 'Responsable', pregunta: 'Firma del responsable?', tipo: 'text' },
    { key: 'documento_relacionado', label: 'Documento relacionado', pregunta: 'Documento relacionado? (ref protocolo)', tipo: 'text' },
  ],

  // CM-RE-0403 — Volumen de Agua Utilizada para Riego (plantilla vacia)
  'CM-RE-0403': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'sala', label: 'Sala', pregunta: 'Sala/destino?', tipo: 'select', opciones: ['Plantas Madres', 'Clonacion', 'Vegetativo', 'Floracion 1', 'Floracion 2'], requerido: true },
    { key: 'id_lote', label: 'ID Lote', pregunta: 'ID del lote?', tipo: 'text', placeholder: 'C11' },
    { key: 'volumen_litros', label: 'Volumen (lts)', pregunta: 'Volumen de agua usado en lts?', tipo: 'number', placeholder: '4000', requerido: true },
    { key: 'tipo_riego', label: 'Tipo', pregunta: 'Tipo? (riego / fertirrigacion)', tipo: 'select', opciones: ['Riego', 'Fertirrigacion'], defaultValue: 'Fertirrigacion' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // G03 Fertilizantes
  'CM-RE-0301': [
    { key: 'tanque', label: 'Tanque', pregunta: 'Que tanque? (Ablandador, Tanque 1...)', tipo: 'text', placeholder: 'Ablandador', requerido: true },
    { key: 'destino', label: 'Destino Solucion', pregunta: 'A donde va la solucion?', tipo: 'select', opciones: ['Sala Flora 1', 'Sala Flora 2', 'Plantas Madres', 'Vegetativo', 'Clonacion'], requerido: true },
    { key: 'pro_core', label: 'Pro Core', pregunta: 'Cuanto Pro Core en kg/g? (numero solo)', tipo: 'number', placeholder: '2260' },
    { key: 'pro_grow', label: 'Pro Grow', pregunta: 'Cuanto Pro Grow en kg/g?', tipo: 'number', placeholder: '2260' },
    { key: 'pro_bloom', label: 'Pro Bloom', pregunta: 'Cuanto Pro Bloom en kg/g?', tipo: 'number', placeholder: '3796' },
    { key: 'litros', label: 'Litros Sol. Nutritiva', pregunta: 'Cuantos litros de solucion nutritiva?', tipo: 'number', placeholder: '4000' },
  ],
  'CM-RE-0303': [
    { key: 'sala', label: 'Sala', pregunta: 'En que sala?', tipo: 'select', opciones: ['Plantas Madres', 'Floracion', 'Vegetativo'], requerido: true },
    { key: 'id_lote', label: 'ID Lote', pregunta: 'ID del lote?', tipo: 'text', placeholder: 'PM6, C12...', requerido: true },
    { key: 'etapa', label: 'Etapa', pregunta: 'Etapa del cultivo?', tipo: 'text', placeholder: 'Vegetativo, Floracion...' },
    { key: 'tipo_gasto', label: 'Tipo', pregunta: 'Tipo de gasto?', tipo: 'select', opciones: ['Renovacion', 'Reposicion'], requerido: true },
  ],
  'CM-RE-0304': [
    { key: 'producto', label: 'Producto', pregunta: 'Que producto?', tipo: 'select', opciones: ['ATHENA PRO GROW', 'ATHENA PRO CORE', 'ATHENA PRO BLOOM', 'ATHENA BALANCE', 'ATHENA FADE', 'Otro'], requerido: true },
    { key: 'fecha_mov', label: 'Fecha', pregunta: 'Fecha del movimiento?', tipo: 'date' },
    { key: 'entrada', label: 'Entrada', pregunta: 'Entrada en kg/lt? (0 si no aplica)', tipo: 'number', placeholder: '40' },
    { key: 'salida', label: 'Salida', pregunta: 'Salida en kg/lt? (0 si no aplica)', tipo: 'number', placeholder: '0' },
    { key: 'saldo', label: 'Saldo', pregunta: 'Saldo final en kg/lt?', tipo: 'number' },
  ],

  // CM-RE-0302 — Registro complementario fertilizantes
  'CM-RE-0302': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'detalle', label: 'Detalle', pregunta: 'Detalle del movimiento?', tipo: 'textarea', requerido: true },
    { key: 'cantidad', label: 'Cantidad', pregunta: 'Cantidad?', tipo: 'number' },
    { key: 'unidad', label: 'Unidad', pregunta: 'Unidad? (kg/lt/g/ml)', tipo: 'select', opciones: ['kg', 'lt', 'g', 'ml'], defaultValue: 'kg' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // CM-RE-0305 — Diluciones de fertilizantes
  'CM-RE-0305': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'tanque', label: 'Tanque', pregunta: 'Que tanque?', tipo: 'text', placeholder: 'Tanque 1', requerido: true },
    { key: 'producto', label: 'Producto', pregunta: 'Producto diluido?', tipo: 'text', requerido: true },
    { key: 'cantidad_producto', label: 'Cant. producto (g/ml)', pregunta: 'Cantidad de producto?', tipo: 'number' },
    { key: 'litros_agua', label: 'Litros agua', pregunta: 'Litros de agua?', tipo: 'number' },
    { key: 'dilucion', label: 'Dilucion final', pregunta: 'Dilucion final (ej 1:100)?', tipo: 'text' },
    { key: 'destino', label: 'Destino', pregunta: 'Destino de la solucion?', tipo: 'select', opciones: ['Plantas Madres', 'Clonacion', 'Vegetativo', 'Floracion 1', 'Floracion 2'] },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // CM-RE-0306 — Aux fertilizantes
  'CM-RE-0306': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'detalle', label: 'Detalle', pregunta: 'Detalle?', tipo: 'textarea', requerido: true },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // G05 Plagas y Fitosanitarios (resto faltantes)
  // CM-RE-0501 — Control de Plagas y Roedores
  'CM-RE-0501': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha control?', tipo: 'date', requerido: true },
    { key: 'ubicacion', label: 'Ubicacion', pregunta: 'Ubicacion controlada?', tipo: 'text', placeholder: 'Sala Flora 2 / Perimetro', requerido: true },
    { key: 'tipo_plaga', label: 'Tipo plaga', pregunta: 'Tipo de plaga/roedor?', tipo: 'text', placeholder: 'Roedores / Trips / Acaros' },
    { key: 'estado_trampa', label: 'Estado trampa', pregunta: 'Estado de la trampa/dispositivo?', tipo: 'select', opciones: ['Activa', 'Consumida', 'Reemplazada', 'Sin actividad'], defaultValue: 'Activa' },
    { key: 'accion', label: 'Accion', pregunta: 'Accion tomada?', tipo: 'textarea' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // CM-RE-0502 — Monitoreo de Plagas y Enfermedades
  'CM-RE-0502': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha monitoreo?', tipo: 'date', requerido: true },
    { key: 'sala', label: 'Sala', pregunta: 'Sala?', tipo: 'select', opciones: ['Plantas Madres', 'Clonacion', 'Vegetativo', 'Floracion 1', 'Floracion 2'], requerido: true },
    { key: 'camada', label: 'Camada', pregunta: 'Camada?', tipo: 'text', placeholder: 'C11' },
    { key: 'plaga_detectada', label: 'Plaga/enfermedad', pregunta: 'Plaga o enfermedad detectada?', tipo: 'text', placeholder: 'Trips / Oidio / Araña roja' },
    { key: 'intensidad', label: 'Intensidad', pregunta: 'Intensidad?', tipo: 'select', opciones: ['Nula', 'Baja', 'Media', 'Alta'], defaultValue: 'Baja' },
    { key: 'ubicacion_foco', label: 'Ubicacion foco', pregunta: 'Ubicacion del foco?', tipo: 'text' },
    { key: 'accion', label: 'Accion', pregunta: 'Accion tomada?', tipo: 'textarea' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // CM-RE-0503 — Lista de Fitosanitarios Aprobados (plantilla)
  'CM-RE-0503': [
    { key: 'codigo', label: 'Codigo', pregunta: 'Codigo interno del producto?', tipo: 'text', requerido: true },
    { key: 'producto', label: 'Producto comercial', pregunta: 'Producto comercial?', tipo: 'text', requerido: true },
    { key: 'principio_activo', label: 'Principio activo', pregunta: 'Ingrediente/principio activo?', tipo: 'text' },
    { key: 'tipo', label: 'Tipo', pregunta: 'Tipo? (insecticida/fungicida/acaricida)', tipo: 'select', opciones: ['Insecticida', 'Fungicida', 'Acaricida', 'Bactericida', 'Herbicida'] },
    { key: 'registro_senasa', label: 'Registro SENASA', pregunta: 'Nº registro SENASA?', tipo: 'text' },
    { key: 'fecha_aprobacion', label: 'Fecha aprobacion', pregunta: 'Fecha aprobacion interna?', tipo: 'date' },
    { key: 'aprobado_por', label: 'Aprobado por', pregunta: 'Quien aprobo?', tipo: 'text' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // CM-RE-0505 — Reingreso a Parcelas Tratadas
  'CM-RE-0505': [
    { key: 'fecha_aplicacion', label: 'Fecha aplicacion', pregunta: 'Fecha aplicacion fitosanitario?', tipo: 'date', requerido: true },
    { key: 'producto', label: 'Producto', pregunta: 'Producto aplicado?', tipo: 'text', requerido: true },
    { key: 'sala_lote', label: 'Sala/Lote', pregunta: 'Sala o lote tratado?', tipo: 'text', placeholder: 'Sala Flora 2 / C11', requerido: true },
    { key: 'carencia_dias', label: 'Carencia (dias)', pregunta: 'Dias de carencia?', tipo: 'number', placeholder: '7' },
    { key: 'fecha_reingreso', label: 'Fecha reingreso', pregunta: 'Fecha de reingreso permitido?', tipo: 'date', requerido: true },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable autorizacion?', tipo: 'text' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // CM-RE-0506 — LMR Postcosecha
  'CM-RE-0506': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha analisis?', tipo: 'date', requerido: true },
    { key: 'lote', label: 'Lote', pregunta: 'Lote analizado?', tipo: 'text', placeholder: 'C11', requerido: true },
    { key: 'tipo_analisis', label: 'Tipo analisis', pregunta: 'Tipo analisis?', tipo: 'text', placeholder: 'LMR plaguicidas' },
    { key: 'laboratorio', label: 'Laboratorio', pregunta: 'Laboratorio?', tipo: 'text', placeholder: 'INTI NEA' },
    { key: 'numero_protocolo', label: 'N° protocolo', pregunta: 'Numero protocolo?', tipo: 'text' },
    { key: 'resultados', label: 'Resultados', pregunta: 'Resultados?', tipo: 'textarea', requerido: true },
    { key: 'conforme', label: 'Conforme', pregunta: 'Dentro de LMR?', tipo: 'select', opciones: ['Si', 'No', 'Bajo LMR', 'Fuera LMR'], defaultValue: 'Si' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // CM-RE-0507 — Gestion de Envases Vacios y Fitosanitarios Vencidos
  'CM-RE-0507': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha gestion?', tipo: 'date', requerido: true },
    { key: 'producto', label: 'Producto', pregunta: 'Producto? (envase o fitosanitario vencido)', tipo: 'text', requerido: true },
    { key: 'cantidad_envases', label: 'Cant. envases', pregunta: 'Cantidad de envases?', tipo: 'number' },
    { key: 'volumen_total', label: 'Volumen total', pregunta: 'Volumen total? (lt/kg)', tipo: 'text' },
    { key: 'metodo_triple_lavado', label: 'Triple lavado', pregunta: 'Aplicado triple lavado?', tipo: 'select', opciones: ['Si', 'No', 'N/A'], defaultValue: 'Si' },
    { key: 'destino_final', label: 'Destino final', pregunta: 'Destino final?', tipo: 'select', opciones: ['Centro acopio CampoLimpio', 'Incineracion', 'Gestor habilitado', 'Disposicion autorizada'] },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
    { key: 'documento_relacionado', label: 'Doc. relacionado', pregunta: 'Constancia/manifiesto?', tipo: 'text' },
  ],

  // G06 Cosecha y Postcosecha (resto faltantes)
  // CM-RE-0602 — Croquis Plano Distribucion Monitoreo Peso Cosecha
  'CM-RE-0602': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha cosecha?', tipo: 'date', requerido: true },
    { key: 'camada', label: 'Camada', pregunta: 'Camada?', tipo: 'text', requerido: true },
    { key: 'fila', label: 'Fila', pregunta: 'Fila?', tipo: 'number' },
    { key: 'planta_n', label: 'Planta N°', pregunta: 'Numero de planta?', tipo: 'number' },
    { key: 'peso_individual', label: 'Peso individual (g)', pregunta: 'Peso individual en gramos?', tipo: 'number' },
    { key: 'croquis_ref', label: 'Ref. croquis', pregunta: 'Referencia del croquis?', tipo: 'text' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // CM-RE-0603 — Datos de Cosecha P.H.
  'CM-RE-0603': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'camada', label: 'Camada', pregunta: 'Camada?', tipo: 'text', requerido: true },
    { key: 'cod_traza_cosecha', label: 'Cod. traza', pregunta: 'Codigo trazabilidad?', tipo: 'text' },
    { key: 'humedad_pct', label: 'Humedad %', pregunta: 'Humedad del producto %?', tipo: 'number' },
    { key: 'peso_fresco', label: 'Peso fresco (kg)', pregunta: 'Peso fresco en kg?', tipo: 'number' },
    { key: 'aw', label: 'Aw', pregunta: 'Actividad de agua (Aw)?', tipo: 'number' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // CM-RE-0604 — Resumen de Cosecha
  'CM-RE-0604': [
    { key: 'fecha_cosecha', label: 'Fecha cosecha', pregunta: 'Fecha cosecha?', tipo: 'date', requerido: true },
    { key: 'camada', label: 'Camada', pregunta: 'Camada?', tipo: 'text', requerido: true },
    { key: 'total_plantas', label: 'Total plantas', pregunta: 'Total de plantas cosechadas?', tipo: 'number' },
    { key: 'peso_fresco_total', label: 'Peso fresco total (kg)', pregunta: 'Peso fresco total en kg?', tipo: 'number' },
    { key: 'peso_seco_estimado', label: 'Peso seco estimado (kg)', pregunta: 'Peso seco estimado en kg?', tipo: 'number' },
    { key: 'sistema', label: 'Sistema', pregunta: 'Sistema?', tipo: 'select', opciones: ['COCO', 'RDWC'] },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // CM-RE-0609 — Certificado Salida Almacenamiento
  'CM-RE-0609': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha salida?', tipo: 'date', requerido: true },
    { key: 'cod_traza_almacenamiento', label: 'Cod. traza almac.', pregunta: 'Codigo traza almacenamiento?', tipo: 'text', requerido: true },
    { key: 'cod_salida', label: 'Cod. salida', pregunta: 'Codigo de salida asignado?', tipo: 'text' },
    { key: 'cantidad_bolsas', label: 'Cant. bolsas', pregunta: 'Cantidad de bolsas?', tipo: 'number' },
    { key: 'peso_total', label: 'Peso total (kg)', pregunta: 'Peso total en kg?', tipo: 'number' },
    { key: 'destino', label: 'Destino', pregunta: 'Destino?', tipo: 'text' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // CM-RE-0610 — Certificado Transporte
  'CM-RE-0610': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha transporte?', tipo: 'date', requerido: true },
    { key: 'cod_salida', label: 'Cod. salida', pregunta: 'Codigo de salida?', tipo: 'text', requerido: true },
    { key: 'transporte_empresa', label: 'Empresa transporte', pregunta: 'Empresa de transporte?', tipo: 'text' },
    { key: 'patente', label: 'Patente', pregunta: 'Patente vehiculo?', tipo: 'text' },
    { key: 'conductor', label: 'Conductor', pregunta: 'Conductor?', tipo: 'text' },
    { key: 'destino', label: 'Destino', pregunta: 'Destino?', tipo: 'text' },
    { key: 'cantidad_bultos', label: 'Bultos', pregunta: 'Cantidad de bultos?', tipo: 'number' },
    { key: 'peso_total', label: 'Peso total (kg)', pregunta: 'Peso total kg?', tipo: 'number' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable despacho?', tipo: 'text' },
  ],

  // CM-RE-0611 — Certificado de Lote de Propagacion
  'CM-RE-0611': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'codigo_lote', label: 'Codigo lote propagacion', pregunta: 'Codigo del lote de propagacion?', tipo: 'text', requerido: true },
    { key: 'variedad', label: 'Variedad', pregunta: 'Variedad?', tipo: 'text', defaultValue: 'PETE HOPE' },
    { key: 'cantidad_plantas', label: 'Cant. plantas', pregunta: 'Cantidad de plantas?', tipo: 'number' },
    { key: 'origen', label: 'Origen', pregunta: 'Lote madre origen?', tipo: 'text' },
    { key: 'fecha_inicio', label: 'Fecha inicio', pregunta: 'Fecha inicio propagacion?', tipo: 'date' },
    { key: 'sanidad', label: 'Estado sanitario', pregunta: 'Estado sanitario?', tipo: 'select', opciones: ['Optimo', 'Bueno', 'Requiere tratamiento'], defaultValue: 'Optimo' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // G05 Fitosanitarios
  'CM-RE-0504': [
    { key: 'variedad', label: 'Variedad', pregunta: 'Variedad?', tipo: 'text', defaultValue: 'PETE HOPE' },
    { key: 'ubicacion', label: 'Ubicacion lote', pregunta: 'Donde se aplica? (sala/lote)', tipo: 'text', placeholder: 'Sala Flora 2 / C7' },
    { key: 'objetivo', label: 'Objetivo', pregunta: 'Objetivo? (plaga o enfermedad)', tipo: 'text', placeholder: 'Trips / Oidio / Acaros' },
    { key: 'producto', label: 'Producto comercial', pregunta: 'Producto comercial?', tipo: 'text', requerido: true },
    { key: 'principio_activo', label: 'Ingrediente activo', pregunta: 'Ingrediente activo?', tipo: 'text' },
    { key: 'dosis', label: 'Dosis', pregunta: 'Dosis en ml/100L?', tipo: 'text', placeholder: '50' },
    { key: 'carencia', label: 'Carencia (dias)', pregunta: 'Carencia en dias?', tipo: 'number', placeholder: '7' },
    { key: 'cond_amb', label: 'Cond. ambientales', pregunta: 'Condiciones ambientales? (Temp/HR)', tipo: 'text' },
    { key: 'equipo', label: 'Equipo aplicacion', pregunta: 'Equipo usado?', tipo: 'text', placeholder: 'Mochila / Atomizador' },
    { key: 'operario', label: 'Operario', pregunta: 'Operario que aplico?', tipo: 'text' },
    { key: 'asesor', label: 'Asesor', pregunta: 'Asesor que recomendo?', tipo: 'text' },
  ],

  // G06 Cosecha y Postcosecha
  'CM-RE-0601': [
    { key: 'camada', label: 'Camada', pregunta: 'Que camada? (ej C7)', tipo: 'text', placeholder: 'C7', requerido: true },
    { key: 'fila', label: 'Fila', pregunta: 'Que fila? (1-8)', tipo: 'number', placeholder: '1' },
    { key: 'fecha_transplante', label: 'Fecha transplante', pregunta: 'Fecha del transplante?', tipo: 'date' },
    { key: 'fecha_cosecha', label: 'Fecha cosecha', pregunta: 'Fecha de cosecha?', tipo: 'date', requerido: true },
    { key: 'plantas_cosechadas', label: 'Plantas cosechadas', pregunta: 'Cuantas plantas cosechadas?', tipo: 'number', placeholder: '63', requerido: true },
    { key: 'estado_producto', label: 'Estado producto', pregunta: 'Estado del producto?', tipo: 'select', opciones: ['Frescas', 'Secas', 'Trimeadas'], defaultValue: 'Frescas' },
    { key: 'sistema', label: 'Sistema', pregunta: 'Sistema?', tipo: 'select', opciones: ['COCO', 'RDWC'], defaultValue: 'COCO' },
    { key: 'sala', label: 'Sala cultivo', pregunta: 'Sala?', tipo: 'text', placeholder: 'SF 1' },
    { key: 'ubicacion_cultivo', label: 'Ubicacion', pregunta: 'Ubicacion?', tipo: 'select', opciones: ['Indoor', 'Outdoor', 'Greenhouse'], defaultValue: 'Indoor' },
    { key: 'genetica', label: 'Genetica', pregunta: 'Genetica?', tipo: 'text', defaultValue: 'PETE HOPE' },
    { key: 'cumple_bpa', label: 'Cumple BPA', pregunta: 'Cumple BPA?', tipo: 'select', opciones: ['Si', 'No'], defaultValue: 'Si' },
    { key: 'cond_sanitaria', label: 'Cond. sanitaria', pregunta: 'Condiciones sanitarias?', tipo: 'select', opciones: ['Adecuadas', 'No adecuadas'], defaultValue: 'Adecuadas' },
    { key: 'instrumental', label: 'Instrumental', pregunta: 'Instrumental?', tipo: 'text', defaultValue: 'Tijeras' },
    { key: 'cod_traza_cosecha', label: 'Cod. traza', pregunta: 'Codigo de trazabilidad?', tipo: 'text', placeholder: '25.SF1.Li1.PM4.C9' },
    { key: 'responsable_sala', label: 'Resp. sala', pregunta: 'Responsable de sala?', tipo: 'text' },
    { key: 'responsable_calidad', label: 'Resp. calidad', pregunta: 'Responsable de calidad?', tipo: 'text' },
  ],
  'CM-RE-0605': [
    { key: 'camada', label: 'Camada', pregunta: 'Camada?', tipo: 'text', placeholder: 'C9', requerido: true },
    { key: 'fila', label: 'Linea/Fila', pregunta: 'Nombre del lote (linea/fila)?', tipo: 'text', placeholder: '8' },
    { key: 'fecha_cosecha', label: 'Fecha cosecha', pregunta: 'Fecha de cosecha?', tipo: 'date' },
    { key: 'fecha_traslado', label: 'Fecha traslado', pregunta: 'Fecha del traslado?', tipo: 'date' },
    { key: 'fecha_recepcion', label: 'Fecha recepcion', pregunta: 'Fecha de recepcion en secado?', tipo: 'date', requerido: true },
    { key: 'cantidad_recibida', label: 'Cantidad recibida', pregunta: 'Cantidad recibida?', tipo: 'number', placeholder: '2' },
    { key: 'cuadro_secado', label: 'Cuadro secado', pregunta: 'Nº cuadro de secado?', tipo: 'number', placeholder: '22', requerido: true },
    { key: 'cond_recepcion', label: 'Cond. recepcion', pregunta: 'Condicion de recepcion?', tipo: 'select', opciones: ['Integro', 'Dañado', 'Parcial'], defaultValue: 'Integro' },
    { key: 'cod_traza_cosecha', label: 'Cod. traza cosecha', pregunta: 'Codigo traza de cosecha?', tipo: 'text', placeholder: '25.SF1.Li8.PM4.C9' },
    { key: 'cod_traza_secado', label: 'Cod. traza secado', pregunta: 'Codigo traza de secado?', tipo: 'text', placeholder: '25.CDS22-SFL1-FL8-C9' },
    { key: 'responsable_entrega', label: 'Resp. entrega', pregunta: 'Responsable de entrega?', tipo: 'text' },
    { key: 'responsable_recepcion', label: 'Resp. recepcion', pregunta: 'Responsable de recepcion?', tipo: 'text' },
  ],
  'CM-RE-0606': [
    { key: 'camada', label: 'Camada', pregunta: 'Camada?', tipo: 'text', placeholder: 'C7', requerido: true },
    { key: 'sistema', label: 'Sistema', pregunta: 'Sistema?', tipo: 'select', opciones: ['COCO', 'RDWC'], defaultValue: 'COCO' },
    { key: 'fecha_recepcion', label: 'Fecha recepcion trimeo', pregunta: 'Fecha de recepcion en trimeo?', tipo: 'date', requerido: true },
    { key: 'peso_seco', label: 'Peso seco (kg)', pregunta: 'Peso seco recibido en kg?', tipo: 'number' },
    { key: 'cod_traza_secado', label: 'Cod. traza secado', pregunta: 'Codigo traza de secado?', tipo: 'text', placeholder: '25.CDS22-SFL2-FL8-C7' },
    { key: 'cod_traza_trimeo', label: 'Cod. traza trimeo', pregunta: 'Codigo traza de trimeo?', tipo: 'text', placeholder: '25.Tr22.Ka.PM4.C7' },
    { key: 'responsable_recepcion', label: 'Resp. recepcion', pregunta: 'Responsable de recepcion?', tipo: 'text' },
  ],
  'CM-RE-0607': [
    { key: 'camada', label: 'Camada', pregunta: 'Camada?', tipo: 'text', requerido: true },
    { key: 'cod_traza_trimeo', label: 'Cod. traza trimeo', pregunta: 'Codigo traza de trimeo?', tipo: 'text', placeholder: '25.Tr22.Ka.PM4.C7' },
    { key: 'fecha_inicio_cuarentena', label: 'Fecha inicio', pregunta: 'Fecha inicio cuarentena?', tipo: 'date', requerido: true },
    { key: 'fecha_fin_cuarentena', label: 'Fecha fin', pregunta: 'Fecha fin cuarentena? (vacio si no termino)', tipo: 'date' },
    { key: 'peso_seco', label: 'Peso ingresado (kg)', pregunta: 'Peso ingresado en kg?', tipo: 'number' },
    { key: 'cod_traza_cuarentena', label: 'Cod. traza cuarentena', pregunta: 'Codigo traza de cuarentena?', tipo: 'text' },
    { key: 'obs_sanitarias', label: 'Notas sanitarias', pregunta: 'Notas sanitarias o muestra de lab?', tipo: 'text', placeholder: 'Muestra lab CM-RE-0902 18/11' },
  ],
  'CM-RE-0608': [
    { key: 'camada', label: 'Camada', pregunta: 'Camada?', tipo: 'text', requerido: true },
    { key: 'cantidad_bolsas', label: 'Cant. bolsas', pregunta: 'Cuantas bolsas?', tipo: 'number', placeholder: '69' },
    { key: 'peso_seco', label: 'Peso total (kg)', pregunta: 'Peso total en kg?', tipo: 'number', placeholder: '30.18' },
    { key: 'peso_neto_g', label: 'Peso/bolsa (g)', pregunta: 'Peso por bolsa en gramos?', tipo: 'number', placeholder: '437' },
    { key: 'cod_traza_cuarentena', label: 'Cod. traza cuarentena', pregunta: 'Codigo traza de cuarentena?', tipo: 'text' },
    { key: 'cod_comercial', label: 'Cod. comercial', pregunta: 'Codigo comercial inicial?', tipo: 'text', placeholder: '25.FIS.BI1.C7.8' },
    { key: 'cod_traza_almacenamiento', label: 'Cod. traza almac', pregunta: 'Codigo traza de almacenamiento?', tipo: 'text', placeholder: '25. AL8 Ka BI1 PM4.C7' },
  ],

  // G07 Mantenimiento y Calibracion (7 formularios)
  // CM-RE-0701 — Mantenimiento y Calibracion de Balanza
  'CM-RE-0701': [
    { key: 'fecha_registro', label: 'Fecha registro', pregunta: 'Fecha de la calibracion?', tipo: 'date', requerido: true },
    { key: 'proxima_revision', label: 'Proxima revision', pregunta: 'Fecha proxima revision?', tipo: 'date' },
    { key: 'direccion', label: 'Direccion', pregunta: 'Direccion de instalacion?', tipo: 'text', defaultValue: 'Lamadrid 1638 - Ctes' },
    { key: 'marca', label: 'Marca', pregunta: 'Marca de la balanza?', tipo: 'text', placeholder: 'Systel', requerido: true },
    { key: 'modelo', label: 'Modelo', pregunta: 'Modelo?', tipo: 'text', placeholder: 'Croma 31 Kg' },
    { key: 'numero_serie', label: 'N° Serie', pregunta: 'Numero de serie?', tipo: 'text', placeholder: '38670AR475956' },
    { key: 'valor_comprobacion', label: 'Valor comprobacion (gr)', pregunta: 'Valor de comprobacion en gr?', tipo: 'number' },
    { key: 'resultado', label: 'Resultado', pregunta: 'Resultado de la comprobacion?', tipo: 'textarea', placeholder: 'Condiciones de operar correctamente' },
    { key: 'recomendaciones', label: 'Recomendaciones', pregunta: 'Recomendaciones aplicadas?', tipo: 'textarea' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable de la revision?', tipo: 'text', placeholder: 'Servinlab', requerido: true },
    { key: 'documento_relacionado', label: 'Documento relacionado', pregunta: 'Documento/certificado relacionado?', tipo: 'text' },
  ],

  // CM-RE-0702 — Calibracion de Equipos de Medicion (Ampliado)
  'CM-RE-0702': [
    { key: 'fecha_registro', label: 'Fecha', pregunta: 'Fecha de calibracion?', tipo: 'date', requerido: true },
    { key: 'equipo', label: 'Equipo', pregunta: 'Que equipo? (pH-metro, EC-metro, termometro...)', tipo: 'text', requerido: true },
    { key: 'marca', label: 'Marca', pregunta: 'Marca?', tipo: 'text' },
    { key: 'modelo', label: 'Modelo', pregunta: 'Modelo?', tipo: 'text' },
    { key: 'numero_serie', label: 'N° Serie', pregunta: 'Numero de serie?', tipo: 'text' },
    { key: 'patron_referencia', label: 'Patron/Referencia', pregunta: 'Patron de referencia usado?', tipo: 'text' },
    { key: 'resultado', label: 'Resultado', pregunta: 'Resultado?', tipo: 'select', opciones: ['Conforme', 'No Conforme', 'Ajustado'], defaultValue: 'Conforme' },
    { key: 'proxima_revision', label: 'Proxima revision', pregunta: 'Proxima revision?', tipo: 'date' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // CM-RE-0703 — Mantenimiento del Grupo Electrogeno
  'CM-RE-0703': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha de la revision?', tipo: 'date', requerido: true },
    { key: 'generador_n', label: 'Generador N°', pregunta: 'Numero de generador?', tipo: 'text', placeholder: '1', requerido: true },
    { key: 'estado_bateria', label: 'Estado bateria', pregunta: 'Estado bateria visual OK?', tipo: 'select', opciones: ['Si', 'No'], defaultValue: 'Si' },
    { key: 'carga_bateria', label: 'Carga bateria', pregunta: 'Bateria carga correctamente?', tipo: 'select', opciones: ['Si', 'No'], defaultValue: 'Si' },
    { key: 'nivel_aceite', label: 'Nivel aceite', pregunta: 'Nivel de aceite OK?', tipo: 'select', opciones: ['Si', 'No'], defaultValue: 'Si' },
    { key: 'refrigerante', label: 'Liquido refrigerante', pregunta: 'Refrigerante OK?', tipo: 'select', opciones: ['Si', 'No'], defaultValue: 'Si' },
    { key: 'combustible', label: 'Combustible', pregunta: 'Nivel combustible OK?', tipo: 'select', opciones: ['Si', 'No'], defaultValue: 'Si' },
    { key: 'horas_trabajo', label: 'Horas trabajo', pregunta: 'Horas de trabajo? (service cada 160hs)', tipo: 'text', placeholder: 'hs 1655' },
    { key: 'ruido_motor', label: 'Ruido motor', pregunta: 'Ruido motor en marcha OK?', tipo: 'select', opciones: ['Si', 'No'], defaultValue: 'Si' },
    { key: 'voltaje_ok', label: 'Voltaje OK', pregunta: 'Voltaje correcto?', tipo: 'select', opciones: ['Si', 'No'], defaultValue: 'Si' },
    { key: 'temperatura_ok', label: 'Temperatura OK', pregunta: 'Temperatura motor OK?', tipo: 'select', opciones: ['Si', 'No'], defaultValue: 'Si' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable revision?', tipo: 'text' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones / service realizado?', tipo: 'textarea' },
  ],

  // CM-RE-0704 — Mantenimiento de Aires Acondicionados
  'CM-RE-0704': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'sala', label: 'Sala', pregunta: 'Sala?', tipo: 'select', opciones: ['Plantas Madres', 'Clonacion', 'Vegetativo', 'Floracion 1', 'Floracion 2', 'Secado', 'Cuarentena'], requerido: true },
    { key: 'equipo_n', label: 'Equipo N°', pregunta: 'Numero de equipo?', tipo: 'number', placeholder: '1', requerido: true },
    { key: 'actividad', label: 'Actividad', pregunta: 'Actividad realizada?', tipo: 'select', opciones: ['Unidad interior', 'Unidad exterior', 'Ambas', 'Cambio filtro'], defaultValue: 'Unidad interior' },
    { key: 'metodo', label: 'Metodo', pregunta: 'Metodo? (ej hidrolavadora, quimico...)', tipo: 'text', placeholder: 'Con hidrolavadora' },
    { key: 'estado', label: 'Estado', pregunta: 'Estado actual?', tipo: 'text', placeholder: 'OK / Falta unidad exterior' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // CM-RE-0705 — Mantenimiento de Ventiladores
  'CM-RE-0705': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'sala', label: 'Sala', pregunta: 'Sala?', tipo: 'select', opciones: ['Plantas Madres', 'Clonacion', 'Vegetativo', 'Floracion 1', 'Floracion 2', 'Secado'], requerido: true },
    { key: 'equipo_n', label: 'Ventilador N°', pregunta: 'Numero de ventilador?', tipo: 'number', requerido: true },
    { key: 'actividad', label: 'Actividad', pregunta: 'Actividad? (limpieza/reemplazo/revision)', tipo: 'text' },
    { key: 'estado', label: 'Estado', pregunta: 'Estado?', tipo: 'select', opciones: ['Funcional', 'Requiere reparacion', 'Reemplazado'], defaultValue: 'Funcional' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // CM-RE-0706 — Mantenimiento de Deshumificadores
  'CM-RE-0706': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha?', tipo: 'date', requerido: true },
    { key: 'sala', label: 'Sala', pregunta: 'Sala?', tipo: 'select', opciones: ['Plantas Madres', 'Clonacion', 'Vegetativo', 'Floracion 1', 'Floracion 2', 'Secado', 'Cuarentena'], requerido: true },
    { key: 'equipo_n', label: 'Equipo N°', pregunta: 'Numero de deshumificador?', tipo: 'number', requerido: true },
    { key: 'actividad', label: 'Actividad', pregunta: 'Actividad? (limpieza filtro / descarga agua / revision)', tipo: 'text' },
    { key: 'estado', label: 'Estado', pregunta: 'Estado?', tipo: 'select', opciones: ['Funcional', 'Requiere reparacion', 'Reemplazado'], defaultValue: 'Funcional' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // CM-RE-0707 — Mantenimiento Equipo Osmosis Inversa
  'CM-RE-0707': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha mantenimiento?', tipo: 'date', requerido: true },
    { key: 'ec_medida', label: 'EC medida', pregunta: 'EC medida en tanque post equipo?', tipo: 'number' },
    { key: 'actividad', label: 'Actividad', pregunta: 'Actividad? (cambio filtro / limpieza sedimentos / cambio membrana)', tipo: 'text', placeholder: 'Limpieza filtro de sedimentos', requerido: true },
    { key: 'componente', label: 'Componente', pregunta: 'Componente trabajado?', tipo: 'text', placeholder: 'Filtro sedimentos 1 micra' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text', placeholder: 'Mariano Fernández', requerido: true },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // G08 Personal (10 formularios)
  'CM-RE-0801': [
    { key: 'empleado_nombre', label: 'Empleado', pregunta: 'Nombre y apellido?', tipo: 'text', requerido: true },
    { key: 'tema_capacitacion', label: 'Tema', pregunta: 'Tema capacitacion?', tipo: 'text', requerido: true },
    { key: 'duracion_horas', label: 'Duracion hs', pregunta: 'Duracion horas?', tipo: 'number', placeholder: '2' },
    { key: 'evaluacion_resultado', label: 'Resultado', pregunta: 'Resultado?', tipo: 'select', opciones: ['aprobado','reprobado','pendiente'], defaultValue: 'aprobado' },
    { key: 'responsable', label: 'Capacitador', pregunta: 'Capacitador?', tipo: 'text' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],
  'CM-RE-0802': [
    { key: 'empleado_nombre', label: 'Empleado', pregunta: 'Empleado?', tipo: 'text', requerido: true },
    { key: 'epi_entregado', label: 'EPI entregado', pregunta: 'Que se entrego?', tipo: 'text', requerido: true },
    { key: 'responsable', label: 'Resp entrega', pregunta: 'Quien entrego?', tipo: 'text' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],
  'CM-RE-0803': [
    { key: 'tipo_emergencia', label: 'Tipo', pregunta: 'Tipo emergencia?', tipo: 'select', opciones: ['accidente','incidente','incendio','corte_electrico','otro'] },
    { key: 'gravedad', label: 'Gravedad', pregunta: 'Gravedad?', tipo: 'select', opciones: ['leve','moderado','grave','critico'], defaultValue: 'leve' },
    { key: 'empleado_nombre', label: 'Afectado', pregunta: 'Empleado afectado?', tipo: 'text' },
    { key: 'descripcion', label: 'Descripcion', pregunta: 'Descripcion evento?', tipo: 'textarea', requerido: true },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable reporte?', tipo: 'text' },
  ],
  'CM-RE-0804': [
    { key: 'empleado_nombre', label: 'Empleado', pregunta: 'Empleado evaluado?', tipo: 'text', requerido: true },
    { key: 'conforme', label: 'Conforme', pregunta: 'Cumple BPH?', tipo: 'select', opciones: ['si','no'], defaultValue: 'si' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Quien evaluo?', tipo: 'text' },
  ],
  'CM-RE-0805': [
    { key: 'empleado_nombre', label: 'Empleado', pregunta: 'Empleado?', tipo: 'text', requerido: true },
    { key: 'descripcion', label: 'Estado salud', pregunta: 'Notificacion?', tipo: 'textarea', requerido: true },
    { key: 'conforme', label: 'Apto', pregunta: 'Apto trabajo?', tipo: 'select', opciones: ['si','no'], defaultValue: 'si' },
    { key: 'responsable', label: 'Registra', pregunta: 'Quien registra?', tipo: 'text' },
  ],
  'CM-RE-0806': [
    { key: 'area_limpiada', label: 'Ubicacion botiquin', pregunta: 'Ubicacion del botiquin?', tipo: 'text', requerido: true },
    { key: 'conforme', label: 'Completo', pregunta: 'Completo y vigente?', tipo: 'select', opciones: ['si','no'], defaultValue: 'si' },
    { key: 'observaciones', label: 'Faltantes', pregunta: 'Faltantes o vencidos?', tipo: 'textarea' },
    { key: 'responsable', label: 'Revisor', pregunta: 'Quien reviso?', tipo: 'text' },
  ],
  'CM-RE-0807': [
    { key: 'area_limpiada', label: 'Ubicacion extintor', pregunta: 'Ubicacion del extintor?', tipo: 'text', requerido: true },
    { key: 'producto_limpieza', label: 'Tipo', pregunta: 'Tipo? (ABC/CO2/agua)', tipo: 'text' },
    { key: 'conforme', label: 'Conforme', pregunta: 'Presion OK y no vencido?', tipo: 'select', opciones: ['si','no'], defaultValue: 'si' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
    { key: 'responsable', label: 'Revisor', pregunta: 'Quien reviso?', tipo: 'text' },
  ],
  'CM-RE-0808': [
    { key: 'area_limpiada', label: 'Area limpiada', pregunta: 'Area que se limpio?', tipo: 'text', requerido: true },
    { key: 'producto_limpieza', label: 'Producto', pregunta: 'Producto usado?', tipo: 'text' },
    { key: 'conforme', label: 'Conforme', pregunta: 'Resultado conforme?', tipo: 'select', opciones: ['si','no'], defaultValue: 'si' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Quien limpio?', tipo: 'text' },
  ],
  'CM-RE-0809': [
    { key: 'area_limpiada', label: 'Recipiente', pregunta: 'Recipientes limpiados?', tipo: 'text', requerido: true },
    { key: 'producto_limpieza', label: 'Producto', pregunta: 'Producto de limpieza?', tipo: 'text' },
    { key: 'conforme', label: 'Conforme', pregunta: 'Resultado?', tipo: 'select', opciones: ['si','no'], defaultValue: 'si' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],
  'CM-RE-0810': [
    { key: 'area_limpiada', label: 'Calzado', pregunta: 'Calzado limpiado?', tipo: 'text', requerido: true },
    { key: 'producto_limpieza', label: 'Producto', pregunta: 'Producto usado?', tipo: 'text' },
    { key: 'conforme', label: 'Conforme', pregunta: 'Conforme?', tipo: 'select', opciones: ['si','no'], defaultValue: 'si' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // G10 Documental (10 formularios)
  'CM-RE-1001': [
    { key: 'numero_documento', label: 'N doc', pregunta: 'Numero de documento?', tipo: 'text', requerido: true },
    { key: 'titulo', label: 'Titulo', pregunta: 'Titulo de la especificacion?', tipo: 'text', requerido: true },
    { key: 'version', label: 'Version', pregunta: 'Version?', tipo: 'text', defaultValue: '1.0' },
    { key: 'estado', label: 'Estado', pregunta: 'Estado?', tipo: 'select', opciones: ['vigente','en_revision','obsoleto','borrador'], defaultValue: 'vigente' },
    { key: 'responsable', label: 'Revisor', pregunta: 'Revisor?', tipo: 'text' },
    { key: 'aprobado_por', label: 'Aprobador', pregunta: 'Aprobador?', tipo: 'text' },
    { key: 'descripcion', label: 'Descripcion', pregunta: 'Descripcion?', tipo: 'textarea' },
  ],
  'CM-RE-1002': [
    { key: 'numero_documento', label: 'N doc externo', pregunta: 'Numero doc externo?', tipo: 'text', requerido: true },
    { key: 'titulo', label: 'Titulo', pregunta: 'Titulo? (ej ANMAT 4159/2023)', tipo: 'text', requerido: true },
    { key: 'version', label: 'Version', pregunta: 'Version/año?', tipo: 'text' },
    { key: 'descripcion', label: 'Aplicacion', pregunta: 'Como aplica?', tipo: 'textarea' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable aplicar?', tipo: 'text' },
  ],
  'CM-RE-1003': [
    { key: 'titulo', label: 'Riesgo', pregunta: 'Riesgo analizado?', tipo: 'text', requerido: true },
    { key: 'descripcion', label: 'FMEA', pregunta: 'Descripcion del analisis?', tipo: 'textarea', requerido: true },
    { key: 'responsable', label: 'Analista', pregunta: 'Quien analizo?', tipo: 'text' },
    { key: 'estado', label: 'Estado', pregunta: 'Estado?', tipo: 'select', opciones: ['abierto','mitigado','aceptado','transferido'] },
  ],
  'CM-RE-1004': [
    { key: 'numero_documento', label: 'N cambio', pregunta: 'Numero?', tipo: 'text', requerido: true },
    { key: 'titulo', label: 'Titulo', pregunta: 'Titulo cambio?', tipo: 'text', requerido: true },
    { key: 'descripcion', label: 'Descripcion', pregunta: 'Descripcion?', tipo: 'textarea', requerido: true },
    { key: 'responsable', label: 'Solicitante', pregunta: 'Solicitante?', tipo: 'text' },
    { key: 'aprobado_por', label: 'Aprobador', pregunta: 'Aprobador?', tipo: 'text' },
    { key: 'estado', label: 'Estado', pregunta: 'Estado?', tipo: 'select', opciones: ['propuesto','aprobado','implementado','rechazado'], defaultValue: 'propuesto' },
  ],
  'CM-RE-1005': [
    { key: 'tipo_auditoria', label: 'Tipo', pregunta: 'Tipo auditoria?', tipo: 'select', opciones: ['interna','externa','ANMAT','GAMP5','OMS'] },
    { key: 'titulo', label: 'Alcance', pregunta: 'Titulo/alcance?', tipo: 'text' },
    { key: 'hallazgos', label: 'Hallazgos', pregunta: 'Hallazgos principales?', tipo: 'textarea', requerido: true },
    { key: 'responsable', label: 'Auditor', pregunta: 'Auditor?', tipo: 'text' },
  ],
  'CM-RE-1006': [
    { key: 'descripcion', label: 'Comentario', pregunta: 'Comentario/sugerencia?', tipo: 'textarea', requerido: true },
    { key: 'responsable', label: 'De quien', pregunta: 'De quien viene?', tipo: 'text' },
    { key: 'estado', label: 'Estado', pregunta: 'Estado?', tipo: 'select', opciones: ['recibido','en_analisis','implementado','descartado'], defaultValue: 'recibido' },
  ],
  'CM-RE-1007': [
    { key: 'proveedor_nombre', label: 'Proveedor', pregunta: 'Nombre proveedor?', tipo: 'text', requerido: true },
    { key: 'proveedor_evaluacion', label: 'Evaluacion', pregunta: 'Evaluacion?', tipo: 'select', opciones: ['aprobado','condicionado','rechazado'], defaultValue: 'aprobado' },
    { key: 'descripcion', label: 'Provee', pregunta: 'Que provee?', tipo: 'text' },
    { key: 'responsable', label: 'Evaluo', pregunta: 'Quien evaluo?', tipo: 'text' },
  ],
  'CM-RE-1008': [
    { key: 'titulo', label: 'Tema', pregunta: 'Tema recomendacion?', tipo: 'text', requerido: true },
    { key: 'descripcion', label: 'Recomendacion', pregunta: 'Recomendacion tecnica?', tipo: 'textarea', requerido: true },
    { key: 'responsable', label: 'Emisor', pregunta: 'Quien recomienda?', tipo: 'text' },
  ],
  'CM-RE-1009': [
    { key: 'numero_documento', label: 'N pedido', pregunta: 'Numero pedido?', tipo: 'text', requerido: true },
    { key: 'proveedor_nombre', label: 'Proveedor', pregunta: 'Proveedor?', tipo: 'text' },
    { key: 'descripcion', label: 'Materias', pregunta: 'Materias/insumos pedidos?', tipo: 'textarea', requerido: true },
    { key: 'responsable', label: 'Solicitante', pregunta: 'Solicitante?', tipo: 'text' },
    { key: 'estado', label: 'Estado', pregunta: 'Estado?', tipo: 'select', opciones: ['pendiente','enviado','recibido','cancelado'], defaultValue: 'pendiente' },
  ],
  'CM-RE-1010': [
    { key: 'titulo', label: 'Matriz', pregunta: 'Nombre matriz?', tipo: 'text', defaultValue: 'Matriz Consolidada CUMCS' },
    { key: 'version', label: 'Version', pregunta: 'Version?', tipo: 'text' },
    { key: 'descripcion', label: 'Alcance', pregunta: 'Alcance y cambios?', tipo: 'textarea' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // G09 Calidad, Muestras y No Conformidades
  // CM-RE-0901 — COA / Certificado de Lote
  'CM-RE-0901': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha emision COA?', tipo: 'date', requerido: true },
    { key: 'lote', label: 'Lote', pregunta: 'Lote?', tipo: 'text', placeholder: 'C11', requerido: true },
    { key: 'cod_comercial', label: 'Cod. comercial', pregunta: 'Codigo comercial?', tipo: 'text' },
    { key: 'thc_pct', label: 'THC %', pregunta: 'Porcentaje de THC?', tipo: 'number' },
    { key: 'cbd_pct', label: 'CBD %', pregunta: 'Porcentaje de CBD?', tipo: 'number' },
    { key: 'humedad_pct', label: 'Humedad %', pregunta: 'Humedad %?', tipo: 'number' },
    { key: 'microbiologia', label: 'Microbiologia', pregunta: 'Resultado microbiologia?', tipo: 'select', opciones: ['Conforme', 'No conforme'], defaultValue: 'Conforme' },
    { key: 'metales_pesados', label: 'Metales pesados', pregunta: 'Metales pesados?', tipo: 'select', opciones: ['Conforme', 'No conforme'], defaultValue: 'Conforme' },
    { key: 'pesticidas', label: 'Pesticidas', pregunta: 'Pesticidas?', tipo: 'select', opciones: ['Conforme', 'No detectados', 'No conforme'], defaultValue: 'No detectados' },
    { key: 'laboratorio', label: 'Laboratorio', pregunta: 'Laboratorio emisor?', tipo: 'text' },
    { key: 'numero_protocolo', label: 'N° protocolo', pregunta: 'Numero protocolo?', tipo: 'text' },
    { key: 'aprobado_por', label: 'Aprobado por', pregunta: 'Aprobado por?', tipo: 'text' },
  ],

  // CM-RE-0902 — Toma de Muestras Postcosecha
  'CM-RE-0902': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha toma de muestra?', tipo: 'date', requerido: true },
    { key: 'lote', label: 'Lote', pregunta: 'Lote muestreado?', tipo: 'text', placeholder: 'C11', requerido: true },
    { key: 'etapa', label: 'Etapa', pregunta: 'Etapa? (secado/trimeo/cuarentena)', tipo: 'select', opciones: ['Secado', 'Trimeo', 'Cuarentena', 'Almacenamiento'] },
    { key: 'cantidad_muestra', label: 'Cant. muestra (g)', pregunta: 'Cantidad de muestra en gramos?', tipo: 'number', placeholder: '5' },
    { key: 'destino_muestra', label: 'Destino muestra', pregunta: 'Destino?', tipo: 'select', opciones: ['Laboratorio interno', 'Laboratorio externo', 'Contramuestra'] },
    { key: 'laboratorio', label: 'Laboratorio', pregunta: 'Laboratorio destino?', tipo: 'text' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable toma?', tipo: 'text' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // CM-RE-0903 — Contramuestras Producto Terminado
  'CM-RE-0903': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha conservacion?', tipo: 'date', requerido: true },
    { key: 'lote', label: 'Lote', pregunta: 'Lote?', tipo: 'text', requerido: true },
    { key: 'cod_comercial', label: 'Cod. comercial', pregunta: 'Codigo comercial?', tipo: 'text' },
    { key: 'cantidad', label: 'Cantidad (g)', pregunta: 'Cantidad en gramos?', tipo: 'number' },
    { key: 'ubicacion_fisica', label: 'Ubicacion fisica', pregunta: 'Ubicacion fisica de la contramuestra?', tipo: 'text', placeholder: 'Freezer contramuestras - estanteria 2' },
    { key: 'fecha_vencimiento_conservacion', label: 'Vto. conservacion', pregunta: 'Fecha venc. conservacion?', tipo: 'date' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // CM-RE-0904 — Contramuestras de Sustratos
  'CM-RE-0904': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha muestra?', tipo: 'date', requerido: true },
    { key: 'sustrato', label: 'Sustrato', pregunta: 'Tipo sustrato?', tipo: 'select', opciones: ['Coco', 'Turba', 'Perlita', 'Vermiculita', 'Otro'] },
    { key: 'lote_sustrato', label: 'Lote sustrato', pregunta: 'Lote del sustrato?', tipo: 'text' },
    { key: 'proveedor', label: 'Proveedor', pregunta: 'Proveedor?', tipo: 'text' },
    { key: 'cantidad_muestra', label: 'Cant. muestra', pregunta: 'Cantidad muestra?', tipo: 'text' },
    { key: 'ubicacion_fisica', label: 'Ubicacion', pregunta: 'Ubicacion fisica contramuestra?', tipo: 'text' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // CM-RE-0905 — Analisis Laboratorio Postcosecha
  'CM-RE-0905': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha analisis?', tipo: 'date', requerido: true },
    { key: 'lote', label: 'Lote', pregunta: 'Lote analizado?', tipo: 'text', requerido: true },
    { key: 'tipo_analisis', label: 'Tipo analisis', pregunta: 'Tipo analisis? (cannabinoides/microbiologia/metales/pesticidas)', tipo: 'text', requerido: true },
    { key: 'laboratorio', label: 'Laboratorio', pregunta: 'Laboratorio?', tipo: 'text' },
    { key: 'numero_protocolo', label: 'N° protocolo', pregunta: 'Numero protocolo?', tipo: 'text' },
    { key: 'resultados', label: 'Resultados', pregunta: 'Resultados?', tipo: 'textarea', requerido: true },
    { key: 'conforme', label: 'Conforme', pregunta: 'Conforme?', tipo: 'select', opciones: ['Si', 'No', 'Observado'], defaultValue: 'Si' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // CM-RE-0906 — Reclamos de Clientes
  'CM-RE-0906': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha reclamo?', tipo: 'date', requerido: true },
    { key: 'cliente', label: 'Cliente', pregunta: 'Cliente?', tipo: 'text', requerido: true },
    { key: 'lote', label: 'Lote afectado', pregunta: 'Lote afectado?', tipo: 'text' },
    { key: 'tipo_reclamo', label: 'Tipo reclamo', pregunta: 'Tipo?', tipo: 'select', opciones: ['Calidad', 'Cantidad', 'Envase', 'Transporte', 'Documentacion', 'Otro'] },
    { key: 'descripcion', label: 'Descripcion', pregunta: 'Descripcion del reclamo?', tipo: 'textarea', requerido: true },
    { key: 'accion', label: 'Accion tomada', pregunta: 'Accion tomada?', tipo: 'textarea' },
    { key: 'estado', label: 'Estado', pregunta: 'Estado?', tipo: 'select', opciones: ['Abierto', 'En analisis', 'Resuelto', 'Cerrado'], defaultValue: 'Abierto' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // CM-RE-0907 — Quejas Internas
  'CM-RE-0907': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha queja?', tipo: 'date', requerido: true },
    { key: 'area_origen', label: 'Area origen', pregunta: 'Area de origen?', tipo: 'text', requerido: true },
    { key: 'tipo_queja', label: 'Tipo queja', pregunta: 'Tipo?', tipo: 'select', opciones: ['Proceso', 'Producto', 'Infraestructura', 'Personal', 'Otro'] },
    { key: 'descripcion', label: 'Descripcion', pregunta: 'Descripcion?', tipo: 'textarea', requerido: true },
    { key: 'accion', label: 'Accion tomada', pregunta: 'Accion tomada?', tipo: 'textarea' },
    { key: 'estado', label: 'Estado', pregunta: 'Estado?', tipo: 'select', opciones: ['Abierto', 'En analisis', 'Resuelto', 'Cerrado'], defaultValue: 'Abierto' },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // CM-RE-0908 — Devoluciones
  'CM-RE-0908': [
    { key: 'fecha', label: 'Fecha devolucion', pregunta: 'Fecha devolucion?', tipo: 'date', requerido: true },
    { key: 'cliente', label: 'Cliente', pregunta: 'Cliente?', tipo: 'text', requerido: true },
    { key: 'lote', label: 'Lote', pregunta: 'Lote devuelto?', tipo: 'text', requerido: true },
    { key: 'cantidad', label: 'Cantidad', pregunta: 'Cantidad devuelta?', tipo: 'text' },
    { key: 'motivo', label: 'Motivo', pregunta: 'Motivo devolucion?', tipo: 'textarea', requerido: true },
    { key: 'destino_devuelto', label: 'Destino', pregunta: 'Destino del material devuelto?', tipo: 'select', opciones: ['Cuarentena', 'Reingreso stock', 'Destruccion', 'Analisis'] },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // CM-RE-0909 — Hallazgos (Producto No Conforme)
  'CM-RE-0909': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha hallazgo?', tipo: 'date', requerido: true },
    { key: 'lote', label: 'Lote afectado', pregunta: 'Lote afectado?', tipo: 'text', requerido: true },
    { key: 'etapa', label: 'Etapa deteccion', pregunta: 'Etapa donde se detecto?', tipo: 'select', opciones: ['Cosecha', 'Secado', 'Trimeo', 'Cuarentena', 'Almacenamiento', 'Control calidad', 'Despacho'] },
    { key: 'descripcion', label: 'Descripcion hallazgo', pregunta: 'Descripcion del hallazgo?', tipo: 'textarea', requerido: true },
    { key: 'severidad', label: 'Severidad', pregunta: 'Severidad?', tipo: 'select', opciones: ['Leve', 'Moderada', 'Grave', 'Critica'], defaultValue: 'Moderada' },
    { key: 'accion_inmediata', label: 'Accion inmediata', pregunta: 'Accion inmediata?', tipo: 'textarea' },
    { key: 'disposicion', label: 'Disposicion', pregunta: 'Disposicion?', tipo: 'select', opciones: ['Cuarentena', 'Reproceso', 'Destruccion', 'Liberacion con concesion'] },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
  ],

  // CM-RE-0911 — Disposicion Final Residuos Comunes
  'CM-RE-0911': [
    { key: 'fecha', label: 'Fecha', pregunta: 'Fecha disposicion?', tipo: 'date', requerido: true },
    { key: 'tipo_residuo', label: 'Tipo residuo', pregunta: 'Tipo?', tipo: 'select', opciones: ['Organico', 'Reciclable', 'Papel/carton', 'Plastico', 'Vidrio', 'Metal', 'No reciclable'], requerido: true },
    { key: 'cantidad', label: 'Cantidad', pregunta: 'Cantidad (kg/bolsas)?', tipo: 'text' },
    { key: 'destino', label: 'Destino', pregunta: 'Destino final?', tipo: 'select', opciones: ['Recoleccion municipal', 'Compostera', 'Centro reciclado', 'Gestor habilitado'] },
    { key: 'responsable', label: 'Responsable', pregunta: 'Responsable?', tipo: 'text' },
    { key: 'observaciones', label: 'Observaciones', pregunta: 'Observaciones?', tipo: 'textarea' },
  ],

  // CM-RE-0910 — Disposicion Final Residuos Cannabis Medicinal
  'CM-RE-0910': [
    { key: 'id_lote', label: 'Lote', pregunta: 'Lote o identificacion?', tipo: 'text', placeholder: 'C11, 25.PM4...', requerido: true },
    { key: 'tipo_residuo', label: 'Sala', pregunta: 'De que sala?', tipo: 'select', opciones: ['Plantas Madres', 'Clonacion', 'Vegetativo', 'Floracion 1', 'Floracion 2', 'Secado'] },
    { key: 'cantidad_residuo', label: 'Cantidad', pregunta: 'Cantidad o tipo? (ej 132 clones)', tipo: 'text', placeholder: '132 clones' },
    { key: 'metodo_disposicion', label: 'Destino', pregunta: 'Destino de disposicion?', tipo: 'select', opciones: ['Compostera', 'Incineracion', 'Disposicion final autorizada'], defaultValue: 'Compostera', requerido: true },
    { key: 'cliente', label: 'Encargado', pregunta: 'Encargado de disposicion?', tipo: 'text', placeholder: 'Francisco Bertone' },
    { key: 'acta_destruccion', label: 'Acta', pregunta: 'Nº acta de destruccion?', tipo: 'text', placeholder: 'ACTA-2025-001' },
  ],
}

// Fallback generico: si el codigo no tiene definicion especifica,
// pregunta los campos basicos comunes
export const CAMPOS_GENERICOS: CampoChat[] = [
  { key: 'id_lote', label: 'Lote', pregunta: 'Sobre que lote? (codigo o ID)', tipo: 'text' },
  { key: 'cantidad', label: 'Cantidad', pregunta: 'Cantidad?', tipo: 'number' },
  { key: 'sala', label: 'Sala/Ubicacion', pregunta: 'En que sala o ubicacion?', tipo: 'text' },
]

export function camposParaCodigo(codigo: string): CampoChat[] {
  return CAMPOS_CUMCS[codigo] || CAMPOS_GENERICOS
}

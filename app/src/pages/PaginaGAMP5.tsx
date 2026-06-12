import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, FileText, CheckCircle2, BookOpen, Monitor, Database, Shield, Lock, ShieldCheck } from 'lucide-react'

interface DocGAMP5 {
  titulo: string
  desc: string
  referencia: string
  queEs: string
  queHaceElSoftware: string[]
  estadoImplementacion: 'completo' | 'parcial'
}

const documentos: Record<string, DocGAMP5> = {
  'VP-001': {
    titulo: 'VP-001 Plan de Validacion',
    desc: 'Plan maestro GAMP5 para validacion del sistema CannTrace',
    referencia: 'GAMP5 Appendix M3',
    queEs: 'Define alcance, estrategia y criterios de aceptacion para la validacion completa del sistema.',
    queHaceElSoftware: [
      'Sistema categorizado como GAMP5 Categoria 5 (software configurable)',
      'Validacion basada en riesgo con FMEA de 23 riesgos identificados',
      '4 roles con permisos diferenciados (admin, supervisor, operador, auditor)',
      'Criterios de aceptacion definidos para IQ (10 tests), OQ (60 tests), PQ (18 tests)',
      'Auto-auditoria ejecutable desde la app que verifica el estado del sistema',
    ],
    estadoImplementacion: 'completo',
  },
  'URS-001': {
    titulo: 'URS-001 Especificacion de Requerimientos',
    desc: '60+ requerimientos funcionales, regulatorios, seguridad e integridad',
    referencia: 'GAMP5 Appendix M4, ALCOA+',
    queEs: 'Lista completa de requerimientos que el sistema debe cumplir.',
    queHaceElSoftware: [
      'RF: 16 tipos de operacion seed-to-sale implementados con formulario + chat guiado',
      'RF: Trazabilidad bidireccional con mapa visual de nodos clickeables',
      'RR: 81 tipos de registro CUMCS IMC-GAP cargados y vinculados a operaciones',
      'RS: Autenticacion Supabase GoTrue con JWT + RLS en 23 tablas',
      'RI: Hash SHA-256 encadenado en audit trail (principio ALCOA+)',
      'RN: PWA con Cloudflare CDN global, Supabase backup automatico',
    ],
    estadoImplementacion: 'completo',
  },
  'FS-001': {
    titulo: 'FS-001 Especificacion Funcional',
    desc: 'Como el sistema implementa cada requerimiento del URS',
    referencia: 'GAMP5 Appendix M5',
    queEs: 'Describe como cada requerimiento se traduce en funcionalidad del software.',
    queHaceElSoftware: [
      'React 18 + TypeScript + Tailwind CSS como stack frontend',
      'Chat guiado paso a paso: seleccionar tipo → lote → cantidad → peso → instalacion → confirmar',
      'Formulario estructurado con campos dinamicos por tipo de operacion',
      'Stock con filtros por sistema (RDWC/COCO), busqueda, detalle con timeline de movimientos',
      'Checklist CUMCS con progreso por grupo y estado de registros cargados',
      'Mapa de trazabilidad visual con cadena madre→esqueje→flor→trimmeada',
    ],
    estadoImplementacion: 'completo',
  },
  'DS-001': {
    titulo: 'DS-001 Especificacion de Diseno',
    desc: 'Arquitectura tecnica, esquema DB, seguridad y deployment',
    referencia: 'GAMP5 Appendix M6',
    queEs: 'Arquitectura detallada del sistema a nivel tecnico.',
    queHaceElSoftware: [
      'Supabase PostgreSQL 15 con 23 tablas y Row Level Security activo',
      'Deploy en Cloudflare Pages (CDN global, SSL automatico)',
      'Esquema relacional: lotes → productos, instalaciones, variedades, operaciones',
      'datos_extra JSONB en lotes para sistema (RDWC/COCO), camada, madre_origen',
      'Auth: Supabase GoTrue con JWT, perfiles_usuario con enum rol_usuario',
      'Funcion SQL obtener_rol_usuario() para policies RLS',
    ],
    estadoImplementacion: 'completo',
  },
  'FMEA-001': {
    titulo: 'FMEA-001 Evaluacion de Riesgos',
    desc: '23 riesgos identificados con severidad, probabilidad y mitigaciones',
    referencia: 'GAMP5 Appendix M7, ICH Q9',
    queEs: 'Analisis de riesgos FMEA con RPN (Risk Priority Number) para cada riesgo.',
    queHaceElSoftware: [
      'Perdida integridad datos (RPN alto) → hash SHA-256 encadenado en audit trail',
      'Acceso no autorizado (RPN medio) → RLS + 4 roles con permisos granulares',
      'Perdida trazabilidad (RPN alto) → datos_extra.madre_origen + mapa visual',
      'Fallo audit trail (RPN alto) → trigger PostgreSQL automatico',
      'Adulteracion registros (RPN alto) → operaciones inmutables post-confirmacion',
      'Auto-auditoria verifica 12+ checks de integridad en tiempo real',
    ],
    estadoImplementacion: 'completo',
  },
  'IQ-001': {
    titulo: 'IQ/OQ/PQ Protocolos de Calificacion',
    desc: 'IQ (10 tests), OQ (60 tests), PQ (18 tests) con datos reales',
    referencia: 'GAMP5 Appendix O3-O5',
    queEs: 'Protocolos para verificar que el sistema esta instalado, opera y rinde correctamente.',
    queHaceElSoftware: [
      'IQ: Cloudflare Pages deployado, Supabase conectado, 23 tablas con RLS, auth GoTrue',
      'OQ: 16 operaciones funcionales, chat guiado, formulario, QR, trazabilidad, registros CUMCS',
      'PQ: 22 lotes reales de FIS S.A.S., RDWC y COCO, 81 registros CUMCS configurados',
      'Auto-auditoria ejecuta verificaciones equivalentes a IQ en tiempo real',
      'Datos reales: 10 plantas madre, 12 esquejes, 6 lotes secadero, 5 lotes trimeo',
    ],
    estadoImplementacion: 'completo',
  },
  'TM-001': {
    titulo: 'TM-001 Matriz de Trazabilidad',
    desc: '71 requerimientos → 76 tests, cobertura 100%',
    referencia: 'GAMP5 Appendix M9',
    queEs: 'Matriz bidireccional que vincula cada requerimiento con los tests que lo verifican.',
    queHaceElSoftware: [
      'Cada requerimiento (RF/RR/RS/RI/RN) mapeado a al menos 1 test IQ/OQ/PQ',
      'Mapa de trazabilidad en la app permite rastrear cualquier lote hasta su origen',
      'Codigo de trazabilidad completo: cadena visible de lote origen → producto final',
      'Click en cada nodo muestra datos_extra, dias en etapa, sistema produccion',
      'Derivados visibles: desde una planta madre ver todos los hijos generados',
    ],
    estadoImplementacion: 'completo',
  },
  'SOPs': {
    titulo: 'SOPs - Procedimientos Operativos',
    desc: '4 SOPs + 5 formularios para uso diario del sistema',
    referencia: 'GAMP5 Appendix O7',
    queEs: 'Procedimientos paso a paso para operar el sistema, backup, cambios e incidentes.',
    queHaceElSoftware: [
      'SOP-001 Uso del Sistema: login con 4 roles, registrar operacion via chat o formulario',
      'SOP-002 Backup: Supabase backup automatico diario, Point-in-Time Recovery',
      'SOP-003 Control de Cambios: versionado Git, deploy automatico Cloudflare',
      'SOP-004 Incidentes: auto-auditoria detecta problemas, registros en audit trail',
      'Formularios: FOR-REG (operaciones), FOR-RFC (cambios), FOR-INC (incidentes), FOR-REV (revision), FOR-CAP (capacitacion)',
    ],
    estadoImplementacion: 'completo',
  },
}

export default function PaginaGAMP5() {
  const { docId } = useParams<{ docId: string }>()
  const navigate = useNavigate()

  if (!docId) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
        {/* TopBar */}
        <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
          <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
            <ShieldCheck className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
            <div className="min-w-0">
              <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Documentacion GAMP5</h1>
              <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
                Categoria 5 · <span className="tabular-nums">{Object.keys(documentos).length}</span> documentos
                <span className="hidden sm:inline"><span className="text-[#30303e] mx-1">│</span> 21 CFR Part 11 · EU-GMP Annex 11 · ALCOA+</span>
              </div>
            </div>
            <div className="flex-1" />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#a78bfa]/30 bg-[#a78bfa]/10 text-[#c4b5fd] text-[10.5px] uppercase tracking-widest font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c4b5fd]" />CAT5
            </span>
          </div>
        </div>

        <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4 sm:space-y-5">
          {/* Resumen ejecutivo */}
          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-5">
            <div className="flex items-start gap-3 mb-4">
              <Shield className="w-5 h-5 text-[#a3e635] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-display font-semibold text-[#ececf1]">CannTrace implementa GAMP5 Categoria 5 — Resumen Ejecutivo</p>
                <p className="text-[11px] text-[#5c5c6b] mt-0.5">
                  Software validado segun Good Automated Manufacturing Practice 5 (estandar internacional para sistemas computarizados en industria regulada).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { title: 'Validacion completa', items: ['8 documentos GAMP5 generados (VP/URS/FS/DS/FMEA/IQ-OQ-PQ/TM/SOPs)', '88 tests de calificacion (10 IQ + 60 OQ + 18 PQ)', 'Matriz de trazabilidad URS → FS → DS → Test → Resultado', 'Auto-auditoria con 24 chequeos automaticos en tiempo real'] },
                { title: 'Seguridad y audit trail', items: ['Row Level Security (RLS) activo en todas las tablas', '4 roles diferenciados (admin/supervisor/operador/auditor)', 'Audit trail inmutable: quien, cuando, que cambio', 'Firma electronica SHA-256 por operacion'] },
                { title: 'Trazabilidad CUMCS', items: ['84 registros CUMCS IMC-GAP cargados (G01 a G10)', 'Trazabilidad seed-to-sale completa por camada', 'Cadena de codigos: PM → Clon → Veg → Flo → Cosecha → Almac', 'Conservacion 7 años de cada operacion (ANMAT 4159)'] },
                { title: 'Gestion de riesgo (FMEA)', items: ['23 modos de fallo identificados y mitigados', 'Severidad x Probabilidad x Deteccion = RPN evaluado', 'Validacion basada en riesgo (no solo procedimiento)', 'Acciones correctivas/preventivas (CAPA) documentadas'] },
                { title: 'Stack tecnologico validable', items: ['PostgreSQL (Supabase) con RLS y constraints declarativos', 'React + TypeScript con typecheck obligatorio en build', 'Despliegue en Cloudflare Pages (TLS 1.3, edge global)', 'Codigo abierto en GitHub privado (control de versiones)'] },
                { title: 'Compliance regulatorio', items: ['CUMCS IMC-GAP (Argentina cannabis medicinal)', 'Disposicion 4159 ANMAT', '21 CFR Part 11 (FDA) — audit trail electronico', 'ALCOA+ (Atribuible/Legible/Contemporaneo/Original/Exacto)'] },
              ].map(({ title, items }) => (
                <div key={title} className="rounded-lg bg-[#15151d] border border-[#1f1f2b] p-3">
                  <p className="text-[11px] font-bold text-[#bef264] mb-1.5">{title}</p>
                  <ul className="space-y-0.5">
                    {items.map(item => (
                      <li key={item} className="text-[10.5px] text-[#b3b3c0]">• {item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="text-[10.5px] text-[#46464f] mt-4 italic">
              Cada documento de abajo tiene su contraparte funcional en el software. Click en cualquier doc para ver que hace exactamente CannTrace para cumplir ese requisito.
            </p>
          </div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            initial="hidden" animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
          >
            {Object.entries(documentos).map(([key, doc]) => (
              <motion.button
                key={key}
                variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
                onClick={() => navigate(`/gamp5/${key}`)}
                className="rounded-xl bg-[#101016] border border-[#1f1f2b] hover:border-[#404d20] p-5 text-left transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 bg-[#a3e635]/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#a3e635]/15 transition-colors">
                    <FileText className="w-5 h-5 text-[#a3e635]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-[13px] text-[#ececf1] mb-1">{doc.titulo}</h3>
                    <p className="text-[11px] text-[#5c5c6b] mb-2 leading-relaxed">{doc.desc}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-medium text-[#bef264] bg-[#a3e635]/10 border border-[#404d20] px-2 py-0.5 rounded-full">
                        <BookOpen className="w-3 h-3" />
                        {doc.referencia}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-medium text-[#c4b5fd] bg-[#a78bfa]/10 border border-[#463a66] px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Implementado
                      </span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </div>
    )
  }

  const doc = documentos[docId]
  if (!doc) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
        <div className="flex-1 flex items-center justify-center py-20">
          <p className="text-[#5c5c6b]">El documento {docId} no existe.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <ShieldCheck className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">{doc.titulo}</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              {doc.referencia}
              <span className="hidden sm:inline"><span className="text-[#30303e] mx-1">│</span> {doc.desc}</span>
            </div>
          </div>
          <div className="flex-1" />
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#a3e635]/30 bg-[#a3e635]/10 text-[#d9f99d] text-[10.5px] uppercase tracking-widest font-medium">
            <CheckCircle2 className="w-3 h-3" />Implementado
          </span>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4 sm:space-y-5">
        <button onClick={() => navigate('/gamp5')}
          className="inline-flex items-center gap-2 text-[11.5px] text-[#5c5c6b] hover:text-[#d9f99d] font-medium transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a documentacion
        </button>

        <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <span className="text-[10.5px] font-mono text-[#bef264] bg-[#a3e635]/10 border border-[#404d20] px-2.5 py-1 rounded-lg font-bold">{docId}</span>
            <span className="text-[#2a2a3a]">|</span>
            <span className="text-[11px] text-[#5c5c6b]">{doc.referencia}</span>
            <div className="ml-auto flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#a3e635]" />
              <span className="text-[11px] text-[#bef264] font-medium">Implementado</span>
            </div>
          </div>

          {/* Que es */}
          <div className="p-4 bg-[#15151d] rounded-xl border border-[#1f1f2b]">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-2">Que es este documento</p>
            <p className="text-[12.5px] text-[#d4d4dd] leading-relaxed">{doc.queEs}</p>
          </div>

          {/* Que hace el software */}
          <div className="p-4 bg-[#a3e635]/8 rounded-xl border border-[#404d20]">
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="w-4 h-4 text-[#a3e635]" />
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#bef264] font-medium">Que hace CannTrace para cumplirlo</p>
            </div>
            <ul className="space-y-2">
              {doc.queHaceElSoftware.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#a3e635] flex-shrink-0 mt-0.5" />
                  <span className="text-[12.5px] text-[#b3b3c0] leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Evidencia en el sistema */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-[#15151d] rounded-xl border border-[#1f1f2b] text-center">
              <Database className="w-5 h-5 text-[#5c5c6b] mx-auto mb-1" />
              <p className="text-[11px] font-medium text-[#d4d4dd]">23 tablas</p>
              <p className="text-[10px] text-[#5c5c6b]">con RLS activo</p>
            </div>
            <div className="p-3 bg-[#15151d] rounded-xl border border-[#1f1f2b] text-center">
              <Lock className="w-5 h-5 text-[#5c5c6b] mx-auto mb-1" />
              <p className="text-[11px] font-medium text-[#d4d4dd]">4 roles</p>
              <p className="text-[10px] text-[#5c5c6b]">con permisos</p>
            </div>
            <div className="p-3 bg-[#15151d] rounded-xl border border-[#1f1f2b] text-center">
              <Shield className="w-5 h-5 text-[#5c5c6b] mx-auto mb-1" />
              <p className="text-[11px] font-medium text-[#d4d4dd]">SHA-256</p>
              <p className="text-[10px] text-[#5c5c6b]">audit trail</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// PaginaLanding — landing pública con estética CannTrace dark coherente con /trazabilidad.
// Cards rounded-xl, paleta hex, botones verde transparente con border, terminaciones single-line.

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Leaf, Shield, QrCode, FileCheck, Activity, Users, Lock,
  GitBranch, ScanLine, Award, ArrowRight, Check, Mail,
  ClipboardList, Search, Settings, Sparkles, Globe, Database,
} from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1] as const

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: EASE },
  }),
}
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.08 } } }

// Tonos hex para iconos cards (mismo patrón que /panel y /login roles)
const TONE = {
  primary:    { bg: 'rgba(63,176,116,0.10)',  border: '#404d20', icon: '#d9f99d' },
  primaryAlt: { bg: 'rgba(63,176,116,0.08)',  border: '#404d20', icon: '#bef264' },
  gold:       { bg: 'rgba(196,154,44,0.10)',  border: '#463a66', icon: '#c4b5fd' },
  goldDark:   { bg: 'rgba(196,154,44,0.06)',  border: '#463a66', icon: '#a78bfa' },
  blue:       { bg: 'rgba(60,118,184,0.10)',  border: '#1d3a5a', icon: '#8fb6e8' },
  purple:     { bg: 'rgba(122,90,191,0.10)',  border: '#3a2d5a', icon: '#c9b7ff' },
}

export default function PaginaLanding() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      {/* ============ NAV (TopBar dark coherente) ============ */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <nav className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-9 h-9 rounded-lg bg-[#a3e635]/15 border border-[#404d20] flex items-center justify-center flex-shrink-0">
              <Leaf className="w-4 h-4 text-[#bef264]" strokeWidth={2} />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#bef264] shadow-[0_0_6px_rgba(107,207,142,0.8)]" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.22em] text-[#a78bfa] font-semibold leading-none">Trazabilidad GAMP5</p>
              <div className="font-display font-bold text-[14px] sm:text-[15px] text-[#ececf1] tracking-tight mt-0.5 leading-none">CannTrace</div>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-5 text-[12.5px]">
            <a href="#features" className="text-[#a6a6b5] hover:text-[#d9f99d] transition-colors">Features</a>
            <a href="#roles" className="text-[#a6a6b5] hover:text-[#d9f99d] transition-colors">Roles</a>
            <a href="#compliance" className="text-[#a6a6b5] hover:text-[#d9f99d] transition-colors">Compliance</a>
            <Link to="/docs" className="text-[#a6a6b5] hover:text-[#d9f99d] transition-colors">Docs</Link>
            <Link to="/contacto" className="text-[#a6a6b5] hover:text-[#d9f99d] transition-colors">Contacto</Link>
          </div>

          <div className="flex md:hidden items-center gap-1 text-[10.5px]">
            <a href="#features" className="px-2 py-1 rounded text-[#a6a6b5] hover:text-[#d9f99d]">Features</a>
            <a href="#compliance" className="px-2 py-1 rounded text-[#a6a6b5] hover:text-[#d9f99d]">Compliance</a>
          </div>

          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[11.5px] font-medium text-[#d9f99d]"
            aria-label="Ingresar al sistema"
          >
            Ingresar
          </Link>
        </nav>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#a78bfa]/8 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4 pointer-events-none" aria-hidden />
        <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-[#a3e635]/10 rounded-full blur-[110px] translate-y-1/3 -translate-x-1/4 pointer-events-none" aria-hidden />

        <div className="relative max-w-6xl mx-auto px-3 sm:px-6 pt-12 pb-14 sm:pt-20 sm:pb-24">
          <motion.div className="flex flex-col items-center text-center max-w-4xl mx-auto"
            initial="hidden" animate="visible" variants={stagger}>

            {/* Trust pill (mismo patrón que pill ONLINE/GAMP5 del topbar) */}
            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-[#463a66] bg-[#a78bfa]/10 text-[#c4b5fd] text-[10.5px] uppercase tracking-widest font-medium mb-5">
              <Award className="w-3 h-3" />
              GAMP5 · ANMAT Res 1780/2025 · 21 CFR Part 11
            </motion.div>

            <motion.h1 variants={fadeUp}
              className="font-display font-bold tracking-tight text-[28px] sm:text-[40px] md:text-[56px] text-[#ececf1] leading-[1.05]">
              Trazabilidad <span className="text-[#d9f99d]">seed-to-sale</span><br />
              para cannabis medicinal.
            </motion.h1>

            <motion.p variants={fadeUp}
              className="mt-4 sm:mt-6 text-[14px] sm:text-[16px] md:text-[18px] text-[#a6a6b5] max-w-2xl leading-relaxed">
              Plataforma validada GAMP5 categoría 5 para productores, reguladores y auditores.
              Cadena completa de custodia con audit log <span className="font-mono text-[#c4b5fd] text-[13px]">SHA-256</span> encadenado
              y certificados de análisis públicos.
            </motion.p>

            {/* CTAs (mismo patrón botón refrescar + botón secundario neutro) */}
            <motion.div variants={fadeUp} className="mt-8 flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
              <Link to="/contacto"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-md border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[12.5px] font-medium text-[#d9f99d]">
                Solicitar demo <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link to="/login"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-md border border-[#20202c] bg-[#15151d] hover:bg-[#1c1c27] transition-colors text-[12.5px] font-medium text-[#d4d4dd]">
                Ingresar al sistema
              </Link>
              <Link to="/traza/CL7"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-md text-[12.5px] font-medium text-[#a6a6b5] hover:text-[#d9f99d] transition-colors">
                <QrCode className="w-3.5 h-3.5" />
                Ver CoA público
              </Link>
            </motion.div>

            {/* Stats (mismo patrón QuickStats de /trazabilidad) */}
            <motion.div variants={stagger}
              className="mt-10 sm:mt-14 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
              {[
                { valor: '10', label: 'Etapas trazadas', hint: 'madre a depósito', color: '#ececf1' },
                { valor: '84', label: 'Registros CUMCS', hint: 'CM-RE-* completos', color: '#ececf1' },
                { valor: '100%', label: 'Audit coverage', hint: 'triggers SHA-256', color: '#d9f99d' },
                { valor: 'ALCOA+', label: 'Compliance', hint: 'EU-GMP Annex 11', color: '#c4b5fd' },
              ].map((s) => (
                <motion.div key={s.label} variants={fadeUp}
                  className="rounded-xl bg-[#101016] border border-[#1f1f2b] hover:border-[#404d20] transition-colors p-3.5 text-left">
                  <p className="text-[9.5px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium">{s.label}</p>
                  <p className="font-display font-bold tabular-nums text-[20px] sm:text-[24px] mt-1 leading-none" style={{ color: s.color }}>{s.valor}</p>
                  <p className="text-[10.5px] text-[#757584] mt-1">{s.hint}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="border-t border-[#1f1f2b] py-12 sm:py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          <SectionHeader
            chipIcon={Sparkles}
            chip="Plataforma completa"
            title="Todo lo que necesitas para validar tu producción"
            subtitle="Seis módulos integrados que cubren desde el esquejado hasta el certificado público del paciente."
          />

          <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
            {[
              { icon: GitBranch, titulo: 'Trazabilidad Sale-to-Seed', desc: '10 etapas encadenadas con árbol genealógico visual por camada. Códigos CM-RE-0210 completos.', tone: 'primary' as const },
              { icon: Shield,    titulo: 'Validación GAMP5',          desc: 'Documentación VP-001, URS, FS, DS, FMEA, protocolos IQ/OQ/PQ y SOPs versionados.', tone: 'gold' as const },
              { icon: QrCode,    titulo: 'CoA Digital público',       desc: 'Certificado de análisis por lote con QR accesible sin login. Multi-idioma ES/EN.', tone: 'primary' as const },
              { icon: FileCheck, titulo: 'REPROCANN ANMAT',           desc: 'Reportes semestrales Res 1780/2025 automatizados con upload de documentos.', tone: 'gold' as const },
              { icon: Lock,      titulo: 'Audit log SHA-256',         desc: 'Tabla append-only con hash encadenado blockchain-style. Triggers en 11 tablas críticas.', tone: 'primary' as const },
              { icon: Database,  titulo: 'Multi-tenancy',             desc: 'Aislamiento por organización con RLS Postgres. Un sistema, múltiples productores.', tone: 'gold' as const },
            ].map((f) => {
              const t = TONE[f.tone === 'primary' ? 'primary' : 'gold']
              return (
                <motion.div key={f.titulo} variants={fadeUp}
                  className="group rounded-xl bg-[#101016] border border-[#1f1f2b] hover:border-[#404d20] transition-colors overflow-hidden">
                  <div className="px-4 sm:px-5 py-4 border-b border-[#1f1f2b] flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 border"
                      style={{ background: t.bg, borderColor: t.border, color: t.icon }}>
                      <f.icon className="w-4 h-4" strokeWidth={1.8} />
                    </div>
                    <h3 className="font-display font-semibold text-[13.5px] sm:text-[14px] text-[#ececf1] tracking-tight">{f.titulo}</h3>
                  </div>
                  <div className="px-4 sm:px-5 py-3.5">
                    <p className="text-[12px] text-[#a6a6b5] leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ============ ROLES ============ */}
      <section id="roles" className="border-t border-[#1f1f2b] py-12 sm:py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          <SectionHeader
            chipIcon={Users}
            chip="Pensado para equipos"
            title="Un rol para cada responsabilidad"
          />

          <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
            {[
              { icono: ClipboardList, rol: 'Operador',   tone: 'primary' as const, desc: 'Carga operaciones en chat conversacional. Escanea QR. Completa registros CUMCS.' },
              { icono: Search,        rol: 'Supervisor', tone: 'blue' as const,    desc: 'Confirma operaciones, revisa cadenas de trazabilidad y gestiona alertas.' },
              { icono: Shield,        rol: 'Auditor',    tone: 'gold' as const,    desc: 'Acceso read-only al audit trail completo con validación de hash SHA-256.' },
              { icono: Settings,      rol: 'Admin',      tone: 'purple' as const,  desc: 'Configuración del sistema, gestión de usuarios, importación de datos masivos.' },
            ].map((r) => {
              const t = TONE[r.tone]
              return (
                <motion.div key={r.rol} variants={fadeUp}
                  className="rounded-xl bg-[#101016] border border-[#1f1f2b] hover:border-[#404d20] transition-colors p-4 sm:p-5">
                  <div className="w-10 h-10 rounded-md flex items-center justify-center border mb-3"
                    style={{ background: t.bg, borderColor: t.border, color: t.icon }}>
                    <r.icono className="w-4 h-4" strokeWidth={1.8} />
                  </div>
                  <h3 className="font-display font-semibold text-[14px] text-[#ececf1] tracking-tight">{r.rol}</h3>
                  <p className="text-[11.5px] text-[#a6a6b5] leading-relaxed mt-1.5">{r.desc}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ============ COMPLIANCE ============ */}
      <section id="compliance" className="border-t border-[#1f1f2b] py-12 sm:py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          <SectionHeader
            chipIcon={Award}
            chip="Cumplimiento regulatorio"
            chipTone="gold"
            title="Auditable desde el día uno"
            subtitle="Diseñado para pasar inspecciones ANMAT, FDA y EMA sin sorpresas."
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { sigla: 'GAMP5',           desc: 'Categoría 5 validada' },
              { sigla: 'ANMAT',           desc: 'Dispo 4159/2023 + Res 1780/2025' },
              { sigla: '21 CFR Part 11',  desc: 'Electronic records FDA' },
              { sigla: 'EU-GMP Annex 11', desc: 'Computerised systems' },
              { sigla: 'ALCOA+',          desc: 'Data integrity principles' },
            ].map((b) => (
              <div key={b.sigla}
                className="rounded-xl bg-[#101016] border border-[#463a66]/60 hover:border-[#463a66] transition-colors p-4 text-center">
                <div className="font-display font-bold text-[14px] sm:text-[15px] text-[#c4b5fd] tracking-tight">{b.sigla}</div>
                <div className="text-[10.5px] text-[#8f8f9f] mt-1">{b.desc}</div>
              </div>
            ))}
          </div>

          {/* Features list (mismo patrón que ChecklistRow del DetailPanel) */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5 max-w-4xl mx-auto">
            {[
              'Audit log append-only con trigger_audit_log() encadenado SHA-256',
              'Triggers bloquean UPDATE/DELETE en tablas críticas (immutability)',
              'Row Level Security con tenant_id en 11 tablas (multi-tenancy real)',
              'RPC SECURITY DEFINER para vista pública sin exponer datos internos',
              'Firma electrónica ready vía Supabase Auth + timestamps UTC',
              'Export OpenTHC CRE v2018 + Excel profesional con ExcelJS',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#404d20] bg-[#a3e635]/10">
                  <Check className="w-2.5 h-2.5 text-[#d9f99d]" strokeWidth={3} />
                </div>
                <span className="text-[12px] text-[#a6a6b5] leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section className="border-t border-[#1f1f2b] py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-3 sm:px-6">
          <div className="relative rounded-xl bg-[#101016] border border-[#463a66] overflow-hidden">
            {/* Glow dorado decorativo (mismo patrón que hero del Dashboard) */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#a78bfa]/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" aria-hidden />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#a3e635]/8 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3" aria-hidden />

            <div className="relative p-6 sm:p-10 md:p-14 text-center">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-[#463a66] bg-[#a78bfa]/10 text-[#c4b5fd] text-[10.5px] uppercase tracking-widest font-medium mb-4">
                <Award className="w-3 h-3" />
                Próxima auditoría
              </div>
              <h2 className="font-display font-bold tracking-tight text-[22px] sm:text-[32px] md:text-[40px] text-[#ececf1] leading-tight">
                Listo para tu próxima auditoría
              </h2>
              <p className="mt-3 text-[#a6a6b5] text-[13px] sm:text-[15px] max-w-2xl mx-auto leading-relaxed">
                Cannabis medicinal validado, trazable y listo para aprobación regulatoria.
                Agendemos una demo esta semana.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-2.5 justify-center">
                <Link to="/contacto"
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-md border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[12.5px] font-medium text-[#d9f99d]">
                  <Mail className="w-3.5 h-3.5" />
                  Contactar equipo
                </Link>
                <Link to="/login"
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-md border border-[#20202c] bg-[#15151d] hover:bg-[#1c1c27] transition-colors text-[12.5px] font-medium text-[#d4d4dd]">
                  <ScanLine className="w-3.5 h-3.5" />
                  Ingresar al sistema
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER (mismo patrón que footer de /trazabilidad) ============ */}
      <footer className="border-t border-[#1f1f2b]">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-10 sm:py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="col-span-2">
              <Link to="/" className="inline-flex items-center gap-2.5 mb-3">
                <div className="relative w-9 h-9 rounded-lg bg-[#a3e635]/15 border border-[#404d20] flex items-center justify-center flex-shrink-0">
                  <Leaf className="w-4 h-4 text-[#bef264]" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.22em] text-[#a78bfa] font-semibold leading-none">Trazabilidad GAMP5</p>
                  <div className="font-display font-bold text-[15px] text-[#ececf1] tracking-tight mt-0.5 leading-none">CannTrace</div>
                </div>
              </Link>
              <p className="text-[12px] text-[#a6a6b5] max-w-md leading-relaxed">
                Plataforma de trazabilidad GAMP5 para cannabis medicinal.
                Desarrollado por OA Consultora para FIS S.A.S.
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-[10.5px] text-[#5c5c6b]">
                <Globe className="w-3 h-3" />
                Argentina · LATAM
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5c5c6b] mb-3">Producto</h4>
              <ul className="space-y-2 text-[12px]">
                <li><a href="#features" className="text-[#a6a6b5] hover:text-[#d9f99d] transition-colors">Features</a></li>
                <li><a href="#roles" className="text-[#a6a6b5] hover:text-[#d9f99d] transition-colors">Roles</a></li>
                <li><a href="#compliance" className="text-[#a6a6b5] hover:text-[#d9f99d] transition-colors">Compliance</a></li>
                <li><Link to="/traza/CL7" className="text-[#a6a6b5] hover:text-[#d9f99d] transition-colors">CoA de ejemplo</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5c5c6b] mb-3">Empresa</h4>
              <ul className="space-y-2 text-[12px]">
                <li><Link to="/docs" className="text-[#a6a6b5] hover:text-[#d9f99d] transition-colors">Documentación</Link></li>
                <li><Link to="/contacto" className="text-[#a6a6b5] hover:text-[#d9f99d] transition-colors">Contacto</Link></li>
                <li><Link to="/pitch" className="text-[#a6a6b5] hover:text-[#d9f99d] transition-colors">Para inversores</Link></li>
                <li><a href="mailto:contacto@oaconsultora.com" className="text-[#a6a6b5] hover:text-[#d9f99d] transition-colors">OA Consultora</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom strip mismo footer pattern de /trazabilidad */}
          <div className="mt-10 pt-5 border-t border-[#1f1f2b] flex items-center justify-between flex-wrap gap-3 text-[10.5px] text-[#5c5c6b]">
            <div className="flex items-center gap-3 flex-wrap">
              <span>© 2026 CannTrace · OA Consultora · FIS S.A.S.</span>
              <Link to="/terminos" className="hover:text-[#d9f99d] transition-colors">Términos</Link>
              <Link to="/privacidad" className="hover:text-[#d9f99d] transition-colors">Privacidad</Link>
            </div>
            <div className="flex items-center gap-3 font-mono tabular-nums">
              <span className="flex items-center gap-1.5"><Activity className="w-3 h-3 text-[#bef264]" /> Sistema operativo</span>
              <span className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-[#a78bfa]" /> GAMP5</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─── SectionHeader: chip + título + subtítulo (mismo patrón que /trazabilidad EstadoBar) ─────
function SectionHeader({
  chipIcon: ChipIcon, chip, chipTone = 'primary', title, subtitle,
}: {
  chipIcon: any; chip: string; chipTone?: 'primary' | 'gold'
  title: string; subtitle?: string
}) {
  const chipBg     = chipTone === 'gold' ? 'bg-[#a78bfa]/10' : 'bg-[#a3e635]/10'
  const chipBorder = chipTone === 'gold' ? 'border-[#463a66]' : 'border-[#404d20]'
  const chipText   = chipTone === 'gold' ? 'text-[#c4b5fd]' : 'text-[#d9f99d]'
  return (
    <div className="text-center mb-10 sm:mb-12">
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${chipBorder} ${chipBg} ${chipText} text-[10.5px] uppercase tracking-widest font-medium mb-4`}>
        <ChipIcon className="w-3 h-3" />
        {chip}
      </div>
      <h2 className="font-display font-bold tracking-tight text-[20px] sm:text-[28px] md:text-[36px] text-[#ececf1] leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-[13px] sm:text-[14px] text-[#a6a6b5] max-w-2xl mx-auto leading-relaxed">{subtitle}</p>
      )}
    </div>
  )
}

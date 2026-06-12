import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Leaf, Shield, GitBranch, QrCode, Lock, Database, Award, ArrowRight,
  TrendingUp, Target, Users, Globe, Zap, CheckCircle2, Mail, ChevronRight,
  Sparkles,
} from 'lucide-react'

/**
 * Pitch deck publico para aceleradoras e inversores.
 * Ruta: /pitch
 * Single-page scroll con scroll-snap sections + narrative storytelling.
 */

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
}
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

export default function PaginaPitch() {
  return (
    <div className="min-h-screen bg-primary-100 dark:bg-surface-950 font-sans">
      {/* Sticky nav mini */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-surface-950/80 backdrop-blur-md border-b border-surface-200/60 dark:border-surface-800/60">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-surface-900 dark:text-white">CannTrace</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-500/20 text-accent-700 dark:text-accent-300 font-semibold uppercase tracking-wider">Pitch</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-xs text-surface-600 dark:text-surface-400 hover:text-primary-700 dark:hover:text-primary-400">Inicio</Link>
            <Link
              to="/contacto"
              className="px-3 py-1.5 bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
            >
              <Mail className="w-3 h-3" /> Contactar
            </Link>
          </div>
        </nav>
      </header>

      {/* ============ SLIDE 1 — Hero ============ */}
      <Section variant="hero">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="max-w-4xl text-center">
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/20 border border-accent-400/30 text-accent-200 text-xs font-semibold mb-6"
          >
            <Award className="w-3.5 h-3.5" /> PITCH · Q1 2026 · Buscamos USD 250K seed
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="font-display text-[30px] sm:text-[46px] md:text-[64px] font-bold tracking-tight leading-[1.08] sm:leading-[1.02] text-white"
          >
            La primera plataforma<br />
            <span className="text-accent-300">validada GAMP5</span><br />
            para cannabis medicinal<br />
            <span className="text-primary-300">en LATAM.</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-5 sm:mt-8 text-[14px] sm:text-lg md:text-xl text-primary-100 max-w-2xl mx-auto leading-relaxed">
            Trazabilidad seed-to-sale con audit log criptografico. Unica solucion
            que cumple GAMP5 Cat 5 + ANMAT Res 1780/2025 out-of-the-box.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#problema"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-primary-800 font-semibold shadow-xl hover:bg-accent-50 transition-colors"
            >
              Ver la oportunidad <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              to="/traza/CL7"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/20"
            >
              <QrCode className="w-4 h-4" /> Ver producto live
            </Link>
          </motion.div>
        </motion.div>
      </Section>

      {/* ============ SLIDE 2 — Problema ============ */}
      <Section id="problema" num="01" titulo="El problema" subtitulo="La industria crece sin herramientas serias" bg="surface">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { big: '$57B', label: 'Mercado global cannabis medicinal 2027', source: 'Grand View Research' },
            { big: '0', label: 'Soluciones validadas GAMP5 en Argentina', source: 'Investigacion propia 2026' },
            { big: '73%', label: 'Productores argentinos sin trazabilidad digital', source: 'INASE + CAMEM 2025' },
          ].map((s) => (
            <Stat key={s.label} big={s.big} label={s.label} hint={s.source} />
          ))}
        </div>
        <div className="mt-12 max-w-3xl">
          <h3 className="font-display text-2xl font-bold text-surface-900 dark:text-white mb-4">¿Por que es un problema real?</h3>
          <ul className="space-y-3 text-surface-700 dark:text-surface-300">
            {[
              'ANMAT exige trazabilidad completa seed-to-sale desde Res 1780/2025 — la mayoria cumple en Excel',
              'Auditorias fallan por falta de audit trail inmutable (21 CFR Part 11 / EU-GMP Annex 11)',
              'No existe una herramienta que combine trazabilidad + compliance + CoA publico en un solo sistema',
              'Productores pierden certificaciones importadoras europeas por falta de documentacion GAMP5',
            ].map((p) => (
              <li key={p} className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary-700 dark:text-primary-400 flex-shrink-0 mt-0.5" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ============ SLIDE 3 — Solucion ============ */}
      <Section num="02" titulo="La solucion" subtitulo="Plataforma PWA multi-tenant con 6 pilares" bg="white">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: GitBranch, titulo: 'Trazabilidad Sale-to-Seed', desc: '10 etapas encadenadas, codigos CM-RE-0210 generados automaticamente, arbol visual con ReactFlow' },
            { icon: Shield, titulo: 'Validacion GAMP5', desc: 'Documentacion VP-001/URS/FS/DS/FMEA + protocolos IQ/OQ/PQ + SOPs versionados' },
            { icon: QrCode, titulo: 'CoA digital publico', desc: 'Certificado por lote accesible via QR sin login, multi-idioma ES/EN, con hash' },
            { icon: Lock, titulo: 'Audit log SHA-256', desc: 'Tabla append-only con hash encadenado blockchain-style, detecta alteracion inmediata' },
            { icon: Database, titulo: 'Multi-tenancy Postgres', desc: 'Row Level Security + tenant_id en 11 tablas. Un sistema, multiples productores aislados' },
            { icon: Sparkles, titulo: '+15 modulos integrados', desc: 'Dashboard BI, Alertas, Metricas Sankey/Timeline, Mapa, Calculadora cultivo (VPD/DLI), mas' },
          ].map((f) => (
            <FeatureCard key={f.titulo} icon={f.icon} titulo={f.titulo} desc={f.desc} />
          ))}
        </div>
      </Section>

      {/* ============ SLIDE 4 — Por que ahora ============ */}
      <Section num="03" titulo="Por que ahora" subtitulo="Tormenta perfecta de regulacion + mercado + tecnologia" bg="primary">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: Shield, titulo: 'Regulatorio', items: ['Res ANMAT 1780/2025 vigente', 'Decreto 27/2026 REPROCANN', 'EU-GMP Annex 11 rev 2026', 'FDA 21 CFR Part 11 harmonizacion LATAM'] },
            { icon: TrendingUp, titulo: 'Mercado', items: ['CAGR 18% cannabis medicinal LATAM', 'Argentina aprobo auto-cultivo 2026', 'Uruguay + Mexico + Colombia liberalizando', 'Europa abre importaciones argentinas'] },
            { icon: Zap, titulo: 'Tecnologia', items: ['Postgres RLS maduro (Supabase)', 'Hash-chain viable sin blockchain pesado', 'PWA instalable en celular operador', 'IA para autocompletar CUMCS + alertas'] },
          ].map((b) => (
            <div key={b.titulo} className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-6">
              <div className="w-10 h-10 rounded-xl bg-accent-500/30 flex items-center justify-center mb-3">
                <b.icon className="w-5 h-5 text-accent-200" />
              </div>
              <h3 className="font-display text-xl font-bold text-white mb-3">{b.titulo}</h3>
              <ul className="space-y-1.5 text-sm text-primary-100">
                {b.items.map((i) => (
                  <li key={i} className="flex gap-2">
                    <ChevronRight className="w-4 h-4 text-accent-300 flex-shrink-0 mt-0.5" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* ============ SLIDE 5 — Traccion ============ */}
      <Section num="04" titulo="Traccion" subtitulo="Cliente ancla + producto operativo" bg="surface">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-6">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-[10px] font-bold uppercase tracking-wider mb-3">
              <Target className="w-3 h-3" /> Cliente ancla
            </div>
            <h3 className="font-display text-2xl font-bold text-surface-900 dark:text-white mb-2">FIS S.A.S.</h3>
            <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
              Productor argentino licenciado ANMAT. PETE HOPE (Ka) · RDWC + COCO.
              <strong className="text-surface-900 dark:text-white"> 6 camadas trazadas</strong>, <strong className="text-surface-900 dark:text-white">105 lotes activos</strong>,
              sistema en produccion desde abril 2026.
            </p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-6">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300 text-[10px] font-bold uppercase tracking-wider mb-3">
              <CheckCircle2 className="w-3 h-3" /> Producto
            </div>
            <h3 className="font-display text-2xl font-bold text-surface-900 dark:text-white mb-2">100% operativo</h3>
            <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
              19 paginas funcionales · 84 registros CUMCS digitalizados · CoA publico<br />
              live en <Link to="/traza/CL7" className="text-primary-700 dark:text-primary-400 hover:underline">/traza/CL7</Link> ·
              deploy continuo Cloudflare Pages
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { v: '6', l: 'camadas' },
            { v: '105', l: 'lotes activos' },
            { v: '84', l: 'registros CUMCS' },
            { v: '19', l: 'modulos activos' },
            { v: '61', l: 'eventos audit log' },
          ].map((s) => (
            <div key={s.l} className="rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-4 text-center">
              <div className="text-2xl sm:text-3xl font-bold font-display text-primary-700 dark:text-primary-400 tabular-nums">{s.v}</div>
              <div className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ============ SLIDE 6 — Modelo de negocio ============ */}
      <Section num="05" titulo="Modelo de negocio" subtitulo="SaaS B2B + servicios de implementacion" bg="white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { plan: 'Starter', precio: 'USD 299', per: '/mes', desc: 'Hasta 50 lotes activos · 1 instalacion · CoA publico · Audit log', destacado: false },
            { plan: 'Professional', precio: 'USD 799', per: '/mes', desc: 'Ilimitado · Multi-instalacion · Integraciones IoT · Soporte prioritario', destacado: true },
            { plan: 'Enterprise', precio: 'Custom', per: '', desc: 'White-label · On-premise · SLA 99.9% · GAMP5 validation delivery', destacado: false },
          ].map((p) => (
            <div
              key={p.plan}
              className={`rounded-2xl p-6 relative ${
                p.destacado
                  ? 'bg-gradient-to-br from-primary-700 to-primary-900 text-white border-2 border-accent-400 shadow-2xl shadow-primary-700/30'
                  : 'bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800'
              }`}
            >
              {p.destacado && (
                <span className="absolute -top-3 right-4 px-2 py-0.5 bg-accent-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">Mas popular</span>
              )}
              <h3 className={`font-display text-xl font-bold ${p.destacado ? 'text-white' : 'text-surface-900 dark:text-white'}`}>{p.plan}</h3>
              <div className="mt-3 mb-4">
                <span className={`text-[28px] sm:text-4xl font-bold font-display ${p.destacado ? 'text-white' : 'text-surface-900 dark:text-white'}`}>{p.precio}</span>
                <span className={`text-sm ${p.destacado ? 'text-primary-200' : 'text-surface-500'}`}>{p.per}</span>
              </div>
              <p className={`text-sm leading-relaxed ${p.destacado ? 'text-primary-100' : 'text-surface-600 dark:text-surface-400'}`}>{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 max-w-2xl">
          <h4 className="font-semibold text-sm text-surface-900 dark:text-white mb-3">Servicios adicionales (one-time)</h4>
          <ul className="space-y-2 text-sm text-surface-700 dark:text-surface-300">
            {[
              'Implementacion + capacitacion operadores: USD 5.000–15.000',
              'GAMP5 validation package (8 docs + 88 tests IQ/OQ/PQ): USD 20.000',
              'Integracion con ERP existente: USD 8.000',
              'Auditoria pre-ANMAT: USD 3.500',
            ].map((s) => (
              <li key={s} className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary-700 dark:text-primary-400 flex-shrink-0 mt-0.5" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ============ SLIDE 7 — Equipo ============ */}
      <Section num="06" titulo="Equipo" subtitulo="OA Consultora · expertise regulatorio + producto" bg="surface">
        <div className="max-w-3xl">
          <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-8">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary-700 flex items-center justify-center flex-shrink-0">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold text-surface-900 dark:text-white">OA Consultora</h3>
                <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
                  Argentina · Especializada en validacion de sistemas computarizados para industrias reguladas (farma, alimentos, cannabis medicinal).
                </p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-surface-700 dark:text-surface-300">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-primary-700 dark:text-primary-400 flex-shrink-0 mt-0.5" />
                    <span><strong className="text-surface-900 dark:text-white">Experiencia regulatoria</strong>: ANMAT, FDA, EMA. Validaciones GAMP5 en 20+ proyectos farma.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Database className="w-4 h-4 text-primary-700 dark:text-primary-400 flex-shrink-0 mt-0.5" />
                    <span><strong className="text-surface-900 dark:text-white">Stack moderno</strong>: React 19, TypeScript, Supabase, Cloudflare Edge, testeo GAMP5 integrado.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Globe className="w-4 h-4 text-primary-700 dark:text-primary-400 flex-shrink-0 mt-0.5" />
                    <span><strong className="text-surface-900 dark:text-white">Foco LATAM</strong>: Argentina, Uruguay, Mexico, Colombia. Vinculo con productores licenciados.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary-700 dark:text-primary-400 flex-shrink-0 mt-0.5" />
                    <span><strong className="text-surface-900 dark:text-white">Entregable real</strong>: sistema en produccion con cliente ancla desde abril 2026.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ============ SLIDE 8 — Ask ============ */}
      <Section num="07" titulo="El ask" subtitulo="Seed round · 250K USD · 18 meses runway" bg="primary">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-6">
            <h3 className="font-display text-xl font-bold text-white mb-4">Uso de fondos</h3>
            <ul className="space-y-3">
              {[
                { pct: '40%', item: 'Equipo comercial LATAM (Arg + Uruguay + Mexico)' },
                { pct: '30%', item: 'Developer team (2 devs + 1 validation engineer)' },
                { pct: '15%', item: 'Marketing + ferias (Expocannabis, AACM, ANMAT)' },
                { pct: '15%', item: 'Certificacion ISO 27001 + SOC 2 Type II' },
              ].map((u) => (
                <li key={u.item} className="flex gap-3 items-start">
                  <span className="text-xl sm:text-2xl font-bold font-display text-accent-300 tabular-nums w-12 sm:w-14 flex-shrink-0">{u.pct}</span>
                  <span className="text-sm text-primary-100 pt-1.5">{u.item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-6">
            <h3 className="font-display text-xl font-bold text-white mb-4">Objetivos 18 meses</h3>
            <ul className="space-y-3">
              {[
                '20 clientes pagos · USD 15K MRR',
                'Presencia en 3 paises LATAM',
                'Certificacion SOC 2 + ISO 27001',
                'Partnership con 1 laboratorio de analisis regional',
                'Pilot con ANMAT como herramienta oficial REPROCANN',
              ].map((o) => (
                <li key={o} className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent-300 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-primary-100">{o}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 sm:mt-12 rounded-3xl bg-accent-500/20 border border-accent-400/40 p-5 sm:p-8 md:p-10 text-center">
          <h3 className="font-display text-[22px] sm:text-[30px] md:text-[36px] font-bold text-white mb-3">Hablemos.</h3>
          <p className="text-primary-100 max-w-xl mx-auto mb-6">
            Si sos aceleradora, VC o angel con tesis en digital health / LATAM SaaS / regulated industries —
            agendemos un call esta semana.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/contacto"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-primary-800 font-semibold shadow-xl hover:bg-accent-50"
            >
              <Mail className="w-4 h-4" /> Agendar call
            </Link>
            <a
              href="mailto:contacto@oaconsultora.com?subject=CannTrace%20-%20Seed%20Round"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/20"
            >
              contacto@oaconsultora.com
            </a>
          </div>
        </div>
      </Section>

      <footer className="border-t border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 py-8 text-center">
        <p className="text-xs text-surface-500 dark:text-surface-400">
          CannTrace v1.0 · OA Consultora · GAMP5 Categoria 5 · 2026
        </p>
      </footer>
    </div>
  )
}

// ========== Subcomponentes ==========

function Section({
  id, num, titulo, subtitulo, children, variant, bg,
}: {
  id?: string
  num?: string
  titulo?: string
  subtitulo?: string
  children: React.ReactNode
  variant?: 'hero'
  bg?: 'surface' | 'white' | 'primary'
}) {
  if (variant === 'hero') {
    return (
      <section className="relative min-h-[80vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary-800 via-primary-900 to-surface-950 px-3 sm:px-6 py-12 sm:py-16">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent-500/15 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary-500/15 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" aria-hidden="true" />
        <div className="relative">{children}</div>
      </section>
    )
  }
  const bgCls =
    bg === 'primary'
      ? 'bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 text-white'
      : bg === 'white'
      ? 'bg-white dark:bg-surface-900'
      : 'bg-surface-50 dark:bg-surface-950'
  return (
    <section id={id} className={`${bgCls} py-12 sm:py-20 md:py-28 px-3 sm:px-6`}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUp}
          className="mb-10"
        >
          {num && (
            <div className={`inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] mb-3 ${bg === 'primary' ? 'text-accent-300' : 'text-primary-700 dark:text-primary-400'}`}>
              <span>{num}</span>
              <span className="w-8 h-px bg-current" />
            </div>
          )}
          {titulo && <h2 className={`font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight ${bg === 'primary' ? 'text-white' : 'text-surface-900 dark:text-white'}`}>{titulo}</h2>}
          {subtitulo && <p className={`mt-3 text-[14px] sm:text-lg ${bg === 'primary' ? 'text-primary-100' : 'text-surface-600 dark:text-surface-400'}`}>{subtitulo}</p>}
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUp}
        >
          {children}
        </motion.div>
      </div>
    </section>
  )
}

function Stat({ big, label, hint }: { big: string; label: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-6">
      <div className="text-[36px] sm:text-5xl font-display font-bold text-primary-700 dark:text-primary-400 tabular-nums">{big}</div>
      <div className="text-sm font-medium text-surface-900 dark:text-white mt-2">{label}</div>
      <div className="text-xs text-surface-500 dark:text-surface-500 mt-0.5 italic">{hint}</div>
    </div>
  )
}

function FeatureCard({
  icon: Icon, titulo, desc,
}: {
  icon: React.ComponentType<{ className?: string }>
  titulo: string
  desc: string
}) {
  return (
    <div className="rounded-2xl border border-surface-200 dark:border-surface-800 p-6 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg transition-all bg-white dark:bg-surface-900">
      <div className="w-11 h-11 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-primary-700 dark:text-primary-300" />
      </div>
      <h3 className="font-display font-semibold text-lg text-surface-900 dark:text-white mb-1.5">{titulo}</h3>
      <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">{desc}</p>
    </div>
  )
}

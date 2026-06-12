import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Leaf, ArrowLeft, Shield, FileText } from 'lucide-react'

/**
 * Pagina legal unica que renderiza:
 * - /terminos (terminos de uso)
 * - /privacidad (politica de privacidad)
 * Detectada por pathname.
 */
export default function PaginaLegal() {
  const { pathname } = useLocation()
  const esTerminos = pathname === '/terminos'
  const esPrivacidad = pathname === '/privacidad'

  if (!esTerminos && !esPrivacidad) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-primary-100 dark:bg-surface-950">
        <p className="text-surface-500">Pagina legal no encontrada</p>
      </div>
    )
  }

  const titulo = esTerminos ? 'Terminos de uso' : 'Politica de privacidad'

  return (
    <div className="min-h-screen bg-primary-100 dark:bg-surface-950">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-surface-950/80 backdrop-blur-md border-b border-surface-200/60 dark:border-surface-800/60">
        <nav className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary-700 rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div className="font-bold text-surface-900 dark:text-white">CannTrace</div>
          </Link>
          <Link to="/" className="text-sm text-surface-600 dark:text-surface-300 hover:text-primary-700 flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
        </nav>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
        className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16"
      >
        <div className="mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium mb-4">
            {esTerminos ? <FileText className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
            Documento legal
          </div>
          <h1 className="font-display text-4xl font-bold text-surface-900 dark:text-white tracking-tight">{titulo}</h1>
          <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
            Ultima actualizacion: 17 de abril de 2026 · CannTrace v1.0
          </p>
        </div>

        <article className="prose prose-sm sm:prose-base max-w-none">
          {esTerminos ? <ContenidoTerminos /> : <ContenidoPrivacidad />}
        </article>

        <div className="mt-12 pt-8 border-t border-surface-200 dark:border-surface-800 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-surface-500">
            OA Consultora · Argentina · LATAM
          </p>
          <div className="flex gap-4 text-sm">
            <Link to="/terminos" className={`hover:text-primary-700 ${esTerminos ? 'text-primary-700 font-semibold' : 'text-surface-600 dark:text-surface-400'}`}>
              Terminos
            </Link>
            <Link to="/privacidad" className={`hover:text-primary-700 ${esPrivacidad ? 'text-primary-700 font-semibold' : 'text-surface-600 dark:text-surface-400'}`}>
              Privacidad
            </Link>
            <Link to="/contacto" className="text-surface-600 dark:text-surface-400 hover:text-primary-700">Contacto</Link>
          </div>
        </div>
      </motion.main>
    </div>
  )
}

function ContenidoTerminos() {
  return (
    <div className="text-surface-700 dark:text-surface-300 space-y-6 leading-relaxed">
      <section>
        <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">1. Aceptacion de los terminos</h2>
        <p>
          Al acceder o utilizar CannTrace (la "Plataforma"), aceptas estar legalmente vinculado por estos Terminos de Uso.
          Si no estas de acuerdo, no accedas ni utilices la Plataforma.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">2. Descripcion del servicio</h2>
        <p>
          CannTrace es una plataforma SaaS de trazabilidad seed-to-sale para cannabis medicinal, validada
          conforme al estandar GAMP5 Categoria 5. Permite registrar operaciones, generar certificados de analisis
          digitales (CoA), mantener audit log criptografico y cumplir obligaciones regulatorias ANMAT (Res 1780/2025),
          FDA 21 CFR Part 11 y EU-GMP Annex 11.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">3. Registro y cuentas</h2>
        <p>
          Las cuentas son creadas por administradores autorizados. Los usuarios (Operador/Supervisor/Auditor/Admin)
          son responsables de mantener la confidencialidad de sus credenciales y de toda actividad bajo su cuenta.
          Se recomienda fuertemente activar autenticacion en dos pasos (2FA).
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">4. Propiedad de los datos</h2>
        <p>
          Todos los datos cargados por el cliente (lotes, operaciones, registros CUMCS, analisis) son propiedad
          exclusiva del cliente. OA Consultora procesa dichos datos unicamente para prestar el servicio.
          El cliente puede exportar sus datos en cualquier momento (CSV, Excel, OpenTHC CRE).
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">5. Audit trail inmutable</h2>
        <p>
          Por cumplimiento regulatorio GAMP5/21 CFR Part 11, el audit log es append-only: no se puede modificar ni
          eliminar. Cada entrada se protege con hash SHA-256 encadenado estilo blockchain. Los clientes aceptan
          que esta inmutabilidad es requisito legal y tecnico, y no puede desactivarse.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">6. Uso aceptable</h2>
        <p>
          Esta prohibido: (i) usar la Plataforma para actividades ilegales o no autorizadas por la licencia ANMAT
          del cliente; (ii) intentar vulnerar la seguridad; (iii) revender el servicio sin acuerdo escrito;
          (iv) cargar contenido que infrinja derechos de terceros.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">7. Limitacion de responsabilidad</h2>
        <p>
          CannTrace se presta "tal cual". OA Consultora no garantiza que el servicio este libre de errores ni
          interrupciones. La responsabilidad maxima de OA Consultora se limita a los importes pagados por el cliente
          en los ultimos 12 meses. OA Consultora no es responsable por decisiones operativas del cliente basadas
          en datos procesados por la Plataforma.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">8. Modificaciones</h2>
        <p>
          OA Consultora puede modificar estos terminos con aviso minimo de 30 dias. Los cambios se notifican
          por email al admin de la cuenta. El uso continuado tras la notificacion implica aceptacion.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">9. Ley aplicable</h2>
        <p>
          Estos terminos se rigen por las leyes de la Republica Argentina. Cualquier disputa se resolvera en los
          tribunales ordinarios de la Ciudad Autonoma de Buenos Aires.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">10. Contacto</h2>
        <p>
          Consultas legales: <a href="mailto:legal@oaconsultora.com" className="text-primary-700 hover:underline">legal@oaconsultora.com</a>
        </p>
      </section>
    </div>
  )
}

function ContenidoPrivacidad() {
  return (
    <div className="text-surface-700 dark:text-surface-300 space-y-6 leading-relaxed">
      <section>
        <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">1. Datos que recopilamos</h2>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li><strong>Datos de cuenta</strong>: email, nombre completo, rol, organizacion.</li>
          <li><strong>Datos operativos</strong>: lotes, operaciones, registros CUMCS, analisis de laboratorio.</li>
          <li><strong>Datos tecnicos</strong>: direccion IP, user-agent, timestamps, eventos de audit log.</li>
          <li><strong>Formulario de contacto</strong>: los datos cargados en /contacto se guardan para dar seguimiento.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">2. Uso de los datos</h2>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li>Prestar el servicio de trazabilidad y compliance.</li>
          <li>Mantener audit log requerido por ANMAT/FDA/EMA.</li>
          <li>Responder consultas y brindar soporte.</li>
          <li>Mejorar el producto (metricas agregadas, anonimas).</li>
        </ul>
        <p className="mt-3"><strong>No vendemos ni cedemos datos personales a terceros con fines comerciales.</strong></p>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">3. Almacenamiento y seguridad</h2>
        <p>
          Los datos se almacenan en Supabase (Postgres managed) con Row Level Security activado. Los backups son
          diarios con Point-in-Time Recovery. Los archivos (documentos GAMP5, analisis) en Supabase Storage con
          acceso via signed URLs de 7 dias. Todo el trafico es TLS 1.3 via Cloudflare.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">4. Datos sensibles de cannabis medicinal</h2>
        <p>
          Los datos relacionados con cannabis medicinal (cepas, THC/CBD, REPROCANN, pacientes) se tratan con proteccion
          reforzada. Solo usuarios con rol adecuado acceden a campos especificos. No se exponen datos identificables
          de pacientes en el CoA publico.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">5. Tus derechos (Ley 25.326 Argentina / GDPR)</h2>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li><strong>Acceso</strong>: solicitar copia de tus datos personales.</li>
          <li><strong>Rectificacion</strong>: corregir datos inexactos.</li>
          <li><strong>Eliminacion</strong>: cerrar cuenta y borrar datos (sujeto a obligaciones legales de retencion).</li>
          <li><strong>Portabilidad</strong>: exportar datos en formato estructurado (CSV/Excel/OpenTHC).</li>
          <li><strong>Oposicion</strong>: revocar consentimientos no obligatorios.</li>
        </ul>
        <p className="mt-3">
          Ejerce tus derechos via <a href="mailto:privacy@oaconsultora.com" className="text-primary-700 hover:underline">privacy@oaconsultora.com</a>.
          Respondemos en max 10 dias habiles.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">6. Retencion</h2>
        <p>
          Datos operativos (lotes/operaciones/CUMCS): <strong>7 años</strong> minimo por exigencia ANMAT Res 4159/2023.
          Datos de cuenta: hasta cierre de cuenta + 2 años. Logs de sistema: 90 dias.
          Audit log: retencion permanente (blockchain-style, append-only).
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">7. Cookies</h2>
        <p>
          Solo usamos cookies estrictamente necesarias (sesion Supabase Auth, preferencias UI tema oscuro/claro).
          No hay cookies de analytics de terceros ni tracking publicitario.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">8. Proveedores (sub-procesadores)</h2>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li><strong>Supabase</strong> (EE.UU.) — base de datos, auth, storage</li>
          <li><strong>Cloudflare</strong> (global) — CDN, TLS, hosting frontend</li>
          <li><strong>Sonner/sentry</strong> (opcional, uso futuro) — monitoreo errores</li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">9. Contacto DPO</h2>
        <p>
          Delegado de Proteccion de Datos: <a href="mailto:dpo@oaconsultora.com" className="text-primary-700 hover:underline">dpo@oaconsultora.com</a>
        </p>
      </section>
    </div>
  )
}

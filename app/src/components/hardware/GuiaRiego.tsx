// Guía de RIEGO del clon de Growcast — sección propia.
// Estructura inicial (válvulas, bomba, sensores, crop steering, ESPHome).
// Se va completando con las indicaciones de Gastón.

import { Droplets, Boxes, Gauge, FileCode, ListChecks } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const card = 'rounded-xl bg-[#111119] border border-[#1f1f2b] p-4 sm:p-5'
const th = 'text-left font-medium py-1.5 px-2 text-[10px] uppercase tracking-[0.08em] text-[#5c5c6b] border-b border-[#1f1f2b]'
const td = 'py-1.5 px-2 text-[12px] text-[#d4d4dd] border-b border-[#17171f] align-top'

function Seccion({ icon: Icon, titulo, sub, children }: { icon: LucideIcon; titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className={card}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#7dd3fc]/10 border border-[#7dd3fc]/30 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[#7dd3fc]" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="font-display font-semibold text-[14px] text-[#ececf1]">{titulo}</h2>
          {sub && <p className="text-[11px] text-[#5c5c6b] mt-0.5">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Tabla({ cols, rows }: { cols: string[]; rows: (React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[520px]">
        <thead><tr>{cols.map((c, i) => <th key={i} className={th}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={td}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

export default function GuiaRiego() {
  return (
    <div className="space-y-4 max-w-[1100px]">
      {/* Intro */}
      <div className={card}>
        <p className="text-[13px] text-[#d4d4dd] leading-relaxed">
          Sección de <b className="text-[#7dd3fc]">riego</b> del controlador propio — válvulas por cama, bomba, sensores de sustrato y el motor de
          <b> crop steering (P0/P1/P2)</b> como el de Growcast. Todo controlado por el ESP32 + ESPHome, integrado al Hardware DIY.
        </p>
        <p className="text-[11px] text-[#5c5c6b] mt-2 border-t border-[#1f1f2b] pt-2">🚧 Estructura inicial — se va completando con el detalle real de tu instalación.</p>
      </div>

      {/* Componentes */}
      <Seccion icon={Boxes} titulo="Componentes del riego" sub="Qué comprar para el sistema de varias camas">
        <Tabla
          cols={['Componente', 'Función', 'Nota', 'Precio']}
          rows={[
            [<b>Electroválvula NC 220V × cama</b>, 'Abrir/cerrar el riego de cada cama', 'Diafragma (RPE 220V, con bomba) — NC = fail-safe. Manejo por relé directo, sin contactor', 'USD 4-10 c/u'],
            ['Válvula a bolilla motorizada 220V (alt.)', 'Paso total / presión baja / agua sucia', 'Full bore, abre a 0 bar, más cara y lenta', 'USD 20-40 c/u'],
            [<b>Bomba de presión + contactor</b>, 'Presurizar el riego', 'La bomba SÍ va por contactor (motor)', 'según bomba'],
            [<b>Nivel de tanque (flotante)</b>, 'Interlock: la bomba NO arranca en seco', 'digital, 1 entrada', 'USD 2-4'],
            ['Sensor humedad sustrato × cama (capacitivo)', 'Riego por dryback real de cada cama', 'analógico → ADS1115', 'USD 2-4 c/u'],
            ['Caudalímetro (opcional)', 'Confirmar que efectivamente regó', 'pulsos', 'USD 3-6'],
            ['Dosificadoras (peristálticas) + EC/pH inline', 'Fertirriego automático (futuro)', 'mezcla nutrientes en línea', 'USD 15-30 c/u'],
            ['Fuente 12/24V (si las válvulas no son 220V)', 'Alimentar solenoides de bajo voltaje', 'separada de la lógica', 'USD 8-15'],
          ]}
        />
        <p className="text-[11px] text-[#5c5c6b] mt-2">Con varias camas se suman muchos canales → el MCP23017 + placa de relés (ver Hardware DIY) también maneja las válvulas. Válvulas 220V = relé directo; la bomba = contactor.</p>
      </Seccion>

      {/* Crop steering */}
      <Seccion icon={Gauge} titulo="Cómo riega — crop steering (P0/P1/P2)" sub="El método de Growcast: por fases, no un timer">
        <div className="space-y-2">
          {[
            { f: 'P0 — Dryback', c: '#f0a35e', d: 'Al prender las luces, NO riega por X tiempo (deja secar el sustrato). Estimula raíces.' },
            { f: 'P1 — Rampa (cargar)', c: '#a3e635', d: 'Shots frecuentes y cortos hasta llegar a capacidad de campo (ON/OFF/repeticiones).' },
            { f: 'P2 — Mantenimiento', c: '#7dd3fc', d: 'Shots espaciados durante el día para mantener la humedad objetivo.' },
            { f: 'Dryback por sensor', c: '#a78bfa', d: 'Con sensor de sustrato: riega cuando la humedad cae X% del objetivo (targetHumidity + dryback%).' },
          ].map((p, i) => (
            <div key={i} className="rounded-lg bg-[#101016] border border-[#1f1f2b] p-3">
              <p className="font-display font-semibold text-[12px]" style={{ color: p.c }}>{p.f}</p>
              <p className="text-[12px] text-[#d4d4dd] mt-0.5">{p.d}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#5c5c6b] mt-2">Sincronizado con el fotoperiodo (arranca cuando prenden las luces). No hay timer físico: el ciclado está dentro de cada fase.</p>
      </Seccion>

      {/* ESPHome */}
      <Seccion icon={FileCode} titulo="ESPHome — script de riego por fases" sub="Listo para copiar; ajustá los tiempos a tu cultivo">
        <pre className="text-[10.5px] font-mono bg-[#0a0a0f] border border-[#1f1f2b] rounded-lg p-3 overflow-x-auto text-[#7dd3fc] leading-relaxed">{`switch:
  - platform: gpio
    pin: GPIO25
    id: valvula_cama1
    name: "Riego cama 1"

script:
  - id: ciclo_riego
    then:
      - delay: 2h                 # P0: dryback (deja secar al prender luces)
      - repeat:                   # P1: cargar el sustrato
          count: 6
          then:
            - switch.turn_on: valvula_cama1
            - delay: 30s          # riego de 30 s
            - switch.turn_off: valvula_cama1
            - delay: 15min        # espera entre shots
      - repeat:                   # P2: mantenimiento
          count: 4
          then:
            - switch.turn_on: valvula_cama1
            - delay: 30s
            - switch.turn_off: valvula_cama1
            - delay: 2h

time:
  - platform: sntp
    on_time:
      - hours: 7                  # cuando prenden las luces...
        then: { script.execute: ciclo_riego }   # ...arranca el riego del día`}</pre>
        <p className="text-[11px] text-[#5c5c6b] mt-2">Para varias camas: una válvula (switch) por cama, y el script las riega en secuencia o en paralelo según prefieras. Para dryback real, se lee el sensor de humedad en vez de tiempos fijos.</p>
      </Seccion>

      {/* Pendiente */}
      <Seccion icon={ListChecks} titulo="Por definir (lo vamos armando)" sub="Decime los datos y completo esta sección">
        <ul className="space-y-1.5 text-[12px] text-[#d4d4dd]">
          <li>• Cuántas camas y el diámetro del caño de cada una (tamaño de válvula).</li>
          <li>• Tipo de riego: por horario (P0/P1/P2) o por sensor de humedad (dryback).</li>
          <li>• Bomba: modelo/potencia (para el contactor y el interlock de tanque).</li>
          <li>• ¿Fertirriego? (dosificadoras + EC/pH) o agua/nutriente ya mezclado.</li>
          <li>• Tiempos reales de tu cultivo (duración de P0, shots de P1/P2, dryback %).</li>
        </ul>
      </Seccion>

      <p className="text-[10.5px] text-[#5c5c6b] px-1 pb-4">
        Sección de riego del proyecto growcast-diy. Se integra con el Hardware DIY (mismo ESP32/ESPHome). Documentación completa en el repo: <span className="font-mono">growcast-diy/</span>.
      </p>
    </div>
  )
}

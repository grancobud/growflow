// Guía de hardware: cómo clonar (y mejorar) el controlador de ambiente Growcast
// con ESP32 + ESPHome. Especificaciones, insumos y estrategia multi-sensor.
// Basado en la ingeniería inversa del firmware/API de Growcast (ver growcast-diy/).

import { Cpu, Thermometer, Zap, Boxes, Radio, Wrench, Wallet, FileCode, ChevronRight, Hammer, Monitor, ListChecks, Cable, Users, Rocket, Network, Droplets, ShieldAlert, ToggleLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const card = 'rounded-xl bg-[#111119] border border-[#1f1f2b] p-4 sm:p-5'
const th = 'text-left font-medium py-1.5 px-2 text-[10px] uppercase tracking-[0.08em] text-[#5c5c6b] border-b border-[#1f1f2b]'
const td = 'py-1.5 px-2 text-[12px] text-[#d4d4dd] border-b border-[#17171f] align-top'

function Seccion({ icon: Icon, titulo, sub, children }: { icon: LucideIcon; titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className={card}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#a3e635]/10 border border-[#404d20] flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
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

const chip = (t: string, color = '#a3e635') => (
  <span className="inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border" style={{ color, borderColor: color + '55', background: color + '11' }}>{t}</span>
)

export default function GuiaHardware() {
  return (
    <div className="space-y-4 max-w-[1100px]">
      {/* Intro */}
      <div className={card}>
        <p className="text-[13px] text-[#d4d4dd] leading-relaxed">
          Guía para armar tu <b className="text-[#d9f99d]">propio controlador de ambiente</b> — un clon (y mejora) del Growcast —
          sobre <b className="text-[#a3e635]">ESP32 + ESPHome</b>. Corre la lógica <b>on-device</b> (sobrevive caídas de internet),
          es open-source, sin suscripción, y con más puntos de medición que el original.
        </p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {chip('ESP32')}{chip('ESPHome')}{chip('I²C + 1-Wire')}{chip('220V con contactores', '#f0a35e')}{chip('sin cloud AWS', '#7dd3fc')}{chip('VPD real', '#a78bfa')}
        </div>
        <p className="text-[11px] text-[#7dd3fc] mt-3 border-t border-[#1f1f2b] pt-2.5">
          ✓ <b>Diseño validado en foros</b> (Home Assistant, espboards): la arquitectura ESP32 clásico + ESPHome + relés/contactores + SCD41 es el estándar de la comunidad que hace esto. Los detalles de la comunidad (relés a 5V, SCD41 a 3.3V, derate 50%) están incorporados abajo.
        </p>
      </div>

      {/* Cómo es Growcast (del firmware) */}
      <Seccion icon={Cpu} titulo="Cómo está hecho el Growcast (ingeniería inversa)" sub="Confirmado bajando y analizando su firmware + API tRPC">
        <ul className="space-y-1.5 text-[12.5px] text-[#d4d4dd]">
          <li>• <b>Cerebro:</b> ESP32 (imagen ESP-IDF / Arduino). El mismo que vas a usar.</li>
          <li>• <b>Sensor por I²C:</b> el módulo THC lee un único chip <b>Sensirion SCD</b> (CO₂ + Temp + Humedad en uno), VPD lo calcula el firmware.</li>
          <li>• <b>Arquitectura distribuida:</b> placa principal (WiFi + AWS IoT + bus a módulos) + módulos de sensado/salidas.</li>
          <li>• <b>Salidas:</b> relés 220V on/off. <b>Automatizaciones:</b> motor de reglas (horario, comparador, oscilador) que corre en el device.</li>
          <li>• <b>Driver de sensor propio</b> (sin librería) → por eso el modelo exacto no figura, pero es la familia SCD.</li>
        </ul>
        <p className="text-[11px] text-[#5c5c6b] mt-3">Firmware descargable: <span className="font-mono text-[#7dd3fc]">firmware.growcast.io?id=&lt;id&gt;</span> · THC = id 2.</p>
      </Seccion>

      {/* Cerebro y potencia */}
      <Seccion icon={Zap} titulo="1 · Cerebro y potencia" sub="El controlador y su alimentación">
        <Tabla
          cols={['Componente', 'Función', 'Specs', 'Precio (ARS jul 2026)']}
          rows={[
            [<b>ESP32 DevKit WROOM-32</b>, 'Cerebro (corre ESPHome)', '240 MHz, WiFi/BT, 30+ GPIO, 3.3V lógica', '$10.400-13.000 (Candy-HO)'],
            [<b>Placa de relés 8 canales optoacoplada</b>, 'Lo que usa el pinout de esta sala: K1-K8 directo del ESP32', 'Optoacoplada, jumper JD-VCC, activa en LOW', '≈$13.000-16.000 (ML)'],
            ['Placa 16 canales (upgrade)', 'Solo si sumás más salidas (riego multi-válvula, más equipos) → requiere el MCP23017', 'Candy-HO SKU 1207', '$26.803 (Candy-HO)'],
            ['MCP23017 (expansor I²C)', 'SOLO con la placa de 16: el ESP32 no tiene 16 pines libres → +16 GPIO por I²C. ESPHome nativo.', '16 GPIO extra, dirección 0x20', '≈$8.000-12.000 (ML)'],
            ['Fuente 5V robusta (≥5A)', 'Lógica + bobinas de los relés (separadas vía JD-VCC)', '5V regulada ≥5A, switching metálica', '≈$15.000-25.000 (ML)'],
            ['Gabinete estanco + riel DIN + borneras + ferrules', 'El tablero', 'IP54+, riel DIN 35mm', '≈$40.000-70.000 (ML)'],
          ]}
        />
        <p className="text-[11px] text-[#5c5c6b] mt-2"><b>¿8 o 16 relés?</b> Esta sala usa exactamente <b>8 canales</b> (K1-K8, ver pinout) → la placa de 8 directo del ESP32 alcanza y es más simple (menos componentes = menos puntos de falla). La de 16 + MCP23017 es el upgrade cuando sumes válvulas de riego por cama o más equipos. Cada relé cierra la bobina de un contactor (o directo el CO₂/electroválvula, que son &lt;1A).</p>
        <div className="mt-2 rounded-lg bg-[#7dd3fc]/[0.06] border border-[#7dd3fc]/25 p-2.5">
          <p className="text-[11px] text-[#d4d4dd]"><b className="text-[#7dd3fc]">Truco de foros — jumper JD-VCC:</b> las placas optoacopladas traen un jumper que une la alimentación de las bobinas (JD-VCC) con la de la lógica (VCC). <b>Sacalo</b>: JD-VCC a los 5V de la fuente, VCC al 3.3V del ESP32, GND separados. Así el optoacoplador aísla <i>de verdad</i>: los picos que meten las bobinas al conmutar no llegan al micro (causa #1 de ESP32 que se reinician o GPIOs quemados en estos builds). De paso el LED del opto se enciende bien con lógica 3.3V.</p>
        </div>
        <p className="text-[10.5px] text-[#5c5c6b] mt-2">Precios relevados jul 2026: Candy-HO (Villa Martelli, candy-ho.com) y MercadoLibre. Los «≈» son rangos de mercado — verificar antes de comprar.</p>
      </Seccion>

      {/* Contactores */}
      <Seccion icon={Boxes} titulo="2 · Contactores y protección — dimensionado para TU sala" sub="El relé chico cierra la bobina; el contactor maneja la potencia. 6 contactores">
        <div className="rounded-lg bg-[#e0685c]/[0.08] border border-[#e0685c]/30 p-3 mb-3">
          <p className="text-[12px] text-[#f0a89f]"><b>⚡ Instalación MONOFÁSICA (lo que hay).</b> Total ≈ <b>13,8 kW (~63A)</b>: luces 4,84 kW + AC 6,5 (~30A) + deshumi + 2 vent + 2 bombas ½HP. Todo el equipo es monofásico (bombas ½HP y AC incluidos), así que <b>entra en una línea</b>, pero es carga alta → hay que dimensionarla: <b>cable de acometida 16 mm²+, térmica general ~63A + disyuntor diferencial 30mA, y contratar la potencia con la distribuidora.</b> Clave: <b>escalonar</b> el encendido desde el ESP32 (no arrancar AC + todas las luces + bombas al mismo tiempo) para no clavar el pico. El matriculado tiene que <b>verificar que la acometida/medidor aguanten ~63A</b>; si la distribuidora no te da esa potencia en monofásico, hay que bajar simultaneidad (no correr todo junto) o evaluar trifásica más adelante.</p>
        </div>
        <Tabla
          cols={['Canal', 'Cargas', 'Corriente', 'Contactor', 'Breaker']}
          rows={[
            [<b>Luces grupo 1 (propias)</b>, '3× Insativa 440 + 1× Growtech 400 (1.720W)', '~8A', '25A', 'C16'],
            [<b>Luces grupo 2 (prestadas)</b>, 'Growtech 400 + panel 400 + 3× COB 300 + parrillas 600/340/480 (3.120W)', '~14A', '25A', 'C16'],
            [<b>Aire acondicionado</b>, '1 (6.500W)', '~30A', '40A', 'C32'],
            [<b>Deshumidificador</b>, '1', '~3-5A', '16A', 'C10'],
            [<b>Ventiladores industriales</b>, '2', '~4A', '16A', 'C10'],
            [<b>Bomba de riego ½ HP</b>, '1 (Elektrim BPT 12, por contactor)', '~3-4A', '16A', 'C10'],
            [<b>CO₂ (solenoide chica 220V)</b>, '1', '<1A', '— relé directo', '—'],
          ]}
        />
        <p className="text-[11px] text-[#5c5c6b] mt-2"><b>Total: 6 contactores</b> (2 luces 25A + AC 40A + deshumi 16A + vent 16A + bomba riego 16A) + breaker por grupo + general. El CO₂ va por relé directo. <b>Total sala ≈ 13,8 kW (~63A) en MONOFÁSICO</b> — cable 16 mm²+, térmica general ~63A y cargas escalonadas desde el ESP32. La <b>2ª bomba ½HP</b> (recirculación de la cisterna) va <b>manual, NO al tablero</b> — suma a los 13,8 kW totales de la instalación pero no ocupa canal ni contactor.</p>
        <div className="mt-2 rounded-lg bg-[#e0685c]/[0.08] border border-[#e0685c]/30 p-2.5">
          <p className="text-[11px] text-[#f0a89f]"><b>Disyuntor diferencial 30mA = obligatorio, no opcional.</b> Sala de cultivo = agua + humedad + 220V. La térmica te protege el cable (sobrecarga/corto); el diferencial te protege <b>a vos</b>: corta en milisegundos ante una fuga a tierra (un equipo con carcasa electrificada, un cable pelado en el riego). BAW/Sica 2x63A 30mA ≈ <b>$23.000-32.000</b> — es lo más barato del tablero y lo más importante.</p>
        </div>
        <p className="text-[10.5px] text-[#5c5c6b] mt-2">Precios de referencia (jul 2026): contactor 25A (Chint/BAW/Sica) ≈$25.000-40.000 · contactor 40A ≈$40.000-60.000 · térmica 2x63A ≈$20.000-35.000 · breakers de grupo (C10/C16/C32) ≈$8.000-15.000 c/u. Todo en ML / casas de electricidad; el matriculado suele conseguirlos mejor.</p>
        <div className="mt-2 rounded-lg bg-[#f0a35e]/[0.07] border border-[#f0a35e]/25 p-3">
          <p className="text-[12px] text-[#e0b48a]"><b>Luces divididas en 2 grupos a propósito:</b> los 12 drivers de LED prendiendo TODOS juntos generan un pico de arranque (inrush) que puede soldar los contactos de un solo contactor. Se dividen en grupos y se <b>escalonan</b> — el ESP32 los prende con 1-2 seg de diferencia (fácil con <span className="font-mono">delay</span> en ESPHome). Regla: contactor = corriente × 1.5. Nunca el AC/luces directo al relé.</p>
        </div>
      </Seccion>

      {/* Sensor principal SCD41 */}
      <Seccion icon={Thermometer} titulo="3 · Sensor principal — el «THC» de Growcast" sub="Un solo chip = CO₂ + Temperatura + Humedad + VPD">
        <div className="rounded-lg bg-[#101016] border border-[#404d20] p-3 mb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-display font-semibold text-[13px] text-[#d9f99d]">Sensirion SCD41</span>
            {chip('elegido')}
          </div>
          <p className="text-[12px] text-[#d4d4dd] mb-2">Módulo <b>Starware «SCD41 CO2 IIC»</b> (MercadoLibre AR, nacional) ≈ <b>$52.829</b>. Es el mismo tipo de chip que usa el THC de Growcast.</p>
          <Tabla
            cols={['Spec', 'Valor']}
            rows={[
              ['Mide', 'CO₂ + Temperatura + Humedad (VPD se calcula)'],
              ['Bus', 'I²C (dirección 0x62)'],
              ['Rango CO₂', '400 – 5000 ppm (SCD40 topa en 2000 → por eso el 41)'],
              ['Precisión CO₂', '±(50 ppm + 5%)'],
              ['Alimentación', <span><b className="text-[#f0a35e]">3.3V</b> — el chip es 3.3V; alimentar a 3V3 aunque el módulo diga «5V tolerant» (validado en foros)</span>],
              ['Tipo', <span>Fotoacústico. <b className="text-[#f0a35e]">Apagar la autocalibración (ASC)</b> — ver abajo</span>],
            ]}
          />
        </div>
        <div className="rounded-lg bg-[#f0a35e]/[0.07] border border-[#f0a35e]/25 p-3 mb-2">
          <p className="text-[12px] text-[#e0b48a]"><b>Por qué apagar la autocalibración (ASC):</b> el algoritmo asume que el punto MÁS BAJO de CO₂ que vio en 7 días es «aire exterior» (400 ppm) y se recalibra contra eso. En una sala enriquecida nunca bajás a 400 → el sensor se corre solo y te miente cada semana. En ESPHome: <span className="font-mono">automatic_self_calibration: false</span>. A cambio, calibrás a mano 1-2 veces al año con <b>FRC</b> (forced recalibration): sensor 3+ minutos al aire libre (CO₂ estable ≈420 ppm) y forzás la recalibración a ese valor desde ESPHome. El <span className="font-mono">temperature_offset</span> de fábrica es 4°C (autocalentamiento del chip) — ajustalo comparando contra un termómetro de referencia pegado al sensor.</p>
        </div>
        <p className="text-[11px] text-[#5c5c6b]">⚠️ Algunos módulos rotulan «41» pero traen SCD40. Al conectarlo, ESPHome reporta el chip y su rango — verificar ahí.</p>
      </Seccion>

      {/* Multi-sensor */}
      <Seccion icon={Radio} titulo="4 · Varios sensores POR CABLE (multi-punto / mapa de calor)" sub="Growcast lleva el sensor por cable y lejos (bus hasta 500m). Clave: el I²C NO viaja lejos — elegí el bus según la distancia">
        <div className="rounded-lg bg-[#f0a35e]/[0.07] border border-[#f0a35e]/25 p-3 mb-3">
          <p className="text-[12px] text-[#e0b48a]"><b>Regla de distancia:</b> <b>I²C</b> (SCD41/SHT31/BH1750) anda solo <b>dentro de la caja / &lt;1-2m</b>, NO sirve para tirar el sensor lejos. Para lejos por cable: <b>1-Wire</b> (DS18B20, decenas de metros) o <b>RS485</b> (nodos remotos, cientos de metros — lo que usa Growcast).</p>
        </div>
        <Tabla
          cols={['Bus / componente', 'Resuelve', 'Distancia', 'Precio']}
          rows={[
            [<b>DS18B20 ×9-15 (1-Wire)</b>, 'Grilla de TEMPERATURA por cable (mapa de calor)', 'decenas de m, muchos en 1 cable', '$3.465 c/u sonda sumergible (Candy-HO)'],
            [<b>SCD41 (I²C) — UNO solo</b>, 'CO₂ (el gas se difunde parejo, no hace falta multi-punto)', 'cerca de la caja / cable corto', '$52.829 (Starware, ML)'],
            ['SHT31 (I²C)', 'Humedad en 1-2 puntos clave', 'pocos metros (cable corto)', '$9.311 (Candy-HO)'],
            [<b>Nodos RS485 / Modbus</b>, 'CO₂/HR en varios puntos LEJOS (fiel a Growcast)', 'cientos de m', '≈$15.000-20.000/nodo'],
            ['Extensor I²C (P82B715 / Cat5)', 'Estirar el I²C a distancias medianas', '~10-20 m', '≈$5.000-8.000 (ML)'],
            ['TCA9548A (mux I²C)', 'Varios sensores I²C iguales EN la caja', 'dentro de la caja', '≈$5.000-8.000 (ML, poco stock local)'],
            ['MLX90614 (opcional)', 'Temp de HOJA → VPD REAL', 'I²C, cable corto', '≈$20.000-30.000 (ML)'],
            [<b>ADS1115</b>, 'Sensores analógicos (EC/pH — futuro)', 'I²C', '≈$8.000-10.000 (ML)'],
          ]}
        />
        <div className="mt-3 rounded-lg bg-[#a78bfa]/[0.06] border border-[#a78bfa]/25 p-3">
          <p className="text-[12px] text-[#d4d4dd] mb-1.5"><b className="text-[#c4b5fd]">Recomendación para tu sala:</b></p>
          <ul className="space-y-1 text-[12px] text-[#d4d4dd]">
            <li>• <b>Mapa de calor</b> = grilla de <b>DS18B20 por cable</b> (temperatura en muchos puntos, todos en un cable) → hecho para esto.</li>
            <li>• <b>CO₂</b> = <b>un solo SCD41</b> (el CO₂ es uniforme en el aire; medirlo en 5 puntos da lo mismo).</li>
            <li>• <b>Humedad</b> en 1-2 puntos con SHT31 (cable corto) — o nodos RS485 si querés varios puntos lejos.</li>
            <li>• ¿Querés ser 100% fiel a Growcast (todo lejos por cable)? → <b>RS485/Modbus</b> con nodos remotos (ESPHome lo soporta).</li>
          </ul>
        </div>
      </Seccion>

      {/* Versión fiel a Growcast — RS485 */}
      <Seccion icon={Network} titulo="4b · Versión FIEL a Growcast — bus RS485 (sensores por cable, varios)" sub="La arquitectura probada de Growcast: sensor(es) remotos por cable en un bus, hasta cientos de metros">
        <pre className="text-[10.5px] font-mono bg-[#0a0a0f] border border-[#1f1f2b] rounded-lg p-3 overflow-x-auto text-[#7dd3fc] leading-relaxed">{`[ESP32 CONTROLADOR + MAX485]              [MAX485 + micro + SCD41]  ← nodo sensor 1
  relés/contactores  ── A/B/GND (par trenzado, cientos de m) ──→  [nodo sensor 2]
  (en el tablero)                                            ──→  [nodo sensor 3] ...`}</pre>
        <ul className="space-y-1 text-[12.5px] text-[#d4d4dd] mt-3">
          <li>• <b>Placa principal (controlador):</b> ESP32 + módulo <b>MAX485</b> + relés/contactores. Va en el tablero.</li>
          <li>• <b>Módulo sensor remoto (por cable):</b> un micro chico + <b>SCD41</b> (lee I²C ahí mismo, cortito) + otro <b>MAX485</b>. Este va lejos, en la sala.</li>
          <li>• <b>El bus:</b> par trenzado (UTP/Cat5) — A + B + GND — hasta cientos de metros.</li>
          <li>• <b>Varios sensores:</b> colgás varios nodos en el mismo cable, cada uno con su dirección (como Growcast). Agregás nodos sin tocar el principal.</li>
        </ul>
        <Tabla
          cols={['Componente', 'Para qué', 'Precio']}
          rows={[
            [<b>MAX485 / MAX3485 ×2+</b>, 'Convertir TTL↔RS485 (1 en controlador + 1 por nodo)', '$1.638 c/u (Candy-HO)'],
            ['Micro por nodo (ESP32/ESP8266/Nano)', 'Leer el SCD41 en el nodo remoto', '≈$10.400-13.000 (ESP32, Candy-HO)'],
            ['Par trenzado (UTP/Cat5)', 'El bus de datos', '≈$500-800/m (ML)'],
            ['Resistencias 120Ω ×2', 'Terminación del bus (en las puntas)', 'centavos'],
            ['Gabinete chico por nodo', 'Proteger el sensor remoto', '≈$4.000-8.000'],
          ]}
        />
        <div className="mt-3 rounded-lg bg-[#7dd3fc]/[0.06] border border-[#7dd3fc]/25 p-3">
          <p className="text-[12px] text-[#d4d4dd] mb-1.5"><b className="text-[#7dd3fc]">Firmware (2 opciones, las dos funcionan por cable):</b></p>
          <ul className="space-y-1 text-[12px] text-[#d4d4dd]">
            <li>• <b>Modbus (100% fiel):</b> el nodo expone el SCD41 por Modbus; el ESP32 principal lo lee con ESPHome (<span className="font-mono">modbus_controller</span>).</li>
            <li>• <b>Nodo ESPHome:</b> el nodo también corre ESPHome. Más simple de configurar.</li>
          </ul>
        </div>
        <div className="mt-3 rounded-lg bg-[#a3e635]/[0.06] border border-[#404d20] p-3">
          <p className="text-[12px] text-[#d4d4dd]"><b className="text-[#a3e635]">Para probar que funciona:</b> armá <b>UN nodo sensor + el controlador</b> por un tramo de cable y comprobá que el SCD41 remoto se lee en el principal. Si ese enlace RS485 anda, agregar los demás es enchufarlos al mismo cable.</p>
        </div>
      </Seccion>

      {/* Control avanzado */}
      <Seccion icon={Wrench} titulo="5 · Control avanzado (features tipo TrolMaster)" sub="Lo que Growcast NO tiene">
        <Tabla
          cols={['Componente', 'Función', 'Precio']}
          rows={[
            ['Emisor IR (LED IR + transistor)', 'Setearle la temperatura al mini-split AC (como el ARS-1). ESPHome climate/IR.', '≈$3.000-5.000'],
            [<b>Interruptores manuales (toggle) ×6</b>, 'Override por salida ON–AUTO–OFF: forzar cada equipo a mano si el ESP32 se cuelga o para probar. El Growcast real los tiene en el frente.', '≈$2.500-4.000 c/u (3 posiciones)'],
            ['Sonda EC + pH (opcional, v2)', 'Solución hidropónica', '≈$40.000-80.000 (ML)'],
          ]}
        />
        <p className="text-[11px] text-[#5c5c6b] mt-2">El override manual va en serie con la salida (o con un toggle de 3 posiciones ON–AUTO–OFF entre el relé/contactor y la carga). Es la seguridad de poder operar la sala aunque falle la electrónica.</p>
      </Seccion>

      {/* Riego multi-cama */}
      <Seccion icon={Droplets} titulo="5b · Riego de varias camas (fertirriego)" sub="Un subsistema propio: válvulas por cama, bomba, nivel y humedad">
        <Tabla
          cols={['Componente', 'Función', 'Nota', 'Precio']}
          rows={[
            [<b>Electroválvula (solenoide) ×cama</b>, 'Abrir/cerrar el riego de cada cama por separado', 'La tuya ya está: RPE 1" NC 220V ($96.337), relé directo. Alternativa por cama: 12/24V DC chinas', '≈$10.000-20.000 c/u (12V)'],
            ['Relé para la bomba principal', 'Presurizar el riego', 'una bomba alimenta todas las válvulas', 'incluido'],
            [<b>Nivel de tanque (flotante)</b>, 'Interlock: la bomba NO arranca en seco', 'digital, 1 pin', '≈$8.000-15.000'],
            ['Sensor humedad de sustrato ×cama (capacitivo)', 'Riego por humedad real de cada cama', 'analógico → ADS1115 (ESP32 tiene pocos ADC)', '≈$3.000-5.000 c/u'],
            ['Caudalímetro (opcional)', 'Confirmar que efectivamente regó', 'pulsos', '≈$8.000-12.000'],
            ['Bomba dosificadora (peristáltica) + EC/pH inline', 'Fertirriego automático (futuro)', 'mezcla nutrientes en línea', '≈$15.000-30.000 c/u'],
            ['Fuente 12/24V + drivers', 'Alimentar los solenoides (solo si vas a válvulas DC)', 'separada de la lógica 5V', '≈$12.000-20.000'],
          ]}
        />
        <div className="mt-3 rounded-lg bg-[#f0a35e]/[0.07] border border-[#f0a35e]/25 p-3">
          <p className="text-[12px] text-[#e0b48a]"><b>Ojo con la cantidad de salidas:</b> con varias camas se te acaban las 6 salidas → necesitás <b>expansión</b>: más relés, o <b>nodos RS485 cerca de las camas</b> que manejen sus válvulas (como los módulos expansores de Growcast). Bomba y solenoides siempre por relé/MOSFET, no al GPIO.</p>
        </div>
        <p className="text-[11px] text-[#5c5c6b] mt-2">Growcast soporta sensores de sustrato METER (TEROS 12 = humedad + temp + EC del sustrato) — la referencia si querés riego por humedad de verdad, no solo por horario.</p>
        <div className="mt-3 rounded-lg bg-[#a3e635]/[0.06] border border-[#404d20] p-3">
          <p className="text-[12px] text-[#d4d4dd] mb-1.5"><b className="text-[#a3e635]">Cómo riega Growcast (de su código): CROP STEERING, no un timer.</b> Su sección de riego tiene 3 modos:</p>
          <ul className="space-y-1 text-[12px] text-[#d4d4dd]">
            <li>• <b>Irrigation (fases P0/P1/P2):</b> <b>P0</b> = dryback inicial (deja secar al prender las luces) → <b>P1</b> = shots frecuentes para cargar a capacidad de campo (On/Off/repeticiones) → <b>P2</b> = shots de mantenimiento. Sincronizado con el fotoperiodo (isLightSync).</li>
            <li>• <b>Irrigation with sensor:</b> riega por <b>dryback</b> — define humedad objetivo (targetHumidity) y % de caída permitido; riega cuando el sustrato se secó ese %.</li>
            <li>• <b>SuperCycle:</b> ciclo simple On/Off (el «ciclador» básico).</li>
          </ul>
          <p className="text-[11px] text-[#5c5c6b] mt-2">No hay timer físico: el ciclado está dentro de cada fase (On/Off/repeticiones), corriendo on-device. En ESPHome se replica con <span className="font-mono">script</span> + <span className="font-mono">interval</span> + la lectura del sensor de humedad.</p>
        </div>
      </Seccion>

      {/* CO2 seguridad */}
      <Seccion icon={ShieldAlert} titulo="5c · CO₂ — inyección y SEGURIDAD" sub="El CO₂ mal manejado es peligroso (asfixiante) y se desperdicia. Reglas clave">
        <div className="rounded-lg bg-[#e0685c]/[0.08] border border-[#e0685c]/30 p-3 mb-3">
          <p className="text-[12px] text-[#f0a89f]"><b>🚨 Interlock obligatorio:</b> el CO₂ NUNCA se inyecta con el extractor prendido — es tirar el gas (y la plata) afuera. ESPHome lo resuelve nativo con <span className="font-mono">interlock:</span> entre los dos switches. <b>Tu caso:</b> sala SELLADA con AC, sin extractor (confirmado) → el interlock hoy no aplica; queda anotado para el día que sumes extracción. En sala sellada el CO₂ rinde al máximo: no se escapa nada.</p>
        </div>
        <Tabla
          cols={['Detalle', 'Regla']}
          rows={[
            ['Fuente de CO₂', 'Tanque + regulador + solenoide (por relé), o generador/quemador'],
            ['Circuito cerrado', 'Sala sellada + extracción solo on-demand (cuando temp/HR/CO₂ pasan umbral). Extraer continuo tira el CO₂ al pedo.'],
            ['Día/noche', 'Nada de CO₂ de noche (la planta no lo usa en oscuridad). Tu schedule ya lo hace.'],
            ['Override de alto límite', 'Si CO₂/temp se disparan → forzar extracción sí o sí (seguridad).'],
            ['Sensor de control vs seguridad', 'SCD41 a la altura del canopy (control). Para vida humana: monitor de CO₂ cerca del piso + alarma (el CO₂ se acumula abajo).'],
            ['Antes de entrar', 'Cortar CO₂, ventilar y esperar 10-15 min antes de entrar a la sala enriquecida.'],
          ]}
        />
      </Seccion>

      {/* Misceláneos */}
      <Seccion icon={Boxes} titulo="6 · Misceláneos necesarios" sub="Lo chico que hace falta sí o sí">
        <Tabla
          cols={['Componente', 'Función', 'Precio']}
          rows={[
            [<b>RTC DS3231</b>, 'Reloj para automatizaciones por horario OFFLINE (Growcast usa uno)', '$4.883 (Candy-HO)'],
            ['Resistencias 4.7kΩ', 'Pull-ups del bus DS18B20 (1-Wire) e I²C', 'centavos'],
            ['Conectores JST / borneras', 'Enchufar sensores sin soldar', '≈$4.000-6.000'],
            ['Cable apantallado / UTP CAT5', 'Tirar sensores lejos sin ruido (I²C sensible)', '≈$500-800/m'],
            ['Buzzer + LEDs de estado', 'Alarma sonora + señalización local', '≈$1.500-3.000'],
            [<b>Capacitor 1000µF (electrolítico)</b>, 'Entre 5V y GND al lado del ESP32: los picos de TX del WiFi provocan brownout/reseteos con fuentes flojas', '≈$1.000'],
            ['Snubber RC / varistor', 'En las BOBINAS de contactores y cargas inductivas: el kickback de la bobina suelda los contactos del relé chico (falla más reportada en foros)', '≈$3.000-5.000 c/u'],
            ['Protoboard / perfboard (o PCB)', 'Montaje prolijo', '≈$5.000-10.000'],
            [<b>Sensor de fuga de agua</b>, 'Detectar inundación (riego/tanque) → alarma + corte de bomba', '≈$4.000-7.000'],
            ['Detector de humo (opcional)', 'Seguridad — alarma ante incendio (Growcast/TrolMaster lo tienen)', '≈$8.000-15.000'],
          ]}
        />
      </Seccion>

      {/* Presupuesto */}
      <Seccion icon={Wallet} titulo="Presupuesto estimado (ARS jul 2026)" sub="Contra TrolMaster ≈US$600-1000 o Growcast equipo + suscripción. Fuentes: Candy-HO + MercadoLibre">
        <Tabla
          cols={['Bloque', 'Qué incluye', 'Total ARS']}
          rows={[
            ['Electrónica (lógica)', 'ESP32 + placa 8 relés + fuente 5V + SCD41 + RTC + capacitor + misceláneos', '≈$110.000-150.000'],
            ['Tablero de potencia', '6 contactores + térmica 63A + disyuntor dif. 30mA + breakers + gabinete + borneras/cable (lo compra/instala el matriculado)', '≈$280.000-400.000'],
            ['+ Multipunto / mapa de calor', 'DS18B20 ×9 + SHT31 ×2 + TCA9548A/extensor', '≈$60.000-90.000'],
            ['+ Fino', 'IR para el AC + MLX90614 (VPD hoja) + toggles override + ADS1115', '≈$40.000-70.000'],
            [<b>Completa</b>, 'todo lo anterior (sin cámara térmica ni EC/pH)', <b className="text-[#d9f99d]">≈$490.000-710.000</b>],
          ]}
        />
        <p className="text-[11px] text-[#5c5c6b] mt-2">La electrónica sola (lo que reemplaza al cerebro de Growcast) es ~$110-150 mil. El grueso es el tablero de potencia — que con CUALQUIER controlador (Growcast, TrolMaster o este) lo necesitás igual: no es costo del clon, es costo de tener 13,8 kW instalados de forma segura.</p>
      </Seccion>

      {/* Software / próximos pasos */}
      <Seccion icon={FileCode} titulo="Software — ESPHome" sub="El firmware ya hecho, gratis y editable (reemplaza el de Growcast)">
        <p className="text-[12.5px] text-[#d4d4dd] leading-relaxed mb-2">
          En vez de escribir firmware desde cero, usás <b className="text-[#a3e635]">ESPHome</b>: definís sensores y reglas en un archivo YAML simple, corre on-device, y se integra con Home Assistant y growflow. Ejemplo de una regla de ambiente:
        </p>
        <pre className="text-[11px] font-mono bg-[#0a0a0f] border border-[#1f1f2b] rounded-lg p-3 overflow-x-auto text-[#a3e635]">{`sensor:
  - platform: scd4x        # CO2 + temp + humedad (1 chip)
    co2:  { name: "CO2 sala" }
    temperature: { name: "Temp sala" }
    humidity: { name: "HR sala" }

switch:
  - platform: gpio
    pin: GPIO23
    id: rele_ac

# Si la temp pasa de 24° → prende el AC (bang-bang con anti-rebote)
climate: ...`}</pre>
        <div className="mt-3 flex items-start gap-2 text-[12px] text-[#d4d4dd]">
          <ChevronRight className="w-4 h-4 text-[#a3e635] mt-0.5 flex-shrink-0" />
          <span>Próximo paso: el <b>esquema de conexión</b> (pines del ESP32 ↔ sensores/relés/RTC) y el <b>diagrama del tablero 220V</b> con los contactores.</span>
        </div>
      </Seccion>

      {/* Herramientas y consumibles */}
      <Seccion icon={Hammer} titulo="7 · Herramientas y consumibles" sub="No van soldados, pero los necesitás para armarlo">
        <Tabla
          cols={['Ítem', 'Para qué']}
          rows={[
            ['Soldador + estaño + flux', 'Uniones firmes en el protoboard/PCB'],
            [<b>Multímetro</b>, 'Probar continuidad, tensión y tierra ANTES de energizar (imprescindible)'],
            ['Pinza pela-cables + crimpadora de ferrules', 'Terminales tubulares para borneras'],
            ['Termocontraíble + pistola de calor/encendedor', 'Aislar uniones'],
            ['Cables Dupont (M-M y M-H)', 'Conexiones del protoboard'],
            ['Destornilladores, precintos, cinta, rotulador', 'Montaje y rotulado'],
          ]}
        />
      </Seccion>

      {/* Host plataforma visual */}
      <Seccion icon={Monitor} titulo="8 · «Cerebro visual» (opcional)" sub="Para el dashboard tipo app de Growcast, offline">
        <p className="text-[12.5px] text-[#d4d4dd] leading-relaxed mb-2">
          El ESP32 corre las automatizaciones <b>solo</b> — no necesita nada más. Esto es solo si querés el <b>panel visual local</b> (dashboard + histórico + control desde el celu), que es el equivalente a la nube/app de Growcast.
        </p>
        <Tabla
          cols={['Opción', 'Corre', 'Precio']}
          rows={[
            ['Raspberry Pi 4 + microSD', 'Home Assistant (dashboard, histórico, app)', 'USD 40-60'],
            ['PC vieja / mini-PC siempre encendida', 'Home Assistant', 'lo que tengas'],
            [<b>growflow (nube)</b>, 'Tu UI + trazabilidad — ya la tenés', '$0'],
          ]}
        />
        <p className="text-[11px] text-[#5c5c6b] mt-2">Recomendación: arrancá sin Pi (ESP32 + growflow). Sumá Home Assistant en una Pi si después querés el panel local completo.</p>
      </Seccion>

      {/* Ensamblaje paso a paso */}
      <Seccion icon={ListChecks} titulo="Ensamblaje paso a paso" sub="⚠️ Regla de oro: probá SIEMPRE la lógica primero, las cargas de 220V después">
        <div className="space-y-3">
          {[
            { f: 'Fase 1 — Banco de pruebas (sin 220V)', pasos: [
              'Flasheá el ESP32 con ESPHome por USB. Verificá que prende y se conecta al WiFi.',
              'Armá los sensores en protoboard (SCD41 + RTC en I²C, DS18B20 en su bus, TCA9548A si va). Corré un I²C scan: SCD41=0x62, RTC=0x68, mux=0x70.',
              'Probá cada sensor en ESPHome. Calibrá el SCD41 (offset de temperatura + FRC de CO₂).',
            ]},
            { f: 'Fase 2 — Tablero de baja tensión', pasos: [
              'Montá en el gabinete: ESP32, placa de relés, RTC, borneras de sensores (todo 5V/3.3V).',
              'Probá que cada relé CLICKEA desde ESPHome, todavía SIN cargas conectadas.',
            ]},
            { f: 'Fase 3 — Lado 220V (⚠️ con la llave general BAJA)', pasos: [
              'Entrada de red → térmica → fuente 5V + bobinas de los contactores.',
              'Los relés manejan las bobinas de los contactores (AC y cargas grandes) o directo las cargas chicas. Puesta a tierra del gabinete.',
              'Con el multímetro: chequeá continuidad, que no haya cortos y la tierra. Energizá PRIMERO la lógica (sin cargas), después conectá cada equipo de a uno y probá.',
            ]},
            { f: 'Fase 4 — Instalación en la sala', pasos: [
              'Repartí los sensores (grilla DS18B20 + SHT31 para el mapa de calor). Apuntá el IR al mini-split.',
              'Cargá las automatizaciones (luces por horario, AC por temp, CO₂ a pulsos). Conectá a growflow / Home Assistant.',
            ]},
          ].map((fase, i) => (
            <div key={i} className="rounded-lg bg-[#101016] border border-[#1f1f2b] p-3">
              <p className="font-display font-semibold text-[12px] text-[#d9f99d] mb-2">{fase.f}</p>
              <ol className="space-y-1.5">
                {fase.pasos.map((p, j) => (
                  <li key={j} className="flex gap-2 text-[12px] text-[#d4d4dd]">
                    <span className="flex-shrink-0 w-4 h-4 rounded bg-[#a3e635]/15 text-[#a3e635] text-[10px] font-bold flex items-center justify-center mt-px">{j + 1}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Seccion>

      {/* Diagramas visuales */}
      <Seccion icon={Boxes} titulo="Diagramas para armarlo (visual)" sub="La idea en dibujos: cómo prende una carga y cómo se ordena el tablero por dentro">

        {/* Fig 1 — cadena de control */}
        <p className="text-[11.5px] text-[#a6a6b5] mb-1 font-semibold">1 · La cadena de control — cómo el ESP32 prende un equipo de 220V</p>
        <div className="overflow-x-auto rounded-lg bg-[#0a0a0f] border border-[#1f1f2b] p-3 mb-1">
          <svg viewBox="0 0 920 210" className="w-full min-w-[660px]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <marker id="arA" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#8f8f9f" /></marker>
            </defs>
            {/* boxes */}
            <rect x="30" y="46" width="160" height="70" rx="8" fill="#15151d" stroke="#7dd3fc" strokeWidth="1.5" />
            <text x="110" y="78" textAnchor="middle" fill="#7dd3fc" fontSize="15" fontWeight="bold">ESP32</text>
            <text x="110" y="98" textAnchor="middle" fill="#8f8f9f" fontSize="10">el cerebro (lógica)</text>

            <rect x="270" y="46" width="160" height="70" rx="8" fill="#15151d" stroke="#a3e635" strokeWidth="1.5" />
            <text x="350" y="78" textAnchor="middle" fill="#a3e635" fontSize="14" fontWeight="bold">Placa de relés</text>
            <text x="350" y="98" textAnchor="middle" fill="#8f8f9f" fontSize="10">8 canales, 5V</text>

            <rect x="510" y="46" width="160" height="70" rx="8" fill="#15151d" stroke="#f0a35e" strokeWidth="1.5" />
            <text x="590" y="78" textAnchor="middle" fill="#f0a35e" fontSize="14" fontWeight="bold">Contactor</text>
            <text x="590" y="98" textAnchor="middle" fill="#8f8f9f" fontSize="10">maneja la potencia</text>

            <rect x="750" y="46" width="150" height="70" rx="8" fill="#15151d" stroke="#e0685c" strokeWidth="1.5" />
            <text x="825" y="78" textAnchor="middle" fill="#e0685c" fontSize="14" fontWeight="bold">Carga 220V</text>
            <text x="825" y="98" textAnchor="middle" fill="#8f8f9f" fontSize="10">AC · luz · bomba</text>

            {/* arrows */}
            <line x1="190" y1="81" x2="266" y2="81" stroke="#8f8f9f" strokeWidth="1.5" markerEnd="url(#arA)" />
            <text x="228" y="73" textAnchor="middle" fill="#a6a6b5" fontSize="9">señal 3.3V</text>
            <line x1="430" y1="81" x2="506" y2="81" stroke="#8f8f9f" strokeWidth="1.5" markerEnd="url(#arA)" />
            <text x="468" y="73" textAnchor="middle" fill="#a6a6b5" fontSize="9">cierra bobina</text>
            <line x1="670" y1="81" x2="746" y2="81" stroke="#8f8f9f" strokeWidth="1.5" markerEnd="url(#arA)" />
            <text x="708" y="73" textAnchor="middle" fill="#a6a6b5" fontSize="9">pasa 220V</text>

            {/* brackets */}
            <line x1="30" y1="140" x2="430" y2="140" stroke="#a3e635" strokeWidth="1.5" />
            <text x="230" y="162" textAnchor="middle" fill="#a3e635" fontSize="11" fontWeight="bold">① LADO LÓGICO — bajo voltaje, seguro, lo armás vos</text>
            <line x1="510" y1="140" x2="900" y2="140" stroke="#e0685c" strokeWidth="1.5" />
            <text x="705" y="162" textAnchor="middle" fill="#e0685c" fontSize="11" fontWeight="bold">② LADO POTENCIA — 220V, lo hace un matriculado</text>
          </svg>
        </div>
        <p className="text-[11px] text-[#5c5c6b] mb-4">El relé chico (que dispara el ESP32) <b>solo cierra la bobina</b> del contactor. La corriente pesada (AC, luces, bomba) pasa por el <b>contactor</b>, nunca por el relé. Así el ESP32 nunca ve los 220V.</p>

        {/* Fig 2 — tablero por dentro */}
        <p className="text-[11.5px] text-[#a6a6b5] mb-1 font-semibold">2 · El tablero por dentro — cómo ordenar el gabinete</p>
        <div className="overflow-x-auto rounded-lg bg-[#0a0a0f] border border-[#1f1f2b] p-3 mb-1">
          <svg viewBox="0 0 740 560" className="w-full min-w-[560px]" xmlns="http://www.w3.org/2000/svg">
            {/* gabinete */}
            <rect x="8" y="8" width="724" height="544" rx="12" fill="#0d0d13" stroke="#5c5c6b" strokeWidth="1.5" />
            <text x="370" y="30" textAnchor="middle" fill="#d4d4dd" fontSize="12" fontWeight="bold">GABINETE / TABLERO (caja IP65 con tapa)</text>

            {/* riel 1 breakers */}
            <rect x="26" y="44" width="688" height="86" rx="8" fill="#101016" stroke="#7dd3fc" strokeWidth="1.2" />
            <text x="38" y="62" fill="#7dd3fc" fontSize="10" fontWeight="bold">Riel DIN 1 · Térmica general 63A + disyuntor dif. 30mA + breaker por grupo</text>
            {['63A','30mA','C32','C16','C16','C10','C10','C10'].map((b, i) => (
              <g key={i}>
                <rect x={40 + i * 84} y="76" width="74" height="42" rx="4" fill="#15151d" stroke="#3a4a55" strokeWidth="1" />
                <text x={77 + i * 84} y="93" textAnchor="middle" fill="#d4d4dd" fontSize="11" fontWeight="bold">{b}</text>
                <text x={77 + i * 84} y="109" textAnchor="middle" fill="#5c5c6b" fontSize="8">{['GRAL','DIF','AC','Luz1','Luz2','Deshu','Vent','Bomba'][i]}</text>
              </g>
            ))}

            {/* zona logica */}
            <rect x="26" y="146" width="340" height="150" rx="8" fill="#101016" stroke="#a3e635" strokeWidth="1.2" />
            <text x="38" y="164" fill="#a3e635" fontSize="10" fontWeight="bold">Zona lógica (bajo voltaje)</text>
            <rect x="42" y="176" width="150" height="44" rx="4" fill="#15151d" stroke="#3a4a55" /><text x="117" y="203" textAnchor="middle" fill="#d4d4dd" fontSize="11">Fuente 5V</text>
            <rect x="204" y="176" width="148" height="44" rx="4" fill="#15151d" stroke="#7dd3fc" /><text x="278" y="203" textAnchor="middle" fill="#7dd3fc" fontSize="11" fontWeight="bold">ESP32</text>
            <rect x="42" y="232" width="310" height="50" rx="4" fill="#15151d" stroke="#a3e635" /><text x="197" y="262" textAnchor="middle" fill="#a3e635" fontSize="11" fontWeight="bold">Placa de 8 relés (activa en LOW)</text>

            {/* zona sensores */}
            <rect x="374" y="146" width="340" height="150" rx="8" fill="#101016" stroke="#a78bfa" strokeWidth="1.2" />
            <text x="386" y="164" fill="#a78bfa" fontSize="10" fontWeight="bold">Zona sensores (I²C / 1-Wire)</text>
            {[['SCD41 — CO₂ / temp / HR','0x62'],['RTC DS3231 — reloj','0x68'],['TCA9548A — hub I²C','0x70'],['DS18B20 ×9 — temp por cable','1-Wire']].map((s, i) => (
              <g key={i}>
                <rect x="386" y={176 + i * 28} width="316" height="24" rx="4" fill="#15151d" stroke="#3a3550" />
                <text x="396" y={192 + i * 28} fill="#c4c4d0" fontSize="10">{s[0]}</text>
                <text x="694" y={192 + i * 28} textAnchor="end" fill="#6b6b7b" fontSize="9">{s[1]}</text>
              </g>
            ))}

            {/* riel contactores */}
            <rect x="26" y="312" width="688" height="110" rx="8" fill="#101016" stroke="#f0a35e" strokeWidth="1.2" />
            <text x="38" y="330" fill="#f0a35e" fontSize="10" fontWeight="bold">Riel DIN 2 · Contactores (potencia 220V)</text>
            {[['AC','40A'],['Luz1','25A'],['Luz2','25A'],['Deshu','16A'],['Vent','16A'],['Bomba','16A']].map((c, i) => (
              <g key={i}>
                <rect x={40 + i * 112} y="344" width="102" height="60" rx="4" fill="#1a1510" stroke="#7a5a30" />
                <text x={91 + i * 112} y="372" textAnchor="middle" fill="#f0a35e" fontSize="12" fontWeight="bold">{c[0]}</text>
                <text x={91 + i * 112} y="390" textAnchor="middle" fill="#8f8f9f" fontSize="10">{c[1]}</text>
              </g>
            ))}

            {/* bornera */}
            <rect x="26" y="438" width="688" height="52" rx="8" fill="#101016" stroke="#d4d4dd" strokeWidth="1.2" />
            <text x="370" y="460" textAnchor="middle" fill="#d4d4dd" fontSize="11" fontWeight="bold">Bornera de conexión + barra de TIERRA (PE)</text>
            <text x="370" y="477" textAnchor="middle" fill="#6b6b7b" fontSize="9">todo el chasis y el gabinete van a tierra</text>

            <text x="370" y="518" textAnchor="middle" fill="#e0b48a" fontSize="10">⚡ Regla: la zona lógica (5V, verde) separada de la potencia (220V, naranja). No cruces los cables.</text>
            <text x="370" y="536" textAnchor="middle" fill="#6b6b7b" fontSize="9">Electroválvula riego y CO₂ salen directo de 2 relés (no llevan contactor, son &lt;1A).</text>
          </svg>
        </div>
        <p className="text-[11px] text-[#5c5c6b] mb-1">De arriba a abajo: <b className="text-[#7dd3fc]">breakers</b> → <b className="text-[#a3e635]">lógica (ESP32 + relés)</b> y <b className="text-[#a78bfa]">sensores</b> → <b className="text-[#f0a35e]">contactores</b> → <b>bornera + tierra</b>. Cada relé de la placa verde cierra la bobina del contactor naranja de abajo.</p>
      </Seccion>

      {/* Esquema de conexión */}
      <Seccion icon={Cable} titulo="Esquema de conexión (pinout + tablero)" sub="Pines elegidos evitando los conflictivos del ESP32 (flash 6-11, strapping 0/2/12/15, solo-entrada 34-39)">
        <p className="text-[11.5px] text-[#a6a6b5] mb-2 font-semibold">Mapa de pines del ESP32</p>
        <Tabla
          cols={['GPIO', 'Va a', 'Notas']}
          rows={[
            ['21 / 22', 'Bus I²C (SDA / SCL)', 'SCD41 (0x62), RTC DS3231 (0x68), TCA9548A (0x70)'],
            ['4', 'Bus 1-Wire (DS18B20 ×9)', 'resistencia pull-up 4.7kΩ a 3.3V'],
            ['14', 'Emisor IR (AC)', 'remote_transmitter'],
            ['13', 'Relé K1 → Contactor AC (40A)', 'activa en LOW (inverted)'],
            ['18', 'Relé K2 → Contactor Luces grupo 1 (propias, 25A)', 'escalonar 1-2s'],
            ['19', 'Relé K3 → Contactor Luces grupo 2 (prestadas, 25A)', 'escalonar 1-2s'],
            ['23', 'Relé K4 → Contactor Deshumidificador (16A)', ''],
            ['25', 'Relé K5 → Contactor Ventiladores ×2 (16A)', ''],
            ['26', 'Relé K6 → Contactor Bomba de riego (16A)', 'interlock flotante'],
            ['27', 'Relé K7 → Electroválvula riego 220V', 'directo (solenoide <1A)'],
            ['32', 'Relé K8 → CO₂ solenoide 220V', 'directo · interlock extractor'],
            ['5V / GND', 'Alimentación ESP32 + placa relés', 'desde la fuente 5V'],
          ]}
        />
        <p className="text-[11px] text-[#5c5c6b] mt-2">Todos los pines de relé son salidas seguras (no strapping, no solo-entrada). La placa de relés es activa en LOW → en ESPHome van con <span className="font-mono">inverted: true</span> y <span className="font-mono">restore_mode: ALWAYS_OFF</span>.</p>
        <div className="mt-2 rounded-lg bg-[#f0a35e]/[0.07] border border-[#f0a35e]/25 p-2.5">
          <p className="text-[11px] text-[#e0b48a] font-semibold mb-1.5">Recomendaciones de la comunidad (foros HA / Random Nerd / DroneBot) — y el porqué:</p>
          <ul className="space-y-1 text-[11px] text-[#e0b48a]">
            <li>• <b>Jumper JD-VCC afuera</b>: bobinas de relé a los 5V de la fuente, lógica al 3.3V del ESP32 → el opto aísla de verdad y los picos de conmutación no resetean el micro (ver sección 1).</li>
            <li>• <b>Verificá trigger 3.3V</b>: que el módulo dispare con 3.3V (marcado «3.3V compatible»); si no, level shifter o cambiar R del opto (1kΩ→220Ω).</li>
            <li>• <b>Derate 50%</b>: un relé «10A» no lo corras a 10A continuo — por eso todo lo grande va por contactor.</li>
            <li>• <b>DS18B20 en modo alimentado (3 cables), NO parásito</b>: con 9 sondas y metros de cable el modo parásito (2 cables) se vuelve inestable; llevá VCC+GND+DATA y el pull-up de 4.7kΩ (bajalo a 2.2kΩ si el bus es muy largo).</li>
            <li>• <b>Capacitor 1000µF en los 5V del ESP32</b>: el pico de corriente del TX WiFi causa brownout/reseteos aleatorios con fuentes justas — el clásico «se reinicia cada tanto y no sé por qué».</li>
            <li>• <b>Señales 3.3V lejos de los 220V</b>: bandeja/canal separado dentro del gabinete; sensores por cable apantallado o UTP.</li>
          </ul>
        </div>

        <p className="text-[11.5px] text-[#a6a6b5] mt-4 mb-2 font-semibold">Tablero 220V (⚠️ con la llave general BAJA)</p>
        <pre className="text-[10.5px] font-mono bg-[#0a0a0f] border border-[#1f1f2b] rounded-lg p-3 overflow-x-auto text-[#d4a89f] leading-relaxed">{`RED 220V MONOFÁSICA ── [Térmica gral 63A + Disyuntor] ──┬── [Fuente 5V] → ESP32 + placa relés
                                                        │
                                                        ├── Fase (L) ──┐
                                                        └── Neutro (N) ─┼──────────┐
                                                                        │          │
Relé K1 (13) → bobina [CONTACTOR AC 40A] ───────────────────────→ Fase→ ❄️AC ←N
Relé K2 (18) → bobina [CONTACTOR Luces1 25A] ───────────────────→ 💡Luces propias
Relé K3 (19) → bobina [CONTACTOR Luces2 25A] ───────────────────→ 💡Luces prestadas
Relé K4 (23) → bobina [CONTACTOR Deshumi 16A] ──────────────────→ 💧Deshumidificador
Relé K5 (25) → bobina [CONTACTOR Vent 16A] ─────────────────────→ 🌀Ventiladores ×2
Relé K6 (26) → bobina [CONTACTOR Bomba 16A] ────────────────────→ 🚰Bomba riego
Relé K7 (27) → directo (220V, <1A) ─────────────────────────────→ 🚿Electroválvula riego
Relé K8 (32) → directo (220V, <1A) ─────────────────────────────→ 🫧CO₂ solenoide

TIERRA (PE) ── gabinete + chasis de cada equipo
Snubber/varistor en paralelo a las cargas inductivas (AC, bomba)`}</pre>
        <p className="text-[11px] text-[#5c5c6b] mt-2">El relé chico solo cierra la <b>bobina</b> del contactor; la potencia (29A del AC) pasa por el contactor. Multímetro ANTES de energizar: continuidad, sin cortos, tierra OK.</p>
      </Seccion>

      {/* ESPHome completo */}
      <Seccion icon={FileCode} titulo="Configuración ESPHome completa" sub="Lista para flashear. Ajustá WiFi, addresses de DS18B20 y la marca del AC.">
        <pre className="text-[10.5px] font-mono bg-[#0a0a0f] border border-[#1f1f2b] rounded-lg p-3 overflow-x-auto text-[#a3e635] leading-relaxed">{`esphome:
  name: growcast-diy

esp32:
  board: esp32dev
  framework: { type: arduino }

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password
  ap:                       # hotspot de emergencia: si se cae tu WiFi,
    ssid: "GrowcastDIY"     # el ESP32 levanta su propia red para entrar
captive_portal:
logger:
api:
  reboot_timeout: 0s   # ¡CLAVE! Sin esto, si no hay Home Assistant
                       # conectado el ESP32 SE REINICIA SOLO cada 15 min
                       # (default de ESPHome pensado para HA, no standalone)
ota:
  - platform: esphome

# ---------- Buses ----------
i2c:
  sda: GPIO21
  scl: GPIO22
  scan: true
  frequency: 50kHz

one_wire:
  - platform: gpio
    pin: GPIO4

# ---------- Reloj (horarios offline) ----------
time:
  - platform: ds1307      # el driver ds1307 sirve para el DS3231
    id: reloj
  - platform: sntp        # sincroniza cuando hay internet

# ---------- Sensores ----------
sensor:
  - platform: scd4x
    co2: { name: "CO2", id: co2 }
    temperature: { name: "Temp aire", id: temp_aire }
    humidity: { name: "Humedad", id: hr_aire }
    update_interval: 30s
    temperature_offset: 4.0     # corregir auto-calentamiento (calibrar)
    altitude_compensation: 25m
    automatic_self_calibration: false   # enriquecés CO2 → calibrar manual (FRC)

  # DS18B20 de la grilla (una entrada por cada address del scan)
  - platform: dallas_temp
    address: 0x1c00000000000028   # ← reemplazar por el real de cada sonda
    name: "Temp punto 1"
  # ... repetir por cada DS18B20 con su address

  # VPD real calculado
  - platform: template
    name: "VPD"
    unit_of_measurement: "kPa"
    update_interval: 30s
    lambda: |-
      float t = id(temp_aire).state;
      float rh = id(hr_aire).state;
      float svp = 0.6108 * expf(17.27 * t / (t + 237.3));
      return svp * (1.0 - rh / 100.0);

# ---------- Salidas (relés activos en LOW) ----------
# MISMO ORDEN QUE EL PINOUT DE ARRIBA: K1..K8.
# restore_mode ALWAYS_OFF = tras un corte de luz TODO arranca apagado
# hasta que la lógica decida (nunca una carga "pegada" al volver la luz).
switch:
  - platform: gpio          # K1
    pin: GPIO13
    name: "Aire acondicionado"
    id: rele_ac
    inverted: true
    restore_mode: ALWAYS_OFF
  - platform: gpio          # K2
    pin: GPIO18
    name: "Luces grupo 1 (propias)"
    id: rele_luces_1
    inverted: true
    restore_mode: ALWAYS_OFF
  - platform: gpio          # K3
    pin: GPIO19
    name: "Luces grupo 2 (prestadas)"
    id: rele_luces_2
    inverted: true
    restore_mode: ALWAYS_OFF
  - platform: gpio          # K4
    pin: GPIO23
    name: "Deshumidificador"
    id: rele_deshumi
    inverted: true
    restore_mode: ALWAYS_OFF
  - platform: gpio          # K5
    pin: GPIO25
    name: "Ventiladores"
    id: rele_vent
    inverted: true
    restore_mode: ALWAYS_OFF
  - platform: gpio          # K6
    pin: GPIO26
    name: "Bomba de riego"
    id: rele_bomba
    inverted: true
    restore_mode: ALWAYS_OFF
  - platform: gpio          # K7
    pin: GPIO27
    name: "Electrovalvula riego"
    id: rele_valvula
    inverted: true
    restore_mode: ALWAYS_OFF
  - platform: gpio          # K8
    pin: GPIO32
    name: "Inyeccion CO2"
    id: rele_co2
    inverted: true
    restore_mode: ALWAYS_OFF
    # interlock: [rele_extractor]   # si sumás extractor: ESPHome tiene
    # interlock NATIVO — CO2 y extracción jamás prendidos a la vez

# Luces escalonadas (anti-inrush): grupo 1, y 2 seg después el grupo 2.
# Los 12 drivers LED prendiendo juntos clavan un pico que suelda contactos.
script:
  - id: prender_luces
    then:
      - switch.turn_on: rele_luces_1
      - delay: 2s
      - switch.turn_on: rele_luces_2
  - id: apagar_luces
    then:
      - switch.turn_off: rele_luces_1
      - switch.turn_off: rele_luces_2

# ---------- AC por infrarrojo ----------
remote_transmitter:
  pin: GPIO14
  carrier_duty_percent: 50%
climate:
  - platform: coolix      # ← cambiar por la marca de tu mini-split
    name: "AC (IR)"

# ---------- Ejemplos de automatización on-device ----------
# Luces 7:00 ON / 3:00 OFF (script.execute: prender_luces), AC si
# Temp > 24° — con 'on_time:' (time) y 'on_value_range:' (sensor).`}</pre>
        <p className="text-[11px] text-[#5c5c6b] mt-2">⚠️ La sintaxis de ESPHome evoluciona (ej. <span className="font-mono">one_wire</span>/<span className="font-mono">dallas_temp</span>). Validá con <span className="font-mono">esphome config</span> antes de flashear. Los <span className="font-mono">address</span> de los DS18B20 salen del log del primer arranque (I²C/1-Wire scan).</p>
        <div className="mt-2 rounded-lg bg-[#7dd3fc]/[0.06] border border-[#7dd3fc]/25 p-2.5">
          <p className="text-[11px] text-[#d4d4dd]"><b className="text-[#7dd3fc]">Por qué cada línea rara:</b> <span className="font-mono">reboot_timeout: 0s</span> — el default de ESPHome reinicia el ESP32 si pasa 15 min sin cliente API conectado (está pensado para vivir pegado a Home Assistant); acá corre solo, así que se apaga esa lógica. <span className="font-mono">ap:</span> + <span className="font-mono">captive_portal:</span> — si tu WiFi muere, el ESP32 levanta su propia red y entrás igual, sin escalera ni reflasheo. <span className="font-mono">restore_mode: ALWAYS_OFF</span> — después de un corte de luz nada arranca solo; la automatización re-evalúa y prende lo que corresponda.</p>
        </div>
      </Seccion>

      {/* Otros builds de la comunidad */}
      <Seccion icon={Users} titulo="Otros diseños de usuarios (foros) + validación" sub="Builds reales, de hobby a pro — y cómo se compara este diseño">
        <Tabla
          cols={['Proyecto', 'Qué usa', 'Nivel']}
          rows={[
            ['Build Overgrow (usuario)', 'ESP32 WROOM-32D + SHT31 + 2 relés (SK4412) + OLED. Sin CO₂.', 'Hobby'],
            ['Minigrowl (GitHub)', 'ESP32 WiFi+LoRa + BME280 + DHT22 + 4 relés (luces/extract/intract/heater) + OLED + NTP', 'Hobby'],
            ['HAGR (GitHub) ⭐', 'ESPHome + HA. VPD aire Y hoja (MLX90614), CO₂ día/noche, crop steering 4 fases, dosif. tanque', 'Pro'],
            ['OpenGrowBox (GitHub) ⭐', 'HA, salas ilimitadas, offline, VPD/CO₂/luces/riego, ESPHome/Tasmota/MQTT', 'Pro'],
            ['Mycodo / Growduino', 'Mycodo = controlador ambiental en Raspberry Pi (Python); Growduino = base Arduino', 'Establecido'],
          ]}
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse min-w-[520px]">
            <thead><tr>{['', 'Hobby típico', 'Pro (HAGR/OGB)', 'Tu diseño'].map((c, i) => <th key={i} className={th}>{c}</th>)}</tr></thead>
            <tbody>
              {[
                ['CO₂', 'casi ninguno', 'SCD30/41', 'SCD41 ✓'],
                ['Salidas 220V', '2-4 relés directos', 'relés', '6 + contactores ✓'],
                ['VPD', 'por aire (algunos)', 'aire + hoja', 'aire + hoja ✓'],
                ['Mapa de calor', '❌', 'raro', 'DS18B20 + TCA9548A ✓'],
                ['Override manual', '❌', '❌', '✓ (del Growcast real)'],
              ].map((r, i) => (
                <tr key={i}>
                  <td className={td + ' font-semibold text-[#a6a6b5]'}>{r[0]}</td>
                  <td className={td}>{r[1]}</td>
                  <td className={td}>{r[2]}</td>
                  <td className={td + ' text-[#d9f99d]'}>{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 rounded-lg bg-[#7dd3fc]/[0.06] border border-[#7dd3fc]/25 p-3">
          <p className="text-[12px] text-[#d4d4dd]"><b className="text-[#7dd3fc]">Conclusión:</b> este diseño está por encima del build hobby promedio (ESP32 + 1 sensor + 2 relés directos) y a la altura de los pro (HAGR/OpenGrowBox), con dos cosas que casi nadie tiene: <b>contactores de verdad para 220V</b> y <b>mapa de calor multipunto</b>. Validado por firmware + foros + el Growcast físico real.</p>
        </div>
      </Seccion>

      {/* Plan por fases / recomendación */}
      <Seccion icon={Rocket} titulo="Plan recomendado — arrancá chico, crecé por capas" sub="No armes el monstruo completo de una: fasealo">
        <div className="space-y-3">
          {[
            { v: 'v1 — Réplica de tu sala (empezá acá)', c: '#a3e635', items: [
              'SCD41 + 6 salidas (relés + contactor para el AC) + tus 3 automatizaciones actuales (luces, AC, CO₂).',
              'Objetivo: cortar con Growcast sin perder nada. Piso funcional.',
            ]},
            { v: 'v2 — Multipunto / mapa de calor', c: '#7dd3fc', items: [
              'Grilla DS18B20 + TCA9548A + SHT31. Acá le pasás el trapo a Growcast y TrolMaster.',
            ]},
            { v: 'v3 — Fino', c: '#a78bfa', items: [
              'VPD de hoja (MLX90614) + IR para el AC + override manual + (futuro) EC/pH con ADS1115.',
            ]},
          ].map((f, i) => (
            <div key={i} className="rounded-lg bg-[#101016] border border-[#1f1f2b] p-3">
              <p className="font-display font-semibold text-[12px] mb-1.5" style={{ color: f.c }}>{f.v}</p>
              <ul className="space-y-1">
                {f.items.map((it, j) => <li key={j} className="text-[12px] text-[#d4d4dd] pl-2">• {it}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg bg-[#f0a35e]/[0.07] border border-[#f0a35e]/25 p-3">
          <p className="text-[12px] text-[#e0b48a] font-semibold mb-1">Método (importante):</p>
          <ul className="space-y-1 text-[12px] text-[#d4d4dd]">
            <li>• <b>Prototipá en el banco ANTES de tocar 220V</b> — ESP32 + SCD41 en protoboard por USB, leyendo en ESPHome.</li>
            <li>• <b>Comprá en 2 tandas:</b> primero lo barato/seguro (ESP32, SCD41, DS18B20, RTC, TCA9548A); el tablero de potencia (contactores, disyuntor, gabinete) cuando la lógica ya ande.</li>
            <li>• <b>Dejá tu Growcast puesto</b> hasta que el clon corra un ciclo entero. No lo saques antes.</li>
          </ul>
        </div>
        <div className="mt-3 rounded-lg bg-[#a3e635]/[0.06] border border-[#404d20] p-3">
          <p className="text-[12px] text-[#d4d4dd]"><b className="text-[#a3e635]">Estrategia software:</b> Firmware = ESPHome (no escribir propio). Automatizaciones = robarle a HAGR la lógica de VPD/CO₂ (ya probada). Plataforma visual = Home Assistant + OpenGrowBox (gratis, tu «app de Growcast») + growflow (trazabilidad + IA).</p>
        </div>
      </Seccion>

      {/* Cómo se prende y apaga — fácil */}
      <Seccion icon={ToggleLeft} titulo="Cómo prende y apaga cada cosa (fácil)" sub="El relé es como un interruptor de luz que el ESP32 aprieta solo">
        <p className="text-[12.5px] text-[#d4d4dd] mb-2">Cada salida es un «switch» en ESPHome. <b>Prender = el relé cierra = el equipo recibe corriente.</b> Se controla de 4 formas:</p>
        <pre className="text-[10.5px] font-mono bg-[#0a0a0f] border border-[#1f1f2b] rounded-lg p-3 overflow-x-auto text-[#a3e635] leading-relaxed">{`# 1) Definir la salida (te crea un boton en el celu/growflow)
switch:
  - platform: gpio
    pin: GPIO13
    name: "Aire acondicionado"
    id: rele_ac
    inverted: true            # la placa de reles es activa en LOW

# 2) POR TEMPERATURA (automatico)
sensor:
  - platform: scd4x
    temperature:
      on_value_range:
        - above: 24.0
          then: { switch.turn_on: rele_ac }    # >24 -> prende AC
        - below: 23.0
          then: { switch.turn_off: rele_ac }   # <23 -> apaga AC

# 3) POR HORARIO (luces 7:00 ON / 3:00 OFF, escalonadas anti-inrush)
time:
  - platform: sntp
    on_time:
      - hours: 7
        then: { script.execute: prender_luces }   # grupo 1 + 2s + grupo 2
      - hours: 3
        then: { script.execute: apagar_luces }

# 4) CICLADO (ventiladores 10 min si / 20 no) -- el "ciclador", sin timer fisico
interval:
  - interval: 30min
    then:
      - switch.turn_on: rele_vent
      - delay: 10min
      - switch.turn_off: rele_vent`}</pre>
        <p className="text-[11px] text-[#5c5c6b] mt-2">A mano lo prendés desde el celu/growflow/Home Assistant (el botón que crea el <span className="font-mono">switch</span>). Los otros 3 son automáticos.</p>

        <p className="text-[12px] text-[#d4d4dd] mt-4 mb-2 font-semibold">Riego por fases (crop steering P0/P1/P2) — como Growcast:</p>
        <pre className="text-[10.5px] font-mono bg-[#0a0a0f] border border-[#1f1f2b] rounded-lg p-3 overflow-x-auto text-[#7dd3fc] leading-relaxed">{`switch:
  - platform: gpio
    pin: GPIO27              # K7 del pinout (electrovalvula riego)
    id: valvula_riego
    name: "Riego"
    inverted: true
    restore_mode: ALWAYS_OFF

script:
  - id: ciclo_riego
    then:
      - delay: 2h                 # P0: dryback (deja secar al prender luces)
      - repeat:                   # P1: cargar el sustrato
          count: 6
          then:
            - switch.turn_on: valvula_riego
            - delay: 30s          # riego de 30 segundos
            - switch.turn_off: valvula_riego
            - delay: 15min        # espera 15 min entre shots
      - repeat:                   # P2: mantenimiento
          count: 4
          then:
            - switch.turn_on: valvula_riego
            - delay: 30s
            - switch.turn_off: valvula_riego
            - delay: 2h

time:
  - platform: sntp
    on_time:
      - hours: 7                  # cuando prenden las luces...
        then: { script.execute: ciclo_riego }   # ...arranca el riego del dia`}</pre>
        <p className="text-[11px] text-[#5c5c6b] mt-2">Cambiás los números (2h, 30s, 6 veces…) y tenés tu crop steering. Para riego por humedad real (dryback), en vez de tiempos fijos leés el sensor de sustrato: «si bajó del 60% → regá».</p>
      </Seccion>

      <p className="text-[10.5px] text-[#5c5c6b] px-1 pb-4">
        Documentación completa y actualizada en el repo: <span className="font-mono">growcast-diy/</span> (BOM, reverse-engineering, motor de automatizaciones).
        Esta guía es para el proyecto propio de Gastón; el hardware se compra en Argentina (MercadoLibre / casas de electrónica).
      </p>
    </div>
  )
}

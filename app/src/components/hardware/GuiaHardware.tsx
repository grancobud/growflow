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
          cols={['Componente', 'Función', 'Specs', 'Precio']}
          rows={[
            [<b>ESP32 DevKit WROOM-32</b>, 'Cerebro (corre ESPHome)', '240 MHz, WiFi/BT, 30+ GPIO, 3.3V lógica', 'USD 6-8'],
            [<b>MCP23017 (expansor I²C)</b>, 'El ESP32 no tiene pines para tantos relés → +16 salidas por I²C. ESPHome nativo.', '16 GPIO extra, dirección 0x20', 'USD 2-3'],
            [<b>Placa de relés 16 canales</b>, '1 salida por bobina de contactor + CO₂ + reserva (o 2× 8ch)', 'Optoacoplada, trigger 3.3V, VCC desde 5V', 'USD 12-18'],
            ['Fuente 5V robusta (≥5A)', 'Alimentación lógica + 16 relés', '5V regulada, ≥5A', 'USD 10-15'],
            ['Gabinete DIN grande + riel + borneras + ferrules', 'Tablero (instalación grande)', 'IP54, riel DIN 35mm', 'USD 20-35'],
          ]}
        />
        <p className="text-[11px] text-[#5c5c6b] mt-2">Con ~10-12 canales de control no alcanzan 8 relés ni los pines del ESP32: el <b>MCP23017</b> te da 16 salidas por I²C y manejás una <b>placa de 16 relés</b>. Cada relé cierra la bobina de un contactor (o directo el CO₂).</p>
      </Seccion>

      {/* Contactores */}
      <Seccion icon={Boxes} titulo="2 · Contactores y protección — dimensionado para TU sala" sub="El relé chico cierra la bobina; el contactor maneja la potencia. ~7 contactores">
        <div className="rounded-lg bg-[#e0685c]/[0.08] border border-[#e0685c]/30 p-3 mb-3">
          <p className="text-[12px] text-[#f0a89f]"><b>⚠️ Con el AC de 6.500W conviene TRIFÁSICA (380V).</b> Total ≈ <b>13,8 kW (~63A)</b>: luces 4,84 kW + AC 6,5 (~30A) + deshumi + 2 vent + 2 bombas ½HP. En monofásico serían ~63A (cable grueso 16mm²+ y la distribuidora te empuja a trifásica arriba de ~10 kW). En <b>trifásica repartís</b>: AC en una fase, luces en otra, resto en la tercera → ~21-30A por fase, mucho más sano. El <b>lado de potencia lo hace un electricista matriculado</b>; el ESP32 + relés los armás vos.</p>
        </div>
        <Tabla
          cols={['Canal', 'Cargas', 'Corriente', 'Contactor', 'Breaker']}
          rows={[
            [<b>Luces grupo 1 (propias)</b>, '3× Insativa 440 + 1× Growtech 400 (1.720W)', '~8A', '25A', 'C16'],
            [<b>Luces grupo 2 (prestadas)</b>, 'Growtech 400 + panel 400 + 3× COB 300 + parrillas 600/340/480 (3.120W)', '~14A', '25A', 'C16'],
            [<b>Aire acondicionado</b>, '1 (6.500W)', '~30A', '40A', 'C32'],
            [<b>Deshumidificador</b>, '1', '~3-5A', '16A', 'C10'],
            [<b>Ventiladores industriales</b>, '2', '~4A', '16A', 'C10'],
            [<b>Bombas ½ HP</b>, '2 (1 contactor c/u para control indep.)', '~3A c/u', '2× 16A', 'C10'],
            [<b>CO₂ (solenoide chica 220V)</b>, '1', '<1A', '— relé directo', '—'],
          ]}
        />
        <p className="text-[11px] text-[#5c5c6b] mt-2"><b>Total: ~7 contactores</b> (2 luces 25A + AC 40A + deshumi 16A + vent 16A + 2 bombas 16A) + breaker por grupo + general. Los solenoides van por relé directo. <b>Total sala ≈ 13,8 kW (~63A) → conviene TRIFÁSICA (380V)</b> por el AC de 6.500W.</p>
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
              ['Tipo', 'Fotoacústico, con autocalibración (ABC)'],
            ]}
          />
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
            [<b>DS18B20 ×9-15 (1-Wire)</b>, 'Grilla de TEMPERATURA por cable (mapa de calor)', 'decenas de m, muchos en 1 cable', 'USD 2-3 c/u'],
            [<b>SCD41 (I²C) — UNO solo</b>, 'CO₂ (el gas se difunde parejo, no hace falta multi-punto)', 'cerca de la caja / cable corto', '$52.829 AR'],
            ['SHT31 (I²C)', 'Humedad en 1-2 puntos clave', 'pocos metros (cable corto)', 'USD 4-6 c/u'],
            [<b>Nodos RS485 / Modbus</b>, 'CO₂/HR en varios puntos LEJOS (fiel a Growcast)', 'cientos de m', 'USD 6-10/nodo'],
            ['Extensor I²C (P82B715 / Cat5)', 'Estirar el I²C a distancias medianas', '~10-20 m', 'USD 3-6'],
            ['TCA9548A (mux I²C)', 'Varios sensores I²C iguales EN la caja', 'dentro de la caja', 'USD 2-4'],
            ['MLX90614 (opcional)', 'Temp de HOJA → VPD REAL', 'I²C, cable corto', 'USD 6-9'],
            [<b>ADS1115</b>, 'Sensores analógicos (EC/pH — futuro)', 'I²C', 'USD 3'],
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
            [<b>MAX485 / MAX3485 ×2+</b>, 'Convertir TTL↔RS485 (1 en controlador + 1 por nodo)', 'USD 1-2 c/u'],
            ['Micro por nodo (ESP32/ESP8266/Nano)', 'Leer el SCD41 en el nodo remoto', 'USD 3-5 c/u'],
            ['Par trenzado (UTP/Cat5)', 'El bus de datos', 'USD 5-10'],
            ['Resistencias 120Ω ×2', 'Terminación del bus (en las puntas)', 'centavos'],
            ['Gabinete chico por nodo', 'Proteger el sensor remoto', 'USD 2-4'],
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
            ['Emisor IR (LED IR + transistor)', 'Setearle la temperatura al mini-split AC (como el ARS-1). ESPHome climate/IR.', 'USD 2-4'],
            [<b>Interruptores manuales (toggle) ×6</b>, 'Override por salida ON–AUTO–OFF: forzar cada equipo a mano si el ESP32 se cuelga o para probar. El Growcast real los tiene en el frente.', 'USD 1-2 c/u'],
            ['Sonda EC + pH (opcional, v2)', 'Solución hidropónica', 'USD 25-45'],
          ]}
        />
        <p className="text-[11px] text-[#5c5c6b] mt-2">El override manual va en serie con la salida (o con un toggle de 3 posiciones ON–AUTO–OFF entre el relé/contactor y la carga). Es la seguridad de poder operar la sala aunque falle la electrónica.</p>
      </Seccion>

      {/* Riego multi-cama */}
      <Seccion icon={Droplets} titulo="5b · Riego de varias camas (fertirriego)" sub="Un subsistema propio: válvulas por cama, bomba, nivel y humedad">
        <Tabla
          cols={['Componente', 'Función', 'Nota', 'Precio']}
          rows={[
            [<b>Electroválvula (solenoide) ×cama</b>, 'Abrir/cerrar el riego de cada cama por separado', '12/24V DC — vía relé/MOSFET, nunca al GPIO', 'USD 4-8 c/u'],
            ['Relé para la bomba principal', 'Presurizar el riego', 'una bomba alimenta todas las válvulas', 'incluido'],
            [<b>Nivel de tanque (flotante)</b>, 'Interlock: la bomba NO arranca en seco', 'digital, 1 pin', 'USD 2-4'],
            ['Sensor humedad de sustrato ×cama (capacitivo)', 'Riego por humedad real de cada cama', 'analógico → ADS1115 (ESP32 tiene pocos ADC)', 'USD 2-4 c/u'],
            ['Caudalímetro (opcional)', 'Confirmar que efectivamente regó', 'pulsos', 'USD 3-6'],
            ['Bomba dosificadora (peristáltica) + EC/pH inline', 'Fertirriego automático (futuro)', 'mezcla nutrientes en línea', 'USD 15-30 c/u'],
            ['Fuente 12/24V + drivers', 'Alimentar los solenoides', 'separada de la lógica 5V', 'USD 8-15'],
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
          <p className="text-[12px] text-[#f0a89f]"><b>🚨 Interlock obligatorio:</b> el CO₂ NUNCA se inyecta con el extractor prendido. El relé de CO₂ y el de extracción no pueden estar activos a la vez (bloqueo en la lógica de ESPHome).</p>
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
            [<b>RTC DS3231</b>, 'Reloj para automatizaciones por horario OFFLINE (Growcast usa uno)', 'USD 2-4'],
            ['Resistencias 4.7kΩ', 'Pull-ups del bus DS18B20 (1-Wire) e I²C', 'centavos'],
            ['Conectores JST / borneras', 'Enchufar sensores sin soldar', 'USD 3-5'],
            ['Cable apantallado / UTP CAT5', 'Tirar sensores lejos sin ruido (I²C sensible)', 'USD 5-10'],
            ['Buzzer + LEDs de estado', 'Alarma sonora + señalización local', 'USD 2-3'],
            ['Snubber / varistor por carga inductiva', 'Proteger relés del pico del AC/extractores', 'USD 3-5'],
            ['Protoboard / perfboard (o PCB)', 'Montaje prolijo', 'USD 3-8'],
            [<b>Sensor de fuga de agua</b>, 'Detectar inundación (riego/tanque) → alarma + corte de bomba', 'USD 2-4'],
            ['Detector de humo (opcional)', 'Seguridad — alarma ante incendio (Growcast/TrolMaster lo tienen)', 'USD 3-6'],
          ]}
        />
      </Seccion>

      {/* Presupuesto */}
      <Seccion icon={Wallet} titulo="Presupuesto estimado" sub="Contra TrolMaster US$600-1000 · Growcast equipo + suscripción">
        <Tabla
          cols={['Versión', 'Qué incluye', 'Total (USD equiv.)']}
          rows={[
            ['Núcleo funcional', 'ESP32 + relés + fuente/caja + SCD41 + contactor AC + protecciones', '~130-170'],
            ['+ Multipunto / mapa de calor', 'DS18B20 ×9 + SHT31 ×3 + BH1750 + TCA9548A', '~40-55'],
            ['+ IR AC + VPD real (MLX90614) + RTC', 'control fino + fail-safe horario', '~15-25'],
            [<b>Completa</b>, 'todo lo anterior (sin cámara térmica ni EC/pH)', <b className="text-[#d9f99d]">~185-250</b>],
          ]}
        />
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

      {/* Esquema de conexión */}
      <Seccion icon={Cable} titulo="Esquema de conexión (pinout + tablero)" sub="Pines elegidos evitando los conflictivos del ESP32 (flash 6-11, strapping 0/2/12/15, solo-entrada 34-39)">
        <p className="text-[11.5px] text-[#a6a6b5] mb-2 font-semibold">Mapa de pines del ESP32</p>
        <Tabla
          cols={['GPIO', 'Va a', 'Notas']}
          rows={[
            ['21 / 22', 'Bus I²C (SDA / SCL)', 'SCD41 (0x62), RTC DS3231 (0x68), TCA9548A (0x70)'],
            ['4', 'Bus 1-Wire (DS18B20 ×9)', 'resistencia pull-up 4.7kΩ a 3.3V'],
            ['14', 'Emisor IR (AC)', 'remote_transmitter'],
            ['13', 'Relé 1 → Contactor AC', 'activa en LOW (inverted)'],
            ['18', 'Relé 2 → Luces', ''],
            ['19', 'Relé 3 → Extractores', ''],
            ['23', 'Relé 4 → Ventiladores', ''],
            ['25', 'Relé 5 → Deshumidificador', ''],
            ['26', 'Relé 6 → CO₂ (solenoide)', ''],
            ['27', 'Relé 7 → Humidificador / reserva', ''],
            ['32', 'Relé 8 → reserva', ''],
            ['5V / GND', 'Alimentación ESP32 + placa relés', 'desde la fuente 5V'],
          ]}
        />
        <p className="text-[11px] text-[#5c5c6b] mt-2">Todos los pines de relé son salidas seguras (no strapping, no solo-entrada). La placa de relés es activa en LOW → en ESPHome van con <span className="font-mono">inverted: true</span> y <span className="font-mono">restore_mode: ALWAYS_OFF</span>.</p>
        <div className="mt-2 rounded-lg bg-[#f0a35e]/[0.07] border border-[#f0a35e]/25 p-2.5">
          <p className="text-[11px] text-[#e0b48a]"><b>Recomendaciones de la comunidad (foros):</b> alimentá el <b>VCC de la placa de relés desde los 5V</b> (no del 3.3V del ESP32, no da corriente). Verificá que el módulo dispare con <b>3.3V</b> (marcado «3.3V compatible») o usá level shifter. <b>Derateá 50%</b>: un relé «10A» no lo corras a 10A continuo — por eso el AC va por contactor. No corras señales 3.3V al lado de los 220V.</p>
        </div>

        <p className="text-[11.5px] text-[#a6a6b5] mt-4 mb-2 font-semibold">Tablero 220V (⚠️ con la llave general BAJA)</p>
        <pre className="text-[10.5px] font-mono bg-[#0a0a0f] border border-[#1f1f2b] rounded-lg p-3 overflow-x-auto text-[#d4a89f] leading-relaxed">{`RED 220V ── [Térmica + Disyuntor] ──┬── [Fuente 5V] ── 5V/GND → ESP32 + placa relés
                                    │
                                    ├── Fase (L) ─────┐
                                    └── Neutro (N) ───┼──────────────┐
                                                      │              │
Relé K1 (GPIO13) ── bobina A1/A2 → [CONTACTOR 40A] ──┘   Fase→ ❄️AC ←N
Relé K2 (GPIO18) ── (contactor 25A o directo) ─────────────→ 💡Luces
Relé K3..K6 (19/23/25/26) ── directo (cargas <10A) ────────→ Extractor/Ventilador/Deshumi/CO₂

TIERRA (PE) ── gabinete + chasis de cada equipo
Snubber/varistor en paralelo a las cargas inductivas (AC, extractores)`}</pre>
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
logger:
api:
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
switch:
  - platform: gpio
    pin: GPIO13
    name: "Aire acondicionado"
    inverted: true
    restore_mode: ALWAYS_OFF
  - platform: gpio
    pin: GPIO18
    name: "Luces"
    inverted: true
    restore_mode: ALWAYS_OFF
  - platform: gpio
    pin: GPIO19
    name: "Extractores"
    inverted: true
    restore_mode: ALWAYS_OFF
  - platform: gpio
    pin: GPIO23
    name: "Ventiladores"
    inverted: true
    restore_mode: ALWAYS_OFF
  - platform: gpio
    pin: GPIO25
    name: "Deshumidificador"
    inverted: true
    restore_mode: ALWAYS_OFF
  - platform: gpio
    pin: GPIO26
    name: "Inyeccion CO2"
    inverted: true
    restore_mode: ALWAYS_OFF

# ---------- AC por infrarrojo ----------
remote_transmitter:
  pin: GPIO14
  carrier_duty_percent: 50%
climate:
  - platform: coolix      # ← cambiar por la marca de tu mini-split
    name: "AC (IR)"

# ---------- Ejemplos de automatización on-device ----------
# Luces 7:00 ON / 3:00 OFF, y AC si Temp > 24° — se hacen con
# 'on_time:' (time) y 'on_value_range:' (sensor). Ver doc ESPHome.`}</pre>
        <p className="text-[11px] text-[#5c5c6b] mt-2">⚠️ La sintaxis de ESPHome evoluciona (ej. <span className="font-mono">one_wire</span>/<span className="font-mono">dallas_temp</span>). Validá con <span className="font-mono">esphome config</span> antes de flashear. Los <span className="font-mono">address</span> de los DS18B20 salen del log del primer arranque (I²C/1-Wire scan).</p>
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

# 3) POR HORARIO (luces 7:00 ON / 3:00 OFF)
time:
  - platform: sntp
    on_time:
      - hours: 7
        then: { switch.turn_on: rele_luces }
      - hours: 3
        then: { switch.turn_off: rele_luces }

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
    pin: GPIO25
    id: valvula_riego
    name: "Riego"

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

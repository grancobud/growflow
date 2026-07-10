// Guía de hardware: cómo clonar (y mejorar) el controlador de ambiente Growcast
// con ESP32 + ESPHome. Especificaciones, insumos y estrategia multi-sensor.
// Basado en la ingeniería inversa del firmware/API de Growcast (ver growcast-diy/).

import { Cpu, Thermometer, Zap, Boxes, Radio, Wrench, Wallet, FileCode, ChevronRight, Hammer, Monitor, ListChecks, Cable } from 'lucide-react'
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
            ['Placa 8 relés optoacoplada', '6 salidas 220V + 2 reserva', 'Optoacoplada, 10A/canal, trigger 3.3V', 'USD 8-10'],
            ['Fuente 5V 3A', 'Alimentación lógica', '5V regulada, ≥3A', 'USD 8-12'],
            ['Gabinete DIN + riel + borneras + fusible', 'Tablero seguro', 'IP54, riel DIN 35mm', 'USD 10-15'],
          ]}
        />
      </Seccion>

      {/* Contactores */}
      <Seccion icon={Boxes} titulo="2 · Contactores y protección (alta potencia)" sub="El relé chico maneja la bobina; el contactor maneja la potencia">
        <Tabla
          cols={['Componente', 'Para qué', 'Specs', 'Precio']}
          rows={[
            [<b>Contactor 40A bobina 220V</b>, 'AC (6300W ≈ 29A + arranque)', '3P, bobina 220VAC, 40A AC3', 'USD 20-35'],
            ['Contactor 25A ×1-2 (opcional)', 'Luces / cargas medianas', 'bobina 220VAC, 25A', 'USD 12-20 c/u'],
            ['Térmica + disyuntor', 'Protección del tablero', 'según carga total', 'USD 15-30'],
            ['Cable 2.5-4mm², borneras, ferrules', 'Montaje', '—', 'USD 10-15'],
          ]}
        />
        <p className="text-[11px] text-[#5c5c6b] mt-3"><b className="text-[#f0a35e]">Regla:</b> contactor = corriente de la carga × 1.5 (por el pico de arranque). Nunca enchufar el AC directo al relé de placa.</p>
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
              ['Alimentación', '3.3–5V'],
              ['Tipo', 'Fotoacústico NDIR, con autocalibración (ABC)'],
            ]}
          />
        </div>
        <p className="text-[11px] text-[#5c5c6b]">⚠️ Algunos módulos rotulan «41» pero traen SCD40. Al conectarlo, ESPHome reporta el chip y su rango — verificar ahí.</p>
      </Seccion>

      {/* Multi-sensor */}
      <Seccion icon={Radio} titulo="4 · Varios sensores (multi-punto / mapa de calor)" sub="El desafío: sensores I²C que comparten dirección. Tres soluciones combinables">
        <Tabla
          cols={['Componente', 'Resuelve', 'Cómo', 'Precio']}
          rows={[
            [<b>TCA9548A (mux I²C 8 canales)</b>, 'Varios sensores I²C iguales', 'Hasta 8 SCD41/SHT31/BH1750 en canales separados. ESPHome nativo.', 'USD 2-4'],
            ['DS18B20 ×9-15 (bus 1-Wire)', 'Grilla de temperatura (mapa de calor)', 'Todos en 1 cable, cada uno con ID único (no chocan)', 'USD 2-3 c/u'],
            ['SHT31 ×3', 'Humedad/VPD en puntos clave', 'I²C (0x44/0x45), o vía el TCA9548A', 'USD 4-6 c/u'],
            ['BH1750', 'Luz / PPFD aproximado', 'I²C', 'USD 2-4'],
            ['MLX90614 (opcional)', 'Temp de HOJA → VPD REAL', 'IR sin contacto, I²C', 'USD 6-9'],
            ['Nodos ESP32 (ESP-NOW)', 'Sensores lejanos / inalámbricos', '1 ESP32 + sensor por punto, manda por radio', 'USD 6/nodo'],
          ]}
        />
        <div className="mt-3 rounded-lg bg-[#a78bfa]/[0.06] border border-[#a78bfa]/25 p-3">
          <p className="text-[12px] text-[#d4d4dd]"><b className="text-[#c4b5fd]">Estrategia mapa de calor:</b> grilla 3×3 de <b>DS18B20</b> (temperatura, 1 cable) + 3 <b>SHT31</b> (humedad) → el software interpola y pinta las zonas calientes/frías. Ni Growcast ni TrolMaster miden multi-punto.</p>
        </div>
      </Seccion>

      {/* Control avanzado */}
      <Seccion icon={Wrench} titulo="5 · Control avanzado (features tipo TrolMaster)" sub="Lo que Growcast NO tiene">
        <Tabla
          cols={['Componente', 'Función', 'Precio']}
          rows={[
            ['Emisor IR (LED IR + transistor)', 'Setearle la temperatura al mini-split AC (como el ARS-1). ESPHome climate/IR.', 'USD 2-4'],
            ['Sonda EC + pH (opcional, v2)', 'Solución hidropónica', 'USD 25-45'],
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

      <p className="text-[10.5px] text-[#5c5c6b] px-1 pb-4">
        Documentación completa y actualizada en el repo: <span className="font-mono">growcast-diy/</span> (BOM, reverse-engineering, motor de automatizaciones).
        Esta guía es para el proyecto propio de Gastón; el hardware se compra en Argentina (MercadoLibre / casas de electrónica).
      </p>
    </div>
  )
}

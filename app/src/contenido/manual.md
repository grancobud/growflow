# Manual de operación de GrowFlow

El recorrido completo del sistema en el orden en que se usa de verdad: primero lo
que se configura una sola vez, después el día a día del cultivo, y al final el
circuito de la ONG que termina en una entrega con su recibo.

Está escrito para la operación real, no como lista de funciones. Donde el sistema
bloquea, explica por qué bloquea.

> **¿Buscás cómo hacer algo puntual?** El capítulo 11 tiene el paso a paso de cada
> tarea con los campos tal como aparecen en pantalla: cargar plantas, cargar costos,
> hacer una reserva, redactar un acta. El buscador de arriba también sirve.

---

## 00 · Cómo está organizado

Once secciones en el menú. Cuatro agrupan varias pantallas adentro, con sus propias
pestañas arriba. La regla de dónde vive cada cosa: **lo que pasa con las plantas
está en Cultivo, lo que cuesta plata está en Econometría, y lo que rinde cuentas
ante un organismo está en O.N.G.**

| Sección | Qué vive adentro | Para qué se entra |
|---|---|---|
| **Panel** | Una sola pantalla | Plantas activas, en floración, riegos de hoy, gramos cosechados. |
| **Cultivo** | Plantas · Genéticas · Línea de tiempo · Sala | Todo lo que le pasa a una planta desde que germina hasta que se corta. |
| **Cosecha** | Una sola pantalla | Cargar los gramos que dio cada variedad y comparar rendimientos. |
| **Ambiente** | Una sola pantalla | Sensores en vivo, estado de cada equipo, si los valores están en rango. |
| **Calendario** | Una sola pantalla | Ver y planificar riegos, podas, fumigaciones y cosechas. |
| **Calculadora Fertilizantes** | Calculadora · Mi plan · Sustancias · Ratios y costo · Más herramientas | Sacar la receta de sales para un perfil objetivo y su costo. |
| **Instalación** | Hardware DIY · Riego · Tablero eléctrico · Faltantes | Cómo está armado el equipamiento y qué falta comprar. |
| **Econometría** | Resumen · Costos · Inventario · Mantenimiento · Instalaciones | Qué cuesta producir un gramo y de dónde sale ese número. |
| **O.N.G.** | 15 pestañas, de Estado a Predios | Pacientes, entregas, libros, actas y todo lo que pide la Resolución 1780. |
| **Estadísticas** | Una sola pantalla | Rendimiento por genética, gramos por vatio, merma de secado. |
| **Tablas** | Una sola pantalla | Los datos crudos de cualquier tabla, editables celda por celda. |
| **Manual** | Una sola pantalla | Esto que estás leyendo. El buscador de arriba encuentra por palabra. |

**Tablas es la salida de emergencia.** Cualquier dato que no encuentres cómo
corregir desde su pantalla se edita ahí a mano. Sirve también para exportar e
importar. Usala cuando la pantalla normal no te deja hacer lo que necesitás, no
como forma habitual de cargar.

---

## 01 · Lo que se carga una vez

Esto se hace al principio y casi no se toca. Si falta, varias pantallas van a
mostrar guiones en vez de números: no están rotas, no tienen con qué calcular.

1. **Los datos de la entidad** — `O.N.G. › La entidad`
   Razón social, CUIT, domicilio de la sede, fecha de constitución, cierre de
   ejercicio y las fechas del REPROCANN. De acá salen los encabezados de *todos*
   los documentos que el sistema genera. Sin CUIT cargado, cada recibo y cada acta
   sale con `[CUIT]` entre corchetes.

2. **Autoridades y predios** — `O.N.G. › Autoridades` · `Predios`
   Quién ocupa cada cargo y desde cuándo; qué predios se declararon, si están
   georreferenciados y si el municipio fue notificado. Las designaciones de
   Director Médico y Responsable Técnico se completan solas con esta lista.

3. **Las genéticas** — `Cultivo › Genéticas`
   El banco de variedades. Alcanza con el nombre para empezar.

4. **La sala** — `Cultivo › Sala`
   El plano de carpas y posiciones. Es lo que después permite regar por carpa en
   vez de planta por planta.

5. **Costos e instalaciones** — `Econometría › Costos` · `Instalaciones`
   Luz, alquiler, sales, equipamiento con su vida útil. Es la base del costo por
   gramo, que define si un aporte es reembolso de costos o pasa a ser otra cosa.

> **El guion no es un cero.** Cuando una pantalla muestra `—` es porque falta un
> dato para calcular, no porque el resultado sea cero. Un costo por gramo de $0
> diría que producir no cuesta nada.

---

## 02 · El día a día del cultivo

Todo el ciclo vive en **Cultivo**, que son cuatro miradas sobre lo mismo.

- **Plantas** (`/plantas`) — la lista completa, una ficha por planta: genética,
  fase, día de vida, posición e historial. Se dan de alta y se pasan a floración.
- **Sala** (`/sala`) — el plano de riego. El color dice hace cuánto se regó cada
  posición: hoy, 1-2 días, 3+, sin registro. Se riega o fumiga de a varias.
- **Línea de tiempo** (`/linea-tiempo`) — cada variedad como una barra desde que
  germinó hasta la cosecha estimada.
- **Genéticas** (`/geneticas`) — el banco. Alimenta etiquetas, informe de
  variedades y comparación de rendimientos.

### Regar y fumigar sin cargar planta por planta

En **Sala** se arma la receta del día una vez y se aplica a todo lo que toques.
Es la diferencia entre cargar sesenta riegos y cargar uno.

- Elegí **Regar** o **Fumigar** y cargá la receta arriba.
- Tocá las plantas o la carpa entera. El contador lleva la cuenta del día.
- **Mover** cambia plantas de posición sin perderles el historial.

> **La fase importa más de lo que parece.** El tope de plantas de la Resolución
> 1780 se cuenta sobre las que están *en floración*. Las de vegetativo o
> enraizando no suman contra el límite, así que tener la fase al día es lo que
> hace que el cupo dé bien.

### Calendario

Todo lo que se registra aparece por tipo: riego, fertilización, poda, trasplante,
fumigación, germinación, cosecha, mantenimiento y recordatorios. Sirve para
planificar lo que viene y para demostrar después qué se hizo y cuándo.

---

## 03 · Ambiente y nutrición

**Ambiente** (`/ambiente`) — temperatura, humedad, CO₂ y VPD en vivo, más el
estado de luces, aire acondicionado, ventiladores, extractores, deshumidificador y
humidificador. El análisis compara contra los rangos de la etapa (vegetativo o
floración) y dice qué corregir.

El VPD es el número al que conviene mirar: combina temperatura y humedad en un
solo valor que dice si la planta puede transpirar bien. Las dos por separado
pueden verse "normales" y aun así dar un VPD malo.

**Calculadora Fertilizantes** (`/nutrientes`) — se le pide un perfil objetivo y
devuelve cuántos gramos de cada sal hay que pesar. Trae presets por etapa, de
clonación a fin de ciclo.

- **Calculadora** — perfil objetivo, la receta que resuelve y el agua de partida.
- **Mi plan** — la receta guardada para el ciclo en curso.
- **Sustancias** — las sales disponibles con composición y precio.
- **Ratios y costo** — balance entre elementos y costo por litro.
- **Más herramientas** — conversiones y utilidades.

> **Cargá el precio de las sales.** Sin precio no hay costo por litro, y ese costo
> es parte del costo por gramo que justifica el monto del reembolso.

---

## 04 · Cosecha y lotes

Dos cosas que se parecen y no son lo mismo. **La cosecha** es lo que dio una
planta. **El lote** es material ya seco, curado y fraccionado, listo para
entregar. Una cosecha puede dar varios lotes, y un lote puede juntar varias
plantas.

1. **Cargá la cosecha** — `menú › Cosecha`
   Peso húmedo, peso seco, notas de curado y sabor, valoración. Calcula merma de
   secado, rendimiento por planta y el ranking por genética.

2. **Mirá si el número cierra** — `menú › Estadísticas`
   Gramos por vatio, costo por gramo, merma y qué genética rindió mejor. La merma
   normal ronda 75–80 %: bastante afuera de ahí, revisá si cargaste húmedo y seco
   en el orden correcto.

3. **Creá el lote** — `O.N.G. › Autodispensación › Catálogo`
   Código, producto, gramos totales, aporte por gramo e informe cromatográfico.
   Recién cuando existe el lote se puede reservar y entregar material.

> **El análisis por lote lo pide la 1780.** Los valores de THC/CBD de la ficha de
> la genética son estimados de la variedad y no reemplazan el análisis del lote.
> El sistema deja crear el lote sin análisis pero lo marca, porque presentar un
> estimado como resultado sería declarar algo que no se midió.

---

## 05 · De paciente a entrega

El corazón del sistema. Seis pasos, cada uno habilita el siguiente. Si un paso
falta, el sistema no deja avanzar y dice cuál es y cómo destrabarlo.

1. **Cargá al paciente** — `O.N.G. › Pacientes`
   Datos personales, patología, médico tratante, y el REPROCANN con número, estado
   y vencimiento. Cargá también el **tope mensual en gramos**: sin ese dato el
   cupo no se puede controlar.

2. **Dalo de alta como asociado** — `O.N.G. › Asociados`
   Paciente y asociado son distintos: una persona puede estar en el registro de
   pacientes sin ser socia. Para recibir material tiene que ser las dos cosas.

3. **Que firme el mandato** — `O.N.G. › Autodispensación › Reservar`
   La Declaración Jurada de Vinculación Exclusiva y Mandato de Gestión Operativa.
   Se firma desde la misma pantalla de reserva y queda registrada con fecha, hora
   e IP. Es el documento que sostiene que la entrega no es una compraventa.

4. **Reservá del catálogo** — `O.N.G. › Autodispensación › Reservar`
   El sistema muestra primero si la persona está habilitada: cupo usado, reservado
   y libre. Después elegís lote, gramos y forma de pago. Sale un código
   `RSV-0000-2026` con su QR y **72 horas** para retirar.

5. **Entregá en la sede** — `O.N.G. › Autodispensación › Reservas`
   Escaneá el QR con **Escanear** —o buscá el código a mano— y se abre la entrega.
   Si pagó por transferencia, administración tuvo que marcarla abonada antes. Si
   paga en efectivo, tildás que lo cobraste. Al confirmar nacen las tres cosas
   juntas: **la dispensa, el asiento en el Libro de Caja y el recibo oficial** con
   su leyenda legal.

6. **Registrá cómo le fue** — `O.N.G. › Seguimiento`
   Alivio del 1 al 5, efectos adversos, dosis real y observaciones. Es obligación
   de la ONG, no del paciente: sin reportes no hay informe semestral que
   presentar. Por eso una entrega sin reporte bloquea la siguiente.

> **El reporte no se puede editar ni borrar.** Una vez guardado queda cerrado, y
> la base lo rechaza aunque se intente. Es la evidencia que va al informe del
> Director Médico: un dato clínico reescrito no sirve como evidencia.

### Las tres pantallas de la autodispensación

- **Catálogo** — los lotes con tres números separados: *disponible* es lo único
  que se puede comprometer hoy, *reservado* está apartado esperando un retiro, y
  *entregado* ya salió.
- **Reservas** — ordenadas por lo que hay que hacer, no por fecha: primero lo
  listo para retirar, después lo reservado, al final lo cerrado.
- **Seguimiento** — los reportes y el **panel del Director Médico**, que cruza
  diagnóstico, lotes entregados y curva de alivio, y genera el informe semestral.

> **Las reservas vencidas se limpian solas.** Al abrir la pantalla, todo lo que
> pasó las 72 horas se marca expirado y su material vuelve al inventario. Si un
> lote muestra menos disponible del esperado, fijate cuánto tiene apartado.

---

## 06 · La plata

Todo desemboca en un número: **cuánto cuesta producir un gramo**. De ahí depende
que el aporte de un paciente sea un reembolso de costos y no otra cosa.

**Econometría** (`/econometria`):

- **Resumen** — el costo por gramo, de dónde sale y cuánto habría que producir
  para bajarlo.
- **Costos** — gastos fijos y variables del ciclo.
- **Inventario** — el stock de insumos, que también es plata inmovilizada.
- **Mantenimiento** — qué hacerle a los equipos y cuándo.
- **Instalaciones** — el equipamiento con su vida útil, para que amortice.

> **El costo por gramo es lo ya gastado.** No incluye la lista de compras
> pendiente: se compara el aporte contra lo que *efectivamente* costó producir.

**Libro de Caja** (`O.N.G. › Seguimiento`) — cada reembolso que entra y cada gasto
que sale. Las entregas se asientan solas; el resto se carga a mano. Es de donde el
contador saca el balance.

---

## 07 · Libros y papeles

El sistema no sólo lleva la cuenta de qué papeles tenés: los **genera**. Lo que
falta cargar sale entre corchetes.

| Pestaña | Qué hace |
|---|---|
| **Estado** | Qué vence y cuándo. Es la pantalla de entrada. |
| **Coherencia** | Cruza los datos y marca lo que no cierra: más plantas que las habilitadas, aportes por encima del costo, socios sin REPROCANN. |
| **Cupo REPROCANN** | Cuántas plantas en floración habilita cada persona vinculada y cuántas tenés. |
| **Dispensas** | El historial de entregas, incluidas las que no salieron del portal. |
| **Declaraciones** | DDJJ semestrales y traslados de material, con sus topes por tipo. |
| **Documentos** | Comprobantes emitidos y recibidos, y las **plantillas institucionales**: designaciones, comodatos, informe de genéticas y mandato. |
| **Libros** | Los libros obligatorios, su rubricación y en qué folio va cada uno. |
| **Actas** | Redacta el acta lista para transcribir al libro, con control de quórum y firmantes. |

> **Los corchetes son intencionales.** Cuando un documento sale con `[CUIT]` o
> `[nombre]`, ese dato no está cargado. Preferimos que se vea el hueco antes que
> rellenarlo con algo inventado en un papel que se firma.

---

## 08 · Las reglas que bloquean

Cuando el sistema no deja avanzar, siempre dice qué regla es y cómo destrabarla.
Los bloqueos aparecen juntos, no de a uno.

| Regla | Qué exige | Cómo se destraba |
|---|---|---|
| **RN-01** | REPROCANN vigente y vinculado. | Cargar o renovar el REPROCANN en la ficha del paciente. |
| **RN-02** | No pasar el tope de gramos en 30 días. | Esperar a que las entregas viejas salgan de la ventana, o revisar el tope. |
| **RN-03** | Mandato de Gestión Operativa firmado. | Firmarlo desde la pantalla de reserva. |
| **RN-04** | El aporte no puede superar el costo de producción. | Cargar costos reales y ajustar el aporte por gramo del lote. |
| **RN-05** | La entrega anterior tiene que tener su reporte. | Completar la encuesta desde la misma pantalla que bloquea. |
| **RN-06** | La reserva vence a las 72 h y el material vuelve. | Generar una reserva nueva. |
| **RN-07** | El reporte clínico es inmutable. | No se destraba: es a propósito. |

### Por qué el cupo cuenta las reservas

El cupo de 30 días suma **lo entregado más lo reservado sin retirar**. Si contara
sólo las entregas, cinco reservas del mismo día pasarían el tope las cinco y el
exceso se descubriría en el mostrador, con el material ya comprometido. Por eso
podés ver el cupo agotado aunque todavía no se haya retirado nada.

---

## 09 · Cada cuánto hacer qué

| Cuándo | Qué | Dónde |
|---|---|---|
| Diario | Registrar riegos y aplicaciones; mirar el ambiente. | Cultivo › Sala · Ambiente |
| Diario | Verificar pagos por transferencia y entregar lo reservado. | O.N.G. › Autodispensación |
| Semanal | Actualizar fases de las plantas y revisar qué se viene. | Cultivo › Plantas · Línea de tiempo |
| Semanal | Asentar gastos en el Libro de Caja. | O.N.G. › Seguimiento |
| Mensual | Cargar costos del mes y revisar el costo por gramo. | Econometría |
| Mensual | Revisar vencimientos de REPROCANN. | O.N.G. › Estado |
| Trimestral | Revisión de libros. | O.N.G. › Libros |
| Semestral | DDJJ e informe del Director Médico. | O.N.G. › Declaraciones · Seguimiento |
| Por cosecha | Cargar pesos, crear el lote y pedir el análisis. | Cosecha › O.N.G. › Catálogo |

> **Empezá el día por Estado.** `O.N.G. › Estado` junta todo lo que vence y todo
> lo que falta. Si está limpia, no hay nada urgente del lado de los papeles.

---

## 10 · Problemas frecuentes

| Lo que ves | Qué pasa |
|---|---|
| Una pantalla muestra `—` | Falta un dato para calcular. No es cero: el sistema evita mostrar un número que sería mentira. |
| El lote tiene menos disponible del esperado | Hay gramos apartados por reservas sin retirar. Mirá la columna *reservado*. |
| El cupo está en cero y no entregaste nada | Hay reservas vivas que ya comprometen ese cupo. Se libera si expiran o se cancelan. |
| No deja entregar una reserva paga por transferencia | Falta que administración la marque como abonada. |
| Un documento sale con corchetes | Ese dato no está cargado. Cargalo y volvé a generarlo. |
| El cupo de plantas no da | Se cuentan sólo las plantas en floración. Revisá las fases. |
| La merma de secado da rarísima | Probablemente peso húmedo y seco quedaron invertidos. Lo normal ronda 75–80 %. |
| Un dato no se puede corregir desde su pantalla | Editalo en *Tablas*, celda por celda. |

---

## 11 · Paso a paso de cada cosa

Las recetas concretas, con los campos tal como aparecen en pantalla. Los marcados como
obligatorios no dejan guardar sin completar; el resto puede esperar.

### Crear una genética

**Dónde:** `Cultivo › Genéticas › botón Genética`

1. **Nombre** (obligatorio) — es lo único que no podés dejar vacío. Podés crear la genética sólo con esto y completar el resto cuando la conozcas.
2. **Banco** y **Tipo** — feminizada, automática o regular. El tipo cambia cómo se calcula la línea de tiempo.
3. **Genotipo**, **Indica/Sativa %** y **Linaje / Cruza** — para tu referencia.
4. **THC %** y **CBD %** — valores estimados de la variedad.
5. **Vege (días)** y **Flora (días)** — con esto la Línea de tiempo puede estimar la fecha de cosecha.
6. **Altura**, **Dificultad**, **Ambiente**, **Rendimiento**, **Stretch (flora)** y **Resistencia**.
7. **Terpenos / Aroma**, **Efectos** y **Usos medicinales**.
8. Guardá.

> Los valores de THC y CBD de la ficha son estimados de la genética. No reemplazan
> el análisis del lote: en el informe cromatográfico van los medidos, no estos.

### Cargar plantas

**Dónde:** `Cultivo › Plantas › botón Planta`

1. **Genética** — elegila de la lista. Si no está, el botón **+** al lado abre el alta de genética sin perder lo que ya cargaste.
2. **Apodo** — cómo la llamás vos ("La gorda"). Si cargás varias de una, se numeran solas.
3. **Cantidad** — hasta 50 de un saque. Es la forma de dar de alta un lote de clones sin repetir el formulario.
4. **Fecha germinación** — de acá sale el día de vida que ves en cada ficha.
5. **Fase** — en qué etapa entra.
6. **Sustrato** y **Maceta** — por ejemplo "20L tela".
7. **Ubicación** — "Indoor carpa 120x120".
8. **Paciente asignado** — con qué REPROCANN se ampara esta planta. Es lo que después cuadra el cupo por persona.
9. Tocá **Crear planta**. Si pusiste cantidad mayor a uno, el botón dice cuántas va a crear.

> Cada planta recibe un código QR propio para su historia clínica. Se imprime desde
> la ficha y sirve para llegar a la planta escaneando en vez de buscarla en la lista.

### Regar o fumigar toda la sala

**Dónde:** `Cultivo › Sala`

1. Elegí **Regar** o **Fumigar** arriba.
2. Cargá la **receta de hoy**: lo que pongas se guarda en cada planta que toques.
3. Tocá las plantas una por una, o el nombre de la carpa para marcarlas todas.
4. El contador de arriba lleva la cuenta: "0 / 64 regadas hoy".

Los colores dicen hace cuánto se regó cada posición: regada hoy, 1-2 días, 3+ días,
sin registro. El puntito de color es la genética.

> **Mover** cambia una planta de posición sin perderle el historial. Sirve cuando
> rotás la carpa.

### Registrar algo puntual en una planta

**Dónde:** `Cultivo › Plantas`, en la tarjeta de cada planta

Cada planta tiene sus botones a mano: **Riego**, **Ferti**, **Poda**, **Nota** y
**Cosecha**. **Historial** abre todo lo registrado, con el contador de cuántos
eventos lleva.

Es para lo puntual —una poda, una observación—. Para lo que hacés en tanda,
Sala es más rápido.

### Pasar plantas a floración

**Dónde:** `Cultivo › Plantas`, editando la ficha

Cambiá la **Fase** a Floración. Hacelo el día que cambiás el fotoperiodo, no después.

> Esto no es prolijidad: el tope de la Resolución 1780 se cuenta sobre las plantas
> **en floración**. Si las fases están atrasadas, el cupo de `O.N.G. › Cupo REPROCANN`
> te va a dar mal, y es el número que mirás para saber si estás dentro de lo habilitado.

### Cargar una cosecha

**Dónde:** `menú › Cosecha`

1. Buscá la variedad en la lista y tocá **Ver / editar**.
2. **Fecha de cosecha**.
3. **Peso seco (g)** (obligatorio) — si además cargás el húmedo, el sistema calcula la merma.
4. **Valoración** — del 1 al 10, para el ranking.
5. **Notas de sabor / cata** y **Notas de curado**.
6. Guardá.

Podés cargar el total de la variedad o abrir el modo por planta y cargar el peso de
cada una. Por planta es más trabajo pero te deja comparar rendimientos entre
individuos de la misma genética.

> Si la merma te da muy lejos de 75–80 %, casi seguro cargaste el húmedo en el campo
> del seco o al revés.

### Sacar la receta de fertilizantes

**Dónde:** `menú › Calculadora Fertilizantes`

1. **Perfil objetivo** — elegí el preset de la etapa (plántula/clon, vegetativo, floración, engorde, finis) o cargá los ppm que querés de cada elemento.
2. **Kit de sales** — marcá qué sales tenés. La calculadora resuelve con lo que hay, no con lo ideal.
3. Leé la receta: cuántos gramos de cada sal por litro, y el perfil que realmente se alcanza. Si algún elemento no llega, lo dice.
4. **Guardar** la manda a **Mi plan**, que es la receta del ciclo en curso.

Las demás pestañas son el soporte de eso:

- **Sustancias** — las sales con su composición y precio.
- **Proveedores** — dónde comprás cada una.
- **Agua y unidades** — el análisis de tu agua de partida. Sin esto, la receta ignora lo que el agua ya trae.
- **Soluciones madre** — pasar la receta a concentrado A/B.
- **Clonar marca** y **Fichas técnicas** — reproducir una línea comercial con sales sueltas.
- **Estabilizantes** y **Ajuste de pH**.

> Cargá primero el agua. Un agua dura ya trae calcio y magnesio, y si no se descuentan
> la receta los suma de nuevo.

### Cargar un costo

**Dónde:** `Econometría › Costos`

1. **Nombre** (obligatorio) — "Alquiler galpón", "Bolsa de coco".
2. **Categoría** — sugeridas para fijos: Alquiler, Luz (abono), Internet, Amortización equipos, Seguro. Para variables: Nutrientes, Sustrato, Luz (consumo), Agua, Semillas/Clones, Sanidad, Mano de obra. Igual podés escribir la tuya.
3. **Periodicidad** — Único, Mensual, Bimestral, Por ciclo o Anual. Esto es lo que decide cómo se prorratea al costo del ciclo.
4. **Monto ($)** y **Cantidad**.
5. **Notas**.
6. Guardá.

> La periodicidad importa más que el monto. Un gasto anual cargado como mensual
> multiplica por doce el costo por gramo y te hace cobrar de más.

### Cargar un insumo al inventario

**Dónde:** `Econometría › Inventario`

1. **Nombre** (obligatorio).
2. **Categoría**.
3. **Potencia (W)** — sólo para equipos que consumen. Es de donde sale el cálculo de gramos por vatio en Estadísticas.
4. **Marca** y **Modelo**.
5. **Cantidad** y **Unidad**.
6. **Stock mínimo** — cuando baja de acá, aparece en la lista de faltantes.
7. **Dosis / uso (fertilizantes)** y **Para qué se usa**.
8. **Proveedor** y **Precio ($)**.
9. **Specs / detalle** y **Notas**.
10. Guardá.

El inventario es plata inmovilizada: lo que cargues acá entra en el costo del ciclo.

### Cargar un equipo y su amortización

**Dónde:** `Econometría › Instalaciones`

1. **Nombre** (obligatorio) y **Sistema** — a qué parte de la instalación pertenece.
2. **Proveedor**, **Marca**, **Modelo**.
3. **Precio unit. ($)**, **Cantidad** y **Unidad**.
4. Guardá.

Si estás comparando presupuestos, cada ítem admite varias **ofertas** con
**Proveedor**, **Precio ($)**, **Presentación**, **Foto de la cotización** (sirve la
captura de Mercado Libre) y **Nota**. Elegís una y el precio del ítem se actualiza solo.

> La vida útil del equipo es lo que hace que se amortice en vez de golpear todo el
> costo en un solo ciclo.

### Programar un mantenimiento

**Dónde:** `Econometría › Mantenimiento`

1. **Equipo / insumo del inventario** — o **Equipo (texto libre)** si no está cargado.
2. **Tipo** — qué hay que hacerle.
3. **Frecuencia (días)** — cada cuánto se repite.
4. Guardá. Aparece en el Calendario cuando toca.

### Cargar lo que falta comprar

**Dónde:** `Instalación › Faltantes`

1. **Nombre del insumo** (obligatorio).
2. **Cantidad** y **Unidad**.
3. **Prioridad** — para ordenar la compra.
4. **Categoría**.
5. **Cómo pesa en el costo** — si es un gasto del ciclo o una inversión que se amortiza. Es lo que decide si entra al costo por gramo de una vez o repartido.
6. **Precio estimado (ARS)** y **Link de compra**.
7. **Foto (etiqueta / precio)** — sirve la captura del precio.
8. **Nota**. Guardá.

> Esta lista **no** entra en el costo por gramo. Es lo que pensás gastar, y el costo
> se calcula sobre lo que ya gastaste.

### Armar el tablero eléctrico

**Dónde:** `Instalación › Tablero eléctrico`

Primero el tablero:

1. **Nombre** (obligatorio) y **Ubicación**.
2. **Tensión** y **Acometida (A)**.
3. **Protección general** y **Notas**.

Después una línea por cada carga:

1. **Carga** (obligatorio) — qué alimenta: luces, aire, extractor, bomba.
2. **Tipo** y **Sala**.
3. **Potencia (W)** — de acá sale la corriente y el dimensionamiento.
4. **Corriente (A)**, **Térmica**, **Cable (mm²)** y **Contactor**.
5. **Notas**. Guardá.

> La potencia total que cargues acá es la que Estadísticas usa para los gramos por
> vatio. Si falta una luz, el rendimiento te va a dar mejor de lo que es.

### Configurar la entidad

**Dónde:** `O.N.G. › La entidad`

Se hace una vez. De acá salen los encabezados de todos los documentos que el sistema
genera, así que lo que falte va a aparecer entre corchetes en cada papel.

1. **Razón social** y **CUIT**.
2. **Jurisdicción** y **Organismo de control** — IGJ, Dirección de Personas Jurídicas provincial, el que corresponda.
3. **Fecha de constitución**.
4. **Domicilio**, **Localidad** y **Provincia** de la sede.
5. **Cierre · día** y **Cierre · mes** — el cierre de ejercicio. Define cuándo vence la asamblea ordinaria.
6. **Duración del mandato (años)** y **Mandato vigente desde** — con esto el sistema avisa cuándo hay que renovar autoridades.
7. REPROCANN institucional: **Inscripción** y **Vencimiento**.
8. **Última revisión de libros** — para el aviso trimestral.
9. Topes: **Pacientes**, **Plantas por paciente** y **Predios**. Son los límites contra los que se controla la capacidad.
10. Guardá.

### Cargar una autoridad

**Dónde:** `O.N.G. › Autoridades`

1. **Nombre** y **Cargo**.
2. **Órgano** — Comisión Directiva o Comisión Revisora de Cuentas.
3. **Grupo familiar** — sirve para detectar parentesco cruzado entre autoridades, que es una de las cosas que revisa Coherencia.
4. Guardá.

La lista de autoridades activas es la que después completa sola las designaciones y
los firmantes de las actas.

### Cargar un predio

**Dónde:** `O.N.G. › Predios`

1. **Nombre** y **Dirección**.
2. **Localidad**, **Provincia** y **Municipio**.
3. Marcá si está **georreferenciado** y si el **municipio fue notificado**. Las dos cosas las pide la 1780 y son las que Estado te va a reclamar si faltan.
4. Guardá.

### Marcar los requisitos de la 1780

**Dónde:** `O.N.G. › Estado`

La lista de requisitos de la Resolución 1780 viene cargada. De cada uno marcás si está
cumplido, con qué se acredita y su vencimiento si tiene. Es la lista que después
resume la pantalla de Estado.

> Un tilde dice "lo tengo". El documento en sí se genera desde `Documentos ›
> Plantillas institucionales`.

### Dar de alta un libro rubricado

**Dónde:** `O.N.G. › Libros`

1. **Tipo de libro** — Actas de Comisión Directiva, Actas de Asamblea, Asistencia a reuniones, Actas de Comisión Revisora de Cuentas, Registro de Asociados, Libro Diario, Inventario y Balances.
2. **Número de libro** y **Organismo** que lo rubricó.
3. **Fecha de rúbrica**.
4. **Folios totales** y **Folios usados** — para saber cuánto queda antes de tener que rubricar otro.
5. Guardá.

Cuando cargues un acta vas a elegir en qué libro se asentó y en qué folio.

### Generar una plantilla institucional

**Dónde:** `O.N.G. › Documentos › Plantillas institucionales`

1. Elegí cuál: designación de Director Médico, designación de Responsable Técnico, comodato de sede, comodato de predio, informe de genéticas o mandato.
2. Completá lo que pida: quién ocupa el cargo, la matrícula, quién cede el inmueble o su dirección.
3. **Generar**. Sale el documento redactado, listo para imprimir y firmar.

Se completan solas con lo que ya está cargado. Las designaciones remiten al acta de
Comisión Directiva más reciente; el informe de genéticas declara las variedades del
banco.

> Lo que falte sale entre corchetes. Cargalo y volvé a generar el documento en vez de
> completarlo a mano, así queda igual la próxima vez.

### Generar el informe del Director Médico

**Dónde:** `O.N.G. › Seguimiento`

1. Elegí el **semestre** en el panel del Director Médico. Sólo aparecen los períodos con movimiento.
2. Revisá lo que muestra por paciente: diagnóstico, lotes entregados, curva de alivio, efectos adversos y entregas sin reporte.
3. **Informe semestral** genera el documento con todo eso ordenado.
4. El profesional agrega su dictamen y lo firma.

> Con menos de tres reportes de un paciente el informe no declara tendencia: dice
> cuántos faltan. Dos puntos no son una tendencia.

### Cargar un paciente

**Dónde:** `O.N.G. › Pacientes › botón Paciente`

1. **Nombre completo** (obligatorio).
2. **DNI**, **Nacimiento**, **Teléfono**, **Email**.
3. **Localidad**, **Provincia**, **Domicilio**.
4. REPROCANN: **N° de registro**, **Estado** (Vigente, En trámite, Vencido, Rechazado), **Emisión** y **Vencimiento**.
5. **Modalidad** — Cultivo propio, Cultivo solidario o Tercero/ONG.
6. **Plantas habilitadas**, **m² habilitados** y **Tope mensual (g)**.
7. **Patología / Indicación**, **Médico tratante** y **Matrícula**.
8. **Credencial (PDF)** y **Foto**.
9. **Notas**. Guardá.

> **El tope mensual no lo saltees.** Es contra ese número que se controla el cupo de
> 30 días. Sin él cargado, las reservas del portal salen sin límite y el sistema sólo
> puede avisarte que no puede controlarlo.

Si cargás la credencial en PDF, el sistema puede leerla y completar los campos del
REPROCANN solo. Revisá igual lo que completó antes de guardar.

### Dar de alta un asociado

**Dónde:** `O.N.G. › Asociados`

1. **Nombre** y **DNI**.
2. **Categoría** — de las que tengas definidas.
3. **Paciente vinculado (opcional)** — vinculalo si esta persona además recibe material. Sin esto, el portal no encuentra su ficha de paciente.
4. **Acta que aprobó el alta** — el alta de un socio se resuelve en Comisión Directiva; acá se referencia dónde.
5. **Fecha de alta**.
6. **Vinculación REPROCANN**.
7. Guardá.

> Paciente y asociado son dos fichas distintas. Para reservar hace falta ser las dos
> cosas y tenerlas vinculadas.

### Emitir las cuotas del período

**Dónde:** `O.N.G. › Asociados`

1. Definí el valor de la cuota: **Nombre (como figura en el estatuto)**, **Tipo**, **Valor**, **Categoría (vacío = todas)**, **Acta que la aprobó** y **Vigente desde**.
2. Emití el período. Se genera una cuota por asociado alcanzado.
3. A medida que cobrás, marcá cada una con **Fecha de pago** y **Medio de pago**.

### Crear un lote para dispensar

**Dónde:** `O.N.G. › Autodispensación › Catálogo › botón Lote`

1. **Código** — "LOTE-2026-08-A". Es el que va a figurar en el comprobante.
2. **Producto** — flor, aceite, extracto, tópico u otro.
3. **Gramos totales** y **Aporte por gramo ($)**.
4. **Genética** y **Fecha de elaboración**.
5. Informe cromatográfico: **THC %**, **CBD %**, **Laboratorio** y **Fecha del análisis**.
6. Dejá tildado **Activo** para que aparezca al reservar.
7. Guardá.

> El aporte por gramo tiene que estar por debajo del costo de producción que ves en
> Econometría. Por encima deja de ser reembolso de costos.

### Hacer una reserva

**Dónde:** `O.N.G. › Autodispensación › botón Reservar`

1. **Quién retira** — elegí el paciente. Abajo aparece si está habilitado, con el cupo usado, el reservado y el libre.
2. Si hay bloqueos, resolvelos ahí mismo: **Firmar mandato** si falta la declaración jurada, o la **Encuesta de Seguimiento** si la entrega anterior no tiene reporte.
3. **De qué lote** — la lista muestra los gramos disponibles de cada uno.
4. **Gramos** — el reembolso se calcula solo.
5. **Cómo paga** — transferencia o billetera (adjuntás comprobante) o efectivo en la sede.
6. **Reservar 72 h**. Sale el código y su QR.

### Entregar en la sede

**Dónde:** `O.N.G. › Autodispensación › Reservas`

1. Tocá **Escanear** y leé el QR del paciente. Si no anda la cámara, escribí el código en el buscador.
2. Se abre la entrega con los datos y el chequeo. Si pagó por transferencia y administración todavía no lo verificó, no deja avanzar: el botón **Pago verificado** está en la tarjeta de esa reserva.
3. Si paga en efectivo, tildá que lo cobraste.
4. **Quién entrega** — el nombre de quien atiende.
5. **Confirmar entrega**. Se registra la dispensa, se asienta el reembolso en caja y sale el recibo oficial para imprimir.

### Cargar el reporte de seguimiento

**Dónde:** `O.N.G. › Seguimiento`

1. Buscá la entrega sin reporte.
2. **Alivio de los síntomas** — del 1 (nulo) al 5 (excelente).
3. **Efectos adversos** — "Ninguno" es excluyente: no podés marcar ninguno y a la vez cefalea.
4. **Dosis que usó realmente** — "3 gotas cada 8 hs", "0,3 g vaporizado a la noche".
5. **Observaciones sobre su calidad de vida**.
6. Guardá.

> Una vez guardado no se edita ni se borra, y la base lo rechaza aunque se intente.
> Revisalo antes: es la evidencia que va al informe del Director Médico.

### Asentar un movimiento de caja

**Dónde:** `O.N.G. › Seguimiento › Libro de Caja`

1. **Fecha** y **Tipo** — ingreso o egreso.
2. **Concepto** — ingresos: reembolso de costos operativos, cuota social, donación. Egresos: compra de insumos, servicios, honorarios, impuestos y tasas.
3. **Monto** y **Medio**.
4. **Detalle** y **Notas**. Guardá.

Las entregas se asientan solas al confirmarlas. Acá cargás todo lo demás.

### Cargar un documento

**Dónde:** `O.N.G. › Documentos`

1. **Tipo** — emitido o recibido.
2. **Clase** — qué documento es.
3. **Fecha**, **Número**, **Descripción**.
4. **Monto** y **Rubro**; **Proveedor** si es un gasto.
5. Vinculalo con lo que corresponda: **Asociado**, **Paciente** o **Dispensa que respalda**.
6. **Archivo** — subí el PDF o la foto.
7. Guardá.

### Redactar un acta

**Dónde:** `O.N.G. › Actas`

1. **Tipo** — Comisión Directiva, Asamblea Ordinaria, Asamblea Extraordinaria o Comisión Revisora de Cuentas.
2. **Número** y **Fecha**; **Hora inicio** y **Hora fin**.
3. **Lugar**.
4. Marcá los **asistentes** de la lista. El contador te dice si llegás al **quórum requerido**.
5. **Orden del día** — cada punto tratado.
6. **Firmantes**.
7. **Libro donde se asentó** y **Estado** — borrador, firmada, en libro o inscripta.
8. Generá el acta: sale redactada para transcribir al libro. Lo que falte queda entre corchetes.

### Presentar la DDJJ semestral

**Dónde:** `O.N.G. › Declaraciones`

1. **Período** y **Fecha de presentación**.
2. **Plantas en total** y **En floración**.
3. **Pacientes vinculados**.
4. **Variedades usadas**.
5. **Notas**. Marcá como presentada cuando la entregues.

### Registrar un traslado

**Dónde:** `O.N.G. › Declaraciones › Traslados`

1. **Fecha**, **Hora de salida** y **Hora de llegada**.
2. **Paciente** — por quién se traslada el material.
3. **Qué se traslada** y **Cantidad**. El tope cambia según el tipo: 40 g de flores, 6 frascos, y las plantas no tienen tope fijo.
4. **Origen**, **Destino** y **Ruta**.
5. **Transportista** y **DNI del transportista**.
6. **Destinatario final**.
7. Guardá y generá la guía de tránsito para llevar impresa.

### Editar o borrar cualquier cosa

Todo lo que se carga se puede corregir y borrar desde donde se ve: el lápiz edita,
el tacho borra. Lo que el sistema no deja borrar tiene una razón y te la dice:

- Un **reporte de seguimiento** no se edita ni se borra nunca.
- Un **lote con reservas** no se borra: se desactiva, así el historial no pierde de dónde salió el material.
- Una **reserva entregada** no se borra: es el respaldo de una dispensa registrada.

Si algo no se puede corregir desde su pantalla, `Tablas` lo edita celda por celda.

### Exportar e importar

**Dónde:** `Tablas`, o los botones **Export** / **Import** de cada pantalla

Export baja lo que estés viendo. Import lo vuelve a subir, y sirve para cargar en
tanda desde una planilla en vez de uno por uno.

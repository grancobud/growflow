# Manual de operación de GrowFlow

El recorrido completo del sistema en el orden en que se usa de verdad: primero lo
que se configura una sola vez, después el día a día del cultivo, y al final el
circuito de la ONG que termina en una entrega con su recibo.

Está escrito para la operación real, no como lista de funciones. Donde el sistema
bloquea, explica por qué bloquea.

> Versión navegable (misma información, más cómoda de leer):
> https://claude.ai/code/artifact/c42ceb8a-6429-42a0-96bb-3757c0a35545

---

## 00 · Cómo está organizado

Once secciones en el menú. Cuatro agrupan varias pantallas adentro, con sus propias
pestañas arriba. La regla de dónde vive cada cosa: **lo que pasa con las plantas
está en Cultivo, lo que cuesta plata está en Econometría, y lo que rinde cuentas
ante un organismo está en O.N.G.**

| Sección | Qué vive adentro | Para qué se entra |
|---|---|---|
| **Panel** | — | Plantas activas, en floración, riegos de hoy, gramos cosechados. |
| **Cultivo** | Plantas · Genéticas · Línea de tiempo · Sala | Todo lo que le pasa a una planta desde que germina hasta que se corta. |
| **Cosecha** | — | Cargar los gramos que dio cada variedad y comparar rendimientos. |
| **Ambiente** | — | Sensores en vivo, estado de cada equipo, si los valores están en rango. |
| **Calendario** | — | Ver y planificar riegos, podas, fumigaciones y cosechas. |
| **Calculadora Fertilizantes** | Calculadora · Mi plan · Sustancias · Ratios y costo · Más herramientas | Sacar la receta de sales para un perfil objetivo y su costo. |
| **Instalación** | Hardware DIY · Riego · Tablero eléctrico · Faltantes | Cómo está armado el equipamiento y qué falta comprar. |
| **Econometría** | Resumen · Costos · Inventario · Mantenimiento · Instalaciones | Qué cuesta producir un gramo y de dónde sale ese número. |
| **O.N.G.** | 15 pestañas, de Estado a Predios | Pacientes, entregas, libros, actas y todo lo que pide la Resolución 1780. |
| **Estadísticas** | — | Rendimiento por genética, gramos por vatio, merma de secado. |
| **Tablas** | — | Los datos crudos de cualquier tabla, editables celda por celda. |

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

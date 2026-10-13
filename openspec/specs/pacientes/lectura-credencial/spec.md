# pacientes/lectura-credencial Specification

## Purpose
Autocompletar la ficha del paciente leyendo el PDF de su credencial REPROCANN con un lector local, sin que una falla del lector ni una lectura parcial le hagan perder trabajo a quien carga.

## Requirements

### Requirement: Botón visible solo con lector configurado
El sistema SHALL mostrar la opción «Subir credencial PDF y autocompletar» únicamente cuando la instalación tiene configurada la dirección del lector. Sin esa configuración, la opción MUST NOT aparecer y la ficha se carga a mano como siempre.

#### Scenario: Instalación sin lector
- **WHEN** la instalación no tiene configurada la dirección del lector
- **THEN** la ficha del paciente no muestra la opción de autocompletar

#### Scenario: Instalación con lector
- **WHEN** la instalación tiene configurada la dirección del lector
- **THEN** la ficha del paciente muestra la opción de autocompletar

### Requirement: Lector no disponible
Cuando el lector no se puede usar —sin conexión, servicio caído, error del servidor, servicio no encontrado o demasiadas solicitudes— el sistema SHALL avisar «El lector de credenciales no está disponible, cargá a mano» y MUST NOT mostrar códigos HTTP ni mensajes técnicos.

#### Scenario: Túnel o n8n caídos
- **WHEN** el lector responde con un error de servidor (por ejemplo 502, 503 o 504)
- **THEN** se muestra «El lector de credenciales no está disponible, cargá a mano»
- **AND** el formulario queda como estaba

#### Scenario: Sin red
- **WHEN** la solicitud al lector no llega a destino
- **THEN** se muestra el mismo aviso de «no disponible»

### Requirement: Tiempo máximo de espera
El sistema SHALL abandonar la lectura si el lector no responde en 60 segundos y tratarlo como «no disponible».

#### Scenario: Lector colgado
- **WHEN** pasan 60 segundos sin respuesta del lector
- **THEN** la lectura se cancela, el indicador de «leyendo» se apaga y se muestra el aviso de «no disponible»

### Requirement: Credencial no reconocida
Cuando el lector responde pero no se obtiene ningún dato útil —respuesta ilegible, rechazo del documento o ningún campo reconocido—, o el PDF no se puede abrir, el sistema SHALL avisar que no se reconocieron datos en la credencial y sugerir revisar el archivo o cargar a mano. Este aviso MUST ser distinto del de «no disponible».

#### Scenario: PDF que no es una credencial
- **WHEN** el lector responde sin ningún campo reconocido
- **THEN** se muestra «No se reconocieron datos en el PDF. Revisá que sea la credencial REPROCANN o cargá a mano.»

#### Scenario: Respuesta ilegible
- **WHEN** la respuesta del lector no es un JSON válido
- **THEN** se muestra el aviso de «no reconocido»

### Requirement: No pisar lo ya escrito
El autocompletado SHALL llenar solo los campos vacíos del formulario. Un campo con contenido MUST conservar su valor aunque el lector devuelva otro. El estado REPROCANN «En tramite» —el valor por defecto de una ficha nueva— cuenta como vacío. Los valores leídos que no son válidos para el campo (fecha con otro formato, estado o modalidad fuera de la lista) MUST NOT aplicarse.

#### Scenario: DNI ya tipeado
- **WHEN** la persona escribió un DNI y el lector devuelve otro
- **THEN** el DNI del formulario queda como lo escribió la persona

#### Scenario: Campos vacíos
- **WHEN** el formulario tiene vacíos el domicilio y la patología y el lector los devuelve
- **THEN** ambos campos se completan con lo leído

#### Scenario: Estado por defecto
- **WHEN** el estado REPROCANN está en «En tramite» y el lector devuelve «Vigente»
- **THEN** el estado pasa a «Vigente»

#### Scenario: Aviso de resultado
- **WHEN** la lectura completa algunos campos y deja otros como estaban
- **THEN** el aviso de éxito indica cuántos campos se completaron y cuántos ya tenían datos

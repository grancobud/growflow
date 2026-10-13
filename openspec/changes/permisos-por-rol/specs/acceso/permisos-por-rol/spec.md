# Spec Delta

## Purpose

Definir qué ve y qué puede modificar cada rol de GrowFlow —historia clínica, padrón de pacientes y recursos— y garantizar que la pantalla y la base de datos apliquen exactamente las mismas reglas, para que nada se muestre roto ni quede abierto por la API.

## ADDED Requirements

### Requirement: Historia clínica
Los roles administrador, administrador del sistema, director médico y administrativo SHALL ver y editar la historia clínica y el seguimiento médico. Los demás roles MUST NOT verlos, ni en la pantalla ni consultando la base directamente.

#### Scenario: Administrativo abre el seguimiento médico
- **WHEN** una persona con rol administrativo abre la pestaña Seguimiento
- **THEN** ve las fichas de seguimiento cargadas, no una lista vacía

#### Scenario: Cultivador consulta la API
- **WHEN** una persona con rol cultivador pide la historia clínica directamente a la base
- **THEN** recibe cero filas

### Requirement: Padrón de pacientes
Los roles administrador, administrador del sistema, director médico, administrativo y auditor SHALL ver la pestaña Pacientes y la nómina. El auditor MUST verlos en solo lectura.

#### Scenario: Auditor ve el padrón
- **WHEN** una persona con rol auditor abre la O.N.G.
- **THEN** ve la pestaña Pacientes con el nombre, el DNI y el estado REPROCANN de cada persona

#### Scenario: Director de cultivo
- **WHEN** una persona con rol director de cultivo abre la O.N.G.
- **THEN** no ve la pestaña Pacientes ni la nómina

### Requirement: Datos de salud solo para lo clínico
La patología, el médico tratante, su matrícula y la credencial REPROCANN SHALL llegar solo a los roles que ven la historia clínica. Para el resto MUST llegar vacíos, también por la API.

#### Scenario: Auditor no ve la patología
- **WHEN** una persona con rol auditor abre la ficha de un paciente
- **THEN** la patología, el médico, la matrícula y la credencial aparecen vacíos

#### Scenario: Auditor consulta la tabla directamente
- **WHEN** una persona con rol auditor pide la tabla de pacientes a la base sin pasar por la pantalla
- **THEN** recibe cero filas

### Requirement: Quién modifica el padrón
Solo los roles que editan lo clínico SHALL dar de alta y editar pacientes, y solo los administradores SHALL borrarlos. La pantalla MUST NOT ofrecer un botón que la base va a rechazar.

#### Scenario: Auditor en Pacientes
- **WHEN** una persona con rol auditor abre la pestaña Pacientes
- **THEN** no ve los botones de alta, edición ni borrado

#### Scenario: Director médico intenta borrar
- **WHEN** una persona con rol director médico abre la ficha de un paciente
- **THEN** ve el botón de editar pero no el de borrar

### Requirement: Recursos
Los roles administrador, administrador del sistema, administrativo, auditor y mostrador SHALL ver los recursos de la asociación (caja y comprobantes). El director médico, el cultivador y el director de cultivo MUST NOT verlos.

#### Scenario: Director médico
- **WHEN** una persona con rol director médico abre la O.N.G.
- **THEN** no ve las pestañas de movimientos ni de economía

### Requirement: Pantalla y base coinciden
Para cada rol, lo que la pantalla ofrece SHALL coincidir con lo que la base permite. Un cambio de permisos en un solo lado MUST hacer fallar el CI.

#### Scenario: Se agrega un rol a lo clínico solo en la pantalla
- **WHEN** alguien le da permiso clínico a un rol en la pantalla y no en la base
- **THEN** la prueba de coincidencia falla y el PR no se puede mergear

### Requirement: Sin perfil activo no se ve nada
Una cuenta sin perfil, con el perfil inactivo o con el rol demo SHALL recibir cero filas de pacientes, historia clínica y recursos.

#### Scenario: Cuenta nueva sin habilitar
- **WHEN** alguien se registra y todavía no fue habilitado
- **THEN** la base le devuelve cero pacientes

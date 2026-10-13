# Proposal

## Why

El autocompletado desde la credencial REPROCANN depende de una cadena local (túnel → n8n → Ollama) que se cae seguido. Cuando se cae, la ficha del paciente muestra «No se pudo leer la credencial: OCR HTTP 502», un mensaje técnico que no le dice a quien carga qué hacer. Además, cuando el OCR sí responde, **pisa lo que la persona ya había escrito** en el formulario (hoy gana el dato leído sobre el tipeado).

## What Changes

- Mensaje claro cuando el lector no está disponible: «El lector de credenciales no está disponible, cargá a mano».
- Distinguir «no disponible» (servicio caído, sin red, timeout, error del servidor) de «no reconocido» (el servicio respondió pero no sacó datos útiles del PDF).
- Timeout de 60 s: si el lector no contesta en ese tiempo, se corta y se informa como «no disponible», en vez de dejar el botón girando indefinidamente.
- El autocompletado **solo llena campos vacíos**; lo que ya estaba escrito no se toca. El aviso de éxito dice cuántos campos completó y cuántos dejó como estaban.
- El botón de autocompletar sigue oculto si la instalación no tiene configurado el lector (`VITE_OCR_WEBHOOK_URL`); se agrega un test que lo fija.

**Fuera del alcance:**
- Arreglar o monitorear la cadena n8n/Ollama/túnel en sí.
- Reintentos automáticos o cola de lecturas pendientes.
- Leer credenciales en imagen (JPG/PNG); sigue siendo solo PDF.
- Mostrar un diff campo por campo de lo leído contra lo escrito.

## Capabilities

### New Capabilities
- `pacientes/lectura-credencial`: autocompletado de la ficha del paciente a partir del PDF de la credencial REPROCANN — disponibilidad del lector, clasificación de errores, timeout y reglas de fusión con lo ya escrito.

### Modified Capabilities

## Impact

- `app/src/lib/ocr.ts`: errores tipados, timeout, separación de la llamada al lector para poder testearla sin navegador.
- Nuevo `app/src/lib/fusionCredencial.ts`: la regla de «solo llenar vacíos», como función pura.
- `app/src/pages/PaginaPacientes.tsx`: usa la fusión y los mensajes nuevos.
- Tests nuevos en `app/src/lib/__tests__/`.
- Sin cambios de base de datos, ni de RLS, ni de dependencias.

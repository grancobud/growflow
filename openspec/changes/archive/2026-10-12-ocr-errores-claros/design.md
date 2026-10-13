# Design

## Context

`leerCredencial(file)` en `app/src/lib/ocr.ts` hace dos cosas pegadas: renderiza la primera página del PDF con pdf.js (necesita `document` y `canvas`) y hace el `fetch` al webhook. Lanza `Error('OCR HTTP 502')` ante cualquier `!res.ok`, no tiene timeout, y la fusión con el formulario vive inline en `PaginaPacientes.tsx` con `d.campo || f.campo`, que le da prioridad a lo leído. Los tests corren con vitest en `environment: 'node'`, sin DOM.

## Goals / Non-Goals

**Goals:**
- Que todo el comportamiento de la spec se pueda testear sin navegador.
- Un único lugar que decida el texto que ve el usuario para cada falla.

**Non-Goals:**
- Cambiar el contrato del webhook (`{ image }` → `{ datos }` o el objeto plano).
- Tocar el render del PDF ni la subida del archivo a Storage.

## Decisions

**1. Separar `enviarAlLector(imagen, opciones)` de `leerCredencial(file)`.** La primera recibe la imagen ya en base64, el `fetch` y el timeout inyectables, y es la que se testea. `leerCredencial` queda como composición: `pdfAImagen` + `enviarAlLector`. Alternativa descartada: mockear pdf.js y canvas en node; es frágil y no aporta nada a lo que se quiere probar.

**2. Error tipado `ErrorLectorCredencial` con `tipo: 'no_disponible' | 'no_reconocido'`**, y el mensaje para el usuario en el propio error. La pantalla solo hace `toast.error(err.message)`. Clasificación:
- `no_disponible`: el `fetch` rechaza (sin red, CORS, DNS), timeout (abort), HTTP 5xx, 404, 408, 429.
- `no_reconocido`: el resto de los 4xx (400, 413, 422…), cuerpo no JSON, cero campos reconocidos, o falla al abrir el PDF.

Alternativa descartada: devolver un objeto `{ ok, error }`. Rompe el `try/catch` existente y obliga a revisar cada llamada.

**3. Timeout con `AbortController` + `setTimeout` (60 s por defecto, inyectable).** Se prefiere a `AbortSignal.timeout()` porque se testea con fake timers de vitest sin depender de la implementación del runtime.

**4. Fusión como función pura `fusionarCredencial(form, datos)` en `lib/fusionCredencial.ts`**, genérica sobre el subconjunto de campos de la credencial, que devuelve `{ form, completados, conservados }`. Las validaciones de formato (fecha `AAAA-MM-DD`, estado y modalidad dentro de las listas de `lib/registro.ts`) se mueven ahí tal cual. Así la regla «no pisar» queda testeada y no duplicada en la página.

**5. «Vacío» = string que queda vacío después de `trim()`**, y además `'En tramite'` para `reprocann_estado`, porque es el valor que la ficha nueva pone por defecto, no un dato que alguien eligió. Contrapartida aceptada: si una ficha existente estaba de verdad «En tramite» y la credencial dice «Vigente», el estado se actualiza, que es lo correcto.

## Risks / Trade-offs

- [El webhook podría responder 200 con un campo de error dentro del JSON] → se cubre igual: sin campos reconocidos, cae en «no reconocido».
- [Una ficha con un dato viejo y equivocado ya no se corrige subiendo la credencial] → es el comportamiento pedido; el aviso dice cuántos campos se conservaron, para que la persona revise.
- [Un `fetch` que no respeta el `AbortSignal`] → los navegadores soportados lo respetan; el test usa un fetch falso que sí lo respeta.

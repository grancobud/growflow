# Tasks

## 1. Errores claros y timeout del lector (`lib/ocr.ts`)

- [x] 1.1 Escribir `app/src/lib/__tests__/lectorCredencial.test.ts` con los casos de «no disponible» (fetch rechaza, 502, 503, 504, 404, 429, timeout de 60 s con fake timers) y de «no reconocido» (400, 422, cuerpo no JSON, cero campos), más el caso feliz con `{ datos }` y con objeto plano. Verificar que falla: `npm --prefix app test -- lectorCredencial`.
- [x] 1.2 Implementar `ErrorLectorCredencial`, los mensajes, `enviarAlLector()` con `AbortController` y dejar `leerCredencial()` como `pdfAImagen` + `enviarAlLector`, con la falla de pdf.js como «no reconocido». Verificar: el test de 1.1 pasa.
- [x] 1.3 Test de que `OCR_DISPONIBLE` es `false` sin `VITE_OCR_WEBHOOK_URL` y `true` con ella (`vi.stubEnv` + `vi.resetModules`). Verificar: pasa.

## 2. No pisar lo ya escrito (`lib/fusionCredencial.ts`)

- [x] 2.1 Escribir `app/src/lib/__tests__/fusionCredencial.test.ts`: campo escrito se conserva, vacío o solo espacios se completa, «En tramite» cuenta como vacío, fecha/estado/modalidad inválidos no se aplican, números se pasan a texto, conteo de completados y conservados. Verificar que falla.
- [x] 2.2 Implementar `fusionarCredencial()`. Verificar: el test de 2.1 pasa.

## 3. Pantalla de pacientes

- [x] 3.1 En `PaginaPacientes.tsx`, reemplazar la fusión inline por `fusionarCredencial()`, mostrar `err.message` del error tipado y armar el aviso de éxito con completados y conservados (si no completó nada, avisar eso en vez del éxito). Verificar: `npm --prefix app run lint` sin warnings.

## 4. Verificación final

- [x] 4.1 Correr `npm --prefix app test`, `npm --prefix app run lint` y `npm --prefix app run build`, y mostrar el resultado.

## Workflow follow-up

- Después de mergear: `openspec archive ocr-errores-claros` para pasar el delta a `openspec/specs/`.

// La fecha del calendario de quien está usando la app, no la de Greenwich.
//
// POR QUE EXISTE (16/09/2026)
//
// Toda la app sacaba «hoy» con `new Date().toISOString().slice(0, 10)`. Eso es la
// fecha en UTC, y Argentina está tres horas atrás: desde las 21:00 hasta la
// medianoche, UTC ya es mañana. Una entrega cargada a las 22 h del 08/09 quedaba
// con fecha 09/09. Pasó de verdad, en tres entregas y sus asientos de caja, y se
// vio recién al comparar contra la planilla.
//
// `toISOString()` convierte a UTC antes de cortar, así que también estaba mal
// sobre fechas armadas en hora local (`new Date(iso + 'T00:00:00')`, `setDate`,
// `setMonth`): en Argentina daba bien por casualidad —medianoche local son las
// 03:00 UTC del mismo día— y en cualquier huso positivo devolvía el día anterior.
//
// Acá se lee con los getters LOCALES, que son los que usan `setDate` y
// `new Date(...'T00:00:00')`. Un solo criterio para armar y para leer.
//
// ⚠️ NO usar esto para un timestamp (`creado_en`, `mandato_hora`): ahí va
// `toISOString()` entero, que conserva la hora y la zona.

const dos = (n: number) => String(n).padStart(2, '0')

/** `YYYY-MM-DD` de esa fecha en la hora local del dispositivo. */
export function fechaLocal(d: Date): string {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}

/** `YYYY-MM-DD` de hoy en la hora local del dispositivo. */
export const hoyLocal = (): string => fechaLocal(new Date())

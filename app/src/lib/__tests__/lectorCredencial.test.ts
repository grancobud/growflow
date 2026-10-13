// El lector de credenciales depende de una cadena local (túnel → n8n → Ollama)
// que se cae seguido. Antes, cualquier falla terminaba en «OCR HTTP 502»: un
// código que no le dice nada a quien carga la ficha. Estos tests fijan las dos
// clases de falla que ve el usuario —«no disponible» y «no reconocido»— y el
// timeout de 60 s, para que el botón no quede girando para siempre.
//
// Spec: openspec/changes/ocr-errores-claros/specs/pacientes/lectura-credencial

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  enviarAlLector, ErrorLectorCredencial,
  MENSAJE_NO_DISPONIBLE, MENSAJE_NO_RECONOCIDO, TIMEOUT_LECTOR_MS,
} from '../ocr'

const URL = 'https://lector.test/webhook/ocr'

const respuesta = (status: number, cuerpo: unknown) =>
  new Response(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo), { status })

const conFetch = (f: typeof fetch) => enviarAlLector('aW1n', { url: URL, fetch: f })

async function errorDe(p: Promise<unknown>): Promise<ErrorLectorCredencial> {
  try { await p } catch (e) { return e as ErrorLectorCredencial }
  throw new Error('se esperaba que fallara')
}

afterEach(() => { vi.useRealTimers() })

describe('lector de credenciales: no disponible', () => {
  it.each([502, 503, 504, 500, 404, 408, 429])('HTTP %i es «no disponible»', async status => {
    const e = await errorDe(conFetch(async () => respuesta(status, 'Bad Gateway')))
    expect(e).toBeInstanceOf(ErrorLectorCredencial)
    expect(e.tipo).toBe('no_disponible')
    expect(e.message).toBe(MENSAJE_NO_DISPONIBLE)
  })

  it('sin red (fetch rechaza) es «no disponible»', async () => {
    const e = await errorDe(conFetch(async () => { throw new TypeError('Failed to fetch') }))
    expect(e.tipo).toBe('no_disponible')
  })

  it('el mensaje no muestra códigos HTTP', async () => {
    const e = await errorDe(conFetch(async () => respuesta(502, '')))
    expect(e.message).not.toMatch(/HTTP|\d{3}/)
    expect(MENSAJE_NO_DISPONIBLE).toBe('El lector de credenciales no está disponible, cargá a mano')
  })

  it('corta a los 60 s y lo informa como «no disponible»', async () => {
    vi.useFakeTimers()
    expect(TIMEOUT_LECTOR_MS).toBe(60_000)
    // Un fetch que nunca contesta, salvo que lo aborten.
    const colgado: typeof fetch = (_u, init) => new Promise((_, rechazar) => {
      init?.signal?.addEventListener('abort', () => rechazar(new DOMException('abort', 'AbortError')))
    })
    const p = errorDe(conFetch(colgado))
    await vi.advanceTimersByTimeAsync(59_999)
    let resuelto = false
    void p.then(() => { resuelto = true })
    await Promise.resolve()
    expect(resuelto).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    const e = await p
    expect(e.tipo).toBe('no_disponible')
  })
})

describe('lector de credenciales: no reconocido', () => {
  it.each([400, 413, 422])('HTTP %i es «no reconocido»', async status => {
    const e = await errorDe(conFetch(async () => respuesta(status, { error: 'x' })))
    expect(e.tipo).toBe('no_reconocido')
    expect(e.message).toBe(MENSAJE_NO_RECONOCIDO)
  })

  it('cuerpo que no es JSON es «no reconocido»', async () => {
    const e = await errorDe(conFetch(async () => respuesta(200, '<html>oops</html>')))
    expect(e.tipo).toBe('no_reconocido')
  })

  it('ningún campo reconocido es «no reconocido»', async () => {
    const e = await errorDe(conFetch(async () => respuesta(200, { datos: { nombre_completo: '', otro: 'x' } })))
    expect(e.tipo).toBe('no_reconocido')
  })

  it('los dos mensajes son distintos', () => {
    expect(MENSAJE_NO_RECONOCIDO).not.toBe(MENSAJE_NO_DISPONIBLE)
  })
})

describe('lector de credenciales: respuesta buena', () => {
  it('devuelve los datos envueltos en { datos }', async () => {
    const d = await conFetch(async () => respuesta(200, { datos: { dni: '30123456' } }))
    expect(d.dni).toBe('30123456')
  })

  it('devuelve los datos como objeto plano', async () => {
    const d = await conFetch(async () => respuesta(200, { nombre_completo: 'Ana Gómez', plantas_habilitadas: 9 }))
    expect(d.nombre_completo).toBe('Ana Gómez')
    expect(d.plantas_habilitadas).toBe(9)
  })

  it('manda la imagen por POST en JSON', async () => {
    const f = vi.fn(async () => respuesta(200, { dni: '1' }))
    await conFetch(f as unknown as typeof fetch)
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(URL)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ image: 'aW1n' })
  })
})

// El botón de autocompletar se dibuja con `OCR_DISPONIBLE`. Una instalación sin
// lector (Aguara, Chaco) no tiene que ofrecer un botón que siempre falla.
describe('lector de credenciales: disponibilidad', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

  it('sin VITE_OCR_WEBHOOK_URL no se ofrece', async () => {
    vi.stubEnv('VITE_OCR_WEBHOOK_URL', '')
    vi.resetModules()
    const { OCR_DISPONIBLE } = await import('../ocr')
    expect(OCR_DISPONIBLE).toBe(false)
  })

  it('con VITE_OCR_WEBHOOK_URL se ofrece', async () => {
    vi.stubEnv('VITE_OCR_WEBHOOK_URL', URL)
    vi.resetModules()
    const { OCR_DISPONIBLE } = await import('../ocr')
    expect(OCR_DISPONIBLE).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { hayQueRecargarPerfil, PERMISOS_ROL } from '../useAuth'

// LA REGLA QUE DECIDE CUANTAS CONSULTAS HACE LA APP.
//
// `useAuth()` se llama en diez lugares. Hasta el 04/09/2026 cada uno tenia su
// propia suscripcion a `onAuthChange` y su propia copia del perfil, asi que un
// evento de sesion disparaba diez recargas. Se paso a un store de modulo: una
// suscripcion, una copia. Lo que queda por decidir es CUANDO ese unico oyente
// tiene que volver a la base, y es esto.
//
// Se prueba aparte del hook a proposito. El resto de la suite son funciones
// puras y no hay ni un `vi.mock` en el proyecto; montar React y falsear Supabase
// para verificar una comparacion de strings seria mas maquinaria que regla.
const sesion = (id: string) => ({ user: { id } })

describe('hayQueRecargarPerfil', () => {
  it('la primera vez, con el perfil sin cargar, hay que traerlo', () => {
    expect(hayQueRecargarPerfil(sesion('u1'), null, false)).toBe(true)
  })

  it('el MISMO usuario no dispara nada, y ese es el arreglo', () => {
    // Es el caso que pasaba cada dos segundos: Supabase reemite la sesion al
    // refrescar el token y al volver a la pestana. No cambio nadie.
    expect(hayQueRecargarPerfil(sesion('u1'), 'u1', true)).toBe(false)
  })

  it('si cambia el usuario, se trae todo de nuevo', () => {
    // Dos personas en la misma computadora. Quedarse con el perfil anterior
    // seria mostrarle a una los permisos de la otra.
    expect(hayQueRecargarPerfil(sesion('u2'), 'u1', true)).toBe(true)
  })

  it('mismo id pero sin perfil en memoria: se reintenta', () => {
    // La carga anterior fallo —se cayo la red a mitad—. El id quedo puesto pero
    // no hay perfil: sin este caso, la app se quedaria sin permisos para
    // siempre esperando un evento que ya paso.
    expect(hayQueRecargarPerfil(sesion('u1'), 'u1', false)).toBe(true)
  })

  it('sin sesion no se pide nada', () => {
    // El logout lo maneja el llamador, que ademas limpia el estado. Pedir el
    // perfil de alguien que se fue es la consulta mas inutil que hay.
    expect(hayQueRecargarPerfil(null, 'u1', true)).toBe(false)
    expect(hayQueRecargarPerfil(null, null, false)).toBe(false)
  })
})

describe('PERMISOS_ROL sigue exportandose', () => {
  // El hook cambio de forma por dentro (store de modulo + useSyncExternalStore).
  // Este mapa lo importan otros tests y `RutaConPermiso`: que siga saliendo del
  // mismo lugar es parte del contrato que el refactor prometio no tocar.
  it('mostrador ve la caja y NO lo institucional', () => {
    expect(PERMISOS_ROL.mostrador).toContain('ver_plata')
    expect(PERMISOS_ROL.mostrador).not.toContain('ver_institucional')
  })
})

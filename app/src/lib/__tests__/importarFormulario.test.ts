// Lo que el formulario mete en la columna equivocada no entra a la base.
//
// El caso real: el mapeo automatico del importador elige la columna por
// parecido de nombre, y la pregunta «¿Tenes REPROCANN?» contiene la palabra
// «reprocann», asi que cae en `reprocann_nro`. Lo que se guardo no fue un
// numero sino la opcion del desplegable. En la base de Panacea quedaron ocho
// fichas con textos como «NO TENGO, QUIERO RECIBIR INFO AL RESPECTO» adentro
// del campo del numero.
//
// Y no era cosmetico: un `reprocann_nro` no vacio dejaba la ficha «En tramite»,
// que es el estado con el que la app permite dispensar sin marcar la entrega
// como sin respaldo. Alguien que declaro NO tener REPROCANN quedaba habilitado
// a retirar.

import { describe, it, expect } from 'vitest'
import { numeroDeReprocann, documento } from '../datosDelFormulario'

describe('numero de REPROCANN que llega del formulario', () => {
  it('descarta las opciones del desplegable, que no son numeros', () => {
    // Los dos textos exactos que apareceieron en la base de Panacea.
    expect(numeroDeReprocann('NO TENGO, QUIERO RECIBIR INFO AL RESPECTO')).toBeNull()
    expect(numeroDeReprocann('Tengo REPROCANN VIGENTE / VENCIDO/ PENDIENTE')).toBeNull()
    expect(numeroDeReprocann('No tengo reprocann')).toBeNull()
  })

  it('acepta el codigo de credencial con prefijo alfanumerico', () => {
    // Se ven raros pero son reales: diez fichas de Panacea los tienen, todas con
    // plantas y m2 habilitados cargados y varias con entregas hechas. Si el
    // filtro los rechazara, la limpieza borraria REPROCANN validos.
    expect(numeroDeReprocann('c3kKjm4222466')).toBe('c3kKjm4222466')
    expect(numeroDeReprocann('aTEinZf396594')).toBe('aTEinZf396594')
    expect(numeroDeReprocann('0PNIE0w515514')).toBe('0PNIE0w515514')
  })

  it('acepta el numero pelado', () => {
    expect(numeroDeReprocann('283614')).toBe('283614')
  })

  it('no se deja pasar por un numero suelto adentro de una frase corta', () => {
    // Tres digitos no alcanzan para ser un REPROCANN.
    expect(numeroDeReprocann('tengo 2 plantas')).toBeNull()
  })
})

describe('DNI que llega del formulario', () => {
  it('descarta los ceros, que ocupan el lugar del dato', () => {
    // Un DNI en cero es peor que uno vacio: hace que la ficha figure como
    // identificada cuando no lo esta.
    expect(documento('0')).toBeNull()
    expect(documento('00000000000')).toBeNull()
  })

  it('deja pasar el documento escrito con o sin puntos', () => {
    expect(documento('38120886')).toBe('38120886')
    expect(documento('38.120.886')).toBe('38.120.886')
  })

  it('no inventa un numero cuando la persona escribio texto', () => {
    expect(documento('no lo tengo a mano')).toBeNull()
  })
})

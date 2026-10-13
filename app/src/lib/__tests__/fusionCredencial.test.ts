// Autocompletar no puede costarle trabajo a nadie.
//
// Antes, la fusión era `d.campo || f.campo`: si el lector devolvía algo, ganaba
// sobre lo que la persona ya había tipeado. Con un OCR que a veces confunde un
// 8 con un 3, eso pisaba un DNI bien escrito con uno mal leído, sin avisar.
// Ahora el lector solo llena lo vacío.
//
// Spec: openspec/changes/ocr-errores-claros/specs/pacientes/lectura-credencial

import { describe, it, expect } from 'vitest'
import { fusionarCredencial, type CamposCredencialForm } from '../fusionCredencial'

const vacio: CamposCredencialForm = {
  nombre_completo: '', dni: '', fecha_nacimiento: '', telefono: '', email: '',
  localidad: '', provincia: '', domicilio: '', reprocann_nro: '',
  reprocann_estado: 'En tramite', reprocann_emision: '', reprocann_vencimiento: '',
  modalidad: '', plantas_habilitadas: '', m2_habilitados: '',
  patologia: '', medico_tratante: '', matricula_medico: '',
}

describe('fusionarCredencial', () => {
  it('no pisa un campo ya escrito', () => {
    const { form, conservados } = fusionarCredencial({ ...vacio, dni: '30123456' }, { dni: '30128456' })
    expect(form.dni).toBe('30123456')
    expect(conservados).toBe(1)
  })

  it('completa los campos vacíos', () => {
    const { form, completados } = fusionarCredencial(vacio, { domicilio: 'San Martín 123', patologia: 'Dolor crónico' })
    expect(form.domicilio).toBe('San Martín 123')
    expect(form.patologia).toBe('Dolor crónico')
    expect(completados).toBe(2)
  })

  it('un campo con solo espacios cuenta como vacío', () => {
    const { form } = fusionarCredencial({ ...vacio, localidad: '   ' }, { localidad: 'Resistencia' })
    expect(form.localidad).toBe('Resistencia')
  })

  it('«En tramite» cuenta como vacío: es el valor por defecto de la ficha nueva', () => {
    const { form } = fusionarCredencial(vacio, { reprocann_estado: 'Vigente' })
    expect(form.reprocann_estado).toBe('Vigente')
  })

  it('un estado ya elegido no se pisa', () => {
    const { form } = fusionarCredencial({ ...vacio, reprocann_estado: 'Vencido' }, { reprocann_estado: 'Vigente' })
    expect(form.reprocann_estado).toBe('Vencido')
  })

  it('no aplica valores inválidos para el campo', () => {
    const { form, completados } = fusionarCredencial(vacio, {
      fecha_nacimiento: '01/02/1980',
      reprocann_vencimiento: '2027-13',
      reprocann_estado: 'Aprobado',
      modalidad: 'Autocultivo',
    })
    expect(form.fecha_nacimiento).toBe('')
    expect(form.reprocann_vencimiento).toBe('')
    expect(form.reprocann_estado).toBe('En tramite')
    expect(form.modalidad).toBe('')
    expect(completados).toBe(0)
  })

  it('aplica fechas y listas válidas', () => {
    const { form } = fusionarCredencial(vacio, {
      fecha_nacimiento: '1980-02-01', reprocann_emision: '2026-01-10', modalidad: 'Cultivo solidario',
    })
    expect(form.fecha_nacimiento).toBe('1980-02-01')
    expect(form.reprocann_emision).toBe('2026-01-10')
    expect(form.modalidad).toBe('Cultivo solidario')
  })

  it('pasa los números a texto, incluido el cero', () => {
    const { form } = fusionarCredencial(vacio, { plantas_habilitadas: 9, m2_habilitados: 0 })
    expect(form.plantas_habilitadas).toBe('9')
    expect(form.m2_habilitados).toBe('0')
  })

  it('ignora lo que el lector no trae', () => {
    const { form, completados, conservados } = fusionarCredencial({ ...vacio, email: 'a@b.com' }, {})
    expect(form).toEqual({ ...vacio, email: 'a@b.com' })
    expect(completados).toBe(0)
    expect(conservados).toBe(0)
  })

  it('no toca campos del formulario que no son de la credencial', () => {
    const conExtra = { ...vacio, notas: 'algo', socio: true }
    const { form } = fusionarCredencial(conExtra, { dni: '1' })
    expect(form.notas).toBe('algo')
    expect(form.socio).toBe(true)
  })

  it('un valor igual al ya escrito no cuenta como conservado', () => {
    const { conservados } = fusionarCredencial({ ...vacio, dni: '30123456' }, { dni: '30123456' })
    expect(conservados).toBe(0)
  })
})

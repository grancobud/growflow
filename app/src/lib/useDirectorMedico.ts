// Quién firma lo clínico y quién puede verlo.
//
// Junta dos cosas que viven separadas y que la pantalla necesita juntas:
//
//   - El ROL del usuario logueado, para saber si mostrar la historia clínica.
//     La barrera real es el RLS de la base; esto sólo evita ofrecer un botón que
//     va a fallar.
//
//   - El NOMBRE y la MATRÍCULA del Director Médico de la entidad, que es con
//     quien se firman las entradas de evolución. Ojo: no es "el usuario que está
//     escribiendo". El profesional designado es uno solo y firma él, aunque la
//     entrada la tipee un administrativo dictado por teléfono.
//
// Devuelve valores seguros mientras carga: puedeVerClinico arranca en false, así
// que el peor caso es que la sección tarde un instante en aparecer. Al revés
// —arrancar en true— mostraría el botón a quien no corresponde.

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/** Los roles que pasan puede_ver_clinico() en la base. Si cambia allá, cambia acá. */
const ROLES_CLINICOS = ['administrador', 'director_medico']

export interface DatosDirectorMedico {
  nombre: string | null
  matricula: string | null
  puedeVerClinico: boolean
  /** Para que la pantalla pueda distinguir "no puede" de "todavía no sé". */
  cargando: boolean
}

export function useDirectorMedico(): DatosDirectorMedico {
  const [d, setD] = useState<DatosDirectorMedico>({
    nombre: null, matricula: null, puedeVerClinico: false, cargando: true,
  })

  useEffect(() => {
    let vigente = true
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (vigente) setD(x => ({ ...x, cargando: false })); return }

        const [perfil, entidad] = await Promise.all([
          supabase.from('perfiles_usuario').select('rol, activo').eq('id', user.id).maybeSingle(),
          supabase.from('ong_entidad').select('director_medico, director_medico_matricula').limit(1).maybeSingle(),
        ])

        const rol = perfil.data?.rol as string | undefined
        const activo = perfil.data?.activo !== false

        if (vigente) setD({
          nombre: entidad.data?.director_medico ?? null,
          matricula: entidad.data?.director_medico_matricula ?? null,
          puedeVerClinico: !!rol && activo && ROLES_CLINICOS.includes(rol),
          cargando: false,
        })
      } catch {
        // Sin ruido: si falla, la sección no se ofrece y listo. El RLS sigue
        // siendo la barrera de verdad.
        if (vigente) setD({ nombre: null, matricula: null, puedeVerClinico: false, cargando: false })
      }
    })()
    return () => { vigente = false }
  }, [])

  return d
}

import { z } from 'zod'

/**
 * Schemas zod reutilizables para formularios de CannTrace.
 * - Centralizado para mantener validacion consistente
 * - Tipado automatico con z.infer<typeof X>
 * - Mensajes en ES, aplicables con react-hook-form + @hookform/resolvers/zod
 */

// ==================== PRIMITIVES COMUNES ====================

export const emailSchema = z
  .string()
  .min(1, 'El email es requerido')
  .email('Formato de email invalido')
  .max(200, 'Email demasiado largo')

export const nombreSchema = z
  .string()
  .trim()
  .min(2, 'Minimo 2 caracteres')
  .max(100, 'Maximo 100 caracteres')

export const telefonoSchema = z
  .string()
  .trim()
  .regex(/^[\d\s+\-()]*$/, 'Solo numeros, espacios y +-()')
  .max(30)
  .optional()
  .or(z.literal(''))

// ==================== CONTACTOS (landing /contacto) ====================

export const contactoSchema = z.object({
  nombre: nombreSchema,
  empresa: z.string().trim().max(200, 'Maximo 200 caracteres').optional().or(z.literal('')),
  email: emailSchema,
  telefono: telefonoSchema,
  mensaje: z
    .string()
    .trim()
    .min(10, 'Contanos un poco mas (minimo 10 caracteres)')
    .max(5000, 'Maximo 5000 caracteres'),
})

export type ContactoInput = z.infer<typeof contactoSchema>

// ==================== AUTH (password reset) ====================

export const passwordSchema = z
  .string()
  .min(8, 'Minimo 8 caracteres')
  .max(128, 'Maximo 128 caracteres')
  .refine((v) => /[A-Za-z]/.test(v), 'Debe contener al menos una letra')
  .refine((v) => /[0-9]/.test(v), 'Debe contener al menos un numero')

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Las contrasenas no coinciden',
    path: ['confirm'],
  })

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const olvideContrasenaSchema = z.object({
  email: emailSchema,
})

export type OlvideContrasenaInput = z.infer<typeof olvideContrasenaSchema>

// ==================== OPERACION BASE (chat + Forms CUMCS) ====================

export const operacionBaseSchema = z.object({
  tipo_operacion: z.string().min(1, 'Tipo de operacion requerido'),
  fecha_operacion: z
    .string()
    .min(1, 'Fecha requerida')
    .refine((v) => !isNaN(Date.parse(v)), 'Fecha invalida'),
  responsable: nombreSchema.optional(),
  observaciones: z.string().trim().max(2000).optional(),
})

export type OperacionBaseInput = z.infer<typeof operacionBaseSchema>

// ==================== 2FA TOTP ====================

export const totpCodeSchema = z.object({
  code: z
    .string()
    .regex(/^\d{6}$/, 'Ingresa los 6 digitos numericos'),
})

export type TotpCodeInput = z.infer<typeof totpCodeSchema>

// ==================== LOTE (crud admin) ====================

export const loteSchema = z.object({
  codigo_lote: z
    .string()
    .trim()
    .min(3, 'Minimo 3 caracteres')
    .max(100, 'Maximo 100 caracteres'),
  cantidad: z
    .number({ error: 'Debe ser un numero' })
    .min(0, 'No puede ser negativo'),
  estado: z.enum(['activo', 'cuarentena', 'baja', 'procesado', 'consumido'], {
    error: 'Estado invalido',
  }),
  observaciones: z.string().max(2000).optional(),
})

export type LoteInput = z.infer<typeof loteSchema>

# Los mails que manda Auth

`invitacion.html` es el que recibe alguien cuando se lo suma desde
**Panel › Usuarios**: el enlace donde elige su contraseña por primera vez.
`recuperar.html` es el de «olvidé mi contraseña».

Los dos van juntos a propósito. Traducir uno solo deja al **mismo usuario**
recibiendo el sistema en dos idiomas.

## Estado: escritos y NO aplicados

Están redactados, maquetados y versionados, pero la base **sigue mandando el
default de Supabase, en inglés**:

| | hoy |
|---|---|
| Asunto | `You've been invited` |
| Remitente | `noreply@mail.app.supabase.io` |
| Límite de envío | **2 mails por hora** |

Al intentar aplicarlos, la API contesta:

    400 — Email template modification is not available for free tier projects
          using the default email provider.

**No es permisos ni es el token.** En plan free con el mailer por defecto,
Supabase no deja cambiar las plantillas. Se destraba de una sola forma:
configurar un **SMTP propio**.

## Qué falta, y qué destraba

Configurar SMTP propio (Resend da 3.000 mails gratis por mes) resuelve **tres**
cosas de una:

1. Se pueden aplicar estas plantillas.
2. El remitente deja de ser `noreply@mail.app.supabase.io` y pasa a ser una
   dirección de la asociación.
3. Se cae el límite de 2 por hora. **Ese es el más urgente**: invitar a tres
   personas seguidas hace que la tercera no reciba nada, y la app no lo dice
   porque el pedido sale bien. Un mail que no llega se lee como «no me anda el
   link».

La cuenta la crea una persona; el sistema no maneja credenciales. Con la API key
cargada en Supabase, aplicar es un comando.

## Cómo se aplican

Con el MCP `supabase-admin` (`C:\tools\supabase-admin-mcp\server.py`), que ganó
las tools `auth_mails_get` y `auth_mails_update` el 31/08/2026:

    auth_mails_update(project_id='TU_PROJECT_ID', plantilla='invitacion',
                      asunto='Te sumaron a GrowFlow',
                      html_path='supabase/mails/invitacion.html')

Se usa `html_path` y no `html`: el cuerpo son miles de caracteres y pasarlos como
argumento los mete enteros en la conversación.

## Al editar el HTML

- **El enlace va como `{{ .ConfirmationURL }}`**, llaves dobles. Es un template
  de Go. Un cuerpo sin esa variable se guarda igual, sin error, y manda un mail
  **sin enlace** — la tool lo rechaza justamente por eso.
- **HTML de mail, no HTML de web**: tablas y estilos inline. Nada de flexbox,
  grid ni `<style>`; los clientes de correo no los soportan de forma pareja.
- **El logo puede no cargar.** Gmail y varios bloquean imágenes remotas por
  defecto, así que el mail tiene que leerse entero sin él: por eso el nombre va
  también en texto y la imagen lleva `alt`.
- **Fondo claro a propósito**, aunque la app sea oscura: varios clientes invierten
  colores en modo oscuro y un diseño oscuro se vuelve ilegible. La marca entra
  por el encabezado, que sí es oscuro.
- Debajo del botón va **la URL en texto**, para cuando el botón no funciona.

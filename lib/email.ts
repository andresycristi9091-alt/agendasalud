type BookingEmailParams = {
  patientName: string
  patientEmail: string
  professionalName: string
  specialty: string
  centerName: string
  date: string
  startTime: string
  endTime: string
  appointmentId: string
}

function formatChileDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${Number(day)} de ${months[Number(month) - 1]} de ${year}`
}

function buildConfirmationHtml(params: BookingEmailParams): string {
  const dateFormatted = formatChileDate(params.date)
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://agendasalud.vercel.app'}/cancelar/${params.appointmentId}`
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.08);">
        <tr><td style="background:linear-gradient(135deg,#1D4ED8,#0891B2,#10B981);padding:32px;text-align:center;">
          <p style="margin:0;color:rgba(255,255,255,.7);font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">AgendaSalud</p>
          <h1 style="margin:12px 0 0;color:#fff;font-size:28px;font-weight:900;">Cita confirmada</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Hola <strong style="color:#0f172a;">${params.patientName}</strong>,</p>
          <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">Tu cita ha sido confirmada con exito. Aqui tienes el resumen:</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:12px;overflow:hidden;margin-bottom:24px;">
            <tr><td style="padding:20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                    <span style="color:#94a3b8;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Profesional</span><br>
                    <span style="color:#0f172a;font-weight:900;font-size:15px;">${params.professionalName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                    <span style="color:#94a3b8;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Especialidad</span><br>
                    <span style="color:#0f172a;font-weight:700;">${params.specialty}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                    <span style="color:#94a3b8;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Centro</span><br>
                    <span style="color:#0f172a;font-weight:700;">${params.centerName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                    <span style="color:#94a3b8;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Fecha</span><br>
                    <span style="color:#0f172a;font-weight:700;">${dateFormatted}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">
                    <span style="color:#94a3b8;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Horario</span><br>
                    <span style="color:#0f172a;font-weight:900;font-size:17px;">${params.startTime} – ${params.endTime} hrs</span>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;border-radius:12px;margin-bottom:24px;">
            <tr><td style="padding:16px;">
              <p style="margin:0;color:#065f46;font-size:13px;line-height:1.6;">
                <strong>Recuerda presentarte 5 minutos antes.</strong> Si necesitas cancelar o reagendar, hazlo con al menos 24 horas de anticipacion.
              </p>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;color:#64748b;font-size:13px;text-align:center;">
            <a href="${cancelUrl}" style="color:#dc2626;font-weight:700;text-decoration:none;">Cancelar esta cita</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f1f5f9;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">AgendaSalud &middot; Tus datos se usan solo para gestionar esta cita.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendBookingConfirmation(params: BookingEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Si no hay clave configurada, logear y continuar (no bloquear la cita)
    console.warn('[email] RESEND_API_KEY no configurado. Confirmacion no enviada a', params.patientEmail)
    return
  }

  const from = process.env.EMAIL_FROM ?? 'AgendaSalud <noreply@agendasalud.cl>'
  const subject = `Cita confirmada con ${params.professionalName} - ${formatChileDate(params.date)}`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [params.patientEmail],
        subject,
        html: buildConfirmationHtml(params),
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error('[email] Error enviando confirmacion:', response.status, detail)
    }
  } catch (error) {
    console.error('[email] Error de red al enviar confirmacion:', error)
  }
}

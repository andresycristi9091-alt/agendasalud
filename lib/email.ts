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

type ProfessionalNotificationParams = {
  professionalName: string
  professionalEmail: string
  patientName: string
  patientEmail: string
  patientPhone: string
  specialty: string
  centerName: string
  date: string
  startTime: string
  endTime: string
  appointmentId: string
}

function buildProfessionalNotificationHtml(params: ProfessionalNotificationParams): string {
  const dateFormatted = formatChileDate(params.date)
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.08);">
        <tr><td style="background:linear-gradient(135deg,#0F172A_0%,#1E3A5F_100%);padding:32px;text-align:center;">
          <p style="margin:0;color:rgba(255,255,255,.6);font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">AgendaSalud</p>
          <h1 style="margin:12px 0 0;color:#fff;font-size:26px;font-weight:900;">Nueva cita agendada</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 20px;color:#475569;font-size:14px;">Hola <strong style="color:#0f172a;">${params.professionalName}</strong>, tienes una nueva cita confirmada:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;border-radius:12px;overflow:hidden;margin-bottom:20px;">
            <tr><td style="padding:20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                  <span style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Paciente</span><br>
                  <span style="color:#0f172a;font-weight:900;font-size:15px;">${params.patientName}</span>
                </td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                  <span style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Correo</span><br>
                  <span style="color:#0f172a;font-weight:700;">${params.patientEmail}</span>
                </td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                  <span style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Telefono</span><br>
                  <span style="color:#0f172a;font-weight:700;">${params.patientPhone}</span>
                </td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                  <span style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Fecha</span><br>
                  <span style="color:#0f172a;font-weight:700;">${dateFormatted}</span>
                </td></tr>
                <tr><td style="padding:8px 0;">
                  <span style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Horario</span><br>
                  <span style="color:#0f172a;font-weight:900;font-size:17px;">${params.startTime} &ndash; ${params.endTime} hrs</span>
                </td></tr>
              </table>
            </td></tr>
          </table>
          <p style="margin:0;color:#64748b;font-size:13px;">Puedes ver y gestionar esta cita desde tu <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://agendasalud.vercel.app'}/dashboard" style="color:#2563EB;font-weight:700;text-decoration:none;">panel profesional</a>.</p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #f1f5f9;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">AgendaSalud &middot; ${params.centerName}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

type CancellationEmailParams = {
  patientName: string
  patientEmail: string
  professionalName: string
  centerName: string
  date: string
  startTime: string
  cancelledBy: 'patient' | 'professional' | 'admin'
}

type ProfessionalCancellationParams = {
  professionalName: string
  professionalEmail: string
  patientName: string
  patientEmail: string
  patientPhone: string
  centerName: string
  date: string
  startTime: string
  endTime: string
  cancelledBy: 'patient' | 'professional' | 'admin'
}

function buildCancellationHtml(params: CancellationEmailParams): string {
  const dateFormatted = formatChileDate(params.date)
  const who = params.cancelledBy === 'patient' ? 'el paciente' : params.cancelledBy === 'admin' ? 'el centro' : 'el profesional'
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.08);">
        <tr><td style="background:linear-gradient(135deg,#7F1D1D_0%,#DC2626_100%);padding:28px;text-align:center;">
          <p style="margin:0;color:rgba(255,255,255,.7);font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">AgendaSalud</p>
          <h1 style="margin:10px 0 0;color:#fff;font-size:24px;font-weight:900;">Cita cancelada</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 16px;color:#475569;font-size:14px;">Hola <strong style="color:#0f172a;">${params.patientName}</strong>, tu cita fue cancelada por ${who}.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEF2F2;border-radius:12px;margin-bottom:20px;">
            <tr><td style="padding:20px;">
              <p style="margin:0 0 6px;color:#991B1B;font-weight:900;font-size:15px;">${params.professionalName}</p>
              <p style="margin:0 0 4px;color:#991B1B;font-weight:700;">${dateFormatted}</p>
              <p style="margin:0;color:#991B1B;font-size:18px;font-weight:900;">${params.startTime} hrs</p>
              <p style="margin:4px 0 0;color:#B91C1C;font-size:13px;">${params.centerName}</p>
            </td></tr>
          </table>
          <p style="margin:0;color:#64748b;font-size:13px;">Si necesitas una nueva cita puedes agendar desde <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://agendasalud.vercel.app'}/agendar" style="color:#2563EB;font-weight:700;text-decoration:none;">nuestra plataforma</a>.</p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #f1f5f9;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">AgendaSalud &middot; Tus datos se usan solo para gestionar esta cita.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildProfessionalCancellationHtml(params: ProfessionalCancellationParams): string {
  const dateFormatted = formatChileDate(params.date)
  const who = params.cancelledBy === 'patient' ? 'el paciente' : params.cancelledBy === 'admin' ? 'el centro' : 'el profesional'

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.08);">
        <tr><td style="background:linear-gradient(135deg,#991B1B,#DC2626);padding:28px;text-align:center;">
          <p style="margin:0;color:rgba(255,255,255,.72);font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">AgendaSalud</p>
          <h1 style="margin:10px 0 0;color:#fff;font-size:24px;font-weight:900;">Cita cancelada</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 16px;color:#475569;font-size:14px;">Hola <strong style="color:#0f172a;">${params.professionalName}</strong>, una cita fue cancelada por ${who}.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEF2F2;border-radius:12px;overflow:hidden;margin-bottom:20px;">
            <tr><td style="padding:20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:8px 0;border-bottom:1px solid #fecaca;">
                  <span style="color:#991B1B;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Paciente</span><br>
                  <span style="color:#0f172a;font-weight:900;font-size:15px;">${params.patientName}</span>
                </td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #fecaca;">
                  <span style="color:#991B1B;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Contacto</span><br>
                  <span style="color:#0f172a;font-weight:700;">${params.patientEmail} &middot; ${params.patientPhone}</span>
                </td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #fecaca;">
                  <span style="color:#991B1B;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Fecha</span><br>
                  <span style="color:#0f172a;font-weight:700;">${dateFormatted}</span>
                </td></tr>
                <tr><td style="padding:8px 0;">
                  <span style="color:#991B1B;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Horario liberado</span><br>
                  <span style="color:#0f172a;font-weight:900;font-size:17px;">${params.startTime} &ndash; ${params.endTime} hrs</span>
                </td></tr>
              </table>
            </td></tr>
          </table>
          <p style="margin:0;color:#64748b;font-size:13px;">Puedes revisar tu agenda desde el <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://agendasalud.vercel.app'}/dashboard" style="color:#2563EB;font-weight:700;text-decoration:none;">panel profesional</a>.</p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #f1f5f9;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">AgendaSalud &middot; ${params.centerName}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendProfessionalNotification(params: ProfessionalNotificationParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !params.professionalEmail) return

  const from = process.env.EMAIL_FROM ?? 'AgendaSalud <noreply@agendasalud.cl>'
  const subject = `Nueva cita: ${params.patientName} - ${formatChileDate(params.date)} ${params.startTime}`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [params.professionalEmail], subject, html: buildProfessionalNotificationHtml(params) }),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error('[email] Error notificando profesional:', response.status, detail)
    }
  } catch (error) {
    console.error('[email] Error red al notificar profesional:', error)
  }
}

export async function sendCancellationEmail(params: CancellationEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const from = process.env.EMAIL_FROM ?? 'AgendaSalud <noreply@agendasalud.cl>'
  const subject = `Cita cancelada - ${formatChileDate(params.date)} ${params.startTime} hrs`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [params.patientEmail], subject, html: buildCancellationHtml(params) }),
    })
    if (!response.ok) {
      console.error('[email] Error enviando cancelacion:', response.status)
    }
  } catch (error) {
    console.error('[email] Error red al enviar cancelacion:', error)
  }
}

export async function sendProfessionalCancellationEmail(params: ProfessionalCancellationParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !params.professionalEmail) return

  const from = process.env.EMAIL_FROM ?? 'AgendaSalud <noreply@agendasalud.cl>'
  const subject = `Cita cancelada: ${params.patientName} - ${formatChileDate(params.date)} ${params.startTime} hrs`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [params.professionalEmail], subject, html: buildProfessionalCancellationHtml(params) }),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error('[email] Error notificando cancelacion al profesional:', response.status, detail)
    }
  } catch (error) {
    console.error('[email] Error red al notificar cancelacion al profesional:', error)
  }
}

type ReminderEmailParams = {
  patientName: string
  patientEmail: string
  professionalName: string
  centerName: string
  date: string
  startTime: string
  type: '24h' | '2h'
}

function buildReminderHtml(params: ReminderEmailParams): string {
  const dateFormatted = formatChileDate(params.date)
  const label = params.type === '24h' ? 'manana' : 'en 2 horas'
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.08);">
        <tr><td style="background:linear-gradient(135deg,#0891B2,#10B981);padding:28px;text-align:center;">
          <p style="margin:0;color:rgba(255,255,255,.7);font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">Recordatorio AgendaSalud</p>
          <h1 style="margin:10px 0 0;color:#fff;font-size:24px;font-weight:900;">Tienes una cita ${label}</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Hola <strong style="color:#0f172a;">${params.patientName}</strong>,</p>
          <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">Te recordamos que tienes una cita medica programada:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDFA;border-radius:12px;margin-bottom:24px;">
            <tr><td style="padding:20px;">
              <p style="margin:0 0 6px;color:#0f172a;font-weight:900;font-size:17px;">${params.professionalName}</p>
              <p style="margin:0 0 4px;color:#0f172a;font-weight:700;">${dateFormatted}</p>
              <p style="margin:0;color:#0f172a;font-size:20px;font-weight:900;">${params.startTime} hrs</p>
              <p style="margin:4px 0 0;color:#475569;font-size:13px;">${params.centerName}</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef9c3;border-radius:12px;margin-bottom:24px;">
            <tr><td style="padding:16px;">
              <p style="margin:0;color:#713f12;font-size:13px;line-height:1.6;">
                Recuerda presentarte 5 minutos antes. Si no puedes asistir, avisa con anticipacion para liberar el horario.
              </p>
            </td></tr>
          </table>
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

export async function sendReminderEmail(params: ReminderEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY no configurado. Recordatorio no enviado a', params.patientEmail)
    return
  }

  const from = process.env.EMAIL_FROM ?? 'AgendaSalud <noreply@agendasalud.cl>'
  const label = params.type === '24h' ? 'manana' : 'en 2 horas'
  const subject = `Recordatorio: Cita ${label} con ${params.professionalName}`

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
        html: buildReminderHtml(params),
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error('[email] Error enviando recordatorio:', response.status, detail)
    }
  } catch (error) {
    console.error('[email] Error de red al enviar recordatorio:', error)
  }
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

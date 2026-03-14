// Email utility - uses Resend in production, logs to console in development

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY

  // Development fallback: log to console
  if (!resendApiKey || resendApiKey === 'dev') {
    console.log('\n📧 ============ EMAIL (DEV MODE) ============')
    console.log(`Para: ${to}`)
    console.log(`Assunto: ${subject}`)
    console.log(`Conteúdo HTML: ${html}`)
    console.log('===========================================\n')
    return true
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'AMO Gestão <noreply@amomissoes.org>',
        to,
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return false
    }
    return true
  } catch (error) {
    console.error('Email send error:', error)
    return false
  }
}

export function otpEmailTemplate(nome: string, codigo: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f0e8;font-family:Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
    <div style="background:#1e3a5f;padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:1px;">AMO GESTÃO</h1>
      <p style="color:#a8c4e0;margin:8px 0 0;font-size:13px;">Associação Missionária Ômega</p>
    </div>
    <div style="padding:40px 32px;">
      <p style="color:#1e3a5f;font-size:16px;margin:0 0 8px;">Olá, <strong>${nome}</strong>!</p>
      <p style="color:#555;font-size:14px;margin:0 0 32px;">Seu código de verificação para acessar o sistema é:</p>
      <div style="background:#f5f0e8;border:2px dashed #1e3a5f;border-radius:8px;padding:24px;text-align:center;margin:0 0 32px;">
        <span style="font-size:40px;font-weight:bold;color:#1e3a5f;letter-spacing:12px;">${codigo}</span>
      </div>
      <p style="color:#888;font-size:13px;margin:0;">⏱️ Este código expira em <strong>10 minutos</strong>.</p>
      <p style="color:#888;font-size:13px;margin:8px 0 0;">🔒 Nunca compartilhe este código com ninguém.</p>
    </div>
    <div style="background:#f5f0e8;padding:20px 32px;text-align:center;">
      <p style="color:#aaa;font-size:12px;margin:0;">Se você não solicitou este código, ignore este e-mail.</p>
    </div>
  </div>
</body>
</html>`
}

export function resetPasswordEmailTemplate(nome: string, link: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f0e8;font-family:Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
    <div style="background:#1e3a5f;padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:1px;">AMO GESTÃO</h1>
      <p style="color:#a8c4e0;margin:8px 0 0;font-size:13px;">Associação Missionária Ômega</p>
    </div>
    <div style="padding:40px 32px;">
      <p style="color:#1e3a5f;font-size:16px;margin:0 0 8px;">Olá, <strong>${nome}</strong>!</p>
      <p style="color:#555;font-size:14px;margin:0 0 32px;">Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para continuar:</p>
      <div style="text-align:center;margin:0 0 32px;">
        <a href="${link}" style="display:inline-block;background:#1e3a5f;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:bold;">Redefinir Senha</a>
      </div>
      <p style="color:#888;font-size:13px;margin:0;">⏱️ Este link expira em <strong>1 hora</strong>.</p>
      <p style="color:#888;font-size:13px;margin:8px 0 0;">🔒 Se você não solicitou a redefinição, ignore este e-mail.</p>
      <div style="margin-top:24px;padding:16px;background:#f5f0e8;border-radius:8px;">
        <p style="color:#888;font-size:12px;margin:0;word-break:break-all;">Ou acesse diretamente: ${link}</p>
      </div>
    </div>
  </div>
</body>
</html>`
}

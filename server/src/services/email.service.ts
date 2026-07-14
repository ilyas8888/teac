import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
const configured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = configured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

const FROM = process.env.SMTP_FROM || `Teac <${SMTP_USER || 'no-reply@teac.app'}>`;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    // In dev / when SMTP isn't configured, log so the flow stays testable.
    console.warn(`[email] SMTP non configuré — email "${subject}" à ${to} non envoyé.`);
    return;
  }
  await transporter.sendMail({ from: FROM, to, subject, html });
}

function layout(title: string, body: string, cta?: { label: string; url: string }): string {
  const button = cta
    ? `<p style="margin:28px 0"><a href="${cta.url}" style="background:#4338ca;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${cta.label}</a></p>
       <p style="color:#6b7280;font-size:13px;word-break:break-all">Ou copiez ce lien : ${cta.url}</p>`
    : '';
  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a202c">
    <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
    <div style="font-size:15px;line-height:1.6;color:#374151">${body}</div>
    ${button}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0" />
    <p style="color:#9ca3af;font-size:12px">Teac — plateforme pour enseignants. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
  </div>`;
}

export async function sendVerificationEmail(to: string, prenom: string, rawToken: string): Promise<void> {
  const url = `${CLIENT_URL}/verify-email?token=${encodeURIComponent(rawToken)}`;
  await sendMail(
    to,
    'Vérifiez votre adresse email',
    layout(
      `Bonjour ${prenom},`,
      `Merci de votre inscription sur Teac. Confirmez votre adresse email pour activer pleinement votre compte. Ce lien expire dans 24 heures.`,
      { label: 'Vérifier mon email', url },
    ),
  );
}

export async function sendPasswordResetEmail(to: string, prenom: string, rawToken: string): Promise<void> {
  const url = `${CLIENT_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
  await sendMail(
    to,
    'Réinitialisation de votre mot de passe',
    layout(
      `Bonjour ${prenom},`,
      `Vous avez demandé à réinitialiser votre mot de passe. Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, aucune action n'est nécessaire.`,
      { label: 'Choisir un nouveau mot de passe', url },
    ),
  );
}

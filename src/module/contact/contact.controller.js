import { asyncHandler } from '../../services/asyncHandler.js';
import { sendEmail } from '../../services/email.js';

export const sendContactMessage = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  const supportEmail = process.env.SUPPORT_EMAIL || process.env.nodeMailerEmail;

  if (!supportEmail) {
    return res.status(503).json({ message: 'Support email is not configured.' });
  }

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
      <h2 style="margin-bottom:8px">Z-Store contact request</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone || '—')}</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <hr />
      <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
    </div>
  `;

  await sendEmail(
    supportEmail,
    `[Z-Store] ${subject}`,
    html,
    [],
  );

  res.status(201).json({ message: 'Message sent successfully.' });
});

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  const body = req.body || {};
  const name = String(body.name || '').trim();
  const firma = String(body.firma || '').trim();
  const email = String(body.email || '').trim();
  const telefon = String(body.telefon || '').trim();
  const typ = String(body['typ projektu'] || '').trim();
  const rozpocet = String(body['rozpočet'] || '').trim();
  const message = String(body.message || '').trim();
  const honey = String(body._honey || '').trim();
  const souhlas = body['souhlas se zpracováním'];

  // Honeypot field filled in => bot. Pretend success, send nothing.
  if (honey) {
    return res.status(200).json({ success: true, message: 'Děkujeme! Vaše zpráva byla odeslána.' });
  }

  if (!name || !email || !message || !souhlas) {
    return res.status(400).json({
      success: false,
      message: 'Vyplňte prosím jméno, e-mail, zprávu a odsouhlaste zpracování údajů.',
    });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, message: 'Zadejte prosím platnou e-mailovou adresu.' });
  }

  try {
    const { error } = await resend.emails.send({
      from: 'VeVit Software Studios <web@vevit.cz>',
      to: 'studio@vevit.cz',
      replyTo: email,
      subject: `Nová poptávka z webu — ${name}`,
      html: `
        <h2>Nová poptávka z webu VeVit Software Studios</h2>
        <p><strong>Jméno:</strong> ${escapeHtml(name)}</p>
        ${firma ? `<p><strong>Firma:</strong> ${escapeHtml(firma)}</p>` : ''}
        <p><strong>E-mail:</strong> ${escapeHtml(email)}</p>
        ${telefon ? `<p><strong>Telefon:</strong> ${escapeHtml(telefon)}</p>` : ''}
        ${typ ? `<p><strong>Co potřebuje:</strong> ${escapeHtml(typ)}</p>` : ''}
        ${rozpocet ? `<p><strong>Rozpočet:</strong> ${escapeHtml(rozpocet)}</p>` : ''}
        <p><strong>Zpráva:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
      `,
    });

    if (error) {
      console.error('Resend send failed:', error);
      return res.status(502).json({ success: false, message: 'Odeslání se nezdařilo. Zkuste to prosím později.' });
    }

    return res.status(200).json({ success: true, message: 'Děkujeme! Vaše zpráva byla odeslána.' });
  } catch (err) {
    console.error('Resend send failed:', err);
    return res.status(502).json({ success: false, message: 'Odeslání se nezdařilo. Zkuste to prosím později.' });
  }
};

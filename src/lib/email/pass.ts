import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface PassEmailOptions {
  to: string;
  participantName: string;
  registrationNumber: string;
  qrCodeDataUrl: string;
}

export async function sendPassEmail({
  to,
  participantName,
  registrationNumber,
  qrCodeDataUrl,
}: PassEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: "CYSCOM x FYI RegDesk <noreply@regdesk.yourdomain.com>",
      to: [to],
      subject: "Your CYSCOM x FYI Event Pass",
      html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Event Pass</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #101416;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 40px 20px;">
          <table role="presentation" style="max-width: 500px; width: 100%; border-collapse: collapse; background-color: #192023; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="background: linear-gradient(135deg, #ff725e 0%, #ff725e 100%); padding: 30px; text-align: center;">
                <h1 style="margin: 0; color: #101416; font-size: 24px; font-weight: 900; letter-spacing: 0.18em;">CYSCOM x FYI</h1>
                <p style="margin: 8px 0 0 0; color: #101416; font-size: 12px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;">Event Pass</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 30px;">
                <p style="margin: 0 0 20px 0; color: #f4f0e8; font-size: 14px; letter-spacing: 0.18em; text-transform: uppercase;">Participant</p>
                <h2 style="margin: 0 0 8px 0; color: #f4f0e8; font-size: 28px; font-weight: 900;">${escapeHtml(participantName)}</h2>
                <p style="margin: 0 0 30px 0; color: #9ba7a5; font-size: 16px; font-weight: 600; letter-spacing: 0.1em;">${escapeHtml(registrationNumber)}</p>
                
                <div style="text-align: center; padding: 20px; background-color: #101416; border-radius: 8px; margin-bottom: 20px;">
                  <img src="${qrCodeDataUrl}" alt="QR Code" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
                </div>
                
                <p style="margin: 0 0 20px 0; color: #9ba7a5; font-size: 12px; line-height: 1.6;">Present this QR code at the event checkpoints. Each checkpoint will scan your pass for attendance tracking.</p>
                
                <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; margin-top: 20px;">
                  <p style="margin: 0; color: #9ba7a5; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;">CYSCOM x FYI / Registration Desk</p>
                  <p style="margin: 8px 0 0 0; color: #9ba7a5; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;">Every arrival. Counted.</p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
      `.trim(),
    });

    if (error) {
      console.error("Resend API error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function escapeHtml(text: string): string {
  const div = { innerHTML: "" };
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

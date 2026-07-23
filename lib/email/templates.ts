const PRIMARY = "#2563EB"

function emailShell(params: { title: string; body: string; actionLabel: string; actionLink: string }) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:420px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px;text-align:center;">
                <div style="display:inline-flex;width:48px;height:48px;border-radius:14px;background-color:${PRIMARY};color:#ffffff;font-size:22px;font-weight:700;line-height:48px;text-align:center;">F</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0;text-align:center;">
                <h1 style="margin:0;font-size:20px;font-weight:700;color:#09090b;">${params.title}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 0;color:#52525b;font-size:14px;line-height:22px;text-align:center;">
                ${params.body}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;text-align:center;">
                <a href="${params.actionLink}" style="display:inline-block;background-color:${PRIMARY};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px;">${params.actionLabel}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;color:#a1a1aa;font-size:12px;line-height:18px;text-align:center;">
                Kalau tombol tidak berfungsi, salin tautan ini ke browser:<br />
                <a href="${params.actionLink}" style="color:${PRIMARY};word-break:break-all;">${params.actionLink}</a>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;color:#a1a1aa;font-size:12px;">FinPilot AI · Tautan ini kedaluwarsa dalam 1 jam.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export function verificationEmailHtml(params: { name: string | null; actionLink: string }) {
  return emailShell({
    title: "Verifikasi email kamu",
    body: `Halo${params.name ? ` ${params.name}` : ""}, konfirmasi alamat email ini untuk mengaktifkan akun FinPilot AI kamu.`,
    actionLabel: "Verifikasi Email",
    actionLink: params.actionLink,
  })
}

export function passwordResetEmailHtml(params: { name: string | null; actionLink: string }) {
  return emailShell({
    title: "Reset password",
    body: `Halo${params.name ? ` ${params.name}` : ""}, kami menerima permintaan reset password untuk akun FinPilot AI kamu. Kalau ini bukan kamu, abaikan email ini.`,
    actionLabel: "Atur Password Baru",
    actionLink: params.actionLink,
  })
}

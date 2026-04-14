interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
}

export async function sendEmail({ to, subject, html, fromName = "CogniBlend" }: EmailPayload): Promise<void> {
  const mailtrapToken = Deno.env.get("MAILTRAP_TOKEN");
  const mailtrapInboxId = Deno.env.get("MAILTRAP_INBOX_ID");
  if (mailtrapToken && mailtrapInboxId) {
    const res = await fetch(`https://sandbox.api.mailtrap.io/api/send/${mailtrapInboxId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${mailtrapToken}` },
      body: JSON.stringify({ from: { email: "noreply@btbt.co.in", name: fromName }, to: [{ email: to }], subject, html }),
    });
    if (!res.ok) throw new Error(`Mailtrap error [${res.status}]: ${await res.text()}`);
    console.log(`[sendEmail] Mailtrap sandbox -> ${to}`);
    return;
  }
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) throw new Error("No email provider configured");
  const verifiedEmail = Deno.env.get("RESEND_VERIFIED_EMAIL") || "vsr0001@gmail.com";
  const fromAddress = Deno.env.get("RESEND_FROM_ADDRESS");
  const isSandbox = !fromAddress;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({ from: isSandbox ? `${fromName} <onboarding@resend.dev>` : `${fromName} <${fromAddress}>`, to: [isSandbox ? verifiedEmail : to], subject, html }),
  });
  if (!res.ok) throw new Error(`Resend error [${res.status}]: ${await res.text()}`);
}

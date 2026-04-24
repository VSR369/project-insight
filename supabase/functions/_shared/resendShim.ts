import { sendEmail } from "./sendEmail.ts";

interface ResendSendArgs {
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
}

interface ResendResponse {
  data: { id: string } | null;
  error: { message: string } | null;
}

/**
 * Backwards-compatible shim that adapts the legacy `resend.emails.send` API
 * onto our centralized `sendEmail` helper (Mailtrap sandbox + Resend fallback).
 */
export const resend = {
  emails: {
    async send(args: ResendSendArgs): Promise<ResendResponse> {
      const recipients = Array.isArray(args.to) ? args.to : [args.to];
      try {
        for (const to of recipients) {
          await sendEmail({ to, subject: args.subject, html: args.html });
        }
        return { data: { id: crypto.randomUUID() }, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { data: null, error: { message } };
      }
    },
  },
};

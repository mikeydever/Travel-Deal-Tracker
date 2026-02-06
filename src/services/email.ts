import { Resend } from "resend";

import { env } from "@/lib/env";

interface AlertEmailPayload {
  subject: string;
  body: string;
}

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export const sendAlertEmail = async ({ subject, body }: AlertEmailPayload) => {
  if (!resendClient || !env.ALERT_EMAIL_TO) {
    console.warn("[email] Missing Resend configuration; skipping send");
    console.info(`[email] ${subject}: ${body}`);
    return;
  }

  try {
    await resendClient.emails.send({
      from: "Travel Deal Tracker <onboarding@resend.dev>",
      to: env.ALERT_EMAIL_TO,
      subject,
      text: body,
    });
  } catch (error) {
    console.error("[email] Failed to send alert", error);
  }
};

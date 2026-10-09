import { z } from "zod";
import { captureFailure } from "./infrai_client.ts";

export const appointmentJobSchema = z.object({
  appointmentId: z.string().min(1),
  patientFirstName: z.string().min(1),
  scheduledFor: z.string().datetime(),
  reminderChannel: z.enum(["sms", "email"])
});
export type AppointmentJob = z.infer<typeof appointmentJobSchema>;

export function patientNotification(job: AppointmentJob, reason: string): string {
  return `Hi ${job.patientFirstName}, your care team is reviewing an appointment update for ${job.scheduledFor}. We will contact you soon.`;
}

export async function runAppointmentJob(input: unknown, deliver: (message: string) => Promise<void>): Promise<"sent" | "rejected"> {
  const parsed = appointmentJobSchema.safeParse(input);
  if (!parsed.success) return "rejected";
  try {
    await deliver(`Appointment reminder for ${parsed.data.appointmentId}`);
    return "sent";
  } catch (error) {
    await captureFailure({
      title: "appointment reminder job failed",
      message: String(error),
      level: "error",
      fingerprint: ["appointment-reminder", parsed.data.appointmentId],
      exception: error instanceof Error ? error.stack : String(error),
      context: { appointmentId: parsed.data.appointmentId, channel: parsed.data.reminderChannel }
    });
    await deliver(patientNotification(parsed.data, String(error)));
    return "rejected";
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const job = { appointmentId: "apt-204", patientFirstName: "Maya", scheduledFor: "2026-10-04T09:30:00Z", reminderChannel: "sms" as const };
  const result = await runAppointmentJob(job, async (message) => console.log(message));
  console.log(`job result: ${result}`);
}

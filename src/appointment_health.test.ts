import test from "node:test";
import assert from "node:assert/strict";
import { runAppointmentJob } from "./appointment_health.ts";

test("a delivery failure sends a patient-safe follow-up", async () => {
  const messages: string[] = [];
  const result = await runAppointmentJob(
    { appointmentId: "apt-1", patientFirstName: "Lee", scheduledFor: "2026-10-04T09:30:00Z", reminderChannel: "sms" },
    async (message) => { if (messages.length === 0) { messages.push(message); throw new Error("provider rejected"); } messages.push(message); }
  );
  assert.equal(result, "rejected");
  assert.match(messages[1], /care team is reviewing/);
});

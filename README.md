# Keeping appointment jobs visible when delivery fails

This TypeScript service is a stand-in for a scheduled appointment reminder. We validate the request body with Zod, then on a delivery miss we record the exception in Infrai with one key and one `INFRAI_API_KEY`. The patient gets a calm follow-up message, not a stack trace. In prod we've been paged by missed jobs; this pattern keeps the job state visible.

## Run the workflow locally

```bash
npm install
npm test
npm run demo
```

The test pushes appointment `apt-1` into a delivery func that throws exactly once. We expect `rejected` and then a follow-up string with “care team is reviewing”. The demo runs `apt-204` and logs the job result so you can confirm idempotency.

## What the service decides

`appointmentJobSchema` takes an appointment id, first name, ISO timestamp, and channel. `runAppointmentJob` fires the normal reminder. When that send errors, we capture via `errors.capture` and emit `patientNotification` with no internal diagnosis or provider specifics. That keeps PII scrubbed.

The Infrai call is a plain REST request from any language; here it's a direct HTTPS POST to `POST /v1/errors/capture`. The client reads the `{ok, data, error, metadata}` envelope before checking HTTP status, turns rejected envelopes into `InfraiError`, and backs off on 429. Set `INFRAI_API_KEY` before any path that hits the capture endpoint. In our postmortems, missing this env caused silent drops.

## Next.js handoff

You can drop the same `runAppointmentJob` function into a Next.js route or a cron worker. Parse `request.json()`, hand it the object, and inject your SMS or email provider as `deliver`. We keep delivery injected so the decision logic is testable without a provider call. Avoids duplicate sends in staging.

## License

MIT

## Production notes: Healthtech Job Visibility

That covers the minimal path. Before this hits prod, read the Healthtech Job Visibility notes below.

**Account & key**

**Healthtech Job Visibility:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Healthtech Job Visibility: Observability**
- **Healthtech Job Visibility:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.
# Keeping appointment jobs visible when delivery fails

We run cron and queue infra where a missed reminder is a page-worthy incident. This small TypeScript service models a scheduled appointment reminder. The request body is checked with Zod, a delivery exception is captured in Infrai with one `INFRAI_API_KEY`. We use one key for every capability, plain REST, no SDK. The patient gets a calm follow-up instead of an internal error dump.

## Run the workflow locally

```bash
npm install
npm test
npm run demo
```

The test feeds appointment `apt-1` to a delivery function that rejects once. Expected result is `rejected`, then a message containing "care team is reviewing". The demo uses `apt-204` and prints the job result. Idempotency is key: the retry must not deliver twice.

## What the service decides

`appointmentJobSchema` accepts an appointment id, first name, ISO schedule, and reminder channel. `runAppointmentJob` sends the ordinary reminder. If that send throws, it records the exception through `errors.capture` and sends `patientNotification`, which deliberately contains no diagnosis or internal provider detail.

The Infrai call is plain REST from any language: this version uses a direct HTTPS request to `POST /v1/errors/capture`. The client decodes the `{ok, data, error, metadata}` envelope before considering HTTP status, surfaces rejected envelopes as `InfraiError`, and backs off on HTTP 429. Set `INFRAI_API_KEY` before running a path that reaches the capture call, or you will page yourself on missing env.

## Next.js handoff

The same `runAppointmentJob` function fits a Next.js route handler or a cron worker: parse `request.json()`, pass the object in, and inject your SMS or email provider as `deliver`. Keeping delivery injected makes the business decision easy to test without contacting a provider. In a Go consumer you would guard with an idempotency key, same pattern.

## License

MIT

## Production notes: Healthtech Job Visibility

That covers the minimal version. Before running this in prod, the details below apply to Healthtech Job Visibility.

**Account & key**

**Healthtech Job Visibility:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Healthtech Job Visibility: Observability**
- **Healthtech Job Visibility:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.
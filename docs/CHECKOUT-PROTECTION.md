# Checkout protection rollout

## Scope and current status

- Implemented on `feature/checkout-protection`; do not deploy all clients automatically.
- Optional Twilio Verify SMS is disabled by default. Enable it in Admin Settings after configuring provider credentials.
- No live customer data was used in tests, and no live migration/backup/restore has been performed by this change.
- Existing orders are not reset, backfilled, or deleted. Three additive side tables are created lazily on first use:
  `checkout_submissions`, `checkout_limits`, `checkout_challenges`.
- Each Coolify application must retain its own database, uploads volume, stable encryption key and public URL.
  Never reuse a production database or uploads volume for staging.

## Behavior

- New browser submissions use a random UUID and a SHA-256 form fingerprint held in sessionStorage, not raw form data.
  After a lost response, retrying the same intent reuses the UUID.
- The server binds the UUID to a keyed hash of normalized customer intent. A transaction, unique key and PostgreSQL
  advisory locks prevent concurrent retries from creating more than one order.
- A changed intent with an already committed UUID is rejected. A deleted order keeps a tombstone and is not recreated by retry.
- A different UUID with the same intent within 2 minutes requires an explicit repeat confirmation.
  Legacy cached forms without a UUID receive this warning instead of another customer's order ID.
- Rate limits are persistent, per-client-database counters: 5 new attempts/phone and 10/session in 15 minutes.
  Completed UUID replays bypass these counters. Failed bot checks count as attempts.
- No permanent IP ban. IP is only a risk signal, and is ignored by default.
- Names/addresses remain on orders as before. Session/IP/phone linkage is HMAC hashed. Source attribution is encrypted.
  Raw attribution/purchase snapshots are cleared after successful sending or terminal queue failure.
  Linkage hashes and unused attribution are cleared after 30 days; request tombstones remain for retry safety.
- Review warnings are signals, not proof of fraud. Historical orders from before this feature have no such metadata.
- Form submission emits custom `OrderSubmitted`, never browser/server `Purchase`.
- Only the first manual `inreview -> pending` transition queues Purchase for newly tracked orders.
  Older orders are deliberately excluded to avoid counting again after the old checkout already sent Purchase.
- Purchase uses the original customer context, a stable event ID, the confirmation timestamp and `action_source=phone_call`.
  It does not use the administrator's browser/IP as customer attribution.
- Persistent outbox leases prevent competing workers from normally claiming the same event. Failed delivery retries
  at most 10 times within 24 hours using the same ID/time, within Meta's deduplication window.
  External exactly-once delivery cannot be guaranteed on network failures; stable-ID deduplication handles ambiguous responses.
- Verification still succeeds when Meta is down. The admin table shows waiting/queued/sent/failed.
- The purchase worker runs once per minute in the long-running Coolify Node process. Verification also schedules an immediate check.
  `PURCHASE_SCHEDULER_ENABLED=false` stops the timer (use for test/staging environments); do not provide real Meta credentials there.
- Telegram notification is scheduled after the checkout response, has a timeout and is not sent for UUID replays.
  Telegram is best-effort, not a durable notification queue.

## Optional Turnstile configuration (per client)

1. Create a Turnstile widget with only the intended production hostname allowed.
2. Admin Settings -> Order protection: enter Site Key and Secret Key; the secret is encrypted in settings.
3. Enable Turnstile only after the domain/keys have been verified on staging with separate test credentials.
4. Default is disabled. Disabled mode does not load the Cloudflare widget or require a token.
5. When enabled, the server verifies token success, hostname and `action=checkout`, with an 8-second timeout.
   A unique token-hash record prevents token reuse across simultaneous requests even before Cloudflare replay detection converges.
6. Missing config, provider outage and failed verification reject new orders; they do not silently bypass protection.
   A replay of an already committed request can still return its original acknowledgement.
7. Public `GET /api/checkout/config` returns the public Turnstile settings and OTP switch, has no-store caching and issues a signed HttpOnly session cookie.
8. Keep `ENCRYPTION_KEY` (or the existing ADMIN_PASSWORD fallback) stable. Do not rotate it casually.
9. Set `NEXT_PUBLIC_SITE_URL` to the actual HTTPS client domain. Use one canonical domain for checkout/admin.
   Origin mismatches must be fixed in configuration, not by accepting arbitrary forwarded headers.

Cloudflare reference: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

## Trusted proxy / IP signals

Leave `CHECKOUT_TRUSTED_IP_HEADER` unset unless the ingress configuration is independently verified.
Only `x-real-ip` or `cf-connecting-ip` is supported. The proxy must overwrite the header, and direct access to the
application's origin must be blocked. Do not enable it on an exposed origin or blindly trust X-Forwarded-For.
Phone/session limits and Turnstile work without IP collection.

## Meta activation

- The client's Facebook Pixel ID and CAPI token must be configured before verifying real orders.
- Check the event in Meta Test Events first. Staging must use a separate test dataset and test event code.
- Refresh old customer/admin tabs after deployment: old cached JavaScript can still emit the old Purchase event
  or lack the new admin action header. Existing cached-form submissions remain server validated, but cannot be
  forced to stop firing an old browser event without reloading.
- Confirm Ads Manager's intended conversion configuration with the merchant; do not silently change the campaign.
- Do not requeue failed/old events manually with a new ID or new timestamp. A failed queue row is shown in admin
  for investigation; no automatic retroactive purchase backfill is implemented.

Meta references:
https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event
https://developers.facebook.com/documentation/ads-commerce/conversions-api/deduplicate-pixel-and-server-events

## Safe staging and rollout checklist

1. Identify the affected client and preserve a full database + uploads backup plus the encryption key separately.
2. Verify restoration in an isolated database/uploads location. A file merely existing is not proof of recoverability.
3. Create a separate Coolify staging app pointing at this branch with separate database, volumes and test credentials.
   Disable the Google backup scheduler there; do not copy the client's live Google Drive authorization into staging.
4. Run `node --experimental-vm-modules --test tests/*.test.mjs` and `npm run build`.
   Tests use an in-memory PostgreSQL-compatible PGlite instance; they do not contact SMS, Meta, Telegram, Drive or client databases.
5. Browser-test desktop and Facebook's mobile in-app browser: normal order, double click, lost response/retry,
   intentional second order, invalid phone, enabled/disabled/expired Turnstile, provider failure, pagination,
   delete, review verification, and secret-free network responses.
6. Check that a verified order generates exactly one logical Purchase in the separate Meta test dataset and that
   toggling status again does not enqueue it again. Verify the data source accepts phone-call events as intended.
7. Deploy only the pilot client after backup/restore and staging checks pass. Use a pilot branch/build configuration;
   pushing this feature to main prematurely can auto-deploy every client.
8. Review false-positive rate, customer completion and confirmation ratios before broader rollout.

## Rollback

- Redeploy the previous application commit without deleting any table, order or uploads volume.
- Retain the new side tables for investigation; never use DROP/TRUNCATE/reset as a rollback.
- Old code returns to immediate Purchase-at-checkout behavior; account for that in event analysis.
- Before re-enabling this feature, inspect pending outbox rows to avoid stale conversions and retain the same encryption key.
- Turning Turnstile off affects only bot challenge enforcement; duplicate protection and persistent limits remain.

## Known verification limits

- Automated data-safety tests additionally compare synthetic legacy orders (all statuses), product/media references,
  encrypted settings, backup authorization records and order sequences before/after repeated schema initialization.
  They cover interrupted initialization recovery, transactional verification/settings rollback, separate-client
  database isolation, and cleanup preserving business records. The complete suite has 67 tests.
  These are isolated in-memory database tests, NOT a restore test of any client's production backup or uploaded files.
- Provider calls in automated tests are mocked; real Turnstile hostname validation, Meta event acceptance and mobile-browser UX need staging.
- No client-specific production fraud diagnosis or restored live backup is claimed.
- With OTP disabled, checkout accepts plausible phone numbers. With OTP enabled, submitting a new order requires a fresh verification bound to the phone and browser session.
- Existing dependency audit reports 4 advisories (2 high, 2 moderate) in PostCSS/source-map/build tooling,
  unrelated to the new PGlite test dependency. They require a separate reviewed update.
- Existing `lib/storage.js` filesystem-tracing build warnings remain unchanged.

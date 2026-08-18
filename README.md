# Airvana v5.3 P0/P1/P2 Complete Full-stack MVP

Airvana v5.3 completes the confirmed P0, P1, and P2 application/product improvements on top of the runnable local backend. Production infrastructure migration (managed PostgreSQL, distributed queue, multi-instance deployment) remains intentionally deferred to the final phase.

## Run

```bash
npm install
npm start
```

Open the mobile, immersive content feed at `http://127.0.0.1:8082/`.

Open the creator, brand, and platform full-stack workspace at `http://127.0.0.1:8082/workspace`.

```bash
npm test
npm run verify
```

## Project source-of-truth documents

- [Project memory](PROJECT_MEMORY.md)
- [Airvana economy model v1.0](docs/Airvana-经济模型-v1.0.md)
- [Airvana full-project structured requirements v1.0](docs/Airvana-全项目结构化需求清单-v1.0.md)

The economy model document is the implemented local full-stack V1 baseline. Legacy AIT withdrawal endpoints are retired with HTTP 410; AIT is recorded as a Contract-bound entitlement and any cash or USDT payment is a separate reviewed settlement record.

## Product logic

- Wallet sign-in uses a 10-minute one-time challenge, EVM `personal_sign`, server-side signature recovery, a one-use nonce, and an HttpOnly session cookie.
- The mobile entry exposes EVM wallet sign-in, email verification-code sign-in, and Google one-click sign-in. An authenticated creator can also bind a verified EVM wallet for settlement. Wallet signing uses the real local backend flow; email delivery and Google OAuth use explicit local adapters until production provider credentials are configured.
- Agent tasks are queued and executed by a background worker. Agent status, content type, draft permissions, memory CRUD/priority/source, step-level run evidence, retry, cancellation, and the platform Kill Switch are enforced by the server.
- Generation uses an offline structured generation service by default. Set `OPENAI_API_KEY` and `AI_PROVIDER=openai` to use the external Responses and Moderation adapters.
- Approved content is built into a standalone H5 game, interactive story, or article artifact. Every artifact has a manifest, validation report, version, preview route, public route, replay, return, local-save, share/copy, and optional CTA actions.
- Content moves through `generating → review_pending → draft → scheduled/published → archived`. Editing re-runs moderation; version history can be restored as a new draft and always rebuilds the artifact.
- AIP is posted only after an ordered runtime proof: `playable_start → step_complete → playable_complete`. Direct completion claims are rejected. Risk cases are created for impossible speed or excessive sessions.
- Campaign contracts include audience, channel, conversion goal, success metric, CTA, brand assets, locked fields, and explicitly Agent-optimizable fields. Campaigns move through `draft → pending_review → active/paused/completed/cancelled/rejected`. Brand organization verification and platform review are required.
- Creator participation moves through application or brand invitation. Invitations require creator acceptance; applications require brand approval before delivery eligibility.
- Campaign tracking links record `impression → playable_start → playable_complete` only when the referenced creator owns the content and has active Campaign eligibility.
- Deliverables move through `submitted → changes_requested → resubmitted → approved/rejected`; direct artifact preview, content type/version/moderation/build evidence, Campaign requirement checks, and review history are visible before approval.
- Legacy settlement issuance is retired for new economic events. AIT now moves through `pending → available/frozen/reversed → settlement_pending → settled/expired`, while benefit claims and payment settlements have separate review and evidence records.
- Content reporting, takedown, risk resolution, point adjustment, point freeze/restore/revoke, filtered/deep-linked notifications, Agent run records, session revocation, account export, cancellable deletion requests, and agreement acceptance are available in the product.
- Mobile workspaces expose four primary actions plus an accessible More sheet; dialogs support Escape, focus trapping, and focus restoration.
- A labelled, idempotent local demo workflow is available for product-state acceptance testing and is never presented as a real commercial Campaign.
- AIP can be consumed for a concrete platform utility: a 20 AIP content boost that raises a published item in discovery for 24 hours. The debit is a server-side ledger event and cannot be detached from its benefit.
- AIP remains a non-withdrawable internal behavior-point ledger. AIT is a separate, centralized Campaign entitlement ledger and is not freely transferable or tradable. AIT cannot be withdrawn directly. When an approved Contract permits a cash or USDT settlement, the application creates a separate payment record with human approval and payment/receipt evidence; no global AIT exchange rate exists.

## Deferred final phase: production infrastructure

The remaining infrastructure phase is: managed PostgreSQL, distributed job queue, multi-instance leases, object storage/CDN, container deployment, production secret management, centralized observability, backup/restore, and capacity testing. Until then, this release is a controlled single-node product MVP.

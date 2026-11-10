# Validation record

[Back to the tutorial](../../README.md)

The entries below distinguish local fixture checks from observed Google Cloud changes. Application configuration is entered through Settings; no application `.env` file is used. Historical entries describe their own dated checks.

## Live Console validation in progress — 2026-11-02

**Status: single-VM delivery and hardening validated; ALB/CDN validation is in progress.** The user approved one e2-medium with a 20 GiB standard disk in us-central1-a, reused for both routes, within a $1 operational validation budget. There is no owned domain; publicly trusted IP-address HTTPS still needs end-to-end validation.

Observed in the selected lab project through Google Cloud Console:

- Compute Engine, Artifact Registry, IAM Service Account Credentials, and IAP APIs enabled.
- Three named lab service accounts created: `gceweb-access`, `gceweb-ssh`, and `gceweb-api`. User-approved grants saved: repository Writer for access, Token Creator on SSH, project Compute Viewer and OS Admin Login for SSH, runtime Service Account User for SSH, repository Reader for runtime, and VM-scoped IAP Tunnel User with `destination.port == 22`.
- One access-account JSON key activated locally from ignored `secrets/`, with private file permissions. No JSON was uploaded to the VM or image. The local identity successfully impersonated the keyless SSH identity and connected through IAP after IAM propagation.
- Custom `gceweb-vpc` with one `gceweb-subnet` created. Optional broad firewall presets were left unchecked.
- Docker repository `gceweb-images` created in `us-central1`, with paid scanning disabled. The `backend:v1` image was pushed, checked in Console, and pulled on the VM by its attached runtime identity. Selected digest: `sha256:35abe6e9bda1ef69109b8757f8e02e0780e8611d3098b6b8374e7199e6fe1ca8`.
- One e2-medium VM created with a 20 GB standard disk, Debian 13, the custom subnet, Secure Boot/vTPM/integrity monitoring, OS Login, blocked project keys, and disabled serial access. Its startup metadata exactly matches the checked-in script. Effective SSH configuration rejects root, password, and keyboard-interactive login; unattended upgrades are enabled.
- Regional `gceweb-vm-ip` reserved and attached. The backend systemd service returns health; Nginx configuration passes and forwards local health. Docker reports user `10001:10001`, read-only root, all capabilities dropped, no-new-privileges, 768 MiB memory limit and 64 process limit. Port 8000 maps only to loopback. Temporary registry login files were removed.
- `gceweb-allow-iap` created and verified: ingress TCP 22, source `35.235.240.0/20`, target `gceweb-api`, logging enabled.

Local verification:

- Frontend production build succeeds with installed dependencies.
- Backend image builds successfully for `linux/amd64`, using the generic name `backend`.
- All 18 backend tests pass inside Docker under the intended runtime restrictions, with fixture providers. The production-container check passes for health/authentication, non-root execution, read-only code, dropped capabilities, resource limits, excluded private files, and SQLite persistence through container replacement. No paid model/search requests.
- All 26 helper fixture tests pass, including frontend build required before upload, backend push before a VM/public host exists, generic image naming, credential-free archives, and safe IPv4/TLS configuration rendering. This does not verify certificate issuance or Nginx runtime.
- Source syntax checks pass. Documentation checks pass for 17 Markdown files, 89 relative links and 51 Bash examples at this checkpoint.
- Google Cloud SDK 591.0.0 is installed in ignored `.tools/google-cloud-sdk/`. The official ARM archive's SHA256 matches Google's published value. User explicitly authorized this direct local installation as a task-specific exception to the VPS download rule.

Evidence is in `docs/images/gcp/`. Browser captures contain website content, with account controls excluded; the access-review screenshot keeps the complete dialog and filters personal IAM rows out. These screenshots show real setup, IAM, image upload, and VM states. They do not prove a completed public deployment. The ignored `.build/console-resources.json` records the lab resources for later cleanup.

Public single-VM checks passed with normal certificate verification: HTTPS page and health 200, unauthenticated sessions 401, missing path 404, HTTP 308 redirect, HTML no-store and hashed JavaScript immutable caching. The browser rendered the setup page without a certificate interstitial. Let’s Encrypt issued an IP-SAN certificate, and Certbot’s simulated renewal succeeded. The dedicated renewal timer is active. Host/service readback after a stop/start confirmed automatic recovery; the first web request during startup briefly returned 502 before the backend became ready.

**Still unvalidated:** ALB/bucket/CDN routing, imported ALB IP certificate, cache hits, and final cleanup. No real provider inference, workspace password setup, or paid model/search calls were performed on the cloud instance. Those user workflows have local fixture coverage described below. The VM was stopped while the first firewall approval was pending and restarted after approval; disk and static IP stayed allocated. Its direct public port 8000 timed out as expected.

## Console deployment, Artifact Registry, and two layouts — 2026-11-02

**Result: local helper checks and frontend build passed. Live Console deployment is not yet validated.** The student path now creates and deletes cloud resources in Console, with local Docker image build/push and local `gcloud` IAP access. Separate guides cover a single Nginx VM and a VM backend with ALB/CDN. Both use Debian 13 host hardening and a digest-pinned backend image from Artifact Registry.

The local identity is now `ACCESS_SERVICE_ACCOUNT`, with repository Writer and Token Creator on the keyless SSH identity. The attached VM account has repository Reader; its cloud-platform access scope and metadata token support the image pull. The previous role-free-runtime and CLI-provisioning descriptions below are historical. CLI lifecycle automation was retained under `tools/cloud-cli/` for maintainers and its own journal.

- `./scripts/check-local.sh` passes for shell, Python, and Node source.
- The **23 Python fixture tests** pass: seven new registry/metadata/Nginx-renderer/archive checks and 16 retained lifecycle/access checks. They exercise image digest validation, metadata request/header/token handling with a local response, hostname injection rejection, amd64 build/push command composition, failed-push handling, credential-free real archive contents, profile-specific frontend packaging, and IAP SCP identity/arguments. Cloud, Docker, and npm clients in helper tests are recording fixtures.
- `npm run build --prefix frontend` passes with existing dependencies. No frontend source or dependency versions changed.
- Documentation link/anchor, code-fence, and fenced Bash syntax checks pass for the student entry point and guides. Resource/role fields were checked against linked primary documentation, not an authenticated Console session.
- Reviewed the real Nginx template for path preservation, forwarded host/protocol, streaming, upload cap, cache/security headers, and missing-file behavior. Reviewed the two systemd network drop-ins and the pinned-image runtime setting. These are source checks, not runtime proof.

**Limits:** Docker Desktop’s daemon was not running, and no local Nginx binary was available. No fresh container/Nginx runtime check, registry push/pull, metadata-service request, certificate issuance/renewal, Google IAM/IAP login, Console interaction, or cloud deployment was performed. No Google resources, keys, paid provider requests, or internet downloads were created by this change. Actual Nginx configuration and TLS must pass the commands in the layout guide on the target VM.

Primary references are linked at the relevant Console steps and in [architecture](../architecture.md). They include Artifact Registry repository/authentication/Compute integration, OS Login/IAP permissions, global ALB backends/routing/certificates, Storage object metadata, Nginx proxy/header directives, and Certbot.

## Service-account IAP access — 2026-11-02

**Result: local checks passed. Live IAM/IAP authentication is not yet validated.** The supported access path now activates a deployment JSON key, then impersonates a separate keyless SSH service account through IAP. The VM runtime identity stays separate and has no Google API roles/scopes. The VM host image family is now `debian-13`; the Node container base is unchanged.

- `scripts/00-auth.sh` validates credential type/account metadata and activates only the configured deployment identity. The key directory is Git-ignored and the key remains outside deployment archives and Docker build inputs.
- `scripts/ssh.sh`, deployment SSH, and deployment SCP all use IAP and the distinct SSH impersonation target. Cloud commands explicitly select the deployment account.
- Provisioning uses `serviceAccount:` IAM members, grants Token Creator on the newly created SSH account, and gives that account Compute Viewer, VM-scoped OS Admin Login, runtime-account usage, and destination-restricted IAP access. Cleanup removes the SSH read binding and managed accounts while retaining the pre-existing deployer.
- All **16 lifecycle/access tests** pass against a recording fake `gcloud`. Checks include JSON metadata validation/redaction, wrong identity, absent/wrong-type key, IAP/impersonation arguments, credential-free file uploads, actual release archive contents, account separation, changed-owner rejection, key-path rotation, identity name collisions, partial failures, and resumable cleanup. Frontend/Node commands in the deploy test are stubbed; the archive is real. No live credential or model request is involved.
- `./scripts/check-local.sh` passes. Relative documentation links, heading anchors, code fences, and fenced Bash syntax checks pass.

Sources: Google’s [service-account SSH guide](https://docs.cloud.google.com/compute/docs/connect/set-up-service-account-ssh), [credential restrictions](https://docs.cloud.google.com/iam/docs/service-account-creds), [OS Login roles](https://docs.cloud.google.com/compute/docs/oslogin/set-up-oslogin), [service-account activation](https://docs.cloud.google.com/sdk/gcloud/reference/auth/activate-service-account), [GCP image families](https://docs.cloud.google.com/compute/docs/images), and [Docker Debian support](https://docs.docker.com/engine/install/debian/).

These tests verify local command composition and lifecycle behavior. They do not verify Google IAM propagation, IAP/OS Login server acceptance, real SSH key creation, Debian 13 bootstrap execution, DNS, TLS, or live deployment. No GCP resources or real credential files were created, and no dependencies were downloaded for this change. Earlier entries below describe their own historical baselines.

## Student documentation and organization — 2026-11-02

**Result: passed for the documentation change.** The main README now follows a student sequence: local Docker setup → cloud configuration and billing → provisioning → DNS/deployment → HTTPS and app checks → cleanup. Commands identify their location, explain their effect, and include expected results. Supporting guides live in `docs/`; design references and retired material have separate folders. Active application code, deployment script paths, and configuration behavior did not change.

- All relative Markdown links and heading anchors in the README and guides resolve locally. Code fences are balanced and all fenced Bash examples pass `bash -n`. Syntax checks do not execute the examples.
- `./scripts/check-local.sh` passes for the active shell, Python, and Node source.
- All six orchestration tests pass using the recording fake `gcloud`, including partial provisioning, name collisions, configuration mismatch, and resumable cleanup.
- Checked the walkthrough against the current Dockerfile, Vite proxy, Settings UI, provisioning/deploy/verify/cleanup scripts, and journal implementation. Both browser test commands invoke the same integration suite; the development guide now tells readers to run one.
- Budget-alert behavior and certificate status guidance were checked against the linked Google Cloud documentation. No cloud commands, dependency installation, Docker rebuild, paid provider calls, or new browser checks were run for this documentation-only change.

The interface and application entries below are historical checks, not fresh results for this change. Earlier UI screenshots predate the later removal of helper text, decorative background, and starter buttons.

## Liquid Glass interface — 2026-10-29

**Result: passed.** The floating sidebar, title-only toolbar, composer and menus use translucent silver fills, backdrop blur, reflective rim highlights, and shadows. Messages remain unboxed content; the model picker stays immediately before Send/Stop on the right. Typography and keyboard controls remain real HTML/shadcn components.

**Environment:** local Vite at `http://127.0.0.1:5173/`, Node 26.12.1, installed Playwright Chromium. Browser plugin unavailable; the existing Playwright suite was used. Desktop viewport is **1505×1045**, exactly matching the generated concept, with **390×844** and **320×800** mobile/narrow checks. High-contrast and Reduced Motion were also exercised.

| Check | Result |
| --- | --- |
| Production frontend build | Pass; no new runtime dependency or large-chunk warning |
| Page identity, nonblank content, framework overlay | Pass |
| Console errors/warnings | None in the checked flow |
| Glass materials | Pass: rendered blur, rounded surfaces and shadows; desktop and mobile screenshots inspected |
| Model and provider controls | Pass: provider setup, private-key handling, model filtering, persistence, Enter/Escape and focus restoration |
| Chat and document workflow | Pass: actual PDF/DOCX parsing, local Pi model/search fixtures, streamed reply, saved history, lock/login |
| Long conversations and narrow layouts | Pass: persistent composer, Jump to latest, bounded multiline input, resize anchoring, no horizontal overflow, correct model-before-Send placement |
| Accessibility adaptations | Pass: forced-colors mode removes blur; Reduced Motion makes transitions effectively immediate |

**Visual comparison:** `design-reference/concept.png` and the final desktop screenshot were inspected together at the concept's native viewport. Verified the inset sidebar, floating toolbar, white/silver light field, rounded reflective composer, system typography and preserved copy, and toolbar control order. The final rendering follows that design direction. The test chooses a different model name; control sizes and reading-column width retain the app's accessibility and text-layout scale. No blocking visual issues remain in the checked views.

**Evidence:** `/tmp/fieldnote-glass-qa/desktop-model-picker.png`, `mobile-model-picker.png`, `searchable-model-picker.png`, `desktop-conversation.png`, `mobile-chat.png`, `provider-settings.png`, and `high-contrast.png`. `QA_DIR` overrides this directory. Research, implementation choices, source links and limitations are recorded in `design-reference/sources.md`.

**Commands:** `npm run build --prefix frontend`; `QA_DIR=/tmp/fieldnote-glass-qa npm run test:integration --prefix frontend` from this tutorial directory. The material is a CSS approximation with blur, translucency and edge lighting, without live lens refraction or Apple's native adaptive rendering. Safari, Firefox, physical iOS devices and real-device GPU performance were not tested. No paid provider calls or cloud deployment were made.

## Neutral shadcn interface — 2026-10-29

**Result: passed.** The app uses a white canvas, light gray sidebar/user bubbles, black text/actions, and shared neutral shadcn tokens. The provider form uses shadcn Select. A searchable shadcn Combobox sits at the right of the composer, immediately before Send/Stop; no selected-model label appears in the header. Existing local components were retained. The three new public UI controls were generated and inspected in a fresh reference project on the designated VPS under `~/internet-downloads/shadcn-fieldnote/`, then converted to JSX and applied locally. No local project source was uploaded to the VPS and no local dependencies were added.

Guidance consulted: App Studio [Design](https://yuantang.atlassian.net/wiki/spaces/APPSTUDIO/pages/983042/Design) and [Chatbot UI: activity, answers and disclosure](https://yuantang.atlassian.net/wiki/spaces/APPSTUDIO/pages/8323074), plus the official shadcn Base UI Combobox, Select, Tooltip, Input Group, Field, and Button documentation. This is a focused update to the existing component system; no raster concept or new artwork was needed.

**Environment:** `http://127.0.0.1:5173/`, Node 26.12.1, Chromium via the existing Playwright suite. Browser plugin unavailable. Viewports: 1440×1000, 390×844, and 320×800; Reduced Motion also exercised.

| Check | Result |
| --- | --- |
| Page identity and useful initial content | Pass: Fieldnote title, workspace setup/login, chat and Settings render |
| Framework overlay and console health | Pass: no framework overlay, page errors, or console errors/warnings in the checked flow |
| Provider/model interaction | Pass: provider selection, saved-key handling, model filtering/no-results state, selection persistence, keyboard open/Escape/focus return |
| Composer and responsive layout | Pass: model immediately left of Send on desktop/mobile, no duplicate header model, 44-pixel targets, no narrow-window overflow |
| Conversation behavior | Pass: real PDF/DOCX upload and Pi tool loop through local fixtures, streamed answer/history reload, fixed composer, Jump to latest, bounded multiline draft, scroll anchoring on resize |
| Production build | Pass: settings, model picker and Markdown split into separate chunks; no large-chunk warning |
| Visual inspection | Pass: desktop, mobile, provider form, model popup and populated conversation screenshots inspected for palette, alignment, typography, spacing, focus and clipping |

**Interaction loop:** workspace setup → Settings → choose Anthropic and save a dummy API key → return to chat → search and select a model → reopen with Enter and dismiss with Escape → reload → restore custom local provider → connection prompt → upload PDF/DOCX → receive answer → generate a long conversation → scroll upward → Jump to latest → test bounded multiline input and mobile reflow → lock/unlock.

**Evidence:** `/tmp/fieldnote-provider-qa/desktop-model-picker.png`, `mobile-model-picker.png`, `searchable-model-picker.png`, `provider-settings.png`, `desktop-conversation.png`, and `mobile-chat.png`. A crowded mobile header and redundant textarea focus outline found during review were corrected. Required white/gray/black palette, right-aligned model placement, restrained trailing user bubbles, plain assistant answers, and persistent composer were verified. No material visual mismatches remain in the checked views. The web-search text label becomes an accessible icon control on narrow screens.

**Commands:** `npm run build --prefix frontend` and `npm run test:integration --prefix frontend` from the tutorial directory. No live inference/search, cloud deployment, full activity-trace feature, dark theme, or other browser engines were tested as part of this interface update.

## Provider and model picker update — 2026-10-29

Verified locally on **Node 26.12.1** with the existing installed dependencies. This update adds API-key provider selection in Settings and a Pi catalog model picker beside the chat message box. No dependencies were downloaded, no cloud resources were changed, and no paid model or search calls were made.

- **18 backend tests pass.** They cover provider-key separation and removal, private-key redaction, legacy custom-connection migration, catalog validation for every offered model, native API selection, automatic model limits/capabilities, authenticated catalog access, and the model used by the next chat request. Real Pi adapters are exercised against local Chat Completions and mocked native Anthropic streams.
- **Production frontend build and source syntax checks pass.**
- **Browser integration passes** at 1440×1000, 390×844, and a 320-pixel narrow layout. Flow: workspace setup → choose Anthropic and save a dummy key → choose another catalog model beside the message box → reload and retain selection → restore the custom local connection → connection prompt → PDF/DOCX upload → actual Pi tool loop with local model/search fixtures → streamed answer → saved history → lock and login. Page identity, nonblank content, no framework overlay, console health, and overflow checks pass.
- Screenshots are saved outside the workspace at `/tmp/fieldnote-provider-qa/` by default, including `provider-settings.png`, `desktop-model-picker.png`, `mobile-model-picker.png`, and `model-picker.png`. Set `QA_DIR` to change that directory. Browser plugin was not available; the existing Playwright integration suite was used.

Live provider keys, account-specific model access, native Google/OpenAI inference, OAuth, cloud deployment, and a fresh Node 22 Docker rebuild were not tested in this update. The older checks below describe the prior baseline, not new runs.

## Verified locally — prior baseline

| Check | Result and boundary |
| --- | --- |
| Bash/Python/Node syntax | `scripts/check-local.sh` passes for the active scripts, verifier, and Node source. No cloud commands are executed by this check. |
| Backend tests | **11 tests pass on Node 22.23.4 inside a Linux amd64 Docker container.** Settings validation and write-only keys, setup/password/cookie login, protected/public endpoints, no-store headers, text upload and streaming, saved sessions/delete, unsupported/oversized files and cleanup, context overflow, failed-turn rollback, concurrent request rejection, Pi's real OpenAI-compatible streaming/tool adapter, real PDF and DOCX extraction, image resizing and vision flag. |
| Pi integration | The actual `@earendil-works/pi-agent-core` / `pi-ai` 1.4.0 loop calls a local protocol fixture, executes a search tool, consumes its tool result, and streams a final answer. Checks model ID, image serialization, output cap, and non-thinking payload. This verifies the client integration, not DeepSeek's live account/capability/billing behavior. |
| Cloud lifecycle safety | **6 tests pass** against a recording fake `gcloud`: reverse cleanup, role-free VM service-account identity, restricted VM network ports, disabled API CDN, name collision ownership, partial failures, protection against overwriting an existing redirect map, changed config rejection, and resumable cleanup. No Google APIs are contacted. |
| Production frontend build | Succeeds on pinned Node 22.23.4 with React 19.3.1 and Vite 8.3.5. Markdown rendering loads as a separate chunk. Output includes hashed JS/CSS and a custom 404 page. |
| Browser UI checks | Playwright exercises one-time setup, password login/lock, Settings save/connection check, hidden saved keys, real PDF/DOCX chat with local model/search fixtures, history reload, and desktop/mobile layouts. No app console errors in the checked flow. The model/search responses are local protocol fixtures. Browser tests use the actual Node API and SQLite. |
| Complete local workflow | Actual browser → Vite `/api` proxy (preserving the original Host header for origin validation) → Node password/cookie authentication/multipart uploads → real PDF/DOCX parsing → Pi → local inference/search fixtures → streamed answer → SQLite → page reload. Passes on Node 22.23.4. No external inference is involved. |
| Hallmark checks | Static check: **0 FAIL, 0 REFLEX** on authored app files. Render check captures 1280/1440/1920 desktop and 375 mobile screens. F18 warnings about shadcn `data-slot="field-label"` are dismissed: these are ordinary form labels, not collapsed image slots. Desktop/mobile chat screenshots were also inspected. Finish review was in-thread; hit targets, placeholder contrast, and a redundant toast were corrected. |
| Runtime dependency audit | `npm audit --omit=dev` reports **0 known vulnerabilities** for both locked dependency trees on the check date. This is the registry audit result, not an independent security audit. PDF.js is pinned to patched 6.2.108. |
| Docker runtime | `node:22.23.4-bookworm-slim`, Linux amd64, built and run under Docker Desktop on the ARM Mac. All backend tests run with non-root UID 10001, read-only root, dropped capabilities, no-new-privileges, memory/PID limits, and tmpfs. The production image starts without env files; cookie login, model settings, and chats survive container replacement. User API keys are never build inputs; the production image excludes environment files, data, and test fixtures. |

The required test VPS was unreachable over SSH. The user explicitly authorized local dependency downloads for this tutorial. Dependencies/test browsers were installed for these checks; they are not application source and are excluded from publication by `.gitignore`. No permanent exception to the workspace's VPS download rule is implied.

Node 22 prints an experimental warning for its built-in SQLite module. Tests pass with that runtime. The app uses SQLite's synchronous interface for one small VM and two active requests; this is not a multi-host database design.

## Still requires GCP and a provider key

- Project billing, organization policy, API enablement, quotas, and Google API acceptance of the complete provisioning sequence.
- Debian/Docker installation and actual systemd-controlled container restarts on Compute Engine.
- OS Login/IAP administrator access and effective firewall rules, including the permitted SSH/API source ranges.
- DNS, managed certificate activation, HTTP redirect, path routing, proxy timeout/streaming behavior, backend bucket root/404 behavior, real CDN headers/hits/logs.
- Actual DeepSeek authentication, vision quality, tool calling, search availability, context accounting, latency, and billing.
- Real-resource cleanup and final billing reports. Cleanup is destructive to the lab's VM chat disk and app secret.

The supplied `scripts/03-verify.sh` prompts for the workspace password and performs real HTTPS/static/API checks after first-run setup. It creates/deletes one empty chat and makes no paid model call. The README then calls for small browser checks of inference, search, files, and persisted history.

## Repeat checks

Use the current [development guide](../development.md) for the organized check sequence. The commands below are retained with this historical record.

From the tutorial directory, using Node 22.23.4:

```bash
./scripts/check-local.sh
DOCKER_DEFAULT_PLATFORM=linux/amd64 ./scripts/check-docker.sh
npm ci --prefix backend --ignore-scripts
npm test --prefix backend
python3 -m unittest discover -s tests -p 'test_orchestration.py' -v
npm ci --prefix frontend
npm run build --prefix frontend
```

For browser checks, install the test browser with `cd frontend && npx playwright install chromium`, then return to this tutorial directory. Start `npm run dev --prefix frontend` in another terminal. Keep port 8000 free for the integration fixture (stop the normal backend container first):

```bash
npm run test:ui --prefix frontend
npm run test:integration --prefix frontend
```

The browser commands run the same integrated suite against a temporary API on port 8000, so stop the normal backend container before running them. It starts/stops its own API/provider fixtures, removes its temporary SQLite directory, and writes desktop/mobile chat, model-picker, and Settings screenshots under `/tmp/fieldnote-glass-qa/` (or `QA_DIR`). Screenshots contain fixture answers, not real DeepSeek outputs. Hallmark render captures are under ignored `frontend/.hallmark/shots/`.

This tutorial folder is not a Git checkout, so no commit or PR was created. The active app is `backend/src/` + `frontend/src/`. Earlier calculator Python files/tests are retained under `archive/transfer-calculator-20261026/` and are not run by the current checks.

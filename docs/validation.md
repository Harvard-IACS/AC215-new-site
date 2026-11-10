# AC215 showcase validation

Maintainer record. The replacement app has **not been deployed or validated on Google Cloud**. The Console screenshots below document setup; VM runtime checks and real Gemini inference remain outstanding.

## Current code checks

Checks on 5 November 2026 cover the Gemini integration and revised tutorial.

| Check | Result |
| --- | --- |
| Backend API and model fixtures | 22 native tests passed. Local HTTP fixtures cover GCP metadata authentication, Gemini selection and streaming, actual note reads, private-thought filtering, interrupted requests, and the shared daily cap |
| Deployment helpers | 14 current-workflow tests passed with fake cloud and Docker clients; obsolete CLI lifecycle tests removed |
| Source syntax | Bash syntax, Python parsing, and frontend check-script syntax passed |
| Frontend production build | Passed. All six readable HTML pages and public assets were generated |
| Tutorial | Updated for the six-page interface, saved scene preference, Gemini service-account setup, and persistent budget directory |

The Gemini adapter uses existing HTTP dependencies. No packages were installed for this change. It was tested with local fixtures. Applied model IAM, container-to-metadata access, real Gemini inference, and the deployment command still require live validation on a VM.

## Console screenshot refresh

On 5 November 2026, the 11 dark-mode illustrations in the active deployment guides were replaced with light-mode captures. Two additional images complete the Gemini setup sequence: API enablement, Enabled status, and the runtime-role review. The active guides now contain 46 GCP screenshots. The other 33 light-mode captures were retained.

The current Console labels `aiplatform.googleapis.com` as **Agent Platform API** and `roles/aiplatform.user` as **Agent Platform User**. The provisioning guide includes these labels and the service/role IDs.

Temporary keyless lab accounts, an empty `gceweb-images` repository, and `gceweb-vpc` with its one subnet were created for the captures, then removed. Console confirmed account removal, no repositories, and only the pre-existing default network. The VM list was empty. No VM, service-account key, model request, IAM grant, or firewall rule was created for this refresh. The role and firewall images show review forms; their captions identify that state. The Agent Platform API remains enabled.

Captures contain website content only. Account details were excluded by cropping the top bar or filtering the underlying principal list. Full-height permission panels retain their titles. Local link/image checks and visual review passed. Capture hashes and cleanup evidence are recorded in the ignored `.build/gcp-screenshot-refresh-20261105/` folder. These screenshots do not establish runtime model access or an app deployment.

## Deployment script review

On 5 November 2026, the deployment helpers were reduced to the Console workflow. CLI resource provisioning, automated cloud cleanup, its ownership-journal code, and the old VM-side image-build installer were removed. Authentication and IAP SSH coverage from the former lifecycle suite now lives with the current helper tests.

The shared library now derives only active access and registry settings. Unused machine-type configuration and the legacy host app-user/data-directory setup were removed. The service creates the numeric-UID-owned spending-ledger directory. Upload archives contain the chosen network profile; Nginx and frontend files are included only for the single-VM layout.

[Script explanations](scripts.md) cover each retained helper's inputs, steps, file changes, and expected result. Walkthrough commands link to those explanations. Verification passed: 14 helper tests, shell/Python/JavaScript-script syntax checks, and local documentation file/anchor checks. Tests cover key validation/redaction, SSH identity and argument forwarding, actual push digest capture, failed pushes, and both archive layouts without credential inclusion. These checks used local fake cloud/Docker clients; no VM installation or live cloud calls were run for this review.

## Earlier local baseline

Local checks recorded on 2 November 2026. These results do not imply cloud validation.

| Check | Result / evidence |
| --- | --- |
| Frontend production build and readable prerendered HTML | Passed: `npm run build --prefix frontend`; readable static HTML, no frontend runtime server |
| Backend native tests and local model protocol fixture | Passed in the earlier app baseline. All 13 tests ran natively and in the local amd64 test container. Local model fixtures covered two independent questions with no prior-turn leakage and no paid calls |
| Deployment-helper tests and source checks | Passed: 26 helper tests; Bash syntax, Python parsing and frontend check-script syntax passed |
| Restricted production container and no data mount | Passed locally: `backend:check`, UID 10001, read-only root, dropped capabilities, no-new-privileges, bounded memory/processes and temporary filesystem; health, notes Q&A and restart checked |
| SEC and classroom geometry | Passed: 300 seat cushions and backs, with 240 main seats and 60 raised rear seats, three rear entrances and six double-door sets; seat-floor and rotation checks pass; rear landing is on the lowest floor |
| Desktop/mobile browser, keyboard, themes and classroom journey | Baseline passed: all 17 browser/source scenario groups, zero page errors and 64 evidence artifacts; checked 320/390/768/1280/1920 widths, both themes, actual gradual 3D lighting, wall defocus, sequential opening, reversal, Pause, reduced-motion endpoints and mobile/no-JavaScript posters. Later camera/rear-seat refinements passed four focused groups with no page errors |
| Notes preview and actual file-read activity | Passed: real notes preview and inspectable file contents; streaming, nested read disclosures, answer-after-collapse, error, Stop and retained draft behavior checked; no source footer |
| Documentation links, examples and guide consistency | Passed: 17 active Markdown files, 139 local links/anchors and 44 Bash examples |

Local fixtures can verify the retrieval/API contract and model adapter without real provider use. They do not prove public cloud routing, IAM, VM registry access, CDN behavior, or real-provider model access.

Browser evidence is under `/tmp/ac215-course-qa/`. Chrome computer-use checks and the repository's isolated Chrome/Playwright suite exercise the production preview at `http://127.0.0.1:4173`. The separate Browser plugin was not listed in this session. Geometry/count checks are source-module checks; screenshots verify the rendered room, framing and door sequence. They do not establish an exact architectural floor plan.

The suite keeps byte-exact checks while a scene is stationary. Reentering the same reduced-motion room permits a tight image tolerance for subpixel edge sampling, with identical DOM framing: measured mean RGB difference 0.878/255, flat-color mean 0.047/255 and flat-color maximum 5/255. The return then remains byte-exact during further scrolling within that stationary endpoint. Completed browser contexts are closed before reduced-motion and no-JavaScript cases to release WebGL resources. The final suite completed at 22:27:03 UTC; `results.json` lists its checks and artifacts.

Focused camera records are separate from the full-suite baseline. `focused-route-results.json` verifies the raised rear banks and continuous interior path. The current exterior revision is recorded in `restored-street-route-results.json`: four groups passed with no page errors and zero collisions across 3,000 sampled visible-path segments. Its broad 114.91-degree turn is monotonic, with the whole building contained before the descent. The established street-side entry and aim are hall-local `[-32,5.95,37]` and `[-12,5.95,31]`; the room transform and interior endpoint are preserved. Door alignment, continuous movement, reversal, Pause and reduced-motion endpoints pass. A foreground street tree was moved clear of the fixed entry view, followed by a targeted frame check. Unchanged chat and navigation cases were not repeated for this camera/model-only refinement.

The fresh visual finish review returned `ship` for the wider room, curved rows, larger center screen, spacious atrium and sequential white double doors; its later focused review also returned `ship` for the continuous route and raised rear banks. The earlier people-section heading finding was resolved. The static and rendered Hallmark sweep reports zero failures or warnings, with the existing milestone-row height waiver and five rendered screenshots. The production build passes. The Three.js module remains a separate approximately 743 KB / 188 KB gzip chunk; Vite reports its size warning.

## Cloud checks still required

Before claiming cloud validation for this app, follow both layout guides and [verification](verify.md). Record the deployed digest and check the complete public asset tree, all six pages, course metadata, selected Gemini provider, streamed answers and file reads, error responses, cache headers, CDN reuse, container restrictions, blocked direct VM port, ledger persistence, and final cleanup. The HTTP lab uses public questions and VM identity. Model requests incur GCP charges.

Generic Console screenshots show the infrastructure workflow. Image digests, asset names, object counts, and app content in older screenshots do not establish a deployment result for the replacement app.

## Historical infrastructure evidence

The [retired Fieldnote cloud validation](archive/fieldnote-cloud-validation-20261102.md) records the earlier two-layout run, hardening, HTTP checks, cost estimate, and removal of its resources on 2 November 2026. It applies to that retired sample. Its authentication, storage, and app-test results do not apply to the AC215 showcase.

All named resources from that earlier run were removed. The temporary resources for the screenshot refresh were also removed. The [historical cost record](cost-preflight-20261102.md) is an estimate for that completed run, not a settled bill for this work.

## Milestone detail windows and compact hall

The milestone rows now open full reading dialogs with a compact header, section index, internal scrolling, blurred page backdrop and borderless outer fade. Internal divider lines remain. Light mode uses a paper-tinted backdrop. The original five source instruction bodies were compared exactly after recorded publishing edits and the instructor-requested removal of “Staff feedback: TBD”; provenance and commit hashes are in `design-reference/course-showcase/milestone-provenance.json`. The proposal example image is stored locally and loads in the window. Rubric tables support horizontal scrolling on narrow screens.

Focused browser verification is recorded in `/tmp/ac215-course-qa/milestone-modal-results.json`: all five windows, keyboard focus containment/return, Close and Escape, intermediate opening/closing frames, independent section scrolling, reduced motion, and 320/390/1440 light/dark layouts passed. Base UI removes the closing portal before a `transitionend` event is dispatched; tests observe actual intermediate exit frames and final removal. Static design checks pass. A fresh visual review returned `ship` for the compact header, sharp text, outer fade and retained dividers.

Main-row spacing is 2.65, bringing the last main row to local z9.25 and compacting the gap ahead of the rear banks. All 300 seats remain; seat-floor, door/camera-path and screen-view clearance checks pass. Room location, facing, doors and street-side entry remain fixed. Day/night classroom posters were refreshed from the updated scene. No cloud resources or paid model calls were used.

The final light-mode/table/content addendum is in `/tmp/ac215-course-qa/milestone-visual-addendum-results.json`: four affected checks passed with no page errors. The light backdrop blends with the paper surface; the 390px rubric scrolls inside its own wrapper with readable headers and no page overflow; the requested Staff feedback line is absent while the rest of MS1's checked content and image remain; dark styling is unchanged. The addendum preserves the earlier all-five result. Static and rendered design checks pass for the final source. Screenshots contain website content only.

## Separate course pages

The build now produces six readable static course pages: Home and five resource pages at `schedule.html`, `policy.html`, `tutorials.html`, `faqs.html`, and `showcase.html`. The shared header has a visible Home tab and five page links, with active-page indication. Home returns to the SEC landing page. These are document destinations, rather than section-scroll links. Nginx and the backend bucket can serve the files without URL rewrites. The home scene and Markdown resource pages load separately.

The official page-source hashes match `design-reference/course-showcase/pages-provenance.json`. The migrated content includes 23 FAQs, 23 tutorial lecture sections, the course policies and grade table, and all 29 dated rows from the published 2026 schedule. Blank topics remain unlisted. The schedule has a live-sheet link; source wording and resource links remain intact. Presentation changes are recorded in the provenance file. Project Showcase contains the requested Coming soon state, without invented projects.

Focused Chrome/Playwright evidence is in `/tmp/ac215-course-qa/pages-qa-current/`; the final narrow-screen, input, Home and no-JavaScript addendum is in `pages-qa-final-addendum/`. The separate Browser plugin was unavailable. Functional checks cover all five direct page loads, reload and browser history, active navigation, month filtering, tutorial/FAQ search and empty/clear states, native FAQ keyboard operation, policy anchors and grade table, mobile Menu/Escape, theme persistence, two real local notes-preview chat flows, and readable content with JavaScript disabled. Widths include 320, 390, 1280 and 1440 px. The existing homepage anchors and document Home return were also checked; unchanged scene geometry and lighting were not rerun as a full regression suite.

No-JavaScript contexts intentionally block module-preload execution; the evidence records those specific disabled-script requests separately from app failures. A fresh-browser check of the static error page found an implicit request for a missing favicon.ico; the error page now explicitly uses the existing favicon.svg. The original diagnostic result is retained when its harness classification is corrected.

The final production build and source syntax checks pass. The static/rendered design sweep passes in document/app scope with zero failures or warnings. The two existing short-caption measure warnings are documented dismissals; original course copy is retained. A fresh visual review returned ship for the five page layouts at desktop dark and mobile light. Screenshot evidence contains website content only. All active Markdown file links resolve. The Console upload instructions now include every generated page and the milestone-image folder. No cloud resources or paid model calls were used.

The affected input-border checks measure 5.33:1 in Light and 6.17:1 in Dark. The final header fits six tabs at 1280/1440 px; Home returns to the SEC page from desktop navigation and the 320px native Menu. All five 320px menus and footers keep Project showcase on one line. The error-page favicon fix is limited to its public HTML file and the matching copied build output.

Final reports record 11 page scenario groups and five affected addendum groups passed, with no application errors or missing assets. Original diagnostic results remain in the correction metadata. Two Canvas readback performance hints caused by the temporary color probe are identified separately; they are not application warnings. Both browser test files pass syntax checks.

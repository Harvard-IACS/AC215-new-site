# Verify the deployed app

[Back to the tutorial](../README.md)

These API and chat checks apply to the GCP tutorial's chat-enabled build (`VITE_ENABLE_CHAT=true`). The default static course build has no chat controls and requires no backend. Use the [local development checks](development.md#run-local-checks) for that version.

Use the VM IPv4 for Option A and the ALB global IPv4 for Option B. These HTTP checks use only public course questions. The tutorial selects Gemini with VM identity, so model questions incur GCP charges. The course site has no login or upload form. Keep private data out of this HTTP connection.

## Step 1: Check the page, API routing, and errors

**Your computer**, replacing `YOUR_PUBLIC_IPV4`:

```bash
curl -I http://YOUR_PUBLIC_IPV4/
curl -I http://YOUR_PUBLIC_IPV4/schedule.html
curl --fail http://YOUR_PUBLIC_IPV4/api/health
curl --fail http://YOUR_PUBLIC_IPV4/api/course
curl --fail http://YOUR_PUBLIC_IPV4/api/course/files/general.md
curl --fail --no-buffer http://YOUR_PUBLIC_IPV4/api/chat/stream \
  -H 'Content-Type: application/json' \
  -d '{"question":"How do group late days work?"}'
curl -i http://YOUR_PUBLIC_IPV4/lesson/intro
```

| Request | Expected result |
| --- | --- |
| `/` | HTTP 200, HTML, `Cache-Control` containing `no-store` |
| `/schedule.html`, `/policy.html`, `/tutorials.html`, `/faqs.html`, `/showcase.html` | HTTP 200, distinct readable page HTML, `Cache-Control` containing `no-store` |
| `/api/health` | HTTP 200 and `{"status":"ok"}` |
| `/api/course` | HTTP 200; four-file catalog, `provider: gemini`, `model: gemini-3.8-flash`, and `answer_mode: model` |
| `/api/course/files/general.md` | HTTP 200; plain-text current course notes |
| JSON question to `/api/chat/stream` | HTTP 200 with file-read events, answer text deltas, and a final answer with `mode: model`. The response uses `no-store`. |
| `/lesson/intro` | HTTP 404 |

Open the public HTTP page and confirm the frontend loads. The page and API use the same public address. Check the browser’s developer tools for missing assets or failed API requests. Confirm local fonts, staff images, SEAS logo, both day/night scene posters, and theme script load. Use the normal JavaScript-enabled browser interface and check navigation between pages.

### Check the interface

Use this table in your browser after the HTTP checks pass.

| Check | Expected result |
| --- | --- |
| All six header links and direct reloads | Correct page, marked active link, and complete content |
| Scroll a long page | Header stays visible. Section links and the desktop index remain below it |
| Phone header | Logo, theme controls, and Menu share one row. Menu opens and its links work |
| Home → FAQs → Home | Supported browsers animate page changes while the header stays steady. The SEC loading image and live model keep the same opening size |
| Schedule, Tutorials, and FAQs | Month filters, searches, clear/empty states, and animated FAQ disclosures work |
| Home milestones | Each row opens its full instructions. The section index follows reading, and Close/Escape returns focus |
| SEC scene | Resume enables the continuous route through the wall, atrium, and opening double doors. Pause remains selected after reload and page navigation |
| Theme and accessibility settings | Light/Dark/System persists on the same site. Reduced motion, reduced transparency, and unavailable WebGL use their fallbacks |
| Project Showcase | Coming soon and the poster-session illustration appear |

Page effects depend on browser support and motion preferences. The six pages must remain readable and navigable when an effect is unavailable. [Browser page transitions](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document).

Ask an unrelated question. Expect the course-only response, `mode: "not_found"`, and an empty source list. An empty or too-short JSON question should return HTTP 422. Each server question is independent. Check answer claims against the text in the file-read details or the API's public note URLs.

On a fresh page, click the bottom-right chat button. It should expand into the chat window on its first opening. Submit a public course question. Check that file reads appear live, nested input/result disclosures show actual note reads, and activity collapses before the answer. Minimize and reopen. The draft and temporary turns should remain. Clear, reload, or navigation to another course page discards them. Source text is available in the file-read details. The input shows the concise AI-mistakes reminder.

Expect `data:` events of type `started`, `read_start`, `read_complete`, `answer_delta`, and `answer`. A failed run can send `error` after the HTTP stream has begun. Events should arrive as work happens. If they arrive together, inspect Nginx API buffering and any proxy in the route.

## Step 2: Check static caching

Find a compiled JavaScript URL under `/assets/` in the browser’s Network panel. Fetch it repeatedly from your computer:

```bash
curl -I http://YOUR_PUBLIC_IPV4/assets/YOUR_COMPILED_FILE.js
curl -I http://YOUR_PUBLIC_IPV4/assets/YOUR_COMPILED_FILE.js
```

- Both layouts: hashed assets use `public,max-age=31536000,immutable`.
- Option A: Nginx serves the files from the VM.
- Option B: `X-Cache-Status: hit` and an `Age` header show cache reuse. An initial miss is normal.
- HTML and API responses remain `no-store`.

A CDN hit for JavaScript does not cache model inference or reduce a chat request’s model tokens. In Option B, also check the bucket objects’ metadata in Console.

## Step 3: Check the selected image and container

**Your computer:** connect with `./scripts/ssh.sh`.

**Inside the VM:**

```bash
sudo systemctl status webdemo --no-pager
sudo docker inspect --format '{{.Config.Image}}' gce-web-api
sudo docker inspect --format '{{.State.Health.Status}}' gce-web-api
sudo docker exec gce-web-api id
sudo docker port gce-web-api
```

Expect the selected Artifact Registry digest, a healthy container, and UID/GID `10001:10001`. Option A publishes port 8000 on loopback; Option B publishes the port used by the source-restricted ALB backend. Use [VM operations](operations.md) to inspect the remaining restrictions.

For Option B, confirm **HEALTHY** for the one VM in the API backend’s Console view.

## Step 4: Check service recovery

**Inside the VM:**

```bash
sudo systemctl restart webdemo
curl --fail http://127.0.0.1:8000/api/health
```

Allow startup time, then retry health if necessary. The service should return `{"status":"ok"}` and use the same pinned image and Gemini model. The budget ledger directory stays mounted across restarts. Repeat a public course question and check its file-read details.

## Step 5: Verify the firewall

Open **Console → VPC firewall rules** and inspect the rules for `gceweb-vpc`. Confirm that the target tag matches the VM’s `gceweb-api` network tag.

| Ingress | Option A | Option B |
| --- | --- | --- |
| TCP 22 | `35.235.240.0/20` only | Same IAP rule |
| TCP 80 to VM | `0.0.0.0/0` | No allow rule; Nginx stopped |
| TCP 8000 to VM | No allow rule; container on loopback | `35.191.0.0/16` and `130.211.0.0/22` only |
| Other incoming ports | Implied deny | Implied deny |

**Your computer**, using the VM address even when testing Option B:

```bash
curl --connect-timeout 5 --max-time 8 http://VM_EXTERNAL_IP:8000/api/health
```

Expect a connection timeout. Then confirm the intended public HTTP health route and `./scripts/ssh.sh` still work. Option B’s backend must remain healthy in Console.

The VPC firewall restricts incoming sources before traffic reaches Docker’s published port. UFW alone does not protect Docker-published ports. [GCP implied firewall rules](https://docs.cloud.google.com/firewall/docs/firewalls#implied_rules), [Docker and host firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/#docker-and-ufw).

Complete [Cleanup in Console](cleanup.md) at the end of the exercise.

# Develop and check the AC215 course site

[Back to the tutorial](../README.md)

Use Node.js 22.23.4 from `frontend/.nvmrc` and Python 3.12. Run commands from `tutorials/gcp-compute-engine-web`. Cloud deployment starts with the frontend build in the README. Local running is optional.

## Build the static frontend first

**Your computer — tutorial folder:**

```bash
npm ci --prefix frontend
npm run build --prefix frontend
```

The default build has chat disabled. It creates `frontend/dist/` with twelve prerendered pages and all public assets. Home uses `/`; Schedule, Policy, Tutorials, FAQs, and Project Showcase use `/schedule.html`, `/policy.html`, `/tutorials.html`, `/faqs.html`, and `/showcase.html`. Supplementary readings use `/readings.html`, and the five full milestone pages use `/milestone1.html` through `/milestone5.html`. Each URL requests a real static file and supports direct loads without a routing server. Deploy the complete output, including the compatibility folders for the original reading and milestone URLs. The default site needs no backend or frontend runtime server.

Run the default site locally with `npm run dev --prefix frontend`. The development server renders the same complete page HTML as the build and loads the stylesheet from the document head. This keeps the header present at the first paint and lets cross-document navigation animate normally. There is no chat launcher, Home chat prompt or FAQ chat button, and the frontend makes no API requests. The backend and chat implementation remain in the repository.

## Run the optional chat locally

### Start the Python backend

**Terminal 1 — your computer, tutorial folder:**

```bash
python3.12 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
cd backend
COURSE_PROVIDER=preview .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Leave this terminal running. The server loads the four editable public Markdown notes and their catalog. The explicit preview setting runs local checks without paid model calls.

### Start Vite

**Terminal 2 — your computer, tutorial folder:**

```bash
VITE_ENABLE_CHAT=true npm run dev --prefix frontend
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). With `VITE_ENABLE_CHAT=true`, Vite enables the chat interface and forwards `/api` requests to port 8000. Open the floating chat at the bottom right and ask a public course question. Expect a clearly labelled notes preview, real file-read activity, and inspectable note contents. The page has no setup or login step. This flag controls the frontend build; changing it requires restarting Vite or rebuilding the static files. It contains no credentials.

On desktop, scroll through the course introduction. The camera moves from the SEC exterior through the first-floor atrium and two opening white double-door sets into the lecture hall. Pause freezes the scene. The browser remembers Pause/Resume and the selected theme across reloads and page navigation on the same origin. Press Resume before checking the camera route. Phones show a still classroom view.

Use the header to open each course page. It stays visible while scrolling and fits on one row on phones. Supported browsers animate navigation, chat opening and disclosures. Reduced Motion and Reduce Transparency settings use their accessible fallbacks.

**Terminal 3 — your computer:**

```bash
curl --fail http://127.0.0.1:8000/api/health
curl --fail http://127.0.0.1:8000/api/course
curl --fail --no-buffer http://127.0.0.1:8000/api/chat/stream \
  -H 'Content-Type: application/json' \
  -d '{"question":"How do group late days work?"}'
```

Expect health `{"status":"ok"}`, course metadata, and an answer with `mode: "sources"`, `sources`, and `updated_on`. Ask an unrelated question to check the no-match path. Check returned claims against the note contents in the read-tool details.

Expect `started`, file read events, and `answer` events as `data:` lines. Errors after streaming starts are `error` events, so inspect the event body as well as the HTTP status.

Press `Ctrl+C` in the backend and Vite terminals when finished.

### Check Gemini

Follow the deployment guide to run Gemini on the GCP VM with its attached service account. Confirm `provider: "gemini"` and `model: "gemini-3.8-flash"` in `/api/course`, then submit a public course question and check the streamed answer. The [course Q&A guide](providers.md) explains the file-reading flow and daily cap.

Local Gemini tests replace metadata and model HTTP responses with fixtures and make no paid requests.

## Find the code

| Path | Responsibility |
| --- | --- |
| `backend/app/main.py` | FastAPI routes, input validation, and public response headers |
| `backend/app/knowledge.py` | Load the file catalog, read allowlisted notes, and match keywords for the no-key preview |
| `backend/app/qa.py` | Shared course instructions, allowlisted file reads, streamed answers, and local preview events |
| `backend/app/gemini.py` | GCP VM identity authentication and Gemini selection/streaming |
| `backend/app/budget.py` | Shared daily model cap and persistent spending ledger |
| `backend/knowledge/*.md`, `catalog.json` | Four editable public course notes with catalog metadata and update date |
| `backend/tests/` | API, allowlisted file reads, input, and model-fixture checks |
| `frontend/src/App.jsx`, `home-page.jsx`, `course-pages.jsx` | Shared page shell, home experience, and five course pages |
| `frontend/src/data/course-pages/` | Course policy, FAQs, tutorials, and the published schedule snapshot |
| `frontend/src/data/milestones/ms1.md` through `ms5.md` | Full instructions shown in milestone detail windows |
| `frontend/src/sec-scene.jsx`, `sec-journey.js` | Scene loading, saved playback preference, and scroll camera |
| `frontend/scripts/prerender.mjs` | Produce one readable HTML file per page |
| `scripts/00-auth.sh`, `ssh.sh` | Local cloud access identity and IAP SSH |
| `scripts/build-push.sh` | Local amd64 backend build and registry push |
| `scripts/upload-vm-files.sh` | Allowlisted VM archive and image reference, sent through IAP |
| `vm/` | Debian host hardening, registry deployment, service, and Nginx installation |

## Maintain the public course notes

Edit `backend/knowledge/general.md`, `lectures.md`, `milestones.md`, or `project.md` and keep the catalog titles, descriptions, and `updated_on` accurate. These notes are public through `/api/course/files/{filename}`. Never add credentials or private student information. Restart the local backend after edits. Rebuild and redeploy its image to publish changes on the VM.

The public pages use the source files in `frontend/src/data/course-pages/`. Preserve the policies, answers, and tutorial instructions when updating their presentation. `schedule.json` is a snapshot of the published timetable; its live link remains on Schedule. Refresh the snapshot when the timetable changes and record its source in `design-reference/course-showcase/pages-provenance.json`. Keep the four backend notes consistent with material course changes. Rebuild the frontend after editing page content.

| What you edit | Publish the change |
| --- | --- |
| Page content, milestone instructions, styles, scene, or public images | Rebuild the frontend and replace the complete `dist/` contents using the selected layout guide |
| Chatbot notes, catalog, or backend code | Build and push a new backend image, then deploy its pinned digest |
| A course requirement shown on the site and used by the chatbot | Update both sets of source files, then publish both builds |

The chatbot reads its four notes. It does not automatically ingest the page files or full milestone instructions.

## Run local checks

**Your computer — tutorial folder:**

```bash
(cd backend && .venv/bin/python -m unittest discover -s tests -v)
./scripts/check-local.sh
python3 -m unittest discover -s tests -p 'test_*.py' -v
npm run build --prefix frontend
```

The [verification-script table](scripts.md#optional-local-verification-scripts) explains the source checks and optional Docker checks, including their local outputs. Backend tests use local fixtures and do not require paid requests. Deployment-helper tests use fake cloud/Docker clients and local archives. These checks do not prove that current IAM, Console steps, registry access, or a cloud deployment work. Record actual results in [validation](validation.md).

To check the default production build, run the following from the tutorial folder. The backend can remain stopped.

```bash
npm run preview --prefix frontend -- --port 4173 --strictPort
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). The default preview uses only static files. For a chat-enabled build, run `VITE_ENABLE_CHAT=true npm run build --prefix frontend`, keep the backend running, and start preview with `VITE_ENABLE_CHAT=true npm run preview --prefix frontend -- --port 4173 --strictPort`. The flag must match when building and testing the optional chat.

Check the [browser verification table](verify.md#check-the-interface) on desktop and mobile. Minimize must retain turns and draft. Clear, reload, and navigation to another page must discard them. Check that the server receives only the current question. Prerendered content must remain readable before JavaScript starts.

With the default production preview running, `npm run test:pages --prefix frontend` checks page navigation, mobile Menu, themes, filters, search, FAQ keyboard use, local readings/milestones, stable-header page transitions and the absence of chat controls and API requests. Evidence is written under `/tmp/ac215-course-qa/pages-qa-current/`. The full `test:integration` suite also checks the home scene. To include the preserved chat checks, test a chat-enabled build with the preview backend and set `VITE_ENABLE_CHAT=true` on the test command.

## Run the production container locally

With Docker running, **from the tutorial folder**:

```bash
docker build --pull --target production --tag backend:local backend
docker run --rm --init --name backend-local \
  --user 10001:10001 --read-only --cap-drop=ALL --security-opt=no-new-privileges=true \
  --memory=768m --memory-swap=768m --pids-limit=64 \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --env COURSE_PROVIDER=preview \
  --publish 127.0.0.1:8000:8000 backend:local
```

This container has no data mount and needs no provider key. Use the local API checks above. In another terminal, `docker stop backend-local` stops and removes it. On an ARM Mac, use `--platform linux/amd64` when checking the VM architecture.

Run `./scripts/check-docker.sh` for the repository’s container checks. For an actual release, build/push a new tag, inspect its digest in Console, and follow your selected deployment guide. The VM pulls the image; it does not install Python dependencies on the host.

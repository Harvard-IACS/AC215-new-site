# Course guide and public notes

[Back to the tutorial](../README.md)

Chat is disabled in the default course website. Its full frontend and backend code remain available. To use this guide, enable the frontend with `VITE_ENABLE_CHAT=true` when starting Vite or building the frontend, and run the backend. The GCP walkthrough enables this flag explicitly. The default static site has no chat entry points or API requests.

The course guide answers questions from four editable public notes: `general.md`, `lectures.md`, `milestones.md`, and `project.md` in `backend/knowledge/`. `catalog.json` supplies their titles, descriptions, and `updated_on` date. Maintain these files when course information changes.

Ask a question such as “How do group late days work?” or “What does Milestone 4 require?” Expand the file-read details to check the note text used for the answer. For questions the notes cannot resolve, ask the teaching team in [Ed Discussion](https://edstem.org/us/courses/97373/discussion). Lecture materials are in [Ed Lessons](https://edstem.org/us/courses/97373/lessons). Ed requires course access.

## Use the floating chat

Open the chat at the bottom right of the course page. It is non-modal: the rest of the page remains available. While a question runs, a live work group shows file reads. Expand a tool row to inspect its filename input and returned note text. The activity group collapses before the answer appears and can be reopened.

Minimize keeps the current draft and temporary turns. Clear, reload, or navigation to another course page removes them. Turns exist only in React memory. Every server question starts an independent run. Include the needed context in each question.

## Connect Gemini on the VM

Complete the shared Console setup. Enable `aiplatform.googleapis.com` and grant the existing runtime account `roles/aiplatform.user`. In either deployment guide, end the installer command with `gemini`, for example `deploy-from-registry.sh IMAGE_REFERENCE single-vm gemini`.

The installer sets `COURSE_PROVIDER=gemini` in `/etc/systemd/system/webdemo.service.d/30-provider.conf`. Gemini obtains the project ID and short-lived token from VM metadata and calls the global endpoint. No Gemini key, runtime JSON key, or secret `.env` file is needed. The local JSON used for image push and IAP SSH stays on your computer. [VM identity authentication](https://docs.cloud.google.com/compute/docs/access/authenticate-workloads).

## How Gemini answers

The backend uses the GenerateContent API with `gemini-3.8-flash` and low thinking for the tutorial's short questions. Gemini selects up to three catalog files through `read_course_files`. The backend reads the selected files, then sends those notes with the question for a streamed answer. The prompt limits answers to facts supported by the supplied AC215 materials. [Gemini model](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-8-flash).

A model answer can be incomplete or wrong. Check the note text in the file-read details, and ask staff when the material does not settle the question. The input includes a reminder that students remain responsible for understanding course material and policies.

## API contract

Questions use JSON `{"question":"How do group late days work?"}` and must contain 3–800 characters.

| Endpoint | Result |
| --- | --- |
| `GET /api/health` | `{"status":"ok"}` |
| `GET /api/course` | Course metadata, `updated_on`, file catalog, `answer_mode`, `provider`, and `model` |
| `GET /api/course/files/{filename}` | Plain text for an allowlisted public Markdown file; unknown filenames return 404 |
| `POST /api/chat/stream` | Server-sent events: `started`, `read_start`, `read_complete`, `answer_delta`, `answer`, or `error` |

The final `answer` event contains `answer`, `sources`, `mode`, `updated_on`, and `elapsed_ms`. Each source includes `id`, `filename`, `title`, a same-origin URL such as `/api/course/files/general.md`, and `excerpt`. Read steps include the filename input and actual returned public note text.

`mode` is `model` for a generated answer, or `not_found` when Gemini selects no relevant notes. The streaming `answer` event supplies the final answer fields. Preceding read events supply the activity. Streaming errors are `error` events.

A model request can incur charges. The GCP lab authenticates with VM identity and uses public course questions. Actual model access still needs the live checks in the deployment guide.

The budget ledger stores daily totals only. The app has no account, cookies, session, saved conversation, or upload endpoint. Public notes can be read by any visitor; keep private information out of them and out of HTTP questions.


## Daily model budget

All visitors share a USD $10 limit per Eastern calendar day. The backend reserves a conservative maximum before each paid request, including note selection. It releases the unused portion after a completed request reports token usage. Thinking tokens count toward output cost. An interrupted call without usage keeps its reservation for the day. As a result, the guide can stop below $10 in actual model charges. The streaming endpoint sends a `daily_budget` error event when blocked.

The SQLite ledger lives at `/var/lib/gce-web-budget/ledger/chat-budget.sqlite3` on the VM. Keep that directory across restarts and redeployments. All workers must share it on the same host. The cap covers this app's model calls. It excludes VM, load-balancer, storage, and unrelated API charges.

Accounting uses conservative published rates. Gemini is budgeted at global standard rates of $1.50 per million input tokens and $7.50 per million output tokens, including the announced January 2027 rates. Introductory discounts can make billed use lower. Review the rates before changing the model or pricing assumptions. [Gemini pricing](https://cloud.google.com/model-garden/pricing).

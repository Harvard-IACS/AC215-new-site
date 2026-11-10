# Troubleshooting

[Back to the tutorial](../README.md)

| Symptom | Check |
| --- | --- |
| Backend will not start locally | Python 3.12 environment/dependencies, free port 8000, and running from `backend/` |
| Local container will not start | Docker running, free port 8000, and correct image/architecture. The no-key local example needs no data volume; paid chat needs a writable, persistent budget directory |
| Local access key rejected | `ACCESS_SERVICE_ACCOUNT`, JSON `type`/`client_email`, and key path; run `00-auth.sh` |
| IAP SSH denied | IAM Credentials API, Token Creator, OS Login, runtime-account usage grant, VM IAP grant, and IAP firewall |
| Registry push denied | Regional registry host/project/repository and local account’s repository Writer grant |
| Registry tag already exists | Use a new release tag when tags are immutable |
| VM pull denied | Attached runtime account, repository Reader, cloud-platform access scope, location, and outbound connectivity |
| Image will not run on VM | Build target `linux/amd64`, full digest reference, and successful pull before restart |
| Bootstrap marker absent | Complete startup script, package downloads, startup logs, and organization policy |
| Nginx reports 502 | `webdemo` status, container health, loopback port 8000, digest, and Nginx error log |
| ALB backend unhealthy | Named port `http:8000`, VM tag, source-restricted firewall, `/api/health`, and running service |
| Page loads but Q&A fails | Same-origin `/api` routing, backend health, valid JSON question, and service logs |
| Deployed guide says notes preview | Confirm the deployment command ends with `gemini`, then check `COURSE_PROVIDER=gemini` in the service configuration. Restart the service and confirm `provider: gemini` in `/api/course` |
| File-read activity arrives only at the end | Nginx `proxy_buffering off` on the API route, API CDN disabled, and `/api/chat/stream` response events |
| Follow-up question lacks prior context | Each server request is independent; include the needed context in the current question |
| No relevant answer found | Ask about the public Markdown course notes. Inspect the file-read details or ask staff in Ed Discussion |
| Model run fails | Check the streamed `error` event, network access, runtime-account permissions, quota, and ledger permissions. An error can arrive after HTTP 200 |
| Gemini run fails on the VM | Confirm `aiplatform.googleapis.com` is enabled, the VM has the intended attached account and cloud-platform scope, and that account has `roles/aiplatform.user` in this project. Check quota and ledger permissions |
| Gemini fails on your laptop | This adapter obtains credentials from GCP VM metadata. Use the free notes preview for local development and local HTTP fixtures for Gemini tests |
| Chat says today's budget is used up | All visitors share the daily model allowance. It resets at midnight Eastern. Interrupted calls can keep their conservative reservation |
| Bucket page downloads or is stale | Content-Type, root `index.html`, website configuration, and per-object Cache-Control |
| Fonts, staff images, or scene missing | Upload the entire `dist/` tree, including all six HTML pages, `brand/`, `fonts/`, `staff/`, `assets/`, `milestones/`, the theme script, posters, and showcase illustration. Preserve paths |
| Static asset fails after an update | Upload assets before HTML, retain prior hashed assets, and check the `assets/` prefix |
| Scene is static | Check the saved Pause setting and press Resume. Phone layouts, Reduced Motion, and unavailable WebGL also use still views |
| Theme or Pause preference differs on another address | Preferences belong to the browser origin. A different scheme, host, or port has separate storage |
| Blur or page animations are absent | Check browser support, Reduced Motion, Reduce Transparency, and forced-color settings. Navigation and reading must still work |
| Theme flashes or logo is missing | `theme-init.js`, both PNG posters, and `brand/` were copied; compare full `dist/` tree |
| Chat disappears after reload or changing course pages | Expected. Turns and draft are temporary React state. Minimize retains them within the current page |

For VM logs, **on your computer**:

```bash
./scripts/ssh.sh --command='sudo journalctl -u webdemo -n 50 --no-pager'
```

Use [VM operations](operations.md) to inspect effective host/container settings. Do not include model keys, service-account JSON, or metadata tokens in shared logs. For partial Console setup, remove only the resources you created using [cleanup](cleanup.md).

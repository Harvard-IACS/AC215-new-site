# VM hardening and operations

[Back to the tutorial](../README.md)

Create/configure cloud resources in Console. Use `./scripts/ssh.sh` on your computer to open the VM shell. Commands below run **inside the VM** unless labeled otherwise.

For installer arguments, file changes, and execution order, read [the script guide](scripts.md).

## What the host startup script does

[vm/startup.sh](../vm/startup.sh) runs as root when the VM starts:

| Configuration | Purpose |
| --- | --- |
| `apt-get update` and `apt-get upgrade` | Refresh package indexes and apply available host updates |
| `unattended-upgrades` policy | Schedule package-list refresh and unattended upgrades according to Debian’s policy |
| SSH password/keyboard-interactive/root login disabled | Use key-based OS Login administration |
| `sshd -t` before SSH reload | Check the configuration before applying it |
| Official Docker Debian package repository | Install Docker Engine and Buildx |
| `/opt/gce-web/releases` | Keep deployment configuration in versioned release directories |

The host is Debian 13. The backend image supplies its own Python 3.12 runtime and dependencies. Host package updates do not rebuild that image. A kernel/library update can still require a reboot; inspect update results and plan it.

Check effective host settings:

```bash
cat /etc/os-release
sudo sshd -T | grep -E 'passwordauthentication|kbdinteractiveauthentication|permitrootlogin'
sudo systemctl status apt-daily-upgrade.timer --no-pager
test ! -f /var/run/reboot-required || cat /var/run/reboot-required
```

Expect Debian 13 and the three SSH login settings set to `no`. OS Login and IAP permissions are configured in Console as shown in the shared guide.

## What the container service does

[vm/webdemo.service](../vm/webdemo.service) is supervised by systemd. The service controller uses host Docker; the application inside the container runs as UID/GID 10001.

| Runtime option | Purpose |
| --- | --- |
| `--user 10001:10001` | Non-root app process |
| `--read-only` | Read-only container root filesystem |
| `--cap-drop=ALL` | Remove Linux capabilities |
| `--security-opt=no-new-privileges=true` | Prevent privilege gain through set-ID programs |
| `--tmpfs /tmp:rw,noexec,nosuid,size=64m` | Bounded temporary filesystem |
| Bind mount at `/app/data` | Preserve the optional paid-chat spending ledger across container restarts and releases |
| `--memory=768m`, `--memory-swap=768m`, `--pids-limit=64` | Bound memory, extra swap use, and processes/threads |
| `--init` | Reap child processes and forward signals |
| Local Docker log driver, 10 MB × 3 files | Bound retained container logs |
| `--pull=never` | Run the selected image already pulled during deployment |
| `--rm` and systemd `Restart=always` | Recreate an exited container; an explicit service stop keeps it stopped |

Network and image settings are installed as systemd drop-ins:

- **Single VM:** `API_PUBLISH=127.0.0.1:8000:8000`, for Nginx on the host.
- **ALB/CDN:** `API_PUBLISH=8000:8000`, for the source-restricted load-balancer connection.
- **Both:** `API_IMAGE` is the Artifact Registry reference ending in the selected SHA-256 digest.

The registry installer pulls that image using the attached VM account's short-lived token. It removes temporary Docker login files after the pull. The app reads its public Markdown course notes and catalog from the image. With `gemini` selected, it obtains its own short-lived token from VM metadata and invokes Gemini using that identity. The service needs no Gemini key or runtime JSON file.

The deployment guides pass `gemini` as the third argument to `deploy-from-registry.sh`. It writes `COURSE_PROVIDER=gemini` to the `30-provider.conf` service drop-in. Keep this argument when deploying another release.

Check effective container settings:

```bash
sudo systemctl status webdemo --no-pager
sudo docker exec gce-web-api id
sudo docker inspect --format '{{.Config.Image}}' gce-web-api
sudo docker inspect --format '{{.Config.User}} {{.HostConfig.ReadonlyRootfs}} {{json .HostConfig.CapDrop}} {{.HostConfig.Memory}}' gce-web-api
sudo docker port gce-web-api
sudo docker inspect --format '{{.State.Health.Status}}' gce-web-api
sudo docker inspect --format '{{range .Mounts}}{{println .Source "->" .Destination}}{{end}}' gce-web-api
curl --fail http://127.0.0.1:8000/api/course
```

Expect UID/GID 10001, read-only `true`, dropped capabilities, memory 805306368 bytes, the selected digest, and the port for your layout. The mount should map `/var/lib/gce-web-budget/ledger` to `/app/data`. The ledger directory is writable by container UID 10001. Do not print credentials or metadata tokens.

Docker records the `/api/health` health check. An unhealthy-but-running container is not automatically replaced by that check; systemd restarts a process that exits. Option B’s ALB separately checks API health before sending requests.

## Logs and restart

```bash
sudo docker logs --tail 50 gce-web-api
sudo journalctl -u webdemo -n 50 --no-pager
sudo systemctl restart webdemo
```

For bootstrap errors:

```bash
sudo journalctl -u google-startup-scripts.service -n 80 --no-pager
sudo tail -n 80 /var/log/gce-web-bootstrap.log
```

For Option A, also inspect `sudo nginx -t`, and Nginx logs. Option B’s backend health and CDN logs are in Console.

## Deploy another image

On your computer, run `./scripts/build-push.sh v2` and confirm that image in Artifact Registry’s Console view. Transfer the VM files again. Inside the VM, unpack the archive and run `deploy-from-registry.sh` with the new `image-ref.txt` and your layout name.

The installer pulls the image before restarting the app. Failed pulls stop deployment. A successful deployment briefly interrupts this single backend VM. Keep the ledger directory when updating the image or switching layouts so an optional paid-chat deployment retains its daily totals. The image reference is recorded in `/opt/gce-web/current/image-ref.txt`.

To return to an earlier image, copy that version's full digest reference from Artifact Registry in Console, then rerun the VM installer with that reference and the same layout. Test API health, the Gemini configuration, course metadata, and a public course question after the change. Retain the spending ledger.

Frontend updates follow the chosen layout guide. Retain older hashed assets while open browser tabs may still request them. Review old image versions and host disk use deliberately; avoid broad pruning of unrelated workloads.

## Recovery

Keep your source, selected image digest, and `config.env` record. Rebuild public frontend files from source and redeploy the chosen backend image. Preserve the ledger when moving the deployment to another VM during the same budget day. Chat conversations are temporary. Keep the local service-account JSON private. Follow [cleanup](cleanup.md) when the exercise ends.

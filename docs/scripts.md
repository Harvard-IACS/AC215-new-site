# What the deployment scripts do

[Back to the tutorial](../README.md)

Create, configure, and delete cloud resources in **Google Cloud Console**. The scripts cover local image delivery, IAP connections, and software installation on the VM. They do not create the project's accounts, IAM grants, network, firewall, VM, bucket, or load balancer.

## Local authentication: `00-auth.sh`

Run [scripts/00-auth.sh](../scripts/00-auth.sh) on **your computer**, after creating the local access account and downloading its JSON key in Console.

1. Read the project, account email, and key path from `config.env`.
2. Check that the JSON is a service-account key and its email matches `ACCESS_SERVICE_ACCOUNT`. A mismatch stops the script before activation.
3. Run `gcloud auth activate-service-account` with that account and key file.
4. Check that gcloud lists the configured account as authenticated.

This saves credentials in gcloud's local credential store. It does not copy the JSON to the VM or grant permissions. Later helpers select the configured project and account explicitly. Success prints **Authenticated local access account**.

## VM connection: `ssh.sh`

Run [scripts/ssh.sh](../scripts/ssh.sh) on **your computer**, after Console setup has created the VM and granted OS Login and IAP access.

The script reads `config.env`, checks local authentication, and calls `gcloud compute ssh`. It selects `PREFIX-api` in `ZONE`, authenticates as `ACCESS_SERVICE_ACCOUNT`, impersonates `PREFIX-ssh`, and opens the connection through IAP. The [access guide](access.md#open-a-shell-through-iap) shows the full command and explains the JSON identity and SSH key pair.

With no arguments, it opens an interactive VM shell. Additional arguments go to `gcloud compute ssh`; for example, `--command='sudo systemctl status webdemo --no-pager'` runs that command on the VM and returns. Commands entered in an interactive shell run on the VM until you type `exit`. The helper does not change the VM's firewall or IAM grants.

## Backend image delivery: `build-push.sh VERSION`

Run [scripts/build-push.sh](../scripts/build-push.sh) on **your computer**, with Docker running and the Console repository and Writer grant ready. `VERSION`, such as `v1`, is the image tag.

1. Read and check the configuration and local authentication. Reject a missing or invalid tag.
2. Configure Docker to obtain credentials from gcloud for `REGION-docker.pkg.dev`. This updates the local Docker credential-helper configuration for that host.
3. Build the backend's production Dockerfile stage for `linux/amd64`, the VM architecture. `--pull` checks for an updated base image. An ARM Mac builds this target through emulation.
4. Push `REGION-docker.pkg.dev/PROJECT_ID/PREFIX-images/backend:VERSION` using the local access account.
5. Save push output in `.build/push.log`, extract the returned SHA-256 digest, and write the full digest reference to `.build/image-ref.txt`.

The digest identifies the uploaded content. Deployment uses it rather than a changeable tag. The script clears any previous reference before building, so a failed build or push cannot leave an old reference ready for transfer. It stops if push output has no digest. Success prints **Pinned VM image**. Building and pushing do not require a VM.

## VM file transfer: `upload-vm-files.sh`

Run [scripts/upload-vm-files.sh](../scripts/upload-vm-files.sh) on **your computer**, after a successful image push and VM creation.

The script validates `.build/image-ref.txt` and stages these files in a temporary local directory:

| Content | Why the VM needs it |
| --- | --- |
| Registry installer and `registry.py` | Pull the selected image using the VM identity |
| `webdemo.service` and the selected network profile | Start and supervise the container with the selected port binding |
| Nginx installer, renderer, and configuration files, for `single-vm` only | Serve the frontend for the single-VM layout |
| `image-ref.txt` | Identify the exact backend release |
| Complete `frontend/dist/`, for `single-vm` only | Supply the static files Nginx will serve |

It packs `.build/course-vm.tar.gz`, then runs `gcloud compute scp` through IAP with the same impersonated SSH identity as `ssh.sh`. The destination is `~/course-vm.tar.gz` on the VM. The temporary staging directory is removed when the script exits; the local archive remains for inspection or another transfer.

The archive excludes the local JSON key, `config.env`, and backend source. Executable backend code arrives through the registry image. This helper transfers files; the next command in the chosen deployment guide unpacks them and runs the installer.

## VM preparation: `startup.sh`

Paste [vm/startup.sh](../vm/startup.sh) into the VM's **Startup script** field in Console. Compute Engine runs it as root at boot.

It updates Debian packages, enables unattended upgrades, disables SSH password and root login, validates and reloads SSH configuration, installs Docker from its official Debian repository, and creates `/opt/gce-web/releases`. Output goes to `/var/log/gce-web-bootstrap.log` and the startup-service log. Only after these steps succeed does it create `/var/lib/gce-web-bootstrap.ready`.

This prepares the host; it does not deploy the app. At later boots the configured startup script runs again. Updates can still require a reboot. The [operations guide](operations.md#what-the-host-startup-script-does) explains the hardening settings and checks.

## Backend installation: `deploy-from-registry.sh IMAGE LAYOUT gemini`

Run [vm/deploy-from-registry.sh](../vm/deploy-from-registry.sh) with `sudo` **inside the VM**, from the unpacked archive.

| Argument | Meaning |
| --- | --- |
| `IMAGE` | Full Artifact Registry reference ending in `@sha256:DIGEST`, read from `image-ref.txt` |
| `LAYOUT` | `single-vm` or `alb-cdn`; selects the container's port binding |
| `gemini` | Select Gemini for course questions using the attached VM identity |

The installer performs these steps:

1. Check the arguments, bootstrap completion marker, and Docker availability.
2. Use `registry.py` to validate the image reference and obtain a short-lived token from VM metadata. The attached account needs repository Reader permission.
3. Log Docker into that registry in a temporary configuration directory, pull the exact digest, and remove the login files. A failed pull stops before the running service is changed.
4. Copy the installation files into a new `/opt/gce-web/releases/release-…` directory. The single-VM layout also copies the frontend. Point `/opt/gce-web/current` to that release and record its image reference.
5. Install `webdemo.service` and its network, image, and model settings under `/etc/systemd/system/`. `single-vm` binds the API to `127.0.0.1:8000`; `alb-cdn` publishes VM port 8000 for the firewall-restricted load balancer.
6. Reload systemd, enable the service at boot, and restart it. Poll `/api/health` for up to 30 attempts, one second apart. Success prints **Registry image is running**. Failure prints recent service logs and exits with an error.

Restarting briefly interrupts this one backend. The script does not roll back automatically after a failed health check. The [operations guide](operations.md#deploy-another-image) explains how to redeploy a previous digest.

The service creates `/var/lib/gce-web-budget/ledger` with numeric owner `10001:10001` and mounts it at `/app/data`. This preserves daily spending totals across container replacements. The container uses that numeric identity directly; it needs no corresponding host login account. See [container restrictions](operations.md#what-the-container-service-does) and [the daily cap](providers.md).

## Frontend installation: `install-nginx.sh HOST`

Run [vm/install-nginx.sh](../vm/install-nginx.sh) with `sudo` **inside the VM**, for the single-VM layout. `HOST` is the reserved IPv4 or an owned DNS hostname, without a scheme, port, or path.

The installer validates the host with `render-nginx.py`, installs Nginx from Debian packages, and copies the complete frontend to `/var/www/ac215`. Older hashed assets remain available for existing browser tabs. It installs the security snippet and creates the course site's configuration if one does not already exist. It enables that site, disables the default site, checks configuration with `nginx -t`, then starts or reloads Nginx.

The configuration serves static files and proxies `/api/` to the loopback backend. This step does not configure TLS. Existing site configuration is preserved on another run; changing `HOST` alone does not rewrite it. See [the Nginx walkthrough](deploy-single-vm.md#step-5-install-nginx-and-read-its-configuration).

## Shared implementation files

These are called by the helpers above; students do not run them separately.

| File | Responsibility |
| --- | --- |
| [scripts/lib.sh](../scripts/lib.sh) | Locate the tutorial folder, read trusted local `config.env`, validate access settings, derive VM/account/image names, check authentication, and share the IAP SSH/SCP commands. It does not provision resources. All shell helpers stop on command errors and unset required variables. |
| [vm/registry.py](../vm/registry.py) | Accept digest-pinned regional Artifact Registry references and return the registry host; on the VM, request its attached identity's access token from metadata. Tokens go to Docker through standard input. |
| [vm/render-nginx.py](../vm/render-nginx.py) | Validate an IPv4 or DNS host and substitute it into `nginx.conf.in`; reject values containing ports, paths, or configuration text. |

`config.env` is sourced as shell code. Use the supplied example and your own values; do not paste untrusted commands into it. `DOMAIN` and `BUCKET` record Console choices; local access and image-delivery helpers do not use them to create resources.

## Optional local verification scripts

| Script | What it checks and changes |
| --- | --- |
| [scripts/check-local.sh](../scripts/check-local.sh) | On your computer, check shell syntax, parse Python source, and check frontend JavaScript test/build-script syntax. It installs nothing and makes no cloud calls. It does not check JSX; the frontend build does that. |
| [scripts/check-docker.sh](../scripts/check-docker.sh) | Build local test and production images, run backend tests under container restrictions, then call `tests/check_docker.py` to check actual health, API responses, restart behavior, and runtime restrictions. It creates local images and temporary containers; the runtime check removes its container when finished. Builds may download base images and dependencies. |

These checks are for local development. They do not prove cloud IAM, firewall, or model access. See [development checks](development.md#run-local-checks).

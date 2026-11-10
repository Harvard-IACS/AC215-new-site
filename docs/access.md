# Local access account and IAP SSH

[Back to the tutorial](../README.md)

Cloud resources and permission grants are created in **Google Cloud Console**. On your computer, use the local access account to push images and to open IAP SSH/SCP connections.

## Which identity does what?

| Identity | Where it is used | Required grants |
| --- | --- | --- |
| Your Google user | Console resource configuration and cleanup | The course/organization’s approved project administration permissions |
| `ACCESS_SERVICE_ACCOUNT` | Local Docker registry helper and IAP caller | Artifact Registry Writer on your repository; Token Creator on the SSH account |
| `PREFIX-ssh` service account | Impersonated for IAP SSH and file transfer | Compute Viewer + OS Admin Login in the dedicated project; IAP tunnel access on the VM; Service Account User on its runtime account |
| `PREFIX-api` service account | Attached to the VM | Artifact Registry Reader on your repository and `roles/aiplatform.user` in the project for Gemini |

The [shared Console guide](provisioning.md) creates these grants. Only the local access account has a downloaded JSON key. The VM obtains short-lived credentials from its metadata service for registry access and Gemini. [Registry access on Compute Engine](https://docs.cloud.google.com/artifact-registry/docs/integrate-compute).

## Configure the local account

In the tutorial folder, set `ACCESS_SERVICE_ACCOUNT` and `SERVICE_ACCOUNT_KEY_FILE` in your private `config.env`. The default key path is:

```text
secrets/gcp-service-account.json
```

Use the actual account email from Console. Relative key paths start at this tutorial folder. Keep the JSON contents out of `config.env`, source files, and build variables.

**Your computer:**

```bash
chmod 600 secrets/gcp-service-account.json
./scripts/00-auth.sh
```

The helper checks the key type and account email, then activates the account. It reports **Authenticated local access account**. [Account activation](https://docs.cloud.google.com/sdk/gcloud/reference/auth/activate-service-account).

If you arrived here from README Step 3, return to [README Step 4](../README.md#step-4-build-and-push-the-backend-image) now. The following SSH and transfer sections are used after the VM exists.

This local account does not need VM/network/bucket administration roles for the Console walkthrough. Your signed-in Console user creates those resources. The helper scripts select the configured local account explicitly.

## Open a shell through IAP

**Your computer — tutorial folder, after shared Console Steps 7–8 are complete**

```bash
./scripts/ssh.sh
```

The helper loads `config.env` and runs the equivalent of:

```bash
source config.env
gcloud --project="$PROJECT_ID" --account="$ACCESS_SERVICE_ACCOUNT" \
  compute ssh "$PREFIX-api" --zone="$ZONE" \
  --tunnel-through-iap \
  --impersonate-service-account="$PREFIX-ssh@$PROJECT_ID.iam.gserviceaccount.com"
```

`gcloud` creates or reuses a local SSH key pair and registers its public key with OS Login. Its default private-key path is `~/.ssh/google_compute_engine`. The JSON authenticates the caller’s Google identity; the SSH key authenticates the Linux connection. [SSH behavior](https://docs.cloud.google.com/compute/docs/instances/ssh).

The command options have separate jobs:

| Option | Purpose |
| --- | --- |
| `--project` and `--zone` | Find the intended VM |
| `--account` | Select the authenticated local access account |
| `--impersonate-service-account` | Request short-lived credentials for the keyless SSH identity; requires its Token Creator grant |
| `--tunnel-through-iap` | Carry SSH through Google's IAP tunnel rather than a direct connection to the VM's public IP |

The impersonation target is a different, keyless service account. That follows the [service-account SSH workflow](https://docs.cloud.google.com/compute/docs/connect/set-up-service-account-ssh) without relying on restricted same-account token exchanges.

To run one VM command from your computer:

```bash
./scripts/ssh.sh --command='sudo systemctl status webdemo --no-pager'
```

Type `exit` in an interactive VM shell to return to your computer. See [the SSH helper explanation](scripts.md#vm-connection-sshsh) for argument forwarding and its authentication check.

## Transfer the VM configuration

After pushing an image, run:

```bash
./scripts/upload-vm-files.sh
```

This creates `.build/course-vm.tar.gz` from an explicit list of VM configuration files and the pinned image reference. Option A also includes the compiled frontend. The helper uses IAP SCP with the same SSH identity to transfer that archive to the VM. It does not create cloud resources or run the VM installer.

The [transfer script explanation](scripts.md#vm-file-transfer-upload-vm-filessh) lists each included file and its purpose. Your selected deployment guide gives the commands to unpack it and pull/run the image. The archive contains no JSON key, `config.env`, database, or backend source. The backend executable code arrives in the registry image.

## Reuse and cleanup

Run `00-auth.sh` again if the local credential needs activation. To rotate a JSON key, replace its local path and activate the new key before revoking the old one in Console.

[Cleanup](cleanup.md) removes the service-account grants, cloud keys, and accounts in Console after the application resources are removed. Deleting the local JSON alone does not revoke the cloud key.

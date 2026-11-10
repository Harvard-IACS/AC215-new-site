# TLS research checkpoint — 2 November 2026

The user removed certificates from the deployment lab. These files are historical reference snapshots, outside the active student workflow; their original relative paths are not preserved and they are not standalone installers.

Nginx on the VM successfully served a publicly trusted IP certificate and passed a renewal dry run. For the ALB IP, a certificate was issued after temporary VM-backed HTTP validation. Cloud Storage rejects ACME challenge object names, including the attempted bucket rewrite path. The classic ALB importer rejected the IP-only certificate. Certificate Manager was not validated before the user stopped certificate work. No ALB HTTPS claim is made.

The active tutorial uses HTTP for public, non-sensitive deployment checks. Workspace passwords and model-provider keys must not be submitted over that public HTTP route.

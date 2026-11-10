# AC215 course-site guides

For the static course website, use [GitHub Pages publishing](github-pages.md).

For the optional Google Cloud lab, start with the [student walkthrough](../README.md). Create resources in Console, build/push the image locally, and connect through IAP from your computer.

| Guide | Use it to… |
| --- | --- |
| [Shared Console setup](provisioning.md) | Create accounts, registry, network, and Debian 13 VM |
| [Script explanations](scripts.md) | Understand each helper’s inputs, actions, and result |
| [Local access and IAP](access.md) | Activate the local account and transfer files |
| [Single VM + Nginx](deploy-single-vm.md) | Serve the page and API through one HTTP VM entry |
| [VM backend + ALB/CDN](deploy-alb-cdn.md) | Deliver static files from a bucket and API calls to the VM |
| [Verification](verify.md) | Check course pages, selected model, streamed answers, image identity, caching, and firewall |
| [Cleanup in Console](cleanup.md) | Remove resources in dependency order |
| [Course guide and public notes](providers.md) | Connect Gemini, maintain course files, and understand the shared daily cap |
| [Architecture](architecture.md) | Trace requests, image delivery, identities, and stateless operation |
| [VM operations](operations.md) | Inspect hardening, updates, recovery, and releases |
| [Cost worksheet](cost-worksheet.md) | Estimate the layout and compare with the bill |
| [Troubleshooting](troubleshooting.md) | Resolve access, registry, routing, or app errors |

Maintainer references: [development](development.md), [validation](validation.md), [interface design](design.md), and [archived work](archive/README.md).

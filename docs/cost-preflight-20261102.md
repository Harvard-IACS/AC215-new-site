# Validation cost proposal — 2 November 2026

Historical record for the retired Fieldnote validation run. The user approved e2-medium on 2 November 2026 within a $1 operational budget, and all named lab resources were removed. This record does not authorize or validate a new AC215 showcase deployment. The amounts are estimates, not a settled bill or a hard billing cap.

## Proposed footprint

- Existing project: `ac215-cloud-eng-demo-7f0g3`.
- One on-demand **e2-medium**, Debian 13, in `us-central1-a`: 4 GiB RAM, two visible shared vCPUs, and sustained CPU time equivalent to 1 vCPU, with short bursts.
- One **20 GiB standard persistent boot disk** and one VM external IPv4 for outbound package/registry/provider access.
- Reuse that VM sequentially: Nginx layout first, then ALB/CDN layout. Only one VM runs at a time.
- Build the backend on the computer and deploy a digest-pinned regional Artifact Registry image named **backend**.
- No GPU, Cloud NAT, managed database, Kubernetes, paid scanning, load generation, or model-provider requests in the validation plan.
- Budget model: VM/IP/disk for six hours total, ALB for three of those hours; small static files and light HTTP/UI verification.

The selected 4 GiB VM provides memory headroom for this light deployment check. This is not a capacity or load-test result. Stop and report before resizing or extending the agreed resource plan.

## Forecast before credits and free allowances

| Meter | Assumption | Estimated USD |
| --- | --- | ---: |
| e2-medium | 6 h × $0.03350571/h | $0.2010 |
| VM external IPv4 | 6 h × $0.005/h | $0.0300 |
| Standard boot disk | 20 GiB × 6 h × $0.000054795/GiB-h | $0.0066 |
| Global ALB forwarding-rule tier | 3 h × $0.025/h; one HTTP frontend in the first-five tier | $0.0750 |
| Fixed subtotal | | **$0.3126** |
| Registry, bucket, CDN, transfer, processing, and logs | Small build, few versions, light manual requests | Allow roughly $0.04–$0.34 |
| **Working forecast per complete two-route run** | Same footprint for a student run or validation run | **$0.35–$0.65** |

Proposed operational budget: **$1 for this validation run**, with a stop-and-report before expanding resources or planned runtime. This is not a provider-enforced spending cap; billing reports can lag. A separate full student run using the same assumptions has the same forecast. If both are performed independently, plan $0.70–$1.30 total forecast and a $2 combined operational budget.

Reusing one VM reduces provisioning and screenshot repetition. At the end, stop the VM and remove billable lab resources, including the ALB, disk if no longer needed, reserved IPs, registry versions, and bucket. Merely stopping the VM does not remove the other charges.

## Sources checked

- [Iowa E2 pricing](https://cloud.google.com/products/compute/pricing/general-purpose?hl=en): e2-medium $0.03350571/h.
- [Disk pricing](https://cloud.google.com/compute/disks-image-pricing): standard provisioned storage rate used before free allowances.
- [IPv4 pricing](https://cloud.google.com/vpc/network-pricing): standard-VM attached IPv4 $0.005/h; forwarding-rule IPv4 has separate treatment.
- [Load balancing](https://cloud.google.com/load-balancing/pricing): first-five global forwarding-rule tier $0.025/h.
- [Artifact Registry](https://cloud.google.com/artifact-registry/pricing), [Cloud Storage](https://cloud.google.com/storage/pricing), and [Cloud CDN](https://cloud.google.com/cdn/pricing): variable meters depend on size, region, requests, and destination.

## Completed validation footprint

The VM was created at 14:42 UTC and removed before the 17:05 UTC cleanup audit on 2 November 2026. It was stopped for about 11 minutes during the run. The ALB frontend was created at 15:56 UTC and removed before that audit. To avoid understating the estimate, use **2.4 VM/disk/IP hours and 1.2 ALB hours**, including the stopped interval and cleanup delay.

Those rounded durations give about **$0.125** for VM, standard disk, attached IPv4, and forwarding-rule fixed meters at the recorded rates. Allowing for small registry, storage, transfer, processing, and logging usage gives a **working estimate of $0.15–$0.30 before credits**. This is a usage-based estimate, not a settled billing result; reporting can lag. All named lab resources were removed, including both reserved IPs and the registry repository.

The final lab uses HTTP for non-sensitive deployment checks. No domain purchase, certificate installation, credential setup, or model-provider requests are required. The user stopped the earlier certificate investigation; no recurring certificate resources remain.

Actual account/free-tier eligibility, taxes, exchange rates, traffic, image sizes, and duration can change the bill. Check Billing Reports after usage catches up.

Reference: [E2 shared CPU allocation](https://docs.cloud.google.com/compute/docs/general-purpose-machines).

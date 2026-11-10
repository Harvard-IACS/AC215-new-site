# Estimate the selected deployment

[Back to the tutorial](../README.md)

Look up rates on the day you run the lab, using your account, billing currency, location, and destination geography. Save the rate date and estimate link. This worksheet gives no fixed dollar total; free allowances, credits, agreements, and prices can change.

Use the [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator), then compare the estimate with **Billing → Reports** after the exercise. An alerts-only budget reports costs; it does not stop the deployment.

## Set the same assumptions for both layouts

| Input | Your value |
| --- | --- |
| Time window | ___ hours; compare a six-hour lab and a 730-hour month separately |
| Region / zone | `us-central1` / `us-central1-a`, unless your course requires another location |
| VM | One on-demand `e2-medium`, Debian 13 |
| Boot disk | 20 GiB standard persistent disk; include retained Docker image versions |
| Registry | One regional Docker repository; measure stored image versions and build/pull traffic |
| Frontend build | Measure `frontend/dist/`, including retained prior hashes |
| Requests / visitors | ___ |
| Static payload and API response sizes | ___ |
| User geography | ___ |
| Image release/pull frequency | ___ |
| Gemini model calls and input/output/thinking tokens | ___ |
| Cleanup time | ___ |

Use the same app, VM size, traffic, model usage, and time window when comparing layouts. A price per month, per hour, per GiB, and per request unit must be multiplied by the matching quantity.

## Fill the meters

| Item and official rates | Option A: Nginx VM | Option B: VM + ALB/CDN | Rate / estimated charge |
| --- | --- | --- | --- |
| [VM CPU/RAM](https://cloud.google.com/products/compute/pricing) | VM running hours | Same VM running hours | ___ |
| [IAP TCP forwarding](https://cloud.google.com/iap/pricing) | SSH to the GCP VM; no extra IAP charge | Same | $0 for this IAP feature |
| [Persistent disk](https://cloud.google.com/compute/disks-image-pricing) | Stored GiB and retention | Same | ___ |
| [VM external IPv4](https://cloud.google.com/vpc/network-pricing#ipaddress) | Reserved regional address, attached to VM | VM address for outbound connectivity; include any retained regional reservation | ___ |
| [Artifact Registry](https://docs.cloud.google.com/artifact-registry/pricing) | Stored versions, applicable transfer, scanning if enabled | Same backend image delivery | ___ |
| [VM data transfer](https://cloud.google.com/vpc/network-pricing) | Frontend and API bytes delivered, plus applicable outbound traffic | API and applicable outbound traffic | ___ |
| [Load balancing](https://cloud.google.com/load-balancing/pricing) | — | HTTP forwarding rule and applicable processing | ___ |
| [ALB frontend IPv4](https://cloud.google.com/vpc/network-pricing#ipaddress) | — | Check the applicable forwarding-rule address treatment | ___ |
| [Cloud Storage](https://cloud.google.com/storage/pricing) | — | Stored frontend versions, operations, applicable uncached delivery | ___ |
| [Cloud CDN](https://cloud.google.com/cdn/pricing) | — | Lookups, cache fill, cacheable delivery by geography | ___ |
| [Logging](https://cloud.google.com/products/observability/pricing) | Applicable firewall/service logs and retention | Also applicable ALB/CDN logs | ___ |
| [Gemini inference](https://cloud.google.com/model-garden/pricing) | Project-billed input/output/thinking tokens | Same provider and traffic | ___ |
| Domain / certificates | Not required for the HTTP lab | Not required for the HTTP lab | $0 |
| **Total before and after credits** | **___** | **___** | |

For load-balancer forwarding rules, apply the current tier/bundle calculation; do not multiply a bundle rate blindly by the number of rules. For CDN, use its hit/miss/non-cacheable pricing cases to avoid counting the same transfer twice. Cache hits still have delivery/request charges. Registry storage and VM Docker disk use are separate meters.

Optional image scanning can have separate pricing and permissions. Record whether it is enabled rather than assuming it is free or required for this exercise.

## Compare and check the bill

1. Which charges exist before the first chat message?
2. Which resources remain allocated if you stop only the VM?
3. How do costs change when you retain five image versions rather than one?
4. For Option B, compare the same payload at modeled 0%, 90%, and 100% CDN hit rates. Do not describe a modeled rate as a measurement.
5. Which operating tasks remain yours in each layout: OS updates, reboots, Docker/base-image updates, recovery and access?
6. After [cleanup](cleanup.md), inspect the registry, disks, IPs, load-balancer components, and final billing report.

Gemini use is billed to the GCP project. The app's $10 daily model limit excludes VM, load-balancer, registry, and storage charges. Its conservative reservations can stop model use before $10 is actually billed. Review the current model rates when estimating the exercise.

The local notes preview makes no paid model calls. A cached frontend file does not remove a Gemini call or its token usage.

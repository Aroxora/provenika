# Wire provenika.com to the site

The repo is now **github.com/Aroxora/provenika** and the product is **Provenika**. The site is live
at `https://cancer-cure-osint.web.app` (the Firebase project keeps that ID — renaming a Firebase
project isn't supported; the project ID is cosmetic once a custom domain is attached).

To serve it at **provenika.com**, after you register the domain (see [`../business/BRAND.md`](../business/BRAND.md)):

## 1. Add the custom domain in Firebase Hosting
```bash
firebase hosting:sites:list --project cancer-cure-osint     # confirm the site
# Custom-domain connection is console-driven:
#   Firebase console -> Hosting -> Add custom domain -> provenika.com (and www.provenika.com)
```
Firebase gives you DNS records to add at your registrar:
- a **TXT** record to verify ownership, then
- two **A** records (Firebase's IPs) for the apex, and a **CNAME** for `www` → the Firebase host.

It auto-provisions a managed SSL cert once DNS propagates (minutes–hours).

## 2. Update canonical / Open-Graph URLs (do this once the domain serves)
In `web/src/index.html` change the `cancer-cure-osint.web.app` URLs to `provenika.com`:
- `<link rel="canonical" href="https://provenika.com/">`
- `og:url` and the two `og:image` / `twitter:image` URLs.
Then `cd web && npx ng build --configuration production && cd .. && firebase deploy --only hosting`.

> Left pointing at `cancer-cure-osint.web.app` for now on purpose — switching canonical/OG URLs
> before the domain actually serves would break link previews and SEO.

## 3. (Optional) GitHub repo cosmetics
The repo is renamed; GitHub auto-redirects the old `cancer-cure-agent` URL. Old clones keep working
(redirect), but update any local clone's remote: `git remote set-url origin https://github.com/Aroxora/provenika.git`.

## What I can't do for you
- **Register the domain** (costs money, needs your registrar/payment) — do that first.
- **Add the DNS records** at your registrar — Firebase prints the exact values; paste them in.
Ping me once provenika.com resolves and I'll flip the canonical/OG URLs + redeploy in one step.

# Wire provenika.com to the site

The repo is now **github.com/Aroxora/provenika** and the product is **Provenika**. The site is live
at `https://cancer-cure-osint.web.app` (the Firebase project keeps that ID — renaming a Firebase
project isn't supported; the project ID is cosmetic once a custom domain is attached).

**Status (2026-06-14):** `provenika.com` (apex) is wired and serving. Canonical/OG tags updated + deployed.
`www.provenika.com` is not yet configured (NXDOMAIN) — see step 1.

To serve it at **provenika.com**, after you register the domain (see [`../business/BRAND.md`](../business/BRAND.md)):

## 1. Add the custom domain in Firebase Hosting
```bash
firebase hosting:sites:list --project cancer-cure-osint     # confirm the site
# Custom-domain connection is console-driven:
#   Firebase console -> Hosting -> Add custom domain -> provenika.com (and www.provenika.com)
```
Firebase gives you DNS records to add at your registrar:
- a **TXT** record to verify ownership, then
- **A** record(s) (199.36.158.100) for the apex `@`, and record(s) for `www` (A to same IP or CNAME to the web.app target).

It auto-provisions a managed SSL cert once DNS propagates (minutes–hours). You must complete the full "Add custom domain" flow in the console for both apex and www.

**If you see the Firebase "Site Not Found" placeholder on provenika.com:**
- DNS records (especially the TXT + A) have not fully propagated to *your* resolver, or
- You are visiting `www.provenika.com` (add it separately in Firebase console + set its DNS record), or
- Firebase is still provisioning the SSL certificate for the custom domain (check the Hosting custom domain row in console for status), or
- Browser/CDN cache (try incognito, Cmd-Shift-R, or a different DNS like 1.1.1.1), or
- No release has been deployed yet to the `live` channel (run the deploy step below or trigger the GitHub "Deploy web" action).

Current DNS for apex should include:
- A → 199.36.158.100
- TXT → `hosting-site=cancer-cure-osint` (or the exact verification value from console)

## 2. Update canonical / Open-Graph URLs (do this once the domain serves)
In `web/src/index.html` change the `cancer-cure-osint.web.app` URLs to `provenika.com`:
- `<link rel="canonical" href="https://provenika.com/">`
- `og:url` and the two `og:image` / `twitter:image` URLs.
Then `cd web && npx ng build --configuration production && cd .. && firebase deploy --only hosting`.

> Left pointing at `cancer-cure-osint.web.app` for now on purpose — switching canonical/OG URLs
> before the domain actually serves would break link previews and SEO.

(Done: meta tags flipped and deployed on 2026-06-14.)

## 3. (Optional) GitHub repo cosmetics
The repo is renamed; GitHub auto-redirects the old `cancer-cure-agent` URL. Old clones keep working
(redirect), but update any local clone's remote: `git remote set-url origin https://github.com/Aroxora/provenika.git`.

## What I can't do for you
- **Register the domain** (costs money, needs your registrar/payment) — do that first.
- **Add the DNS records** at your registrar — Firebase prints the exact values; paste them in.
- **Add www** (repeat the Add custom domain flow for www.provenika.com and set its record).

Apex now resolves and serves the app. Add the www record + wait for propagation/SSL for full coverage. The default `https://cancer-cure-osint.web.app` always works as a fallback.

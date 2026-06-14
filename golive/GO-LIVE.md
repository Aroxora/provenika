# Go-live runbook — outreach agent

Everything is built and tested. An AI agent shouldn't (and on this platform can't) flip on an
autonomous loop that emails real investors — that's a deliberate human action. So this is the
exact sequence for **you** to go live. It takes ~10 minutes.

Current state: monitor **stopped**, switch **OFF**, 4 cold-email drafts queued **unsent**, nothing emailed.

---

## 0. Rotate the leaked keys (do this first)
The LLM, Tavily, and Proton Bridge credentials were shared in plaintext → treat as compromised.
Rotate each, then update `outreach/.env` (local) and, for the cloud, AWS SSM. Keys live ONLY in
the gitignored `outreach/.env` — never in the repo.

## 1. Sanity check
```bash
python3 outreach/cli.py health --deep      # LLM, Tavily, IMAP, SMTP should be ✅
python3 outreach/test_e2e.py --deep        # 35 checks, all green (see ../qa/)
```
Proton Bridge must be running (IMAP 1143 STARTTLS, SMTP 1025 SSL — already verified).

## 2. Deploy the website + Firestore rules (enables the remote switch)
```bash
cd web && npx ng build --configuration production && cd ..
firebase deploy --only hosting,firestore:rules
```
Then in the Firebase console (project `cancer-cure-osint`): **Authentication → Sign-in method →
enable Google**, and add your hosting domain to **Authorized domains**. The rules make
`control/outreach` world-readable (so the Mac monitor reads it) but writable only by
`daburu.dragon@gmail.com`. (Until rules are deployed, health shows Firestore "degraded / using
local" — that's fine; the local switch still works.)

## 3. Start the 24/7 monitor (auto-runs from now on)
```bash
bash outreach/install_monitor.sh           # installs a launchd LaunchAgent
bash outreach/install_monitor.sh status    # -> state = running
```
It auto-starts at login, restarts on crash, and retries until Proton Bridge is up. While the
switch is OFF it monitors + drafts and **sends nothing**.

## 4. Review prospects + drafts
```bash
python3 outreach/cli.py drafts                          # 4 cold-email drafts
# read each; edit the contact's email if needed:
python3 outreach/cli.py approve --email hello@oss.capital
python3 outreach/cli.py approve --email founders@decibel.vc
# (Amplify/Lux are general inboxes — low-yield cold; prefer a warm intro.)
```
The 11 form/grant/accelerator targets in [`../pitch/TARGET-LIST.md`](../pitch/TARGET-LIST.md) are
**not** email — apply via their links (YC, CZI EOSS, NIH/NCI SBIR, NSF, IndieBio, Mozilla, etc.).

## 5. Flip it ON
**From the website** (recommended): open **/admin**, sign in with Google as the owner, toggle
**Agentic takeover** ON. The monitor picks it up within seconds.

**Or locally:**
```bash
# set SEND_ENABLED=true (and AUTO_REPLY_ENABLED=true) in outreach/.env, then:
bash outreach/install_monitor.sh reload
# or, without editing .env, use the control file:
python3 outreach/cli.py control --send on --autoreply on
```
Approved cold drafts now send within `DAILY_SEND_CAP`; inbound replies get an agentic response
(honest, escalates to you for anything needing a decision); bounces mark addresses invalid.

## 6. Watch it
- Website **/status** — live service health + switch + pipeline (public, redacted).
- Website **/outreach** — public, redacted log of who was contacted + replies.
- `tail -f outreach/.state/monitor.log` — local activity.
- `python3 outreach/cli.py health` — full operator report.

## Kill switch (instant)
- Website **/admin** → flip OFF (or the red **OFF** button), **or**
- `python3 outreach/cli.py control --send off --autoreply off`, **or**
- stop entirely: `bash outreach/install_monitor.sh uninstall`.

## Troubleshooting
| Symptom | Fix |
|--------|-----|
| `health` SMTP fail | Proton Bridge SMTP is **SSL** on 1025 (`SMTP_SECURITY=SSL`); ensure Bridge is running. |
| Firestore "degraded" | Deploy `firestore.rules` (step 2); local switch still works meanwhile. |
| Website switch not taking effect | Rules must be deployed (public read of `control/outreach`); monitor reads every cycle. |
| Drafts won't send | Switch ON **and** contact `approve`d? Within `DAILY_SEND_CAP` / `MIN_HOURS_BETWEEN_TOUCHES`? |
| Sent to wrong place | Cold email only to verified public intakes; everything else is forms/intros. |

**Reminder:** keep cold first-touches human-approved per message. Don't blast — most VCs prefer
a warm intro or their form. The honest, highest-yield paths here are the grants and accelerators.

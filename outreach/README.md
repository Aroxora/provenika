# Agentic investor outreach (RAG memory · Lambda · Firestore)

An honest, human-gated outreach agent. It researches a prospect, drafts a personalized email
**grounded in our real pitch docs** (so it can't fabricate traction), waits for a human to approve,
sends within strict caps, ingests + classifies replies, schedules follow-ups, and publishes a
**privacy-redacted public log** to the website.

It is built in the same spirit as the rest of this repo: **don't fabricate, and don't do anything
irreversible without a human.**

## Safety model (read first)

- **Dry-run by default.** `SEND_ENABLED=false` ⇒ `send` writes `.eml` files to `outreach/.outbox/`
  and nothing leaves the machine. Flip to `true` only after you've reviewed drafts.
- **Human approval gate.** Only contacts you explicitly `approve` are ever sent.
- **Rate limits.** `DAILY_SEND_CAP` and `MIN_HOURS_BETWEEN_TOUCHES` are enforced in code.
- **Opt-out + identity** are appended to every message (it's individual founder outreach, not bulk mail).
- **No fabrication.** Drafts use only facts retrieved from the committed `pitch/` + `business/` corpus;
  the system prompt forbids inventing metrics, users, or partnerships.
- **Full disclosure on every email.** A mandatory footer states the message was sent by an automated
  agent on behalf of `HUMAN_NAME` (Bo Shang), invites a reply (handled agentically) and gives the
  human contact (`HUMAN_EMAIL`, e.g. bo@shang.software). Auto-replies set `Auto-Submitted: auto-replied`
  to prevent loops and are capped per contact; anything needing a decision escalates to the human.
- **Secrets never in the repo.** Local: gitignored `outreach/.env`. Cloud: SSM/Secrets Manager.
- **Private state never in the repo.** `outreach/.state/` (contacts, bodies) and `.outbox/` are
  gitignored. Only the redacted `web/public/data/outreach/log.json` is published.

## Architecture

```
research.py  ─ Tavily ─▶ profile
                          │
store.py ◀── RAG memory (pitch/business chunks + contacts + interactions)
   │  (LocalStore JSON  |  FirestoreStore)        embeddings: llm.py (local hashing by default)
   ▼
agent.py ── draft (llm.py, grounded) ─▶ [HUMAN approve] ─▶ emailer.py (SMTP, dry-run default)
   ▲                                                              │
   └──── ingest_replies + classify ◀── emailer.py (IMAP) ◀────────┘
   │
   └── export_public_log ─▶ web/public/data/outreach/log.json  (redacted, public)

lambda_handler.py  ─ EventBridge rate(1 day) ▶ agent.run_cycle()
```

## Local quickstart (no cloud, all dry-run)

```bash
cp outreach/.env.example outreach/.env      # then fill in keys (kept out of git)
python3 outreach/cli.py check               # validate IMAP/SMTP creds (no send)
python3 outreach/cli.py seed-memory         # load pitch/business docs into RAG memory
python3 outreach/cli.py add --email gp@fund.vc --name "A. Partner" --firm "Fund VC" --category vc
python3 outreach/cli.py draft --email gp@fund.vc
python3 outreach/cli.py drafts              # review the queue
python3 outreach/cli.py approve --email gp@fund.vc
python3 outreach/cli.py send                # dry-run -> .outbox/ unless SEND_ENABLED=true
python3 outreach/cli.py ingest              # read + classify replies
python3 outreach/cli.py publish             # regenerate the public web log
python3 outreach/cli.py cycle               # the whole loop (what Lambda runs)
```

Add `--public` to `add` to allow a contact's name/firm in the **public** log (default: anonymized).

## Deploy (Lambda + Firestore)

1. Put secrets in SSM (never the repo):
   `aws ssm put-parameter --name /outreach/LLM_API_KEY --type SecureString --value '...'` (repeat per key).
2. `STORE_BACKEND=firestore`, set `GOOGLE_CLOUD_PROJECT`, attach a Google service-account
   (bundled file via `GOOGLE_APPLICATION_CREDENTIALS`, or a layer — **do not commit it**).
3. `sam build && sam deploy --guided` (see `template.yaml`). EventBridge runs `run_cycle` daily.
4. **Email from Lambda:** a local Proton Bridge isn't reachable from AWS — point SMTP/IMAP at a relay
   the function can reach (SES SMTP, or a bridge on a VPC host). Keep `SendEnabled=false` until ready.

## 24/7 monitoring & auto-start (macOS)

Because Proton Bridge runs locally, `monitor.py` watches the mailbox in real time (IMAP IDLE,
falling back to polling) for **replies and bounces** — classifying replies, marking bounced
addresses invalid, drafting follow-ups, and refreshing the public log. It's crash- and
bridge-tolerant: if the Bridge is closed it just keeps retrying until it's back.

Run it once to watch live:

```bash
python3 outreach/cli.py monitor          # foreground, runs forever
python3 outreach/cli.py monitor --once   # single pass (testing)
```

**Auto-run without launching anything** — install it as a macOS LaunchAgent (starts at login,
restarts on crash, independent of any terminal/editor):

```bash
bash outreach/install_monitor.sh             # install + start now
launchctl print gui/$(id -u)/com.cancercure.outreach-monitor | grep -i state   # -> running
tail -f outreach/.state/monitor.log          # live activity
bash outreach/install_monitor.sh uninstall   # stop + remove
```

Running it 24/7 is safe: it obeys `SEND_ENABLED`/`AUTO_REPLY_ENABLED`, so by default it
**monitors + drafts and sends nothing**. (Lambda can't hold an IMAP connection open, so real-time
monitoring is this local agent; the cloud `run_cycle` is the scheduled fallback.)

## Go-live checklist (sending is OFF until you do this on purpose)

1. **Rotate** every secret that was ever shared in plaintext; update `outreach/.env` (local) + SSM (cloud).
2. `python3 outreach/cli.py check` → both `imap` and `smtp` should be `ok`.
   - Proton Bridge: `IMAP_SECURITY=STARTTLS` (1143), `SMTP_SECURITY=SSL` (1025) — verified.
3. `seed-memory`, then `add` real prospects (use `--public` only with consent).
4. `draft` → **read every draft** (`drafts`) → `approve` the ones you want.
5. Set `SEND_ENABLED=true`, keep `DAILY_SEND_CAP` low to start; `send`.
6. `ingest` (or `cycle`) to pull replies; `publish` to refresh the public log.

**Self-test before real sends:** email your own address first (we verified the full
SMTP→IMAP loop this way) so you can see exactly what recipients will get.

**From AWS Lambda, a local Proton Bridge is unreachable.** Use a relay the function can
reach — simplest is **Amazon SES SMTP**:
- Verify your domain/sender in SES, request production access (leave the SES sandbox).
- Create SES SMTP credentials; store them in SSM (`/outreach/SMTP_*`), set
  `SMTP_HOST=email-smtp.<region>.amazonaws.com`, `SMTP_PORT=465`, `SMTP_SECURITY=SSL`.
- Keep `SendEnabled=false` in `template.yaml` until you've reviewed drafts; SES also enforces
  its own sending quota, which doubles as a guardrail.

## Provider notes

- LLM is any OpenAI-compatible endpoint (`LLM_BASE_URL`/`LLM_MODEL`); defaults to DeepSeek.
- Embeddings default to a local hashing embedding (no API needed); set `LLM_EMBED_MODEL` to use a real one.
- Firestore is optional — the local JSON store is the default and is fine for hundreds of contacts.

## ⚠️ Rotate shared secrets

Any key pasted in plaintext (chat, ticket, screen-share) is compromised. Rotate the LLM key, the
Tavily key, and the Proton Bridge password, then update `outreach/.env` (local) and SSM (cloud).

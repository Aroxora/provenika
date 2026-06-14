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

## Provider notes

- LLM is any OpenAI-compatible endpoint (`LLM_BASE_URL`/`LLM_MODEL`); defaults to DeepSeek.
- Embeddings default to a local hashing embedding (no API needed); set `LLM_EMBED_MODEL` to use a real one.
- Firestore is optional — the local JSON store is the default and is fine for hundreds of contacts.

## ⚠️ Rotate shared secrets

Any key pasted in plaintext (chat, ticket, screen-share) is compromised. Rotate the LLM key, the
Tavily key, and the Proton Bridge password, then update `outreach/.env` (local) and SSM (cloud).

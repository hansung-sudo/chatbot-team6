# Chatbot Web CI/CD (No Docker)

This repository deploys `apps/web/chatbot` using a simple Python script.

## 1) Required GitHub Secrets

Set these in `Settings > Secrets and variables > Actions`:

- `DEPLOY_HOST`: remote server host or IP
- `DEPLOY_USER`: SSH username
- `DEPLOY_SSH_KEY`: private key content used for SSH/SCP
- `DEPLOY_PATH`: target directory on server (example: `/var/www/chatbot`)
- `DEPLOY_PORT` (optional): SSH port (default: `22`)

## 2) Workflow behavior

Workflow file: `.github/workflows/deploy-chatbot.yml`

- Runs on push to `main` when files under `apps/web/chatbot/**` change
- Can also be triggered manually with `workflow_dispatch`
- Executes: `python scripts/deploy_chatbot.py`

## 3) Local manual deploy

```bash
export DEPLOY_HOST="your.server.com"
export DEPLOY_USER="ubuntu"
export DEPLOY_SSH_KEY="$(cat ~/.ssh/id_rsa)"
export DEPLOY_PATH="/var/www/chatbot"
export DEPLOY_PORT="22"

python3 scripts/deploy_chatbot.py
```

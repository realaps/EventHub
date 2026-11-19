#!/usr/bin/env bash
# One-time setup inside AWS CloudShell (or any Linux shell with AWS CLI configured).
# Installs Terraform + Ansible into your home folder and creates an SSH key for the EC2 server.
# Usage:  bash setup-cloudshell.sh
set -euo pipefail

TF_VERSION="1.9.8"
BIN="$HOME/.local/bin"
mkdir -p "$BIN"
export PATH="$BIN:$PATH"

case "$(uname -m)" in
  x86_64)  ARCH=amd64 ;;
  aarch64) ARCH=arm64 ;;
  *) echo "Unsupported CPU: $(uname -m)"; exit 1 ;;
esac

if ! command -v terraform >/dev/null 2>&1; then
  echo "==> Installing Terraform $TF_VERSION"
  curl -fsSL -o /tmp/terraform.zip \
    "https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_${ARCH}.zip"
  unzip -o -q /tmp/terraform.zip -d "$BIN"
  rm -f /tmp/terraform.zip
fi

if ! command -v ansible-playbook >/dev/null 2>&1; then
  echo "==> Installing Ansible (ansible-core)"
  # CloudShell's python is a virtualenv, so "pip --user" is refused: use our own venv in $HOME (persists)
  python3 -m venv "$HOME/.ansible-venv"
  "$HOME/.ansible-venv/bin/pip" install --quiet ansible-core
  ln -sf "$HOME"/.ansible-venv/bin/ansible* "$BIN/"
fi

grep -q 'HOME/.local/bin' "$HOME/.bashrc" 2>/dev/null || echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"

if [ ! -f "$HOME/.ssh/eventhub" ]; then
  echo "==> Creating SSH key ~/.ssh/eventhub"
  mkdir -p "$HOME/.ssh" && chmod 700 "$HOME/.ssh"
  ssh-keygen -t ed25519 -f "$HOME/.ssh/eventhub" -N "" -C "eventhub" >/dev/null
fi

echo
echo "==> Versions"
terraform version | head -1
ansible-playbook --version | head -1
aws --version
echo
echo "==> Logged in to AWS as:"
aws sts get-caller-identity --output table
echo
echo "Setup complete. If 'terraform' is not found later, run:  source ~/.bashrc"

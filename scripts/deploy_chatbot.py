#!/usr/bin/env python3
"""Deploy static chatbot frontend via SSH/SCP.

Required environment variables:
  DEPLOY_HOST          Remote server host
  DEPLOY_USER          SSH user
  DEPLOY_SSH_KEY       Private key content (PEM/OpenSSH)
  DEPLOY_PATH          Target directory on remote server

Optional environment variables:
  DEPLOY_PORT          SSH port (default: 22)
  DEPLOY_SOURCE_DIR    Local source directory (default: apps/web/chatbot)
"""

from __future__ import annotations

import os
import shlex
import stat
import subprocess
import tarfile
import tempfile
from pathlib import Path


def get_env(name: str, *, required: bool = True, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if required and not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value or ""


def run(cmd: list[str]) -> None:
    print(f"+ {' '.join(shlex.quote(part) for part in cmd)}")
    subprocess.run(cmd, check=True)


def create_archive(source_dir: Path, archive_path: Path) -> None:
    if not source_dir.exists() or not source_dir.is_dir():
        raise RuntimeError(f"Source directory not found: {source_dir}")

    with tarfile.open(archive_path, "w:gz") as tar:
        for path in source_dir.rglob("*"):
            tar.add(path, arcname=path.relative_to(source_dir))


def main() -> None:
    host = get_env("DEPLOY_HOST")
    user = get_env("DEPLOY_USER")
    key_content = get_env("DEPLOY_SSH_KEY")
    remote_path = get_env("DEPLOY_PATH")
    port = get_env("DEPLOY_PORT", required=False, default="22")
    source_dir = Path(get_env("DEPLOY_SOURCE_DIR", required=False, default="apps/web/chatbot"))

    with tempfile.TemporaryDirectory(prefix="chatbot-deploy-") as tmp_dir:
        tmp = Path(tmp_dir)
        key_file = tmp / "id_deploy"
        archive_file = tmp / "chatbot.tar.gz"
        remote_archive = f"/tmp/chatbot-{os.getpid()}.tar.gz"

        key_file.write_text(key_content, encoding="utf-8")
        key_file.chmod(stat.S_IRUSR | stat.S_IWUSR)

        create_archive(source_dir, archive_file)

        scp_cmd = [
            "scp",
            "-P",
            port,
            "-i",
            str(key_file),
            "-o",
            "StrictHostKeyChecking=no",
            str(archive_file),
            f"{user}@{host}:{remote_archive}",
        ]
        run(scp_cmd)

        quoted_remote_path = shlex.quote(remote_path)
        quoted_remote_archive = shlex.quote(remote_archive)
        remote_cmd = (
            f"mkdir -p {quoted_remote_path} && "
            f"tar -xzf {quoted_remote_archive} -C {quoted_remote_path} && "
            f"rm -f {quoted_remote_archive}"
        )

        ssh_cmd = [
            "ssh",
            "-p",
            port,
            "-i",
            str(key_file),
            "-o",
            "StrictHostKeyChecking=no",
            f"{user}@{host}",
            remote_cmd,
        ]
        run(ssh_cmd)

    print("Deployment completed successfully.")


if __name__ == "__main__":
    main()

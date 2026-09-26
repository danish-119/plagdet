#!/usr/bin/env python3
"""Compile the native C-kernel shared library for the current platform."""

from __future__ import annotations

import platform
import subprocess
import sys
from pathlib import Path


def _target_name() -> str:
    machine = platform.machine().lower()
    arch = "arm64" if machine in {"arm64", "aarch64"} else "amd64"
    if sys.platform.startswith("win"):
        return f"windows_{arch}.dll"
    if sys.platform == "darwin":
        return f"darwin_{arch}.dylib"
    return f"linux_{arch}.so"


def main() -> int:
    backend_dir = Path(__file__).resolve().parent
    native_dir = backend_dir / "native"
    build_dir = native_dir / "build"
    build_dir.mkdir(parents=True, exist_ok=True)

    output = build_dir / _target_name()
    source_files = [native_dir / "rolling_hash.c", native_dir / "minhash_ops.c"]

    command = ["gcc", "-shared", "-O3"]
    if not sys.platform.startswith("win"):
        command.append("-fPIC")
    command.extend(["-o", str(output), *map(str, source_files)])

    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"✓ Compiled: {output}")
        return 0

    print(f"✗ Compilation failed: {result.stderr.strip()}")
    print("The backend will use pure Python fallback paths (slower but functional)")
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
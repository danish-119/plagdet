"""ctypes bridge to the compiled C-kernel.

REQ-BRIDGE-01, REQ-BRIDGE-02, REQ-NFR-PLAT-03, REQ-NFR-PLAT-04:
Load the platform-specific shared library when present and fall back to pure Python.
"""

from __future__ import annotations

import ctypes
import logging
import platform
import sys
from pathlib import Path
import zlib


logger = logging.getLogger(__name__)
_NATIVE_LIB: ctypes.CDLL | ctypes.WinDLL | None = None
_NATIVE_LIB_LOOKED_UP = False
_NATIVE_LIB_WARNING_EMITTED = False


def _library_path() -> Path | None:
    base_dir = Path(__file__).resolve().parents[1] / "native" / "build"
    machine = platform.machine().lower()
    if machine in {"arm64", "aarch64"}:
        arch = "arm64"
    else:
        arch = "amd64"

    if sys.platform.startswith("win"):
        candidates = [
            base_dir / f"windows_{arch}.dll",
            base_dir / "windows_amd64.dll",
            base_dir / "windows_arm64.dll",
        ]
    elif sys.platform == "darwin":
        candidates = [
            base_dir / f"darwin_{arch}.dylib",
            base_dir / "darwin_amd64.dylib",
            base_dir / "darwin_arm64.dylib",
        ]
    elif sys.platform.startswith("linux"):
        candidates = [
            base_dir / f"linux_{arch}.so",
            base_dir / "linux_amd64.so",
            base_dir / "linux_arm64.so",
        ]
    else:
        candidates = []

    if base_dir.exists():
        candidates.extend(sorted(base_dir.glob("*.dll")))
        candidates.extend(sorted(base_dir.glob("*.dylib")))
        candidates.extend(sorted(base_dir.glob("*.so")))

    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def load_native_library() -> ctypes.CDLL | ctypes.WinDLL | None:
    """Load the native library for the current platform or return None."""

    global _NATIVE_LIB
    global _NATIVE_LIB_LOOKED_UP
    global _NATIVE_LIB_WARNING_EMITTED
    if _NATIVE_LIB is not None:
        return _NATIVE_LIB
    if _NATIVE_LIB_LOOKED_UP and _NATIVE_LIB is None:
        return None

    _NATIVE_LIB_LOOKED_UP = True

    lib_path = _library_path()
    if lib_path is None:
        if not _NATIVE_LIB_WARNING_EMITTED:
            logger.warning("Native C-kernel not found; using pure Python fallback paths")
            _NATIVE_LIB_WARNING_EMITTED = True
        return None

    try:
        if sys.platform.startswith("win"):
            library = ctypes.WinDLL(str(lib_path))
        else:
            library = ctypes.CDLL(str(lib_path))

        library.rolling_hash.argtypes = [ctypes.c_char_p, ctypes.c_int, ctypes.c_uint32]
        library.rolling_hash.restype = ctypes.c_uint32
        library.minhash_batch.argtypes = [
            ctypes.POINTER(ctypes.c_uint32),
            ctypes.c_int,
            ctypes.c_int,
            ctypes.POINTER(ctypes.c_uint32),
        ]
        library.minhash_batch.restype = None
        _NATIVE_LIB = library
        logger.info("Native C-kernel loaded successfully from %s", lib_path)
        return library
    except OSError:
        if not _NATIVE_LIB_WARNING_EMITTED:
            logger.warning("Unable to load native C-kernel; using pure Python fallback paths", exc_info=True)
            _NATIVE_LIB_WARNING_EMITTED = True
        return None


def rolling_hash(text: str, seed: int = 0) -> int:
    """32-bit rolling hash with a native fast path and pure Python fallback."""

    library = load_native_library()
    if library is not None:
        encoded = text.encode("utf-8", errors="ignore")
        return int(library.rolling_hash(encoded, len(encoded), ctypes.c_uint32(seed)))

    return zlib.crc32(text.encode("utf-8", errors="ignore"), seed) & 0xFFFFFFFF


def minhash_batch(shingles: list[int], num_hashes: int) -> list[int]:
    """Compute MinHash signatures with a native fast path and pure Python fallback."""

    library = load_native_library()
    if not shingles:
        return [0 for _ in range(num_hashes)]

    if library is not None:
        shingle_array = (ctypes.c_uint32 * len(shingles))(*[value & 0xFFFFFFFF for value in shingles])
        output_array = (ctypes.c_uint32 * num_hashes)()
        library.minhash_batch(shingle_array, len(shingles), num_hashes, output_array)
        return [int(value) for value in output_array]

    max_int = 2**31 - 1
    signatures = [max_int] * num_hashes
    for shingle in shingles:
        for index in range(num_hashes):
            hashed = hash((shingle, index)) & 0x7FFFFFFF
            if hashed < signatures[index]:
                signatures[index] = hashed
    return signatures

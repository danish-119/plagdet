import { RESULTS_TTL_MINUTES } from './constants';

const CACHE_NAME = 'plagdet-file-batch-cache';
const CACHE_ROOT = '/__plagdet_file_cache__';

interface CachedBatchMetadata {
  fingerprint: string;
  createdAt: number;
  expiresAt: number;
  files: Array<{
    name: string;
    size: number;
    type: string;
    lastModified: number;
  }>;
}

function canUseCacheApi(): boolean {
  return typeof caches !== 'undefined' && typeof crypto !== 'undefined' && !!crypto.subtle;
}

function encodeFingerprint(fingerprint: string): string {
  return encodeURIComponent(fingerprint);
}

function getMetadataRequest(fingerprint: string): Request {
  return new Request(`${CACHE_ROOT}/${encodeFingerprint(fingerprint)}/meta`);
}

function getFileRequest(fingerprint: string, index: number): Request {
  return new Request(`${CACHE_ROOT}/${encodeFingerprint(fingerprint)}/files/${index}`);
}

async function deleteFingerprintEntries(cache: Cache, fingerprint: string, fileCount: number): Promise<void> {
  await cache.delete(getMetadataRequest(fingerprint));

  for (let index = 0; index < fileCount; index += 1) {
    await cache.delete(getFileRequest(fingerprint, index));
  }
}

async function getMetadata(cache: Cache, fingerprint: string): Promise<CachedBatchMetadata | null> {
  const response = await cache.match(getMetadataRequest(fingerprint));
  if (!response) {
    return null;
  }

  try {
    return (await response.json()) as CachedBatchMetadata;
  } catch {
    return null;
  }
}

export async function computeBatchFingerprint(files: File[]): Promise<string> {
  if (!canUseCacheApi()) {
    return '';
  }

  const encoder = new TextEncoder();
  const signature = [...files]
    .sort((left, right) => left.name.localeCompare(right.name) || left.size - right.size || left.lastModified - right.lastModified)
    .map((file) => `${file.name}:${file.size}:${file.lastModified}`)
    .join('|');

  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(signature));
  return Array.from(new Uint8Array(hashBuffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function cacheFiles(fingerprint: string, files: File[]): Promise<void> {
  if (!fingerprint || !canUseCacheApi()) {
    return;
  }

  const cache = await caches.open(CACHE_NAME);
  const normalizedFiles = [...files].sort((left, right) => left.name.localeCompare(right.name) || left.size - right.size || left.lastModified - right.lastModified);
  const now = Date.now();
  const expiresAt = now + RESULTS_TTL_MINUTES * 60 * 1000;

  await deleteFingerprintEntries(cache, fingerprint, normalizedFiles.length);

  const metadata: CachedBatchMetadata = {
    fingerprint,
    createdAt: now,
    expiresAt,
    files: normalizedFiles.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    })),
  };

  await cache.put(
    getMetadataRequest(fingerprint),
    new Response(JSON.stringify(metadata), {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  );

  for (let index = 0; index < normalizedFiles.length; index += 1) {
    const file = normalizedFiles[index];
    await cache.put(
      getFileRequest(fingerprint, index),
      new Response(await file.arrayBuffer(), {
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-File-Name': encodeURIComponent(file.name),
          'X-File-Last-Modified': file.lastModified.toString(),
        },
      })
    );
  }
}

export async function getCachedFiles(fingerprint: string): Promise<File[] | null> {
  if (!fingerprint || !canUseCacheApi()) {
    return null;
  }

  const cache = await caches.open(CACHE_NAME);
  const metadata = await getMetadata(cache, fingerprint);

  if (!metadata) {
    return null;
  }

  if (metadata.expiresAt <= Date.now()) {
    await deleteFingerprintEntries(cache, fingerprint, metadata.files.length);
    return null;
  }

  const cachedFiles: File[] = [];

  for (let index = 0; index < metadata.files.length; index += 1) {
    const response = await cache.match(getFileRequest(fingerprint, index));
    if (!response) {
      return null;
    }

    const blob = await response.blob();
    const fileMeta = metadata.files[index];
    const fileName = response.headers.get('X-File-Name')
      ? decodeURIComponent(response.headers.get('X-File-Name') as string)
      : fileMeta.name;
    const fileLastModified = Number(response.headers.get('X-File-Last-Modified') || fileMeta.lastModified);

    cachedFiles.push(
      new File([blob], fileName, {
        type: response.headers.get('Content-Type') || fileMeta.type || blob.type,
        lastModified: Number.isFinite(fileLastModified) ? fileLastModified : fileMeta.lastModified,
      })
    );
  }

  return cachedFiles;
}

export async function clearExpiredCaches(): Promise<void> {
  if (!canUseCacheApi()) {
    return;
  }

  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  const metadataRequests = requests.filter((request) => request.url.includes('/meta'));

  for (const request of metadataRequests) {
    const fingerprint = decodeURIComponent(request.url.split('/meta')[0].split('/').pop() || '');
    if (!fingerprint) {
      continue;
    }

    const metadata = await getMetadata(cache, fingerprint);
    if (!metadata || metadata.expiresAt > Date.now()) {
      continue;
    }

    await deleteFingerprintEntries(cache, fingerprint, metadata.files.length);
  }
}
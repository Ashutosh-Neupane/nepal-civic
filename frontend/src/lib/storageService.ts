import { api, ApiError } from './api';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * Uploads a photo, video or PDF and returns its storage key. The backend picks the
 * key and returns a short-lived signed upload URL (local disk or S3 compatible).
 * The complaintRef argument is kept for older callers and is not needed any more.
 */
export async function uploadComplaintEvidence(file: File, _complaintRef?: string): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(400, 'Files must be smaller than 25 MB.');
  }
  const { data } = await api.post<{ uploadUrl: string; filename: string }>('/storage/presign-put', {
    filename: file.name,
  });
  const response = await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!response.ok) {
    throw new ApiError(response.status, 'Upload failed. Please try again.');
  }
  return data.filename;
}

const urlCache = new Map<string, { url: string; expiresAt: number }>();
const URL_CACHE_MS = 4 * 60 * 1000;

/** Turns storage keys into viewable URLs. Values that are already URLs pass through. */
export async function getEvidenceUrls(keys: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const now = Date.now();
  const missing: string[] = [];
  for (const key of keys) {
    if (!key) continue;
    if (/^(https?:|data:|blob:)/.test(key)) {
      result[key] = key;
      continue;
    }
    const cached = urlCache.get(key);
    if (cached && cached.expiresAt > now) result[key] = cached.url;
    else missing.push(key);
  }
  if (missing.length) {
    const { data } = await api.post<{ retrieveUrls: Record<string, string | null> }>('/storage/presign-get', {
      filename: missing,
    });
    for (const [key, url] of Object.entries(data.retrieveUrls || {})) {
      if (!url) continue;
      result[key] = url;
      urlCache.set(key, { url, expiresAt: now + URL_CACHE_MS });
    }
  }
  return result;
}

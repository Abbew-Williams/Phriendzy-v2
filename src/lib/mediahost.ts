'use client';
/**
 * mediahost.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop-in upload client for the MediaHost API.
 *
 * Features:
 *  • Compresses video in the browser before uploading (using MediaRecorder)
 *  • Splits large files into chunks and uploads them in parallel
 *  • Real-time progress callback (0–100)
 *  • Works with images too (no compression needed)
 *
 * Usage:
 *   import { uploadFile } from './mediahost.js';
 *
 *   const result = await uploadFile(file, {
 *     apiUrl:   'https://app.phriendzy.com/upload/api_upload.php',
 *     apiKey:   '',           // leave empty if auth is disabled
 *     onProgress: (pct, label) => console.log(`${pct}%: ${label}`),
 *   });
 *
 *   console.log(result.direct_url);  // use in <img> or <video>
 *   console.log(result.url);         // shareable viewer page
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Config defaults ───────────────────────────────────────────────────────────
const CHUNK_SIZE = 2 * 1024 * 1024;   // 2 MB per chunk
const PARALLEL_CHUNKS = 3;                  // chunks sent at the same time
const VIDEO_MAX_BITRATE = 2_500_000;          // 2.5 Mbps target for compression
const VIDEO_MAX_BYTES = 100 * 1024 * 1024; // skip compression if already < 100 MB

// ── Unique ID generator ───────────────────────────────────────────────────────
function uuid(): string {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type ProgressCallback = (percent: number, status: string) => void;

// ─────────────────────────────────────────────────────────────────────────────
//  VIDEO COMPRESSION
// ─────────────────────────────────────────────────────────────────────────────
async function compressVideo(file: File, onProgress?: ProgressCallback): Promise<Blob> {
    if (file.size <= VIDEO_MAX_BYTES) return file;
  
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : null;
  
    if (!mimeType || !window.MediaRecorder) {
      console.warn('[MediaHost] Browser does not support MediaRecorder — skipping compression.');
      return file;
    }
  
    onProgress?.(0, 'Compressing video…');
  
    return new Promise((resolve) => {
      const videoEl = document.createElement('video');
      videoEl.muted = true;
      videoEl.src = URL.createObjectURL(file);
  
      videoEl.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        const ctx = canvas.getContext('2d');
  
        if (!ctx) {
          URL.revokeObjectURL(videoEl.src);
          console.warn('[MediaHost] Could not get 2D context — using original.');
          resolve(file);
          return;
        }
  
        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: VIDEO_MAX_BITRATE,
        });
  
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
          URL.revokeObjectURL(videoEl.src);
          const compressed = new Blob(chunks, { type: mimeType });
          console.log(
            `[MediaHost] Compressed ${(file.size / 1e6).toFixed(1)} MB → ${(compressed.size / 1e6).toFixed(1)} MB`
          );
          resolve(compressed);
        };
        recorder.onerror = () => {
          URL.revokeObjectURL(videoEl.src);
          console.warn('[MediaHost] Compression failed — using original.');
          resolve(file);
        };
  
        recorder.start(200);
  
        function drawFrame() {
          if (videoEl.ended || videoEl.paused) {
              if (recorder.state === 'recording') {
                  recorder.stop();
              }
              return;
          }
          ctx!.drawImage(videoEl, 0, 0);
          const pct = Math.min(90, Math.round((videoEl.currentTime / videoEl.duration) * 90));
          onProgress?.(pct, 'Compressing video…');
          requestAnimationFrame(drawFrame);
        }
  
        videoEl.onended = () => {
            if (recorder.state === 'recording') {
              recorder.stop();
            }
        };
        videoEl.play().then(drawFrame).catch(() => {
          if (recorder.state === 'recording') {
              recorder.stop();
          }
          resolve(file);
        });
      };
  
      videoEl.onerror = () => {
        URL.revokeObjectURL(videoEl.src);
        resolve(file); // fallback
      };
    });
}
  

// ─────────────────────────────────────────────────────────────────────────────
//  CHUNKED UPLOAD
// ─────────────────────────────────────────────────────────────────────────────
async function uploadChunked(
    blob: Blob,
    originalName: string,
    mimeType: string,
    apiUrl: string,
    apiKey: string,
    onProgress?: ProgressCallback
): Promise<any> {
  const totalChunks = Math.ceil(blob.size / CHUNK_SIZE);
  const fileId = uuid();
  let uploaded = 0;

  const chunkBlobs = Array.from({ length: totalChunks }, (_, i) =>
    blob.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
  );

  async function sendChunk(index: number): Promise<any> {
    const form = new FormData();
    form.append('chunk', chunkBlobs[index], 'chunk');

    const headers: Record<string, string> = {
      'X-Chunk-Index': String(index),
      'X-Total-Chunks': String(totalChunks),
      'X-File-Id': fileId,
      'X-File-Name': encodeURIComponent(originalName),
      'X-File-Type': mimeType,
    };
    if (apiKey) headers['X-API-Key'] = apiKey;

    const res = await fetch(apiUrl, { method: 'POST', headers, body: form });

    if (!res.ok) {
        let errorMsg = `Upload failed with status: ${res.status}`;
        try {
            // Try to parse the error response as JSON, as defined by the API docs
            const errorBody = await res.text();
            const errorJson = JSON.parse(errorBody);
            if (errorJson.error) {
                errorMsg = errorJson.error;
            }
        } catch {
            // If it's not JSON, it's likely a server error (e.g., PHP fatal error)
            errorMsg = `Server returned a non-JSON error (status ${res.status}). Check server logs for details.`;
        }
        throw new Error(errorMsg);
    }
    
    const data = await res.json();

    if (!data.success && data.done !== false) {
      throw new Error(data.error || 'Chunk upload failed');
    }

    uploaded++;
    const pct = 90 + Math.round((uploaded / totalChunks) * 10);
    onProgress?.(Math.min(pct, 99), `Uploading chunk ${uploaded}/${totalChunks}`);
    return data;
  }

  let lastResult: any = null;
  for (let i = 0; i < totalChunks; i += PARALLEL_CHUNKS) {
    const batch = chunkBlobs.slice(i, i + PARALLEL_CHUNKS).map((_, j) => sendChunk(i + j));
    const results = await Promise.all(batch);
    lastResult = results[results.length - 1];
  }

  return lastResult;
}

export interface UploadOptions {
    apiUrl: string;
    apiKey?: string;
    onProgress?: ProgressCallback;
}

export interface UploadResult {
    success: boolean;
    url: string;
    direct_url: string;
    error?: string;
    id?: number;
    short_code?: string;
    file_name?: string;
    mime_type?: string;
    size_bytes?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN EXPORT — uploadFile()
// ─────────────────────────────────────────────────────────────────────────────
export async function uploadFile(file: File, options: UploadOptions): Promise<UploadResult> {
  const {
    apiUrl,
    apiKey = '',
    onProgress,
  } = options;

  if (!apiUrl) {
    throw new Error('MediaHost API URL is not configured.');
  }

  const isVideo = file.type.startsWith('video/');
  let blob: Blob = file;

  if (isVideo) {
    blob = await compressVideo(file, onProgress);
  } else {
    onProgress?.(10, 'Preparing…');
  }

  const fileName = file.name || ('upload.' + (isVideo ? 'mp4' : 'jpg'));
  const mimeType = blob.type || file.type;

  if (blob.size > CHUNK_SIZE) {
    onProgress?.(90, 'Uploading…');
    const result = await uploadChunked(blob, fileName, mimeType, apiUrl, apiKey, onProgress);
    onProgress?.(100, 'Done!');
    return result;
  }

  const form = new FormData();
  form.append('file', blob, fileName);

  const headers: Record<string, string> = {};
  if (apiKey) headers['X-API-Key'] = apiKey;

  onProgress?.(50, 'Uploading…');
  const res = await fetch(apiUrl, { method: 'POST', headers, body: form });

  if (!res.ok) {
      let errorMsg = `Upload failed with status: ${res.status}`;
      try {
          const errorBody = await res.text();
          const errorJson = JSON.parse(errorBody);
          if (errorJson.error) {
              errorMsg = errorJson.error;
          }
      } catch {
          errorMsg = `Server returned a non-JSON error (status ${res.status}). Check server logs for details.`;
      }
      throw new Error(errorMsg);
  }

  const data = await res.json();

  if (!data.success) throw new Error(data.error || 'Upload failed');

  onProgress?.(100, 'Done!');
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
//  CONVENIENCE — uploadFromInput()
// ─────────────────────────────────────────────────────────────────────────────
export async function uploadFromInput(inputEl: HTMLInputElement, options: UploadOptions): Promise<UploadResult> {
  const file = inputEl.files?.[0];
  if (!file) throw new Error('No file selected.');
  return uploadFile(file, options);
}

// Supabase Storage helpers. Uploads always go through the API: the file type is
// checked by its magic bytes (not only the declared MIME type) and the object
// path is chosen by the server.
import { env } from '../config/env.js';
import { badRequest } from '../lib/errors.js';
import { uuid } from '../lib/ids.js';
import { supabaseAdmin } from './client.js';

export const PUBLIC_BUCKET = 'catalog-images';
export const PRIVATE_BUCKET = 'private-media';

const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: 'image/png', ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/webp', ext: 'webp', test: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' },
  { mime: 'application/pdf', ext: 'pdf', test: (b) => b.subarray(0, 5).toString('ascii') === '%PDF-' },
  { mime: 'video/mp4', ext: 'mp4', test: (b) => b.subarray(4, 8).toString('ascii') === 'ftyp' },
];

export function detectFile(buffer: Buffer, allowed: string[]): { mime: string; ext: string } {
  const match = SIGNATURES.find((s) => allowed.includes(s.mime) && s.test(buffer));
  if (!match) throw badRequest(`Jenis file tidak didukung (${allowed.map((m) => m.split('/')[1]).join(', ')}).`, 'BAD_FILE');
  return match;
}

/** Upload to a bucket under `folder/`, returns the object path. */
export async function uploadObject(
  bucket: string,
  folder: string,
  file: { buffer: Buffer },
  allowed: string[],
): Promise<string> {
  const { mime, ext } = detectFile(file.buffer, allowed);
  const path = `${folder}/${uuid()}.${ext}`;
  const { error } = await supabaseAdmin.storage.from(bucket).upload(path, file.buffer, { contentType: mime, upsert: false });
  if (error) throw badRequest(`Gagal mengunggah file: ${error.message}`, 'UPLOAD_FAILED');
  return path;
}

export async function removeObjects(bucket: string, paths: string[]): Promise<void> {
  if (paths.length) await supabaseAdmin.storage.from(bucket).remove(paths);
}

/** Catalog photo URL: seed images are site paths (/images/...), uploads live in the public bucket. */
export function catalogImageUrl(path: string): string {
  return path.startsWith('/') ? path : `${env.SUPABASE_URL}/storage/v1/object/public/${PUBLIC_BUCKET}/${path}`;
}

/** Short-lived links for private media (inspection, rekber, dispute evidence). */
export async function signedUrls(paths: string[], seconds = 600): Promise<{ path: string; url: string }[]> {
  if (paths.length === 0) return [];
  const { data, error } = await supabaseAdmin.storage.from(PRIVATE_BUCKET).createSignedUrls(paths, seconds);
  if (error || !data) return [];
  return data.flatMap((d) => (d.signedUrl ? [{ path: d.path ?? '', url: d.signedUrl }] : []));
}

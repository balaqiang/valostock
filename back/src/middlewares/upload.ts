import multer from 'multer';

/** Images for catalogs: ≤ 2 MB each, ≤ 10 per request, kept in memory then sent to Storage. */
export const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 10 } });

/** Private evidence (inspection, rekber, disputes): ≤ 10 MB, ≤ 5 per request. */
export const evidenceUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 5 } });

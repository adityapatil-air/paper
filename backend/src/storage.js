const path = require('path');
const multer = require('multer');
const { supabase } = require('./supabaseClient');

const MAX_FILE_BYTES = 20 * 1024 * 1024;

const DOCUMENT_TYPES = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};
const IMAGE_TYPES = {
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
};

// The bucket also accepts images so issue cover images can live next to issue files.
const BUCKET_MIME_TYPES = Array.from(new Set([
  ...Object.values(DOCUMENT_TYPES).flat(),
  ...Object.values(IMAGE_TYPES).flat(),
]));

const getBucketName = () => process.env.SUPABASE_STORAGE_BUCKET || 'manuscripts';

// Errors carry a status and a short client-safe message; the real cause is logged.
class StorageError extends Error {
  constructor(code, clientMessage, status, cause) {
    super(clientMessage);
    this.code = code;
    this.status = status;
    this.cause = cause;
  }
}

const storageUnavailable = (cause) =>
  new StorageError('STORAGE_UNAVAILABLE', 'File storage is unavailable right now. Please try again later.', 503, cause);
const fileTooLarge = () =>
  new StorageError('FILE_TOO_LARGE', 'File too large. The maximum size is 20 MB.', 413);
const unsupportedType = (allowed) =>
  new StorageError('UNSUPPORTED_FILE_TYPE', `Unsupported file type. Allowed: ${allowed.map((e) => e.toUpperCase()).join(', ')}.`, 415);

let bucketReady = false;

// Makes sure the storage bucket exists (creating it if missing). Safe to call repeatedly.
const ensureBucket = async () => {
  if (bucketReady) return true;
  if (!supabase) {
    console.error('[storage] Supabase client is not configured; uploads will fail.');
    return false;
  }
  const bucket = getBucketName();
  try {
    const { data: existing, error: getError } = await supabase.storage.getBucket(bucket);
    if (existing && !getError) {
      if (!existing.public) {
        console.warn(`[storage] Bucket "${bucket}" exists but is not public; stored file URLs will not open for visitors.`);
      }
      bucketReady = true;
      console.log(`[storage] Bucket "${bucket}" is ready.`);
      return true;
    }

    const { error: createError } = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: MAX_FILE_BYTES,
      allowedMimeTypes: BUCKET_MIME_TYPES,
    });
    if (createError && !/already exists/i.test(createError.message || '')) {
      console.error(`[storage] Could not create bucket "${bucket}":`, createError.message || createError);
      return false;
    }
    bucketReady = true;
    console.log(`[storage] Created public bucket "${bucket}" (20 MB limit, pdf/doc/docx + images).`);
    return true;
  } catch (err) {
    console.error(`[storage] Bucket check failed for "${bucket}":`, err?.message || err);
    return false;
  }
};

// "My Paper (final) v2.PDF" -> "My-Paper-final-v2.pdf"
const sanitizeFilename = (originalName) => {
  const ext = path.extname(String(originalName || '')).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const base = path.basename(String(originalName || 'file'), path.extname(String(originalName || '')))
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return `${base || 'file'}${ext}`;
};

const extensionOf = (name) => path.extname(String(name || '')).toLowerCase().replace('.', '');

// Uploads a multer memory file and returns its public URL. Throws StorageError.
// If the bucket is missing at upload time (e.g. it was deleted, or a getBucket
// call gave a false positive), it recreates the bucket and retries once.
const uploadFile = async (file, pathPrefix = '', allowRetry = true) => {
  if (!file) return null;
  if (!supabase) throw storageUnavailable(new Error('Supabase client not configured'));
  if (!(await ensureBucket())) throw storageUnavailable(new Error('Bucket unavailable'));

  const bucket = getBucketName();
  const prefix = pathPrefix ? `${String(pathPrefix).replace(/^\/+|\/+$/g, '')}/` : '';
  const filePath = `${prefix}${Date.now()}-${sanitizeFilename(file.originalname)}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: false });

  if (error) {
    const msg = error.message || String(error);
    if (/maximum allowed size|too large|payload/i.test(msg)) throw fileTooLarge();
    if (/mime type|not supported/i.test(msg)) throw unsupportedType([...Object.keys(DOCUMENT_TYPES)]);
    if (/bucket not found/i.test(msg) && allowRetry) {
      console.warn(`[storage] Bucket "${bucket}" reported missing during upload; recreating and retrying once.`);
      bucketReady = false;
      return uploadFile(file, pathPrefix, false);
    }
    console.error(`[storage] Upload failed for "${filePath}" (${file.mimetype}, ${file.size} bytes): ${msg}`);
    throw storageUnavailable(error);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  if (!data?.publicUrl) throw storageUnavailable(new Error('No public URL returned'));
  return data.publicUrl;
};

// Best-effort removal of an object we uploaded, given its public URL (used to roll back failed writes).
const removeFileByUrl = async (publicUrl) => {
  if (!publicUrl || !supabase) return;
  const bucket = getBucketName();
  const marker = `/object/public/${bucket}/`;
  const idx = String(publicUrl).indexOf(marker);
  if (idx < 0) return;
  const objectPath = decodeURIComponent(String(publicUrl).slice(idx + marker.length));
  const { error } = await supabase.storage.from(bucket).remove([objectPath]);
  if (error) console.warn(`[storage] Could not remove "${objectPath}": ${error.message || error}`);
};

// multer instance restricting each field to its allowed extensions.
// fieldTypes: { manuscript: 'document', coverImage: 'image' }
const makeUploader = (fieldTypes) => multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    const kind = fieldTypes[file.fieldname];
    const table = kind === 'image' ? IMAGE_TYPES : DOCUMENT_TYPES;
    const ext = extensionOf(file.originalname);
    if (!kind || !table[ext]) {
      return cb(unsupportedType(Object.keys(table)));
    }
    return cb(null, true);
  },
});

// Wraps upload.fields/single so multer errors become specific JSON responses.
const handleUpload = (middleware) => (req, res, next) => {
  middleware(req, res, (err) => {
    if (!err) return next();
    if (err instanceof StorageError) return res.status(err.status).json({ success: false, error: err.message, code: err.code });
    if (err.code === 'LIMIT_FILE_SIZE') {
      const e = fileTooLarge();
      return res.status(e.status).json({ success: false, error: e.message, code: e.code });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ success: false, error: `Unexpected file field "${err.field}".`, code: 'UNEXPECTED_FILE' });
    }
    console.error('[upload] Unexpected multer error:', err);
    return res.status(400).json({ success: false, error: 'The upload could not be processed.', code: 'UPLOAD_ERROR' });
  });
};

// Sends a StorageError as JSON, or returns false so the caller can fall back.
const sendStorageError = (res, err) => {
  if (!(err instanceof StorageError)) return false;
  res.status(err.status).json({ success: false, error: err.message, code: err.code });
  return true;
};

module.exports = {
  MAX_FILE_BYTES,
  StorageError,
  ensureBucket,
  getBucketName,
  sanitizeFilename,
  uploadFile,
  removeFileByUrl,
  makeUploader,
  handleUpload,
  sendStorageError,
};

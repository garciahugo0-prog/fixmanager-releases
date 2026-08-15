import { supabase } from '../supabase';

/**
 * Converts a base64 string or Data URI to a Blob object.
 */
export function base64ToBlob(base64: string, mime: string): Blob {
  const cleanBase64 = base64.replace(/^data:(.*?);base64,/, '');
  const byteString = atob(cleanBase64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

/**
 * Uploads local evidence (image or video) base64 data to Supabase Storage.
 * Returns the public URL of the uploaded file on success, or null on failure.
 */
export async function uploadEvidenceToSupabase(
  orderId: string | number,
  fileName: string,
  fileBase64: string
): Promise<string | null> {
  try {
    // 1. Verify user is authenticated in Supabase
    const { data: authData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    if (!authData?.user) {
      console.warn('[EvidenceUpload] No authenticated user session, skipping Storage upload.');
      return null;
    }

    // 2. Parse mimeType from the base64 string
    const matches = fileBase64.match(/^data:(.*?);base64,/);
    const mimeType = matches ? matches[1] : 'image/jpeg';
    const blob = base64ToBlob(fileBase64, mimeType);

    // 3. Construct storage path: "order_<orderId>/<timestamp>_<sanitized_filename>"
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `order_${orderId}/${Date.now()}_${cleanFileName}`;

    console.log(`[EvidenceUpload] Starting upload to Supabase Storage: ${storagePath}`);
    const { data, error } = await supabase.storage
      .from('evidencias')
      .upload(storagePath, blob, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('[EvidenceUpload] Supabase Storage upload failed:', error);
      return null;
    }

    // 4. Retrieve public URL
    const { data: urlData } = supabase.storage
      .from('evidencias')
      .getPublicUrl(data.path);

    console.log('[EvidenceUpload] Upload successful. Public URL:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (err) {
    console.error('[EvidenceUpload] Unexpected error during storage upload:', err);
    return null;
  }
}

/**
 * Uploads a product or spare part image to Supabase Storage.
 * Returns the public URL, or null if it fails or if offline.
 */
export async function uploadProductImageToSupabase(
  type: 'product' | 'refaccion',
  id: string,
  fileBase64: string
): Promise<string | null> {
  try {
    const { data: authData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    if (!authData?.user) {
      return null;
    }

    const matches = fileBase64.match(/^data:(.*?);base64,/);
    const mimeType = matches ? matches[1] : 'image/jpeg';
    const blob = base64ToBlob(fileBase64, mimeType);

    const folder = type === 'product' ? 'products' : 'refacciones';
    const storagePath = `${folder}/${type}_${id}.jpg`;

    const { data, error } = await supabase.storage
      .from('evidencias')
      .upload(storagePath, blob, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('[ProductImageUpload] Supabase upload failed:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('evidencias')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (err) {
    console.error('[ProductImageUpload] Error:', err);
    return null;
  }
}

/**
 * Deletes a product or spare part image from Supabase Storage.
 */
export async function deleteProductImageFromSupabase(urlStr: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(urlStr);
    const parts = parsedUrl.pathname.split('/public/evidencias/');
    if (parts.length > 1) {
      const storagePath = decodeURIComponent(parts[1].split('?')[0]);
      const { error } = await supabase.storage.from('evidencias').remove([storagePath]);
      return !error;
    }
    return false;
  } catch (e) {
    console.error('[SupabaseImageDelete] Error:', e);
    return false;
  }
}


import api from '../services/api';

interface SignatureResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  uploadPreset: string;
  folder: string;
}

/**
 * Uploads a file directly to Cloudinary using a server-generated signature.
 * Returns the secure HTTPS URL. Supports images, videos, SVG and raw files
 * via the /auto/upload endpoint. Used as BlockNote's `uploadFile`.
 */
export async function uploadToCloudinary(file: File): Promise<string> {
  const { data: sig } = await api.get<SignatureResponse>('/media/signature');

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('upload_preset', sig.uploadPreset);
  form.append('folder', sig.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Échec de l'upload Cloudinary: ${detail}`);
  }

  const json = (await res.json()) as { secure_url: string };
  return json.secure_url;
}

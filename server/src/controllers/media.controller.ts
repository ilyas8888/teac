import { Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { AuthRequest } from '../middleware/auth.middleware';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Returns a short-lived signature so the client can upload a file directly to
 * Cloudinary (signed preset). The API secret never leaves the server.
 * Signed params here MUST match exactly what the client sends in the upload.
 */
export const getUploadSignature = async (req: AuthRequest, res: Response): Promise<void> => {
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'teac-preset';

  if (!apiSecret || !apiKey || !cloudName) {
    res.status(500).json({ message: 'Cloudinary non configuré sur le serveur' });
    return;
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = 'teac';
  const paramsToSign = { folder, timestamp, upload_preset: uploadPreset };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  res.json({ signature, timestamp, apiKey, cloudName, uploadPreset, folder });
};

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName, contentType } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({ error: 'fileName and contentType are required' });
    }

    // Verify required environment variables
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;
    const customDomain = process.env.R2_PUBLIC_CUSTOM_DOMAIN;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !customDomain) {
      console.error("Missing R2 Environment Variables");
      return res.status(500).json({ error: 'Server is not configured for R2 uploads.' });
    }

    const S3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      ContentType: contentType,
    });

    // Generate a signed URL that expires in 5 minutes
    const signedUrl = await getSignedUrl(S3, command, { expiresIn: 300 });

    // The public URL where the file will be accessible after upload
    // Ensure customDomain doesn't have a trailing slash
    const domain = customDomain.replace(/\/$/, '');
    const publicUrl = `${domain}/${fileName}`;

    return res.status(200).json({ signedUrl, publicUrl });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

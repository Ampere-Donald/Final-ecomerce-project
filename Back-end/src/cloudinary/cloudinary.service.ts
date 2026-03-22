import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);
  private configured = false;

  onModuleInit() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.configured = true;
      this.logger.log('Cloudinary configured successfully');
    } else {
      this.logger.warn(
        'Cloudinary env vars missing — image uploads will fail. ' +
        'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
      );
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Upload a buffer (image file bytes) to Cloudinary.
   * Returns the secure URL string.
   */
  async uploadBuffer(
    buffer: Buffer,
    options?: { folder?: string; publicId?: string },
  ): Promise<string> {
    if (!this.configured) {
      throw new Error('Cloudinary is not configured. Check environment variables.');
    }

    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options?.folder || 'produits',
          public_id: options?.publicId,
          resource_type: 'image',
          overwrite: true,
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Cloudinary upload returned no result'));
          resolve(result.secure_url);
        },
      );
      uploadStream.end(buffer);
    });
  }

  /**
   * Delete an image from Cloudinary by its URL.
   * Extracts the public_id from the URL.
   */
  async deleteByUrl(url: string): Promise<void> {
    if (!this.configured || !url.includes('cloudinary')) return;

    try {
      // Extract public_id from URL:  ...upload/v12345/produits/filename.jpg
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
      if (match?.[1]) {
        await cloudinary.uploader.destroy(match[1]);
      }
    } catch (err) {
      this.logger.warn(`Failed to delete Cloudinary image: ${url}`, err);
    }
  }
}

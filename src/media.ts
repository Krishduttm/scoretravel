import awsLite from '@aws-lite/client';
import { request } from 'undici';
import { basename, join } from 'node:path';
import type { S3 } from '@aws-lite/s3';

interface MediaConfig {
  s3Endpoint: string;
  s3Region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

interface UploadOptions {
  sourceUrl: string;
  destinationDir: string;
  maxFileSize?: number;
}

export class Media {
  private s3Client!: S3;
  private readonly bucket: string;
  private readonly defaultMaxFileSize = 100 * 1024 * 1024; // 100MB default

  constructor(config: MediaConfig) {
    this.bucket = config.bucket;
    this.initializeClient(config);
  }

  private async initializeClient(config: MediaConfig) {
    const client = await awsLite({
      region: config.s3Region,
      endpoint: config.s3Endpoint,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    });
    this.s3Client = client;
  }

  async uploadUrl({ sourceUrl, destinationDir, maxFileSize = this.defaultMaxFileSize }: UploadOptions): Promise<string> {
    try {
      new URL(sourceUrl);
    } catch {
      throw new Error('Invalid source URL provided');
    }
  
    const { statusCode, headers } = await request(sourceUrl, { method: 'GET' });
    console.log(statusCode, headers);
    console.log('contentType', headers['content-type']);
  
    if (statusCode !== 200) {
      throw new Error(`Failed to fetch file from URL: ${sourceUrl}`);
    }
  
    const contentLength = parseInt(headers['content-length'] as string, 10);
    const contentType = headers['content-type'];
  
    if (isNaN(contentLength)) {
      throw new Error('Could not determine file size');
    }
  
    if (contentLength > maxFileSize) {
      throw new Error(`File size ${contentLength} exceeds maximum allowed size of ${maxFileSize}`);
    }
  
    if (!contentType) {
      throw new Error('Could not determine content type');
    }
  
    // Validate content type
    if (!this.isValidContentType(contentType as string)) {
      throw new Error(`Invalid content type: ${contentType}`);
    }
  
    // Stream the file
    const { body } = await request(sourceUrl);
    if (!body) {
      throw new Error('Failed to get response body');
    }
  
    const fileName = this.generateFileName(sourceUrl, contentType as string);
    const key = join(destinationDir, fileName);
  
    try {
      await this.s3Client.putObject({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType as string,
        ContentLength: contentLength,
      });
  
      return key;
    } catch (error) {
      throw new Error(`Failed to upload file to S3: ${(error as Error).message}`);
    }
  }
  

  private isValidContentType(contentType: string): boolean {
    const validTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/quicktime'
    ];

    return validTypes.includes(contentType.toLowerCase());
  }

  private generateFileName(url: string, contentType: string): string {
    const originalName = basename(new URL(url).pathname);
    const timestamp = Date.now();
    const extension = this.getExtensionFromContentType(contentType);
    
    return `${timestamp}-${originalName}${extension}`;
  }

  private getExtensionFromContentType(contentType: string): string {
    const extensionMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov'
    };

    return extensionMap[contentType.toLowerCase()] || '';
  }
} 
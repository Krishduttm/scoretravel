import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Media } from './media';
import fixtures from '../fixtures.json';

vi.mock('@aws-lite/client', () => ({
  default: vi.fn().mockResolvedValue({
    putObject: vi.fn().mockResolvedValue({ ETag: 'mock-etag' })
  })
}));

describe('Media', () => {
  let media: Media;

  beforeEach(async () => {
    media = new Media({
      s3Endpoint: 'http://localhost:9000',
      s3Region: 'us-east-1',
      bucket: 'dummy-bucket',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret'
    });
    // Wait for client initialization
    await media['initializeClient']({
      s3Endpoint: 'http://localhost:9000',
      s3Region: 'us-east-1',
      bucket: 'dummy-bucket',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret'
    });
  });

  describe('uploadUrl', () => {
    it('should successfully upload a small image', async () => {
      const result = await media.uploadUrl({
        sourceUrl: fixtures['2mb_image'],
        destinationDir: 'images',
        maxFileSize: 5 * 1024 * 1024
      });

      expect(result).toMatch(/^images\/.+\.jpg$/);
    });

    it('should reject files larger than maxFileSize', async () => {
      await expect(
        media.uploadUrl({
          sourceUrl: fixtures['12mb_image'],
          destinationDir: 'images',
          maxFileSize: 5 * 1024 * 1024
        })
      ).rejects.toThrow(/exceeds maximum allowed size/);
    });

    it('should reject invalid URLs', async () => {
      await expect(
        media.uploadUrl({
          sourceUrl: 'not-a-url',
          destinationDir: 'images'
        })
      ).rejects.toThrow('Invalid source URL provided');
    });

    it('should reject invalid file types', async () => {
      await expect(
        media.uploadUrl({
          sourceUrl: fixtures['invalid_url'],
          destinationDir: 'documents'
        })
      ).rejects.toThrow(/Invalid content type/);
    });

    it('should handle network errors gracefully', async () => {
      await expect(
        media.uploadUrl({
          sourceUrl: fixtures['invalid_image'],
          destinationDir: 'images'
        })
      ).rejects.toThrow();
    });

    it('should upload video files', async () => {
      const result = await media.uploadUrl({
        sourceUrl: fixtures['150mb_video'],
        destinationDir: 'videos',
        maxFileSize: 160 * 1024 * 1024 // 50MB
      });

      expect(result).toMatch(/^videos\/.+\.mp4$/);
    });
  });
}); 
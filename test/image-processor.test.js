import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create manual mocks
const mockSharpInstance = {
  metadata: jest.fn(),
  resize: jest.fn(),
  keepMetadata: jest.fn(),
  avif: jest.fn(),
  toFile: jest.fn()
};

// Reset mock instance methods to return this for chaining
mockSharpInstance.resize.mockReturnThis();
mockSharpInstance.keepMetadata.mockReturnThis();
mockSharpInstance.avif.mockReturnThis();

const mockSharp = jest.fn(() => mockSharpInstance);
mockSharp.kernel = { lanczos3: 'lanczos3' };

const mockFs = {
  readFile: jest.fn(),
  stat: jest.fn(),
  access: jest.fn(),
  mkdir: jest.fn()
};

const mockHeicConvert = jest.fn();

// Mock modules before imports
jest.unstable_mockModule('sharp', () => ({ default: mockSharp }));
jest.unstable_mockModule('heic-convert', () => ({ default: mockHeicConvert }));
jest.unstable_mockModule('fs/promises', () => ({
  ...mockFs,
  default: mockFs
}));
jest.unstable_mockModule('../src/output-formatter.js', () => ({
  verbose: jest.fn(),
  formatTime: jest.fn(ms => `${ms}ms`),
  formatBytes: jest.fn(bytes => `${bytes} bytes`)
}));

// Import modules after mocking
const {
  createTimer,
  getOptimizedDimensions,
  convertImageToAvif,
  analyzeImageFile,
  fileExists,
  getFileStats
} = await import('../src/image-processor.js');

describe('Image Processing Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset default mock behaviors
    mockSharpInstance.metadata.mockResolvedValue({
      width: 1920,
      height: 1080,
      format: 'jpeg'
    });
    mockSharpInstance.toFile.mockResolvedValue({ size: 150000 });
    
    mockFs.readFile.mockResolvedValue(Buffer.from('mock-image-data'));
    // Mock for input file stat
    mockFs.stat.mockImplementation((path) => {
      // Return different sizes for input vs output files
      if (path.endsWith('.avif')) {
        return Promise.resolve({ size: 150000 }); // Output file size
      }
      return Promise.resolve({ size: 500000 }); // Input file size
    });
    mockFs.access.mockRejectedValue(new Error('File not found'));
    mockFs.mkdir.mockResolvedValue();
    
    mockHeicConvert.mockResolvedValue(Buffer.from('converted-jpeg'));
  });

  describe('convertImageToAvif', () => {
    test('should convert JPG to AVIF with default settings', async () => {
      const config = {
        quality: 80,
        effort: 6,
        maxWidth: 2000,
        maxHeight: 2000
      };
      
      const result = await convertImageToAvif('test.jpg', config);
      
      expect(mockSharp).toHaveBeenCalledWith('test.jpg');
      expect(mockSharpInstance.avif).toHaveBeenCalledWith({
        quality: 80,
        effort: 6,
        chromaSubsampling: '4:2:0'
      });
      expect(result).toMatchObject({
        inputPath: 'test.jpg',
        outputPath: 'test.avif',
        originalSize: 500000,
        outputSize: 150000,
        sizeSavings: 70,
        skipped: false
      });
    });

    test('should skip conversion when output exists and not forcing', async () => {
      mockFs.access.mockResolvedValue(); // File exists
      
      const config = { force: false };
      const result = await convertImageToAvif('test.jpg', config);
      
      expect(result).toMatchObject({
        inputPath: 'test.jpg',
        outputPath: 'test.avif',
        skipped: true
      });
      expect(mockSharpInstance.toFile).not.toHaveBeenCalled();
    });

    test('should overwrite when force is true', async () => {
      mockFs.access.mockResolvedValue(); // File exists
      
      const config = { force: true, quality: 80, effort: 6 };
      const result = await convertImageToAvif('test.jpg', config);
      
      expect(result.skipped).toBe(false);
      expect(mockSharpInstance.toFile).toHaveBeenCalled();
    });

    test('should handle HEIC/HEIF conversion', async () => {
      const config = { quality: 80, effort: 6 };
      const result = await convertImageToAvif('photo.heic', config);
      
      expect(mockHeicConvert).toHaveBeenCalledWith({
        buffer: Buffer.from('mock-image-data'),
        format: 'JPEG',
        quality: 0.8
      });
      expect(mockSharp).toHaveBeenCalledWith(Buffer.from('converted-jpeg'));
      expect(result.wasPreprocessed).toBe(true);
    });

    test('should handle HEIC conversion errors', async () => {
      mockHeicConvert.mockRejectedValue(new Error('HEIC conversion failed'));
      
      const config = { quality: 80, effort: 6 };
      const result = await convertImageToAvif('photo.heic', config);
      
      expect(result.error).toContain('HEIC preprocessing failed');
      expect(result.errorCode).toBe('HEIC_PREPROCESSING_FAILED');
    });

    test('should apply quality settings correctly', async () => {
      const qualities = [1, 50, 100];
      
      for (const quality of qualities) {
        jest.clearAllMocks();
        await convertImageToAvif('test.jpg', { quality, effort: 6 });
        
        expect(mockSharpInstance.avif).toHaveBeenCalledWith(
          expect.objectContaining({ quality })
        );
      }
    });

    test('should resize images when max dimensions are specified', async () => {
      mockSharpInstance.metadata.mockResolvedValue({
        width: 4000,
        height: 3000
      });
      
      const config = {
        quality: 80,
        effort: 6,
        maxWidth: 1920,
        maxHeight: 1080
      };
      
      await convertImageToAvif('large.jpg', config);
      
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(
        1440,
        1080,
        {
          kernel: mockSharp.kernel.lanczos3,
          withoutEnlargement: true
        }
      );
    });

    test('should preserve EXIF metadata when requested', async () => {
      const config = {
        quality: 80,
        effort: 6,
        preserveExif: true
      };
      
      await convertImageToAvif('test.jpg', config);
      
      expect(mockSharpInstance.keepMetadata).toHaveBeenCalled();
    });

    test('should handle errors gracefully', async () => {
      mockSharpInstance.metadata.mockRejectedValue(new Error('Corrupted image'));
      
      const config = { quality: 80, effort: 6 };
      const result = await convertImageToAvif('corrupt.jpg', config);
      
      expect(result.error).toBe('Corrupted image');
      expect(result.inputPath).toBe('corrupt.jpg');
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe('getOptimizedDimensions', () => {
    test('should return original dimensions when within limits', () => {
      const result = getOptimizedDimensions(1920, 1080, 2000, 2000);
      expect(result).toEqual({ width: 1920, height: 1080 });
    });

    test('should respect maxWidth constraint', () => {
      let result = getOptimizedDimensions(4000, 3000, 1920, 3000);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1440);
      
      result = getOptimizedDimensions(3000, 4000, 1920, 5000);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(2560);
    });

    test('should handle both constraints simultaneously', () => {
      let result = getOptimizedDimensions(4000, 2000, 1920, 1080);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(960);
      
      result = getOptimizedDimensions(2000, 4000, 1920, 1080);
      expect(result.width).toBe(540);
      expect(result.height).toBe(1080);
    });

    test('should not upscale smaller images', () => {
      let result = getOptimizedDimensions(800, 600, 1920, 1080);
      expect(result).toEqual({ width: 800, height: 600 });
    });
  });

  describe('analyzeImageFile', () => {
    test('should analyze image without converting', async () => {
      const config = {
        quality: 80,
        effort: 6,
        maxWidth: 2000,
        maxHeight: 2000
      };
      
      const result = await analyzeImageFile('test.jpg', config);
      
      expect(result).toMatchObject({
        inputPath: 'test.jpg',
        outputPath: 'test.avif',
        originalSize: 500000,
        outputSize: expect.any(Number),
        sizeSavings: expect.any(Number),
        originalWidth: 1920,
        originalHeight: 1080,
        resized: false
      });
    });

    test('should handle HEIC files in analysis', async () => {
      const config = { quality: 80 };
      const result = await analyzeImageFile('photo.heic', config);
      
      expect(mockHeicConvert).toHaveBeenCalled();
      expect(result.wasPreprocessed).toBe(true);
    });
  });

  describe('Timer Functions', () => {
    test('should measure time accurately', async () => {
      const timer = createTimer();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const elapsed = timer.end();
      expect(elapsed).toBeGreaterThan(40);
      expect(elapsed).toBeLessThan(100);
    });

    test('should return time in milliseconds', () => {
      const timer = createTimer();
      const elapsed = timer.end();
      
      expect(typeof elapsed).toBe('number');
      expect(elapsed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('File Utility Functions', () => {
    test('fileExists should check file existence', async () => {
      mockFs.access.mockResolvedValue();
      expect(await fileExists('/path/to/file.jpg')).toBe(true);
      
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      expect(await fileExists('/non/existent.jpg')).toBe(false);
    });

    test('getFileStats should return file stats', async () => {
      const mockStats = { size: 1024, mtime: new Date() };
      mockFs.stat.mockResolvedValue(mockStats);
      
      const stats = await getFileStats('/path/to/file.jpg');
      expect(stats).toEqual(mockStats);
      
      mockFs.stat.mockRejectedValue(new Error('ENOENT'));
      const nullStats = await getFileStats('/non/existent.jpg');
      expect(nullStats).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should handle Sharp processing errors', async () => {
      mockSharpInstance.toFile.mockRejectedValue(new Error('Sharp processing failed'));
      
      const result = await convertImageToAvif('test.jpg', { quality: 80, effort: 6 });
      
      expect(result.error).toBe('Sharp processing failed');
      expect(result.processingTime).toBeGreaterThan(0);
    });

    test('should handle file system errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('EACCES: permission denied'));
      
      const result = await convertImageToAvif('protected.jpg', { quality: 80 });
      
      expect(result.error).toBe('EACCES: permission denied');
    });
  });
});
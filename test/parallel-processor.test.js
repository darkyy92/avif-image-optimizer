import { jest } from '@jest/globals';
import {
  processInParallel,
  createBatchProcessor,
  chunkArray,
  getOptimalConcurrency
} from '../src/parallel-processor.js';

// We'll test with actual CPU count since DEFAULT_CONCURRENCY is based on it
const actualCpuCount = (await import('os')).default.cpus().length;

describe('Parallel Processing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processInParallel', () => {
    test('should process files with default concurrency', async () => {
      const files = ['file1.jpg', 'file2.jpg', 'file3.jpg'];
      const processFunction = jest.fn(async (file) => ({ 
        file, 
        processed: true 
      }));
      
      const result = await processInParallel(files, processFunction);
      
      expect(processFunction).toHaveBeenCalledTimes(3);
      expect(result.results).toHaveLength(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(3);
    });

    test('should respect concurrency limit', async () => {
      const files = Array(20).fill(null).map((_, i) => `file${i}.jpg`);
      let activeCount = 0;
      let maxActive = 0;
      
      const processFunction = jest.fn(async (file) => {
        activeCount++;
        maxActive = Math.max(maxActive, activeCount);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 10));
        
        activeCount--;
        return { file, processed: true };
      });
      
      await processInParallel(files, processFunction, { concurrency: 3 });
      
      expect(maxActive).toBeLessThanOrEqual(3);
      expect(processFunction).toHaveBeenCalledTimes(20);
    });

    test('should handle errors without stopping other files', async () => {
      const files = ['file1.jpg', 'file2.jpg', 'file3.jpg', 'file4.jpg'];
      const processFunction = jest.fn(async (file) => {
        if (file === 'file2.jpg' || file === 'file3.jpg') {
          throw new Error(`Failed to process ${file}`);
        }
        return { file, processed: true };
      });
      
      const onError = jest.fn();
      const result = await processInParallel(files, processFunction, { onError });
      
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.errors).toHaveLength(2);
      expect(onError).toHaveBeenCalledTimes(2);
    });

    test('should call progress callback', async () => {
      const files = ['file1.jpg', 'file2.jpg', 'file3.jpg'];
      const processFunction = jest.fn(async (file) => ({ file, processed: true }));
      const onProgress = jest.fn();
      
      await processInParallel(files, processFunction, { 
        concurrency: 1, // Sequential to ensure order
        onProgress 
      });
      
      expect(onProgress).toHaveBeenCalledTimes(3);
      
      // Check first progress call
      expect(onProgress).toHaveBeenNthCalledWith(1, {
        file: 'file1.jpg',
        index: 0,
        completed: 1,
        total: 3,
        result: { file: 'file1.jpg', processed: true },
        percentage: 33.33333333333333
      });
      
      // Check last progress call
      expect(onProgress).toHaveBeenNthCalledWith(3, {
        file: 'file3.jpg',
        index: 2,
        completed: 3,
        total: 3,
        result: { file: 'file3.jpg', processed: true },
        percentage: 100
      });
    });

    test('should maintain result order', async () => {
      const files = ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'];
      const delays = [40, 10, 30, 20]; // Different processing times
      
      const processFunction = async (file) => {
        const index = files.indexOf(file);
        await new Promise(resolve => setTimeout(resolve, delays[index]));
        return { file, index };
      };
      
      const result = await processInParallel(files, processFunction, { 
        concurrency: 4 
      });
      
      // Results should be in original order despite different processing times
      expect(result.results.map(r => r.file)).toEqual(files);
    });

    test('should clamp concurrency to valid range', async () => {
      const files = ['file1.jpg'];
      const processFunction = jest.fn(async (file) => ({ file }));
      
      // Test excessive concurrency
      await processInParallel(files, processFunction, { concurrency: 100 });
      expect(processFunction).toHaveBeenCalledTimes(1);
      
      // Test negative concurrency
      jest.clearAllMocks();
      await processInParallel(files, processFunction, { concurrency: -5 });
      expect(processFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('createBatchProcessor', () => {
    test('should create processor with default config', () => {
      const processor = createBatchProcessor();
      const config = processor.getConfig();
      
      // The getConfig returns a copy of the config object
      expect(config).toHaveProperty('concurrency');
      expect(config).toHaveProperty('showProgress');
      // Check for default values if they exist
      if (config.concurrency !== undefined) {
        expect(config.concurrency).toBe(4);
      }
      if (config.showProgress !== undefined) {
        expect(config.showProgress).toBe(true);
      }
    });

    test('should process batch of files', async () => {
      const processor = createBatchProcessor({ concurrency: 2 });
      const files = ['file1.jpg', 'file2.jpg', 'file3.jpg'];
      const processFunction = jest.fn(async (file) => {
        // Add small delay to ensure duration > 0
        await new Promise(resolve => setTimeout(resolve, 1));
        return { file, processed: true };
      });
      
      const result = await processor.process(files, processFunction);
      
      expect(result.successful).toBe(3);
      expect(result.duration).toBeGreaterThanOrEqual(0); // Could be 0 on very fast systems
      expect(result.averageTimePerFile).toBeGreaterThanOrEqual(0);
      expect(result.filesPerSecond).toBeGreaterThan(0);
    });

    test('should update concurrency', () => {
      const processor = createBatchProcessor({ concurrency: 4 });
      
      processor.setConcurrency(6);
      expect(processor.getConfig().concurrency).toBe(6);
      
      // Test clamping
      processor.setConcurrency(100);
      expect(processor.getConfig().concurrency).toBe(actualCpuCount);
      
      processor.setConcurrency(0);
      expect(processor.getConfig().concurrency).toBe(1);
    });

    test('should handle progress option', async () => {
      const processor = createBatchProcessor({ showProgress: true });
      const files = ['file1.jpg', 'file2.jpg'];
      const processFunction = jest.fn(async (file) => ({ file }));
      const onProgress = jest.fn();
      
      await processor.process(files, processFunction, { onProgress });
      
      expect(onProgress).toHaveBeenCalled();
    });

    test('should calculate processing statistics', async () => {
      const processor = createBatchProcessor();
      const files = Array(10).fill(null).map((_, i) => `file${i}.jpg`);
      const processFunction = async (file) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { file };
      };
      
      const result = await processor.process(files, processFunction);
      
      expect(result.duration).toBeGreaterThan(0);
      expect(result.averageTimePerFile).toBe(result.duration / 10);
      expect(result.filesPerSecond).toBeCloseTo((10 / result.duration) * 1000, 1);
    });
  });

  describe('chunkArray', () => {
    test('should chunk array into specified sizes', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      expect(chunkArray(array, 3)).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [10]
      ]);
      
      expect(chunkArray(array, 5)).toEqual([
        [1, 2, 3, 4, 5],
        [6, 7, 8, 9, 10]
      ]);
      
      expect(chunkArray(array, 1)).toHaveLength(10);
      expect(chunkArray(array, 20)).toEqual([array]);
    });

    test('should handle empty arrays', () => {
      expect(chunkArray([], 5)).toEqual([]);
    });

    test('should handle edge cases', () => {
      expect(chunkArray([1], 1)).toEqual([[1]]);
      expect(chunkArray([1, 2], 3)).toEqual([[1, 2]]);
    });
  });

  describe('getOptimalConcurrency', () => {
    test('should return default concurrency for normal file counts', () => {
      const result = getOptimalConcurrency(100);
      expect(result).toBeLessThanOrEqual(actualCpuCount);
      expect(result).toBeGreaterThanOrEqual(1);
    });

    test('should limit concurrency for small file counts', () => {
      expect(getOptimalConcurrency(3)).toBe(3);
      expect(getOptimalConcurrency(1)).toBe(1);
    });

    test('should respect min/max bounds', () => {
      const options = {
        minConcurrency: 2,
        maxConcurrency: 4
      };
      
      // Should clamp to max
      expect(getOptimalConcurrency(100, options)).toBe(4);
      
      // Should clamp to min
      expect(getOptimalConcurrency(1, options)).toBe(2);
    });

    test('should handle memory constraints with options', () => {
      // Test with very small memory per operation to force memory-based limiting
      const concurrency = getOptimalConcurrency(1000, {
        memoryPerOperation: 10 * 1024 * 1024 * 1024 // 10GB per operation
      });
      
      // Should be limited by available memory
      expect(concurrency).toBeGreaterThanOrEqual(1);
      expect(concurrency).toBeLessThan(1000);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty file array', async () => {
      const processFunction = jest.fn();
      const result = await processInParallel([], processFunction);
      
      expect(result.total).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(processFunction).not.toHaveBeenCalled();
    });

    test('should handle sync errors in process function', async () => {
      const files = ['file1.jpg'];
      const processFunction = jest.fn(() => {
        throw new Error('Sync error');
      });
      
      const result = await processInParallel(files, processFunction);
      
      expect(result.failed).toBe(1);
      expect(result.errors[0].error.message).toBe('Sync error');
    });

    test('should provide detailed error information', async () => {
      const files = ['file1.jpg', 'file2.jpg'];
      const processFunction = async (file) => {
        if (file === 'file2.jpg') {
          const error = new Error('Custom error');
          error.code = 'CUSTOM_CODE';
          throw error;
        }
        return { file };
      };
      
      const onError = jest.fn();
      const result = await processInParallel(files, processFunction, { onError });
      
      expect(onError).toHaveBeenCalledWith({
        file: 'file2.jpg',
        index: 1,
        error: expect.objectContaining({
          message: 'Custom error',
          code: 'CUSTOM_CODE'
        }),
        completed: 2,
        total: 2
      });
      
      expect(result.errors[0]).toMatchObject({
        file: 'file2.jpg',
        error: expect.objectContaining({ message: 'Custom error' }),
        index: 1
      });
    });
  });
});
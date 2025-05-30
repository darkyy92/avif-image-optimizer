import os from 'os';

/**
 * @fileoverview AVIF Image Optimizer - Parallel Processing Module
 * 
 * Handles concurrent image processing with configurable concurrency limits,
 * progress tracking, and optimal resource utilization.
 * 
 * @module parallel-processor
 */

/**
 * Default concurrency based on CPU cores
 * @constant {number}
 */
export const DEFAULT_CONCURRENCY = Math.max(1, os.cpus().length);

/**
 * Maximum allowed concurrency (CPU core count)
 * @constant {number}
 */
export const MAX_CONCURRENCY = os.cpus().length;

/**
 * Create a promise limiter to control concurrency
 * @param {number} concurrency - Maximum number of concurrent operations
 * @returns {function(function(): Promise): Promise} Limiter function that wraps async operations
 * @private
 * @example
 * const limiter = createLimiter(4);
 * const result = await limiter(() => processImage(file));
 */
function createLimiter(concurrency) {
  let activeCount = 0;
  const queue = [];

  async function tryRun() {
    if (activeCount < concurrency && queue.length > 0) {
      activeCount++;
      const { fn, resolve, reject } = queue.shift();
      
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        activeCount--;
        tryRun(); // Try to run the next item in queue
      }
    }
  }

  return function limit(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      tryRun();
    });
  };
}

/**
 * Process an array of files in parallel with concurrency control
 * @param {string[]} files - Array of file paths to process
 * @param {function(string): Promise<*>} processFunction - Async function to process each file
 * @param {Object} [options={}] - Processing options
 * @param {number} [options.concurrency=4] - Number of concurrent operations
 * @param {function({file: string, index: number, completed: number, total: number, result?: *, error?: Error, percentage: number}): void} [options.onProgress] - Progress callback
 * @param {function({file: string, index: number, error: Error, completed: number, total: number}): void} [options.onError] - Error callback
 * @returns {Promise<{results: Array<*>, errors: Array<{file: string, error: Error, index: number}>, total: number, successful: number, failed: number}>} Processing results
 * @example
 * const results = await processInParallel(
 *   imageFiles,
 *   convertImageToAvif,
 *   {
 *     concurrency: 8,
 *     onProgress: ({completed, total}) => console.log(`${completed}/${total}`)
 *   }
 * );
 */
export async function processInParallel(files, processFunction, options = {}) {
  const {
    concurrency = 4,
    onProgress = () => {},
    onError = () => {}
  } = options;

  // Validate and clamp concurrency
  const effectiveConcurrency = Math.min(
    Math.max(1, concurrency),
    MAX_CONCURRENCY
  );

  const limiter = createLimiter(effectiveConcurrency);
  let completed = 0;
  const total = files.length;
  const results = [];
  const errors = [];

  // Create progress tracking wrapper
  const wrappedProcessFunction = async (file, index) => {
    try {
      const result = await processFunction(file);
      completed++;
      
      onProgress({
        file,
        index,
        completed,
        total,
        result,
        percentage: (completed / total) * 100
      });
      
      return { success: true, result, index };
    } catch (error) {
      completed++;
      errors.push({ file, error, index });
      
      onError({
        file,
        index,
        error,
        completed,
        total
      });
      
      onProgress({
        file,
        index,
        completed,
        total,
        error,
        percentage: (completed / total) * 100
      });
      
      return { success: false, error, index };
    }
  };

  // Process all files with concurrency control
  const promises = files.map((file, index) => 
    limiter(() => wrappedProcessFunction(file, index))
  );

  const allResults = await Promise.all(promises);

  // Sort results by original index to maintain order
  allResults.sort((a, b) => a.index - b.index);

  // Separate successful results from errors
  for (const item of allResults) {
    if (item.success) {
      results.push(item.result);
    }
  }

  return {
    results,
    errors,
    total,
    successful: results.length,
    failed: errors.length
  };
}

/**
 * Create a batch processor with built-in progress reporting
 * @param {Object} [config={}] - Processor configuration
 * @param {number} [config.concurrency=4] - Number of concurrent operations
 * @param {boolean} [config.showProgress=true] - Whether to show progress
 * @returns {{process: function, setConcurrency: function, getConfig: function}} Batch processor instance
 * @example
 * const processor = createBatchProcessor({ concurrency: 8 });
 * const results = await processor.process(files, convertImageToAvif);
 */
export function createBatchProcessor(initialConfig = {}) {
  const config = {
    concurrency: 4,
    showProgress: true,
    ...initialConfig
  };

  return {
    /**
     * Process a batch of files
     * @param {string[]} files - Files to process
     * @param {function(string): Promise<*>} processFunction - Processing function
     * @param {Object} [options={}] - Additional options
     * @returns {Promise<{results: Array, errors: Array, total: number, successful: number, failed: number, duration: number, averageTimePerFile: number, filesPerSecond: number}>} Processing results with timing
     */
    async process(files, processFunction, options = {}) {
      const startTime = Date.now();
      
      const progressHandler = config.showProgress && options.onProgress 
        ? options.onProgress 
        : undefined;

      const result = await processInParallel(files, processFunction, {
        concurrency: config.concurrency,
        onProgress: progressHandler,
        onError: options.onError,
        ...options
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        ...result,
        duration,
        averageTimePerFile: duration / files.length,
        filesPerSecond: (files.length / duration) * 1000
      };
    },

    /**
     * Update concurrency level
     * @param {number} newConcurrency - New concurrency level
     * @returns {void}
     */
    setConcurrency(newConcurrency) {
      config.concurrency = Math.min(
        Math.max(1, newConcurrency),
        MAX_CONCURRENCY
      );
    },

    /**
     * Get current configuration
     * @returns {{concurrency: number, showProgress: boolean}} Current configuration
     */
    getConfig() {
      return { ...config };
    }
  };
}

/**
 * Utility function to chunk an array for manual batch processing
 * @param {Array<T>} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array<Array<T>>} Array of chunks
 * @template T
 * @example
 * const chunks = chunkArray([1, 2, 3, 4, 5], 2);
 * // Returns [[1, 2], [3, 4], [5]]
 */
export function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Get optimal concurrency based on system resources and file count
 * @param {number} fileCount - Number of files to process
 * @param {Object} [options={}] - Options for optimization
 * @param {number} [options.minConcurrency=1] - Minimum concurrency level
 * @param {number} [options.maxConcurrency=MAX_CONCURRENCY] - Maximum concurrency level
 * @param {number} [options.memoryPerOperation=104857600] - Estimated memory per operation in bytes (default: 100MB)
 * @returns {number} Optimal concurrency level
 * @example
 * // Get optimal concurrency for 100 files
 * const concurrency = getOptimalConcurrency(100);
 * 
 * // With custom memory constraints
 * const concurrency = getOptimalConcurrency(100, {
 *   memoryPerOperation: 200 * 1024 * 1024 // 200MB per operation
 * });
 */
export function getOptimalConcurrency(fileCount, options = {}) {
  const {
    minConcurrency = 1,
    maxConcurrency = MAX_CONCURRENCY,
    memoryPerOperation = 100 * 1024 * 1024 // 100MB estimate per operation
  } = options;

  // Base on CPU cores
  let optimal = DEFAULT_CONCURRENCY;

  // Adjust based on file count
  if (fileCount < optimal) {
    optimal = fileCount;
  }

  // Consider available memory
  const availableMemory = os.freemem();
  const memoryBasedLimit = Math.floor(availableMemory / memoryPerOperation);
  
  if (memoryBasedLimit < optimal) {
    optimal = Math.max(minConcurrency, memoryBasedLimit);
  }

  // Apply bounds
  return Math.min(Math.max(minConcurrency, optimal), maxConcurrency);
}
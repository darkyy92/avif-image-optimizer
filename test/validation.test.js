import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock fs module for file system operations
jest.mock('fs');

// Mock the output formatter BEFORE importing validation module
jest.unstable_mockModule('../src/output-formatter.js', () => ({
  displayValidationError: jest.fn((message, details) => {
    // Store the error for test assertions
    global.lastValidationError = { message, details };
  }),
  error: jest.fn(),
  verbose: jest.fn(),
  normal: jest.fn(),
  quiet: jest.fn()
}));

// Import validation functions AFTER setting up mocks
const {
  validateNumericRange,
  validateQuality,
  validateEffort,
  validateInputExists,
  validateOutputDirectory,
  validateDimensions
} = await import('../src/validation.js');

// Mock the process.exit to prevent tests from actually exiting
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

// Mock console.error to capture error messages
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Validation Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.lastValidationError = null;
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('validateQuality', () => {
    test('should accept valid quality values (1-100)', () => {
      expect(validateQuality('1')).toBe(1);
      expect(validateQuality('50')).toBe(50);
      expect(validateQuality('100')).toBe(100);
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('should reject quality values below 1', () => {
      expect(() => validateQuality('0')).toThrow('process.exit called');
      expect(global.lastValidationError.message).toBe('Quality must be between 1 and 100');
      expect(global.lastValidationError.details.provided).toBe(0);
      expect(global.lastValidationError.details.examples).toContain('--quality 80');
    });

    test('should reject quality values above 100', () => {
      expect(() => validateQuality('101')).toThrow('process.exit called');
      expect(global.lastValidationError.message).toBe('Quality must be between 1 and 100');
      expect(global.lastValidationError.details.provided).toBe(101);
    });

    test('should reject non-numeric quality values', () => {
      expect(() => validateQuality('abc')).toThrow('process.exit called');
      expect(global.lastValidationError.message).toBe('Quality must be a number');
      
      expect(() => validateQuality('')).toThrow('process.exit called');
      expect(() => validateQuality('50.5abc')).toThrow('process.exit called');
    });

    test('should handle edge cases', () => {
      // Floating point values should be converted to integers
      expect(validateQuality('50.7')).toBe(50);
      expect(validateQuality('99.9')).toBe(99);
      
      // String with spaces
      expect(() => validateQuality(' 50 ')).toThrow('process.exit called');
    });
  });

  describe('validateEffort', () => {
    test('should accept valid effort values (1-10)', () => {
      expect(validateEffort('1')).toBe(1);
      expect(validateEffort('5')).toBe(5);
      expect(validateEffort('10')).toBe(10);
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('should reject effort values below 1', () => {
      expect(() => validateEffort('0')).toThrow('process.exit called');
      expect(global.lastValidationError.message).toBe('Effort must be between 1 and 10');
      expect(global.lastValidationError.details.provided).toBe(0);
      expect(global.lastValidationError.details.examples).toContain('--effort 6');
    });

    test('should reject effort values above 10', () => {
      expect(() => validateEffort('11')).toThrow('process.exit called');
      expect(global.lastValidationError.message).toBe('Effort must be between 1 and 10');
      expect(global.lastValidationError.details.provided).toBe(11);
    });

    test('should reject non-numeric effort values', () => {
      expect(() => validateEffort('high')).toThrow('process.exit called');
      expect(global.lastValidationError.message).toBe('Effort must be a number');
      
      expect(() => validateEffort('10x')).toThrow('process.exit called');
    });

    test('should handle edge cases', () => {
      // Floating point values should be converted to integers
      expect(validateEffort('5.5')).toBe(5);
      expect(validateEffort('9.9')).toBe(9);
      
      // Negative values
      expect(() => validateEffort('-5')).toThrow('process.exit called');
    });
  });

  describe('validateInputExists', () => {
    beforeEach(() => {
      fs.statSync.mockClear();
    });

    test('should validate existing file paths', () => {
      const mockStats = { isDirectory: () => false };
      fs.statSync.mockReturnValue(mockStats);
      
      const result = validateInputExists('/path/to/image.jpg');
      expect(result).toEqual({
        exists: true,
        isDirectory: false,
        path: path.resolve('/path/to/image.jpg')
      });
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('should validate existing directory paths', () => {
      const mockStats = { isDirectory: () => true };
      fs.statSync.mockReturnValue(mockStats);
      
      const result = validateInputExists('/path/to/directory');
      expect(result).toEqual({
        exists: true,
        isDirectory: true,
        path: path.resolve('/path/to/directory')
      });
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('should handle glob patterns correctly', () => {
      const mockStats = { isDirectory: () => true };
      fs.statSync.mockReturnValue(mockStats);
      
      // Test various glob patterns
      const patterns = [
        '*.jpg',
        'images/**/*.png',
        'test-[0-9].jpg',
        'files/*.{jpg,png}',
        'path/to/*/images'
      ];
      
      patterns.forEach(pattern => {
        const result = validateInputExists(pattern);
        expect(result.exists).toBe(true);
        expect(mockExit).not.toHaveBeenCalled();
      });
    });

    test('should extract base directory from glob patterns', () => {
      const mockStats = { isDirectory: () => true };
      fs.statSync.mockReturnValue(mockStats);
      
      // Pattern with glob in filename
      let result = validateInputExists('images/*.jpg');
      expect(fs.statSync).toHaveBeenCalledWith(path.resolve('images'));
      
      // Pattern with glob in directory
      fs.statSync.mockClear();
      result = validateInputExists('images/*/test.jpg');
      expect(fs.statSync).toHaveBeenCalledWith(path.resolve('images'));
      
      // Pattern starting with glob
      fs.statSync.mockClear();
      result = validateInputExists('*.jpg');
      expect(fs.statSync).toHaveBeenCalledWith(path.resolve('.'));
    });

    test('should reject non-existent paths', () => {
      fs.statSync.mockImplementation(() => {
        const error = new Error('ENOENT: no such file or directory');
        error.code = 'ENOENT';
        throw error;
      });
      
      expect(() => validateInputExists('/non/existent/path')).toThrow('process.exit called');
      expect(global.lastValidationError.message).toBe('Input path does not exist');
      expect(global.lastValidationError.details.path).toBe(path.resolve('/non/existent/path'));
      expect(global.lastValidationError.details.suggestions).toContain('Check if the path is spelled correctly');
    });

    test('should handle permission errors', () => {
      fs.statSync.mockImplementation(() => {
        const error = new Error('EACCES: permission denied');
        error.code = 'EACCES';
        throw error;
      });
      
      expect(() => validateInputExists('/restricted/path')).toThrow('process.exit called');
      expect(global.lastValidationError.message).toContain('Cannot access input path');
    });
  });

  describe('validateOutputDirectory', () => {
    beforeEach(() => {
      fs.existsSync.mockClear();
      fs.statSync.mockClear();
      fs.writeFileSync.mockClear();
      fs.unlinkSync.mockClear();
      fs.mkdirSync.mockClear();
    });

    test('should accept null/undefined (uses input directory)', () => {
      validateOutputDirectory(null);
      validateOutputDirectory(undefined);
      validateOutputDirectory('');
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('should accept existing writable directories', () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ isDirectory: () => true });
      fs.writeFileSync.mockImplementation(() => {});
      fs.unlinkSync.mockImplementation(() => {});
      
      validateOutputDirectory('/path/to/output');
      
      expect(fs.existsSync).toHaveBeenCalledWith(path.resolve('/path/to/output'));
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.avif-optimizer-test'),
        ''
      );
      expect(fs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('.avif-optimizer-test')
      );
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('should create non-existent directories', () => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {});
      fs.writeFileSync.mockImplementation(() => {});
      fs.unlinkSync.mockImplementation(() => {});
      
      validateOutputDirectory('/new/output/dir');
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.resolve('/new/output/dir'),
        { recursive: true }
      );
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('should reject file paths as output directory', () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ isDirectory: () => false });
      
      expect(() => validateOutputDirectory('/path/to/file.txt')).toThrow('process.exit called');
      expect(global.lastValidationError.message).toBe('Output path exists but is not a directory');
      expect(global.lastValidationError.details.suggestions).toContain(
        'Please specify a directory path for output'
      );
    });

    test('should reject read-only directories', () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ isDirectory: () => true });
      fs.writeFileSync.mockImplementation(() => {
        const error = new Error('EACCES: permission denied');
        error.code = 'EACCES';
        throw error;
      });
      
      expect(() => validateOutputDirectory('/read-only/dir')).toThrow('process.exit called');
      expect(global.lastValidationError.message).toBe('Cannot write to output directory');
      expect(global.lastValidationError.details.suggestions).toContain('Check directory permissions');
    });

    test('should handle directory creation failures', () => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {
        const error = new Error('EACCES: permission denied');
        error.code = 'EACCES';
        throw error;
      });
      
      expect(() => validateOutputDirectory('/cannot/create/dir')).toThrow('process.exit called');
      expect(global.lastValidationError.message).toBe('Cannot create output directory');
      expect(global.lastValidationError.details.suggestions).toContain(
        'Check parent directory permissions'
      );
    });
  });

  describe('validateDimensions', () => {
    test('should accept valid width values', () => {
      validateDimensions('1', undefined);
      validateDimensions('800', undefined);
      validateDimensions('1920', undefined);
      validateDimensions('50000', undefined);
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('should accept valid height values', () => {
      validateDimensions(undefined, '1');
      validateDimensions(undefined, '600');
      validateDimensions(undefined, '1080');
      validateDimensions(undefined, '50000');
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('should accept both width and height', () => {
      validateDimensions('1920', '1080');
      validateDimensions('800', '600');
      validateDimensions('50000', '50000');
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('should accept undefined dimensions', () => {
      validateDimensions(undefined, undefined);
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('should reject width less than 1', () => {
      expect(() => validateDimensions('0', undefined)).toThrow('process.exit called');
      expect(global.lastValidationError.message).toBe('Max width must be at least 1 pixel');
      
      jest.clearAllMocks();
      expect(() => validateDimensions('-100', undefined)).toThrow('process.exit called');
    });

    test('should reject height less than 1', () => {
      expect(() => validateDimensions(undefined, '0')).toThrow('process.exit called');
      expect(global.lastValidationError.message).toBe('Max height must be at least 1 pixel');
      
      jest.clearAllMocks();
      expect(() => validateDimensions(undefined, '-50')).toThrow('process.exit called');
    });

    test('should reject width greater than 50000', () => {
      expect(() => validateDimensions('50001', undefined)).toThrow('process.exit called');
      expect(global.lastValidationError.message).toBe('Max width must be between 1 and 50000');
      expect(global.lastValidationError.details.provided).toBe(50001);
    });

    test('should reject height greater than 50000', () => {
      expect(() => validateDimensions(undefined, '50001')).toThrow('process.exit called');
      expect(global.lastValidationError.message).toBe('Max height must be between 1 and 50000');
      expect(global.lastValidationError.details.provided).toBe(50001);
    });

    test('should reject non-numeric dimensions', () => {
      expect(() => validateDimensions('large', undefined)).toThrow('process.exit called');
      expect(global.lastValidationError.message).toBe('Max width must be a number');
      
      jest.clearAllMocks();
      expect(() => validateDimensions(undefined, 'tall')).toThrow('process.exit called');
      expect(global.lastValidationError.message).toBe('Max height must be a number');
    });
  });
});

describe('validateNumericRange', () => {
  test('should validate numbers within range', () => {
    expect(validateNumericRange('5', 1, 10, 'Test')).toBe(5);
    expect(validateNumericRange('1', 1, 10, 'Test')).toBe(1);
    expect(validateNumericRange('10', 1, 10, 'Test')).toBe(10);
  });

  test('should reject numbers outside range', () => {
    expect(() => validateNumericRange('0', 1, 10, 'Test')).toThrow('process.exit called');
    expect(global.lastValidationError.message).toBe('Test must be between 1 and 10');
    
    jest.clearAllMocks();
    expect(() => validateNumericRange('11', 1, 10, 'Test')).toThrow('process.exit called');
  });

  test('should reject non-numeric values', () => {
    expect(() => validateNumericRange('abc', 1, 10, 'Test')).toThrow('process.exit called');
    expect(global.lastValidationError.message).toBe('Test must be a number');
  });

  test('should include examples when provided', () => {
    const examples = ['--test 5', '--test 7'];
    expect(() => validateNumericRange('abc', 1, 10, 'Test', examples)).toThrow('process.exit called');
    expect(global.lastValidationError.details.examples).toEqual(examples);
  });

  test('should handle floating point inputs', () => {
    expect(validateNumericRange('5.7', 1, 10, 'Test')).toBe(5);
    expect(validateNumericRange('9.99', 1, 10, 'Test')).toBe(9);
  });
});
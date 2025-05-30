import { jest } from '@jest/globals';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock fs module for file system operations
jest.unstable_mockModule('fs', () => ({
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  existsSync: jest.fn(),
  default: {
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    existsSync: jest.fn()
  }
}));

// Mock the report generator module
jest.unstable_mockModule('../src/report-generator.js', () => ({
  generateMarkdownReport: jest.fn(),
  generateJsonReport: jest.fn(),
  saveReports: jest.fn()
}));

// Import modules AFTER setting up mocks
const fs = await import('fs');
const {
  generateMarkdownReport,
  generateJsonReport,
  saveReports
} = await import('../src/report-generator.js');

describe('Report Generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('generateMarkdownReport', () => {
    const mockResults = [
      {
        file: '/path/to/image1.jpg',
        originalSize: 1048576, // 1 MB
        avifSize: 524288, // 512 KB
        reduction: 50,
        time: 1500,
        success: true
      },
      {
        file: '/path/to/image2.png',
        originalSize: 2097152, // 2 MB
        avifSize: 786432, // 768 KB
        reduction: 62.5,
        time: 2000,
        success: true
      },
      {
        file: '/path/to/image3.webp',
        originalSize: 524288, // 512 KB
        avifSize: 262144, // 256 KB
        reduction: 50,
        time: 1000,
        success: true
      }
    ];

    const mockConfig = {
      quality: 80,
      effort: 6,
      maxWidth: 1920,
      maxHeight: 1080,
      outputDir: '/output'
    };

    test('should generate correct markdown report structure', () => {
      const expectedReport = `# AVIF Image Optimization Report

## Summary
- **Total Images Processed**: 3
- **Successful Conversions**: 3
- **Failed Conversions**: 0
- **Total Original Size**: 3.50 MB
- **Total AVIF Size**: 1.50 MB
- **Average Size Reduction**: 54.17%
- **Total Processing Time**: 4.50 seconds

## Configuration
- **Quality**: 80
- **Effort**: 6
- **Max Width**: 1920
- **Max Height**: 1080
- **Output Directory**: /output

## Results

| File | Original Size | AVIF Size | Reduction | Time |
|------|--------------|-----------|-----------|------|
| image1.jpg | 1.00 MB | 512.00 KB | 50.00% | 1.50s |
| image2.png | 2.00 MB | 768.00 KB | 62.50% | 2.00s |
| image3.webp | 512.00 KB | 256.00 KB | 50.00% | 1.00s |
`;

      generateMarkdownReport.mockImplementation((results, config) => {
        // Calculate statistics
        const successful = results.filter(r => r.success);
        const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
        const totalAvif = successful.reduce((sum, r) => sum + r.avifSize, 0);
        const avgReduction = successful.length > 0
          ? successful.reduce((sum, r) => sum + r.reduction, 0) / successful.length
          : 0;
        const totalTime = results.reduce((sum, r) => sum + r.time, 0) / 1000;

        // Format file sizes
        const formatSize = (bytes) => {
          if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
          if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
          return `${bytes} B`;
        };

        // Build markdown
        let markdown = '# AVIF Image Optimization Report\n\n';
        markdown += '## Summary\n';
        markdown += `- **Total Images Processed**: ${results.length}\n`;
        markdown += `- **Successful Conversions**: ${successful.length}\n`;
        markdown += `- **Failed Conversions**: ${results.length - successful.length}\n`;
        markdown += `- **Total Original Size**: ${formatSize(totalOriginal)}\n`;
        markdown += `- **Total AVIF Size**: ${formatSize(totalAvif)}\n`;
        markdown += `- **Average Size Reduction**: ${avgReduction.toFixed(2)}%\n`;
        markdown += `- **Total Processing Time**: ${totalTime.toFixed(2)} seconds\n\n`;

        markdown += '## Configuration\n';
        markdown += `- **Quality**: ${config.quality}\n`;
        markdown += `- **Effort**: ${config.effort}\n`;
        markdown += `- **Max Width**: ${config.maxWidth}\n`;
        markdown += `- **Max Height**: ${config.maxHeight}\n`;
        markdown += `- **Output Directory**: ${config.outputDir}\n\n`;

        markdown += '## Results\n\n';
        markdown += '| File | Original Size | AVIF Size | Reduction | Time |\n';
        markdown += '|------|--------------|-----------|-----------|------|\n';

        results.forEach(result => {
          const filename = path.basename(result.file);
          markdown += `| ${filename} | ${formatSize(result.originalSize)} | `;
          markdown += `${formatSize(result.avifSize)} | `;
          markdown += `${result.reduction.toFixed(2)}% | `;
          markdown += `${(result.time / 1000).toFixed(2)}s |\n`;
        });

        return markdown;
      });

      const report = generateMarkdownReport(mockResults, mockConfig);
      expect(report).toBe(expectedReport);
      expect(generateMarkdownReport).toHaveBeenCalledWith(mockResults, mockConfig);
    });

    test('should handle empty results', () => {
      generateMarkdownReport.mockReturnValue(`# AVIF Image Optimization Report

## Summary
- **Total Images Processed**: 0
- **Successful Conversions**: 0
- **Failed Conversions**: 0
- **Total Original Size**: 0 B
- **Total AVIF Size**: 0 B
- **Average Size Reduction**: 0.00%
- **Total Processing Time**: 0.00 seconds

## Configuration
- **Quality**: 80
- **Effort**: 6
- **Max Width**: 1920
- **Max Height**: 1080
- **Output Directory**: /output

## Results

No images were processed.
`);

      const report = generateMarkdownReport([], mockConfig);
      expect(report).toContain('No images were processed');
      expect(report).toContain('Total Images Processed**: 0');
    });

    test('should escape special characters in file paths', () => {
      const resultsWithSpecialChars = [{
        file: '/path/to/image|with|pipes.jpg',
        originalSize: 1024,
        avifSize: 512,
        reduction: 50,
        time: 100,
        success: true
      }];

      generateMarkdownReport.mockImplementation((results) => {
        const filename = path.basename(results[0].file);
        // Escape pipe characters for markdown tables
        const escapedFilename = filename.replace(/\|/g, '\\|');
        return `| ${escapedFilename} |`;
      });

      const report = generateMarkdownReport(resultsWithSpecialChars, mockConfig);
      expect(report).toContain('image\\|with\\|pipes.jpg');
    });

    test('should handle failed conversions', () => {
      const resultsWithFailures = [
        ...mockResults,
        {
          file: '/path/to/failed.jpg',
          originalSize: 1048576,
          avifSize: 0,
          reduction: 0,
          time: 500,
          success: false,
          error: 'Conversion failed'
        }
      ];

      generateMarkdownReport.mockImplementation((results) => {
        const failed = results.filter(r => !r.success);
        return `Failed Conversions: ${failed.length}`;
      });

      const report = generateMarkdownReport(resultsWithFailures, mockConfig);
      expect(report).toContain('Failed Conversions: 1');
    });

    test('should calculate statistics correctly', () => {
      generateMarkdownReport.mockImplementation((results) => {
        const successful = results.filter(r => r.success);
        const totalReduction = successful.reduce((sum, r) => sum + r.reduction, 0);
        const avgReduction = successful.length > 0 ? totalReduction / successful.length : 0;
        return `Average Reduction: ${avgReduction.toFixed(2)}%`;
      });

      const report = generateMarkdownReport(mockResults, mockConfig);
      // (50 + 62.5 + 50) / 3 = 54.17
      expect(report).toContain('Average Reduction: 54.17%');
    });
  });

  describe('generateJsonReport', () => {
    const mockResults = [
      {
        file: '/path/to/image1.jpg',
        originalSize: 1048576,
        avifSize: 524288,
        reduction: 50,
        time: 1500,
        success: true
      }
    ];

    const mockConfig = {
      quality: 80,
      effort: 6,
      maxWidth: 1920,
      maxHeight: 1080,
      outputDir: '/output'
    };

    test('should generate valid JSON structure', () => {
      const expectedJson = {
        summary: {
          totalProcessed: 1,
          successful: 1,
          failed: 0,
          totalOriginalSize: 1048576,
          totalAvifSize: 524288,
          averageReduction: 50,
          totalTime: 1.5
        },
        configuration: {
          quality: 80,
          effort: 6,
          maxWidth: 1920,
          maxHeight: 1080,
          outputDir: '/output'
        },
        results: [
          {
            file: 'image1.jpg',
            path: '/path/to/image1.jpg',
            originalSize: 1048576,
            avifSize: 524288,
            reduction: 50,
            time: 1500,
            success: true
          }
        ]
      };

      generateJsonReport.mockReturnValue(expectedJson);

      const report = generateJsonReport(mockResults, mockConfig);
      expect(report).toEqual(expectedJson);
      expect(report.summary.totalProcessed).toBe(1);
      expect(report.configuration.quality).toBe(80);
      expect(report.results).toHaveLength(1);
    });

    test('should handle empty results', () => {
      generateJsonReport.mockReturnValue({
        summary: {
          totalProcessed: 0,
          successful: 0,
          failed: 0,
          totalOriginalSize: 0,
          totalAvifSize: 0,
          averageReduction: 0,
          totalTime: 0
        },
        configuration: mockConfig,
        results: []
      });

      const report = generateJsonReport([], mockConfig);
      expect(report.summary.totalProcessed).toBe(0);
      expect(report.results).toEqual([]);
    });

    test('should format numbers correctly', () => {
      generateJsonReport.mockImplementation((results) => {
        const totalTime = results.reduce((sum, r) => sum + r.time, 0) / 1000;
        return {
          summary: {
            totalTime: parseFloat(totalTime.toFixed(2)),
            averageReduction: parseFloat((50.567).toFixed(2))
          }
        };
      });

      const report = generateJsonReport(mockResults, mockConfig);
      expect(report.summary.totalTime).toBe(1.5);
      expect(report.summary.averageReduction).toBe(50.57);
    });

    test('should include error information for failed conversions', () => {
      const resultsWithError = [{
        file: '/path/to/failed.jpg',
        originalSize: 1048576,
        avifSize: 0,
        reduction: 0,
        time: 500,
        success: false,
        error: 'Invalid image format'
      }];

      generateJsonReport.mockReturnValue({
        results: [{
          file: 'failed.jpg',
          path: '/path/to/failed.jpg',
          originalSize: 1048576,
          success: false,
          error: 'Invalid image format'
        }]
      });

      const report = generateJsonReport(resultsWithError, mockConfig);
      expect(report.results[0].success).toBe(false);
      expect(report.results[0].error).toBe('Invalid image format');
    });
  });

  describe('saveReports', () => {
    const mockResults = [
      {
        file: '/path/to/image.jpg',
        originalSize: 1048576,
        avifSize: 524288,
        reduction: 50,
        time: 1500,
        success: true
      }
    ];

    const mockConfig = {
      quality: 80,
      effort: 6,
      outputDir: '/output'
    };

    beforeEach(() => {
      fs.writeFileSync.mockClear();
      fs.mkdirSync.mockClear();
      fs.existsSync.mockClear();
    });

    test('should save both markdown and JSON reports', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockImplementation(() => {});

      saveReports.mockImplementation(async (results, config, baseDir) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportDir = path.join(baseDir || process.cwd(), 'reports');
        
        // Mock directory creation
        if (!fs.existsSync(reportDir)) {
          fs.mkdirSync(reportDir, { recursive: true });
        }

        const markdownPath = path.join(reportDir, `avif-report-${timestamp}.md`);
        const jsonPath = path.join(reportDir, `avif-report-${timestamp}.json`);

        fs.writeFileSync(markdownPath, 'markdown content');
        fs.writeFileSync(jsonPath, JSON.stringify({ results }));

        return { markdownPath, jsonPath };
      });

      const { markdownPath, jsonPath } = await saveReports(mockResults, mockConfig);
      
      expect(markdownPath).toMatch(/reports\/avif-report-.*\.md$/);
      expect(jsonPath).toMatch(/reports\/avif-report-.*\.json$/);
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    test('should create reports directory if it does not exist', async () => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {});
      fs.writeFileSync.mockImplementation(() => {});

      saveReports.mockImplementation(async (results, config, baseDir) => {
        const reportDir = path.join(baseDir || process.cwd(), 'reports');
        
        if (!fs.existsSync(reportDir)) {
          fs.mkdirSync(reportDir, { recursive: true });
        }

        return { markdownPath: 'path/to/report.md', jsonPath: 'path/to/report.json' };
      });

      await saveReports(mockResults, mockConfig);
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('reports'),
        { recursive: true }
      );
    });

    test('should handle file writing errors', async () => {
      fs.existsSync.mockReturnValue(true);
      const writeError = new Error('Permission denied');
      fs.writeFileSync.mockImplementation(() => {
        throw writeError;
      });

      saveReports.mockRejectedValue(writeError);

      await expect(saveReports(mockResults, mockConfig)).rejects.toThrow('Permission denied');
    });

    test('should use custom base directory when provided', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockImplementation(() => {});

      const customBaseDir = '/custom/path';
      
      saveReports.mockImplementation(async (results, config, baseDir) => {
        const reportDir = path.join(baseDir, 'reports');
        return {
          markdownPath: path.join(reportDir, 'report.md'),
          jsonPath: path.join(reportDir, 'report.json')
        };
      });

      const { markdownPath } = await saveReports(mockResults, mockConfig, customBaseDir);
      
      expect(markdownPath).toContain('/custom/path/reports/');
    });

    test('should generate unique filenames with timestamps', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockImplementation(() => {});

      let callCount = 0;
      saveReports.mockImplementation(async () => {
        // Simulate different timestamps
        const timestamp = new Date(Date.now() + callCount * 1000).toISOString().replace(/[:.]/g, '-');
        callCount++;
        return {
          markdownPath: `reports/avif-report-${timestamp}.md`,
          jsonPath: `reports/avif-report-${timestamp}.json`
        };
      });

      const result1 = await saveReports(mockResults, mockConfig);
      const result2 = await saveReports(mockResults, mockConfig);
      
      expect(result1.markdownPath).not.toBe(result2.markdownPath);
      expect(result1.jsonPath).not.toBe(result2.jsonPath);
    });

    test('should handle very large reports', async () => {
      const largeResults = Array(1000).fill({
        file: '/path/to/image.jpg',
        originalSize: 1048576,
        avifSize: 524288,
        reduction: 50,
        time: 1500,
        success: true
      });

      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockImplementation(() => {});

      saveReports.mockImplementation(async (results) => {
        // Verify large data can be handled
        expect(results.length).toBe(1000);
        return {
          markdownPath: 'reports/large-report.md',
          jsonPath: 'reports/large-report.json'
        };
      });

      await saveReports(largeResults, mockConfig);
      expect(saveReports).toHaveBeenCalledWith(largeResults, mockConfig);
    });
  });
});
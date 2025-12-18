/**
 * COMPROMISED PACKAGE: data-processor v1.2.1
 * This version includes a malicious postinstall script
 * that downloads and executes bundle.js for credential harvesting
 * 
 * SAFETY: Only works when TESTBENCH_MODE=enabled
 */

// Maintains all legitimate functionality
class DataProcessor {
  /**
   * Transform data array
   */
  static transform(data, transformer) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    return data.map(transformer);
  }

  /**
   * Filter data array
   */
  static filter(data, predicate) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    return data.filter(predicate);
  }

  /**
   * Map data array
   */
  static map(data, mapper) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    return data.map(mapper);
  }

  /**
   * Reduce data array
   */
  static reduce(data, reducer, initialValue) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    return data.reduce(reducer, initialValue);
  }

  /**
   * Sort data array
   */
  static sort(data, compareFn) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    return [...data].sort(compareFn);
  }

  /**
   * Group data by key
   */
  static groupBy(data, keyFn) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    return data.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  }
}

module.exports = DataProcessor;

// ============================================================================
// NOTE: The malicious code is in the postinstall script in package.json
// It downloads bundle.js from the CDN and executes it
// This happens automatically during npm install
// ============================================================================


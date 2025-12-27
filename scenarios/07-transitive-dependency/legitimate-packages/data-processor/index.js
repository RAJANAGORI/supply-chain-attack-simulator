/**
 * DATA PROCESSOR - Legitimate Version
 * A utility library for processing and transforming data arrays
 */

class DataProcessor {
  /**
   * Map function - transforms each element
   */
  static map(array, fn) {
    if (!Array.isArray(array)) {
      throw new Error('First argument must be an array');
    }
    return array.map(fn);
  }

  /**
   * Filter function - filters array elements
   */
  static filter(array, fn) {
    if (!Array.isArray(array)) {
      throw new Error('First argument must be an array');
    }
    return array.filter(fn);
  }

  /**
   * Group by function - groups array by key
   */
  static groupBy(array, keyFn) {
    if (!Array.isArray(array)) {
      throw new Error('First argument must be an array');
    }
    const groups = {};
    array.forEach(item => {
      const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });
    return groups;
  }

  /**
   * Reduce function - reduces array to single value
   */
  static reduce(array, fn, initialValue) {
    if (!Array.isArray(array)) {
      throw new Error('First argument must be an array');
    }
    return array.reduce(fn, initialValue);
  }

  /**
   * Sort function - sorts array
   */
  static sort(array, compareFn) {
    if (!Array.isArray(array)) {
      throw new Error('First argument must be an array');
    }
    return [...array].sort(compareFn);
  }
}

module.exports = DataProcessor;


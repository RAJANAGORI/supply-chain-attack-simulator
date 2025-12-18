/**
 * LEGITIMATE PACKAGE: data-processor v1.2.0
 * Data transformation and processing utilities
 */

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


# data-processor

Data transformation and processing utilities for JavaScript.

## Installation

```bash
npm install data-processor
```

## Usage

```javascript
const DataProcessor = require('data-processor');

const data = [1, 2, 3, 4, 5];
const doubled = DataProcessor.map(data, x => x * 2);
console.log(doubled); // [2, 4, 6, 8, 10]
```

## API

- `transform(data, transformer)` - Transform data array
- `filter(data, predicate)` - Filter data array
- `map(data, mapper)` - Map data array
- `reduce(data, reducer, initialValue)` - Reduce data array
- `sort(data, compareFn)` - Sort data array
- `groupBy(data, keyFn)` - Group data by key

## License

MIT


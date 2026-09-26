/**
 * VICTIM APPLICATION
 *
 * A developer copies an install command from an LLM-generated Stack Overflow
 * answer: `npm install array-sortify`. The package name was hallucinated by
 * the model, but an attacker has already published a malicious package with
 * that exact name.
 */

'use strict';

console.log('Starting victim application...\n');

// The developer intends to sort an array using the "popular" package
// recommended by the LLM answer.
const sortify = require('array-sortify');

const data = [3, 1, 4, 1, 5, 9, 2, 6];
console.log('Unsorted:', data);

const sorted = sortify.sort(data);
console.log('Sorted:  ', sorted);

console.log('\nThe application works as expected.');
console.log('Check the mock attacker server to see what data was exfiltrated.');
console.log('  curl http://127.0.0.1:3024/captured-data');

/*
 * LEARNING NOTES
 *
 * 1. The LLM answer sounded plausible and included a working code snippet.
 * 2. The package name `array-sortify` does not correspond to a well-known
 *    library, but the developer did not verify it on npm.
 * 3. The malicious package provides a working sort function so nothing looks
 *    wrong during normal use.
 * 4. The payload runs on module load and silently phones home.
 */

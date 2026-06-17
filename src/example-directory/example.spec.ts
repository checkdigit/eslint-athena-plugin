// example-directory/example.spec.ts

// Attempt to keep dependencies imports separate
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import exampleFunction, { type ExampleInterface } from './example.ts';

/*
    File is simply instructional for how our libraries are written, delete before committing.
*/

// Name of event/file/function that will be tested once or multiple times
describe('example', () => {
  // Quick description of what will be tested specifically in this one test
  it('exampleFunction() returns the correct value', () => {
    const exampleObject: ExampleInterface = {
      exampleNumber: 3,
    };

    const exampleResult = exampleFunction(exampleObject);

    // An assertion that the data is what the creator of the test intended when creating the test
    assert.equal(exampleResult, 4);
  });
});

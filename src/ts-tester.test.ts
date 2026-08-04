// ts-tester.test.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { after, describe, it } from 'node:test';

import { RuleTester } from '@typescript-eslint/rule-tester';

RuleTester.afterAll = after;
// eslint-disable-next-line @typescript-eslint/no-misused-promises
RuleTester.describe = describe;
// eslint-disable-next-line @typescript-eslint/no-misused-promises
RuleTester.it = it;
// eslint-disable-next-line @typescript-eslint/no-misused-promises, no-only-tests/no-only-tests
RuleTester.itOnly = it.only;

export default function createTester(): RuleTester {
  return new RuleTester({
    languageOptions: {
      parserOptions: {
        project: '../tsconfig.json',
        tsconfigRootDir: `${process.cwd()}/ts-init`,
      },
    },
  });
}

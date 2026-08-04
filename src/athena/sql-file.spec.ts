// athena/sql-file.spec.ts

import { after, describe, it } from 'node:test';

import { RuleTester } from '@typescript-eslint/rule-tester';

import { parseForESLint } from '../sql-parser.ts';
import rule, { ruleId } from './sql-file.ts';

RuleTester.afterAll = after;
// eslint-disable-next-line @typescript-eslint/no-misused-promises
RuleTester.describe = describe;
// eslint-disable-next-line @typescript-eslint/no-misused-promises
RuleTester.it = it;
// eslint-disable-next-line @typescript-eslint/no-misused-promises, no-only-tests/no-only-tests
RuleTester.itOnly = it.only;

// The code in each test case is the raw SQL text — the entire "file" content.
// Column offsets are 1-based. Because there is no wrapping backtick (unlike the
// athena rule tests), every column is 1 lower than the equivalent athena.spec.ts case.
const tester = new RuleTester({
  languageOptions: {
    parser: { parseForESLint },
  },
});

tester.run(ruleId, rule, {
  valid: [
    {
      name: 'non-sql content is silently skipped',
      code: `DROP TABLE foo`,
    },
    {
      name: 'SELECT without FROM is silently skipped',
      code: `select 1`,
    },
    {
      name: 'SELECT star from known service',
      code: `select * from "eslint-athena-plugin"`,
    },
    {
      name: 'SELECT specific column from known service',
      code: `select url from "eslint-athena-plugin"`,
    },
    {
      name: 'table name alias',
      code: `select m.url from "eslint-athena-plugin" as m`,
    },
    {
      name: 'quoted table name',
      code: `select * from "eslint-athena-plugin" where method = 'PUT'`,
    },
    {
      name: 'WITH / CTE',
      code: `WITH m AS (select * from "eslint-athena-plugin") select requestbody from m`,
    },
    {
      name: 'multi-line query',
      code: `SELECT
  url
FROM "eslint-athena-plugin"
WHERE method = 'PUT'`,
    },
    {
      name: 'different aliases for same service table can be joined together and accessed in SELECT',
      code: `SELECT t1.url, t2.url
FROM "eslint-athena-plugin" AS t1,
     "eslint-athena-plugin" AS t2
WHERE t1.method = 'GET'
  AND cardinality(split(t1.url, '/')) = 4
  AND t1.responsestatus = '200'
  AND split(t2.url, '/')[4] = 'request'
  AND cardinality(split(t2.url, '/')) = 5
  AND t2.responsestatus = '204'
  AND t2.method = 'PUT'`,
    },
  ],

  invalid: [
    {
      // PEG parser rejects "when"; the error is on line 1.
      name: 'invalid SQL syntax reports a SyntaxError',
      code: `select foo as bar from "eslint-athena-plugin" when 1=1`,
      errors: [
        {
          messageId: 'SyntaxError',
          data: { errorMessage: 'Expected [A-Za-z0-9_] but " " found.' },
          line: 1,
        },
      ],
    },
    {
      // Multi-line: PEG error is on line 4; location mapping must not collapse to line 1.
      name: 'syntax error location resolves to the offending line, not line 1',
      code: `SELECT
  foo AS bar
FROM "eslint-athena-plugin"
WHEN 1=1`,
      errors: [
        {
          messageId: 'SyntaxError',
          line: 4,
        },
      ],
    },
    {
      // "non-existent" starts at SQL offset 16 (after "SELECT url FROM ").
      // offsetToLoc → 0-based col 16 → 1-based col 17.
      // End: offset 30 → 0-based col 30 → 1-based col 31.
      name: 'unknown service reports AthenaError at the table name location',
      code: `SELECT url FROM "non-existent"`,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage:
              'service not found: "non-existent" (no swagger schema located)',
          },
          line: 1,
          column: 17,
          endLine: 1,
          endColumn: 31,
        },
      ],
    },
    {
      // "foo" starts at SQL offset 7 (after "select ").
      // offsetToLoc → 0-based col 7 → 1-based col 8.
      // End: offset 10 → 0-based col 10 → 1-based col 11.
      name: 'unknown column reports AthenaError at the column_ref location',
      code: `select foo from "eslint-athena-plugin"`,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: `Column "foo" does not exist in table(s) eslint-athena-plugin. Available columns: method, started, ended, url, requestbody, requestheaders, responsestatus, responsemessage, responsetype, responsebody, responseheaders, partition_date`,
          },
          line: 1,
          column: 8,
          endLine: 1,
          endColumn: 11,
        },
      ],
    },
    {
      name: 'unknown column in WITH outer SELECT',
      code: `WITH m AS (SELECT url FROM "eslint-athena-plugin" WHERE method = 'PUT') SELECT nonExistentCol FROM m`,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: `Column "nonExistentCol" does not exist in table(s) m. Available columns: url`,
          },
        },
      ],
    },
    {
      name: 'unknown table alias in SELECT',
      code: `SELECT x.url FROM "eslint-athena-plugin" WHERE method = 'PUT'`,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: `Table or alias "x" does not exist. Known tables: eslint-athena-plugin`,
          },
        },
      ],
    },
  ],
});

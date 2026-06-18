// athena/athena.spec.ts

import createTester from '../ts-tester.test.ts';
import rule, { ruleId } from './athena.ts';
// file.only
createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'non-sql',
      code: `\`bar\``,
    },
    {
      name: 'not SELECT nor WITH sql',
      code: `\`drop table foo\``,
    },
    {
      name: 'SELECT without FROM',
      code: `\`select 1\``,
    },
    {
      name: 'SELECT with FROM',
      code: `\`select * from "eslint-athena-plugin"\``,
    },
    {
      name: 'string instead of Template Literal',
      code: `'select * from "eslint-athena-plugin"'`,
    },
    {
      name: 'Template literal with string interpolation',
      code: `\`
        select *
        from "eslint-athena-plugin"
        where
          json_extract_scalar(responseheaders, '$["created-on"]') < '\${new Date().toISOString()}'
          and method = 'PUT'
      \``,
    },
    {
      name: 'SELECT with FROM - table name with single quotes',
      code: `\`select * from 'eslint-athena-plugin'\``,
    },
    {
      name: 'SELECT with FROM - table name with double quotes',
      code: `\`select * from "eslint-athena-plugin"\``,
    },
    {
      name: 'table name alias',
      code: `\`select m.url from "eslint-athena-plugin" as m\``,
    },
    {
      name: 'using WITH',
      code: `\`WITH m AS (select * from "eslint-athena-plugin") select requestbody from m\``,
    },
    {
      name: 'outer SELECT can reference columns produced by an inline subquery',
      code: `\`SELECT s.url FROM (SELECT url FROM "eslint-athena-plugin" WHERE method = 'PUT') AS s\``,
    },
    {
      name: 'outer SELECT can reference columns produced by a JOIN subquery',
      code: `\`SELECT l.url, c.url FROM "eslint-athena-plugin" AS l JOIN (SELECT url FROM "eslint-athena-plugin") AS c ON c.url = l.url\``,
    },
    {
      name: 'parse function expression with array access - in column',
      code: `\`WITH m AS (select * from "eslint-athena-plugin") 
        select DISTINCT split(url, '/') [5] as linkId FROM m\``,
    },
    {
      name: 'parse function expression with array access - in condition',
      code: `\`SELECT * FROM "eslint-athena-plugin" WHERE split(url, '/') [4] = 'ping'\``,
    },
    {
      name: 'CAST to simple type',
      code: `\`SELECT CAST(url as integer ) FROM "eslint-athena-plugin"\``,
    },
    {
      name: 'CAST to BIGINT',
      code: `\`SELECT CAST(url as BIGINT) FROM "eslint-athena-plugin"\``,
    },
    {
      name: 'CAST to ARRAY',
      code: `\`SELECT CAST(url as ARRAY<VARCHAR>) FROM "eslint-athena-plugin"\``,
    },
    {
      name: 'CAST to JSON',
      code: `\`SELECT CAST(url as JSON) FROM "eslint-athena-plugin"\``,
    },
    {
      name: 'CAST to MAP',
      code: `\`SELECT CAST(requestheaders as MAP<VARCHAR,VARCHAR>) FROM "eslint-athena-plugin"\``,
    },
    {
      name: 'CAST to complex ARRAY/MAP combination',
      code: `\`SELECT CAST(requestheaders as ARRAY<MAP<VARCHAR, VARCHAR>>) FROM "eslint-athena-plugin"\``,
    },
    {
      name: 'TRY_CAST',
      code: `\`SELECT TRY_CAST(url as JSON) FROM "eslint-athena-plugin"\``,
    },
    {
      name: 'CROSS JOIN UNNEST - not referenced',
      code: `\`SELECT url, json_extract(requestbody, '$.feeDetails') as parts
        FROM "eslint-athena-plugin"
          CROSS JOIN UNNEST(parts) AS t (part)
        WHERE
          cardinality(split(url, '/')) = 5
          AND split(url, '/')[4] = 'request'
          AND method = 'PUT'
          AND responsestatus = '204';
        \``,
    },
    {
      name: 'CROSS JOIN UNNEST - referenced',
      code: `\`WITH unnested as (SELECT url, json_extract(requestbody, '$.feeDetails') as parts
        FROM "eslint-athena-plugin"
          CROSS JOIN UNNEST(parts) AS t (part)
        WHERE
          cardinality(split(url, '/')) = 5
          AND split(url, '/')[4] = 'request'
          AND method = 'PUT'
          AND responsestatus = '204')
        select part from unnested;
        \``,
    },
    {
      name: 'CROSS JOIN UNNEST - array type casting should work',
      code: `\`WITH unique_postings AS (
    SELECT 
        posting,
        entryId
    FROM (
            SELECT DISTINCT split(a.url, '/') [5] AS entryId,
                try_cast(
                    json_extract(a.requestbody, '$.postings') AS ARRAY < MAP < VARCHAR,
                    VARCHAR >>
                ) AS postings
            FROM "eslint-athena-plugin" AS a
            WHERE
                split(url, '/')[3] = 'v2'
                AND a.method = 'PUT'
                AND a.responsestatus = '204'
            GROUP BY split(a.url, '/') [5],
                try_cast(
                    json_extract(a.requestbody, '$.postings') AS ARRAY < MAP < VARCHAR,
                    VARCHAR >>
                )
        )
        CROSS JOIN unnest(postings) AS postings(posting)
    UNION ALL
    SELECT 
        posting,
        entryId
    FROM (
            SELECT DISTINCT split(a.url, '/') [5] AS entryId,
                try_cast(
                    json_parse(a.requestbody) AS ARRAY < MAP < VARCHAR,
                    VARCHAR >>
                ) AS postings
            FROM "eslint-athena-plugin" AS a
            WHERE strpos(a.url, '/eslint-athena-plugin/v1/entry/') = 1
                AND a.method = 'PUT'
                AND a.responsestatus = '204'
            GROUP BY split(a.url, '/') [5],
                try_cast(
                    json_parse(a.requestbody) AS ARRAY < MAP < VARCHAR,
                    VARCHAR >>
                )
        )
        CROSS JOIN unnest(postings) AS postings(posting)
)
SELECT * from unique_postings
        \``,
    },
    {
      name: 'CROSS JOIN UNNEST - array type casting should work if it is not the outer most expression',
      code: `\`
	select
    split(url, '/') [ 5 ] as entryId,
		json_extract_scalar(responseheaders, '$["created-on"]') as entryCreatedOn,
		min_by(
      cast(
        json_extract(requestbody, '$.postings') as array(map(varchar, varchar))
      ),
      ended
    ) as postings,
    min(ended) as entryPutEnded
  from "eslint-athena-plugin"
	  cross join unnest(postings) as t(posting)
	where
    method = 'PUT'
		and responsestatus = '204'
		and cardinality(split(url, '/')) = 5
		and split(url, '/') [ 4 ] = 'entry'
  group by
    split(url, '/') [ 5 ],
    json_extract_scalar(responseheaders, '$["created-on"]')
        \``,
    },
    {
      name: 'CROSS JOIN UNNEST - support Map type as well',
      code: `\`
SELECT postingGroupId || ':deleted' as postingGroupId,
        'pending' as postingGroupType,
        statusCode,
        NULL as lastModified,
        map(
            ARRAY ['accountId', 'type', 'amount'],
            ARRAY [accountId, '', '']
        ) AS posting
    FROM (
            SELECT DISTINCT split(a.url, '/') [5] AS postingGroupId,
                a.responsestatus as statusCode,
                try_cast(
                    split_to_map(
                        json_extract_scalar(a.responseheaders, '$["created-on"]'),
                        ',',
                        '='
                    ) as MAP < VARCHAR,
                    VARCHAR >
                ) as accountUpdates
            FROM "eslint-athena-plugin" AS a
            WHERE (
                    strpos(a.url, '/eslint-athena-plugin/v2/entry/') = 1
                    OR strpos(a.url, '/eslint-athena-plugin/v1/entry/') = 1
                )
            GROUP BY split(a.url, '/') [5],
                a.responsestatus,
                try_cast(
                    split_to_map(
                        json_extract_scalar(a.responseheaders, '$["created-on"]'),
                        ',',
                        '='
                    ) as MAP < VARCHAR,
                    VARCHAR >
                )
        )
        CROSS JOIN unnest(accountUpdates) AS accountUpdates(accountId, accountVersion)        \``,
    },
    {
      name: 'AND/OR conditions in WHERE',
      code: `\` select *
  FROM
    "eslint-athena-plugin"
  WHERE
    method = 'PUT'
AND (
     (
       split(url, '/') [ 4 ] = 'entry'
       AND split_part(url, '/', 3) = 'v1'
       )
       OR (
        split(url, '/') [ 6 ] = 'entry'
        AND split_part(url, '/', 3) = 'v2'
     )
   )
\``,
    },
    {
      name: 'multiple AND split conditions narrow to specific version endpoint',
      code: `\`SELECT json_extract_scalar(responsebody, '$.v1Only')
FROM "eslint-athena-plugin"
WHERE responsestatus = '200'
  AND split(url, '/')[3] = 'v1'
  AND split(url, '/')[4] = 'ping'
  AND cardinality(split(url, '/')) = 4\``,
    },
    {
      name: 'OR path conditions - v2-only field accessible via second OR branch',
      code: `\`SELECT json_extract_scalar(responsebody, '$.v2Only')
FROM "eslint-athena-plugin"
WHERE responsestatus = '200'
  AND (
    (split(url, '/')[4] = 'ping' AND cardinality(split(url, '/')) = 4)
    OR
    (split(url, '/')[4] = 'ping' AND cardinality(split(url, '/')) = 4)
  )\``,
    },
    {
      name: 'self-join with different aliases for same service table',
      code: `\`SELECT t1.url, t2.url
FROM "eslint-athena-plugin" AS t1,
     "eslint-athena-plugin" AS t2
WHERE t1.method = 'PUT'
  AND cardinality(split(t1.url, '/')) = 5
  AND split(t1.url, '/')[4] = 'entry'
  AND t1.responsestatus = '204'
  AND split(t2.url, '/')[6] = 'entry'
  AND cardinality(split(t2.url, '/')) = 7
  AND t2.responsestatus = '204'
  AND t2.method = 'PUT'\``,
    },
    {
      name: 'split_part conditions narrow to v1 ping endpoint',
      code: `\`SELECT json_extract_scalar(responsebody, '$.v1Only')
FROM "eslint-athena-plugin"
WHERE responsestatus = '200'
  AND split_part(url, '/', 3) = 'v1'
  AND split_part(url, '/', 4) = 'ping'
  AND cardinality(split(url, '/')) = 4\``,
    },
    {
      name: 'complex query - only SELECT - 1 table - with alias',
      code: `\`SELECT
        json_extract_scalar(l.responseheaders, '$["created-on"]') AS createdOn
      FROM
        "eslint-athena-plugin" as l
      WHERE
        cardinality(split(l.url, '/')) = 5
        AND l.method = 'PUT'
        AND l.responsestatus = '204'\``,
    },
    {
      name: 'COUNT against array access expression',
      code: `\`SELECT
      COUNT(distinct split(e.url, '/') [5]) AS cards
    FROM
      "eslint-athena-plugin" AS e\``,
    },
    {
      name: 'non-sql with similar keywords should not trigger errors',
      code: `describe('with data set up through API', async () => {});`,
    },
    {
      name: 'compatible with legacy table names with _logs suffix',
      code: `\`SELECT v.*, 
          json_extract_scalar(v.requestbody, '$.postings') AS postings
        FROM bank_dev."eslint-athena-plugin_logs" AS v
      \``,
    },
    {
      name: 'service should be able to query its own athena table',
      code: `\`SELECT url FROM "eslint-athena-plugin"\``,
    },
    {
      name: 'access to internal partition_date column is allowed',
      code: `\`SELECT
      tcm.url
    FROM
      "eslint-athena-plugin" AS tcm
    WHERE
      partition_date > '2020-01-01'
      \``,
    },
    {
      name: 'different aliases for same service table can be joined together and accessed in SELECT',
      code: `\`
    SELECT
      SPLIT(t1.url, '/') [5] AS entryId,
      json_extract_scalar(t1.responseheaders, '$["created-on"]') AS v1CreatedOn,
      json_extract_scalar(t2.responseheaders, '$["created-on"]') AS v2CreatedOn
    FROM
      "eslint-athena-plugin" AS t1,
      "eslint-athena-plugin" AS t2
    WHERE
      SPLIT(t1.url, '/') [4] = 'entry'
      AND cardinality(SPLIT(t1.url, '/')) = 5
      AND t1.responsestatus = '204'
      AND t1.method = 'PUT'
      AND SPLIT(t2.url, '/') [4] = 'entry'
      AND cardinality(SPLIT(t2.url, '/')) = 5
      AND t2.responsestatus = '204'
      AND t2.method = 'PUT'
      \``,
    },
    {
      name: 'support adhoc table via "Values" keyword along with column aliasing',
      code: `\`
SELECT paymentSourceType AS "Payment Source Type"
FROM (values ('ach'), ('trade'), ('check'), ('card'), ('wire')) x(paymentSourceType)
\``,
    },
    {
      name: 'support SEQUENCE function for generating a series of dates',
      code: `\`
SELECT DATE_FORMAT(DATE_ADD('day', -n, CURRENT_DATE), '%Y-%m-%d') AS date FROM UNNEST(SEQUENCE(0, DATE_DIFF('day', DATE_ADD('day', -30, CURRENT_DATE), CURRENT_DATE))) AS t(n)
\``,
    },
    {
      name: 'support unnest following the target table in the same FROM clause',
      code: `\`
SELECT substr(to_iso8601(t.date), 1, 10) AS Date
FROM (SELECT sequence(current_date - interval '1' year, current_date, interval '1' day) dates), unnest(dates) as t(date)\``,
    },
    {
      name: 'Permissive if cross join is appended after inner join separated using comma',
      code: `\`
WITH
parameters AS (
  SELECT
    '2026-01-01T00:00:00.000Z' AS p_from,
    '2026-12-31T23:59:59.999Z' AS p_to
),
v1 AS (
    SELECT json_extract_scalar(responseheaders, '$["created-on"]') AS createdOn
    FROM "dataapi"."eslint-athena-plugin"
    WHERE responsestatus = '204' AND method = 'PUT' AND cardinality(split(url, '/')) = 5 AND split(url, '/')[4] = 'entry' AND split(url, '/')[3] = 'v1'
),
v2 AS (
    SELECT json_extract_scalar(responseheaders, '$["created-on"]') AS createdOn
    FROM "dataapi"."eslint-athena-plugin"
    WHERE responsestatus = '204' AND method = 'PUT' AND cardinality(split(url, '/')) = 7 AND split(url, '/')[6] = 'entry' AND split(url, '/')[3] = 'v2'
)
SELECT *
FROM v1
  LEFT OUTER JOIN v2 ON v1.createdOn = v2.createdOn,
  parameters as p
WHERE p.p_to < v1.createdOn AND p.p_from >= v1.createdOn
\``,
    },
  ],
  invalid: [
    {
      name: 'invalid sql',
      code: `\`select foo as bar from link when 1=1\``,
      errors: [
        {
          messageId: 'SyntextError',
          data: { errorMessage: 'Expected [A-Za-z0-9_] but " " found.' },
          line: 1,
          column: 34,
        },
      ],
    },
    {
      // PEG SyntaxError for "WHEN" on line 4; if location is reported correctly the error is on line 4
      // rather than line 1 (the whole-node fallback).
      name: 'syntax error location narrows to the offending token, not the whole SQL string',
      code: `\`SELECT
  foo AS bar
FROM link
WHEN 1=1\``,
      errors: [
        {
          messageId: 'SyntextError',
          line: 4,
        },
      ],
    },
    {
      // "non-existent" at SQL offsets 16–29 (14 chars). end.offset=30 (exclusive).
      // Source: backtick at 0, srcStart=1.
      // start: 1+16=17 → line 1, 0-based col 17 → RuleTester col 18.
      // end:   1+30=31 → line 1, 0-based col 31 → RuleTester endCol 32.
      name: 'unrecognised table name error location narrows to the table name in FROM',
      code: `\`SELECT url FROM "non-existent"\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: { errorMessage: 'service not found: "non-existent" (no swagger schema located)' },
          line: 1,
          column: 18,
          endLine: 1,
          endColumn: 32,
        },
      ],
    },
    {
      name: 'non-existing column',
      code: `\`select foo from "eslint-athena-plugin"\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage:
              "can't found column foo in tables: eslint-athena-plugin; available columns: method, started, ended, url, requestbody, requestheaders, responsestatus, responsemessage, responsetype, responsebody, responseheaders, partition_date",
          },
        },
      ],
    },
    {
      name: 'non-existing column with multiple tables lists all tables in error and narrows location to the column_ref',
      code: `\`SELECT nonExistentCol FROM "eslint-athena-plugin" t1, "eslint-athena-plugin" t2\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage:
              "can't found column nonExistentCol in tables: eslint-athena-plugin; available columns: method, started, ended, url, requestbody, requestheaders, responsestatus, responsemessage, responsetype, responsebody, responseheaders, partition_date",
          },
          line: 1,
          column: 9,
          endLine: 1,
          endColumn: 23,
        },
      ],
    },
    {
      name: 'unknown table alias in SELECT narrows error location to the column_ref',
      code: `\`SELECT x.url FROM "eslint-athena-plugin" WHERE method = 'PUT'\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: { errorMessage: `unknown table or alias 'x'; known tables: eslint-athena-plugin` },
          line: 1,
          column: 9,
          endLine: 1,
          endColumn: 14,
        },
      ],
    },
    {
      name: 'non-existing column in multi-column expression is reported',
      code: `\`WITH m AS (SELECT url FROM "eslint-athena-plugin" WHERE method = 'PUT') SELECT nonExistentCol || url FROM m\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: `can't found column nonExistentCol in tables: m; available columns: url`,
          },
        },
      ],
    },
    {
      name: 'query target endpoint - only SELECT - 1 table - without alias',
      code: `\`SELECT
        json_extract_scalar(responseheaders, '$.foo') AS linkCreatedOn
      FROM
        "eslint-athena-plugin"
      WHERE
        cardinality(split(url, '/')) = 7
        AND method = 'PUT'
        AND responsestatus = '204'\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found responseheaders - $.foo; available properties: created-on, updated-on',
          },
        },
      ],
    },
    {
      name: 'UNION ALL - mismatched number of columns are reported',
      code: `\`
      SELECT
        json_extract_scalar(responseheaders, '$["created-on"]') AS linkChangedOn,
        url AS linkUrl
      FROM
        "eslint-athena-plugin"
      WHERE
        cardinality(split(url, '/')) = 5
        AND method = 'PUT'
        AND responsestatus = '204'
      UNION ALL
      SELECT
        json_extract_scalar(responseheaders, '$["created-on"]') AS linkChangedOn
      FROM
        "eslint-athena-plugin"
      WHERE
        cardinality(split(url, '/')) = 7
        AND method = 'PUT'
        AND responsestatus = '204'
      \``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: `UNION ALL parts have different number of columns: 2 vs 1`,
          },
        },
      ],
    },
    {
      name: 'UNION ALL - some selects are invalid',
      code: `\`
      SELECT
        json_extract_scalar(responseheaders, '$["created-on"]') AS linkChangedOn
      FROM
        "eslint-athena-plugin"
      WHERE
        cardinality(split(url, '/')) = 7
        AND method = 'PUT'
        AND responsestatus = '204'
      UNION ALL
      SELECT
        json_extract_scalar(responseheaders, '$["Xupdated-on"]') AS linkChangedOn
      FROM
        "eslint-athena-plugin"
      WHERE
        cardinality(split(url, '/')) = 7
        AND method = 'PUT'
        AND responsestatus = '204'
      \``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage:
              'property not found responseheaders - $["Xupdated-on"]; available properties: created-on, updated-on',
          },
        },
      ],
    },
    {
      name: 'invalid direct JSON style property access against CROSS JOIN UNNEST array element based off CAST over json_extract expression',
      code: `\`
        WITH unique_entries as (
          select
            cast(
              json_extract(requestbody, '$.postings') as array(map(varchar, varchar))
            ) as postings
          from
            "eslint-athena-plugin"
          where
            method = 'PUT'
            and responsestatus = '204'
            and cardinality(split(url, '/')) = 5
            and split(url, '/') [ 4 ] = 'entry'
        )
        select
          posting [ 'XaccountId' ] as postingAccountId
        from
          unique_entries
          cross join unnest(postings) as t(posting)
      \``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage:
              'property not found posting - $["XaccountId"]; available properties: amount, currency, type, createdOn, accountId',
          },
        },
      ],
    },
    {
      name: 'AND/OR conditions in WHERE',
      code: `\` select json_extract(requestbody, '$.xxx')
  FROM
    "eslint-athena-plugin"
  WHERE
    method = 'PUT'
AND (
     (
       split(url, '/') [ 4 ] = 'entry'
       AND split_part(url, '/', 3) = 'v1'
       )
       OR (
        split(url, '/') [ 6 ] = 'entry'
        AND split_part(url, '/', 3) = 'v2'
     )
   )
\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found requestbody - $.xxx',
          },
        },
      ],
    },
    {
      name: 'multiple AND conditions restrict to v2 endpoint - v1-only field is not available',
      code: `\`SELECT json_extract_scalar(requestbody, '$.v1OnlyNewEntryProperty') AS atc
FROM "eslint-athena-plugin"
WHERE method = 'PUT'
  AND responsestatus = '204'
  AND split(url, '/')[3] = 'v2'
  AND split(url, '/')[6] = 'entry'
  AND cardinality(split(url, '/')) = 7\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found requestbody - $.v1OnlyNewEntryProperty; available properties: postings',
          },
        },
      ],
    },
    {
      name: 'OR conditions - field absent from all matched endpoints',
      code: `\`SELECT json_extract_scalar(requestbody, '$.nonExistentField') AS x
FROM "eslint-athena-plugin"
WHERE method = 'PUT'
  AND responsestatus = '204'
  AND (
    (split(url, '/')[4] = 'entry' AND cardinality(split(url, '/')) = 5)
    OR
    (split(url, '/')[6] = 'entry' AND cardinality(split(url, '/')) = 7)
  )\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found requestbody - $.nonExistentField',
          },
        },
      ],
    },
    {
      name: 'split_part conditions restrict to v2 endpoint - v1-only field is not available',
      code: `\`SELECT json_extract_scalar(responsebody, '$.card.applicationTransactionCounter') AS atc
FROM "eslint-athena-plugin"
WHERE method = 'PUT'
  AND responsestatus = '200'
  AND split_part(url, '/', 3) = 'v2'
  AND split_part(url, '/', 6) = 'card'
  AND cardinality(split(url, '/')) = 7\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage:
              'property not found responsebody - $.card.applicationTransactionCounter; available properties: encryptedDataEncryptionKey, card',
          },
        },
      ],
    },
    {
      name: 'error location is narrowed to the exact json_extract_scalar call (single-line SQL)',
      // json_extract_scalar starts at SQL offset 7 (after "SELECT ") and ends at offset 63.
      // sqlStartOffset = 1 (backtick at code[0], SQL content at code[1]).
      // start: 1+7=8 → line 1, 0-based col 8 → RuleTester col 9.
      // end:   1+63=64 → line 1, 0-based col 64 → RuleTester endCol 65.
      code: `\`SELECT json_extract_scalar(responsebody, '$.nonExistentField') AS x FROM "eslint-athena-plugin" WHERE method = 'PUT' AND responsestatus = '200'\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: { errorMessage: 'property not found responsebody - $.nonExistentField' },
          line: 1,
          column: 9,
          endLine: 1,
          endColumn: 65,
        },
      ],
    },
    {
      name: 'error location is narrowed to the exact json_extract_scalar call (multi-line SQL, call on line 2)',
      // json_extract_scalar starts at SQL offset 9 (SELECT\n + 2 spaces) and ends at offset 65.
      // sqlStartOffset = 1.
      // start: 1+9=10  → splits to line 2, 0-based col 2 → RuleTester line 2, col 3.
      // end:   1+65=66 → splits to line 2, 0-based col 58 → RuleTester endLine 2, endCol 59.
      code: `\`SELECT
  json_extract_scalar(responsebody, '$.nonExistentField') AS x
FROM "eslint-athena-plugin" WHERE method = 'PUT' AND responsestatus = '200'\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: { errorMessage: 'property not found responsebody - $.nonExistentField' },
          line: 2,
          column: 3,
          endLine: 2,
          endColumn: 59,
        },
      ],
    },
    {
      // Uses a plain string (not a template literal) so that ${''}  appears as a literal
      // template expression in the analyzed source rather than being evaluated by the test runner.
      // quasi[0] cooked = "SELECT " (SQL offsets 0-6, source offsets 1-7).
      // quasi[1] cooked = "json_extract_scalar(...)" (SQL offset 7 onwards).
      // quasi[1].range[0] = 12 (the closing } of ${''}) → quasi[1] srcStart = 13.
      // json_extract_scalar start: SQL offset 7 → source offset 13 → line 1, 0-based col 13 → col 14.
      // json_extract_scalar end:   SQL offset 63 → source offset 69 → line 1, 0-based col 69 → endCol 70.
      name: 'error location accounts for template expressions that appear before the error in the SQL',
      // eslint-disable-next-line no-template-curly-in-string
      code: "`SELECT ${''}json_extract_scalar(responsebody, '$.nonExistentField') AS x FROM \"eslint-athena-plugin\" WHERE method = 'PUT' AND responsestatus = '200'`",
      errors: [
        {
          messageId: 'AthenaError',
          data: { errorMessage: 'property not found responsebody - $.nonExistentField' },
          line: 1,
          column: 14,
          endLine: 1,
          endColumn: 70,
        },
      ],
    },
    {
      // nonExistentCol at SQL offsets 7–21 (exclusive). Source: backtick at 0, srcStart=1.
      // start: 1+7=8 → line 1, 0-based col 8 → RuleTester col 9.
      // end:   1+21=22 → line 1, 0-based col 22 → RuleTester endCol 23.
      name: 'error location is narrowed to the exact column_ref when the column is not found',
      code: `\`SELECT nonExistentCol FROM "eslint-athena-plugin" WHERE method = 'PUT' AND responsestatus = '200'\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage:
              "can't found column nonExistentCol in tables: eslint-athena-plugin; available columns: method, started, ended, url, requestbody, requestheaders, responsestatus, responsemessage, responsetype, responsebody, responseheaders, partition_date",
          },
          line: 1,
          column: 9,
          endLine: 1,
          endColumn: 23,
        },
      ],
    },
    {
      name: 'schema validation should work for complex column expression - using || operator and invalid property used not as the first part in the expression',
      code: `\`select 
    json_extract(requestbody, '$.cardNumberLength') || json_extract(requestbody, '$.xxx')
  FROM
    "eslint-athena-plugin"
  WHERE
    method = 'PUT'
\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found requestbody - $.xxx',
          },
        },
      ],
    },
    {
      name: 'schema validation should work for complex column expression - invlidate property used inside IF condition',
      code: `\`select 
      IF(
        json_extract_scalar(requestbody, '$.xxx') = 'XXX',
        'Domestic',
        'International'
      ) AS Domestic
  FROM
    "eslint-athena-plugin"
  WHERE
    method = 'PUT'
\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found requestbody - $.xxx',
          },
        },
      ],
    },
    {
      name: 'non-existing column in WHERE is reported with precise location',
      code: `\`SELECT url FROM "eslint-athena-plugin" WHERE method = 'PUT' AND nonExistentCol = 'foo'\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: `can't found column nonExistentCol in tables: eslint-athena-plugin; available columns: method, started, ended, url, requestbody, requestheaders, responsestatus, responsemessage, responsetype, responsebody, responseheaders, partition_date`,
          },
          line: 1,
          column: 66,
          endLine: 1,
          endColumn: 80,
        },
      ],
    },
    {
      name: 'schema validation should work inside WHERE conditions as well',
      code: `\`select * FROM
    "eslint-athena-plugin"
  WHERE
    method = 'PUT'
    and json_extract_scalar(requestbody, '$.xxx') = 'XXX'
\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found requestbody - $.xxx',
          },
        },
      ],
    },
    {
      name: 'schema validation should work inside GROUP BY as well',
      code: `\`select count(*) FROM
    "eslint-athena-plugin"
  WHERE
    method = 'PUT'
  GROUP BY json_extract_scalar(requestbody, '$.xxx')
\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found requestbody - $.xxx',
          },
        },
      ],
    },
    {
      name: 'schema validation should work inside HAVING as well',
      code: `\`select count(*) FROM
    "eslint-athena-plugin"
  WHERE
    method = 'PUT'
  GROUP BY method
  HAVING json_extract_scalar(requestbody, '$.xxx') = 'XXX'
\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found requestbody - $.xxx',
          },
        },
      ],
    },
    {
      name: 'schema validation should work inside ORDER BY as well',
      code: `\`select * FROM
    "eslint-athena-plugin"
  WHERE
    method = 'PUT'
  ORDER BY json_extract_scalar(requestbody, '$.xxx')
\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found requestbody - $.xxx',
          },
        },
      ],
    },
    {
      name: 'invalid column in JOIN ON condition is reported',
      code: `\`SELECT l.url FROM "eslint-athena-plugin" AS l JOIN "eslint-athena-plugin" AS r ON r.nonExistentCol = l.url\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: `can't found column nonExistentCol in tables: eslint-athena-plugin; available columns: method, started, ended, url, requestbody, requestheaders, responsestatus, responsemessage, responsetype, responsebody, responseheaders, partition_date`,
          },
        },
      ],
    },
    {
      name: 'invalid table alias in JOIN ON condition is reported',
      code: `\`SELECT l.url FROM "eslint-athena-plugin" AS l JOIN "eslint-athena-plugin" AS r ON x.url = l.url\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: `unknown table or alias 'x'; known tables: l, r`,
          },
        },
      ],
    },
    {
      name: 'invalid column inside inline subquery inner SELECT is reported',
      code: `\`SELECT s.url FROM (SELECT nonExistentCol FROM "eslint-athena-plugin" WHERE method = 'PUT') AS s\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: `can't found column nonExistentCol in tables: eslint-athena-plugin; available columns: method, started, ended, url, requestbody, requestheaders, responsestatus, responsemessage, responsetype, responsebody, responseheaders, partition_date`,
          },
        },
      ],
    },
    {
      name: 'invalid column in outer SELECT referencing inline subquery is reported',
      code: `\`SELECT s.nonExistentCol FROM (SELECT url FROM "eslint-athena-plugin" WHERE method = 'PUT') AS s\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: `can't found column nonExistentCol in tables: s; available columns: url`,
          },
        },
      ],
    },
    {
      name: 'invalid column in JOIN subquery ON condition is reported',
      code: `\`SELECT l.url, c.url FROM "eslint-athena-plugin" AS l JOIN (SELECT url FROM "eslint-athena-plugin") AS c ON c.nonExistentCol = l.url\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: `can't found column nonExistentCol in tables: c; available columns: url`,
          },
        },
      ],
    },
    {
      name: 'invalid column in MAP() expression is reported',
      code: `\`
  WITH request_message AS (
    SELECT
      DISTINCT url, requestbody AS message
    FROM
      "eslint-athena-plugin"
    WHERE
      method = 'PUT'
      AND responsestatus = '204'
  )
  SELECT
    CAST(
      MAP(
        ARRAY [ 'url', 'message'],
        ARRAY [ url,
          nonExistentCol,
          CAST('"' || updatedOn || '"' AS JSON) ]
      ) AS JSON
    ) AS Report
  FROM
    request_message
\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: `can't found column nonExistentCol in tables: request_message; available columns: url, message`,
          },
        },
      ],
    },
    {
      name: 'MAP() expression should result in a newly structured column rather than simply carrying over all the referenced columns from the source table',
      code: `\`
  WITH request_message AS (
    SELECT
      DISTINCT url, requestbody AS message
    FROM
      "eslint-athena-plugin"
    WHERE
      method = 'PUT'
      AND responsestatus = '204'
  ),
  report AS (
    SELECT
      CAST(
        MAP(
          ARRAY [ 'url', 'message'],
          ARRAY [ url, message ]
        ) AS JSON
      ) AS Report
    FROM
      request_message
  )
  SELECT
    ReportXXX
  FROM
    report
\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: `can't found column ReportXXX in tables: report; available columns: Report`,
          },
        },
      ],
    },
  ],
});

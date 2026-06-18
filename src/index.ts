// index.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { TSESLint } from '@typescript-eslint/utils';

import athena, { ruleId as athenaRuleId } from './athena/athena.ts';
import sqlFile, { ruleId as sqlFileRuleId } from './athena/sql-file.ts';
import { parseForESLint } from './sql-parser.ts';

const rules: Record<string, TSESLint.LooseRuleDefinition> = {
  [athenaRuleId]: athena,
  [sqlFileRuleId]: sqlFile,
};

const plugin: TSESLint.FlatConfig.Plugin = {
  rules,
};

const configs: Record<string, TSESLint.FlatConfig.Config[]> = {
  all: [
    {
      files: ['**/*.ts'],
      plugins: {
        '@checkdigit': plugin,
      },
      rules: {
        [`@checkdigit/${athenaRuleId}`]: 'error',
      },
    },
    {
      files: ['**/*.sql'],
      plugins: { '@checkdigit': plugin },
      languageOptions: { parser: { parseForESLint } },
      rules: { [`@checkdigit/${sqlFileRuleId}`]: 'error' },
    },
  ],
  recommended: [
    {
      files: ['**/*.ts'],
      plugins: {
        '@checkdigit': plugin,
      },
      rules: {
        [`@checkdigit/${athenaRuleId}`]: 'off',
      },
    },
    {
      files: ['**/*.sql'],
      plugins: { '@checkdigit': plugin },
      languageOptions: { parser: { parseForESLint } },
      rules: { [`@checkdigit/${sqlFileRuleId}`]: 'off' },
    },
  ],
};

const defaultToExport: Exclude<TSESLint.FlatConfig.Plugin, 'config'> & {
  configs: Record<string, TSESLint.FlatConfig.Config[]>;
} = {
  ...plugin,
  configs,
};
export default defaultToExport;

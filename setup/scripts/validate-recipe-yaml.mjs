import assert from 'node:assert/strict';
import yaml from 'js-yaml';
import {
  parseRecipeDependenciesFromYaml,
  rewriteRecipeYamlWithoutDependencies,
} from '../recipe-yaml.js';

const cases = [
  {
    name: 'unquoted dependency names',
    input: `
name: Example
type: Site
recipes:
  - dak_decoupled_base
  - dak_structured_content
install:
  - node
`,
    expectedDependencies: ['dak_decoupled_base', 'dak_structured_content'],
  },
  {
    name: 'quoted dependency names',
    input: `
name: Example
recipes:
  - 'dak_decoupled_base'
  - "dak_structured_content"
`,
    expectedDependencies: ['dak_decoupled_base', 'dak_structured_content'],
  },
  {
    name: 'comments around recipe dependencies',
    input: `
name: Example
# Recipes compose earlier setup packages.
recipes:
  # Base comes first.
  - dak_decoupled_base
  - dak_structured_content # Then structured pages.
`,
    expectedDependencies: ['dak_decoupled_base', 'dak_structured_content'],
  },
  {
    name: 'empty recipes section',
    input: `
name: Example
recipes: []
install:
  - node
`,
    expectedDependencies: [],
  },
];

for (const testCase of cases) {
  assert.deepEqual(
    parseRecipeDependenciesFromYaml(testCase.input),
    testCase.expectedDependencies,
    testCase.name,
  );
}

const rewrittenMultiple = rewriteRecipeYamlWithoutDependencies(cases[0].input, new Set(['dak_decoupled_base']));
assert.deepEqual(yaml.load(rewrittenMultiple).recipes, ['dak_structured_content']);

const rewrittenEmpty = rewriteRecipeYamlWithoutDependencies(cases[0].input, new Set([
  'dak_decoupled_base',
  'dak_structured_content',
]));
assert.equal(Object.hasOwn(yaml.load(rewrittenEmpty), 'recipes'), false);

const unchanged = rewriteRecipeYamlWithoutDependencies(cases[0].input, new Set());
assert.equal(unchanged, cases[0].input);

console.log('Recipe YAML validation passed.');

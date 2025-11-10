import fs from 'node:fs/promises';
import path from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validatorCache = new Map();

const loadSchema = async (schemaPath) => {
  const resolvedPath = path.resolve(schemaPath);
  const schemaContent = await fs.readFile(resolvedPath, 'utf8');
  return JSON.parse(schemaContent);
};

const getValidator = async (schemaPath) => {
  const resolvedPath = path.resolve(schemaPath);
  if (validatorCache.has(resolvedPath)) {
    return validatorCache.get(resolvedPath);
  }

  const schema = await loadSchema(resolvedPath);
  const validator = ajv.compile(schema);
  validatorCache.set(resolvedPath, validator);
  return validator;
};

const formatError = (error) => ({
  instancePath: error.instancePath || '(root)',
  message: error.message,
  keyword: error.keyword,
  params: error.params
});

export const validateAgainstSchema = async (data, schemaPath) => {
  const validator = await getValidator(schemaPath);
  const valid = validator(data);
  return {
    valid,
    errors: valid ? [] : validator.errors.map(formatError)
  };
};

export const clearSchemaCache = () => validatorCache.clear();

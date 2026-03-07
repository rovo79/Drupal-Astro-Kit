import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  PROJECT_ROOT,
  ENV_KEYS,
  resolveFromProjectRoot
} from './util/constants.js';

const DEFAULT_ENV_PATH = resolveFromProjectRoot('.env');
const DEFAULT_REQUIRED_COMMANDS = Object.freeze(['ddev', 'docker', 'npm', 'npx']);
const DEFAULT_REQUIRED_PATHS = Object.freeze([
  { path: 'setup.sh', type: 'file' },
  { path: 'drupal-backend', type: 'directory' },
  { path: 'astro-frontend', type: 'directory' },
  { path: 'astro-frontend/astro.config.mjs', type: 'file' }
]);

const sanitizeValue = (value) => {
  if (value == null) {
    return value;
  }

  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};

const parseEnvContent = (content) => {
  const env = {};
  if (!content) {
    return env;
  }

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) {
      return;
    }

    let key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1);

    if (key.startsWith('export ')) {
      key = key.slice(7).trim();
    }

    env[key] = sanitizeValue(value ?? '');
  });

  return env;
};

const readFileSafe = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return { exists: true, content };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { exists: false, content: null };
    }

    throw error;
  }
};

const detectCommand = (command) => {
  const bin = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(bin, [command], { encoding: 'utf8' });
  const found = result.status === 0 && typeof result.stdout === 'string';
  const firstPath = found ? result.stdout.split(/\r?\n/).filter(Boolean)[0] ?? null : null;

  return {
    command,
    found,
    path: firstPath
  };
};

const inspectPath = async ({ path: relativePath, type = 'any' }) => {
  const absolutePath = resolveFromProjectRoot(relativePath);

  try {
    const stats = await fs.stat(absolutePath);
    const inferredType = stats.isDirectory()
      ? 'directory'
      : stats.isFile()
      ? 'file'
      : 'other';

    return {
      path: relativePath,
      absolutePath,
      exists: true,
      type: inferredType,
      matchesType: type === 'any' || type === inferredType
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        path: relativePath,
        absolutePath,
        exists: false,
        type: null,
        matchesType: false
      };
    }

    throw error;
  }
};

const loadEnvState = async (envPath = DEFAULT_ENV_PATH) => {
  try {
    const { exists, content } = await readFileSafe(envPath);
    if (!exists) {
      return {
        path: envPath,
        exists: false,
        variables: {},
        content: null
      };
    }

    return {
      path: envPath,
      exists: true,
      variables: parseEnvContent(content),
      content
    };
  } catch (error) {
    return {
      path: envPath,
      exists: false,
      variables: {},
      content: null,
      error
    };
  }
};

const checkRequiredCommands = (commands = DEFAULT_REQUIRED_COMMANDS) =>
  commands.reduce((acc, command) => {
    acc[command] = detectCommand(command);
    return acc;
  }, {});

const inspectPaths = async (paths = DEFAULT_REQUIRED_PATHS) => {
  const normalized = paths.map((entry) =>
    typeof entry === 'string' ? { path: entry, type: 'any' } : entry
  );

  return Promise.all(normalized.map((entry) => inspectPath(entry)));
};

const deriveExpectedHosts = (envVariables = {}) => {
  const fallbackName = path.basename(PROJECT_ROOT);
  const envProjectName = envVariables[ENV_KEYS.PROJECT_NAME];
  const projectName = envProjectName || fallbackName;

  if (!projectName) {
    return {
      projectName: envProjectName ?? null,
      expectedDrupalBaseUrl: null,
      expectedDrupalApiUrl: null
    };
  }

  const baseUrl = `http://${projectName}.ddev.site`;
  return {
    projectName,
    expectedDrupalBaseUrl: baseUrl,
    expectedDrupalApiUrl: `${baseUrl}/jsonapi`
  };
};

const summarizeCommandStatus = (commandStatus) =>
  Object.values(commandStatus).reduce(
    (acc, { command, found }) => {
      if (found) {
        acc.available.push(command);
      } else {
        acc.missing.push(command);
      }
      return acc;
    },
    { available: [], missing: [] }
  );

const collectSetupPrerequisites = async () => {
  const env = await loadEnvState();
  const commands = checkRequiredCommands();
  const paths = await inspectPaths();
  const expectedHosts = deriveExpectedHosts(env.variables);

  return {
    env,
    commands,
    paths,
    expectedHosts,
    commandSummary: summarizeCommandStatus(commands)
  };
};

export {
  DEFAULT_ENV_PATH,
  DEFAULT_REQUIRED_COMMANDS,
  DEFAULT_REQUIRED_PATHS,
  loadEnvState,
  checkRequiredCommands,
  inspectPaths,
  deriveExpectedHosts,
  collectSetupPrerequisites,
  parseEnvContent
};

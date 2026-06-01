import yaml from 'js-yaml';

function parseRecipeYamlDocument(recipeYaml) {
  const parsed = yaml.load(String(recipeYaml ?? '')) ?? {};
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }
  return parsed;
}

function normalizeRecipeList(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  return [];
}

export function parseRecipeDependenciesFromYaml(recipeYaml) {
  const parsed = parseRecipeYamlDocument(recipeYaml);
  return normalizeRecipeList(parsed.recipes);
}

export function rewriteRecipeYamlWithoutDependencies(recipeYaml, dependenciesToSkip) {
  if (!dependenciesToSkip || dependenciesToSkip.size === 0) {
    return recipeYaml;
  }

  const parsed = parseRecipeYamlDocument(recipeYaml);
  const recipes = normalizeRecipeList(parsed.recipes);

  if (recipes.length === 0) {
    return recipeYaml;
  }

  const keptRecipes = recipes.filter((dependencyName) => !dependenciesToSkip.has(dependencyName));
  const rewritten = { ...parsed };

  if (keptRecipes.length > 0) {
    rewritten.recipes = keptRecipes;
  } else {
    delete rewritten.recipes;
  }

  return yaml.dump(rewritten, {
    lineWidth: 100,
    noRefs: true,
    quotingType: "'",
  });
}

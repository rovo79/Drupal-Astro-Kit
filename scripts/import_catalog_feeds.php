<?php

use Drupal\Core\File\FileSystemInterface;
use Drupal\field\Entity\FieldConfig;
use Drupal\field\Entity\FieldStorageConfig;
use Drupal\feeds\Entity\Feed;
use Drupal\feeds\Entity\FeedType;
use Drupal\feeds\FeedTypeInterface;
use Drupal\feeds\Plugin\Type\Processor\ProcessorInterface;

$projectRoot = dirname(DRUPAL_ROOT);
$stagingDir = $projectRoot . '/.tmp-feeds-import';

if (!is_dir($stagingDir)) {
  throw new RuntimeException("Staging directory not found: $stagingDir");
}

function customSources(array $headers): array {
  $sources = [];
  foreach ($headers as $header) {
    $sources[$header] = [
      'label' => $header,
      'value' => $header,
      'machine_name' => $header,
    ];
  }
  return $sources;
}

function textMapping(string $target, string $source, bool $unique = FALSE): array {
  $mapping = [
    'target' => $target,
    'map' => ['value' => $source],
    'settings' => [
      'language' => NULL,
    ],
  ];

  if ($unique) {
    $mapping['unique'] = ['value' => TRUE];
  }

  return $mapping;
}

function formattedTextMapping(string $target, string $source): array {
  return [
    'target' => $target,
    'map' => ['value' => $source],
    'settings' => [
      'format' => 'plain_text',
      'language' => NULL,
    ],
  ];
}

function numericMapping(string $target, string $source): array {
  return [
    'target' => $target,
    'map' => ['value' => $source],
  ];
}

function linkMapping(string $target, string $source): array {
  return [
    'target' => $target,
    'map' => ['uri' => $source],
  ];
}

function entityReferenceMapping(string $target, string $source, string $referenceBy): array {
  return [
    'target' => $target,
    'map' => ['target_id' => $source],
    'settings' => [
      'reference_by' => $referenceBy,
      'autocreate' => FALSE,
    ],
  ];
}

function ensureStringField(string $bundle, string $fieldName, string $label, string $description = ''): void {
  $storage = FieldStorageConfig::loadByName('node', $fieldName);
  if (!$storage) {
    $storage = FieldStorageConfig::create([
      'field_name' => $fieldName,
      'entity_type' => 'node',
      'type' => 'string',
      'cardinality' => 1,
      'translatable' => FALSE,
      'settings' => [],
    ]);
    $storage->save();
  }

  $field = FieldConfig::loadByName('node', $bundle, $fieldName);
  if (!$field) {
    $field = FieldConfig::create([
      'field_name' => $fieldName,
      'entity_type' => 'node',
      'bundle' => $bundle,
      'label' => $label,
      'description' => $description,
      'required' => FALSE,
      'translatable' => FALSE,
      'settings' => [],
    ]);
    $field->save();
    return;
  }

  $field->setLabel($label);
  $field->setDescription($description);
  $field->save();
}

function ensurePathautoPattern(string $id, string $label, string $bundle, string $pattern, int $weight): void {
  $storage = \Drupal::entityTypeManager()->getStorage('pathauto_pattern');
  $patternEntity = $storage->load($id) ?: $storage->create([
    'id' => $id,
  ]);

  $patternEntity->set('label', $label);
  $patternEntity->set('type', 'canonical_entities:node');
  $patternEntity->set('pattern', $pattern);
  $patternEntity->set('selection_criteria', [
    "bundle_$bundle" => [
      'id' => 'entity_bundle:node',
      'negate' => FALSE,
      'context_mapping' => [
        'node' => 'node',
      ],
      'bundles' => [
        $bundle => $bundle,
      ],
    ],
  ]);
  $patternEntity->set('selection_logic', 'and');
  $patternEntity->set('weight', $weight);
  $patternEntity->save();
}

function ensureFeedType(
  string $id,
  string $label,
  string $bundle,
  array $headers,
  array $mappings,
  array $explodeSources = []
): FeedType {
  $storage = \Drupal::entityTypeManager()->getStorage('feeds_feed_type');
  $feedType = $storage->load($id) ?: FeedType::create([
    'id' => $id,
  ]);

  $feedType->set('label', $label);
  $feedType->set('description', "Starter catalog importer for $bundle nodes.");
  $feedType->set('help', '');
  $feedType->set('import_period', FeedTypeInterface::SCHEDULE_NEVER);
  $feedType->set('fetcher', 'upload');
  $feedType->set('fetcher_configuration', [
    'allowed_extensions' => 'csv',
    'directory' => 'public://feeds',
  ]);
  $feedType->set('parser', 'csv');
  $feedType->set('parser_configuration', [
    'delimiter' => ',',
    'no_headers' => FALSE,
    'line_limit' => 1000,
  ]);
  $feedType->set('processor', 'entity:node');
  $feedType->set('processor_configuration', [
    'values' => [
      'type' => $bundle,
    ],
    'langcode' => '',
    'insert_new' => ProcessorInterface::INSERT_NEW,
    'update_existing' => ProcessorInterface::UPDATE_EXISTING,
    'skip_hash_check' => FALSE,
    'skip_validation' => FALSE,
    'skip_validation_types' => [],
    'authorize' => FALSE,
    'revision' => FALSE,
    'expire' => ProcessorInterface::EXPIRE_NEVER,
    'owner_feed_author' => FALSE,
    'owner_id' => 1,
  ]);
  $feedType->set('custom_sources', customSources($headers));
  $feedType->set('mappings', $mappings);
  $feedType->setThirdPartySetting('feeds_tamper', 'tampers', []);
  $feedType->save();

  $tamperMeta = \Drupal::service('feeds_tamper.feed_type_tamper_manager')->getTamperMeta($feedType, TRUE);
  foreach ($explodeSources as $source) {
    $tamperMeta->addTamper([
      'plugin' => 'explode',
      'separator' => '|',
      'source' => $source,
      'weight' => 0,
      'label' => "Explode $source",
      'description' => 'Split pipe-delimited values into multiple references.',
    ]);
  }
  $feedType->save();

  return $feedType;
}

function stageCsv(string $stagingDir, string $filename): string {
  $sourcePath = $stagingDir . '/' . $filename;
  if (!is_file($sourcePath)) {
    throw new RuntimeException("CSV file not found: $sourcePath");
  }

  $destination = 'public://feeds/' . $filename;
  $fileSystem = \Drupal::service('file_system');
  $directory = 'public://feeds';
  $fileSystem->prepareDirectory($directory, FileSystemInterface::CREATE_DIRECTORY | FileSystemInterface::MODIFY_PERMISSIONS);
  $fileSystem->saveData(file_get_contents($sourcePath), $destination, FileSystemInterface::EXISTS_REPLACE);

  return $destination;
}

function ensureFeed(string $title, string $feedTypeId, string $source): Feed {
  $storage = \Drupal::entityTypeManager()->getStorage('feeds_feed');
  $existing = $storage->loadByProperties([
    'type' => $feedTypeId,
    'title' => $title,
  ]);
  $feed = $existing ? reset($existing) : Feed::create([
    'type' => $feedTypeId,
    'title' => $title,
  ]);

  $feed->setSource($source);
  $feed->save();

  return $feed;
}

function readCsvRows(string $stagingDir, string $filename): array {
  $sourcePath = $stagingDir . '/' . $filename;
  if (!is_file($sourcePath)) {
    throw new RuntimeException("CSV file not found: $sourcePath");
  }

  $handle = fopen($sourcePath, 'rb');
  if (!$handle) {
    throw new RuntimeException("Unable to read CSV file: $sourcePath");
  }

  $headers = fgetcsv($handle);
  if (!is_array($headers)) {
    fclose($handle);
    return [];
  }

  $rows = [];
  while (($values = fgetcsv($handle)) !== FALSE) {
    if ($values === [NULL] || $values === FALSE) {
      continue;
    }

    $row = [];
    foreach ($headers as $index => $header) {
      $row[$header] = $values[$index] ?? '';
    }
    $rows[] = $row;
  }

  fclose($handle);
  return $rows;
}

function backfillExternalKeys(string $bundle, array $rows): void {
  $storage = \Drupal::entityTypeManager()->getStorage('node');

  foreach ($rows as $row) {
    $title = trim((string) ($row['title'] ?? ''));
    $externalKey = trim((string) ($row['field_external_key'] ?? ''));
    if ($title === '' || $externalKey === '') {
      continue;
    }

    $existingNodes = $storage->loadByProperties([
      'type' => $bundle,
      'title' => $title,
    ]);

    foreach ($existingNodes as $node) {
      $currentValue = (string) $node->get('field_external_key')->value;
      if ($currentValue === $externalKey) {
        break;
      }

      if ($currentValue !== '') {
        continue;
      }

      $node->set('field_external_key', $externalKey);
      $node->save();
      break;
    }
  }
}

function reportNodeCount(string $bundle): int {
  return (int) \Drupal::entityQuery('node')
    ->accessCheck(FALSE)
    ->condition('type', $bundle)
    ->count()
    ->execute();
}

function reportExternalKeyCount(string $bundle, string $prefix): int {
  return (int) \Drupal::entityQuery('node')
    ->accessCheck(FALSE)
    ->condition('type', $bundle)
    ->condition('field_external_key', $prefix . '%', 'LIKE')
    ->count()
    ->execute();
}

ensurePathautoPattern('product', 'Product path pattern', 'product', '/items/[node:title]', -4);
ensurePathautoPattern('collection', 'Collection path pattern', 'collection', '/collections/[node:title]', -3);
ensureStringField('product', 'field_external_key', 'External key', 'Stable import identity key for product upserts.');
ensureStringField('collection', 'field_external_key', 'External key', 'Stable import identity key for collection upserts.');

$productHeaders = [
  'title',
  'field_external_key',
  'field_summary',
  'field_price',
  'field_featured',
  'field_editor_pick',
  'field_sort_weight',
  'field_affiliate_url',
  'field_source_url',
  'field_category',
  'field_official_status',
  'field_fandom_tags',
  'field_taste',
  'field_editorial_flags',
];

$collectionHeaders = [
  'title',
  'field_external_key',
  'field_summary',
  'field_collection_type',
  'field_featured',
  'field_promote_to_home',
  'field_sort_weight',
  'field_featured_products',
];

$productRows = readCsvRows($stagingDir, 'products.csv');
$collectionRows = readCsvRows($stagingDir, 'collections.csv');
backfillExternalKeys('product', $productRows);
backfillExternalKeys('collection', $collectionRows);

$productFeedType = ensureFeedType(
  'products_csv',
  'Products CSV',
  'product',
  $productHeaders,
  [
    textMapping('field_external_key', 'field_external_key', TRUE),
    textMapping('title', 'title'),
    formattedTextMapping('field_summary', 'field_summary'),
    numericMapping('field_price', 'field_price'),
    numericMapping('field_featured', 'field_featured'),
    numericMapping('field_editor_pick', 'field_editor_pick'),
    numericMapping('field_sort_weight', 'field_sort_weight'),
    linkMapping('field_affiliate_url', 'field_affiliate_url'),
    linkMapping('field_source_url', 'field_source_url'),
    entityReferenceMapping('field_category', 'field_category', 'name'),
    entityReferenceMapping('field_official_status', 'field_official_status', 'name'),
    entityReferenceMapping('field_fandom_tags', 'field_fandom_tags', 'name'),
    entityReferenceMapping('field_taste', 'field_taste', 'name'),
    entityReferenceMapping('field_editorial_flags', 'field_editorial_flags', 'name'),
  ],
  ['field_fandom_tags', 'field_taste', 'field_editorial_flags']
);

$collectionFeedType = ensureFeedType(
  'collections_csv',
  'Collections CSV',
  'collection',
  $collectionHeaders,
  [
    textMapping('field_external_key', 'field_external_key', TRUE),
    textMapping('title', 'title'),
    formattedTextMapping('field_summary', 'field_summary'),
    textMapping('field_collection_type', 'field_collection_type'),
    numericMapping('field_featured', 'field_featured'),
    numericMapping('field_promote_to_home', 'field_promote_to_home'),
    numericMapping('field_sort_weight', 'field_sort_weight'),
    entityReferenceMapping('field_featured_products', 'field_featured_products', 'field_external_key'),
  ],
  ['field_featured_products']
);

$productSource = stageCsv($stagingDir, 'products.csv');
$collectionSource = stageCsv($stagingDir, 'collections.csv');

$productFeed = ensureFeed('Starter Products Import', $productFeedType->id(), $productSource);
$productFeed->import();

$collectionFeed = ensureFeed('Starter Collections Import', $collectionFeedType->id(), $collectionSource);
$collectionFeed->import();

print "Configured feed types:\n";
print "  - {$productFeedType->id()}\n";
print "  - {$collectionFeedType->id()}\n";
print "Imported feeds:\n";
print "  - {$productFeed->label()} ({$productFeed->id()}) from {$productSource}\n";
print "  - {$collectionFeed->label()} ({$collectionFeed->id()}) from {$collectionSource}\n";
print "Node counts:\n";
print '  - product total: ' . reportNodeCount('product') . "\n";
print '  - product starter keys: ' . reportExternalKeyCount('product', 'starter:') . "\n";
print '  - collection total: ' . reportNodeCount('collection') . "\n";
print '  - collection starter keys: ' . reportExternalKeyCount('collection', 'starter:') . "\n";

#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DRUPAL_DIR="$REPO_ROOT/drupal-backend"
PRODUCTS_CSV="$REPO_ROOT/setup/content/catalog/products.csv"
COLLECTIONS_CSV="$REPO_ROOT/setup/content/catalog/collections.csv"
FEED_HELPER="$REPO_ROOT/scripts/import_catalog_feeds.php"

ddev_hostname() {
  ddev describe -j | node -e "process.stdin.resume(); let d=''; process.stdin.on('data', c => d += c); process.stdin.on('end', () => { try { const o = JSON.parse(d); process.stdout.write(o.raw?.hostname ?? ''); } catch {} });"
}

if [ ! -d "$DRUPAL_DIR" ]; then
  echo "drupal-backend not found. Run setup first." >&2
  exit 1
fi

cd "$DRUPAL_DIR"

if ! ddev describe >/dev/null 2>&1; then
  echo "DDEV is not running. Start it with: cd drupal-backend && ddev start" >&2
  exit 1
fi

if ! [ -d "$DRUPAL_DIR/web/modules/contrib/feeds" ] || ! [ -d "$DRUPAL_DIR/web/modules/contrib/feeds_tamper" ]; then
  cat >&2 <<'EOF'
Feeds modules are not installed in the Drupal backend yet.
Install the dak_discovery_catalog recipe or require drupal/feeds and drupal/feeds_tamper before rerunning this script.
EOF
  exit 1
fi

echo "Enabling import-related modules..."
ddev exec drush en -y feeds feeds_tamper pathauto >/dev/null

PHP_SCRIPT="$(mktemp "$DRUPAL_DIR/.tmp-import-catalog-content.XXXXXX")"
PHP_SCRIPT_NAME="$(basename "$PHP_SCRIPT")"
cat >"$PHP_SCRIPT" <<'PHP'
<?php

$terms = [
  'product_category' => ['Apparel', 'Accessories', 'Collectibles', 'Home & Decor', 'Posters'],
  'fandom_tag' => ['Featured', 'Classic', 'New Release'],
  'taste' => ['Minimal', 'Bold', 'Premium', 'Budget'],
  'official_status' => ['Official', 'Unofficial', 'Unknown'],
  'editorial_flag' => ['Editor Pick', 'New', 'Giftable', 'Limited'],
];

foreach ($terms as $vocabulary => $names) {
  $storage = \Drupal::entityTypeManager()->getStorage('taxonomy_term');
  foreach ($names as $name) {
    $existing = $storage->loadByProperties([
      'vid' => $vocabulary,
      'name' => $name,
    ]);
    if (!empty($existing)) {
      print "exists: $vocabulary / $name\n";
      continue;
    }

    $term = \Drupal\taxonomy\Entity\Term::create([
      'vid' => $vocabulary,
      'name' => $name,
    ]);
    $term->save();
    print "created: $vocabulary / $name\n";
  }
}

print "\nThe repo helper will now create or update the Products CSV and Collections CSV feed types,\n";
print "stage the committed CSV files, and import them automatically. Use the Drupal UI only to review\n";
print "the resulting feed types and feed runs after this script finishes.\n";
PHP

echo "Seeding taxonomy terms..."
ddev exec drush php:script "$PHP_SCRIPT_NAME"
rm -f "$PHP_SCRIPT"

STAGING_DIR="$DRUPAL_DIR/.tmp-feeds-import"
FEED_SCRIPT_DEST="$DRUPAL_DIR/.tmp-import-catalog-feeds.php"
mkdir -p "$STAGING_DIR"
cp "$PRODUCTS_CSV" "$STAGING_DIR/products.csv"
cp "$COLLECTIONS_CSV" "$STAGING_DIR/collections.csv"
cp "$FEED_HELPER" "$FEED_SCRIPT_DEST"

TERM_SCRIPT="$(mktemp "$DRUPAL_DIR/.tmp-seed-catalog-terms.XXXXXX")"
TERM_SCRIPT_NAME="$(basename "$TERM_SCRIPT")"
cat >"$TERM_SCRIPT" <<'PHP'
<?php

$stagingDir = dirname(DRUPAL_ROOT) . '/.tmp-feeds-import';
$productsCsv = $stagingDir . '/products.csv';

if (!is_file($productsCsv)) {
  throw new RuntimeException("Products CSV file not found: $productsCsv");
}

$termColumns = [
  'field_category' => 'product_category',
  'field_official_status' => 'official_status',
  'field_fandom_tags' => 'fandom_tag',
  'field_taste' => 'taste',
  'field_editorial_flags' => 'editorial_flag',
];

$handle = fopen($productsCsv, 'rb');
if (!$handle) {
  throw new RuntimeException("Unable to read products CSV: $productsCsv");
}

$headers = fgetcsv($handle);
if (!is_array($headers)) {
  fclose($handle);
  return;
}

$terms = [];
foreach ($termColumns as $column => $vocabulary) {
  $terms[$vocabulary] = [];
}

while (($values = fgetcsv($handle)) !== FALSE) {
  $row = [];
  foreach ($headers as $index => $header) {
    $row[$header] = $values[$index] ?? '';
  }

  foreach ($termColumns as $column => $vocabulary) {
    foreach (explode('|', (string) ($row[$column] ?? '')) as $name) {
      $name = trim($name);
      if ($name !== '') {
        $terms[$vocabulary][$name] = TRUE;
      }
    }
  }
}
fclose($handle);

$storage = \Drupal::entityTypeManager()->getStorage('taxonomy_term');
foreach ($terms as $vocabulary => $names) {
  foreach (array_keys($names) as $name) {
    $existing = $storage->loadByProperties([
      'vid' => $vocabulary,
      'name' => $name,
    ]);
    if (!empty($existing)) {
      print "exists: $vocabulary / $name\n";
      continue;
    }

    $term = \Drupal\taxonomy\Entity\Term::create([
      'vid' => $vocabulary,
      'name' => $name,
    ]);
    $term->save();
    print "created: $vocabulary / $name\n";
  }
}
PHP

echo "Seeding taxonomy terms from staged catalog..."
ddev exec drush php:script "$TERM_SCRIPT_NAME"
rm -f "$TERM_SCRIPT"

echo "Configuring feed types and importing starter catalog..."
ddev exec drush php:script "$(basename "$FEED_SCRIPT_DEST")"
rm -f "$FEED_SCRIPT_DEST"

echo ""
echo "Committed CSV files:"
echo "  - $PRODUCTS_CSV"
echo "  - $COLLECTIONS_CSV"
echo ""
echo "Next steps:"
echo "  1. Open http://$(ddev_hostname)/admin/structure/feeds to review Products CSV and Collections CSV"
echo "  2. Open http://$(ddev_hostname)/admin/content/feed to review Starter Products Import and Starter Collections Import"
echo "  3. Verify JSON:API at http://$(ddev_hostname)/jsonapi/node/product and http://$(ddev_hostname)/jsonapi/node/collection"

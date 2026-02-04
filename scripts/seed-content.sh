#!/usr/bin/env bash
#
# Seed Content Script
# Creates sample pages in Drupal for the static site starter kit
#
# Usage:
#   ./scripts/seed-content.sh [project-name]
#
# If project-name is not provided, uses the parent directory name.
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}!${NC} $1"
}

# Get project name from argument or parent directory
PROJECT_NAME="${1:-$(basename "$(dirname "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")")}"

# Ensure we're in the drupal-backend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRUPAL_DIR="$SCRIPT_DIR/../drupal-backend"

if [ ! -d "$DRUPAL_DIR" ]; then
  print_error "drupal-backend directory not found. Run setup.sh first."
  exit 1
fi

cd "$DRUPAL_DIR"

# Check if DDEV is running
if ! ddev describe > /dev/null 2>&1; then
  print_error "DDEV is not running. Start it with: cd drupal-backend && ddev start"
  exit 1
fi

# Format project name for display (capitalize, replace hyphens with spaces)
DISPLAY_NAME=$(echo "$PROJECT_NAME" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1')

print_status "Creating sample content for: $DISPLAY_NAME"

# Create seed content via Drush php:eval using heredoc to avoid escaping issues
# Note: Using single-quoted delimiter 'PHPCODE' prevents shell variable expansion
ddev exec drush php:eval "$(cat <<'PHPCODE'
// Create sample pages for the starter kit
$pages = [
  [
    'title' => 'Homepage',
    'alias' => '/home',
    'body' => '<p>Welcome! This is your homepage.</p><p>Edit this content in Drupal, then run <code>npm run build</code> to rebuild your static site.</p>',
  ],
  [
    'title' => 'About Us',
    'alias' => '/about',
    'body' => '<p>This is the About page. Tell visitors about your organization, mission, and values.</p><p>Edit this content in Drupal to customize it for your needs.</p>',
  ],
  [
    'title' => 'Contact',
    'alias' => '/contact',
    'body' => '<p>Get in touch with us!</p><p>You can add contact information, a form, or directions here.</p>',
  ],
];

$created = 0;
$skipped = 0;

foreach ($pages as $page_data) {
  // Check if page with this alias already exists
  $path_storage = \Drupal::entityTypeManager()->getStorage('path_alias');
  $existing_alias = $path_storage->loadByProperties(['alias' => $page_data['alias']]);
  
  if (!empty($existing_alias)) {
    $skipped++;
    continue;
  }
  
  $node = \Drupal\node\Entity\Node::create([
    'type' => 'page',
    'title' => $page_data['title'],
    'body' => [
      'value' => $page_data['body'],
      'format' => 'basic_html',
    ],
    'path' => [
      'alias' => $page_data['alias'],
      'pathauto' => 0,
    ],
    'status' => 1,
    'uid' => 1,
  ]);
  $node->save();
  $created++;
}

echo "Created: $created pages, Skipped: $skipped (already exist)\n";
PHPCODE
)"

print_status "Sample content created successfully!"
echo ""
echo "Created pages:"
echo "  - Homepage (/home)"
echo "  - About (/about)"
echo "  - Contact (/contact)"
echo ""
echo "View content: http://$PROJECT_NAME.ddev.site/admin/content"


#!/usr/bin/env bash

set -e

# Navigate to the setup directory
cd setup

# Install dependencies
npm install

# Run the setup CLI with node
node cli.js

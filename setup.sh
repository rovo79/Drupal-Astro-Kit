
#!/usr/bin/env bash

set -e

# Navigate to the setup directory
cd setup

# Install dependencies
npm install

# Make cli.js executable and run it
chmod +x cli.js
./cli.js

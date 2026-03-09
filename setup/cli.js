#!/usr/bin/env node

import run from './ui.js';

try {
	await run();
} catch (error) {
	const message = error?.message ? String(error.message) : String(error);
	console.error(`\n❌ Setup failed: ${message}`);
	process.exit(1);
}

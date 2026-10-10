#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src/templates');
const destDir = path.join(__dirname, '../dist/templates');

try {
  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log('Templates copied to dist/templates');
} catch (err) {
  console.error('Failed to copy templates:', err);
  process.exit(1);
}

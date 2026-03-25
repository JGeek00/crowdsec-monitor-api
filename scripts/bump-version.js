#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const bumpType = process.argv[2];

if (!['major', 'minor', 'bugfix', 'beta'].includes(bumpType)) {
  console.error('Usage: node scripts/bump-version.js <major|minor|bugfix|beta>');
  process.exit(1);
}

const packagePath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const currentVersion = pkg.version;

const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-beta\.(\d+))?$/;
const match = currentVersion.match(versionRegex);

if (!match) {
  console.error(`Cannot parse version: ${currentVersion}`);
  process.exit(1);
}

const major = parseInt(match[1]);
const minor = parseInt(match[2]);
const bugfix = parseInt(match[3]);
const betaN = match[4] !== undefined ? parseInt(match[4]) : null;
const isBeta = betaN !== null;

let newVersion;

switch (bumpType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'bugfix':
    newVersion = `${major}.${minor}.${bugfix + 1}`;
    break;
  case 'beta':
    if (isBeta) {
      newVersion = `${major}.${minor}.${bugfix}-beta.${betaN + 1}`;
    } else {
      newVersion = `${major}.${minor}.${bugfix}-beta.1`;
    }
    break;
}

const changelogPath = path.join(__dirname, '..', 'changelog', `v${newVersion}.md`);
if (!fs.existsSync(changelogPath)) {
  console.error(`Changelog file not found: changelog/v${newVersion}.md`);
  process.exit(1);
}

execSync(`npm version ${newVersion}`, { stdio: 'inherit' });
console.log(`${currentVersion} → ${newVersion}`);

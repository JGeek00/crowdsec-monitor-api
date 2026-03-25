#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const bumpType = process.argv[2];
const betaMode = process.argv[3] === 'beta';

if (!['major', 'minor', 'bugfix', 'beta'].includes(bumpType)) {
  console.error('Usage: node scripts/bump-version.js <major|minor|bugfix|beta> [beta]');
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

if (bumpType === 'beta') {
  if (!isBeta) {
    console.error(`Current version ${currentVersion} is not a beta. Use bump-version:major:beta, bump-version:minor:beta or bump-version:bugfix:beta to start a new beta.`);
    process.exit(1);
  }
  newVersion = `${major}.${minor}.${bugfix}-beta.${betaN + 1}`;
} else {
  if (betaMode && isBeta) {
    console.error(`Current version ${currentVersion} is already a beta. Use bump-version:beta to increment the beta number.`);
    process.exit(1);
  }
  switch (bumpType) {
    case 'major':
      newVersion = (isBeta && !betaMode) ? `${major}.${minor}.${bugfix}` : betaMode ? `${major + 1}.0.0-beta.1` : `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = (isBeta && !betaMode) ? `${major}.${minor}.${bugfix}` : betaMode ? `${major}.${minor + 1}.0-beta.1` : `${major}.${minor + 1}.0`;
      break;
    case 'bugfix':
      newVersion = (isBeta && !betaMode) ? `${major}.${minor}.${bugfix}` : betaMode ? `${major}.${minor}.${bugfix + 1}-beta.1` : `${major}.${minor}.${bugfix + 1}`;
      break;
  }
}

const changelogPath = path.join(__dirname, '..', 'changelog', `v${newVersion}.md`);
if (!fs.existsSync(changelogPath)) {
  console.error(`Changelog file not found: changelog/v${newVersion}.md`);
  process.exit(1);
}

execSync(`npm version ${newVersion}`, { stdio: 'inherit' });
console.log(`${currentVersion} → ${newVersion}`);

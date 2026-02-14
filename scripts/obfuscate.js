const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const obfuscatedDir = path.join(__dirname, '../dist-obfuscated');

// Configuration for obfuscation
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false,
  debugProtectionInterval: 0,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.75,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

/**
 * Recursively get all .js files in a directory
 */
function getAllJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllJsFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Obfuscate a single file
 */
function obfuscateFile(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const obfuscationResult = JavaScriptObfuscator.obfuscate(code, obfuscationOptions);
    fs.writeFileSync(filePath, obfuscationResult.getObfuscatedCode());
    console.log(`✓ Obfuscated: ${path.relative(distDir, filePath)}`);
  } catch (error) {
    console.error(`✗ Error obfuscating ${filePath}:`, error.message);
  }
}

/**
 * Copy directory structure and files
 */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Remove directory recursively
 */
function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Main execution
console.log('Starting obfuscation process...\n');

// Check if dist directory exists
if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory not found. Run "npm run build:compile" first.');
  process.exit(1);
}

// Remove old obfuscated directory if exists
removeDir(obfuscatedDir);

// Copy dist to dist-obfuscated
console.log('Copying dist to dist-obfuscated...');
copyDir(distDir, obfuscatedDir);

// Get all JS files in obfuscated directory
const jsFiles = getAllJsFiles(obfuscatedDir);
console.log(`\nFound ${jsFiles.length} JavaScript files to obfuscate\n`);

// Obfuscate each file
jsFiles.forEach(obfuscateFile);

// Remove original dist and rename obfuscated
console.log('\nReplacing dist directory with obfuscated version...');
removeDir(distDir);
fs.renameSync(obfuscatedDir, distDir);

// Remove .d.ts files if any
const dtsFiles = getAllJsFiles(distDir).filter(f => f.endsWith('.d.ts'));
dtsFiles.forEach(file => {
  fs.unlinkSync(file);
});

console.log('\n✓ Obfuscation completed successfully!');
console.log(`✓ Build output: ${distDir}`);

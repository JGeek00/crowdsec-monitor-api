# Build Scripts

## obfuscate.js

This script obfuscates the compiled JavaScript code for production deployment.

### What it does

1. Reads all `.js` files from the `dist/` directory
2. Applies advanced obfuscation techniques to each file
3. Replaces the original `dist/` directory with obfuscated code

### Obfuscation Techniques

The script uses the following obfuscation methods:

- **Control Flow Flattening**: Transforms code structure to make it harder to understand
- **Dead Code Injection**: Adds non-functional code to confuse reverse engineering
- **String Array Encoding**: Encodes strings in base64 and stores them in arrays
- **Identifier Renaming**: Replaces variable and function names with hexadecimal names
- **Self Defending**: Prevents debugging by detecting and responding to DevTools
- **String Splitting**: Breaks strings into smaller chunks
- **Transform Object Keys**: Obfuscates object property names

### Configuration

Obfuscation settings can be modified in the `obfuscationOptions` object within the script.

**Note**: Higher obfuscation levels provide better protection but may impact performance.

### Manual Usage

```bash
# Compile TypeScript first
npm run build:compile

# Then obfuscate
npm run build:obfuscate
```

Or run both steps together:

```bash
npm run build
```

### Output

The obfuscated code is placed in the `dist/` directory, ready for production deployment.

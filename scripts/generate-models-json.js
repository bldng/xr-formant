#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsDir = path.join(__dirname, '../public/models');
const outputFile = path.join(modelsDir, 'models.json');

// Get all .gltf and .glb files
const modelFiles = fs.readdirSync(modelsDir)
  .filter(file => file.endsWith('.gltf') || file.endsWith('.glb'))
  .map(filename => ({
    name: filename.replace(/\.(gltf|glb)$/, '').replace(/[-_]/g, ' '),
    filename
  }));

// Write models.json
fs.writeFileSync(outputFile, JSON.stringify(modelFiles, null, 2));

console.log(`Generated models.json with ${modelFiles.length} models`);
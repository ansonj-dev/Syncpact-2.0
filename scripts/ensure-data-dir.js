#!/usr/bin/env node

// Ensure data directory exists before server starts
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const dbPath = process.env.DB_PATH || './data/syncpact.json';
const dataDir = dirname(dbPath);

if (!existsSync(dataDir)) {
  console.log(`Creating data directory: ${dataDir}`);
  mkdirSync(dataDir, { recursive: true });
  console.log('Data directory created successfully');
} else {
  console.log(`Data directory exists: ${dataDir}`);
}

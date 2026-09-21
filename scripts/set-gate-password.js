#!/usr/bin/env node
/* Set / change the shared password used by shared/gate.js.
   Usage:  node scripts/set-gate-password.js <new-password>
   Generates a fresh salt, derives PBKDF2-SHA256 (same params as gate.js)
   and rewrites `salt` / `hash` in shared/gate.js. Only the hash is stored. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const pw = process.argv[2];
if (!pw) {
  console.error('Usage: node scripts/set-gate-password.js <new-password>');
  process.exit(1);
}

const file = path.join(__dirname, '..', 'shared', 'gate.js');
let src = fs.readFileSync(file, 'utf8');

const iter = Number((src.match(/iter:\s*(\d+)/) || [])[1]);
if (!iter) { console.error('Cannot find iter in gate.js'); process.exit(1); }

const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(pw, Buffer.from(salt, 'hex'), iter, 32, 'sha256').toString('hex');

src = src
  .replace(/salt:\s*'[0-9a-f]*'/, `salt: '${salt}'`)
  .replace(/hash:\s*'[0-9a-f]*'/, `hash: '${hash}'`);
fs.writeFileSync(file, src);
console.log('gate.js updated. Commit + push to publish the new password.');

#!/usr/bin/env node
// Run this on the machine/server hosting the backend to mint FairyChat
// Premium redeem codes for friends who've paid you (however you collect
// that — UPI, cash, whatever). Each code is single-use.
//
// Usage:
//   node scripts/generate-premium-codes.js            # 1 code, lifetime
//   node scripts/generate-premium-codes.js 5           # 5 codes, lifetime
//   node scripts/generate-premium-codes.js 5 30        # 5 codes, 30 days each
const { createCodes } = require('../services/premiumService');

const count = Number(process.argv[2]) || 1;
const durationDays = process.argv[3] ? Number(process.argv[3]) : null;

const codes = createCodes(count, durationDays);
console.log(`Generated ${codes.length} FairyChat Premium code(s)${durationDays ? ` (${durationDays} days each)` : ' (lifetime)'}:\n`);
codes.forEach((c) => console.log('  ' + c));
console.log('\nHand these out one at a time — Settings -> FairyChat Premium -> Redeem Code.');

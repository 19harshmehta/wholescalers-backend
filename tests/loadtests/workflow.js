#!/usr/bin/env node

/**
 * Complete Load Test Workflow
 * 1. Setup database with test data
 * 2. Run all load tests
 * 3. Generate analysis reports
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TESTS_DIR = __dirname;
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function error(msg) {
  console.error(`${colors.red}❌ ${msg}${colors.reset}`);
}

async function runCommand(cmd, description) {
  return new Promise((resolve) => {
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(`▶ ${description}`, 'bright');
    log(`${'='.repeat(60)}\n`, 'cyan');

    try {
      execSync(cmd, { stdio: 'inherit', cwd: TESTS_DIR });
      log(`\n✅ ${description} - Complete\n`, 'green');
      resolve(true);
    } catch (err) {
      error(`${description} failed`);
      resolve(false);
    }
  });
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'bright');
  log('║         COMPLETE LOAD TEST WORKFLOW                       ║', 'bright');
  log('║  Setup Database → Run Tests → Analyze Results             ║', 'bright');
  log('╚════════════════════════════════════════════════════════════╝\n', 'bright');

  log(`Start Time: ${new Date().toISOString()}\n`, 'cyan');

  // Step 1: Setup Database
  log('STEP 1️⃣  : Setup Load Test Database', 'yellow');
  log('─'.repeat(60));
  const setupSuccess = await runCommand(
    `node setup-load-test-db.js`,
    'Setting up database with test data'
  );

  if (!setupSuccess) {
    error('Database setup failed. Aborting...');
    process.exit(1);
  }

  // Step 2: Wait a moment
  log('⏳ Waiting for database to settle...', 'blue');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 3: Run Load Tests
  log('\nSTEP 2️⃣  : Running Load Tests', 'yellow');
  log('─'.repeat(60));
  const testsSuccess = await runCommand(
    `node run-all-tests.js`,
    'Running all load tests'
  );

  if (!testsSuccess) {
    error('Load tests failed or had errors');
  }

  // Step 4: Analysis
  log('\nSTEP 3️⃣  : Analyzing Results', 'yellow');
  log('─'.repeat(60));
  await runCommand(
    `node analyze-results.js --latest`,
    'Analyzing latest test results'
  );

  // Final Summary
  log('\n' + '═'.repeat(60), 'cyan');
  log('WORKFLOW COMPLETE', 'cyan');
  log('═'.repeat(60) + '\n', 'cyan');

  log(`✅ End Time: ${new Date().toISOString()}\n`, 'green');

  log('📊 Next Steps:', 'yellow');
  log('   1. Check server logs for any issues', 'blue');
  log('   2. Review results in: tests/loadtests/results/', 'blue');
  log('   3. Generate HTML reports: npx artillery report <file.json>', 'blue');
  log('   4. Optimize slow endpoints based on findings\n', 'blue');
}

main().catch(err => {
  error(`Fatal error: ${err.message}`);
  process.exit(1);
});

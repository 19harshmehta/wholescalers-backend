#!/usr/bin/env node

/**
 * Load Test Results Analyzer
 * Parses and analyzes Artillery test results
 */

const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, 'results');

// Color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return Math.round(Math.abs(bytes) / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function analyzeResults(resultFile) {
  try {
    const data = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
    return {
      success: true,
      data: data
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

function printSummary(testName, data) {
  const stats = data?.aggregate || {};
  const rps = stats['rps.mean'] || 0;
  const latencyMean = stats['latency.mean'] || 0;
  const latencyP95 = stats['latency.p95'] || 0;
  const latencyP99 = stats['latency.p99'] || 0;
  const responseTimeMax = stats['latency.max'] || 0;
  const responseTimeMin = stats['latency.min'] || 0;

  const codes = stats['codes'] || {};
  const totalRequests = Object.values(codes).reduce((a, b) => a + b, 0);
  const successRequests = codes['200'] || codes['201'] || 0;
  const errorRequests = totalRequests - successRequests;

  log(`\n${'═'.repeat(70)}`, 'cyan');
  log(`Test: ${testName}`, 'bright');
  log(`${'═'.repeat(70)}`, 'cyan');

  log(`\n📊 THROUGHPUT METRICS`, 'magenta');
  log(`  RPS (Requests/sec): ${rps.toFixed(2)}`, 'yellow');
  log(`  Total Requests: ${totalRequests}`, 'blue');

  log(`\n⏱️  RESPONSE TIME METRICS (ms)`, 'magenta');
  log(`  Mean: ${latencyMean.toFixed(2)} ms`, 'yellow');
  log(`  P95: ${latencyP95.toFixed(2)} ms`, 'yellow');
  log(`  P99: ${latencyP99.toFixed(2)} ms`, 'yellow');
  log(`  Min: ${responseTimeMin.toFixed(2)} ms`, 'green');
  log(`  Max: ${responseTimeMax.toFixed(2)} ms`, 'red');

  log(`\n✓ SUCCESS RATE`, 'magenta');
  const successRate = totalRequests > 0 ? ((successRequests / totalRequests) * 100).toFixed(2) : 0;
  log(`  Successful: ${successRequests} (${successRate}%)`, 'green');
  log(`  Failed: ${errorRequests}`, 'red');

  log(`\n📡 HTTP STATUS CODES`, 'magenta');
  Object.entries(codes).forEach(([code, count]) => {
    const percentage = ((count / totalRequests) * 100).toFixed(2);
    const color = code.startsWith('2') ? 'green' : code.startsWith('4') ? 'yellow' : 'red';
    log(`  ${code}: ${count} (${percentage}%)`, color);
  });
}

function compareResults(resultFiles) {
  if (resultFiles.length < 2) {
    log('Need at least 2 result files to compare', 'yellow');
    return;
  }

  log(`\n${'═'.repeat(70)}`, 'cyan');
  log('COMPARATIVE ANALYSIS', 'bright');
  log(`${'═'.repeat(70)}\n`, 'cyan');

  const analyses = [];
  resultFiles.forEach(file => {
    const analysis = analyzeResults(file);
    if (analysis.success) {
      analyses.push({
        file: path.basename(file),
        data: analysis.data
      });
    }
  });

  if (analyses.length === 0) {
    log('No valid result files found', 'red');
    return;
  }

  // Compare key metrics
  log('Test File Comparison:', 'magenta');
  log(`${'─'.repeat(70)}`);

  const headers = ['File', 'RPS', 'Lat Avg', 'Lat P95', 'Lat P99', 'Success'];
  const rows = analyses.map(a => [
    path.basename(a.file, '.json'),
    (a.data?.aggregate?.['rps.mean'] || 0).toFixed(2),
    (a.data?.aggregate?.['latency.mean'] || 0).toFixed(0),
    (a.data?.aggregate?.['latency.p95'] || 0).toFixed(0),
    (a.data?.aggregate?.['latency.p99'] || 0).toFixed(0),
    ((a.data?.aggregate?.['codes']?.['200'] || 0) / Object.values(a.data?.aggregate?.['codes'] || {}).reduce((a, b) => a + b, 0) * 100).toFixed(1) + '%'
  ]);

  // Print table
  const colWidths = headers.map((h, i) => Math.max(h.length, Math.max(...rows.map(r => String(r[i]).length))));
  
  log(headers.map((h, i) => h.padEnd(colWidths[i])).join(' | '), 'bright');
  log(colWidths.map(w => '─'.repeat(w)).join('─┼─'), 'dim');
  rows.forEach(row => {
    log(row.map((cell, i) => String(cell).padEnd(colWidths[i])).join(' | '), 'yellow');
  });
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    log('Load Test Results Analyzer', 'bright');
    log('─'.repeat(50));
    log('\nUsage:', 'cyan');
    log('  node analyze-results.js <resultFile.json>         - Analyze single result', 'yellow');
    log('  node analyze-results.js <file1.json> <file2.json> - Compare results', 'yellow');
    log('  node analyze-results.js --latest                  - Analyze latest results', 'yellow');
    log('  node analyze-results.js --all                     - Analyze all results', 'yellow');
    return;
  }

  if (args[0] === '--latest') {
    if (!fs.existsSync(RESULTS_DIR)) {
      log('No results directory found', 'red');
      return;
    }

    const files = fs.readdirSync(RESULTS_DIR)
      .filter(f => f.endsWith('-result.json'))
      .map(f => path.join(RESULTS_DIR, f))
      .sort((a, b) => fs.statSync(b).mtime - fs.statSync(a).mtime)
      .slice(0, 1);

    if (files.length === 0) {
      log('No result files found', 'red');
      return;
    }

    const analysis = analyzeResults(files[0]);
    if (analysis.success) {
      printSummary(path.basename(files[0]), analysis.data);
    }
  } else if (args[0] === '--all') {
    if (!fs.existsSync(RESULTS_DIR)) {
      log('No results directory found', 'red');
      return;
    }

    const files = fs.readdirSync(RESULTS_DIR)
      .filter(f => f.endsWith('-result.json'))
      .map(f => path.join(RESULTS_DIR, f));

    if (files.length === 0) {
      log('No result files found', 'red');
      return;
    }

    files.forEach(file => {
      const analysis = analyzeResults(file);
      if (analysis.success) {
        printSummary(path.basename(file), analysis.data);
      }
    });

    // Compare all
    if (files.length > 1) {
      compareResults(files);
    }
  } else {
    // Analyze provided files
    const resultFiles = args.map(file => {
      if (path.isAbsolute(file)) {
        return file;
      }
      return path.join(RESULTS_DIR, file);
    });

    if (resultFiles.length === 1) {
      const analysis = analyzeResults(resultFiles[0]);
      if (analysis.success) {
        printSummary(path.basename(resultFiles[0]), analysis.data);
      } else {
        log(`Error: ${analysis.error}`, 'red');
      }
    } else {
      compareResults(resultFiles);
    }
  }
}

main();

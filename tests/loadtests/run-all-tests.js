#!/usr/bin/env node

/**
 * Master Load Test Runner
 * Runs all load tests sequentially and generates a comprehensive analysis report
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TESTS_DIR = __dirname;
const RESULTS_DIR = path.join(TESTS_DIR, 'results');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + Date.now();

// Create results directory if it doesn't exist
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

const testConfigs = [
  {
    name: 'Authentication Tests',
    file: 'auth-test.yml',
    outputFile: 'auth-test-result.json',
    priority: 1
  },
  {
    name: 'Product Management Tests',
    file: 'products-test.yml',
    outputFile: 'products-test-result.json',
    priority: 2
  },
  {
    name: 'Order Processing Tests',
    file: 'orders-test.yml',
    outputFile: 'orders-test-result.json',
    priority: 3
  },
  {
    name: 'Payment Processing Tests',
    file: 'payments-test.yml',
    outputFile: 'payments-test-result.json',
    priority: 4
  },
  {
    name: 'Invoice Management Tests',
    file: 'invoices-test.yml',
    outputFile: 'invoices-test-result.json',
    priority: 5
  },
  {
    name: 'Report Generation Tests',
    file: 'reports-test.yml',
    outputFile: 'reports-test-result.json',
    priority: 6
  },
  {
    name: 'Full System Integration Tests',
    file: 'full-system-test.yml',
    outputFile: 'full-system-test-result.json',
    priority: 7
  }
];

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  console.error(`${colors.red}ERROR: ${message}${colors.reset}`);
}

async function runTest(testConfig) {
  return new Promise((resolve) => {
    const outputPath = path.join(RESULTS_DIR, `${TIMESTAMP}_${testConfig.outputFile}`);
    const startTime = Date.now();

    log(`\n${'='.repeat(60)}`, 'cyan');
    log(`Running: ${testConfig.name}`, 'bright');
    log(`Test File: ${testConfig.file}`, 'blue');
    log(`Output: ${path.basename(outputPath)}`, 'blue');
    log(`${'='.repeat(60)}\n`, 'cyan');

    const cmd = `npx artillery run "${path.join(TESTS_DIR, testConfig.file)}" -o "${outputPath}"`;

    try {
      execSync(cmd, { stdio: 'inherit', cwd: TESTS_DIR });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      log(`✓ Completed in ${duration}s`, 'green');
      resolve({ ...testConfig, success: true, outputPath, duration });
    } catch (err) {
      error(`Failed to run ${testConfig.name}`);
      resolve({ ...testConfig, success: false, error: err.message });
    }
  });
}

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════╗', 'bright');
  log('║         LOAD TEST SUITE - MASTER RUNNER           ║', 'bright');
  log('╚════════════════════════════════════════════════════╝\n', 'bright');

  log(`Start Time: ${new Date().toISOString()}`, 'cyan');
  log(`Results Directory: ${RESULTS_DIR}`, 'cyan');
  log(`Session ID: ${TIMESTAMP}\n`, 'cyan');

  const results = [];
  const sortedTests = [...testConfigs].sort((a, b) => a.priority - b.priority);

  for (const testConfig of sortedTests) {
    const result = await runTest(testConfig);
    results.push(result);
  }

  generateReport(results);
}

function generateReport(results) {
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  log('\n\n╔════════════════════════════════════════════════════╗', 'bright');
  log('║              TEST EXECUTION SUMMARY               ║', 'bright');
  log('╚════════════════════════════════════════════════════╝\n', 'bright');

  results.forEach((result, index) => {
    const status = result.success ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
    const duration = result.success ? ` (${result.duration}s)` : '';
    log(`${index + 1}. ${result.name}: ${status}${duration}`, 'bright');
  });

  log(`\n${'─'.repeat(60)}`, 'dim');
  log(`Total Tests: ${results.length} | Passed: ${successCount} | Failed: ${failureCount}`, 'cyan');
  log(`${'─'.repeat(60)}\n`, 'dim');

  // Generate detailed report file
  const reportPath = path.join(RESULTS_DIR, `${TIMESTAMP}_summary-report.json`);
  const report = {
    timestamp: new Date().toISOString(),
    sessionId: TIMESTAMP,
    summary: {
      total: results.length,
      passed: successCount,
      failed: failureCount,
      successRate: ((successCount / results.length) * 100).toFixed(2) + '%'
    },
    tests: results.map(r => ({
      name: r.name,
      file: r.file,
      success: r.success,
      duration: r.duration,
      resultFile: r.outputPath ? path.basename(r.outputPath) : null,
      error: r.error || null
    }))
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`Report saved to: ${path.basename(reportPath)}`, 'green');

  // Generate HTML report
  generateHTMLReport(results, reportPath);

  // Create a summary text file for easy viewing
  const textReportPath = path.join(RESULTS_DIR, `${TIMESTAMP}_summary-report.txt`);
  const textReport = generateTextReport(results, report);
  fs.writeFileSync(textReportPath, textReport);
  log(`Text summary saved to: ${path.basename(textReportPath)}`, 'green');

  log(`\n${colors.bright}All results stored in: ${RESULTS_DIR}${colors.reset}`);
  log(`${colors.bright}To analyze individual tests, use:${colors.reset}`);
  log(`  npx artillery report <result-file.json>\n`, 'yellow');
}

function generateTextReport(results, report) {
  let text = `LOAD TEST EXECUTION REPORT\n`;
  text += `${'='.repeat(70)}\n\n`;
  text += `Session ID: ${report.sessionId}\n`;
  text += `Timestamp: ${report.timestamp}\n`;
  text += `${'─'.repeat(70)}\n\n`;

  text += `SUMMARY\n`;
  text += `${'─'.repeat(70)}\n`;
  text += `Total Tests: ${report.summary.total}\n`;
  text += `Passed: ${report.summary.passed}\n`;
  text += `Failed: ${report.summary.failed}\n`;
  text += `Success Rate: ${report.summary.successRate}\n`;
  text += `${'─'.repeat(70)}\n\n`;

  text += `TEST RESULTS\n`;
  text += `${'─'.repeat(70)}\n`;
  results.forEach((result, index) => {
    text += `\n${index + 1}. ${result.name}\n`;
    text += `   Status: ${result.success ? 'PASSED' : 'FAILED'}\n`;
    if (result.success) {
      text += `   Duration: ${result.duration}s\n`;
      text += `   Result File: ${path.basename(result.outputPath)}\n`;
    } else {
      text += `   Error: ${result.error}\n`;
    }
  });

  text += `\n${'='.repeat(70)}\n`;
  text += `Generated: ${new Date().toISOString()}\n`;

  return text;
}

function generateHTMLReport(results, reportPath) {
  const htmlPath = reportPath.replace('.json', '.html');
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  const totalDuration = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + parseFloat(r.duration || 0), 0)
    .toFixed(2);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Load Test Report - ${TIMESTAMP}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .header p {
            opacity: 0.9;
            font-size: 1.1em;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 40px;
            background: #f8f9fa;
        }
        .summary-card {
            background: white;
            padding: 25px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .summary-card .value {
            font-size: 2.5em;
            font-weight: bold;
            margin: 10px 0;
        }
        .summary-card .label {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .card-success .value { color: #28a745; }
        .card-failure .value { color: #dc3545; }
        .card-total .value { color: #667eea; }
        .card-rate .value { color: #17a2b8; }
        .content {
            padding: 40px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th {
            background: #f8f9fa;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #dee2e6;
            color: #333;
        }
        td {
            padding: 15px;
            border-bottom: 1px solid #dee2e6;
        }
        tr:hover {
            background: #f8f9fa;
        }
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.85em;
        }
        .badge-success {
            background: #d4edda;
            color: #155724;
        }
        .badge-failure {
            background: #f8d7da;
            color: #721c24;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px 40px;
            text-align: center;
            color: #666;
            font-size: 0.9em;
            border-top: 1px solid #dee2e6;
        }
        h2 {
            color: #333;
            margin-top: 30px;
            margin-bottom: 20px;
            font-size: 1.5em;
            border-left: 4px solid #667eea;
            padding-left: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ Load Test Report</h1>
            <p>Wholescalers Backend - Performance Testing</p>
            <p style="font-size: 0.9em; margin-top: 15px;">Session ID: ${TIMESTAMP}</p>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card card-total">
                <div class="label">Total Tests</div>
                <div class="value">${results.length}</div>
            </div>
            <div class="summary-card card-success">
                <div class="label">Passed</div>
                <div class="value">${successCount}</div>
            </div>
            <div class="summary-card card-failure">
                <div class="label">Failed</div>
                <div class="value">${failureCount}</div>
            </div>
            <div class="summary-card card-rate">
                <div class="label">Success Rate</div>
                <div class="value">${((successCount / results.length) * 100).toFixed(1)}%</div>
            </div>
            <div class="summary-card card-total">
                <div class="label">Total Duration</div>
                <div class="value">${totalDuration}s</div>
            </div>
        </div>

        <div class="content">
            <h2>📊 Test Results Details</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Test Name</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Output File</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map((result, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td><strong>${result.name}</strong></td>
                        <td>
                            <span class="status-badge ${result.success ? 'badge-success' : 'badge-failure'}">
                                ${result.success ? '✓ PASSED' : '✗ FAILED'}
                            </span>
                        </td>
                        <td>${result.success ? result.duration + 's' : 'N/A'}</td>
                        <td>${result.outputPath ? path.basename(result.outputPath) : '—'}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>

            <h2>📝 Instructions</h2>
            <p>To generate detailed HTML reports for individual tests, run:</p>
            <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">
npx artillery report results/${TIMESTAMP}_&lt;test-name&gt;-result.json</pre>
        </div>

        <div class="footer">
            <p>Generated: ${new Date().toISOString()}</p>
            <p>All results available in: <strong>tests/loadtests/results/</strong></p>
        </div>
    </div>
</body>
</html>
  `;

  fs.writeFileSync(htmlPath, html);
  log(`HTML report saved to: ${path.basename(htmlPath)}`, 'green');
}

// Run the tests
runAllTests().catch(err => {
  error(`Fatal error: ${err.message}`);
  process.exit(1);
});

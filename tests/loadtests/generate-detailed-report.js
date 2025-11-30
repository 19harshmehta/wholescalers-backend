#!/usr/bin/env node

/**
 * Detailed Load Test Report Generator
 * Creates comprehensive performance analysis reports
 */

const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, 'results');

function generateDetailedReport(resultFile) {
  try {
    const data = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
    const stats = data?.aggregate || {};

    const report = {
      timestamp: new Date().toISOString(),
      testFile: path.basename(resultFile),
      
      // Core Metrics
      throughput: {
        rps_mean: stats['rps.mean'] || 0,
        rps_max: stats['rps.max'] || 0,
        rps_min: stats['rps.min'] || 0,
        total_requests: Object.values(stats['codes'] || {}).reduce((a, b) => a + b, 0)
      },

      // Response Times
      response_time: {
        min_ms: stats['latency.min'] || 0,
        max_ms: stats['latency.max'] || 0,
        mean_ms: stats['latency.mean'] || 0,
        p50_ms: stats['latency.p50'] || 0,
        p75_ms: stats['latency.p75'] || 0,
        p90_ms: stats['latency.p90'] || 0,
        p95_ms: stats['latency.p95'] || 0,
        p99_ms: stats['latency.p99'] || 0,
        stddev_ms: stats['latency.stddev'] || 0
      },

      // Success/Failure
      status_codes: stats['codes'] || {},
      
      // Calculations
      success_rate: calculateSuccessRate(stats),
      throughput_efficiency: calculateThroughputEfficiency(stats),
      stability_score: calculateStabilityScore(stats),

      // Recommendations
      recommendations: generateRecommendations(stats)
    };

    return report;
  } catch (err) {
    console.error('Error reading result file:', err.message);
    return null;
  }
}

function calculateSuccessRate(stats) {
  const codes = stats['codes'] || {};
  const total = Object.values(codes).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const success = (codes['200'] || 0) + (codes['201'] || 0) + (codes['204'] || 0);
  return ((success / total) * 100).toFixed(2);
}

function calculateThroughputEfficiency(stats) {
  const rps = stats['rps.mean'] || 0;
  const latency = stats['latency.mean'] || 0;
  
  // Efficiency score: requests per second per ms of latency
  if (latency === 0) return 0;
  return (rps / (latency / 100)).toFixed(2);
}

function calculateStabilityScore(stats) {
  const mean = stats['latency.mean'] || 0;
  const stddev = stats['latency.stddev'] || 0;
  
  // Lower coefficient of variation = more stable
  if (mean === 0) return 100;
  const cv = stddev / mean;
  const stabilityScore = Math.max(0, 100 - (cv * 100));
  return stabilityScore.toFixed(2);
}

function generateRecommendations(stats) {
  const recommendations = [];
  const codes = stats['codes'] || {};
  const total = Object.values(codes).reduce((a, b) => a + b, 0);
  const errorCount = total - (codes['200'] || 0) - (codes['201'] || 0);
  const errorRate = (errorCount / total) * 100;
  const latencyP95 = stats['latency.p95'] || 0;
  const latencyP99 = stats['latency.p99'] || 0;

  if (errorRate > 5) {
    recommendations.push('⚠️  High error rate detected. Check server logs for issues.');
  }
  if (errorRate > 1 && errorRate <= 5) {
    recommendations.push('⚠️  Moderate error rate. Monitor system under sustained load.');
  }
  if (latencyP95 > 500) {
    recommendations.push('⚠️  P95 response time is high (>500ms). Consider optimization.');
  }
  if (latencyP99 > 1000) {
    recommendations.push('⚠️  P99 response time is very high (>1s). Investigate slow queries.');
  }
  if (latencyP95 < 200 && errorRate < 1) {
    recommendations.push('✓ Excellent performance metrics. System is well-optimized.');
  }
  if (latencyP95 < 300 && errorRate < 1) {
    recommendations.push('✓ Good performance. Meets typical SLA requirements.');
  }
  if (stats['rps.mean'] > 100) {
    recommendations.push('✓ High throughput achieved. System handles concurrent load well.');
  }

  return recommendations.length > 0 ? recommendations : ['→ System performing within normal parameters'];
}

function printDetailedReport(report) {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('║' + `DETAILED LOAD TEST ANALYSIS`.padStart(50).padEnd(78) + '║');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');

  console.log('\n📊 TEST FILE: ' + report.testFile);
  console.log('⏰ Generated: ' + report.timestamp);

  console.log('\n' + '─'.repeat(80));
  console.log('THROUGHPUT METRICS');
  console.log('─'.repeat(80));
  console.log(`Mean RPS:           ${report.throughput.rps_mean.toFixed(2)} requests/sec`);
  console.log(`Max RPS:            ${report.throughput.rps_max.toFixed(2)} requests/sec`);
  console.log(`Min RPS:            ${report.throughput.rps_min.toFixed(2)} requests/sec`);
  console.log(`Total Requests:     ${report.throughput.total_requests}`);

  console.log('\n' + '─'.repeat(80));
  console.log('RESPONSE TIME ANALYSIS (milliseconds)');
  console.log('─'.repeat(80));
  console.log(`Min:                ${report.response_time.min_ms.toFixed(2)} ms`);
  console.log(`Max:                ${report.response_time.max_ms.toFixed(2)} ms`);
  console.log(`Mean:               ${report.response_time.mean_ms.toFixed(2)} ms`);
  console.log(`P50 (Median):       ${report.response_time.p50_ms.toFixed(2)} ms`);
  console.log(`P75:                ${report.response_time.p75_ms.toFixed(2)} ms`);
  console.log(`P90:                ${report.response_time.p90_ms.toFixed(2)} ms`);
  console.log(`P95:                ${report.response_time.p95_ms.toFixed(2)} ms`);
  console.log(`P99:                ${report.response_time.p99_ms.toFixed(2)} ms`);
  console.log(`Std Dev:            ${report.response_time.stddev_ms.toFixed(2)} ms`);

  console.log('\n' + '─'.repeat(80));
  console.log('SUCCESS/FAILURE ANALYSIS');
  console.log('─'.repeat(80));
  console.log(`Success Rate:       ${report.success_rate}%`);
  
  Object.entries(report.status_codes).forEach(([code, count]) => {
    const percent = ((count / report.throughput.total_requests) * 100).toFixed(2);
    console.log(`HTTP ${code}:              ${count} (${percent}%)`);
  });

  console.log('\n' + '─'.repeat(80));
  console.log('PERFORMANCE SCORES');
  console.log('─'.repeat(80));
  console.log(`Throughput Efficiency: ${report.throughput_efficiency}`);
  console.log(`Stability Score:       ${report.stability_score}/100`);

  console.log('\n' + '─'.repeat(80));
  console.log('RECOMMENDATIONS');
  console.log('─'.repeat(80));
  report.recommendations.forEach(rec => {
    console.log(`${rec}`);
  });

  console.log('\n' + '═'.repeat(80) + '\n');
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node generate-detailed-report.js <result-file.json>');
  console.log('\nExample:');
  console.log('  node generate-detailed-report.js results/auth-test.json');
  process.exit(1);
}

const resultFile = args[0].startsWith('/') ? args[0] : path.join(RESULTS_DIR, args[0]);

if (!fs.existsSync(resultFile)) {
  console.error('Result file not found:', resultFile);
  process.exit(1);
}

const report = generateDetailedReport(resultFile);
if (report) {
  printDetailedReport(report);
  
  // Save JSON report
  const jsonReportPath = resultFile.replace('.json', '-detailed.json');
  fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));
  console.log(`Detailed report saved: ${path.basename(jsonReportPath)}\n`);
}

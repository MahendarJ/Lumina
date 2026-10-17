import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

import { LuminaAgent } from '../core/agent.js'
import { MockSandbox } from './sandbox.js'
import { BENCHMARK_SCENARIOS } from './scenarios.js'
import { evaluateRun } from './evaluator.js'

// Load .env if present
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ANSI color helpers
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bgGreen: '\x1b[42m\x1b[30m',
  bgRed: '\x1b[41m\x1b[37m',
}

function parseCliArgs() {
  const args = process.argv.slice(2)
  const isLive = args.includes('--live')
  const isVerbose = args.includes('--verbose')
  const categoryArg = args.find(a => a.startsWith('--category='))?.split('=')[1]
  const scenarioArg = args.find(a => a.startsWith('--scenario='))?.split('=')[1]

  return { isLive, isVerbose, category: categoryArg, scenarioId: scenarioArg }
}

async function runScenario(scenario, options) {
  const sandbox = new MockSandbox({
    memories: scenario.initialMemories || [],
    notes: scenario.initialNotes || [],
  })

  let agent

  if (options.isLive) {
    // Live mode: uses configured Groq API & default tools
    agent = new LuminaAgent({
      executeTool: sandbox.getToolExecutor(scenario.simulatedFailure),
      getMemories: () => sandbox.getMemories(),
    })
  } else {
    // Mock sandbox mode: fast, deterministic, zero-cost
    const mockLLM = sandbox.createMockLLMCaller({
      forceInfiniteToolCalls: scenario.forceInfiniteToolCalls,
    })

    agent = new LuminaAgent({
      customLLMCaller: mockLLM,
      executeTool: sandbox.getToolExecutor(scenario.simulatedFailure),
      getMemories: () => sandbox.getMemories(),
    })
  }

  const runResult = await agent.run(scenario.messages, {
    memories: scenario.initialMemories,
    sessionId: `eval_${scenario.id}`,
  })

  const evaluation = evaluateRun(scenario, runResult)

  return {
    scenario,
    runResult,
    evaluation,
  }
}

async function main() {
  const cli = parseCliArgs()

  console.log('\n' + colors.bold + colors.cyan + '===========================================================' + colors.reset)
  console.log(colors.bold + colors.cyan + '       ⚡ LUMINA AGENT EVALUATION & TEST HARNESS ⚡       ' + colors.reset)
  console.log(colors.bold + colors.cyan + '===========================================================' + colors.reset)
  console.log(`${colors.dim}Mode:${colors.reset} ${cli.isLive ? colors.yellow + 'LIVE (Real Groq API)' : colors.green + 'MOCK SANDBOX (In-memory, Zero-cost)'}${colors.reset}`)
  console.log(`${colors.dim}Target Scenarios:${colors.reset} ${BENCHMARK_SCENARIOS.length} defined`)
  console.log('')

  // Filter scenarios if requested
  let scenariosToRun = BENCHMARK_SCENARIOS
  if (cli.category) {
    scenariosToRun = scenariosToRun.filter(s => s.category === cli.category)
  }
  if (cli.scenarioId) {
    scenariosToRun = scenariosToRun.filter(s => s.id === cli.scenarioId)
  }

  if (scenariosToRun.length === 0) {
    console.log(colors.red + 'No scenarios matched your filter criteria.' + colors.reset)
    process.exit(1)
  }

  const results = []
  let passedCount = 0

  for (let i = 0; i < scenariosToRun.length; i++) {
    const sc = scenariosToRun[i]
    process.stdout.write(`[${i + 1}/${scenariosToRun.length}] Running ${colors.bold}${sc.id}${colors.reset}: ${sc.name}... `)

    try {
      const result = await runScenario(sc, cli)
      results.push(result)

      if (result.evaluation.passed) {
        passedCount++
        console.log(`${colors.green}${colors.bold}✓ PASS${colors.reset} (${result.evaluation.metrics.durationMs}ms, ${result.evaluation.metrics.totalLoops} loop(s))`)
      } else {
        console.log(`${colors.red}${colors.bold}✗ FAIL${colors.reset} (${result.evaluation.score}%)`)
      }

      // Print checks
      for (const check of result.evaluation.checks) {
        const mark = check.passed ? colors.green + '   ✓ ' : colors.red + '   ✗ '
        console.log(`${mark}${colors.dim}${check.name}:${colors.reset} ${check.message}`)
      }

      if (cli.isVerbose || !result.evaluation.passed) {
        console.log(`   ${colors.dim}Reply:${colors.reset} "${result.runResult.cleanText.slice(0, 120)}..."`)
        if (result.runResult.citations?.length) {
          console.log(`   ${colors.dim}Citations:${colors.reset} ${result.runResult.citations.map(c => c.url).join(', ')}`)
        }
      }
      console.log('')
    } catch (err) {
      console.log(`${colors.red}${colors.bold}✗ ERROR: ${err.message}${colors.reset}\n`)
      results.push({
        scenario: sc,
        runResult: null,
        evaluation: { passed: false, score: 0, error: err.message },
      })
    }
  }

  // Summary Scorecard Table
  console.log(colors.bold + '-----------------------------------------------------------' + colors.reset)
  console.log(colors.bold + '                  EVALUATION SCORECARD                     ' + colors.reset)
  console.log(colors.bold + '-----------------------------------------------------------' + colors.reset)

  const totalRuns = results.length
  const passRate = totalRuns ? Math.round((passedCount / totalRuns) * 100) : 0
  const avgDuration = totalRuns
    ? Math.round(results.reduce((sum, r) => sum + (r.evaluation.metrics?.durationMs || 0), 0) / totalRuns)
    : 0

  for (const r of results) {
    const status = r.evaluation.passed
      ? `${colors.green}✓ PASS${colors.reset}`
      : `${colors.red}✗ FAIL${colors.reset}`
    const id = r.scenario.id.padEnd(28, ' ')
    const cat = (r.scenario.category || '').padEnd(20, ' ')
    const duration = `${r.evaluation.metrics?.durationMs || 0}ms`.padStart(7, ' ')
    const score = `${r.evaluation.score}%`.padStart(5, ' ')
    console.log(`  ${status} | ${id} | ${cat} | ${score} | ${duration}`)
  }

  console.log(colors.bold + '-----------------------------------------------------------' + colors.reset)
  const badge = passRate === 100
    ? `${colors.bgGreen} ALL TESTS PASSED (100%) ${colors.reset}`
    : `${colors.bgRed} SOME CHECKS FAILED (${passRate}%) ${colors.reset}`

  console.log(`\n${badge}`)
  console.log(`Total: ${totalRuns} | Passed: ${passedCount} | Failed: ${totalRuns - passedCount} | Avg Latency: ${avgDuration}ms\n`)

  // Save report artifact to disk
  try {
    const reportsDir = path.join(__dirname, 'reports')
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }
    const reportPath = path.join(reportsDir, 'latest-eval-report.json')
    const reportData = {
      timestamp: new Date().toISOString(),
      mode: cli.isLive ? 'live' : 'mock',
      totalScenarios: totalRuns,
      passed: passedCount,
      failed: totalRuns - passedCount,
      passRate: `${passRate}%`,
      avgDurationMs: avgDuration,
      scenarios: results.map(r => ({
        id: r.scenario.id,
        name: r.scenario.name,
        category: r.scenario.category,
        passed: r.evaluation.passed,
        score: r.evaluation.score,
        checks: r.evaluation.checks,
        trajectory: r.runResult?.trajectory || null,
      })),
    }

    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf-8')
    console.log(`${colors.dim}Full evaluation report saved to: ${colors.reset}${colors.cyan}${reportPath}${colors.reset}\n`)
  } catch (err) {
    console.warn('Failed to save report file:', err.message)
  }

  if (passedCount < totalRuns) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal harness error:', err)
  process.exit(1)
})

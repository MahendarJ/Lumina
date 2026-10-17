// Evaluation logic and assertion engine for Lumina Agent Harness

export function evaluateRun(scenario, runResult) {
  const { trajectory, cleanText, citations } = runResult
  const exp = scenario.expectations || {}
  const checks = []

  // Check 1: Expected tools invoked
  if (exp.expectedTools !== undefined) {
    if (exp.expectedTools.length === 0) {
      const toolsCalled = trajectory.toolsUsed.length
      checks.push({
        name: 'Zero-tool check',
        passed: toolsCalled === 0,
        message: toolsCalled === 0
          ? 'Passed: No tools were called unnecessarily.'
          : `Failed: Expected no tool calls, but agent called: ${trajectory.toolsUsed.join(', ')}`,
      })
    } else {
      for (const expectedTool of exp.expectedTools) {
        const called = trajectory.toolsUsed.includes(expectedTool)
        checks.push({
          name: `Tool invoked: ${expectedTool}`,
          passed: called,
          message: called
            ? `Passed: Agent correctly invoked ${expectedTool}.`
            : `Failed: Expected tool "${expectedTool}" was not invoked. Tools invoked: ${trajectory.toolsUsed.join(', ') || 'none'}`,
        })
      }
    }
  }

  // Check 2: Prohibited tools NOT invoked
  if (exp.prohibitedTools && exp.prohibitedTools.length > 0) {
    for (const prohibited of exp.prohibitedTools) {
      const called = trajectory.toolsUsed.includes(prohibited)
      checks.push({
        name: `Tool prohibited: ${prohibited}`,
        passed: !called,
        message: !called
          ? `Passed: Prohibited tool ${prohibited} was not called.`
          : `Failed: Prohibited tool ${prohibited} was incorrectly called!`,
      })
    }
  }

  // Check 3: Citation checks
  if (exp.requireCitation) {
    const minCount = exp.minCitationsCount || 1
    const countPassed = citations && citations.length >= minCount
    checks.push({
      name: `Citations count (>= ${minCount})`,
      passed: countPassed,
      message: countPassed
        ? `Passed: Found ${citations.length} citation(s).`
        : `Failed: Expected at least ${minCount} citations, but found ${citations?.length || 0}.`,
    })

    if (exp.requireValidUrls && citations && citations.length > 0) {
      const validUrls = citations.every(c => c.url && (c.url.startsWith('http://') || c.url.startsWith('https://')))
      checks.push({
        name: 'Citation URL validity',
        passed: validUrls,
        message: validUrls
          ? 'Passed: All citation URLs are valid web addresses.'
          : 'Failed: Some citation URLs were malformed or missing protocols.',
      })
    }
  }

  // Check 4: Loop count & Safety Caps
  if (exp.maxLoops !== undefined) {
    const loopsPassed = trajectory.totalLoops <= exp.maxLoops
    checks.push({
      name: `Loop count (<= ${exp.maxLoops})`,
      passed: loopsPassed,
      message: loopsPassed
        ? `Passed: Agent completed in ${trajectory.totalLoops} loop(s).`
        : `Failed: Agent exceeded maximum loop threshold (${trajectory.totalLoops} > ${exp.maxLoops}).`,
    })
  }

  if (exp.expectSafetyCapReached) {
    const capReached =
      trajectory.status === 'limit_reached' ||
      trajectory.steps.some(s => s.type === 'safety_cap_reached')
    checks.push({
      name: 'Safety cap enforcement',
      passed: capReached,
      message: capReached
        ? 'Passed: Safety loop cap was properly enforced.'
        : `Failed: Agent did not halt at the safety cap (status was ${trajectory.status}).`,
    })
  }

  // Check 5: Content keywords in response
  if (exp.contentKeywords && exp.contentKeywords.length > 0) {
    const lowerText = (cleanText || '').toLowerCase()
    for (const kw of exp.contentKeywords) {
      const contains = lowerText.includes(kw.toLowerCase())
      checks.push({
        name: `Content keyword: "${kw}"`,
        passed: contains,
        message: contains
          ? `Passed: Final reply contained expected keyword "${kw}".`
          : `Failed: Final reply did not mention "${kw}". Reply was: "${cleanText.slice(0, 100)}..."`,
      })
    }
  }

  // Check 6: Tool failure handled gracefully
  if (exp.expectErrorHandled) {
    const hasToolStep = trajectory.steps.some(s => s.type === 'tool_calls')
    const completedSession = trajectory.status === 'completed' || trajectory.status === 'limit_reached'
    const errorHandled = hasToolStep && completedSession
    checks.push({
      name: 'Tool failure recovery',
      passed: errorHandled,
      message: errorHandled
        ? 'Passed: Agent caught tool error and concluded gracefully.'
        : 'Failed: Agent failed to handle the tool error properly.',
    })
  }

  const passedChecks = checks.filter(c => c.passed).length
  const totalChecks = checks.length
  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100
  const passed = passedChecks === totalChecks

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    category: scenario.category,
    passed,
    score,
    passedChecks,
    totalChecks,
    checks,
    metrics: {
      durationMs: trajectory.totalDurationMs,
      totalLoops: trajectory.totalLoops,
      toolsUsed: trajectory.toolsUsed,
      citationsCount: citations?.length || 0,
      confidence: runResult.confidence,
    },
  }
}

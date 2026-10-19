import { expect, test } from 'claude-code/testing'

// Patched in my-claude-skills: the desktop app never hands the progress tool to the model, so with
// autoOpen "any" a plain subagent launch has to start the flow that draws the band and its reopen button.

const PLUGIN = 'savvy-progress'
const band = { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 100, scroll: { offset: 0, bodyRows: 4 }, view: {} }
const launch = { tool: 'Agent', subagent_type: 'Explore', description: 'Count things', prompt: 'Count the things.' } as const

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: any subagent starts a Subagents band when autoOpen is any`, { options: { autoOpen: 'any' } }, async ($, on) => {
    on('ui.open', () => ({ value: { isPlaced: true } }))
    on('tool.call', { tool: 'Agent' }, () => ({ result: 'done' }))

    await $.tool.call(launch as never)

    const ui = await $.ui.mount({ plugin: PLUGIN, surface, component: 'AbovePrompt', props: band })
    expect(await ui.find({ key: 'savvy-agents' })).toBeDefined()
    if (surface === 'terminal') {
      expect(await ui.find({ text: /Subagents/ })).toBeDefined()
    } else {
      const alts = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.alt))
      expect(alts.some(alt => alt.startsWith('Subagents'))).toBe(true)
    }
  })

  // With nothing reported and no savvy worker, the mod leaves the band to the engine: mounting it draws nothing.
  test(`${surface}: with autoOpen savvy a plain subagent draws no band`, { options: { autoOpen: 'savvy' } }, async ($, on) => {
    on('tool.call', { tool: 'Agent' }, () => ({ result: 'done' }))

    await $.tool.call(launch as never)

    let drew = true
    try {
      await $.ui.mount({ plugin: PLUGIN, surface, component: 'AbovePrompt', props: band })
    } catch {
      drew = false
    }
    expect(drew).toBe(false)
  })
}

const { chromium } = require('playwright')
const { garmentPng } = require('./makepng.cjs')
const path = require('path')

const BASE = process.env.BASE || 'http://localhost:4173'
const SHOTS = path.join(__dirname, 'shots')

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function run() {
  // CHROMIUM_PATH lets a sandbox point at a preinstalled browser; otherwise
  // Playwright uses the one it downloaded.
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  )
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  })

  // Tab names can include a notification badge, so match loosely inside the nav.
  const tab = (name) => page.locator('nav').getByRole('button', { name: new RegExp(name) })

  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(String(e)))
  const badResponses = []
  page.on('response', (r) => {
    if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`)
  })

  // 1 — Onboarding ---------------------------------------------------------
  await page.goto(BASE, { waitUntil: 'networkidle' })
  check('onboarding renders', await page.getByText('Your closet,').isVisible())
  await page.screenshot({ path: `${SHOTS}/01-onboarding.png` })

  check(
    'demo can be entered without typing anything',
    await page.getByRole('button', { name: 'Show me the demo' }).isEnabled(),
  )

  await page.getByLabel('Your name').fill('Sheen')
  await page.getByRole('button', { name: "Let's go" }).click()
  await page.getByRole('heading', { name: 'What to wear' }).waitFor()
  check('signs in to the outfits screen', true)

  // A first-time viewer is walked through the app before anything else.
  check('guided tour opens for a first-time viewer', await page.getByText(/Tour . 1 of/).isVisible())
  await page.getByRole('button', { name: 'Next' }).click()
  await page.waitForTimeout(150)
  check('tour advances', await page.getByText(/Tour . 2 of/).isVisible())
  await page.getByRole('button', { name: 'Skip tour' }).click()
  await page.waitForTimeout(200)
  check('tour dismisses', (await page.getByText(/Tour . \d of/).count()) === 0)

  // 2 — Fit check inbox banner --------------------------------------------
  const banner = page.getByRole('button', { name: /Dolce Nicole needs a fit check/ })
  check('incoming fit check surfaces on home', await banner.isVisible())

  // 3 — Suggestions --------------------------------------------------------
  const cards = page.locator('article')
  const cardCount = await cards.count()
  check('outfit suggestions render', cardCount >= 4, `${cardCount} cards`)

  const firstCardText = await cards.first().innerText()
  check(
    'suggestions explain themselves',
    /neutral|pops|opposite|calm|worn|reads/i.test(firstCardText),
    firstCardText.split('\n').filter(Boolean)[1] || '',
  )
  await page.screenshot({ path: `${SHOTS}/02-outfits.png`, fullPage: false })

  // 4 — Filters ------------------------------------------------------------
  await page.getByRole('button', { name: 'Cold', exact: true }).click()
  await page.waitForTimeout(150)
  const coldCount = await page.locator('article').count()
  check('warmth filter still returns outfits', coldCount > 0, `${coldCount} for cold`)

  await page.getByRole('button', { name: 'Any', exact: true }).click()
  await page.getByRole('button', { name: 'Going out', exact: true }).click()
  await page.waitForTimeout(150)
  check('vibe filter returns outfits', (await page.locator('article').count()) > 0)
  await page.getByRole('button', { name: 'Any vibe' }).click()

  // 5 — Collab mode --------------------------------------------------------
  await page.getByRole('button', { name: "+ Dolce Nicole's" }).click()
  await page.waitForTimeout(200)
  const collabText = await page.locator('main').innerText()
  check(
    'collab mode mixes in the friend closet',
    /Uses \d+ of Dolce Nicole's/.test(collabText),
    (collabText.match(/Uses \d+ of Dolce Nicole's/) || [''])[0],
  )
  await page.screenshot({ path: `${SHOTS}/03-collab.png` })

  // 6 — Save an outfit -----------------------------------------------------
  await page.getByRole('button', { name: 'Save', exact: true }).first().click()
  await page.waitForTimeout(400)
  check('saving an outfit works', await page.getByRole('button', { name: 'Saved' }).first().isVisible())

  // 7 — Shuffle ------------------------------------------------------------
  const beforeShuffle = await page.locator('article').first().innerText()
  await page.getByRole('button', { name: 'Show me others' }).click()
  await page.waitForTimeout(200)
  const afterShuffle = await page.locator('article').first().innerText()
  check('shuffle produces different outfits', beforeShuffle !== afterShuffle)

  // 8 — Closet -------------------------------------------------------------
  await tab('Closet').click()
  await page.getByRole('heading', { name: 'My closet' }).waitFor()
  const countText = await page.locator('main header p').first().innerText()
  const startCount = parseInt(countText, 10)
  check('closet lists the seeded wardrobe', startCount > 25, countText)
  await page.screenshot({ path: `${SHOTS}/04-closet.png` })

  // 9 — Add an item (real photo → cutout → colour → tags → save) -----------
  await page.locator('header').getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByRole('dialog').waitFor()
  await page.locator('input[type=file]').setInputFiles({
    name: 'shirt.png',
    mimeType: 'image/png',
    buffer: garmentPng(600, 750, [34, 60, 120]),
  })
  await page.getByLabel('Item name').waitFor({ timeout: 8000 })
  const detected = await page.getByText(/^(navy|deep blue|blue)$/i).first().innerText()
  check('dominant colour detected from the photo', /navy|blue/i.test(detected), detected)

  await page.getByLabel('Item name').fill('Navy test shirt')
  await page.getByRole('button', { name: 'Dressy', exact: true }).click()
  await page.getByLabel('Size').fill('S')
  await page.screenshot({ path: `${SHOTS}/05-add-item.png` })
  await page.getByRole('button', { name: 'Save to closet' }).click()
  await page.waitForTimeout(700)

  const newCountText = await page.locator('main header p').first().innerText()
  check(
    'item saved to closet',
    parseInt(newCountText, 10) === startCount + 1,
    `${countText} → ${newCountText}`,
  )
  check('new item visible in grid', await page.getByText('Navy test shirt').first().isVisible())

  // 10 — Mark worn ---------------------------------------------------------
  await page.getByText('Navy test shirt').first().click()
  await page.getByRole('dialog').waitFor()
  check('item detail shows never worn', (await page.getByText('never worn').count()) > 0)
  await page.getByRole('button', { name: 'I wore this today' }).click()
  await page.waitForTimeout(500)
  await page.getByText('Navy test shirt').first().click()
  await page.getByRole('dialog').waitFor()
  const wornNow = await page.getByRole('dialog').innerText()
  check('wear tracking updates', /just now/.test(wornNow))
  await page.getByRole('dialog').getByLabel('Close').first().click()

  // 11 — Answer a fit check from Dolce Nicole's closet --------------------------
  await tab('Fit check').click()
  await page.getByRole('heading', { name: 'Fit check' }).waitFor()
  check('fit check request from Dolce Nicole listed', await page.getByText(/dinner thing at 7/).isVisible())
  await page.screenshot({ path: `${SHOTS}/06-fitchecks.png` })

  await page.getByRole('button', { name: 'Pick for them' }).click()
  await page.getByRole('dialog').waitFor()
  const pickable = page.getByRole('dialog').locator('button[aria-pressed]')
  const pickCount = await pickable.count()
  check("her closet is browsable to answer", pickCount > 10, `${pickCount} of her pieces`)
  await pickable.nth(0).click()
  await pickable.nth(6).click()
  await pickable.nth(10).click()
  await page.getByLabel('Say something').fill('this, with the gold chain')
  await page.screenshot({ path: `${SHOTS}/07-answer-fitcheck.png` })
  await page.getByRole('button', { name: /Send 3 pieces/ }).click()
  await page.waitForTimeout(600)
  check('fit check answered', (await page.getByText('Answered').count()) > 0)

  // 12 — Friends: code, friend closet, build & send ------------------------
  await tab('Friends').click()
  await page.getByRole('heading', { name: 'Friends' }).waitFor()
  check('invite code shown', await page.getByText('SHN482').isVisible())
  check('friend listed', await page.getByText('Dolce Nicole').first().isVisible())
  await page.screenshot({ path: `${SHOTS}/08-friends.png` })

  await page.getByRole('button', { name: /Dolce Nicole/ }).first().click()
  await page.getByRole('heading', { name: "Dolce Nicole's closet" }).waitFor()
  check('friend closet opens', true)

  // Borrow request from browse mode. Scope to the grid: the mode chips are
  // also aria-pressed buttons.
  const tiles = page.locator('main div.grid button[aria-pressed]')
  await tiles.first().click()
  await page.getByRole('dialog').waitFor()
  await page.getByLabel('Borrow note').fill('for Friday, back Sunday')
  await page.getByRole('button', { name: 'Ask to borrow' }).click()
  await page.waitForTimeout(600)
  check('borrow request sent', await page.getByText(/Asked Dolce Nicole for it/).isVisible())

  // Build an outfit for her, mixing in one of mine
  await page.getByRole('button', { name: 'Build for Dolce Nicole' }).click()
  await page.waitForTimeout(200)
  const herTiles = page.locator('main div.grid button[aria-pressed]')
  await herTiles.nth(1).click()
  await herTiles.nth(7).click()
  const yoursTile = page.locator('main div.grid button[aria-pressed]').filter({ hasText: 'Yours' }).first()
  await yoursTile.click()
  check('can mix your own piece into their outfit', await page.getByText(/3 pieces picked/).isVisible())
  await page.screenshot({ path: `${SHOTS}/09-build-for-friend.png` })

  await page.getByRole('button', { name: 'Send it' }).click()
  await page.getByRole('dialog').waitFor()
  await page.getByLabel('Note').fill('wear this Saturday, jacket is yours to borrow')
  await page.getByRole('button', { name: 'Send outfit' }).click()
  await page.waitForTimeout(600)
  check('outfit sent to friend', await page.getByText(/Sent to Dolce Nicole/).isVisible())

  // 13 — Borrow request appears on the Friends tab -------------------------
  await page.getByRole('button', { name: 'Back' }).click()
  await tab('Friends').click()
  await page.waitForTimeout(300)
  const friendsText = await page.locator('main').innerText()
  check('borrow request tracked', /things you asked for/i.test(friendsText))

  // 14 — Me ----------------------------------------------------------------
  await tab('You').click()
  await page.getByRole('heading', { name: 'Sheen' }).waitFor()
  const meText = await page.locator('main').innerText()
  check('profile shows wardrobe stats', /pieces/i.test(meText) && /gathering dust/i.test(meText))
  await page.screenshot({ path: `${SHOTS}/10-me.png` })

  // 15 — Persistence across reload ----------------------------------------
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'What to wear' }).waitFor()
  await tab('Closet').click()
  await page.waitForTimeout(300)
  check(
    'state survives a reload',
    await page.getByText('Navy test shirt').first().isVisible(),
  )

  check('no failed requests', badResponses.length === 0, badResponses.slice(0, 3).join(' | '))
  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '))

  await browser.close()

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  if (failed.length > 0) process.exitCode = 1
}

run().catch((e) => {
  console.error('RUNNER ERROR', e)
  process.exit(1)
})

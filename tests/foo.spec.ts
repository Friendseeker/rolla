import { test, expect } from '@playwright/test'


test('test', async ({ page }) => {
  // Go to https://rolla-new.netlify.app/
  await page.goto('https://rolla-new.netlify.app/') // placeholder url, will replace
  // with deploy preview url
  await page.waitForTimeout(2000) // bad, TODO find a better way

  // Click text=Choose a Clip
  // await page.click('text=Choose a Clip')
  // await sleep(1000)
  // Upload example.mp4
  await page.setInputFiles('input', 'tests/example.mp4')
  // Wait for download for start
  const download = await page.waitForEvent('download')
  // Check if a file is downloaded && has the correct filename.
  expect(download.suggestedFilename()).toBe('result.fcpxml')
})

// Currently still broken
// Issues:
// 1: Firefox nightly does not support SharedArrayBuffer
// 2: Chromium does not resolve video duration properly.

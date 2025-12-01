import { test, expect } from '@playwright/test'

test.describe('SmartGrid responsive behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('displays correctly on desktop', async ({ page }) => {
    // Switch all demos to Smart view
    await page.locator('[data-target="demo1"] [data-mode="smart"]').click()
    await page.locator('[data-target="demo2"] [data-mode="smart"]').click()
    await page.locator('[data-target="demo3"] [data-mode="smart"]').click()

    // First example: 4 items should be 2x2
    const demo1Grid = page.locator('#demo1-smart')
    await expect(demo1Grid).toBeVisible()

    // Check grid-columns CSS variable is set to 2
    const gridColumns = await demo1Grid.evaluate((el) => getComputedStyle(el).getPropertyValue('--grid-columns').trim())
    expect(gridColumns).toBe('2')

    // Visual regression test
    await expect(page).toHaveScreenshot('full-page.png', { fullPage: true })
  })

  test('rebalances on narrow viewport', async ({ page }) => {
    // Responsive example at bottom of page (not the hidden demo4-mixed)
    const responsiveGrid = page.locator('smart-grid[style*="--smart-grid-min-width"]:not([hidden])').last()
    await expect(responsiveGrid).toBeVisible()

    // Get the effective columns
    const effectiveColumns = await responsiveGrid.evaluate((el: HTMLElement & { effectiveColumns?: number }) => {
      return el.effectiveColumns ?? 0
    })

    // On desktop (1280px), should have 3 columns max
    // On tablet (768px), might have fewer
    // On mobile (390px), should have 1-2 columns
    expect(effectiveColumns).toBeGreaterThan(0)
  })

  test('adjusts columns based on viewport width', async ({ page, browserName }, testInfo) => {
    // Responsive example at bottom of page (not the hidden demo4-mixed)
    const responsiveGrid = page.locator('smart-grid[style*="--smart-grid-min-width"]:not([hidden])').last()
    await expect(responsiveGrid).toBeVisible()

    const effectiveColumns = await responsiveGrid.evaluate((el: HTMLElement & { effectiveColumns?: number }) => {
      return el.effectiveColumns ?? 0
    })

    const projectName = testInfo.project.name

    if (projectName === 'desktop') {
      // Desktop (1280px): 25ch is roughly 400px, so 3 columns should fit
      expect(effectiveColumns).toBeGreaterThanOrEqual(2)
    } else if (projectName === 'tablet') {
      // Tablet (768px): 25ch = ~400px, so 1-2 columns
      expect(effectiveColumns).toBeGreaterThanOrEqual(1)
    } else if (projectName === 'mobile') {
      // Mobile (390px): 25ch = ~400px, only 1 column fits
      expect(effectiveColumns).toBe(1)
    }
  })

  test('4-item grid shows 2x2 layout', async ({ page }) => {
    await page.locator('[data-target="demo1"] [data-mode="smart"]').click()

    const demo1Grid = page.locator('#demo1-smart')
    const items = demo1Grid.locator('> div')

    // Should have 4 items
    await expect(items).toHaveCount(4)

    // Grid should be set to 2 columns
    const gridColumns = await demo1Grid.evaluate((el) => getComputedStyle(el).getPropertyValue('--grid-columns').trim())
    expect(gridColumns).toBe('2')
  })

  test('5-item grid keeps 3+2 layout with expansion', async ({ page }) => {
    await page.locator('[data-target="demo2"] [data-mode="smart"]').click()

    const grid = page.locator('#demo2-smart')
    const items = grid.locator('> div')

    // Should have 5 items
    await expect(items).toHaveCount(5)

    // 5 items in 3 columns = 3+2
    // Grid uses LCM(3,2)=6 columns, first row items span 2, second row items span 3
    const gridColumns = await grid.evaluate((el) => getComputedStyle(el).getPropertyValue('--grid-columns').trim())
    expect(gridColumns).toBe('6')

    // First 3 items span 2 each
    const firstItemSpan = await items.first().evaluate((el) => el.style.gridColumn)
    expect(firstItemSpan).toBe('span 2')

    // Last 2 items span 3 each (expanded to fill row)
    const fourthItemSpan = await items.nth(3).evaluate((el) => el.style.gridColumn)
    expect(fourthItemSpan).toBe('span 3')
  })

  test('7-item grid shows 3+2+2 layout', async ({ page }) => {
    await page.locator('[data-target="demo3"] [data-mode="smart"]').click()

    const grid = page.locator('#demo3-smart')
    const items = grid.locator('> div')

    // Should have 7 items
    await expect(items).toHaveCount(7)

    // Grid should use LCM-based columns (6)
    const gridColumns = await grid.evaluate((el) => getComputedStyle(el).getPropertyValue('--grid-columns').trim())
    expect(gridColumns).toBe('6')

    // First 3 items should span 2 columns each
    const firstItemSpan = await items.first().evaluate((el) => el.style.gridColumn)
    expect(firstItemSpan).toBe('span 2')

    // Items 4-7 should span 3 columns each (2 per row)
    const fourthItemSpan = await items.nth(3).evaluate((el) => el.style.gridColumn)
    expect(fourthItemSpan).toBe('span 3')
  })

  test('fill="equal-extra" (default) - items fill row width', async ({ page }) => {
    const grid = page.locator('#demo5-expand')
    const items = grid.locator('> div')

    await expect(grid).toBeVisible()
    await expect(items).toHaveCount(7)

    // 7 items → [3, 2, 2] with gridColumns=6
    // Row 1: span 2, Rows 2-3: span 3 (expanded)
    const firstItemSpan = await items.first().evaluate((el) => el.style.gridColumn)
    expect(firstItemSpan).toBe('span 2')

    const fourthItemSpan = await items.nth(3).evaluate((el) => el.style.gridColumn)
    expect(fourthItemSpan).toBe('span 3')

    await expect(grid).toHaveScreenshot('fill-expand.png')
  })

  test('fill="none" - items keep original size', async ({ page }) => {
    await page.locator('[data-target="demo5"] [data-mode="none"]').click()

    const grid = page.locator('#demo5-none')
    const items = grid.locator('> div')

    await expect(grid).toBeVisible()
    await expect(items).toHaveCount(7)

    // fill="none": items keep size 1, no expansion
    // All items have span 1 (or no span set)
    const spans = await items.evaluateAll((els) => els.map((el) => (el as HTMLElement).style.gridColumn))
    spans.forEach((span) => {
      expect(span === '' || span === 'span 1').toBe(true)
    })

    await expect(grid).toHaveScreenshot('fill-none.png')
  })

  test('fill-last="none" - last row keeps same width, middle row expands', async ({ page }) => {
    await page.locator('[data-target="demo6"] [data-mode="none"]').click()

    const grid = page.locator('#demo6-none')
    const items = grid.locator('> div')

    await expect(grid).toBeVisible()
    await expect(items).toHaveCount(7)

    // 7 items: [3, 2, 2] layout, gridColumns = 6 (lcm of 3 and 2)
    const gridColumns = await grid.evaluate((el) => getComputedStyle(el).getPropertyValue('--grid-columns').trim())
    expect(gridColumns).toBe('6')

    // Row 1 (3 items): each gets span 2
    const firstItemSpan = await items.first().evaluate((el) => el.style.gridColumn)
    expect(firstItemSpan).toBe('span 2')

    // Row 2 (2 items, NOT last): each gets span 3 (expanded)
    const fourthItemSpan = await items.nth(3).evaluate((el) => el.style.gridColumn)
    expect(fourthItemSpan).toBe('span 3')

    // Row 3 (2 items, last) with fill-last="none": span 2 (same as row 1, NOT expanded)
    const sixthItemSpan = await items.nth(5).evaluate((el) => el.style.gridColumn)
    expect(sixthItemSpan).toBe('span 2')

    const seventhItemSpan = await items.nth(6).evaluate((el) => el.style.gridColumn)
    expect(seventhItemSpan).toBe('span 2')
  })

  test('mixed item sizes with data-size attribute', async ({ page }, testInfo) => {
    await page.locator('[data-target="demo4"] [data-mode="mixed"]').click()

    const grid = page.locator('#demo4-mixed')
    const items = grid.locator('> div')

    await expect(grid).toBeVisible()
    // Wait for ResizeObserver to trigger layout (50ms debounce + buffer)
    await page.waitForTimeout(100)
    await expect(items).toHaveCount(8)

    // Check that items have correct data-size attributes
    const sizes = await items.evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.size || 'small'))
    expect(sizes).toEqual(['large', 'small', 'medium', 'medium', 'small', 'small', 'small', 'small'])

    const effectiveColumns = await grid.evaluate(
      (el: HTMLElement & { effectiveColumns?: number }) => el.effectiveColumns ?? 0,
    )

    const projectName = testInfo.project.name

    // With per-size min-widths, large items (450px / 3 units = 150px per unit) are most restrictive
    // Demo page has max-width: 900px, so container is ~836px on desktop
    // Columns = floor(width / minWidthPerUnit)
    if (projectName === 'desktop') {
      // ~836px / 150px ≈ 5, capped at columns="4"
      expect(effectiveColumns).toBeLessThanOrEqual(4)
      expect(effectiveColumns).toBeGreaterThanOrEqual(3)
    } else if (projectName === 'tablet') {
      // ~704px / 150px ≈ 4
      expect(effectiveColumns).toBeGreaterThanOrEqual(2)
      expect(effectiveColumns).toBeLessThanOrEqual(4)
    } else if (projectName === 'mobile') {
      // ~326px / 150px ≈ 2
      expect(effectiveColumns).toBeGreaterThanOrEqual(1)
      expect(effectiveColumns).toBeLessThanOrEqual(3)
    }
  })
})

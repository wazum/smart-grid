/**
 * Vitest setup file for JSDOM environment.
 *
 * JSDOM doesn't implement all browser APIs. This file polyfills
 * the missing APIs that our web components need.
 *
 * @see https://mantine.dev/guides/vitest/
 * @see https://github.com/element-plus/element-plus/blob/dev/vitest.setup.ts
 */
import { vi } from 'vitest'
import ResizeObserver from 'resize-observer-polyfill'

vi.stubGlobal('ResizeObserver', ResizeObserver)

// Register the SmartGrid custom element
import './src/smart-grid'

import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const url = process.env.ROOM_URL ?? 'http://127.0.0.1:5174/';
const outputDir = new URL('../artifacts/', import.meta.url);

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 }
];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas.studio-canvas');
    await page.waitForSelector('.control-panel[data-mode="agent"]');
    await page.waitForTimeout(900);

    const stats = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.studio-canvas');
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error('Canvas not found');
      }

      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      if (!gl) {
        throw new Error('WebGL context not available');
      }

      const width = canvas.width;
      const height = canvas.height;
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      const colors = new Set();
      let opaqueSamples = 0;
      let brightSamples = 0;
      const stepX = Math.max(1, Math.floor(width / 80));
      const stepY = Math.max(1, Math.floor(height / 80));

      for (let y = 0; y < height; y += stepY) {
        for (let x = 0; x < width; x += stepX) {
          const index = (y * width + x) * 4;
          const r = pixels[index];
          const g = pixels[index + 1];
          const b = pixels[index + 2];
          const a = pixels[index + 3];
          colors.add(`${r >> 4}-${g >> 4}-${b >> 4}-${a >> 4}`);
          opaqueSamples += a > 0 ? 1 : 0;
          brightSamples += r + g + b > 72 ? 1 : 0;
        }
      }

      return {
        width,
        height,
        uniqueColorBuckets: colors.size,
        opaqueSamples,
        brightSamples
      };
    });

    if (stats.uniqueColorBuckets < 24 || stats.brightSamples < 100) {
      throw new Error(`${viewport.name} canvas looks blank: ${JSON.stringify(stats)}`);
    }

    const canvasBox = await page.locator('canvas.studio-canvas').boundingBox();
    if (!canvasBox) {
      throw new Error(`${viewport.name} canvas has no bounding box`);
    }

    const agentPoint = await page.evaluate(() => {
      const point = window.__agentStudioDebug?.getAgentScreenPosition('builder');
      if (!point) {
        throw new Error('Agent debug screen position unavailable');
      }
      return point;
    });

    await page.mouse.move(agentPoint.x, agentPoint.y);
    await page.waitForTimeout(250);
    await page.mouse.click(agentPoint.x, agentPoint.y);
    await page.waitForSelector('.control-panel[data-mode="agent"]');

    const panelText = await page.locator('.control-panel').innerText();
    if (!panelText.includes('Сборщик')) {
      throw new Error(`${viewport.name} agent click did not select Builder panel`);
    }

    await page.locator('[data-panel-action="pause"]').click();
    await page.waitForFunction(() => document.querySelector('.control-panel')?.textContent?.includes('Пауза'));
    await page.locator('[data-panel-action="escalate"]').click();
    await page.waitForFunction(() => document.querySelector('.control-panel')?.textContent?.includes('Блокер'));
    await page.locator('[data-panel-action="complete"]').click();
    await page.waitForFunction(() => document.querySelector('.control-panel')?.textContent?.includes('Готово'));
    await page.locator('[data-panel-action="assign"]').click();
    await page.waitForFunction(() => document.querySelector('.control-panel')?.textContent?.includes('В работе'));

    await page.locator('[data-action="simulation"]').click();
    await page.locator('[data-action="overview"]').click();
    await page.waitForSelector('.control-panel[data-mode="overview"]');
    await page.locator('[data-action="focus"]').click();
    await page.locator('[data-action="reset"]').click();
    await page.waitForTimeout(450);

    const screenshotPath = fileURLToPath(new URL(`./${viewport.name}.png`, outputDir));
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const activeButtons = await page.locator('.dock-button.is-active').count();
    if (activeButtons < 1) {
      throw new Error(`${viewport.name} controls did not update`);
    }

    if (consoleErrors.length || pageErrors.length) {
      throw new Error(
        `${viewport.name} browser errors: ${JSON.stringify({ consoleErrors, pageErrors })}`
      );
    }

    results.push({ viewport: viewport.name, stats, screenshot: screenshotPath });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ ok: true, url, results }, null, 2));

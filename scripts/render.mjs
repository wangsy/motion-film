// node src/render.mjs [start] [end] [workers] — renders frames [start,end) to out/frames/%04d.png
import puppeteer from 'puppeteer';
import fs from 'node:fs'; import path from 'node:path';
const [start = 0, end = 900, workers = 8] = process.argv.slice(2).map(Number);
const timing = JSON.parse(fs.readFileSync('timing.json', 'utf8'));
fs.mkdirSync('out/frames', { recursive: true });
const browser = await puppeteer.launch({ headless: 'shell', args: ['--force-device-scale-factor=1', '--font-render-hinting=none'] });
const url = 'file://' + path.resolve('src/scene.html');
let next = start;
await Promise.all([...Array(workers)].map(async () => {
  const page = await browser.newPage(); await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(url); await page.evaluate(t => { window.setTiming(t); return document.fonts.ready; }, timing);
  while (next < end) { const f = next++;
    const b64 = await page.evaluate(f => { renderFrame(f); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, f);
    fs.writeFileSync(`out/frames/${String(f).padStart(4, '0')}.png`, Buffer.from(b64, 'base64')); }
}));
await browser.close(); console.log(`rendered ${start}..${end - 1}`);

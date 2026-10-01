async (page) => {
  const root = '/Users/weisfx/Desktop/VIBE-CODE/Sharing/output/playwright';
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.reload();
  await page.keyboard.press('Home');
  const results = [];
  for (let i = 0; i < 7; i++) {
    if (i) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(320);
    const result = await page.evaluate(() => {
      const active = document.querySelector('.slide.active');
      const r = active.getBoundingClientRect();
      const out = [];
      for (const node of active.querySelectorAll('p,h1,h2,img,.year-label,.people-names')) {
        const n = node.getBoundingClientRect();
        if (n.left < r.left - 1 || n.top < r.top - 1 || n.right > r.right + 1 || n.bottom > r.bottom + 1) {
          out.push({ tag: node.tagName, text: node.textContent.slice(0, 70) });
        }
      }
      const brokenImages = [...active.querySelectorAll('img')].filter(n => !n.complete || !n.naturalWidth).length;
      const text = active.innerText;
      return {
        title: active.dataset.title,
        counter: document.getElementById('counter').textContent,
        zh: /[\u4e00-\u9fff]/.test(text),
        en: active.querySelectorAll('[lang="en"]').length,
        vi: active.querySelectorAll('[lang="vi"]').length,
        out,
        brokenImages
      };
    });
    await page.screenshot({ path: `${root}/slide-${i + 1}.png` });
    results.push(result);
  }
  await page.keyboard.press('ArrowRight');
  const lastPageClamp = await page.locator('#counter').innerText() === '07 / 07';
  await page.keyboard.press('Home');
  const homeWorks = await page.locator('#counter').innerText() === '01 / 07';
  await page.keyboard.press('ArrowLeft');
  const firstPageClamp = await page.locator('#counter').innerText() === '01 / 07';
  await page.keyboard.press('n');
  const notesOpen = await page.locator('#notes').isVisible();
  await page.keyboard.press('Escape');
  const notesClose = await page.locator('#notes').isHidden();
  await page.keyboard.press('f');
  await page.waitForTimeout(300);
  const fullscreenWorks = await page.evaluate(() => Boolean(document.fullscreenElement));
  if (fullscreenWorks) await page.keyboard.press('f');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(200);
  const fit = await page.evaluate(() => {
    const r = document.getElementById('stage').getBoundingClientRect();
    return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, fits: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight - 62 + 1 };
  });
  await page.screenshot({ path: `${root}/projector-1280.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  const mobileFit = await page.evaluate(() => {
    const r = document.getElementById('stage').getBoundingClientRect();
    return { x: r.x, right: r.right, fits: r.left >= -1 && r.right <= innerWidth + 1 };
  });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.keyboard.press('Home');
  return { results, controls: { firstPageClamp, lastPageClamp, homeWorks, notesOpen, notesClose, fullscreenWorks }, fit, mobileFit };
}

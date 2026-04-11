const fs = require('fs');
const path = require('path');
jest.setTimeout(30000);

const htmlPath = path.join(__dirname, '..', 'index.html');

const { JSDOM, VirtualConsole } = require('jsdom');

async function loadApp() {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('error', () => {});

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost/',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.setInterval = () => 0;
      window.__TEST__ = true;
    },
  });

  return new Promise((resolve) => {
    if (dom.window.document.readyState === 'complete') {
      resolve(dom);
    } else {
      dom.window.addEventListener('load', () => resolve(dom));
    }
  });
}

describe('Molly game logic', () => {
  let dom;
  let window;
  let game;

  beforeEach(async () => {
    dom = await loadApp();
    window = dom.window;
    game = window.mollyGame;
    window.localStorage.clear();
  });

  afterEach(() => {
    if (dom && dom.window) {
      dom.window.close();
    }
  });

  test('applies offline decay over elapsed time', () => {
    const { gameState, applyOfflineDecay } = game;
    gameState.stats = { food: 100, mood: 100, rest: 100, life: 100 };
    gameState.lastUpdate = Date.now() - 60 * 60 * 1000;

    applyOfflineDecay();

    expect(gameState.stats.food).toBe(70);
    expect(gameState.stats.mood).toBe(70);
    expect(gameState.stats.rest).toBe(70);
    expect(gameState.stats.life).toBe(85);
  });

  test('performs actions while clamping stats within bounds', () => {
    const { gameState, performAction } = game;
    gameState.stats = { food: 95, mood: 90, rest: 5, life: 50 };

    performAction('play');

    expect(gameState.stats.mood).toBe(100);
    expect(gameState.stats.rest).toBe(0);
    expect(window.document.getElementById('restBar').style.width).toBe('0%');
    expect(window.document.getElementById('moodBar').style.width).toBe('100%');
  });

  test('buys shop items only when enough hearts and caps stats', () => {
    const { gameState, buyItem } = game;
    gameState.hearts = 150;
    gameState.stats.food = 10;

    buyItem('feast', 100);

    expect(gameState.hearts).toBe(50);
    expect(gameState.stats.food).toBe(100);

    buyItem('mouse', 200);
    expect(gameState.hearts).toBe(50);
  });

  test('unlocks memories when paying the required hearts', () => {
    const { gameState, unlockMemory } = game;
    const targetIndex = 1;
    gameState.hearts = gameState.memoryCosts[targetIndex];

    unlockMemory(targetIndex);

    expect(gameState.hearts).toBe(0);
    expect(gameState.unlockedMemories).toContain(targetIndex);
  });
});

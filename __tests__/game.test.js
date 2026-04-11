/** @jest-environment jsdom */

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const bodyContent = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const scriptContent = html.match(/<script>([\s\S]*)<\/script>/i)[1];

function bootstrapGame() {
    document.body.innerHTML = bodyContent.replace(/<script>[\s\S]*<\/script>/i, '');
    global.__TEST__ = true;
    // Execute game script in the jsdom window context
    // eslint-disable-next-line no-eval
    eval(scriptContent);
}

describe('game logic', () => {
    let api;

    beforeEach(() => {
        jest.useFakeTimers();
        bootstrapGame();
        api = window.__TEST_API;
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.restoreAllMocks();
        document.body.innerHTML = '';
    });

    test('loadGame populates state from saved data', () => {
        const saved = {
            hearts: 5,
            stats: { food: 10, mood: 20, rest: 30, life: 40 },
            lastUpdate: 12345,
            unlockedMemories: [0, 2],
            roomItems: [{ item: 'mouse', x: 10, y: 20 }]
        };

        window.localStorage.setItem('mollyGame', JSON.stringify(saved));
        api.loadGame();

        expect(window.gameState.hearts).toBe(5);
        expect(window.gameState.stats).toEqual(saved.stats);
        expect(window.gameState.lastUpdate).toBe(12345);
        expect(window.gameState.unlockedMemories).toEqual([0, 2]);
        expect(window.gameState.roomItems).toEqual(saved.roomItems);
    });

    test('applyOfflineDecay reduces stats over elapsed minutes', () => {
        const baseTime = new Date('2024-01-01T00:00:00Z').getTime();
        jest.setSystemTime(baseTime + 10 * 60 * 1000);
        window.gameState.lastUpdate = baseTime;
        window.gameState.stats = { food: 50, mood: 50, rest: 50, life: 50 };

        api.applyOfflineDecay();

        expect(window.gameState.stats.food).toBeCloseTo(45);
        expect(window.gameState.stats.mood).toBeCloseTo(45);
        expect(window.gameState.stats.rest).toBeCloseTo(45);
        expect(window.gameState.stats.life).toBeCloseTo(47.5);
    });

    test('performAction caps stats and saves state', () => {
        window.gameState.stats = { food: 95, mood: 50, rest: 50, life: 50 };
        const setItemSpy = jest.spyOn(Object.getPrototypeOf(window.localStorage), 'setItem');

        api.performAction('feed');

        expect(window.gameState.stats.food).toBe(100);
        expect(window.document.getElementById('foodBar').style.width).toBe('100%');
        expect(setItemSpy).toHaveBeenCalled();
    });

    test('buyItem spends hearts, boosts stats, and adds room item', () => {
        window.gameState.hearts = 120;
        window.gameState.stats = { food: 0, mood: 0, rest: 0, life: 0 };

        api.buyItem('mouse', 50);

        expect(window.gameState.hearts).toBe(70);
        expect(window.gameState.stats.mood).toBe(100);
        expect(window.gameState.roomItems).toHaveLength(1);
        expect(window.gameState.roomItems[0].item).toBe('mouse');
    });

    test('unlockMemory requires sufficient hearts', () => {
        const toast = window.document.getElementById('toast');

        window.gameState.hearts = 0;
        api.unlockMemory(1);
        expect(toast.textContent).toContain('Need 1000 hearts');

        window.gameState.hearts = 2000;
        api.unlockMemory(1);
        expect(window.gameState.unlockedMemories).toContain(1);
        expect(window.gameState.hearts).toBe(1000);
    });
});

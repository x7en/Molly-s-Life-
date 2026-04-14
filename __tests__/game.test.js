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
        window.localStorage.clear();
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
            roomItems: [{ item: 'mouse', x: 10, y: 20 }],
            foodInventory: { bowl: 2 }
        };

        window.localStorage.setItem('mollyUserId', 'test-user');
        window.localStorage.setItem('mollyGame_test-user', JSON.stringify(saved));
        api.loadGame();

        expect(window.gameState.hearts).toBe(5);
        expect(window.gameState.stats).toEqual(saved.stats);
        expect(window.gameState.lastUpdate).toBe(12345);
        expect(window.gameState.unlockedMemories).toEqual([0, 2]);
        expect(window.gameState.roomItems).toEqual(saved.roomItems);
        expect(window.gameState.foodInventory).toEqual(saved.foodInventory);
        expect(window.foodInventory.bowl).toBe(2);
    });

    test('loadGame tolerates malformed unlock and pending data', () => {
        const saved = {
            hearts: 3,
            stats: { food: 10, mood: 20, rest: 30, life: 40 },
            unlockedMemories: 'oops',
            pendingActions: 'not-an-array'
        };

        window.localStorage.setItem('mollyUserId', 'bad-data-user');
        window.localStorage.setItem('mollyGame_bad-data-user', JSON.stringify(saved));
        api.loadGame();

        expect(window.gameState.unlockedMemories).toEqual([0]);
        expect(window.gameState.pendingActions).toEqual([]);
        expect(window.gameState.hearts).toBe(3);
        expect(window.gameState.stats).toEqual(saved.stats);
    });

    test('loadGame filters unlocked memories to valid unique indices', () => {
        const saved = {
            hearts: 7,
            stats: { food: 30, mood: 40, rest: 50, life: 60 },
            unlockedMemories: [5, -1, '2', 5, 99]
        };

        window.localStorage.setItem('mollyUserId', 'filter-user');
        window.localStorage.setItem('mollyGame_filter-user', JSON.stringify(saved));
        api.loadGame();

        expect(window.gameState.unlockedMemories).toEqual([0, 2, 5]);
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
        window.gameState.stats = { food: 50, mood: 95, rest: 50, life: 50 };
        const setItemSpy = jest.spyOn(Object.getPrototypeOf(window.localStorage), 'setItem');

        api.performAction('cuddle');
        jest.advanceTimersByTime(2500);

        expect(window.gameState.stats.mood).toBe(100);
        expect(window.document.getElementById('moodBar').style.width).toBe('100%');
        expect(setItemSpy).toHaveBeenCalled();
    });

    test('selectFoodToFeed consumes inventory and follows the feeding sequence', () => {
        const food = window.foodItems.find((item) => item.id === 'meatball');
        api.setFoodStock(food.id, 1);
        window.gameState.stats.food = 50;

        api.selectFoodToFeed(food);

        expect(api.getFoodStock(food.id)).toBe(0);
        const drop = document.getElementById('foodDrop');
        const dropImg = document.getElementById('foodDropImg');
        expect(drop.classList.contains('visible')).toBe(true);
        expect(dropImg.src).toContain('meatball_dish.png');

        jest.advanceTimersByTime(1000);
        expect(window.gameState.stats.food).toBe(50);

        jest.advanceTimersByTime((window.actions.feed.duration || 0) + 1500);
        expect(window.gameState.stats.food).toBe(70);
        expect(window.gameState.lastFedAt).toBeGreaterThan(0);

        jest.advanceTimersByTime(1000);
        expect(drop.classList.contains('visible')).toBe(false);
    });

    test('purchaseFood deducts hearts and adds servings', () => {
        const food = window.foodItems.find((item) => item.id === 'bowl');
        window.gameState.hearts = 50;

        api.purchaseFood(food);

        expect(window.gameState.hearts).toBe(40);
        expect(api.getFoodStock(food.id)).toBe(food.servings);
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

    test('feast boosts food without adding a room item', () => {
        window.gameState.hearts = 150;
        window.gameState.stats.food = 10;

        api.buyItem('feast', 100);

        expect(window.gameState.hearts).toBe(50);
        expect(window.gameState.stats.food).toBe(100);
        expect(window.gameState.roomItems).toHaveLength(0);
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

    describe('memory code unlock', () => {
        test('correct code unlocks all slots for the session without saving progress', () => {
            const setItemSpy = jest.spyOn(Object.getPrototypeOf(window.localStorage), 'setItem');
            document.getElementById('memoryCodeInput').value = 'ayeshalovesmolly';

            api.handleMemoryCodeSubmit({ preventDefault: jest.fn() });

            const unlockedSlots = document.querySelectorAll('#memoriesGrid .memory-slot.unlocked');
            expect(unlockedSlots.length).toBe(window.gameState.memoryCosts.length);
            expect(window.gameState.unlockedMemories).toEqual([0]);
            expect(setItemSpy).not.toHaveBeenCalled();
        });

        test('code unlock requires re-entry after reloading the game', () => {
            document.getElementById('memoryCodeInput').value = 'ayeshalovesmolly';
            api.handleMemoryCodeSubmit({ preventDefault: jest.fn() });

            bootstrapGame();
            api = window.__TEST_API;
            api.renderMemories();

            const unlockedSlots = document.querySelectorAll('#memoriesGrid .memory-slot.unlocked');
            expect(unlockedSlots.length).toBe(1);
        });
    });

    describe('renderMemories', () => {
        test('renders one slot per memoryCosts entry', () => {
            api.renderMemories();
            const slots = document.querySelectorAll('#memoriesGrid .memory-slot');
            expect(slots.length).toBe(window.gameState.memoryCosts.length);
        });

        test('unlocked slot contains an img with the local memories/ src', () => {
            window.gameState.unlockedMemories = [0];
            api.renderMemories();

            const img = document.querySelector('#memoriesGrid .memory-slot.unlocked img');
            expect(img).not.toBeNull();
            expect(img.src).toContain('memories/memory-1.jpg');
        });

        test('onerror on unlocked slot tries legacy filename then fallback URL', () => {
            // Slot 0 has a built-in fallback URL
            window.gameState.unlockedMemories = [0];
            api.renderMemories();

            const img = document.querySelector('#memoriesGrid .memory-slot.unlocked img');
            expect(img).not.toBeNull();

            // Simulate the local file failing to load
            img.onerror();
            expect(img.src).toContain('memories/memory1.jpg');

            // Simulate the legacy name failing to load
            img.onerror();
            expect(img.src).toContain('github.com/user-attachments/assets');
        });

        test('onerror called twice on unlocked slot with fallback shows text placeholder', () => {
            // Slot 0 has a built-in fallback URL
            window.gameState.unlockedMemories = [0];
            api.renderMemories();

            const slot = document.querySelector('#memoriesGrid .memory-slot.unlocked');
            const img = slot.querySelector('img');

            // First onerror: switches to legacy filename
            img.onerror();
            // Second onerror: switches to fallback URL
            img.onerror();
            // Third onerror: fallback also failed → show text placeholder
            img.onerror();

            expect(slot.querySelector('.memory-placeholder')).not.toBeNull();
            expect(slot.querySelector('.memory-placeholder').textContent).toBe('No Image Set');
        });

        test('onerror on unlocked slot without fallback shows text placeholder immediately', () => {
            // Slot 4 has null fallback
            window.gameState.unlockedMemories = [0, 1, 2, 3, 4];
            api.renderMemories();

            const slots = document.querySelectorAll('#memoriesGrid .memory-slot.unlocked');
            const slot = slots[4];
            const img = slot.querySelector('img');

            // Legacy filename attempt then placeholder (no fallback URL for index 4)
            img.onerror(); // try legacy filename
            img.onerror(); // show placeholder

            expect(slot.querySelector('.memory-placeholder')).not.toBeNull();
            expect(slot.querySelector('.memory-placeholder').textContent).toBe('No Image Set');
        });

        test('locked slots show a lock icon and cost, not an image', () => {
            // Only slot 0 is unlocked by default
            api.renderMemories();

            const lockedSlots = document.querySelectorAll('#memoriesGrid .memory-slot.locked');
            expect(lockedSlots.length).toBe(window.gameState.memoryCosts.length - 1);

            const firstLocked = lockedSlots[0];
            expect(firstLocked.querySelector('img')).toBeNull();
            expect(firstLocked.querySelector('.memory-cost')).not.toBeNull();
        });

        test('falls back to a video source when provided for a memory slot', () => {
            window.gameState.unlockedMemories = [17];
            api.renderMemories();

            const slots = document.querySelectorAll('#memoriesGrid .memory-slot');
            const slot = slots[17];
            const img = slot.querySelector('img');
            expect(img).not.toBeNull();

            // Simulate both local image attempts failing so the video is used
            img.onerror();
            img.onerror();

            const video = slot.querySelector('video');
            expect(video).not.toBeNull();
            expect(video.src).toContain('memories/memory-18.mp4');
        });
    });
});

# Molly-s-Life-

## Memories

Add your memory photos under `memories/memory-<index>.jpg` (starting at 1). The loader also accepts the legacy `memories/memory<index>.jpg` naming and tries that automatically if the hyphenated file is missing. For each unlocked slot, the app will load the local file if present; if it is missing, the app uses a built-in placeholder where one is defined, otherwise it shows the "No Image Set" text placeholder.

## Animations & textures

- Put custom Molly GIFs in `assets/animations/` named after their state (for example `idle.gif`, `play.gif`, `sleep.gif`, `walk.gif`, `stand.gif`, `eat.gif`, `meow.gif`). Files ending in `-animation.gif` are also picked up automatically.
- Replace `assets/animations/loading.gif` to customize the loading animation shown while memory images are fetched.
- Food drops cycle through the textures in `assets/textures/food/` (dish art such as `70_meatball_dish.png`). A pile indicator uses `assets/textures/food/03_dish_pile.png` when Molly has not been fed for a while.
- Override the toy/ball with `assets/textures/ball/orange_animation.gif`.
- Missing files safely fall back to the built-in animations and textures. See `assets/README.md` for more details.

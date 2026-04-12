# Molly-s-Life-

## Memories

Add your memory photos under `memories/memory-<index>.jpg` (starting at 1). The loader also accepts the legacy `memories/memory<index>.jpg` naming and tries that automatically if the hyphenated file is missing. For each unlocked slot, the app will load the local file if present; if it is missing, the app uses a built-in placeholder where one is defined, otherwise it shows the "No Image Set" text placeholder.

## Animations & textures

- Put custom Molly GIFs in `assets/animations/` named after their state (for example `idle.gif`, `play.gif`, `sleep.gif`).
- Override the food drop or toy/ball art with `assets/textures/food/food.png` and `assets/textures/ball/ball.png`.
- Missing files safely fall back to the built-in animations and textures. See `assets/README.md` for more details.

Assets drop zones
=================

Custom animations
-----------------
- Place Molly GIFs in `assets/animations/`.
- Name each file after the animation key (for example: `idle.gif`, `play.gif`, `sleep.gif`, `walk.gif`, `stand.gif`, `eat.gif`, `meow.gif`).
- Files ending with `-animation.gif` are also detected automatically (for example: `eat-animation.gif`).
- If a matching GIF exists, the game will use it; otherwise it falls back to the built-in animation.

Custom textures
---------------
- Food textures: drop new dishes in `assets/textures/food/` (for example: `70_meatball_dish.png`, `72_nacho_dish.png`, `96_steak_dish.png`). The game cycles through the available dishes when feeding.
- Plate pile: `assets/textures/food/03_dish_pile.png` appears automatically when Molly has not been fed for a while.
- Ball/toy texture: add `assets/textures/ball/orange_animation.gif` to replace the toy shown in the shop and room when bought.
- Missing files automatically fall back to the built-in textures, so you can safely remove custom files at any time.

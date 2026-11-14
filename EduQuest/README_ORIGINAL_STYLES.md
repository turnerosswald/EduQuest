# EduQuest – Original Buttons & Cards Restored

This builds directly on **EduQuest_SpellingBee_Visual_Fixed_Full.zip**.

## What was restored

- **WordQuest**: The original gradient title, original text and "Show Info" control, original raised gray/white **purple-text difficulty buttons**, original dark info box. Removed the newly introduced large dark rounded home card. The crossword no longer has the newer large white rounded outer card.
- **Spelling Bee**: Original **green buttons** with dark-green hover (including Help and level selection); removed the newer dark rounded panel and its glassy progress card. Kept the new game logic and functional UI.

## What stays the same as the prior visual-fix ZIP

- WordQuest's working background path, responsive crossword and non-floating clue panel, and browser speech.
- Spelling Bee's trimmed Moski sprite, Moski placement, responsive layout, level-specific backgrounds, and Python/FastAPI integration.
- Backend, game logic, APIs, configuration, and every other game are **identical** to the previous visual-fixed ZIP.

## How to apply

**Full ZIP**: Unzip `EduQuest_Original_Buttons_Restored_Full.zip` and run as before.

**Small patch**: Unzip `EduQuest_Original_Buttons_Restored_Patch.zip` over your *previous visual-fixed* `EduQuest` folder and overwrite matching files. The patch deliberately changes only 3 frontend files and this README.

For local development, start the Python backend on port 8000, then in another terminal:

```powershell
cd website/frontend
npm run dev
```

Hard-refresh the browser (`Ctrl+Shift+R`) after replacing files.

> This is a targeted appearance restoration, not a new visual redesign. Full Next.js production build has not been verified in this packaging environment.

# QUM science brief (in-app)

Static assets served at `./brief/index.html` inside the app shell (`BriefScreen`).

**Source of truth:** `QUM 3.0/QUM Brief.html`, `brief.css`, `brief.js` in the repo root folder.

When updating the brief, copy from `QUM 3.0/` and rebuild `index.html` by truncating before the React tweaks panel (or run the project sync script if added later). The in-app build omits the author tweaks UI and pins lay/detail defaults in a small inline script.

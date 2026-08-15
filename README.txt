Scratch Practice - Front Deck v91
=================================

Open `index.html` in a modern browser, or serve the folder with a local HTTP server.

Recommended local run:

    python3 -m http.server 8080

Then open:

    http://localhost:8080

Project layout
--------------

- `index.html` - main UI
- `css/` - generated stylesheet and modular source CSS
- `js/` - application logic
- `assets/` - images and audio loops
- `tests/` - validation, UI, asset, and smoke checks
- `tools/` - helper scripts
- `docs/` - architecture, security, CSS workflow, and version review notes

Validation
----------

Run the test suite with:

    python3 tools/test_all.py

Or the main validation script:

    python3 tests/validate.py

CSS workflow
------------

Edit the modular files in `css/src/`, then rebuild `css/base.css` with:

    python3 tools/build_css.py

See `docs/CSS_WORKFLOW.md` for details.

Security
--------

See `docs/SECURITY.md` and `docs/nginx-security.conf` for deployment guidance.

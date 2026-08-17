from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


index = Path("index.html")
text = index.read_text(encoding="utf-8")
for line in [
    '              <button id="kickFolderBtn" class="btn drumLibraryButton" type="button">SELECT KICK FOLDER</button>\n',
    '              <button id="snareFolderBtn" class="btn drumLibraryButton" type="button">SELECT SNARE FOLDER</button>\n',
    '              <button id="hatFolderBtn" class="btn drumLibraryButton" type="button">SELECT HI-HAT FOLDER</button>\n',
]:
    if text.count(line) != 1:
        raise SystemExit(f"index.html: expected one static drum folder button: {line.strip()}")
    text = text.replace(line, "", 1)
index.write_text(text, encoding="utf-8")


events = Path("js/events.js")
text = events.read_text(encoding="utf-8")
for line in [
    '$("kickFolderBtn").onclick=()=>chooseDrumFolder("kick");\n',
    '$("snareFolderBtn").onclick=()=>chooseDrumFolder("snare");\n',
    '$("hatFolderBtn").onclick=()=>chooseDrumFolder("hat");\n',
]:
    if text.count(line) != 1:
        raise SystemExit(f"events.js: expected one static listener: {line.strip()}")
    text = text.replace(line, "", 1)
events.write_text(text, encoding="utf-8")


replace_once(
    "js/drums.js",
    '''  const lanes=[
    ["kick","KICK"],
    ["snare","SNARE"],
    ["hat","HAT"]
  ];

  for(const [lane,labelText] of lanes){
    const label=document.createElement("div");
    label.className="drumEditLabel";
    label.textContent=labelText;
    grid.appendChild(label);
''',
    '''  const lanes=[
    ["kick","KICK"],
    ["snare","SNARE"],
    ["hat","HI-HAT"]
  ];

  for(const [lane,labelText] of lanes){
    const loadButton=document.createElement("button");
    loadButton.type="button";
    loadButton.id=`${lane}FolderBtn`;
    loadButton.className="drumEditLibraryButton";
    loadButton.textContent=labelText;
    loadButton.title=`Charger le dossier ${labelText}`;
    loadButton.setAttribute("aria-label",`Charger le dossier ${labelText}`);
    loadButton.onclick=()=>chooseDrumFolder(lane);
    grid.appendChild(loadButton);
''',
)


replace_once(
    "css/base.css",
    ".drumEditLabel,\n.drumEditHeadStep,\n.drumEditStep {\n",
    ".drumEditHeadStep,\n.drumEditStep {\n",
)
replace_once(
    "css/base.css",
    '''.drumEditLabel {
  display: flex;
  align-items: center;
  color: #9ba7ad;
  font: 800 8px/1 var(--font-mono);
  letter-spacing: .6px;
}
''',
    '''.drumEditLibraryButton {
  align-self: center;
  justify-self: start;
  width: auto !important;
  min-width: 0 !important;
  min-height: 0 !important;
  margin: 0;
  padding: 3px 4px !important;
  border: 1px solid #2f3940;
  border-radius: 2px;
  color: #9ba7ad;
  background: #0b1115;
  box-shadow: none;
  font: 800 8px/1 var(--font-mono) !important;
  letter-spacing: .35px;
  white-space: nowrap;
}

.drumEditLibraryButton:hover {
  border-color: #54708b;
  color: #eef3f6;
  background: #111a20;
}

.drumEditLibraryButton:disabled {
  opacity: .55;
  cursor: wait;
}
''',
)
replace_once(
    "css/base.css",
    '  grid-template-areas:\n    "icon copy"\n    "button button";\n',
    '  grid-template-areas: "icon copy";\n',
)
replace_once(
    "css/base.css",
    '''.drumLibraryButton {
  grid-area: button;
  width: 100%;
  min-height: 34px !important;
  padding: 6px 9px !important;
  font-size: 9px !important;
  font-weight: 800 !important;
  letter-spacing: .35px !important;
  border-color: #343c43 !important;
}

.drumLibraryButton:hover {
  border-color: #54708b !important;
  color: #eef3f6 !important;
  background: linear-gradient(180deg,#242c33,#141a20) !important;
}

''',
    "",
)
replace_once(
    "css/base.css",
    '''  .drumLibrarySlot {
    grid-template-columns: 34px minmax(0,1fr) minmax(145px,190px);
    grid-template-areas: "icon copy button";
    align-items: center;
  }
''',
    "",
)
replace_once(
    "css/base.css",
    '''  .drumLibrarySlot {
    grid-template-columns: 34px minmax(0,1fr);
    grid-template-areas:
      "icon copy"
      "button button";
  }
''',
    "",
)


replace_once(
    "tests/drum_ui.py",
    "    assert page.locator('#drumEditor .drumEditLabel').count()==3\n",
    "    assert page.locator('#drumEditor .drumEditLibraryButton').count()==3\n",
)
replace_once(
    "tests/drum_ui.py",
    '''    # Geometry: the local library buttons must remain visible/clickable.
    for rid in ['kickFolderBtn','snareFolderBtn','hatFolderBtn','loadDrumLibraryCTA']:
        box=page.locator('#'+rid).bounding_box()
        assert box and box['width']>80 and box['height']>=30, (rid,box)
        assert page.locator('#'+rid).is_enabled(), rid
''',
    '''    # Per-part library controls are the compact row labels themselves.
    for rid,label in [('kickFolderBtn','KICK'),('snareFolderBtn','SNARE'),('hatFolderBtn','HI-HAT')]:
        control=page.locator('#'+rid)
        assert control.count()==1, rid
        assert control.inner_text()==label, (rid,control.inner_text())
        assert control.evaluate("el=>el.closest('#drumEditor')!==null"), rid
        assert control.evaluate("el=>typeof el.onclick==='function'"), rid
        box=control.bounding_box()
        assert box and 18<=box['width']<=60 and 10<=box['height']<=20, (rid,box)
        assert control.is_enabled(), rid
    assert page.locator('.drumLibraryButton').count()==0
    assert page.locator('.drumLibrarySlot button').count()==0
    for rid in ['kickFolderFallback','snareFolderFallback','hatFolderFallback']:
        assert page.locator('#'+rid).count()==1, rid
    cta_box=page.locator('#loadDrumLibraryCTA').bounding_box()
    assert cta_box and cta_box['width']>80 and cta_box['height']>=30, cta_box
    assert page.locator('#loadDrumLibraryCTA').is_enabled()
''',
)
replace_once(
    "tests/drum_ui.py",
    "    assert page.locator('#drumEditor .drumEditStep').count()==48\n\n    # Clear means clear;",
    "    assert page.locator('#drumEditor .drumEditStep').count()==48\n    assert page.locator('#drumEditor .drumEditLibraryButton').count()==3\n\n    # Clear means clear;",
)


runtime = "\n".join(Path(p).read_text(encoding="utf-8") for p in ["index.html", "js/events.js", "css/base.css"])
for retired in [
    'class="btn drumLibraryButton"',
    '$("kickFolderBtn").onclick',
    '$("snareFolderBtn").onclick',
    '$("hatFolderBtn").onclick',
    ".drumEditLabel",
]:
    if retired in runtime:
        raise SystemExit(f"retired drum-library path remains: {retired}")

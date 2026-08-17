from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

path=ROOT/'css/base.css'
text=path.read_text(encoding='utf-8')

replacements=[
    (
        '.stableTop, .mainModeTabs, .panel, .headerDeckPill, .headerMaster, .beatCratePanel, .outputMeterPanel, .drumLibrariesPanel, .currentDrums, .wavewrap.largeWave, .loopGridWrap, .drumEditBox, .snareFx, .punchFx, .btn, input, select, .status {',
        '.stableTop, .mainModeTabs, .panel, .headerDeckPill, .headerMaster, .beatCratePanel, .currentDrums, .wavewrap.largeWave, .loopGridWrap, .drumEditBox, .snareFx, .punchFx, .btn, input, select, .status {'
    ),
    (
        '.stableTop, .mainModeTabs, .panel, .headerDeckPill, .headerMaster, .beatCratePanel, .outputMeterPanel, .drumLibrariesPanel {',
        '.stableTop, .mainModeTabs, .panel, .headerDeckPill, .headerMaster, .beatCratePanel {'
    ),
    (
        '.mainModeTabs .tab.active, .btn.primary, .btn.blue, .btn.good, .loadDrumLibraryCTA.active, .pad.active, .pad.hit, .drumEditStep.active.kick, .drumEditStep.active.snare, .drumEditStep.active.hat, .matrixCell.active {',
        '.mainModeTabs .tab.active, .btn.primary, .btn.blue, .btn.good, .pad.active, .pad.hit, .drumEditStep.active.kick, .drumEditStep.active.snare, .drumEditStep.active.hat, .matrixCell.active {'
    ),
    (
        '.help, .folderStatus, small {',
        '.help, small {'
    ),
    (
        '.samplerDrumSection .outputMeterPanel {border-radius:5px!important;background:#070503!important}\n',
        ''
    ),
]

for old,new in replacements:
    count=text.count(old)
    assert count==1,(old,count)
    text=text.replace(old,new,1)

path.write_text(text,encoding='utf-8')

# The layout contract must measure the surviving drum editor, not the retired
# duplicate library panel.
path=ROOT/'tests/css_layout.py'
text=path.read_text(encoding='utf-8')
old="          drums:document.getElementById('drumLibrariesPanel').getBoundingClientRect().toJSON()"
new="          drums:document.querySelector('.drumEditBox').getBoundingClientRect().toJSON()"
assert text.count(old)==1,text.count(old)
text=text.replace(old,new,1)
path.write_text(text,encoding='utf-8')

print('Shared retired selectors and stale layout contract removed.')

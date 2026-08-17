from pathlib import Path

path=Path(__file__).resolve().parents[1]/'css/base.css'
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
print('Shared retired CSS selector branches removed.')

# Navigation

Single source of truth: module static `nav` declarations + `config/nav.config.js` (group order +
header utility actions). `core/nav-controller.js` subscribes to Router + State + Persona, builds the
**audience-filtered** model, and emits `platform:nav:rebuilt`; `<pf-app-nav>` renders it with
`aria-current="page"` and keyboard support (Tab/Arrows/Home/End). Mobile drawer <768px with the
shell's `nav-open` toggle. Audience matrix: admin → all/admin/executive/general · executive →
all/executive/general · general → all/general. Modules never render nav markup.

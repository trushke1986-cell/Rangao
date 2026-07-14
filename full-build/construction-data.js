const points = {
  A: [0, 0, 0],
  B: [3000, 0, 0],
  C: [3000, 2000, 0],
  D: [2000, 3000, 0],
  E: [0, 3000, 0],
};

const layers = [
  ['01_foundation', 'Фундаментные блоки', '#7c8581'],
  ['02_waterproofing', 'Гидроизоляция', '#181b1a'],
  ['03_lower_frame', 'Нижняя обвязка 150×150', '#bd7842'],
  ['04_central_beam', 'Центральный прогон', '#9f6136'],
  ['05_floor_joists', 'Лаги пола 50×150', '#b87542'],
  ['06_floor_deck', 'Настил пола 40', '#ce985f'],
  ['07_posts', 'Стойки 100×100', '#c07a43'],
  ['08_temp_braces', 'Временные укосины', '#dfb06f'],
  ['09_post_joints', 'Крепление стоек', '#627f8f'],
  ['10_upper_frame', 'Верхняя обвязка 100×100', '#a96639'],
  ['11_permanent_braces', 'Постоянные укосины 50×100', '#d0915c'],
  ['12_solid_cladding', 'Сплошная обшивка', '#d5a06e'],
  ['13_lattice_cladding', 'Решётчатая обшивка', '#e0af78'],
  ['14_drill_axes', 'Отверстия и оси сверления', '#d85c42'],
  ['15_fasteners', 'Силовой крепёж', '#5c6670'],
  ['16_rafters', 'Стропила 50×150', '#a76537'],
  ['17_battens', 'Обрешётка 50×50', '#d1a377'],
  ['18_roof_sheet', 'Профнастил', '#285e72'],
  ['19_roof_trim', 'Доборные элементы кровли', '#1f4f60'],
  ['20_dimensions', 'Размеры и предупреждения', '#d85c42'],
  ['21_context', 'Контекст участка', '#536661'],
].map(([id, label, color], index) => ({ id, label, color, index }));

const L = Object.fromEntries(layers.map(({ id }) => [id, id]));
const base = [L['01_foundation'], L['02_waterproofing'], L['20_dimensions'], L['21_context']];
const floorFrame = [...base, L['03_lower_frame'], L['04_central_beam'], L['05_floor_joists']];
const stages = [
  ['01', 'Основание', base],
  ['02', 'Каркас пола', floorFrame],
  ['03', 'Проверка анкеровки', [...floorFrame, L['14_drill_axes'], L['15_fasteners']]],
  ['04', 'Разметка', [...floorFrame, L['14_drill_axes']]],
  ['05', 'Частичный настил', [...floorFrame, L['06_floor_deck'], L['14_drill_axes']]],
  ['06', 'Стойки и временные укосины', [...floorFrame, L['06_floor_deck'], L['07_posts'], L['08_temp_braces']]],
  ['07', 'Крепление стоек', [...floorFrame, L['06_floor_deck'], L['07_posts'], L['08_temp_braces'], L['09_post_joints'], L['14_drill_axes'], L['15_fasteners']]],
  ['08', 'Закрытие настила', [...floorFrame, L['06_floor_deck'], L['07_posts'], L['08_temp_braces'], L['09_post_joints'], L['15_fasteners']]],
  ['09', 'Верхняя обвязка', [...floorFrame, L['06_floor_deck'], L['07_posts'], L['08_temp_braces'], L['09_post_joints'], L['10_upper_frame'], L['15_fasteners']]],
  ['10', 'Постоянные укосины', [...floorFrame, L['06_floor_deck'], L['07_posts'], L['09_post_joints'], L['10_upper_frame'], L['11_permanent_braces'], L['15_fasteners']]],
  ['11', 'Сплошные стены', [...floorFrame, L['06_floor_deck'], L['07_posts'], L['09_post_joints'], L['10_upper_frame'], L['11_permanent_braces'], L['12_solid_cladding'], L['15_fasteners']]],
  ['12', 'Решётчатые стены', [...floorFrame, L['06_floor_deck'], L['07_posts'], L['09_post_joints'], L['10_upper_frame'], L['11_permanent_braces'], L['12_solid_cladding'], L['13_lattice_cladding'], L['15_fasteners']]],
  ['13', 'Каркас и стены до крыши', [...floorFrame, L['06_floor_deck'], L['07_posts'], L['09_post_joints'], L['10_upper_frame'], L['11_permanent_braces'], L['12_solid_cladding'], L['13_lattice_cladding'], L['14_drill_axes'], L['15_fasteners']]],
  ['14', 'Стропила', [...floorFrame, L['06_floor_deck'], L['07_posts'], L['09_post_joints'], L['10_upper_frame'], L['11_permanent_braces'], L['12_solid_cladding'], L['13_lattice_cladding'], L['15_fasteners'], L['16_rafters']]],
  ['15', 'Обрешётка', [...floorFrame, L['06_floor_deck'], L['07_posts'], L['09_post_joints'], L['10_upper_frame'], L['11_permanent_braces'], L['12_solid_cladding'], L['13_lattice_cladding'], L['15_fasteners'], L['16_rafters'], L['17_battens']]],
  ['16', 'Подготовка кровли', [...floorFrame, L['06_floor_deck'], L['07_posts'], L['09_post_joints'], L['10_upper_frame'], L['11_permanent_braces'], L['12_solid_cladding'], L['13_lattice_cladding'], L['15_fasteners'], L['16_rafters'], L['17_battens'], L['19_roof_trim']]],
  ['17', 'Готовая кровля', [...floorFrame, L['06_floor_deck'], L['07_posts'], L['09_post_joints'], L['10_upper_frame'], L['11_permanent_braces'], L['12_solid_cladding'], L['13_lattice_cladding'], L['15_fasteners'], L['16_rafters'], L['17_battens'], L['18_roof_sheet'], L['19_roof_trim']]],
  ['18', 'Полная модель', layers.map(({ id }) => id)],
].map(([id, label, layerIds]) => ({ id, label, layerIds: [...new Set(layerIds)] }));

const roofZ = (x, y) => 2740 + 0.12 * (x + y);
const postLength = (id) => {
  const [x, y] = points[id];
  return roofZ(x, y) - 350;
};
const length2D = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const segmentLength = (a, b) => length2D(points[a], points[b]);

const parts = [
  ...['A', 'B', 'C', 'D', 'E', 'AB', 'AE', 'F', 'P1', 'P2'].map((id) => ({
    id: `BLOCK-${id}`,
    name: `Фундаментный блок ${id}`,
    layerId: '01_foundation',
    material: 'Бетон',
    section: '200×200×400 мм',
    lengthMm: 400,
    quantity: 1,
    guideAnchor: `part-BLOCK-${id}`,
  })),
  ...['A', 'B', 'C', 'D', 'E'].map((id) => ({
    id: `POST-${id}`,
    name: `Стойка ${id}`,
    layerId: '07_posts',
    material: 'Конструкционная древесина наружного применения',
    section: '100×100 мм',
    lengthMm: postLength(id),
    quantity: 1,
    guideAnchor: `part-POST-${id}`,
  })),
  ...[['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'A']].map(([a, b]) => ({
    id: `UPPER-${a}${b}`,
    name: `Верхняя обвязка ${a}–${b}`,
    layerId: '10_upper_frame',
    material: 'Конструкционная древесина наружного применения',
    section: '100×100 мм',
    lengthMm: segmentLength(a, b),
    quantity: 1,
    guideAnchor: `part-UPPER-${a}${b}`,
  })),
  { id: 'DECK', name: 'Настил пола', layerId: '06_floor_deck', material: 'Террасная доска или строганая доска', section: '40 мм', lengthMm: 3000, quantity: 1, guideAnchor: 'part-DECK' },
  { id: 'WALL-SOLID-AB', name: 'Сплошная стена A–B', layerId: '12_solid_cladding', material: 'Строганая рейка', section: '24×110 мм', lengthMm: 2880, quantity: 1, guideAnchor: 'part-WALL-SOLID-AB' },
  { id: 'WALL-SOLID-AE', name: 'Сплошная стена A–E', layerId: '12_solid_cladding', material: 'Строганая рейка', section: '24×110 мм', lengthMm: 2880, quantity: 1, guideAnchor: 'part-WALL-SOLID-AE' },
  { id: 'WALL-LATTICE-BC', name: 'Решётчатая стена B–C', layerId: '13_lattice_cladding', material: 'Строганая рейка', section: '24×90 мм', lengthMm: 1880, quantity: 7, guideAnchor: 'part-WALL-LATTICE-BC' },
  { id: 'WALL-LATTICE-DE', name: 'Решётчатая стена D–E', layerId: '13_lattice_cladding', material: 'Строганая рейка', section: '24×90 мм', lengthMm: 1880, quantity: 7, guideAnchor: 'part-WALL-LATTICE-DE' },
  { id: 'WALL-BACKING-SET', name: 'Промежуточные стойки под горизонтальную обшивку', layerId: '11_permanent_braces', material: 'Сухой брусок наружного применения', section: '50×50 мм', lengthMm: null, quantity: 14, guideAnchor: 'part-WALL-BACKING-SET' },
  { id: 'RAFTER-SET', name: 'Комплект стропил', layerId: '16_rafters', material: 'Конструкционная древесина наружного применения', section: '50×150 мм', lengthMm: null, quantity: 11, guideAnchor: 'part-RAFTER-SET' },
  { id: 'BATTEN-SET', name: 'Комплект обрешётки', layerId: '17_battens', material: 'Сухой брусок', section: '50×50 мм', lengthMm: null, quantity: 11, guideAnchor: 'part-BATTEN-SET' },
  { id: 'ROOF-SHEET', name: 'Кровельный профнастил', layerId: '18_roof_sheet', material: 'Оцинкованный профилированный лист с полимерным покрытием', section: 'по паспорту выбранного профиля', lengthMm: 3900, quantity: 1, guideAnchor: 'part-ROOF-SHEET' },
];

const ratedFastener = ({ system, type, diameterMm, lengthMm, quantity, drive, corrosionClass, sourceIds, installNote }) => ({
  system,
  type,
  diameterMm,
  lengthMm,
  quantity,
  drive,
  corrosionClass,
  sourceIds,
  installNote,
});

const structuralJoint = ({ id, name, layerId, position, axis, fasteners, bitDiameterMm, depthMm, pilotRequired = true, drillNote, endMm, sideMm, guideAnchor }) => ({
  id,
  name,
  layerId,
  position,
  axis,
  structural: true,
  fasteners,
  drilling: { bitDiameterMm, depthMm, pilotRequired, note: drillNote },
  edgeDistances: {
    endMm,
    sideMm,
    note: 'Монтажные ориентиры для разметки макета; минимумы и несущую способность подтвердить расчётом по СП 64 и ETA выбранного крепежа.',
  },
  verification: 'engineer-check',
  warning: 'Предварительный узел: перед закупкой и монтажом проверить у инженера-конструктора и по паспорту выбранной системы крепежа.',
  guideAnchor,
});

const finishJoint = ({ id, name, layerId, position, axis, fasteners, bitDiameterMm, depthMm, drillNote, endMm, sideMm, guideAnchor }) => ({
  id,
  name,
  layerId,
  position,
  axis,
  structural: false,
  fasteners,
  drilling: { bitDiameterMm, depthMm, pilotRequired: true, note: drillNote },
  edgeDistances: { endMm, sideMm, note: 'Монтажный минимум для защиты тонкой детали от раскалывания; возле края всегда делать пробу на обрезке.' },
  verification: 'manufacturer-verified',
  warning: 'Схема относится к креплению отделочной детали. Она не заменяет проверку несущего каркаса.',
  guideAnchor,
});

const joints = [
  ...['A', 'B', 'C', 'D', 'E'].map((id) => {
    const [x, y] = points[id];
    return structuralJoint({
      id: `J-POST-${id}`,
      name: `Крепление стойки ${id} к нижней обвязке`,
      layerId: '09_post_joints',
      position: [x, y, 390],
      axis: [1, 0, 0],
      fasteners: [ratedFastener({
        system: '2 нержавеющих уголка Simpson Strong-Tie AB90S; полное заполнение штатных отверстий',
        type: 'соединительный винт Simpson Strong-Tie CSA5.0X40S',
        diameterMm: 5,
        lengthMm: 40,
        quantity: 30,
        drive: 'T20',
        corrosionClass: 'нержавеющая сталь A4, класс коррозионной стойкости III, для наружных работ',
        sourceIds: ['SST-AB90S', 'SST-CSA-S', 'SST-ETA-AB'],
        installNote: 'По 15 винтов на каждый уголок: заполнить все 6 отверстий одной полки и все 9 отверстий второй полки. Не заменять обычными саморезами.',
      })],
      bitDiameterMm: 3,
      depthMm: 35,
      pilotRequired: false,
      drillNote: 'CSA-S имеет режущую резьбу: штатное предварительное сверление не требуется. Уголок используется как шаблон; не рассверливать его отверстия.',
      endMm: 70,
      sideMm: 35,
      guideAnchor: `joint-J-POST-${id}`,
    });
  }),
  ...[['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'A']].map(([a, b]) => {
    const [x, y] = points[a];
    return structuralJoint({
      id: `J-UPPER-${a}${b}`,
      name: `Соединение верхней обвязки ${a}–${b} со стойкой ${a}`,
      layerId: '15_fasteners',
      position: [x, y, roofZ(x, y) - 50],
      axis: [0, 0, 1],
      fasteners: [ratedFastener({
        system: 'SPAX, нержавеющая конструкционная серия A2, частичная резьба, 8×200 мм',
        type: 'конструкционный саморез по дереву SPAX A2',
        diameterMm: 8,
        lengthMm: 200,
        quantity: 2,
        drive: 'T40',
        corrosionClass: 'нержавеющая сталь A2, для наружных работ с прямым увлажнением',
        sourceIds: ['SPAX-A2-8'],
        installNote: 'Два самореза ставить со смещением по высоте, не в одну линию волокон. Головку посадить заподлицо, не утапливать глубоко.',
      })],
      bitDiameterMm: 5,
      depthMm: 170,
      endMm: 70,
      sideMm: 35,
      guideAnchor: `joint-J-UPPER-${a}${b}`,
    });
  }),
  structuralJoint({
    id: 'J-BRACE-TYP', name: 'Типовой узел постоянной укосины', layerId: '15_fasteners',
    position: [300, 0, 900], axis: [0, 1, 0],
    fasteners: [ratedFastener({
      system: 'SPAX, нержавеющая конструкционная серия A2, частичная резьба, 8×120 мм',
      type: 'конструкционный саморез по дереву SPAX A2',
      diameterMm: 8, lengthMm: 120, quantity: 2, drive: 'T40',
      corrosionClass: 'нержавеющая сталь A2, для наружных работ с прямым увлажнением',
      sourceIds: ['SPAX-A2-8'],
      installNote: 'Количество указано на один конец укосины. Ставить два самореза вразбежку, перпендикулярно плоскости контакта.',
    })],
    bitDiameterMm: 5, depthMm: 100, endMm: 70, sideMm: 30, guideAnchor: 'joint-J-BRACE-TYP',
  }),
  structuralJoint({
    id: 'J-RAFTER-TYP', name: 'Типовой узел стропила с верхней обвязкой', layerId: '15_fasteners',
    position: [0, 0, 2820], axis: [0, 0, 1],
    fasteners: [ratedFastener({
      system: 'SPAX, нержавеющая конструкционная серия A2, частичная резьба, 8×160 мм',
      type: 'конструкционный саморез по дереву SPAX A2',
      diameterMm: 8, lengthMm: 160, quantity: 2, drive: 'T40',
      corrosionClass: 'нержавеющая сталь A2, для наружных работ с прямым увлажнением',
      sourceIds: ['SPAX-A2-8'],
      installNote: 'Количество указано на одно опирание стропила. Окончательный угол ввода и потребность в металлической стропильной связи определяет инженер.',
    })],
    bitDiameterMm: 5, depthMm: 130, endMm: 70, sideMm: 30, guideAnchor: 'joint-J-RAFTER-TYP',
  }),
  structuralJoint({
    id: 'J-BATTEN-TYP', name: 'Типовой узел обрешётки со стропилом', layerId: '15_fasteners',
    position: [0, 0, 3000], axis: [0, 0, 1],
    fasteners: [ratedFastener({
      system: 'SPAX, нержавеющая универсальная серия A2, частичная резьба, 6×100 мм',
      type: 'саморез по дереву SPAX A2',
      diameterMm: 6, lengthMm: 100, quantity: 2, drive: 'T30',
      corrosionClass: 'нержавеющая сталь A2, для наружных работ с прямым увлажнением',
      sourceIds: ['SPAX-A2-6'],
      installNote: 'По два самореза на каждое пересечение обрешётки со стропилом; ставить со смещением вдоль волокон.',
    })],
    bitDiameterMm: 4, depthMm: 80, endMm: 50, sideMm: 25, guideAnchor: 'joint-J-BATTEN-TYP',
  }),
  structuralJoint({
    id: 'J-ROOF-TYP', name: 'Типовой узел профнастила с обрешёткой', layerId: '15_fasteners',
    position: [1500, 1500, 3300], axis: [0, 0, 1],
    fasteners: [ratedFastener({
      system: 'SFS TDA-S-6.5-A2, длина 65 мм, шайба A2 с уплотнением EPDM',
      type: 'самонарезающий кровельный винт по дереву SFS TDA-S-6.5-A2',
      diameterMm: 6.5, lengthMm: 65, quantity: 1, drive: 'HEX8',
      corrosionClass: 'нержавеющая сталь A2, шайба A2 и EPDM, для наружных работ',
      sourceIds: ['SFS-TDA-2026', 'SFS-DRIVER'],
      installNote: 'Количество указано на одну точку крепления. Обеспечить не менее 35 мм входа в древесину; длину перепроверить по высоте волны выбранного профлиста.',
    })],
    bitDiameterMm: 4.5, depthMm: 40, pilotRequired: false,
    drillNote: 'Крепёж самонарезающий. Использовать шуруповёрт с регулировкой глубины и оборотами ниже 2000 об/мин; ударный гайковёрт запрещён. Шайбу обжать без выдавливания EPDM.',
    endMm: 40, sideMm: 25, guideAnchor: 'joint-J-ROOF-TYP',
  }),
  structuralJoint({
    id: 'J-WALL-BACKING-TYP', name: 'Типовой узел промежуточной стойки обшивки с нижней/верхней обвязкой', layerId: '15_fasteners',
    position: [600, 0, 590], axis: [0, 0, 1],
    fasteners: [ratedFastener({
      system: 'SPAX, нержавеющая универсальная серия A2, частичная резьба, 6×100 мм',
      type: 'саморез по дереву SPAX A2',
      diameterMm: 6, lengthMm: 100, quantity: 2, drive: 'T30',
      corrosionClass: 'нержавеющая сталь A2, для наружных работ с прямым увлажнением',
      sourceIds: ['SPAX-A2-6'],
      installNote: 'Количество указано на один конец промежуточной стойки. По два самореза сверху и снизу, со смещением по волокнам.',
    })],
    bitDiameterMm: 4, depthMm: 80, endMm: 50, sideMm: 20,
    guideAnchor: 'joint-J-WALL-BACKING-TYP',
  }),
  finishJoint({
    id: 'J-DECK-TYP', name: 'Типовой узел доски настила с лагой', layerId: '15_fasteners',
    position: [600, 600, 535], axis: [0, 0, 1],
    fasteners: [ratedFastener({
      system: 'SPAX A4 5×75, террасная серия с фиксирующей резьбой',
      type: 'террасный саморез SPAX из нержавеющей стали A4',
      diameterMm: 5, lengthMm: 75, quantity: 2, drive: 'T25',
      corrosionClass: 'нержавеющая сталь A4, для наружных настилов и влажной среды',
      sourceIds: ['SPAX-DECK-A4'],
      installNote: 'По два самореза в каждую лагу. Между досками оставить монтажный зазор 5–7 мм; головку посадить заподлицо без глубокой воронки.',
    })],
    bitDiameterMm: 4, depthMm: 45,
    drillNote: 'Несмотря на режущую геометрию самореза, для новичка и у торцов доски выполнить направляющее отверстие Ø4 мм через доску в лагу.',
    endMm: 30, sideMm: 20, guideAnchor: 'joint-J-DECK-TYP',
  }),
  finishJoint({
    id: 'J-SOLID-SLAT-TYP', name: 'Типовой узел рейки сплошной стены', layerId: '15_fasteners',
    position: [600, 0, 900], axis: [0, 1, 0],
    fasteners: [ratedFastener({
      system: 'SPAX A2 5×60, частичная резьба, потайная головка',
      type: 'нержавеющий саморез SPAX A2 по дереву',
      diameterMm: 5, lengthMm: 60, quantity: 2, drive: 'T20',
      corrosionClass: 'нержавеющая сталь A2, для наружных работ с прямым увлажнением',
      sourceIds: ['SPAX-A2-5'],
      installNote: 'Количество указано на одно пересечение рейки с опорой. По два самореза ставить в каждую крайнюю стойку и каждую промежуточную стойку 50×50.',
    })],
    bitDiameterMm: 3.5, depthMm: 45,
    drillNote: 'Сначала прижать рейку, затем просверлить направляющее отверстие через рейку и только после этого заворачивать саморез.',
    endMm: 30, sideMm: 18, guideAnchor: 'joint-J-SOLID-SLAT-TYP',
  }),
  finishJoint({
    id: 'J-LATTICE-SLAT-TYP', name: 'Типовой узел рейки решётчатой стены', layerId: '15_fasteners',
    position: [3000, 600, 900], axis: [1, 0, 0],
    fasteners: [ratedFastener({
      system: 'SPAX A2 5×60, частичная резьба, потайная головка',
      type: 'нержавеющий саморез SPAX A2 по дереву',
      diameterMm: 5, lengthMm: 60, quantity: 2, drive: 'T20',
      corrosionClass: 'нержавеющая сталь A2, для наружных работ с прямым увлажнением',
      sourceIds: ['SPAX-A2-5'],
      installNote: 'Количество указано на одно пересечение рейки с опорой. По два самореза ставить в каждую крайнюю и промежуточную стойку; зазор 55 мм выдерживать по шаблону.',
    })],
    bitDiameterMm: 3.5, depthMm: 45,
    drillNote: 'Сверлить по установленному шаблону зазора; направляющее отверстие проходит через рейку и входит в стойку.',
    endMm: 30, sideMm: 18, guideAnchor: 'joint-J-LATTICE-SLAT-TYP',
  }),
];

const sources = [
  {
    id: 'SP20', kind: 'standard',
    title: 'СП 20.13330.2016 «Нагрузки и воздействия», актуальные изменения на сайте Минстроя России',
    url: 'https://minstroyrf.gov.ru/docs/?PAGEN_1=3&active%5B0%5D=65&t%5B0%5D=62&t%5B1%5D=60',
    accessed: '2026-07-13',
    note: 'Точный снеговой и ветровой район определяется по адресу участка и действующим картам; расчёт в данном макете не выполнен.',
  },
  {
    id: 'SP64', kind: 'standard',
    title: 'СП 64.13330.2017 «Деревянные конструкции», актуальные изменения на сайте Минстроя России',
    url: 'https://minstroyrf.gov.ru/docs/?PAGEN_1=4&active%5B0%5D=65&t%5B0%5D=62&t%5B1%5D=60',
    accessed: '2026-07-13',
    note: 'Использовать для расчётной проверки деревянных элементов, соединений и минимальных расстояний.',
  },
  {
    id: 'SST-AB90S', kind: 'manufacturer',
    title: 'Simpson Strong-Tie AB90S — нержавеющий уголок A4 для несущих деревянных конструкций',
    url: 'https://www.strongtie.de/de-DE/produkte/winkelverbinder-rostfrei-70s-90s-105s-ab-s',
    accessed: '2026-07-13',
    note: 'Габариты 88×88×65 мм, 6 и 9 отверстий Ø5 по полкам; класс эксплуатации 3.',
  },
  {
    id: 'SST-CSA-S', kind: 'manufacturer',
    title: 'Simpson Strong-Tie CSA5.0X40S — нержавеющий соединительный винт A4',
    url: 'https://www.strongtie.de/de-DE/produkte/verbinderschraube-rostfrei-csa-s',
    accessed: '2026-07-13',
    note: 'Номинал 5×40 мм, привод T20; специальная режущая резьба, предварительное сверление не требуется.',
  },
  {
    id: 'SST-ETA-AB', kind: 'manufacturer',
    title: 'ETA-06/0106 Simpson Strong-Tie angle brackets, редакция 2026-03-09',
    url: 'https://www.strongtie.de/sites/default/files/field_media_file_2/2026/03/09/183114/eta-06-0106-2026-03-09.pdf',
    accessed: '2026-07-13',
    note: 'Подтверждает область применения и варианты материалов уголков; не заменяет расчёт узла беседки.',
  },
  {
    id: 'SPAX-A2-8', kind: 'manufacturer',
    title: 'SPAX A2, конструкционные саморезы с частичной резьбой Ø8 мм',
    url: 'https://www.spax.com/gb-en/p/stainless-steel-screw-partial-thread-flat-countersunk-head-t-star-plus-4cut-stainless-steel-a2.html?variant=0197000802005',
    accessed: '2026-07-13',
    note: 'Размеры 8×120, 8×160 и 8×200 мм имеют привод T40; производитель указывает применение снаружи при прямом увлажнении.',
  },
  {
    id: 'SPAX-A2-6', kind: 'manufacturer',
    title: 'SPAX A2, нержавеющий саморез с частичной резьбой 6×100 мм',
    url: 'https://www.spax.com/de-de/p/edelstahlschraube-teilgewinde-senkkopf-t-star-plus-4cut-edelstahl-rostfrei-a2.html',
    accessed: '2026-07-13',
    note: 'Артикул 0197000601003, привод T30; наружное применение с прямым увлажнением.',
  },
  {
    id: 'SPAX-A2-5', kind: 'manufacturer',
    title: 'SPAX A2, нержавеющий саморез с частичной резьбой 5×60 мм',
    url: 'https://www.spax.com/de-de/p/edelstahlschraube-teilgewinde-senkkopf-t-star-plus-4cut-edelstahl-rostfrei-a2.html',
    accessed: '2026-07-13',
    note: 'Артикул 4197000500609, привод T20; наружное применение с прямым увлажнением.',
  },
  {
    id: 'SPAX-DECK-A4', kind: 'manufacturer',
    title: 'SPAX A4, террасный саморез 5×75 мм с фиксирующей резьбой',
    url: 'https://www.spax.com/pc-en/p/decking-screw-fixing-thread-cylindrical-head-t-star-plus-cut-point-stainless-steel-a4.html',
    accessed: '2026-07-13',
    note: 'Привод T25; A4 рассчитана на наружные настилы и агрессивную влажную среду.',
  },
  {
    id: 'SFS-TDA-2026', kind: 'manufacturer',
    title: 'SFS Roofing and Cladding International Catalogue 01/2026 — TDA-S-6.5-A2',
    url: 'https://ee.sfs.com/content/files/7022%20-%20ee/downloads%20pdfs/rc/sfs%20roofing%20and%20cladding%202026%20product%20catalogue.web.pdf',
    accessed: '2026-07-13',
    note: 'Нержавеющий крепёж с EPDM для профлиста по дереву; привод HEX8; вход в древесину не менее 35 мм.',
  },
  {
    id: 'SFS-DRIVER', kind: 'manufacturer',
    title: 'SFS — руководство по инструменту для кровельного крепежа',
    url: 'https://uk.sfs.com/resources/article/screw-gun-guidance-roofing-cladding',
    accessed: '2026-07-13',
    note: 'Применять инструмент с контролем глубины, без ударного режима, ниже 2000 об/мин.',
  },
];

const checks = [
  ['CHK-POINTS', 'Точки A–E совпадают с утверждённым планом'],
  ['CHK-BLOCKS', 'Количество фундаментных блоков равно 10'],
  ['CHK-ENTRANCE', 'Вход C–D открыт и имеет длину около 1414 мм'],
  ['CHK-POSTS', 'Установлены пять стоек'],
  ['CHK-POST-BEARING', 'Стойки опираются на несущую обвязку'],
  ['CHK-UPPER', 'Верхняя обвязка содержит пять участков'],
  ['CHK-HORIZONTAL-SLATS', 'Все рейки стен горизонтальны'],
  ['CHK-SOLID', 'Стены A–B и A–E сплошные'],
  ['CHK-LATTICE', 'Стены B–C и D–E имеют зазор 55 мм'],
  ['CHK-BRACES', 'Постоянные укосины присутствуют'],
  ['CHK-WALL-BACKING', 'Горизонтальная обшивка имеет 14 промежуточных опор'],
  ['CHK-RAFTERS', 'Стропила построены по утверждённому направлению и шагу'],
  ['CHK-BATTENS', 'Обрешётка построена по утверждённому направлению и шагу'],
  ['CHK-ROOF', 'Кровельный слой присутствует только на кровельных этапах'],
  ['CHK-JOINTS', 'Все силовые узлы имеют карточки крепежа и статус проверки'],
].map(([id, label]) => ({ id, label }));

export const constructionData = Object.freeze({
  units: 'mm',
  region: 'Окрестности Санкт-Петербурга',
  points,
  roof: { overhang: 150, thickness: 10, z0: 2740, slopeXY: 0.12 },
  layers,
  stages,
  members: {
    posts: ['A', 'B', 'C', 'D', 'E'],
    upperFrame: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'A']],
    solidWalls: [['A', 'B'], ['A', 'E']],
    latticeWalls: [['B', 'C'], ['D', 'E']],
    wallBacking: [
      { wallId: 'AB', a: 'A', b: 'B', positions: [0.2, 0.4, 0.6, 0.8], layerId: '12_solid_cladding' },
      { wallId: 'AE', a: 'A', b: 'E', positions: [0.2, 0.4, 0.6, 0.8], layerId: '12_solid_cladding' },
      { wallId: 'BC', a: 'B', b: 'C', positions: [0.25, 0.5, 0.75], layerId: '13_lattice_cladding' },
      { wallId: 'DE', a: 'D', b: 'E', positions: [0.25, 0.5, 0.75], layerId: '13_lattice_cladding' },
    ],
    rafters: { section: [50, 150], offsets: [-3000, -2400, -1800, -1200, -600, 0, 600, 1200, 1800, 2400, 3000] },
    battens: { section: [50, 50], sums: [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000] },
  },
  floor: { lowerFrameSection: [150, 150], joistSection: [50, 150], deckThickness: 40, boardVisualStep: 120 },
  walls: {
    bottomZ: 540,
    roofClearance: 90,
    solid: { boardDepth: 24, boardHeight: 110, gap: 0 },
    lattice: { boardDepth: 24, boardHeight: 90, gap: 55, maxZ: 1510 },
  },
  parts,
  joints,
  checks,
  sources,
});

export const getPart = (id) => constructionData.parts.find((item) => item.id === id);
export const getJoint = (id) => constructionData.joints.find((item) => item.id === id);
export const getStage = (id) => constructionData.stages.find((item) => item.id === id);

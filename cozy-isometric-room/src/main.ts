import './styles.css';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Crosshair,
  Pause,
  Play,
  RotateCcw,
  UserRound,
  createIcons
} from 'lucide';
import * as THREE from 'three';

type ZoneId = 'research' | 'build' | 'review' | 'deploy';
type AgentStatus = 'idle' | 'working' | 'paused' | 'blocked' | 'done';
type DockAction = 'overview' | 'simulation' | 'focus' | 'reset';
type PanelAction = 'assign' | 'pause' | 'escalate' | 'complete';
type InteractiveKind = 'agent' | 'zone' | 'board';

type ZoneDefinition = {
  id: ZoneId;
  title: string;
  subtitle: string;
  color: string;
  position: THREE.Vector3;
};

type Task = {
  id: string;
  title: string;
  zoneId: ZoneId;
  status: AgentStatus;
  progress: number;
  ownerId: string | null;
};

type Agent = {
  id: string;
  name: string;
  role: string;
  zoneId: ZoneId;
  status: AgentStatus;
  taskId: string | null;
  progress: number;
  color: string;
  offset: THREE.Vector3;
  group?: THREE.Group;
  haloMaterial?: THREE.MeshBasicMaterial;
  bodyMaterial?: THREE.MeshStandardMaterial;
  marker?: THREE.Group;
  leftLeg?: THREE.Mesh;
  rightLeg?: THREE.Mesh;
};

type InteractiveItem = {
  id: string;
  kind: InteractiveKind;
  entityId: string;
  label: string;
  group: THREE.Group;
  baseY: number;
  hoverLift: number;
  hoverScale: number;
  onClick: () => void;
};

type TaskCardModel = {
  group: THREE.Group;
  material: THREE.MeshStandardMaterial;
  progressBar: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
};

declare global {
  interface Window {
    __agentStudioDebug?: {
      getAgentScreenPosition: (id: string) => { x: number; y: number } | null;
    };
  }
}

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app root');
}

app.innerHTML = `
  <main class="studio-shell">
    <div class="studio-title">
      <span class="studio-title__kicker">3D project studio</span>
      <h1>Студия агентов</h1>
    </div>
    <canvas class="studio-canvas" aria-label="Интерактивная 3D-студия управления агентами"></canvas>
    <div class="object-tag" aria-live="polite"></div>
    <aside class="control-panel" data-panel aria-live="polite"></aside>
    <div class="agent-rail" data-agent-rail aria-label="Агенты проекта"></div>
    <nav class="studio-dock" aria-label="Демо-управление">
      <button class="dock-button is-active" type="button" data-action="overview" aria-label="Обзор">
        <i data-lucide="clipboard-list"></i>
        <span>Обзор</span>
      </button>
      <button class="dock-button is-active" type="button" data-action="simulation" aria-label="Симуляция">
        <i data-lucide="activity"></i>
        <span>Симуляция</span>
      </button>
      <button class="dock-button" type="button" data-action="focus" aria-label="Фокус">
        <i data-lucide="crosshair"></i>
        <span>Фокус</span>
      </button>
      <button class="dock-button" type="button" data-action="reset" aria-label="Сброс">
        <i data-lucide="rotate-ccw"></i>
        <span>Сброс</span>
      </button>
    </nav>
  </main>
`;

createIcons({
  icons: {
    Activity,
    AlertTriangle,
    CheckCircle2,
    ClipboardList,
    Crosshair,
    Pause,
    Play,
    RotateCcw,
    UserRound
  }
});

const shellElement = document.querySelector<HTMLElement>('.studio-shell');
const canvasElement = document.querySelector<HTMLCanvasElement>('.studio-canvas');
const tagElement = document.querySelector<HTMLDivElement>('.object-tag');
const panelElement = document.querySelector<HTMLElement>('[data-panel]');
const agentRailElement = document.querySelector<HTMLElement>('[data-agent-rail]');
const dockButtons = [...document.querySelectorAll<HTMLButtonElement>('.dock-button')];

if (!shellElement || !canvasElement || !tagElement || !panelElement || !agentRailElement) {
  throw new Error('Missing studio UI elements');
}

const shell = shellElement;
const canvas = canvasElement;
const tag = tagElement;
const panel = panelElement;
const agentRail = agentRailElement;

const palette = {
  background: '#dfe8e4',
  charcoal: '#202a28',
  ink: '#293633',
  floor: '#a98261',
  floorDark: '#725438',
  wallLeft: '#d9e3dc',
  wallBack: '#ece7dc',
  trim: '#5f6f68',
  glass: '#eaf3f1',
  desk: '#7e6048',
  deskDark: '#4c3a2e',
  research: '#5f817a',
  build: '#b67a58',
  review: '#8a6f94',
  deploy: '#607d61',
  blocked: '#b85d52',
  amber: '#dca65b',
  cream: '#f5ead6'
};

const zoneDefinitions: ZoneDefinition[] = [
  {
    id: 'research',
    title: 'Исследование',
    subtitle: 'контекст',
    color: palette.research,
    position: new THREE.Vector3(-2.85, 0.04, -1.35)
  },
  {
    id: 'build',
    title: 'Сборка',
    subtitle: 'код',
    color: palette.build,
    position: new THREE.Vector3(-0.62, 0.04, -1.1)
  },
  {
    id: 'review',
    title: 'Ревью',
    subtitle: 'проверка',
    color: palette.review,
    position: new THREE.Vector3(1.55, 0.04, -1.2)
  },
  {
    id: 'deploy',
    title: 'Деплой',
    subtitle: 'handoff',
    color: palette.deploy,
    position: new THREE.Vector3(2.3, 0.04, 1.26)
  }
];

const zoneMap = new Map(zoneDefinitions.map((zone) => [zone.id, zone]));

const initialTasks: Task[] = [
  {
    id: 'task-context',
    title: 'Собрать контекст из брифа',
    zoneId: 'research',
    status: 'working',
    progress: 46,
    ownerId: 'scout'
  },
  {
    id: 'task-scene',
    title: 'Собрать демо-сцену',
    zoneId: 'build',
    status: 'working',
    progress: 63,
    ownerId: 'builder'
  },
  {
    id: 'task-risk',
    title: 'Проверить edge cases',
    zoneId: 'review',
    status: 'blocked',
    progress: 31,
    ownerId: 'critic'
  },
  {
    id: 'task-handoff',
    title: 'Подготовить handoff',
    zoneId: 'deploy',
    status: 'idle',
    progress: 12,
    ownerId: 'operator'
  },
  {
    id: 'task-sources',
    title: 'Сверить источники',
    zoneId: 'research',
    status: 'idle',
    progress: 0,
    ownerId: null
  },
  {
    id: 'task-smoke',
    title: 'Снять smoke screenshots',
    zoneId: 'review',
    status: 'idle',
    progress: 0,
    ownerId: null
  }
];

const initialAgents: Agent[] = [
  {
    id: 'scout',
    name: 'Scout',
    role: 'Исследователь',
    zoneId: 'research',
    status: 'working',
    taskId: 'task-context',
    progress: 46,
    color: palette.research,
    offset: new THREE.Vector3(-0.18, 0, 0.58)
  },
  {
    id: 'builder',
    name: 'Builder',
    role: 'Сборщик',
    zoneId: 'build',
    status: 'working',
    taskId: 'task-scene',
    progress: 63,
    color: palette.build,
    offset: new THREE.Vector3(0.2, 0, 0.58)
  },
  {
    id: 'critic',
    name: 'Critic',
    role: 'Ревьюер',
    zoneId: 'review',
    status: 'blocked',
    taskId: 'task-risk',
    progress: 31,
    color: palette.review,
    offset: new THREE.Vector3(-0.18, 0, 0.58)
  },
  {
    id: 'operator',
    name: 'Operator',
    role: 'Оператор',
    zoneId: 'deploy',
    status: 'idle',
    taskId: 'task-handoff',
    progress: 12,
    color: palette.deploy,
    offset: new THREE.Vector3(0.08, 0, -0.54)
  }
];

const state = {
  agents: cloneAgents(),
  tasks: cloneTasks(),
  selectedAgentId: 'scout',
  selectedZoneId: '' as ZoneId | '',
  simulation: true,
  focusMode: false,
  cameraAngle: 0,
  cameraTargetAngle: 0,
  dragStartX: 0,
  dragStartAngle: 0,
  isDragging: false,
  hoveredId: ''
};

function cloneTasks() {
  return initialTasks.map((task) => ({ ...task }));
}

function cloneAgents() {
  return initialAgents.map((agent) => ({
    ...agent,
    offset: agent.offset.clone()
  }));
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(palette.background);
scene.fog = new THREE.Fog(palette.background, 13, 24);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

let aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(-5.8 * aspect, 5.8 * aspect, 5.8, -5.8, 0.1, 100);
camera.position.set(7.2, 6.6, 7.2);
camera.lookAt(0, 0.75, 0);
scene.add(camera);

const room = new THREE.Group();
room.rotation.y = -0.16;
scene.add(room);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(-10, -10);
const interactives = new Map<string, InteractiveItem>();
const interactiveMeshes: THREE.Object3D[] = [];
const zoneGroups = new Map<ZoneId, THREE.Group>();
const taskCards = new Map<string, TaskCardModel>();
const cameraLookTarget = new THREE.Vector3(0, 0.8, 0);

let lastFrame = performance.now();

function makeMat(color: string | number, options: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.02,
    ...options
  });
}

function makeBox(
  size: [number, number, number],
  position: [number, number, number],
  color: string | number,
  options: THREE.MeshStandardMaterialParameters = {}
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), makeMat(color, options));
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeCylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments: number,
  color: string | number,
  options: THREE.MeshStandardMaterialParameters = {}
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments),
    makeMat(color, options)
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makePlane(
  width: number,
  height: number,
  color: string | number,
  options: THREE.MeshStandardMaterialParameters = {}
) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), makeMat(color, options));
  mesh.receiveShadow = true;
  return mesh;
}

function addToGroup<T extends THREE.Object3D>(group: THREE.Group, object: T) {
  group.add(object);
  return object;
}

function markInteractive(
  id: string,
  kind: InteractiveKind,
  entityId: string,
  label: string,
  group: THREE.Group,
  onClick: () => void,
  hoverLift = 0.1,
  hoverScale = 1.035
) {
  const item: InteractiveItem = {
    id,
    kind,
    entityId,
    label,
    group,
    baseY: group.position.y,
    hoverLift,
    hoverScale,
    onClick
  };

  group.userData.interactiveId = id;
  group.traverse((object) => {
    object.userData.interactiveId = id;
    if ((object as THREE.Mesh).isMesh) {
      interactiveMeshes.push(object);
    }
  });

  interactives.set(id, item);
  return group;
}

function makeTextPlane(
  lines: string[],
  width: number,
  height: number,
  options: {
    background?: string;
    color?: string;
    accent?: string;
    fontSize?: number;
    align?: CanvasTextAlign;
  } = {}
) {
  const canvasLabel = document.createElement('canvas');
  canvasLabel.width = 512;
  canvasLabel.height = 256;
  const context = canvasLabel.getContext('2d');

  if (!context) {
    throw new Error('Canvas 2D context unavailable');
  }

  context.clearRect(0, 0, canvasLabel.width, canvasLabel.height);
  context.fillStyle = options.background ?? 'rgba(245, 239, 224, 0.92)';
  context.fillRect(0, 0, canvasLabel.width, canvasLabel.height);
  context.fillStyle = options.accent ?? 'rgba(80, 108, 100, 0.24)';
  context.fillRect(0, 0, 14, canvasLabel.height);
  context.fillStyle = options.color ?? palette.ink;
  context.textAlign = options.align ?? 'left';
  context.textBaseline = 'middle';
  context.font = `700 ${options.fontSize ?? 46}px Outfit, system-ui, sans-serif`;

  const x = options.align === 'center' ? canvasLabel.width / 2 : 42;
  lines.forEach((line, index) => {
    context.fillText(line, x, 92 + index * 56);
  });

  const texture = new THREE.CanvasTexture(canvasLabel);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

const hemiLight = new THREE.HemisphereLight('#edf4ec', '#716252', 1.55);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight('#fff5d8', 2.3);
sunLight.position.set(4.2, 7.2, 5.2);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.left = -7;
sunLight.shadow.camera.right = 7;
sunLight.shadow.camera.top = 7;
sunLight.shadow.camera.bottom = -7;
scene.add(sunLight);

const deskLight = new THREE.PointLight('#ffe0a4', 2.1, 7.2, 1.55);
deskLight.position.set(-0.5, 2.6, -0.6);
deskLight.castShadow = true;
room.add(deskLight);

function buildOfficeShell() {
  const floor = makeBox([8.8, 0.18, 6.3], [0, -0.09, 0], palette.floor);
  floor.receiveShadow = true;
  room.add(floor);

  for (let index = 0; index < 10; index += 1) {
    const lineX = makeBox([0.022, 0.014, 6.16], [-4 + index * 0.88, 0.012, 0], palette.floorDark, {
      roughness: 0.92
    });
    lineX.castShadow = false;
    const lineZ = makeBox([8.46, 0.014, 0.022], [0, 0.014, -2.85 + index * 0.7], palette.floorDark, {
      roughness: 0.92
    });
    lineZ.castShadow = false;
    room.add(lineX, lineZ);
  }

  const backWall = makeBox([8.8, 3.2, 0.2], [0, 1.55, -3.16], palette.wallBack);
  const leftWall = makeBox([0.2, 3.2, 6.3], [-4.4, 1.55, 0], palette.wallLeft);
  backWall.castShadow = false;
  leftWall.castShadow = false;
  room.add(backWall, leftWall);

  room.add(makeBox([8.8, 0.12, 0.16], [0, 0.2, -2.98], palette.trim));
  room.add(makeBox([0.16, 0.12, 6.3], [-4.22, 0.2, 0], palette.trim));

  const board = new THREE.Group();
  board.position.set(-0.8, 1.72, -3.04);
  addToGroup(board, makeBox([3.7, 1.36, 0.09], [0, 0, 0], '#27332f'));

  const boardTitle = makeTextPlane(['Живой пайплайн'], 1.42, 0.28, {
    background: 'rgba(236, 231, 220, 0.95)',
    color: palette.ink,
    accent: palette.deploy,
    fontSize: 42
  });
  boardTitle.position.set(-1.05, 0.48, 0.07);
  board.add(boardTitle);

  zoneDefinitions.forEach((zone, index) => {
    const x = -1.32 + index * 0.88;
    const column = makeBox([0.56, 0.82, 0.08], [x, -0.16, 0.08], '#34423d', {
      roughness: 0.85
    });
    board.add(column);

    for (let item = 0; item < 3; item += 1) {
      const block = makeBox([0.38, 0.08, 0.09], [x, 0.12 - item * 0.22, 0.15], zone.color, {
        roughness: 0.64
      });
      block.castShadow = false;
      board.add(block);
    }
  });

  room.add(markInteractive('board-main', 'board', 'board', 'Пайплайн проекта', board, showOverview, 0.04, 1.02));

  const routePoints = [
    new THREE.Vector3(-2.85, 0.04, -0.22),
    new THREE.Vector3(-0.62, 0.04, -0.2),
    new THREE.Vector3(1.55, 0.04, -0.18),
    new THREE.Vector3(2.3, 0.04, 0.54)
  ];
  const routeGeometry = new THREE.BufferGeometry().setFromPoints(routePoints);
  const route = new THREE.Line(
    routeGeometry,
    new THREE.LineBasicMaterial({
      color: '#536a62',
      transparent: true,
      opacity: 0.55
    })
  );
  room.add(route);
}

function createZone(zone: ZoneDefinition, index: number) {
  const group = new THREE.Group();
  group.position.copy(zone.position);

  const zoneBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.82, 0.035, 1.52),
    makeMat(zone.color, {
      transparent: true,
      opacity: 0.46,
      roughness: 0.9
    })
  );
  zoneBase.position.set(0, 0.015, 0);
  zoneBase.castShadow = false;
  zoneBase.receiveShadow = true;
  group.add(zoneBase);

  addToGroup(group, makeBox([1.38, 0.15, 0.72], [0, 0.46, -0.08], palette.desk));
  addToGroup(group, makeBox([0.1, 0.48, 0.1], [-0.54, 0.2, -0.34], palette.deskDark));
  addToGroup(group, makeBox([0.1, 0.48, 0.1], [0.54, 0.2, -0.34], palette.deskDark));
  addToGroup(group, makeBox([0.1, 0.48, 0.1], [-0.54, 0.2, 0.18], palette.deskDark));
  addToGroup(group, makeBox([0.1, 0.48, 0.1], [0.54, 0.2, 0.18], palette.deskDark));

  const screen = makeBox([0.58, 0.46, 0.06], [0.05, 0.83, -0.38], '#27332f', {
    roughness: 0.5
  });
  group.add(screen);
  const screenGlow = makePlane(0.46, 0.32, zone.color, {
    emissive: new THREE.Color(zone.color),
    emissiveIntensity: 0.28,
    transparent: true,
    opacity: 0.76
  });
  screenGlow.position.set(0.05, 0.83, -0.345);
  group.add(screenGlow);

  const label = makeTextPlane([zone.title, zone.subtitle], 0.96, 0.44, {
    background: 'rgba(245, 239, 224, 0.95)',
    color: palette.ink,
    accent: zone.color,
    fontSize: 42
  });
  label.position.set(0, 1.23, -0.5);
  group.add(label);

  for (let queueIndex = 0; queueIndex < 3; queueIndex += 1) {
    const card = makeBox(
      [0.28, 0.055, 0.2],
      [-0.42 + queueIndex * 0.24, 0.58, 0.2],
      queueIndex <= index % 3 ? zone.color : '#d9ccb8'
    );
    card.rotation.y = -0.08 + queueIndex * 0.04;
    group.add(card);
  }

  zoneGroups.set(zone.id, group);
  room.add(
    markInteractive(
      `zone-${zone.id}`,
      'zone',
      zone.id,
      `${zone.title}: очередь`,
      group,
      () => selectZone(zone.id),
      0.06,
      1.02
    )
  );
}

function createAgent(agent: Agent) {
  const group = new THREE.Group();
  const start = getAgentTarget(agent);
  group.position.copy(start);

  const haloMaterial = new THREE.MeshBasicMaterial({
    color: agent.color,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.5, 48), haloMaterial);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.018;
  group.add(halo);

  const leftLeg = makeBox([0.11, 0.38, 0.12], [-0.08, 0.22, 0], '#293330');
  const rightLeg = makeBox([0.11, 0.38, 0.12], [0.08, 0.22, 0], '#293330');
  group.add(leftLeg, rightLeg);

  const bodyMaterial = makeMat(agent.color, { roughness: 0.62 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.52, 0.25), bodyMaterial);
  body.position.set(0, 0.66, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const badge = makeBox([0.19, 0.08, 0.018], [0, 0.74, 0.14], palette.cream, {
    roughness: 0.82
  });
  group.add(badge);

  const leftArm = makeBox([0.08, 0.42, 0.09], [-0.25, 0.62, 0.02], '#293330');
  const rightArm = makeBox([0.08, 0.42, 0.09], [0.25, 0.62, 0.02], '#293330');
  leftArm.rotation.z = 0.16;
  rightArm.rotation.z = -0.16;
  group.add(leftArm, rightArm);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16), makeMat('#d7b18b', { roughness: 0.55 }));
  head.position.set(0, 1.08, 0);
  head.castShadow = true;
  group.add(head);

  const cap = makeCylinder(0.16, 0.19, 0.11, 18, palette.charcoal);
  cap.position.set(0, 1.22, 0);
  group.add(cap);

  const marker = new THREE.Group();
  marker.position.set(0, 1.55, 0);
  const markerCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.13),
    makeMat(palette.blocked, {
      emissive: new THREE.Color(palette.blocked),
      emissiveIntensity: 0.8
    })
  );
  markerCore.castShadow = false;
  marker.add(markerCore);
  marker.visible = agent.status === 'blocked';
  group.add(marker);

  const namePlate = makeTextPlane([agent.role], 0.62, 0.16, {
    background: 'rgba(245, 239, 224, 0.86)',
    color: palette.ink,
    accent: agent.color,
    fontSize: 38
  });
  namePlate.position.set(0, 1.42, -0.03);
  namePlate.scale.setScalar(0.82);
  group.add(namePlate);

  agent.group = group;
  agent.haloMaterial = haloMaterial;
  agent.bodyMaterial = bodyMaterial;
  agent.marker = marker;
  agent.leftLeg = leftLeg;
  agent.rightLeg = rightLeg;

  room.add(
    markInteractive(
      `agent-${agent.id}`,
      'agent',
      agent.id,
      `${agent.role}: ${statusLabel(agent.status)}`,
      group,
      () => selectAgent(agent.id),
      0.08,
      1.045
    )
  );
}

function createTaskCards() {
  state.tasks.forEach((task) => {
    const group = new THREE.Group();
    const material = makeMat(statusColor(task.status), {
      roughness: 0.7,
      metalness: 0.02
    });
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.34), material);
    card.castShadow = true;
    card.receiveShadow = true;
    group.add(card);

    const progressBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.025, 0.045),
      makeMat('#f6ead4', {
        emissive: new THREE.Color('#f6ead4'),
        emissiveIntensity: 0.08
      })
    );
    progressBar.position.set(0, 0.065, 0.12);
    group.add(progressBar);
    taskCards.set(task.id, { group, material, progressBar });
    room.add(group);
  });
}

function getZone(zoneId: ZoneId) {
  const zone = zoneMap.get(zoneId);
  if (!zone) {
    throw new Error(`Unknown zone: ${zoneId}`);
  }
  return zone;
}

function getAgentTarget(agent: Agent) {
  const task = getTask(agent.taskId);
  const zoneId = agent.status === 'done' ? 'deploy' : task?.zoneId ?? agent.zoneId;
  const zone = getZone(zoneId);
  return zone.position.clone().add(agent.offset);
}

function getTask(taskId: string | null) {
  if (!taskId) {
    return null;
  }
  return state.tasks.find((task) => task.id === taskId) ?? null;
}

function getAgent(agentId: string) {
  return state.agents.find((agent) => agent.id === agentId) ?? null;
}

function statusLabel(status: AgentStatus) {
  const labels: Record<AgentStatus, string> = {
    idle: 'Ожидает',
    working: 'В работе',
    paused: 'Пауза',
    blocked: 'Блокер',
    done: 'Готово'
  };
  return labels[status];
}

function statusColor(status: AgentStatus) {
  const colors: Record<AgentStatus, string> = {
    idle: '#8d9a91',
    working: '#5f817a',
    paused: '#c09a63',
    blocked: palette.blocked,
    done: palette.deploy
  };
  return colors[status];
}

function statusDescription(agent: Agent) {
  const task = getTask(agent.taskId);
  if (agent.status === 'blocked') return 'Нужна эскалация или ручное решение.';
  if (agent.status === 'paused') return 'Агент остановлен, контекст сохранен.';
  if (agent.status === 'done') return 'Результат готов к handoff.';
  if (agent.status === 'working') return `Работает над задачей: ${task?.title ?? 'демо-задача'}.`;
  return 'Готов принять следующую задачу.';
}

function selectAgent(agentId: string) {
  state.selectedAgentId = agentId;
  state.selectedZoneId = '';
  state.focusMode = true;
  renderUi();
}

function selectZone(zoneId: ZoneId) {
  state.selectedZoneId = zoneId;
  state.selectedAgentId = '';
  state.focusMode = false;
  renderUi();
}

function showOverview() {
  state.selectedAgentId = '';
  state.selectedZoneId = '';
  state.focusMode = false;
  renderUi();
}

function setDockActive(action: DockAction, active: boolean) {
  const button = dockButtons.find((item) => item.dataset.action === action);
  button?.classList.toggle('is-active', active);
}

function renderDock() {
  setDockActive('overview', !state.selectedAgentId && !state.selectedZoneId);
  setDockActive('simulation', state.simulation);
  setDockActive('focus', state.focusMode);
}

function renderAgentRail() {
  agentRail.innerHTML = state.agents
    .map((agent) => {
      const selected = state.selectedAgentId === agent.id ? ' is-selected' : '';
      const task = getTask(agent.taskId);
      const progress = Math.round(task?.progress ?? agent.progress);
      return `
        <button class="agent-pill${selected}" type="button" data-agent-id="${agent.id}">
          <span class="agent-pill__dot" style="--agent-color: ${statusColor(agent.status)}"></span>
          <span>
            <strong>${agent.role}</strong>
            <small>${statusLabel(agent.status)} · ${progress}%</small>
          </span>
        </button>
      `;
    })
    .join('');

  agentRail.querySelectorAll<HTMLButtonElement>('[data-agent-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const agentId = button.dataset.agentId;
      if (agentId) selectAgent(agentId);
    });
  });
}

function renderPanel() {
  const selectedAgent = state.selectedAgentId ? getAgent(state.selectedAgentId) : null;

  if (selectedAgent) {
    const task = getTask(selectedAgent.taskId);
    const progress = Math.round(task?.progress ?? selectedAgent.progress);
    panel.dataset.mode = 'agent';
    panel.innerHTML = `
      <div class="panel-header">
        <span class="panel-kicker">агент</span>
        <h2>${selectedAgent.role}</h2>
        <span class="status-chip status-chip--${selectedAgent.status}">
          <span></span>${statusLabel(selectedAgent.status)}
        </span>
      </div>
      <div class="agent-card">
        <div class="agent-card__avatar" style="--agent-color: ${selectedAgent.color}">
          <i data-lucide="user-round"></i>
        </div>
        <div>
          <strong>${selectedAgent.name}</strong>
          <small>${statusDescription(selectedAgent)}</small>
        </div>
      </div>
      <div class="task-block">
        <span>Текущая задача</span>
        <strong>${task?.title ?? 'Новая задача не назначена'}</strong>
        <div class="progress-line" aria-label="Прогресс ${progress}%">
          <span style="width: ${progress}%"></span>
        </div>
      </div>
      <div class="panel-actions">
        <button type="button" data-panel-action="assign">Назначить</button>
        <button type="button" data-panel-action="pause">Пауза</button>
        <button type="button" data-panel-action="escalate">Эскалировать</button>
        <button type="button" data-panel-action="complete">Завершить</button>
      </div>
    `;
    bindPanelActions(selectedAgent.id);
    createIcons({ icons: { UserRound }, root: panel });
    return;
  }

  if (state.selectedZoneId) {
    const zone = getZone(state.selectedZoneId);
    const tasks = state.tasks.filter((task) => task.zoneId === state.selectedZoneId && task.status !== 'done');
    panel.dataset.mode = 'zone';
    panel.innerHTML = `
      <div class="panel-header">
        <span class="panel-kicker">зона</span>
        <h2>${zone.title}</h2>
        <span class="status-chip">
          <span></span>${tasks.length} задач
        </span>
      </div>
      <div class="zone-queue">
        ${
          tasks.length
            ? tasks
                .map(
                  (task) => `
                    <div class="queue-row">
                      <span class="queue-row__marker" style="--agent-color: ${statusColor(task.status)}"></span>
                      <div>
                        <strong>${task.title}</strong>
                        <small>${statusLabel(task.status)} · ${Math.round(task.progress)}%</small>
                      </div>
                    </div>
                  `
                )
                .join('')
            : '<div class="empty-state">Очередь пуста</div>'
        }
      </div>
    `;
    return;
  }

  const active = state.agents.filter((agent) => agent.status === 'working').length;
  const blocked = state.agents.filter((agent) => agent.status === 'blocked').length;
  const done = state.tasks.filter((task) => task.status === 'done').length;
  panel.dataset.mode = 'overview';
  panel.innerHTML = `
    <div class="panel-header">
      <span class="panel-kicker">обзор</span>
      <h2>Пульт проекта</h2>
      <span class="status-chip">
        <span></span>${state.simulation ? 'симуляция' : 'ручной режим'}
      </span>
    </div>
    <div class="metrics-grid">
      <div><strong>${active}</strong><span>в работе</span></div>
      <div><strong>${blocked}</strong><span>блокеры</span></div>
      <div><strong>${done}</strong><span>готово</span></div>
    </div>
    <div class="zone-queue">
      ${zoneDefinitions
        .map((zone) => {
          const count = state.tasks.filter((task) => task.zoneId === zone.id && task.status !== 'done').length;
          return `
            <button class="zone-link" type="button" data-zone-id="${zone.id}">
              <span class="queue-row__marker" style="--agent-color: ${zone.color}"></span>
              <strong>${zone.title}</strong>
              <small>${count} задач</small>
            </button>
          `;
        })
        .join('')}
    </div>
  `;

  panel.querySelectorAll<HTMLButtonElement>('[data-zone-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const zoneId = button.dataset.zoneId as ZoneId | undefined;
      if (zoneId) selectZone(zoneId);
    });
  });
}

function bindPanelActions(agentId: string) {
  panel.querySelectorAll<HTMLButtonElement>('[data-panel-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.panelAction as PanelAction | undefined;
      if (action) {
        runPanelAction(agentId, action);
      }
    });
  });
}

function renderUi() {
  shell.classList.toggle('is-focus', state.focusMode);
  renderDock();
  renderAgentRail();
  renderPanel();
}

function runPanelAction(agentId: string, action: PanelAction) {
  const agent = getAgent(agentId);
  if (!agent) return;

  if (action === 'assign') {
    assignTask(agent);
  }

  if (action === 'pause') {
    const task = getTask(agent.taskId);
    agent.status = agent.status === 'paused' ? 'working' : 'paused';
    if (task) task.status = agent.status;
  }

  if (action === 'escalate') {
    const task = getTask(agent.taskId);
    agent.status = 'blocked';
    if (task) task.status = 'blocked';
  }

  if (action === 'complete') {
    const task = getTask(agent.taskId);
    agent.status = 'done';
    agent.progress = 100;
    if (task) {
      task.status = 'done';
      task.progress = 100;
      task.zoneId = 'deploy';
    }
  }

  renderUi();
}

function assignTask(agent: Agent) {
  const currentTask = getTask(agent.taskId);
  let nextTask =
    currentTask && currentTask.status !== 'done'
      ? currentTask
      : state.tasks.find((task) => task.status === 'idle' && (!task.ownerId || task.zoneId === agent.zoneId));

  if (!nextTask) {
    nextTask = {
      id: `task-demo-${Date.now()}`,
      title: `Демо-задача для ${agent.role.toLowerCase()}`,
      zoneId: agent.zoneId,
      status: 'idle',
      progress: 0,
      ownerId: null
    };
    state.tasks.push(nextTask);
    createTaskCard(nextTask);
  }

  nextTask.ownerId = agent.id;
  nextTask.status = 'working';
  nextTask.progress = Math.max(nextTask.progress, 8);
  agent.taskId = nextTask.id;
  agent.status = 'working';
  agent.progress = nextTask.progress;
}

function createTaskCard(task: Task) {
  const group = new THREE.Group();
  const material = makeMat(statusColor(task.status), {
    roughness: 0.7,
    metalness: 0.02
  });
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.34), material);
  card.castShadow = true;
  card.receiveShadow = true;
  group.add(card);

  const progressBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.025, 0.045),
    makeMat('#f6ead4', {
      emissive: new THREE.Color('#f6ead4'),
      emissiveIntensity: 0.08
    })
  );
  progressBar.position.set(0, 0.065, 0.12);
  group.add(progressBar);
  taskCards.set(task.id, { group, material, progressBar });
  room.add(group);
}

function runDockAction(action: DockAction) {
  if (action === 'overview') {
    showOverview();
  }

  if (action === 'simulation') {
    state.simulation = !state.simulation;
  }

  if (action === 'focus') {
    state.focusMode = !state.focusMode;
    if (state.focusMode && !state.selectedAgentId) {
      state.selectedAgentId = state.agents[0]?.id ?? '';
      state.selectedZoneId = '';
    }
  }

  if (action === 'reset') {
    resetStudio();
  }

  renderUi();
}

function resetStudio() {
  state.tasks = cloneTasks();
  const previousModels = [...taskCards.values()];
  previousModels.forEach((model) => room.remove(model.group));
  taskCards.clear();
  createTaskCards();

  state.agents.forEach((agent, index) => {
    const next = cloneAgents()[index];
    agent.zoneId = next.zoneId;
    agent.status = next.status;
    agent.taskId = next.taskId;
    agent.progress = next.progress;
    agent.offset.copy(next.offset);
  });

  state.selectedAgentId = 'scout';
  state.selectedZoneId = '';
  state.simulation = true;
  state.focusMode = false;
  state.cameraTargetAngle = 0;
  state.cameraAngle = 0;
}

function getInteractiveFromObject(object: THREE.Object3D | null) {
  let current = object;
  while (current) {
    const id = current.userData.interactiveId as string | undefined;
    if (id && interactives.has(id)) {
      return interactives.get(id) ?? null;
    }
    current = current.parent;
  }
  return null;
}

function updatePointer(event: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function updateHovered() {
  raycaster.setFromCamera(pointer, camera);
  const [hit] = raycaster.intersectObjects(interactiveMeshes, false);
  const item = getInteractiveFromObject(hit?.object ?? null);
  const nextId = item?.id ?? '';

  if (nextId !== state.hoveredId) {
    state.hoveredId = nextId;
    canvas.classList.toggle('is-hovering', Boolean(nextId));
    tag.classList.toggle('is-visible', Boolean(item));
    tag.textContent = item?.label ?? '';
  }
}

function handlePointerMove(event: PointerEvent) {
  updatePointer(event);
  if (state.isDragging) {
    const delta = (event.clientX - state.dragStartX) / Math.max(window.innerWidth, 1);
    state.cameraTargetAngle = THREE.MathUtils.clamp(state.dragStartAngle + delta * 1.2, -0.42, 0.42);
  }
}

function handlePointerDown(event: PointerEvent) {
  updatePointer(event);
  updateHovered();
  if (!state.hoveredId) {
    state.isDragging = true;
    state.dragStartX = event.clientX;
    state.dragStartAngle = state.cameraTargetAngle;
    canvas.classList.add('is-dragging');
  }
}

function handlePointerUp() {
  state.isDragging = false;
  canvas.classList.remove('is-dragging');
}

function handleClick(event: MouseEvent) {
  updatePointer(event as PointerEvent);
  updateHovered();
  const item = interactives.get(state.hoveredId);
  if (item) {
    item.onClick();
    pulseObject(item.group);
  }
}

canvas.addEventListener('pointermove', handlePointerMove);
canvas.addEventListener('pointerdown', handlePointerDown);
window.addEventListener('pointerup', handlePointerUp);
canvas.addEventListener('click', handleClick);

dockButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.action as DockAction | undefined;
    if (action) {
      runDockAction(action);
    }
  });
});

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  aspect = width / height;
  const frustum = width < 760 ? 7.8 : 6.1;
  camera.left = (-frustum * aspect) / 2;
  camera.right = (frustum * aspect) / 2;
  camera.top = frustum / 2;
  camera.bottom = -frustum / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

window.addEventListener('resize', resize);

function pulseObject(group: THREE.Group) {
  group.userData.pulse = 1;
}

function animateInteractive(item: InteractiveItem, delta: number) {
  const hovered = item.id === state.hoveredId;
  const targetY = item.baseY + (hovered ? item.hoverLift : 0);
  const targetScale = hovered ? item.hoverScale : 1;
  item.group.position.y = THREE.MathUtils.damp(item.group.position.y, targetY, 9, delta);

  const pulse = item.group.userData.pulse as number | undefined;
  const pulseScale = pulse ? 1 + Math.sin(pulse * Math.PI) * 0.055 : 1;
  const scale = targetScale * pulseScale;
  item.group.scale.x = THREE.MathUtils.damp(item.group.scale.x, scale, 12, delta);
  item.group.scale.y = THREE.MathUtils.damp(item.group.scale.y, scale, 12, delta);
  item.group.scale.z = THREE.MathUtils.damp(item.group.scale.z, scale, 12, delta);

  if (pulse) {
    item.group.userData.pulse = Math.max(0, pulse - delta * 2.2);
  }
}

function updateSimulation(delta: number) {
  if (!state.simulation) return;

  state.agents.forEach((agent) => {
    const task = getTask(agent.taskId);
    if (!task || agent.status !== 'working') return;

    task.progress = Math.min(100, task.progress + delta * (4.5 + agent.id.length * 0.2));
    agent.progress = task.progress;

    if (task.progress >= 100) {
      task.status = 'done';
      task.zoneId = 'deploy';
      agent.status = 'done';
    }
  });
}

function updateAgents(delta: number, time: number) {
  state.agents.forEach((agent, index) => {
    if (!agent.group) return;

    const target = getAgentTarget(agent);
    const previous = agent.group.position.clone();
    agent.group.position.x = THREE.MathUtils.damp(agent.group.position.x, target.x, 2.8, delta);
    agent.group.position.z = THREE.MathUtils.damp(agent.group.position.z, target.z, 2.8, delta);

    const moving = previous.distanceTo(agent.group.position) > 0.002;
    const bob = agent.status === 'working' ? Math.sin(time * 4.4 + index) * 0.025 : Math.sin(time * 1.7 + index) * 0.012;
    agent.group.position.y += bob * delta * 4;

    if (agent.leftLeg && agent.rightLeg) {
      const stride = moving ? Math.sin(time * 10 + index) * 0.18 : 0;
      agent.leftLeg.rotation.x = THREE.MathUtils.damp(agent.leftLeg.rotation.x, stride, 10, delta);
      agent.rightLeg.rotation.x = THREE.MathUtils.damp(agent.rightLeg.rotation.x, -stride, 10, delta);
    }

    if (agent.haloMaterial) {
      agent.haloMaterial.color.lerp(new THREE.Color(statusColor(agent.status)), 1 - Math.exp(-8 * delta));
      const pulse = agent.status === 'blocked' ? 0.2 + Math.sin(time * 7) * 0.12 : 0;
      agent.haloMaterial.opacity = THREE.MathUtils.damp(
        agent.haloMaterial.opacity,
        agent.status === 'paused' ? 0.18 : 0.3 + pulse,
        8,
        delta
      );
    }

    if (agent.bodyMaterial) {
      agent.bodyMaterial.color.lerp(new THREE.Color(agent.status === 'paused' ? '#858b82' : agent.color), 1 - Math.exp(-5 * delta));
    }

    if (agent.marker) {
      agent.marker.visible = agent.status === 'blocked';
      agent.marker.rotation.y += delta * 2.6;
      agent.marker.position.y = 1.55 + Math.sin(time * 4.2) * 0.05;
    }

    if (agent.status === 'done') {
      agent.zoneId = 'deploy';
    }
  });
}

function updateTaskCards(delta: number) {
  const slotsByZone = new Map<ZoneId, number>();

  state.tasks.forEach((task) => {
    const model = taskCards.get(task.id);
    if (!model) return;

    const slot = slotsByZone.get(task.zoneId) ?? 0;
    slotsByZone.set(task.zoneId, slot + 1);
    const zone = getZone(task.zoneId);
    const xOffset = -0.45 + (slot % 3) * 0.32;
    const zOffset = task.zoneId === 'deploy' ? -0.05 + Math.floor(slot / 3) * 0.22 : 0.18 + Math.floor(slot / 3) * 0.2;
    const target = zone.position.clone().add(new THREE.Vector3(xOffset, 0.64 + slot * 0.002, zOffset));

    model.group.position.x = THREE.MathUtils.damp(model.group.position.x, target.x, 8, delta);
    model.group.position.y = THREE.MathUtils.damp(model.group.position.y, target.y, 8, delta);
    model.group.position.z = THREE.MathUtils.damp(model.group.position.z, target.z, 8, delta);
    model.group.rotation.y = THREE.MathUtils.damp(model.group.rotation.y, -0.12 + slot * 0.04, 8, delta);
    model.material.color.lerp(new THREE.Color(statusColor(task.status)), 1 - Math.exp(-8 * delta));
    model.progressBar.scale.x = THREE.MathUtils.damp(model.progressBar.scale.x, Math.max(0.05, task.progress / 100), 12, delta);
  });
}

function updateCamera(delta: number) {
  const focus = new THREE.Vector3(0, 0.78, 0);
  if (state.focusMode && state.selectedAgentId) {
    const selectedAgent = getAgent(state.selectedAgentId);
    if (selectedAgent?.group) {
      selectedAgent.group.getWorldPosition(focus);
      focus.y = 0.85;
    }
  } else if (state.selectedZoneId) {
    focus.copy(getZone(state.selectedZoneId).position);
    focus.y = 0.75;
  }

  cameraLookTarget.lerp(focus, 1 - Math.exp(-4 * delta));

  room.rotation.y = THREE.MathUtils.damp(room.rotation.y, -0.16 + state.cameraAngle, 7, delta);
  state.cameraAngle = THREE.MathUtils.damp(state.cameraAngle, state.cameraTargetAngle, 8, delta);

  const parallaxX = pointer.x === -10 ? 0 : pointer.x * 0.15;
  const parallaxY = pointer.y === -10 ? 0 : pointer.y * 0.08;
  camera.position.x = THREE.MathUtils.damp(camera.position.x, 7.2 + parallaxX, 4, delta);
  camera.position.y = THREE.MathUtils.damp(camera.position.y, 6.6 + parallaxY, 4, delta);
  camera.position.z = THREE.MathUtils.damp(camera.position.z, 7.2 - parallaxX, 4, delta);
  camera.lookAt(cameraLookTarget);
}

function updateInteractiveMotion(delta: number) {
  interactives.forEach((item) => animateInteractive(item, delta));
}

function tick(now = performance.now()) {
  const delta = Math.min((now - lastFrame) / 1000, 0.033);
  const time = now / 1000;
  lastFrame = now;

  updateHovered();
  updateSimulation(delta);
  updateAgents(delta, time);
  updateTaskCards(delta);
  updateInteractiveMotion(delta);
  updateCamera(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function getAgentScreenPosition(id: string) {
  const agent = getAgent(id);
  if (!agent?.group) return null;
  const worldPosition = new THREE.Vector3();
  agent.group.getWorldPosition(worldPosition);
  worldPosition.y += 0.75;
  const projected = worldPosition.project(camera);
  const rect = canvas.getBoundingClientRect();
  return {
    x: rect.left + ((projected.x + 1) / 2) * rect.width,
    y: rect.top + ((-projected.y + 1) / 2) * rect.height
  };
}

window.__agentStudioDebug = {
  getAgentScreenPosition
};

buildOfficeShell();
zoneDefinitions.forEach(createZone);
state.agents.forEach(createAgent);
createTaskCards();
resize();
renderUi();
tick();

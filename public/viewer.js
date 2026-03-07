import * as THREE from "./vendor/three.module.js";

const PANORAMA_URL = "/panoramas/playa-brava-jose-ignacio/playa-brava-jose-ignacio-equirect.jpg";
const LOT_DATA_URL = "/data/playa-brava-jose-ignacio-lots.json";
const STORAGE_KEY = "elpela:playa-brava-jose-ignacio:admin-draft:v1";
const PUBLISHED_STORAGE_KEY = "elpela:playa-brava-jose-ignacio:published:v1";
const ADMIN_ENABLED = new URL(window.location.href).searchParams.get("admin") === "1";

const VIEWER_LIMITS = {
  minFov: 40,
  maxFov: 90,
  dragSensitivity: 0.12,
  keyboardStep: 3,
  zoomStep: 5,
  clickThreshold: 8
};

const STATUS_META = {
  available: { label: "Available" },
  reserved: { label: "Reserved" },
  sold: { label: "Sold" }
};

const viewerEl = document.querySelector("[data-viewer]");
const lotOverlayEl = document.getElementById("lot-overlay");
const lotLabelLayerEl = document.getElementById("lot-label-layer");
const statusEl = document.getElementById("viewer-status");
const readoutEl = document.getElementById("view-readout");
const switchToPublicButton = document.getElementById("switch-to-public");
const switchToAdminButton = document.getElementById("switch-to-admin");
const resetButton = document.getElementById("reset-view");
const zoomOutButton = document.getElementById("zoom-out");
const zoomInButton = document.getElementById("zoom-in");
const fullscreenButton = document.getElementById("toggle-fullscreen");
const lotCardEl = document.getElementById("lot-card");
const lotCardCloseButton = document.getElementById("lot-card-close");
const lotCardStatusEl = document.getElementById("lot-card-status");
const lotCardTitleEl = document.getElementById("lot-card-title");
const lotCardDescriptionEl = document.getElementById("lot-card-description");
const lotCardAreaEl = document.getElementById("lot-card-area");
const lotCardPriceEl = document.getElementById("lot-card-price");
const lotCardLinkEl = document.getElementById("lot-card-link");
const adminPanelEl = document.getElementById("admin-panel");
const adminSyncStateEl = document.getElementById("admin-sync-state");
const adminPointReadoutEl = document.getElementById("admin-point-readout");
const lotListEl = document.getElementById("lot-list");
const lotNameInput = document.getElementById("lot-name");
const lotIdInput = document.getElementById("lot-id");
const lotStatusInput = document.getElementById("lot-status");
const lotAreaInput = document.getElementById("lot-area");
const lotPriceInput = document.getElementById("lot-price");
const lotDescriptionInput = document.getElementById("lot-description");
const lotLinkLabelInput = document.getElementById("lot-link-label");
const lotLinkInput = document.getElementById("lot-link");
const newLotButton = document.getElementById("new-lot");
const toggleDrawButton = document.getElementById("toggle-draw");
const undoPointButton = document.getElementById("undo-point");
const clearPolygonButton = document.getElementById("clear-polygon");
const saveLotButton = document.getElementById("save-lot");
const deleteLotButton = document.getElementById("delete-lot");
const publishLotsButton = document.getElementById("publish-lots");
const downloadLotsButton = document.getElementById("download-lots");
const importLotsInput = document.getElementById("import-lots");
const confirmDialogEl = document.getElementById("confirm-dialog");
const confirmCopyEl = document.getElementById("confirm-copy");

const state = {
  lon: 0,
  lat: 0,
  fov: 75,
  isDragging: false,
  pointerOriginX: 0,
  pointerOriginY: 0,
  lonOrigin: 0,
  latOrigin: 0,
  pointerMoved: false,
  hasLoaded: false,
  adminEnabled: ADMIN_ENABLED,
  adminDrawMode: false,
  activeLotId: null,
  hoveredLotId: null,
  selectedLotId: null,
  pendingDeleteId: null,
  lotData: createEmptyLotData(),
  publishedLotData: createEmptyLotData(),
  editorLot: createEmptyLot(1),
  lotElements: new Map(),
  sphereMesh: null
};

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  state.fov,
  viewerEl.clientWidth / viewerEl.clientHeight,
  1,
  1100
);
const raycaster = new THREE.Raycaster();
const sphereGeometry = new THREE.SphereGeometry(500, 96, 64);
sphereGeometry.scale(-1, 1, 1);

viewerEl.append(renderer.domElement);
resizeRenderer();

setStatus("Loading panorama...");
void initializeLotData();

const loader = new THREE.TextureLoader();
loader.load(
  PANORAMA_URL,
  (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

    const sphereMaterial = new THREE.MeshBasicMaterial({ map: texture });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    state.sphereMesh = sphere;
    state.hasLoaded = true;
    hideStatus();
  },
  (event) => {
    if (!event.total) {
      return;
    }

    const progress = Math.round((event.loaded / event.total) * 100);
    setStatus(`Loading panorama... ${progress}%`);
  },
  () => {
    setStatus("The panorama could not be loaded.");
  }
);

viewerEl.addEventListener("pointerdown", onPointerDown);
viewerEl.addEventListener("pointermove", onPointerMove);
viewerEl.addEventListener("pointerup", onPointerUp);
viewerEl.addEventListener("pointercancel", onPointerUp);
viewerEl.addEventListener("wheel", onWheel, { passive: false });
window.addEventListener("resize", resizeRenderer);
window.addEventListener("keydown", onKeyDown);

resetButton.addEventListener("click", resetView);
zoomOutButton.addEventListener("click", () => updateFov(state.fov + VIEWER_LIMITS.zoomStep));
zoomInButton.addEventListener("click", () => updateFov(state.fov - VIEWER_LIMITS.zoomStep));
fullscreenButton.addEventListener("click", toggleFullscreen);
lotCardCloseButton.addEventListener("click", closeLotCard);
switchToPublicButton.addEventListener("click", () => switchMode(false));
switchToAdminButton.addEventListener("click", () => switchMode(true));

if (state.adminEnabled) {
  adminPanelEl.hidden = false;
  newLotButton.addEventListener("click", startNewLot);
  toggleDrawButton.addEventListener("click", toggleDrawMode);
  undoPointButton.addEventListener("click", undoLastPoint);
  clearPolygonButton.addEventListener("click", clearEditorPolygon);
  saveLotButton.addEventListener("click", saveEditorLot);
  deleteLotButton.addEventListener("click", queueDeleteLot);
  publishLotsButton.addEventListener("click", publishLotData);
  downloadLotsButton.addEventListener("click", downloadLotData);
  importLotsInput.addEventListener("change", importLotData);
  lotNameInput.addEventListener("input", () => {
    state.editorLot.name = lotNameInput.value;
    state.editorLot.id = slugify(lotNameInput.value) || state.editorLot.id;
    markAdminDirty();
    syncAdminUI();
    syncLotElements();
  });
  lotStatusInput.addEventListener("change", () => {
    state.editorLot.status = lotStatusInput.value;
    markAdminDirty();
    syncLotElements();
    syncAdminUI();
  });
  lotAreaInput.addEventListener("input", () => {
    state.editorLot.area_m2 = lotAreaInput.value;
    markAdminDirty();
  });
  lotPriceInput.addEventListener("input", () => {
    state.editorLot.price_usd = lotPriceInput.value;
    markAdminDirty();
  });
  lotDescriptionInput.addEventListener("input", () => {
    state.editorLot.description = lotDescriptionInput.value;
    markAdminDirty();
  });
  lotLinkLabelInput.addEventListener("input", () => {
    state.editorLot.cta_label = lotLinkLabelInput.value;
    markAdminDirty();
  });
  lotLinkInput.addEventListener("input", () => {
    state.editorLot.cta_url = lotLinkInput.value;
    markAdminDirty();
  });
  confirmDialogEl.addEventListener("close", onConfirmDialogClose);
}

document.addEventListener("fullscreenchange", syncFullscreenButton);

render();
updateReadout();
syncFullscreenButton();
syncAdminUI();
syncModeToggle();

window.elPela360 = {
  getLotData: () => structuredClone(state.lotData),
  samplePoint: (x, y) => samplePointFromClientPosition(x, y)
};

function createEmptyLotData() {
  return {
    version: 1,
    panorama: PANORAMA_URL,
    updatedAt: null,
    lots: []
  };
}

function createEmptyLot(index) {
  return {
    id: `lote-${index}`,
    name: `Lote ${index}`,
    status: "available",
    area_m2: "",
    price_usd: "",
    description: "",
    cta_label: "Request info",
    cta_url: "",
    polygon: []
  };
}

function normalizeLotData(data) {
  const lots = Array.isArray(data?.lots) ? data.lots.map(normalizeLot).filter(Boolean) : [];

  return {
    version: typeof data?.version === "number" ? data.version : 1,
    panorama: typeof data?.panorama === "string" ? data.panorama : PANORAMA_URL,
    updatedAt: typeof data?.updatedAt === "string" ? data.updatedAt : null,
    lots
  };
}

function normalizeLot(lot) {
  if (!lot || typeof lot !== "object") {
    return null;
  }

  const polygon = Array.isArray(lot.polygon)
    ? lot.polygon
        .map((point) => ({
          yaw: Number(point?.yaw),
          pitch: Number(point?.pitch)
        }))
        .filter((point) => Number.isFinite(point.yaw) && Number.isFinite(point.pitch))
    : [];

  return {
    id: typeof lot.id === "string" && lot.id.trim() ? lot.id.trim() : slugify(lot.name) || `lote-${Date.now()}`,
    name: typeof lot.name === "string" && lot.name.trim() ? lot.name.trim() : "Unnamed lot",
    status: STATUS_META[lot.status] ? lot.status : "available",
    area_m2: lot.area_m2 ?? "",
    price_usd: lot.price_usd ?? "",
    description: typeof lot.description === "string" ? lot.description : "",
    cta_label: typeof lot.cta_label === "string" && lot.cta_label.trim() ? lot.cta_label : "Request info",
    cta_url: typeof lot.cta_url === "string" ? lot.cta_url : "",
    polygon
  };
}

async function initializeLotData() {
  let published = createEmptyLotData();

  try {
    const response = await fetch(LOT_DATA_URL);

    if (response.ok) {
      published = normalizeLotData(await response.json());
    }
  } catch {
    published = createEmptyLotData();
  }

  const localPublished = readPublishedLotData();

  if (localPublished) {
    published = normalizeLotData(localPublished);
  }

  state.publishedLotData = structuredClone(published);

  if (state.adminEnabled) {
    const stored = readAdminDraft();
    if (stored) {
      state.lotData = normalizeLotData(stored.lotData);
      state.editorLot = normalizeLot(stored.editorLot) ?? createEmptyLot(nextLotNumber());
      state.selectedLotId = stored.selectedLotId ?? null;
      state.adminDrawMode = Boolean(stored.adminDrawMode);
      setAdminSyncState("Loaded local admin draft. Publish locally to preview it as a customer.");
    } else {
      state.lotData = published;
      if (state.lotData.lots[0]) {
        loadEditorLot(state.lotData.lots[0].id);
      } else {
        state.editorLot = createEmptyLot(nextLotNumber());
        state.selectedLotId = null;
      }
      setAdminSyncState("Loaded published lots. Changes stay local until you publish or download.");
    }
  } else {
    state.lotData = published;
  }

  syncLotElements();
  syncAdminUI();
}

function readAdminDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readPublishedLotData() {
  try {
    const raw = localStorage.getItem(PUBLISHED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistAdminDraft() {
  if (!state.adminEnabled) {
    return;
  }

  const payload = {
    lotData: state.lotData,
    editorLot: state.editorLot,
    selectedLotId: state.selectedLotId,
    adminDrawMode: state.adminDrawMode
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function persistPublishedLotData(data) {
  localStorage.setItem(PUBLISHED_STORAGE_KEY, JSON.stringify(data));
}

function setStatus(message) {
  statusEl.hidden = false;
  statusEl.textContent = message;
}

function hideStatus() {
  statusEl.hidden = true;
}

function setAdminSyncState(message) {
  if (!state.adminEnabled) {
    return;
  }

  adminSyncStateEl.textContent = message;
}

function markAdminDirty() {
  if (!state.adminEnabled) {
    return;
  }

  state.lotData.updatedAt = new Date().toISOString();
  setAdminSyncState("Saved locally in this browser. Publish locally to preview it as a customer.");
  persistAdminDraft();
}

function normalizeAngle(angle) {
  const normalized = ((angle % 360) + 360) % 360;
  return normalized > 180 ? normalized - 360 : normalized;
}

function updateReadout() {
  const heading = Math.round(normalizeAngle(state.lon));
  readoutEl.textContent = `Yaw ${heading}° · Zoom ${Math.round(state.fov)}°`;
}

function syncModeToggle() {
  switchToPublicButton.classList.toggle("is-active", !state.adminEnabled);
  switchToAdminButton.classList.toggle("is-active", state.adminEnabled);
  switchToPublicButton.setAttribute("aria-pressed", String(!state.adminEnabled));
  switchToAdminButton.setAttribute("aria-pressed", String(state.adminEnabled));
}

function switchMode(enableAdmin) {
  if (enableAdmin === state.adminEnabled) {
    return;
  }

  const url = new URL(window.location.href);

  if (enableAdmin) {
    url.searchParams.set("admin", "1");
  } else {
    url.searchParams.delete("admin");
  }

  window.location.href = url.toString();
}

function resizeRenderer() {
  const width = viewerEl.clientWidth;
  const height = viewerEl.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  lotOverlayEl.setAttribute("viewBox", `0 0 ${width} ${height}`);
}

function updateCamera() {
  state.lat = THREE.MathUtils.clamp(state.lat, -85, 85);

  const phi = THREE.MathUtils.degToRad(90 - state.lat);
  const theta = THREE.MathUtils.degToRad(state.lon);
  const target = new THREE.Vector3();

  target.setFromSphericalCoords(500, phi, theta);
  camera.lookAt(target);
}

function render() {
  requestAnimationFrame(render);

  updateCamera();
  updateReadout();

  if (state.hasLoaded) {
    renderer.render(scene, camera);
    renderLotOverlay();
  }
}

function isInteractiveTarget(target) {
  return Boolean(
    target.closest(
      ".viewer-copy, .viewer-toolbar, .lot-card, .admin-panel, .lot-label, .lot-shape, .confirm-sheet"
    )
  );
}

function onPointerDown(event) {
  if (isInteractiveTarget(event.target)) {
    return;
  }

  state.isDragging = true;
  state.pointerMoved = false;
  state.pointerOriginX = event.clientX;
  state.pointerOriginY = event.clientY;
  state.lonOrigin = state.lon;
  state.latOrigin = state.lat;

  viewerEl.classList.add("is-dragging");
  viewerEl.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (!state.isDragging) {
    return;
  }

  const deltaX = event.clientX - state.pointerOriginX;
  const deltaY = event.clientY - state.pointerOriginY;

  if (Math.abs(deltaX) > VIEWER_LIMITS.clickThreshold || Math.abs(deltaY) > VIEWER_LIMITS.clickThreshold) {
    state.pointerMoved = true;
  }

  state.lon = state.lonOrigin + deltaX * VIEWER_LIMITS.dragSensitivity;
  state.lat = state.latOrigin + deltaY * VIEWER_LIMITS.dragSensitivity;
}

function onPointerUp(event) {
  if (!state.isDragging) {
    return;
  }

  const shouldAddPoint =
    state.adminEnabled && state.adminDrawMode && !state.pointerMoved && !isInteractiveTarget(event.target);

  state.isDragging = false;
  viewerEl.classList.remove("is-dragging");

  if (viewerEl.hasPointerCapture(event.pointerId)) {
    viewerEl.releasePointerCapture(event.pointerId);
  }

  if (shouldAddPoint) {
    addPointFromPointer(event.clientX, event.clientY);
  }
}

function onWheel(event) {
  event.preventDefault();
  updateFov(state.fov + event.deltaY * 0.03);
}

function updateFov(nextFov) {
  state.fov = THREE.MathUtils.clamp(nextFov, VIEWER_LIMITS.minFov, VIEWER_LIMITS.maxFov);
  camera.fov = state.fov;
  camera.updateProjectionMatrix();
}

function resetView() {
  state.lon = 0;
  state.lat = 0;
  updateFov(75);
}

function onKeyDown(event) {
  if (state.adminEnabled && event.key === "Enter" && document.activeElement === toggleDrawButton) {
    toggleDrawMode();
  }

  switch (event.key) {
    case "ArrowLeft":
      state.lon -= VIEWER_LIMITS.keyboardStep;
      break;
    case "ArrowRight":
      state.lon += VIEWER_LIMITS.keyboardStep;
      break;
    case "ArrowUp":
      state.lat += VIEWER_LIMITS.keyboardStep;
      break;
    case "ArrowDown":
      state.lat -= VIEWER_LIMITS.keyboardStep;
      break;
    case "+":
    case "=":
      updateFov(state.fov - VIEWER_LIMITS.zoomStep);
      break;
    case "-":
    case "_":
      updateFov(state.fov + VIEWER_LIMITS.zoomStep);
      break;
    case "0":
      resetView();
      break;
    case "f":
    case "F":
      toggleFullscreen();
      break;
    case "Escape":
      if (state.adminEnabled && state.adminDrawMode) {
        state.adminDrawMode = false;
        syncAdminUI();
      } else {
        closeLotCard();
      }
      break;
    default:
      return;
  }

  event.preventDefault();
}

async function toggleFullscreen() {
  if (!viewerEl.requestFullscreen) {
    setStatus("Fullscreen is not available in this browser.");
    return;
  }

  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch {
      setStatus("Fullscreen could not be closed.");
    }
    return;
  }

  try {
    await viewerEl.requestFullscreen();
  } catch {
    setStatus("Fullscreen could not be opened.");
  }
}

function syncFullscreenButton() {
  fullscreenButton.textContent = document.fullscreenElement ? "Exit fullscreen" : "Fullscreen";
}

function getRenderableLots() {
  const baseLots = state.lotData.lots.map((lot) => structuredClone(lot));

  if (!state.adminEnabled) {
    return baseLots;
  }

  const editorLot = normalizeLot(state.editorLot);

  if (!editorLot) {
    return baseLots;
  }

  const existingIndex = baseLots.findIndex((lot) => lot.id === editorLot.id || lot.id === state.selectedLotId);

  if (existingIndex >= 0) {
    baseLots[existingIndex] = editorLot;
  } else if (editorLot.name || editorLot.polygon.length) {
    baseLots.push(editorLot);
  }

  return baseLots;
}

function syncLotElements() {
  const renderableLots = getRenderableLots();
  const nextIds = new Set(renderableLots.map((lot) => lot.id));

  for (const [lotId, elements] of state.lotElements.entries()) {
    if (!nextIds.has(lotId)) {
      elements.polygon.remove();
      elements.label.remove();
      state.lotElements.delete(lotId);
    }
  }

  for (const lot of renderableLots) {
    if (!state.lotElements.has(lot.id)) {
      const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      polygon.classList.add("lot-shape");
      polygon.dataset.lotId = lot.id;
      polygon.addEventListener("pointerenter", () => {
        state.hoveredLotId = lot.id;
      });
      polygon.addEventListener("pointerleave", () => {
        if (state.hoveredLotId === lot.id) {
          state.hoveredLotId = null;
        }
      });
      polygon.addEventListener("click", (event) => {
        event.stopPropagation();
        activateLot(lot.id);
      });
      lotOverlayEl.append(polygon);

      const label = document.createElement("button");
      label.type = "button";
      label.className = "lot-label";
      label.dataset.lotId = lot.id;
      label.addEventListener("pointerenter", () => {
        state.hoveredLotId = lot.id;
      });
      label.addEventListener("pointerleave", () => {
        if (state.hoveredLotId === lot.id) {
          state.hoveredLotId = null;
        }
      });
      label.addEventListener("click", (event) => {
        event.stopPropagation();
        activateLot(lot.id);
      });
      lotLabelLayerEl.append(label);

      state.lotElements.set(lot.id, { polygon, label });
    }
  }

  syncAdminLotList();
}

function renderLotOverlay() {
  const renderableLots = getRenderableLots();
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const width = viewerEl.clientWidth;
  const height = viewerEl.clientHeight;

  for (const lot of renderableLots) {
    const elements = state.lotElements.get(lot.id);

    if (!elements) {
      continue;
    }

    const projectedPoints = lot.polygon.map((point) => projectLotPoint(point, forward, width, height));
    const isVisible =
      projectedPoints.length >= 3 &&
      projectedPoints.every((point) => point.visible && point.x >= -80 && point.x <= width + 80 && point.y >= -80 && point.y <= height + 80);

    elements.polygon.dataset.status = lot.status;
    elements.label.dataset.status = lot.status;
    elements.polygon.classList.toggle("is-active", state.activeLotId === lot.id || state.selectedLotId === lot.id);
    elements.polygon.classList.toggle("is-hovered", state.hoveredLotId === lot.id);
    elements.label.classList.toggle("is-active", state.activeLotId === lot.id || state.selectedLotId === lot.id);

    if (!isVisible) {
      elements.polygon.setAttribute("visibility", "hidden");
      elements.label.hidden = true;
      continue;
    }

    const pointsAttr = projectedPoints.map((point) => `${point.x},${point.y}`).join(" ");
    const centroid = findCentroid(projectedPoints);

    elements.polygon.setAttribute("points", pointsAttr);
    elements.polygon.setAttribute("visibility", "visible");
    elements.label.hidden = false;
    elements.label.textContent = lot.name;
    elements.label.style.left = `${centroid.x}px`;
    elements.label.style.top = `${centroid.y}px`;
  }

  renderDraftHandles(forward, width, height);
  renderActiveLotCard();
}

function renderDraftHandles(forward, width, height) {
  const existingDraft = lotOverlayEl.querySelector('[data-draft="true"]');
  const existingHandles = lotOverlayEl.querySelectorAll("[data-draft-handle]");

  if (existingDraft) {
    existingDraft.remove();
  }

  for (const handle of existingHandles) {
    handle.remove();
  }

  if (!state.adminEnabled || state.editorLot.polygon.length < 1) {
    return;
  }

  const points = state.editorLot.polygon.map((point) => projectLotPoint(point, forward, width, height));
  const visiblePoints = points.filter((point) => point.visible);

  if (!visiblePoints.length) {
    return;
  }

  const draftShape = document.createElementNS("http://www.w3.org/2000/svg", state.editorLot.polygon.length >= 3 ? "polygon" : "polyline");
  draftShape.classList.add("lot-draft");
  draftShape.dataset.draft = "true";
  draftShape.setAttribute("points", visiblePoints.map((point) => `${point.x},${point.y}`).join(" "));
  lotOverlayEl.append(draftShape);

  for (const point of visiblePoints) {
    const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    handle.classList.add("lot-handle");
    handle.dataset.draftHandle = "true";
    handle.setAttribute("cx", `${point.x}`);
    handle.setAttribute("cy", `${point.y}`);
    handle.setAttribute("r", "5");
    lotOverlayEl.append(handle);
  }
}

function projectLotPoint(point, forward, width, height) {
  const worldPoint = yawPitchToVector(point.yaw, point.pitch, 500);
  const projected = worldPoint.clone().project(camera);
  const visible = worldPoint.clone().normalize().dot(forward) > 0.02 && projected.z >= -1 && projected.z <= 1;

  return {
    x: (projected.x * 0.5 + 0.5) * width,
    y: (-projected.y * 0.5 + 0.5) * height,
    visible
  };
}

function yawPitchToVector(yaw, pitch, radius) {
  return new THREE.Vector3().setFromSphericalCoords(
    radius,
    THREE.MathUtils.degToRad(90 - pitch),
    THREE.MathUtils.degToRad(yaw)
  );
}

function findCentroid(points) {
  const total = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y
    }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length
  };
}

function activateLot(lotId) {
  state.activeLotId = lotId;

  if (state.adminEnabled) {
    loadEditorLot(lotId);
  }
}

function closeLotCard() {
  state.activeLotId = null;
  lotCardEl.hidden = true;
}

function renderActiveLotCard() {
  if (state.adminEnabled) {
    lotCardEl.hidden = true;
    return;
  }

  const lot = getRenderableLots().find((entry) => entry.id === state.activeLotId);

  if (!lot) {
    lotCardEl.hidden = true;
    return;
  }

  lotCardEl.hidden = false;
  lotCardStatusEl.textContent = STATUS_META[lot.status]?.label ?? "Available";
  lotCardTitleEl.textContent = lot.name;
  lotCardDescriptionEl.hidden = !lot.description;
  lotCardDescriptionEl.textContent = lot.description;
  lotCardAreaEl.textContent = formatArea(lot.area_m2);
  lotCardPriceEl.textContent = formatPrice(lot.price_usd);

  if (lot.cta_url) {
    lotCardLinkEl.hidden = false;
    lotCardLinkEl.href = lot.cta_url;
    lotCardLinkEl.textContent = lot.cta_label || "Request info";
  } else {
    lotCardLinkEl.hidden = true;
  }
}

function formatArea(area) {
  if (!area) {
    return "-";
  }

  return `${Number(area).toLocaleString("en-US")} m²`;
}

function formatPrice(price) {
  if (!price) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(price));
}

function nextLotNumber() {
  return state.lotData.lots.length + 1;
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadEditorLot(lotId) {
  const lot = state.lotData.lots.find((entry) => entry.id === lotId);

  if (!lot) {
    return;
  }

  state.selectedLotId = lotId;
  state.editorLot = structuredClone(lot);
  state.activeLotId = lotId;
  state.adminDrawMode = false;
  syncAdminUI();
  syncLotElements();
  persistAdminDraft();
}

function startNewLot() {
  state.selectedLotId = null;
  state.activeLotId = null;
  state.editorLot = createEmptyLot(nextLotNumber());
  state.adminDrawMode = true;
  syncAdminUI();
  syncLotElements();
  markAdminDirty();
}

function toggleDrawMode() {
  state.adminDrawMode = !state.adminDrawMode;
  syncAdminUI();
  persistAdminDraft();
}

function undoLastPoint() {
  if (!state.editorLot.polygon.length) {
    return;
  }

  state.editorLot.polygon.pop();
  syncAdminUI();
  syncLotElements();
  markAdminDirty();
}

function clearEditorPolygon() {
  state.editorLot.polygon = [];
  syncAdminUI();
  syncLotElements();
  markAdminDirty();
}

function samplePointFromClientPosition(clientX, clientY) {
  if (!state.sphereMesh) {
    return null;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  const normalized = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  );

  raycaster.setFromCamera(normalized, camera);

  const intersection = raycaster.intersectObject(state.sphereMesh, false)[0];

  if (!intersection) {
    return null;
  }

  const point = intersection.point.normalize();

  return {
    yaw: Number((THREE.MathUtils.radToDeg(Math.atan2(point.x, point.z))).toFixed(3)),
    pitch: Number((THREE.MathUtils.radToDeg(Math.asin(point.y))).toFixed(3))
  };
}

function addPointFromPointer(clientX, clientY) {
  const sample = samplePointFromClientPosition(clientX, clientY);

  if (!sample) {
    return;
  }

  state.editorLot.polygon.push(sample);
  syncAdminUI();
  syncLotElements();
  markAdminDirty();
}

function syncAdminUI() {
  if (!state.adminEnabled) {
    return;
  }

  viewerEl.classList.toggle("is-draw-mode", state.adminDrawMode);

  lotNameInput.value = state.editorLot.name ?? "";
  lotIdInput.value = state.editorLot.id ?? "";
  lotStatusInput.value = state.editorLot.status ?? "available";
  lotAreaInput.value = state.editorLot.area_m2 ?? "";
  lotPriceInput.value = state.editorLot.price_usd ?? "";
  lotDescriptionInput.value = state.editorLot.description ?? "";
  lotLinkLabelInput.value = state.editorLot.cta_label ?? "Request info";
  lotLinkInput.value = state.editorLot.cta_url ?? "";

  toggleDrawButton.textContent = state.adminDrawMode ? "Stop drawing" : "Start drawing";
  undoPointButton.disabled = state.editorLot.polygon.length === 0;
  clearPolygonButton.disabled = state.editorLot.polygon.length === 0;
  deleteLotButton.disabled = !state.selectedLotId;
  saveLotButton.disabled = !state.editorLot.name || state.editorLot.polygon.length < 3;
  publishLotsButton.disabled = state.lotData.lots.length === 0;

  const pointCount = state.editorLot.polygon.length;
  adminPointReadoutEl.textContent =
    pointCount > 0
      ? `${pointCount} points in the current polygon. ${state.adminDrawMode ? "Click on the land to keep tracing." : "Turn on drawing to add more."}`
      : "No polygon points yet. Turn on drawing and click on the land.";

  syncAdminLotList();
}

function syncAdminLotList() {
  if (!state.adminEnabled) {
    return;
  }

  lotListEl.innerHTML = "";

  if (state.lotData.lots.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "lot-list-empty";
    emptyState.textContent = "No lots yet. Click New lot, then Start drawing, and click around the parcel.";
    lotListEl.append(emptyState);
    return;
  }

  for (const lot of state.lotData.lots) {
    const item = document.createElement("button");
    item.type = "button";
    item.classList.toggle("is-selected", lot.id === state.selectedLotId);
    item.innerHTML = `<strong>${lot.name}</strong><span>${STATUS_META[lot.status]?.label ?? "Available"} · ${lot.polygon.length} points</span>`;
    item.addEventListener("click", () => loadEditorLot(lot.id));
    lotListEl.append(item);
  }
}

function saveEditorLot() {
  if (!state.editorLot.name || state.editorLot.polygon.length < 3) {
    setAdminSyncState("A lot needs a name and at least three points before it can be saved.");
    return;
  }

  const savedLot = normalizeLot({
    ...state.editorLot,
    area_m2: state.editorLot.area_m2 ? Number(state.editorLot.area_m2) : "",
    price_usd: state.editorLot.price_usd ? Number(state.editorLot.price_usd) : ""
  });
  const replaceId = state.selectedLotId || state.editorLot.id;
  const existingIndex = state.lotData.lots.findIndex((lot) => lot.id === replaceId || lot.id === savedLot.id);

  if (existingIndex >= 0) {
    state.lotData.lots.splice(existingIndex, 1, savedLot);
  } else {
    state.lotData.lots.push(savedLot);
  }

  state.selectedLotId = savedLot.id;
  state.editorLot = structuredClone(savedLot);
  state.activeLotId = savedLot.id;
  state.adminDrawMode = false;
  state.lotData.updatedAt = new Date().toISOString();
  syncLotElements();
  syncAdminUI();
  markAdminDirty();
}

function queueDeleteLot() {
  const targetId = state.selectedLotId;

  if (!targetId) {
    return;
  }

  state.pendingDeleteId = targetId;
  confirmCopyEl.textContent = `This removes ${state.editorLot.name || "the selected lot"} from the public dataset.`;
  confirmDialogEl.showModal();
}

function onConfirmDialogClose() {
  if (confirmDialogEl.returnValue !== "confirm" || !state.pendingDeleteId) {
    state.pendingDeleteId = null;
    return;
  }

  state.lotData.lots = state.lotData.lots.filter((lot) => lot.id !== state.pendingDeleteId);
  state.activeLotId = state.activeLotId === state.pendingDeleteId ? null : state.activeLotId;
  state.pendingDeleteId = null;
  state.selectedLotId = null;
  state.editorLot = createEmptyLot(nextLotNumber());
  state.adminDrawMode = false;
  syncLotElements();
  syncAdminUI();
  markAdminDirty();
}

function downloadLotData() {
  const payload = {
    ...state.lotData,
    updatedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "playa-brava-jose-ignacio-lots.json";
  link.click();
  URL.revokeObjectURL(url);

  setAdminSyncState("Downloaded JSON. Replace data/playa-brava-jose-ignacio-lots.json to publish these lots.");
}

function publishLotData() {
  if (state.lotData.lots.length === 0) {
    setAdminSyncState("Save at least one lot before publishing the customer view.");
    return;
  }

  const payload = normalizeLotData({
    ...state.lotData,
    updatedAt: new Date().toISOString()
  });

  persistPublishedLotData(payload);
  state.publishedLotData = structuredClone(payload);
  setAdminSyncState("Published locally. Open the page without ?admin=1 to see the customer view.");
}

async function importLotData(event) {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const data = normalizeLotData(JSON.parse(text));
    state.lotData = data;
    state.selectedLotId = data.lots[0]?.id ?? null;
    state.editorLot = data.lots[0] ? structuredClone(data.lots[0]) : createEmptyLot(nextLotNumber());
    state.adminDrawMode = false;
    syncLotElements();
    syncAdminUI();
    markAdminDirty();
    setAdminSyncState("Imported JSON into admin mode. Publish locally to preview it as a customer.");
  } catch {
    setAdminSyncState("That JSON file could not be imported.");
  } finally {
    importLotsInput.value = "";
  }
}

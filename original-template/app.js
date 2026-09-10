const STORAGE_KEY = "invention-note-app-v1";
const DEFAULT_ROWS = {
  materials: 3,
  build: 6
};

const focusQuestions = {
  cover: "불편한 점을 한 문장으로 말할 수 있나요?",
  problem: "누가, 언제, 무엇 때문에 불편한지 보이나요?",
  scamper: "같은 문제를 다른 질문으로 바라보았나요?",
  science: "작동 원리를 과학 용어로 설명할 수 있나요?",
  making: "만드는 순서와 테스트 기준이 구체적인가요?",
  submission: "작품 설명만 읽어도 아이디어가 이해되나요?",
  presentation: "30초 안에 문제, 해결, 원리, 효과를 말할 수 있나요?"
};

let state = loadState();
let activeStep = "cover";
let saveTimer = null;
let printReady = false;

const pages = [...document.querySelectorAll(".page")];
const navButtons = [...document.querySelectorAll(".step-pill")];
const progressBar = document.querySelector("#progressBar");
const sideProgress = document.querySelector("#sideProgress");
const progressLabel = document.querySelector("#progressLabel");
const saveState = document.querySelector("#saveState");
const stepName = document.querySelector("#stepName");
const focusQuestion = document.querySelector("#focusQuestion");

init();

function init() {
  ensureRows("materials", DEFAULT_ROWS.materials);
  ensureRows("build", DEFAULT_ROWS.build);
  renderRepeatRows();
  bindControls();
  bindSketches();
  hydrateFields();
  setTodayWhenEmpty();
  switchStep(activeStep);
  updateProgress();
}

function bindControls() {
  navButtons.forEach((button) => {
    button.addEventListener("click", () => switchStep(button.dataset.target));
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!target.matches("[data-key], [data-row-type] [data-field]")) return;
    writeInputToState(target);
    scheduleSave();
    updateProgress();
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!target.matches("[data-key], [data-row-type] [data-field]")) return;
    writeInputToState(target);
    scheduleSave();
    updateProgress();
  });

  document.querySelector("#printApp").addEventListener("click", printAllPages);

  document.querySelector("#exportData").addEventListener("click", exportData);
  document.querySelector("#importData").addEventListener("change", importData);
  document.querySelector("#resetData").addEventListener("click", resetData);

  window.addEventListener("beforeprint", preparePrint);
  window.addEventListener("afterprint", cleanupPrint);

  document.querySelectorAll("[data-add-row]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.addRow;
      state.rows[type].push({});
      renderRepeatRows();
      hydrateFields();
      scheduleSave();
    });
  });

  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      switchStep("scamper");
      const field = document.querySelector(`[data-key="${button.dataset.jump}"]`);
      if (field) field.focus();
    });
  });
}

function switchStep(id) {
  activeStep = id;
  pages.forEach((page) => page.classList.toggle("active", page.id === id));
  navButtons.forEach((button) => button.classList.toggle("active", button.dataset.target === id));
  const page = document.getElementById(id);
  stepName.textContent = page?.dataset.stepTitle || "작성 단계";
  focusQuestion.textContent = focusQuestions[id] || focusQuestions.cover;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setTodayWhenEmpty() {
  const date = document.querySelector('[data-key="date"]');
  if (!state.fields.date && date) {
    state.fields.date = localDateString();
    date.value = state.fields.date;
    scheduleSave();
  }
}

function writeInputToState(input) {
  const row = input.closest("[data-row-type]");
  if (row) {
    const type = row.dataset.rowType;
    const index = Number(row.dataset.rowIndex);
    const field = input.dataset.field;
    state.rows[type][index][field] = input.value;
    return;
  }

  const key = input.dataset.key;
  if (!key) return;
  state.fields[key] = input.type === "checkbox" ? input.checked : input.value;
}

function hydrateFields() {
  document.querySelectorAll("[data-key]").forEach((input) => {
    const value = state.fields[input.dataset.key];
    if (input.type === "checkbox") {
      input.checked = Boolean(value);
    } else {
      input.value = value || "";
    }
  });

  document.querySelectorAll("[data-row-type]").forEach((row) => {
    const type = row.dataset.rowType;
    const index = Number(row.dataset.rowIndex);
    const values = state.rows[type][index] || {};
    row.querySelectorAll("[data-field]").forEach((input) => {
      input.value = values[input.dataset.field] || "";
    });
  });

  document.querySelectorAll("[data-sketch]").forEach((card) => {
    const key = card.dataset.sketch;
    const canvas = card.querySelector("canvas");
    if (canvas && state.sketches[key]) {
      restoreCanvas(canvas, state.sketches[key]);
    }
  });
}

function renderRepeatRows() {
  renderRows("materials", "#materialsRows", "materialRow");
  renderRows("build", "#buildRows", "buildRow");
}

function renderRows(type, targetSelector, templateId) {
  const target = document.querySelector(targetSelector);
  const template = document.getElementById(templateId);
  target.innerHTML = "";

  state.rows[type].forEach((_, index) => {
    const fragment = template.content.cloneNode(true);
    const row = document.createElement("div");
    row.className = "repeat-row";
    row.dataset.rowType = type;
    row.dataset.rowIndex = String(index);

    [...fragment.children].forEach((child) => {
      const number = child.matches("[data-number]") ? child : child.querySelector?.("[data-number]");
      if (number) number.textContent = String(index + 1);
      row.appendChild(child);
    });

    target.appendChild(row);
  });
}

function ensureRows(type, count) {
  if (!state.rows[type]) state.rows[type] = [];
  while (state.rows[type].length < count) state.rows[type].push({});
}

function bindSketches() {
  document.querySelectorAll("[data-sketch]").forEach((card) => {
    const key = card.dataset.sketch;
    const canvas = card.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    let drawing = false;
    let color = "#111827";
    let erasing = false;
    let previous = null;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    card.querySelectorAll("[data-color]").forEach((button) => {
      button.addEventListener("click", () => {
        color = button.dataset.color;
        erasing = false;
        markActiveBrush(card, button);
      });
    });

    const eraser = card.querySelector("[data-eraser]");
    eraser.addEventListener("click", () => {
      erasing = true;
      markActiveBrush(card, eraser);
    });

    card.querySelector("[data-clear]").addEventListener("click", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      delete state.sketches[key];
      scheduleSave();
      updateProgress();
    });

    const upload = card.querySelector("[data-image-upload]");
    if (upload) {
      upload.addEventListener("change", (event) => {
        attachImageToSketch(event, canvas, ctx, key);
      });
    }

    canvas.addEventListener("pointerdown", (event) => {
      drawing = true;
      previous = pointFor(canvas, event);
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!drawing) return;
      const next = pointFor(canvas, event);
      ctx.beginPath();
      ctx.moveTo(previous.x, previous.y);
      ctx.lineTo(next.x, next.y);
      ctx.strokeStyle = erasing ? "#ffffff" : color;
      ctx.lineWidth = erasing ? 28 : 5;
      ctx.stroke();
      previous = next;
      state.sketches[key] = canvas.toDataURL("image/png");
      scheduleSave();
      updateProgress();
    });

    canvas.addEventListener("pointerup", () => {
      drawing = false;
      previous = null;
    });

    canvas.addEventListener("pointerleave", () => {
      drawing = false;
      previous = null;
    });
  });
}

function attachImageToSketch(event, canvas, ctx, key) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    setSaveLabel("이미지만 가능");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const box = fitImageInside(canvas, image);
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.drawImage(image, box.x, box.y, box.width, box.height);
      ctx.restore();

      state.sketches[key] = canvas.toDataURL("image/png");
      scheduleSave();
      updateProgress();
      setSaveLabel("그림 첨부됨");
    };
    image.onerror = () => setSaveLabel("그림 첨부 실패");
    image.src = String(reader.result);
  };
  reader.onerror = () => setSaveLabel("그림 첨부 실패");
  reader.readAsDataURL(file);
}

function fitImageInside(canvas, image) {
  const padding = 28;
  const maxWidth = canvas.width - padding * 2;
  const maxHeight = canvas.height - padding * 2;
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  return {
    x: (canvas.width - width) / 2,
    y: (canvas.height - height) / 2,
    width,
    height
  };
}

function markActiveBrush(card, active) {
  card.querySelectorAll(".swatch, .icon-only").forEach((button) => {
    button.classList.toggle("active", button === active);
  });
}

function pointFor(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height
  };
}

function restoreCanvas(canvas, dataUrl) {
  const image = new Image();
  const ctx = canvas.getContext("2d");
  image.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  };
  image.src = dataUrl;
}

function scheduleSave() {
  setSaveLabel("저장 중");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveStateNow();
    setSaveLabel("저장됨");
  }, 250);
}

function saveStateNow() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "");
    return normalizeState(saved);
  } catch {
    return normalizeState({});
  }
}

function normalizeState(input) {
  return {
    fields: input?.fields || {},
    rows: {
      materials: Array.isArray(input?.rows?.materials) ? input.rows.materials : [],
      build: Array.isArray(input?.rows?.build) ? input.rows.build : []
    },
    sketches: input?.sketches || {}
  };
}

function setSaveLabel(text) {
  saveState.textContent = text;
}

function printAllPages() {
  saveStateNow();
  preparePrint();
  setSaveLabel("인쇄 준비됨");

  requestAnimationFrame(() => {
    setTimeout(() => window.print(), 50);
  });
}

function preparePrint() {
  if (printReady) return;
  printReady = true;
  document.body.classList.add("print-mode");

  document.querySelectorAll("textarea").forEach((field) => {
    field.dataset.screenHeight = field.style.height || "";
    field.style.height = "auto";
    field.style.height = `${Math.max(field.scrollHeight + 4, field.offsetHeight)}px`;
  });
}

function cleanupPrint() {
  if (!printReady) return;
  printReady = false;
  document.body.classList.remove("print-mode");

  document.querySelectorAll("textarea").forEach((field) => {
    field.style.height = field.dataset.screenHeight || "";
    delete field.dataset.screenHeight;
  });

  setSaveLabel("자동 저장됨");
}

function updateProgress() {
  const tracked = [...document.querySelectorAll("[data-track='true']")];
  const completed = tracked.filter((input) => {
    const value = input.type === "checkbox" ? input.checked : input.value.trim();
    return Boolean(value);
  }).length;
  const sketchCount = Object.values(state.sketches).filter(Boolean).length;
  const total = tracked.length + 2;
  const percent = Math.round(((completed + sketchCount) / total) * 100);
  progressBar.style.width = `${percent}%`;
  sideProgress.style.width = `${percent}%`;
  progressLabel.textContent = `${percent}% 작성`;
}

function exportData() {
  saveStateNow();
  const createdDate = filenameSegment(state.fields.date || localDateString(), localDateString());
  const studentName = filenameSegment(state.fields.name, "이름없음");
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${createdDate}_${studentName}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function localDateString() {
  const today = new Date();
  return new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function filenameSegment(value, fallback) {
  const normalized = String(value || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = normalizeState(JSON.parse(String(reader.result)));
      ensureRows("materials", DEFAULT_ROWS.materials);
      ensureRows("build", DEFAULT_ROWS.build);
      renderRepeatRows();
      hydrateFields();
      saveStateNow();
      updateProgress();
      setSaveLabel("가져옴");
    } catch {
      setSaveLabel("가져오기 실패");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function resetData() {
  const ok = window.confirm("작성한 내용을 모두 지울까요?");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  state = normalizeState({});
  ensureRows("materials", DEFAULT_ROWS.materials);
  ensureRows("build", DEFAULT_ROWS.build);
  renderRepeatRows();
  document.querySelectorAll("canvas").forEach((canvas) => {
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  });
  hydrateFields();
  setTodayWhenEmpty();
  updateProgress();
  setSaveLabel("초기화됨");
}

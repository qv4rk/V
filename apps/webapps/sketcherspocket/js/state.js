export const state = {
    brushAngle: 0,
    currentPencil: { size: 1.0, opacity: 0.6, color: 0x444444 },
    prevTouches: [],
    compassDragging: false
};

export const domElements = {
    status: document.getElementById('status'),
    needle: document.getElementById('compass-needle'),
    compass: document.getElementById('compass-container'),
    pencilSelect: document.getElementById('pencil-select'),
    modelSelect: document.getElementById('model-select')
};

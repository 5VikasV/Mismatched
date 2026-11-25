// Keep links to the former root-hash workspace working after landing-first routing.
const workspaceRoutes = new Set(['overview', 'directory', 'analysis', 'planner', 'results', 'sources', 'bookings', 'impact', 'loop']);
if (workspaceRoutes.has(location.hash.slice(1))) location.replace(`/workspace${location.hash}`);

const viewport = document.querySelector('.carousel-viewport');
const ring = document.querySelector('.carousel-ring');
const cards = [...document.querySelectorAll('.ring-card')];
const playButton = document.querySelector('#play-carousel');
const nowShowing = document.querySelector('#now-showing');
const rotatingWord = document.querySelector('#rotating-word');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const rotateSpeed = 14;
const cardStep = 360 / cards.length;
const rotatingWords = ['Steel', 'Aluminium', 'Plastic', 'E-waste', 'Glass', 'Textile'];
let rotation = 0;
let activeIndex = -1;
let frameId = 0;
let lastFrameTime = 0;
let isDragging = false;
let isPointerDown = false;
let manualPlay = false;
let dragStartX = 0;
let dragStartRotation = 0;
let rotatingWordIndex = 0;

function normalizeAngle(angle) {
  return ((angle + 180) % 360 + 360) % 360 - 180;
}

function setRingGeometry() {
  const cardWidth = parseFloat(window.getComputedStyle(cards[0]).width);
  const cardHeight = cards[0].querySelector('.card-button').offsetHeight;
  const spread = parseFloat(getComputedStyle(viewport).getPropertyValue("--ring-gap-factor")) || 1.2;
  const radius = ((cardWidth / 2) / Math.tan(Math.PI / cards.length)) * spread;

  cards.forEach((card, index) => {
    card.style.setProperty('--card-angle', `${index * cardStep}deg`);
  });
  viewport.style.setProperty('--ring-radius', `${radius}px`);
  viewport.style.setProperty('--card-half', `${cardWidth / 2}px`);
  viewport.style.setProperty('--item-half-height', `${cardHeight / 2}px`);
}

function setFrontCard(index) {
  const nextIndex = (index + cards.length) % cards.length;
  if (nextIndex === activeIndex) return;

  activeIndex = nextIndex;
  cards.forEach((card, cardIndex) => {
    const button = card.querySelector('.card-button');
    if (cardIndex === activeIndex) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
  const activeButton = cards[activeIndex].querySelector('.card-button');
  nowShowing.textContent = `Now showing: ${activeButton.querySelector('.card-title').textContent} / ${activeButton.querySelector('.card-subtitle').textContent}`;
}

function updateRing() {
  ring.style.setProperty('--ring-rotation', `${rotation}deg`);
  const frontIndex = ((Math.round(-rotation / cardStep) % cards.length) + cards.length) % cards.length;
  setFrontCard(frontIndex);

  cards.forEach((card, index) => {
    const angle = normalizeAngle(index * cardStep + rotation);
    const button = card.querySelector('.card-button');
    const facing = Math.cos(angle * Math.PI / 180);
    const isFront = index === frontIndex;

    card.style.zIndex = isFront ? '3' : facing > 0 ? '2' : '0';
    button.style.setProperty('--card-opacity', `${0.3 + 0.7 * Math.max(0, facing)}`);
    button.tabIndex = Math.abs(angle) <= 75 ? 0 : -1;
  });
}

function shouldPause() {
  return isDragging;
}

function animate(time) {
  if (!lastFrameTime) lastFrameTime = time;
  const elapsed = Math.min(time - lastFrameTime, 50);
  lastFrameTime = time;

  if (!shouldPause()) {
    rotation -= rotateSpeed * elapsed / 1000;
    updateRing();
  }

  frameId = window.requestAnimationFrame(animate);
}

function startRotation() {
  if (!frameId) frameId = window.requestAnimationFrame(animate);
}

function stopRotation() {
  if (frameId) window.cancelAnimationFrame(frameId);
  frameId = 0;
  lastFrameTime = 0;
}

function syncMotionPreference() {
  document.documentElement.classList.toggle('motion-reduced', reducedMotion.matches);
  playButton.hidden = !reducedMotion.matches || manualPlay;
  if (reducedMotion.matches && !manualPlay) {
    stopRotation();
    return;
  }

  requestAnimationFrame(() => document.body.classList.add('is-ready'));
  startRotation();
}

viewport.addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  rotation += event.key === 'ArrowRight' ? -cardStep : cardStep;
  updateRing();
});

viewport.addEventListener('pointerdown', event => {
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
  isPointerDown = true;
  isDragging = false;
  dragStartX = event.clientX;
  viewport.setPointerCapture(event.pointerId);
});

viewport.addEventListener('pointermove', event => {
  if (!isPointerDown) return;
  if (!isDragging && Math.abs(event.clientX - dragStartX) > 3) {
    isDragging = true;
    dragStartX = event.clientX;
    dragStartRotation = rotation;
    viewport.classList.add('is-dragging');
    return;
  }
  if (!isDragging) return;
  const deltaX = event.clientX - dragStartX;
  rotation = dragStartRotation + deltaX * .42;
  updateRing();
});

function endDrag(event) {
  if (!isPointerDown) return;
  isPointerDown = false;
  isDragging = false;
  viewport.classList.remove('is-dragging');
  if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
}

viewport.addEventListener('pointerup', endDrag);
viewport.addEventListener('pointercancel', endDrag);
viewport.addEventListener('lostpointercapture', () => {
  isPointerDown = false;
  isDragging = false;
  viewport.classList.remove('is-dragging');
});

playButton.addEventListener('click', () => {
  manualPlay = true;
  playButton.hidden = true;
  startRotation();
});

function cycleRotatingWord() {
  if (reducedMotion.matches) return;
  rotatingWord.classList.add('is-exiting');
  window.setTimeout(() => {
    if (reducedMotion.matches) {
      rotatingWord.classList.remove('is-exiting');
      return;
    }
    rotatingWordIndex = (rotatingWordIndex + 1) % rotatingWords.length;
    rotatingWord.textContent = rotatingWords[rotatingWordIndex];
    rotatingWord.classList.remove('is-exiting');
    rotatingWord.classList.add('is-entering');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => rotatingWord.classList.remove('is-entering'));
    });
  }, 240);
}

window.setInterval(cycleRotatingWord, 2000);
window.addEventListener('resize', setRingGeometry);
window.addEventListener('load', setRingGeometry, { once: true });
document.fonts.ready.then(setRingGeometry);
const geometryObserver = 'ResizeObserver' in window ? new ResizeObserver(setRingGeometry) : null;
if (geometryObserver) geometryObserver.observe(viewport);
reducedMotion.addEventListener('change', syncMotionPreference);

setRingGeometry();
updateRing();
syncMotionPreference();

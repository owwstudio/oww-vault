import { gsap } from 'gsap';

export function createInspect(projects, { pause, resume, sound }) {
  const track = document.querySelector('[data-track]');
  const dialog = document.querySelector('[data-inspect]');
  const panel = dialog.querySelector('[data-inspect-panel]');
  const backdrop = dialog.querySelector('[data-inspect-backdrop]');
  const image = dialog.querySelector('[data-inspect-image]');
  const closeButton = dialog.querySelector('[data-inspect-close]');
  const cursor = document.querySelector('[data-inspect-cursor]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const moveX = gsap.quickTo(cursor, 'x', { duration: 0.12, ease: 'power3.out' });
  const moveY = gsap.quickTo(cursor, 'y', { duration: 0.12, ease: 'power3.out' });
  let source = null;
  let closing = false;
  let animation;
  let cursorVisible = false;
  let right = 0;
  let returnBounds;
  let coverState;

  function hideCursor() {
    cursorVisible = false;
    document.body.classList.remove('inspect-cursor-visible');
    gsap.to(cursor, { autoAlpha: 0, scale: 0.94, duration: motion.matches ? 0 : 0.15, overwrite: 'auto' });
  }

  function showCursor(event) {
    if (source || event.pointerType === 'touch' || !hover.matches || !event.target.closest('[data-card]')) return;
    const x = Math.min(event.clientX + 16, window.innerWidth - cursor.offsetWidth - 12);
    const y = Math.min(event.clientY + 16, window.innerHeight - cursor.offsetHeight - 12);
    if (!cursorVisible || motion.matches) gsap.set(cursor, { x, y });
    else { moveX(x); moveY(y); }
    if (cursorVisible) return;
    cursorVisible = true;
    document.body.classList.add('inspect-cursor-visible');
    gsap.to(cursor, { autoAlpha: 1, scale: 1, duration: motion.matches ? 0 : 0.18, overwrite: 'auto' });
  }

  function expandedBounds() {
    const top = Math.max(20, window.innerHeight * 0.06);
    return { right, top, width: Math.max(1, window.innerWidth - right * 2), height: window.innerHeight - top * 2 };
  }

  function cardBounds() {
    const rect = source.getBoundingClientRect();
    return { right: window.innerWidth - rect.right, top: rect.top, width: rect.width, height: rect.height };
  }

  function finishClose() {
    animation?.kill();
    animation = null;
    const card = source;
    if (!card) return;
    card.style.removeProperty('visibility');
    // Never focus an offscreen original when a visible loop copy was clicked.
    const focusTarget = card.closest('[data-clone]')
      ? document.querySelector('[data-gallery]')
      : card;
    dialog.close();
    focusTarget?.focus({ preventScroll: true });
    if (coverState) {
      const { element, transform, priority } = coverState;
      if (transform) element.style.setProperty('transform', transform, priority);
      else element.style.removeProperty('transform');
      coverState = null;
    }
    source = null;
    closing = false;
    image.replaceChildren();
    document.body.classList.remove('inspect-open');
    resume();
  }

  function close(immediate = false) {
    if (!source || (closing && !immediate)) return;
    closing = true;
    if (immediate || motion.matches || animation.progress() === 0) { finishClose(); return; }
    // Reverse the same path, even when opening has not finished yet.
    animation.reverse();
  }

  function createTransition() {
    const duration = motion.matches ? 0 : 0.85;
    return gsap.timeline({ paused: true, onReverseComplete: finishClose })
      .fromTo(panel, returnBounds, { ...expandedBounds(), duration, ease: 'power3.inOut' }, 0)
      .fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: motion.matches ? 0 : 0.5 }, 0)
      .fromTo(image, { opacity: 1 }, { opacity: 0, duration: motion.matches ? 0 : 0.4 }, 0)
      .fromTo(closeButton, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.matches ? 0 : 0.25 }, motion.matches ? 0 : 0.35);
  }

  function open(card) {
    if (source) return;
    hideCursor();
    pause();
    source = card;
    returnBounds = cardBounds();
    right = returnBounds.right;
    const index = Number(card.closest('[data-index]').dataset.index);
    dialog.setAttribute('aria-label', `${projects[index].title} — project preview`);
    const cover = card.querySelector(':scope > img');
    image.replaceChildren();
    if (cover) {
      const snapshot = cover.cloneNode(true);
      snapshot.loading = 'eager';
      snapshot.style.transform = getComputedStyle(cover).transform;
      coverState = { element: cover, transform: cover.style.getPropertyValue('transform'), priority: cover.style.getPropertyPriority('transform') };
      // Keep the cover identical at the final handoff, then let hover settle.
      cover.style.transform = snapshot.style.transform;
      image.append(snapshot);
    }
    gsap.set(panel, returnBounds);
    gsap.set([backdrop, closeButton], { opacity: 0 });
    gsap.set(closeButton, { visibility: 'visible' });
    gsap.set(image, { opacity: 1 });
    document.body.classList.add('inspect-open');
    // Capture geometry before showModal changes focus or native scroll locking.
    dialog.showModal();
    card.style.visibility = 'hidden';
    closeButton.focus({ preventScroll: true });
    sound.play('select');
    animation = createTransition();
    animation.play();
  }

  track.addEventListener('pointerover', showCursor);
  track.addEventListener('pointermove', showCursor);
  track.addEventListener('pointerout', (event) => {
    if (event.target.closest('[data-card]') !== event.relatedTarget?.closest?.('[data-card]')) hideCursor();
  });
  track.addEventListener('click', (event) => {
    const card = event.target.closest('[data-card]');
    if (card) open(card);
  });
  closeButton.addEventListener('click', () => close());
  backdrop.addEventListener('click', () => close());
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  // Handle external/native closes as well as the animated close path.
  dialog.addEventListener('close', () => { if (source && !dialog.open) finishClose(); });
  window.addEventListener('blur', hideCursor);
  window.addEventListener('wheel', hideCursor, { passive: true });
  window.addEventListener('scroll', hideCursor, { passive: true });
  window.addEventListener('resize', () => {
    hideCursor();
    if (!source) return;
    const progress = animation.progress();
    animation?.kill();
    returnBounds = cardBounds();
    right = returnBounds.right;
    if (motion.matches) {
      gsap.set(panel, expandedBounds());
      gsap.set(backdrop, { opacity: 1 });
      gsap.set(image, { opacity: 0 });
      gsap.set(closeButton, { autoAlpha: 1 });
      return;
    }
    animation = createTransition();
    animation.progress(progress);
    if (closing) animation.reverse();
    else animation.play();
  });

  return { get isOpen() { return Boolean(source); }, close };
}

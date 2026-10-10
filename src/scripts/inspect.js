import { gsap } from 'gsap';

export function createInspect(projects, { pause, resume, sound }) {
  const track = document.querySelector('[data-track]');
  const dialog = document.querySelector('[data-inspect]');
  const panel = dialog.querySelector('[data-inspect-panel]');
  const backdrop = dialog.querySelector('[data-inspect-backdrop]');
  const image = dialog.querySelector('[data-inspect-image]');
  const closeButton = dialog.querySelector('[data-inspect-close]');
  const controls = dialog.querySelector('[data-inspect-controls]');
  const content = dialog.querySelector('[data-inspect-content]');
  const cursor = document.querySelector('[data-inspect-cursor]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const mobileViewport = window.matchMedia('(max-width: 700px)');
  const moveX = gsap.quickTo(cursor, 'x', { duration: 0.12, ease: 'power3.out' });
  const moveY = gsap.quickTo(cursor, 'y', { duration: 0.12, ease: 'power3.out' });
  let source = null;
  let closing = false;
  let animation;
  let informationAnimation;
  let informationBlocks = [];
  let informationStarted = false;
  let cursorVisible = false;
  let right = 0;
  let returnBounds;
  let destinationBounds;
  let coverState;
  const desktopPreviewWidth = 1440;

  function positionContent() {
    const bounds = expandedBounds();
    // Keep the final layout width throughout expansion/reversal to avoid reflow.
    content.style.width = `${bounds.width}px`;
    gsap.set(panel, bounds);
    gsap.set(controls, { right, top: Math.max(12, bounds.top - 20) });
    document.body.style.setProperty('--inspect-controls-right', `${right}px`);
  }

  function previewBounds() {
    const rect = content.querySelector('[data-inspect-preview]').getBoundingClientRect();
    return { right: window.innerWidth - rect.right, top: rect.top, width: rect.width, height: rect.height };
  }

  function sizeDesktopPreview() {
    const preview = content.querySelector('[data-inspect-preview]');
    const iframe = preview?.querySelector('[data-desktop-preview]');
    if (!preview || !iframe) return;
    const width = preview.getBoundingClientRect().width;
    if (!width) return;
    iframe.style.setProperty('--preview-scale', Math.min(1, width / desktopPreviewWidth));
  }

  function setPreviewLoading(loading) {
    const loader = content.querySelector('[data-inspect-loader]');
    if (!loader) return;
    loader.hidden = !loading;
  }

  function prepareInformation() {
    informationBlocks = [...content.querySelector('[data-inspect-information]').children];
    informationStarted = false;
    gsap.set(informationBlocks, { autoAlpha: motion.matches ? 1 : 0, y: motion.matches ? 0 : 8 });
    if (!motion.matches) {
      informationAnimation = gsap.to(informationBlocks, {
        autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power2.inOut', paused: true,
      });
    }
  }

  function revealInformation() {
    if (!source || closing) return;
    if (motion.matches) {
      informationAnimation?.kill();
      gsap.set(informationBlocks, { autoAlpha: 1, y: 0 });
    } else if (!informationStarted) informationAnimation?.play();
    informationStarted = true;
  }

  function mountPreview() {
    if (!source || closing) return;
    revealInformation(); // Also handles the zero-duration reduced-motion transition.
    content.inert = false;
    const media = content.querySelector('[data-inspect-media]');
    if (!media || media.hasAttribute('src')) return;
    if (media.matches('[data-desktop-preview]')) {
      setPreviewLoading(true);
      media.addEventListener('load', () => {
        if (source && !closing) setPreviewLoading(false);
      }, { once: true });
    }
    // Start media after expansion; resize keeps the current playback position.
    media.src = media.dataset.src;
    if (media.tagName === 'VIDEO') {
      media.muted = true;
      if (!motion.matches) media.play().catch(() => {}); // Controls remain available if autoplay is blocked.
    }
  }

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
    // CSS starts the label hidden; make both opacity and visibility explicit so
    // entering a card always reveals the custom cursor, not just its state.
    gsap.set(cursor, { autoAlpha: 1, visibility: 'visible', scale: 1 });
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

  function modalInset() {
    return mobileViewport.matches ? 16 : returnBounds.right;
  }

  function finishClose() {
    animation?.kill();
    animation = null;
    informationAnimation?.kill();
    informationAnimation = null;
    informationBlocks = [];
    informationStarted = false;
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
    const media = content.querySelector('[data-inspect-media]');
    if (media) {
      if (media.tagName === 'VIDEO') media.pause();
      media.removeAttribute('src');
      if (media.tagName === 'VIDEO') media.load();
    }
    content.replaceChildren();
    document.body.classList.remove('inspect-open');
    document.body.style.removeProperty('--inspect-controls-right');
    resume();
  }

  function close(immediate = false) {
    if (!source || (closing && !immediate)) return;
    closing = true;
    // Stop the reveal at its current position before starting the exit.
    informationAnimation?.kill();
    content.inert = true;
    content.querySelector('video')?.pause();
    closeButton.focus({ preventScroll: true });
    if (immediate || motion.matches || animation.progress() === 0) { finishClose(); return; }
    if (animation.progress() === 1) {
      // The mobile preview may have moved while the user scrolled the popup.
      destinationBounds = previewBounds();
      animation.kill();
      animation = createTransition();
      animation.progress(1);
    }
    if (informationStarted) {
      // Exit from the current reveal state, in parallel with the card reversal.
      informationAnimation = gsap.to(informationBlocks, {
        autoAlpha: 0, y: 8, duration: 0.55, ease: 'power2.inOut',
      });
    }
    // Reverse the same path, even when opening has not finished yet.
    animation.reverse();
  }

  function createTransition() {
    const duration = motion.matches ? 0 : 0.75;
    const fadeDuration = motion.matches ? 0 : 0.6;
    return gsap.timeline({ paused: true, onComplete: mountPreview, onReverseComplete: finishClose })
      .fromTo(image, { ...returnBounds, autoAlpha: 1 }, { ...destinationBounds, duration, ease: 'power3.inOut' }, 0)
      .fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: motion.matches ? 0 : 0.5 }, 0)
      .fromTo(image, { autoAlpha: 1 }, { autoAlpha: 0, duration: fadeDuration, ease: 'power2.inOut' }, duration)
      .fromTo(controls, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.matches ? 0 : 0.25 }, motion.matches ? 0 : 0.35)
      .fromTo(content, { autoAlpha: 0 }, { autoAlpha: 1, duration: fadeDuration, ease: 'power2.inOut', onStart: revealInformation }, duration);
  }

  function open(card) {
    if (source) return;
    hideCursor();
    pause();
    source = card;
    returnBounds = cardBounds();
    right = modalInset();
    const index = Number(card.closest('[data-index]').dataset.index);
    const project = projects[index];
    dialog.setAttribute('aria-label', `${project.title} — project preview`);
    content.replaceChildren(document.querySelector(`[data-inspect-template="${index}"]`).content.cloneNode(true));
    content.inert = true;
    prepareInformation();
    positionContent();
    sizeDesktopPreview();
    const cover = card.querySelector(':scope > img');
    image.replaceChildren();
    if (cover) {
      const snapshot = cover.cloneNode(true);
      snapshot.loading = 'eager';
      snapshot.style.objectPosition = 'top';
      snapshot.style.transform = getComputedStyle(cover).transform;
      coverState = { element: cover, transform: cover.style.getPropertyValue('transform'), priority: cover.style.getPropertyPriority('transform') };
      // Keep the cover identical at the final handoff, then let hover settle.
      cover.style.transform = snapshot.style.transform;
      image.append(snapshot);
    }
    image.style.backgroundColor = getComputedStyle(card).backgroundColor;
    content.querySelector('[data-inspect-preview]').style.backgroundColor = image.style.backgroundColor;
    gsap.set(image, { ...returnBounds, autoAlpha: 1 });
    gsap.set([backdrop, controls, content], { opacity: 0 });
    gsap.set(controls, { visibility: 'visible' });
    document.body.classList.add('inspect-open');
    // Capture geometry before showModal changes focus or native scroll locking.
    dialog.showModal();
    card.style.visibility = 'hidden';
    closeButton.focus({ preventScroll: true });
    sizeDesktopPreview();
    destinationBounds = previewBounds();
    sound.play('select');
    animation = createTransition();
    animation.play();
  }

  track.addEventListener('pointerover', showCursor);
  track.addEventListener('pointermove', showCursor);
  track.addEventListener('pointerout', (event) => {
    const card = event.target.closest('[data-card]');
    const nextCard = event.relatedTarget?.closest?.('[data-card]');
    // pointerout also fires when moving between the card and its children.
    // Only hide the custom cursor after leaving the card entirely.
    if (card && !nextCard) hideCursor();
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
    right = modalInset();
    positionContent();
    sizeDesktopPreview();
    destinationBounds = previewBounds();
    if (motion.matches) {
      gsap.set(panel, expandedBounds());
      gsap.set(backdrop, { opacity: 1 });
      gsap.set(image, { ...destinationBounds, autoAlpha: 0 });
      gsap.set([controls, content], { autoAlpha: 1 });
      mountPreview();
      return;
    }
    animation = createTransition();
    animation.progress(progress);
    if (closing) animation.reverse();
    else animation.play();
  });

  return { get isOpen() { return Boolean(source); }, close };
}

import Lenis from 'lenis';
import { gsap } from 'gsap';
import { createInspect } from './inspect.js';
import { mostVisibleProject } from './visibility.js';

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const mod = (value, size) => ((value % size) + size) % size;

export function createGallery(projects, sound) {
  const $ = (selector) => document.querySelector(selector);
  const wrapper = $('[data-scroll]');
  const spacer = $('[data-spacer]');
  const track = $('[data-track]');
  const original = $('[data-group]');
  const hero = $('[data-hero]');
  const heroTitle = hero.querySelector('h1');
  const navbar = $('.navbar');
  const contact = $('.navbar__contact');
  const information = $('[data-information]');
  const navigation = $('[data-project-navigation]');
  const navigationItems = [...navigation.querySelectorAll('[data-project-nav]')];
  const navigationTicks = navigationItems.map((button) => ({
    button,
    position: Number(button.dataset.projectNav) + Number(button.closest('[data-nav-copy]').dataset.navCopy) * projects.length,
  }));
  const ticksPerProject = Number(navigation.style.getPropertyValue('--nav-ticks'));
  const tooltip = $('[data-nav-tooltip]');
  const tooltipLabels = [...tooltip.querySelectorAll('[data-nav-label]')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lenis;
  let inspection;
  let pausedScroll = null;
  let renderedScroll = 0;
  let mode = 'intro';
  let active = 0;
  let height = 0;
  let slot = 0;
  let cycle = 0;
  let travel = 0;
  let cards = [];
  let changingMode = false;
  let heroDocked = false;
  let heroDockY = 0;
  let heroDockScale = 1;
  let cardMinWidth = 0.546;
  let cardMaxWidth = 0.667;
  let lastStaticScroll = window.scrollY;
  let tooltipVisible = false;
  let hoveredItem = null;
  let highlightedTick = null;
  let currentTick = null;
  let navigationMoving = false;
  let navigationIdle;
  let tooltipIndex = null;
  let tooltipLayer = 0;
  let soundPosition = null;
  let soundUpdatedAt = 0;

  function hideTooltip(immediate = false) {
    hoveredItem = null;
    tooltipVisible = false;
    refreshNavigation();
    gsap.to(tooltip, { autoAlpha: 0, x: 6, duration: immediate || motion.matches ? 0 : 0.3, ease: 'power2.out', overwrite: 'auto' });
  }

  function showTooltip(button) {
    hoveredItem = button;
    updateTooltipName(Math.floor(Number(button.dataset.projectNav)));
    positionTooltip();
    if (!hoveredItem) return;
    refreshNavigation();
    if (!tooltipVisible) {
      tooltipVisible = true;
      gsap.to(tooltip, { autoAlpha: 1, x: 0, duration: motion.matches ? 0 : 0.22, ease: 'power2.out', overwrite: 'auto' });
    }
  }

  function positionTooltip() {
    if (!hoveredItem) return;
    const itemRect = hoveredItem.getBoundingClientRect();
    const navRect = navigation.getBoundingClientRect();
    const y = itemRect.top + itemRect.height / 2 - navRect.top;
    if (y < 0 || y > navRect.height || !hoveredItem.matches(':hover')) {
      hideTooltip();
      return;
    }
    tooltip.style.top = `${y}px`;
  }

  function updateTooltipName(index) {
    if (index === tooltipIndex) return;
    gsap.killTweensOf(tooltipLabels);
    const outgoing = tooltipLabels[tooltipLayer];
    tooltipLayer = 1 - tooltipLayer;
    const incoming = tooltipLabels[tooltipLayer];
    incoming.textContent = projects[index].title;
    const animate = tooltipIndex !== null && !motion.matches;
    gsap.to(outgoing, { opacity: 0, y: animate ? -4 : 0, duration: animate ? 0.28 : 0, ease: 'power2.out' });
    gsap.fromTo(incoming, { opacity: 0, y: animate ? 4 : 0 }, { opacity: 1, y: 0, duration: animate ? 0.28 : 0, ease: 'power2.out' });
    gsap.to(tooltip, { width: incoming.getBoundingClientRect().width + 28, duration: animate ? 0.28 : 0, ease: 'power2.out', overwrite: 'auto' });
    tooltipIndex = index;
  }

  function refreshNavigation() {
    // Hover takes priority over the scrolling indicator, including loop copies.
    const hovered = navigationTicks.find(({ button }) => button === hoveredItem);
    const highlighted = hovered ? Math.round(hovered.position * ticksPerProject) : navigationMoving ? currentTick : null;
    if (highlighted === highlightedTick) return;
    highlightedTick = highlighted;
    navigationTicks.forEach(({ button, position }) => {
      const distance = highlighted === null ? Infinity : Math.abs(Math.round(position * ticksPerProject) - highlighted);
      button.style.setProperty('--line-width', `${Math.max(6, 20 - distance * 4)}px`);
      button.classList.toggle('is-active', distance === 0);
      button.classList.toggle('is-near', distance > 0 && distance < 4);
    });
  }

  function noteNavigationMovement() {
    navigationMoving = true;
    refreshNavigation();
    navigationIdle ||= gsap.delayedCall(0.22, () => {
      navigationIdle = null;
      navigationMoving = false;
      refreshNavigation();
    });
    navigationIdle.restart(true);
  }

  function resetNavigationMovement() {
    navigationIdle?.kill();
    navigationIdle = null;
    navigationMoving = false;
    refreshNavigation();
  }

  function updateNavigation(position, audible = false) {
    const elapsed = Math.max(1 / 60, gsap.ticker.time - soundUpdatedAt);
    if (audible && soundPosition !== null) {
      // Unwrap both directions so the loop seam is one step, not a whole ruler.
      const delta = mod(position - soundPosition + projects.length / 2, projects.length) - projects.length / 2;
      const before = Math.round(soundPosition * ticksPerProject);
      const after = Math.round((soundPosition + delta) * ticksPerProject);
      if (before !== after) sound.play('tick', Math.abs(delta) / elapsed / 2);
    }
    soundPosition = position;
    soundUpdatedAt = gsap.ticker.time;
    navigation.style.setProperty('--nav-position', String(position));
    const nearest = Math.round((4 * projects.length + position) * ticksPerProject);
    if (nearest !== currentTick) {
      currentTick = nearest;
      const current = mod(nearest, projects.length * ticksPerProject) / ticksPerProject;
      navigationItems.forEach((button) => {
        if (Number(button.dataset.projectNav) === current) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
    }
    positionTooltip();
    refreshNavigation();
  }

  function dockHero(docked, immediate = false) {
    if (docked === heroDocked && !immediate) return;
    heroDocked = docked;
    // Transform the same heading without changing its line breaks mid-motion.
    gsap.to(hero, {
      y: docked ? heroDockY : 0,
      scale: docked ? heroDockScale : 1,
      duration: immediate ? 0 : 1.1,
      ease: 'power2.inOut',
      overwrite: true,
    });
  }

  function updateInformation(index, animate = true) {
    if (index === active && information.dataset.initialized) return;
    active = index;
    information.dataset.initialized = 'true';
    const project = projects[index];
    $('[data-title]').textContent = project.title;
    $('[data-description]').textContent = project.description;
    $('[data-description]').hidden = !project.description;
    $('[data-tags]').replaceChildren(...project.tags.map((tag) => {
      const li = document.createElement('li');
      li.textContent = tag;
      return li;
    }));
    if (animate && !motion.matches) {
      gsap.killTweensOf(information.children);
      gsap.fromTo(information.children, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, stagger: 0.025 });
    }
  }

  function measure() {
    soundPosition = null;
    const oldCycle = cycle;
    const oldTravel = travel;
    const oldPhase = mode === 'loop' && oldCycle ? mod(oldTravel + (pausedScroll ?? lenis.scroll), oldCycle) / oldCycle : 0;
    height = wrapper.clientHeight;
    slot = original.firstElementChild.getBoundingClientRect().height;
    cycle = original.getBoundingClientRect().height;
    travel = height * 0.838;
    const mobile = window.matchMedia('(max-width: 700px)').matches;
    cardMinWidth = mobile ? 0.84 : 0.546;
    cardMaxWidth = mobile ? 1 : 0.667;
    const titleStyle = getComputedStyle(heroTitle);
    const contactVisible = getComputedStyle(contact).display !== 'none';
    const anchor = contactVisible ? contact : navbar;
    heroDockY = anchor.getBoundingClientRect().bottom + 24 - Number.parseFloat(getComputedStyle(hero).top);
    heroDockScale = contactVisible
      ? Math.min(window.innerWidth * 0.257, 370) / Number.parseFloat(titleStyle.width)
      : Math.min(1, 28 / Number.parseFloat(titleStyle.fontSize));
    dockHero(mode === 'loop' || (pausedScroll ?? lenis.scroll) > 1, true);
    // In loop mode scroll limit is exactly 3 complete cycles. This makes the
    // native wrap and the visual modulo agree, including at either boundary.
    spacer.style.height = `${(mode === 'loop' ? 3 * cycle : travel + cycle) + height}px`;
    lenis.resize();
    const scroll = mode === 'loop' && oldCycle ? cycle + oldPhase * cycle - travel : pausedScroll ?? lenis.scroll;
    lenis.scrollTo(scroll, { immediate: true, force: true });
    if (pausedScroll !== null) pausedScroll = scroll;
    render(scroll, true);
  }

  function createLenis(infinite = false) {
    lenis?.destroy();
    lenis = new Lenis({
      wrapper,
      content: spacer,
      eventsTarget: window,
      infinite,
      syncTouch: true,
      lerp: 0.085,
      autoRaf: false,
      autoResize: false,
    });
    lenis.on('scroll', ({ scroll, velocity }) => {
      if (pausedScroll !== null) return;
      render(scroll, false, Math.abs(velocity) > 0.01);
      if (Math.abs(velocity) > 0.01) noteNavigationMovement();
    });
    if (inspection?.isOpen) lenis.stop();
  }

  function startLoop(overflow = 0) {
    if (pausedScroll !== null) { changingMode = false; return; }
    if (mode === 'loop' || motion.matches) return;
    const remainingScroll = lenis.targetScroll - lenis.animatedScroll;
    mode = 'loop';
    document.body.dataset.mode = mode;
    spacer.style.height = `${3 * cycle + height}px`;
    createLenis(true);
    lenis.scrollTo(cycle + overflow, { immediate: true });
    // Rebasing into the loop must retain the unfinished scroll movement.
    if (remainingScroll) {
      lenis.scrollTo(cycle + overflow + remainingScroll, { programmatic: false, lerp: 0.085 });
    }
    changingMode = false;
  }

  function render(scroll, force = false, audible = false) {
    if (pausedScroll !== null && !force) return;
    renderedScroll = scroll;
    const phase = mode === 'loop' ? mod(travel + scroll, cycle) : Math.max(0, scroll);
    track.style.transform = `translate3d(0, ${-cycle - phase}px, 0)`;
    const progress = mode === 'loop' ? 1 : clamp(scroll / travel);
    dockHero(mode === 'loop' || scroll > 1);
    information.style.opacity = String(clamp((progress - 0.6) / 0.3));
    information.style.visibility = progress > 0.6 ? 'visible' : 'hidden';
    const top = Number.parseFloat(getComputedStyle(track).top);
    const cardHeight = slot - 24;
    cards.forEach(({ element, index, group }) => {
      const y = top + group * cycle + index * slot - cycle - phase;
      const distance = Math.abs(y + cardHeight / 2 - height / 2);
      const proximity = clamp(1 - distance / slot);
      const expand = proximity * proximity * (3 - 2 * proximity);
      element.style.width = `${(cardMinWidth + (cardMaxWidth - cardMinWidth) * expand) * 100}%`;
    });
    // Compare the visible portion of slots, including copies at loop seams.
    updateInformation(mostVisibleProject(cards
      .filter(({ group }) => mode === 'loop' || group === 1)
      .map(({ index, group }) => {
        const y = top + group * cycle + index * slot - cycle - phase;
        return { index, top: y, bottom: y + slot };
      }), height, active));
    const focusOffset = top + cardHeight / 2 - height / 2;
    updateNavigation(mod((phase - focusOffset) / slot, projects.length), audible);
    if (pausedScroll === null && mode === 'intro' && scroll >= travel && !changingMode) {
      changingMode = true;
      queueMicrotask(() => startLoop(scroll - travel));
    }
  }

  function select(index) {
    if (pausedScroll !== null) return;
    // Every ruler tick selects the project named in its hover tooltip.
    index = mod(Math.floor(index), projects.length);
    if (motion.matches) {
      const rect = original.children[index].querySelector('[data-card]').getBoundingClientRect();
      const top = window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2;
      window.scrollTo({ top, behavior: 'instant' });
      syncStaticInformation(false);
      return;
    }
    if (mode !== 'loop') startLoop();
    const phase = mod(travel + lenis.scroll, cycle);
    const top = Number.parseFloat(getComputedStyle(track).top);
    const wanted = top + index * slot + (slot - 24) / 2 - height / 2;
    let delta = mod(wanted - phase + cycle / 2, cycle) - cycle / 2;
    lenis.scrollTo(lenis.scroll + delta, { duration: 0.7 });
  }

  function syncStaticInformation(audible = true) {
    if (!motion.matches || pausedScroll !== null) return;
    const scroll = window.scrollY;
    const direction = Math.sign(scroll - lastStaticScroll);
    const centers = [];
    const slots = [...original.children].map((element, index) => {
      const rect = element.querySelector('[data-card]').getBoundingClientRect();
      const center = scroll + rect.top + rect.height / 2 - window.innerHeight / 2;
      centers.push(center);
      const slotRect = element.getBoundingClientRect();
      return { index, top: slotRect.top, bottom: slotRect.bottom };
    });
    updateInformation(mostVisibleProject(slots, window.innerHeight, active));
    let position = 0;
    centers.forEach((center, index) => {
      if (scroll >= center) {
        const next = centers[index + 1];
        position = index + (next === undefined ? 0 : clamp((scroll - center) / (next - center)));
      }
    });
    updateNavigation(position, audible && direction !== 0);
    if (direction) noteNavigationMovement();
    lastStaticScroll = scroll;
  }

  function home() {
    soundPosition = null;
    hideTooltip(true);
    resetNavigationMovement();
    if (motion.matches) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      lastStaticScroll = window.scrollY;
      updateInformation(0, false);
      syncStaticInformation(false);
      return;
    }
    mode = 'intro';
    changingMode = false;
    document.body.dataset.mode = mode;
    hero.hidden = false;
    wrapper.scrollTop = 0;
    createLenis();
    measure();
    lenis.scrollTo(0, { immediate: true });
    updateInformation(0, false);
  }

  function initialize() {
    inspection?.close(true);
    soundPosition = null;
    hideTooltip(true);
    resetNavigationMovement();
    lenis?.destroy();
    lenis = undefined;
    gsap.killTweensOf(hero);
    gsap.set(hero, { clearProps: 'transform' });
    heroDocked = false;
    document.querySelectorAll('[data-clone]').forEach((node) => node.remove());
    document.body.classList.toggle('enhanced', !motion.matches);
    hero.hidden = false;
    hero.removeAttribute('style');
    information.removeAttribute('style');
    track.removeAttribute('style');
    original.querySelectorAll('[data-card]').forEach((card) => card.removeAttribute('style'));
    if (motion.matches) {
      lastStaticScroll = window.scrollY;
      mode = 'static';
      document.body.dataset.mode = mode;
      updateInformation(active, false);
      syncStaticInformation(false);
      return;
    }
    for (const side of ['before', 'after']) {
      const clone = original.cloneNode(true);
      clone.dataset.clone = side;
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('a, button').forEach((node) => node.tabIndex = -1);
      if (side === 'before') track.prepend(clone); else track.append(clone);
    }
    cards = [...track.querySelectorAll('[data-card]')].map((element, position) => ({
      element, index: position % projects.length, group: Math.floor(position / projects.length),
    }));
    mode = 'intro';
    document.body.dataset.mode = mode;
    wrapper.scrollTop = 0;
    createLenis();
    measure();
    lenis.scrollTo(0, { immediate: true });
    updateInformation(0, false);
  }

  original.addEventListener('focusin', (event) => {
    const slotElement = event.target.closest('[data-index]');
    if (slotElement && event.target.matches(':focus-visible') && !motion.matches && !inspection?.isOpen) select(Number(slotElement.dataset.index));
  });
  $('[data-home]').addEventListener('click', home);
  navigation.addEventListener('click', (event) => {
    const button = event.target.closest('[data-project-nav]');
    if (!button) return;
    sound.play('select');
    select(Number(button.dataset.projectNav));
  });
  navigation.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch') return;
    const button = event.target.closest('[data-project-nav]');
    if (button && button !== hoveredItem) showTooltip(button);
  });
  navigation.addEventListener('pointerout', (event) => {
    if (!hoveredItem || hoveredItem.contains(event.relatedTarget)) return;
    const next = event.relatedTarget?.closest('[data-project-nav]');
    if (next && navigation.contains(next)) showTooltip(next);
    else hideTooltip();
  });
  navigation.addEventListener('focusin', (event) => {
    const button = event.target.closest('[data-project-nav]');
    if (button?.matches(':focus-visible')) select(Number(button.dataset.projectNav));
  });
  motion.addEventListener('change', initialize);
  window.addEventListener('resize', () => {
    soundPosition = null;
    if (!motion.matches) measure();
    else syncStaticInformation(false);
  });
  window.addEventListener('scroll', () => syncStaticInformation(), { passive: true });
  document.addEventListener('visibilitychange', () => { soundPosition = null; });
  inspection = createInspect(projects, {
    sound,
    pause() {
      pausedScroll = mode === 'static' ? window.scrollY : renderedScroll;
      // stop/start reset Lenis to native scroll; keep the visual phase frozen.
      lenis?.stop();
      hideTooltip(true);
      resetNavigationMovement();
    },
    resume() {
      const scroll = pausedScroll;
      if (scroll === null) return;
      if (mode === 'static') {
        window.scrollTo({ top: scroll, behavior: 'instant' });
        lastStaticScroll = window.scrollY;
      } else {
        lenis.scrollTo(scroll, { immediate: true, force: true });
        lenis.start();
        // Retain subpixel geometry despite native scroll rounding.
        lenis.animatedScroll = lenis.targetScroll = scroll;
      }
      pausedScroll = null;
      if (mode !== 'static') render(scroll);
    },
  });
  initialize();
  // This is the only RAF driver. Lenis autoRaf intentionally stays disabled.
  gsap.ticker.add((time) => {
    // Also observe the current value here: some embedded/headless browsers
    // update media preferences without dispatching a MediaQueryList event.
    if ((mode === 'static') !== motion.matches) initialize();
    if (!motion.matches) lenis.raf(time * 1000);
  });
}

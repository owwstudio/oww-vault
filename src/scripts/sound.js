import { gsap } from 'gsap';

// A tiny original synthesized click. Replace this with decoded samples later
// if a more specific sound character is needed.
export function createSound(button) {
  const wave = button.querySelector('[data-sound-wave]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const easeWave = gsap.parseEase('sine.inOut');
  let context;
  let enabled = false;
  let lastTick = -Infinity;
  let toggling = false;
  let wavePhase = 0;
  let waveUpdatedAt = 0;
  let waveAmplitude = 0;
  let transitionFrom = 0;
  let transitionStartedAt = 0;

  function drawWave(phase) {
    // Move the phase inside a fixed-length path so its real endpoints keep
    // their round caps. Clipping a translated path would cut the caps off.
    const points = [];
    for (let step = 0; step <= 32; step++) {
      const x = 3 + step * 24 / 32;
      const y = 12 - waveAmplitude * Math.sin(step / 32 * Math.PI * 2 - phase);
      points.push(`${step === 0 ? 'M' : 'L'}${x} ${y.toFixed(3)}`);
    }
    wave.setAttribute('d', points.join(' '));
  }

  function animateWave(time) {
    const elapsed = time - waveUpdatedAt;
    waveUpdatedAt = time;
    if (document.hidden) return;
    const progress = Math.min(1, Math.max(0, (time - transitionStartedAt) / 0.45));
    const target = enabled ? 7.5 : 0;
    waveAmplitude = transitionFrom + (target - transitionFrom) * easeWave(progress);
    wavePhase = (wavePhase + elapsed / 1.3 * Math.PI * 2) % (Math.PI * 2);
    drawWave(wavePhase);
    if (!enabled && progress === 1) gsap.ticker.remove(animateWave);
  }

  function updateWave() {
    if (motion.matches) {
      gsap.ticker.remove(animateWave);
      waveAmplitude = enabled ? 7.5 : 0;
      drawWave(wavePhase);
      return;
    }
    // Keep the phase and current height when reversing a transition.
    waveUpdatedAt = gsap.ticker.time;
    transitionStartedAt = waveUpdatedAt;
    transitionFrom = waveAmplitude;
    gsap.ticker.add(animateWave);
  }

  function updateButton() {
    const label = enabled ? 'Turn sound off' : 'Turn sound on';
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', label);
    button.title = label;
    updateWave();
  }

  async function toggle() {
    if (toggling) return;
    toggling = true;
    try {
      if (!enabled) {
        context ??= new (window.AudioContext || window.webkitAudioContext)();
        if (context.state === 'suspended') await context.resume();
      }
      enabled = !enabled;
      updateButton();
      if (enabled) play('select');
    } catch {
      enabled = false;
      updateButton();
      button.setAttribute('aria-label', 'Sound unavailable');
      button.title = 'Sound unavailable';
      button.disabled = true;
    } finally {
      toggling = false;
    }
  }

  function play(type = 'tick') {
    if (!enabled || context?.state !== 'running' || document.hidden) return;
    const now = context.currentTime;
    if (type === 'tick' && now - lastTick < 0.14) return;
    lastTick = now;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(type === 'tick' ? 1250 : 850, now);
    oscillator.frequency.exponentialRampToValueAtTime(180, now + 0.035);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(type === 'tick' ? 0.07 : 0.12, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(now);
    oscillator.stop(now + 0.06);
  }

  button.addEventListener('click', toggle);
  motion.addEventListener('change', updateWave);
  return { play };
}

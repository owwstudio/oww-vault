import { gsap } from 'gsap';

// Original wheel-like ticks: a warm body with a brief, filtered noise attack.
export function createSound(button) {
  const wave = button.querySelector('[data-sound-wave]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const easeWave = gsap.parseEase('sine.inOut');
  let context;
  let buffers;
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
        buffers ??= { tick: createClickBuffer(false), select: createClickBuffer(true) };
      }
      enabled = !enabled;
      lastTick = -Infinity;
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

  function createClickBuffer(select) {
    const duration = select ? 0.036 : 0.028;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    const frequency = select ? 440 : 680;
    let seed = 17;
    let filtered = 0;
    let low = 0;
    let peak = 0;
    const filter = 1 - Math.exp(-2 * Math.PI * 4200 / context.sampleRate);
    const bass = 1 - Math.exp(-2 * Math.PI * 900 / context.sampleRate);
    for (let i = 0; i < samples.length; i++) {
      const time = i / context.sampleRate;
      // Deterministic noise keeps the timbre consistent across every tick.
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      filtered += filter * (seed / 2147483648 - 1 - filtered);
      low += bass * (filtered - low);
      const attack = 1 - Math.exp(-time / 0.00045);
      const tail = Math.min(1, (samples.length - 1 - i) / (context.sampleRate * 0.002));
      const body = Math.sin(2 * Math.PI * frequency * time) * Math.exp(-time / (select ? 0.007 : 0.0045));
      const edge = ((filtered - low) * 0.6 + Math.sin(2 * Math.PI * 1900 * time) * 0.12) * Math.exp(-time / 0.0018);
      samples[i] = (body * 0.8 + edge) * attack * tail;
      peak = Math.max(peak, Math.abs(samples[i]));
    }
    for (let i = 0; i < samples.length; i++) samples[i] *= 0.8 / peak;
    return buffer;
  }

  function play(type = 'tick', speed = 0) {
    if (!enabled || context?.state !== 'running' || document.hidden) return;
    const now = context.currentTime;
    if (type === 'tick' && now - lastTick < 0.11) return;
    lastTick = now;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffers[type === 'tick' ? 'tick' : 'select'];
    const pace = Math.min(1, Math.max(0, speed));
    gain.gain.setValueAtTime(type === 'tick' ? 0.075 * (1 - pace * 0.28) : 0.1, now);
    source.connect(gain);
    gain.connect(context.destination);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(now);
  }

  button.addEventListener('click', toggle);
  motion.addEventListener('change', updateWave);
  return { play };
}

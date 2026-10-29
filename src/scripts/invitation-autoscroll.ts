// Prepare after the opening gesture; schedule when the doors finish opening.
export function prepareInvitationAutoscroll() {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  let cancelled = motion.matches || document.hidden;
  let timer: ReturnType<typeof setTimeout>;
  let frame = 0;
  let running = false;
  let position = window.scrollY;
  let expectedPosition = position;

  const stop = () => {
    cancelled = true;
    running = false;
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    listeners.abort();
  };
  const options = { passive: true, signal: listeners.signal };
  // Give control back immediately, including touches on photos or the wish form.
  window.addEventListener('wheel', stop, options);
  window.addEventListener('pointerdown', stop, options);
  window.addEventListener('touchstart', stop, options);
  window.addEventListener('keydown', stop, { signal: listeners.signal });
  window.addEventListener('scroll', () => {
    if (!running || Math.abs(window.scrollY - expectedPosition) > 2) stop();
  }, options);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  }, { signal: listeners.signal });
  motion.addEventListener('change', () => { if (motion.matches) stop(); }, { signal: listeners.signal });
  window.addEventListener('pagehide', stop, { signal: listeners.signal });

  return () => {
    if (cancelled) { stop(); return; }
    timer = setTimeout(() => {
      if (cancelled || document.hidden) { stop(); return; }
      running = true;
      position = expectedPosition = window.scrollY;
      let previous = performance.now();
      let elapsed = 0;
      const tick = (now: number) => {
        if (cancelled) return;
        const delta = Math.min(now - previous, 64);
        previous = now;
        elapsed += delta;
        // Ease into a quiet reading pace; retain fractional pixels between frames.
        position += 22 * (delta / 1000) * Math.min(elapsed / 1500, 1);
        const bottom = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo({ top: Math.min(position, bottom), behavior: 'instant' });
        expectedPosition = window.scrollY;
        if (expectedPosition >= bottom - 1) { stop(); return; }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, 3000);
  };
}

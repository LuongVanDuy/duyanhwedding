const invitation = document.querySelector<HTMLElement>('[data-invitation-inside]');
const cover = document.querySelector<HTMLElement>('[data-cover]');
const preference = window.matchMedia('(prefers-reduced-motion: reduce)');

if (invitation && !preference.matches && 'IntersectionObserver' in window) {
  const pieces = [...invitation.querySelectorAll<HTMLElement>(
    '[data-hero-reveal], [data-invitation-reveal], [data-album-reveal], [data-reveal]',
  )];
  const zones = [...invitation.querySelectorAll<HTMLElement>('[data-motion-zone]')];
  invitation.querySelectorAll('.floral-rule path, .garden-branch path, .handwritten-heart path, .invitation-end path').forEach(path => {
    path.classList.add('ink-line');
    path.setAttribute('pathLength', '1');
  });
  let started = false;
  let coverObserver: MutationObserver | undefined;

  const reveal = (piece: HTMLElement) => {
    piece.dataset.motion = 'visible';
    piece.classList.add('is-visible');
    revealObserver.unobserve(piece);
  };
  const revealObserver = new IntersectionObserver((entries) => {
    const entering = entries.filter(entry => entry.isIntersecting);
    entering.forEach((entry, index) => {
      const piece = entry.target as HTMLElement;
      // Only stagger elements entering together, so later content never waits long.
      if (!piece.closest('.wedding-hero')) {
        piece.style.setProperty('--motion-delay', `${Math.min(index * 65, 195)}ms`);
      }
      reveal(piece);
    });
  }, { threshold: .06, rootMargin: '0px 0px -18px 0px' });
  const zoneObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      (entry.target as HTMLElement).dataset.motionActive = String(entry.isIntersecting);
    });
  }, { rootMargin: '60px 0px' });

  const start = () => {
    if (started) return;
    started = true;
    coverObserver?.disconnect();
    invitation.classList.add('motion-started');
    const hero = invitation.querySelector<HTMLElement>('.wedding-hero');
    hero?.style.setProperty('--opening-offset', cover?.dataset.state === 'opening' ? '450ms' : '0ms');
    pieces.forEach(piece => revealObserver.observe(piece));
    zones.forEach(zone => zoneObserver.observe(zone));
  };
  pieces.forEach(piece => { piece.dataset.motion = 'pending'; });
  invitation.querySelector('.wedding-hero')?.classList.add('hero-motion');
  if (cover?.dataset.state === 'closed') {
    coverObserver = new MutationObserver(() => {
      if (cover.dataset.state !== 'closed') start();
    });
    coverObserver.observe(cover, { attributes: true, attributeFilter: ['data-state'] });
  } else start();

  invitation.addEventListener('focusin', event => {
    // Reveal every animated ancestor when tabbing into a link or form.
    let piece = (event.target as HTMLElement).closest<HTMLElement>('[data-motion]');
    while (piece) {
      piece.style.setProperty('--motion-delay', '0ms');
      reveal(piece);
      piece = piece.parentElement?.closest<HTMLElement>('[data-motion]') ?? null;
    }
  });
  document.addEventListener('visibilitychange', () => {
    invitation.classList.toggle('motion-suspended', document.hidden);
  });
  preference.addEventListener('change', event => {
    if (!event.matches) return;
    coverObserver?.disconnect();
    revealObserver.disconnect();
    zoneObserver.disconnect();
    pieces.forEach(piece => {
      piece.dataset.motion = 'visible';
      piece.classList.add('is-visible');
    });
    invitation.classList.remove('motion-started');
    invitation.querySelector('.wedding-hero')?.classList.remove('hero-motion');
  });
}

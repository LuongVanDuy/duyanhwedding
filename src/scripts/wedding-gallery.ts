export {};

interface GalleryPhoto { id: string; alt: string; width: number; height: number; src: string; srcset: string; }
interface GalleryGroup { id: string; title: string; photos: GalleryPhoto[]; }

const catalog = document.querySelector<HTMLScriptElement>('[data-gallery-catalog]');
const dialog = document.querySelector<HTMLDialogElement>('[data-photo-viewer]');
const picture = dialog?.querySelector<HTMLImageElement>('[data-viewer-image]');
const stage = dialog?.querySelector<HTMLElement>('[data-stage]');
const status = dialog?.querySelector<HTMLElement>('[data-status]');
const counter = dialog?.querySelector<HTMLElement>('[data-counter]');
const title = dialog?.querySelector<HTMLElement>('[data-gallery-title]');

if (catalog && dialog && picture && stage && status && counter && title) {
  const groups: GalleryGroup[] = JSON.parse(catalog.textContent || '[]');
  let group: GalleryGroup;
  let current = 0;
  let opener: HTMLElement | undefined;
  let previousOverflow = '';

  // Account for both the viewport and the photo's aspect ratio; never request
  // all full-size photos or use the large screen's width for a narrow portrait.
  const updateSizes = () => {
    if (!group || !dialog.open) return;
    const photo = group.photos[current];
    const width = Math.max(1, Math.min(stage.clientWidth, stage.clientHeight * photo.width / photo.height));
    picture.sizes = `${Math.ceil(width)}px`;
  };
  const showPhoto = (index: number) => {
    current = (index + group.photos.length) % group.photos.length;
    const photo = group.photos[current];
    stage.setAttribute('aria-busy', 'true');
    picture.hidden = true;
    status.textContent = 'Đang tải ảnh…';
    counter.textContent = `Ảnh ${current + 1} / ${group.photos.length}`;
    picture.alt = photo.alt;
    updateSizes();
    picture.srcset = photo.srcset;
    picture.src = photo.src;
  };
  const open = (element: HTMLElement, groupId: string | undefined, photoId: string | undefined) => {
    const selected = groups.find(item => item.id === groupId);
    if (!selected?.photos.length) return;
    group = selected;
    opener = element;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    title.textContent = group.title;
    dialog.dataset.theme = group.id;
    dialog.showModal();
    showPhoto(Math.max(0, group.photos.findIndex(photo => photo.id === photoId)));
  };
  document.querySelectorAll<HTMLAnchorElement>('[data-album-photo]').forEach(link => {
    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-controls', dialog.id);
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      open(link, link.closest<HTMLElement>('[data-gallery-group]')?.dataset.galleryGroup, link.dataset.photoId);
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-gallery-open]').forEach(button => {
    button.addEventListener('click', () => open(button, button.dataset.galleryOpen, button.dataset.galleryStart));
  });
  picture.addEventListener('load', () => {
    picture.hidden = false;
    stage.setAttribute('aria-busy', 'false');
    status.textContent = '';
  });
  picture.addEventListener('error', () => {
    stage.setAttribute('aria-busy', 'false');
    status.textContent = 'Chưa tải được ảnh. Bạn thử chuyển ảnh rồi mở lại nhé.';
  });
  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-previous]')?.addEventListener('click', () => showPhoto(current - 1));
  dialog.querySelector('[data-next]')?.addEventListener('click', () => showPhoto(current + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      showPhoto(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  let touch: { x: number; y: number } | undefined;
  stage.addEventListener('touchstart', event => {
    touch = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : undefined;
  }, { passive: true });
  stage.addEventListener('touchend', event => {
    if (touch && event.changedTouches.length === 1) {
      const dx = event.changedTouches[0].clientX - touch.x;
      const dy = event.changedTouches[0].clientY - touch.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) showPhoto(current + (dx < 0 ? 1 : -1));
    }
    touch = undefined;
  }, { passive: true });
  stage.addEventListener('touchcancel', () => { touch = undefined; }, { passive: true });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    opener?.focus({ preventScroll: true });
  });
  new ResizeObserver(updateSizes).observe(stage);
}

type Wish = { id: string; name: string; message: string };
type Reply = { ok: boolean; wishes?: Wish[]; id?: string; error?: string };

const section = document.querySelector<HTMLElement>('[data-wishes]');
if (section) setupWishes(section);

function setupWishes(section: HTMLElement) {
  const form = section.querySelector<HTMLFormElement>('#wish-form')!;
  const fields = section.querySelector<HTMLFieldSetElement>('#wish-fields')!;
  const name = section.querySelector<HTMLInputElement>('#wish-name')!;
  const message = section.querySelector<HTMLTextAreaElement>('#wish-message')!;
  const honey = section.querySelector<HTMLInputElement>('#wish-website')!;
  const status = section.querySelector<HTMLElement>('#wish-status')!;
  const confirmation = section.querySelector<HTMLElement>('[data-send-confirmation]')!;
  const template = section.querySelector<HTMLTemplateElement>('#wish-template')!;
  const board = section.querySelector<HTMLElement>('[data-board]')!;
  const boardState = section.querySelector<HTMLElement>('[data-board-state]')!;
  const hint = section.querySelector<HTMLElement>('#wish-board-hint')!;
  const viewport = section.querySelector<HTMLElement>('[data-wish-window]')!;
  const track = section.querySelector<HTMLElement>('[data-track]')!;
  const original = section.querySelector<HTMLElement>('[data-wish-group="0"]')!;
  const duplicate = section.querySelector<HTMLElement>('[data-wish-group="1"]')!;
  const dialog = section.querySelector<HTMLDialogElement>('[data-wish-dialog]')!;
  const open = section.querySelector<HTMLButtonElement>('[data-open-wish]')!;
  const close = section.querySelector<HTMLButtonElement>('[data-close-wish]')!;
  const submit = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
  const endpoint = section.dataset.endpoint ?? '';
  const configured = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint);
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let client = makeId();
  try {
    const existing = localStorage.getItem('duyanh-wish-client');
    if (existing && /^[\w-]{1,100}$/.test(existing)) client = existing;
    else localStorage.setItem('duyanh-wish-client', client);
  } catch { /* Storage is optional; no guest names or messages are stored locally. */ }
  let pending: { id: string; name: string; message: string } | null = null;
  let wishes: Wish[] = [];
  let loading = false;
  let sending = false;
  let inView = false;
  let held = false;
  let lastRead = 0;
  let oldOverflow = '';

  const updateMotion = () => {
    board.classList.toggle('is-moving', !preference.matches && wishes.length > 1);
    board.classList.toggle('is-in-view', inView && !document.hidden);
    board.classList.toggle('is-held', held);
    board.classList.toggle('is-modal-open', dialog.open);
  };
  const render = (next: Wish[]) => {
    if (JSON.stringify(next) === JSON.stringify(wishes) && original.children.length) return;
    wishes = next;
    const nodes = next.map((wish, index) => {
      const paper = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
      paper.dataset.tone = String(index % 3);
      paper.dataset.wishId = wish.id;
      paper.querySelector('.wish-message')!.textContent = wish.message;
      paper.querySelector('.wish-author')!.textContent = wish.name;
      return paper;
    });
    original.replaceChildren(...nodes);
    duplicate.replaceChildren(...nodes.map(node => node.cloneNode(true)));
    track.style.setProperty('--wish-duration', `${Math.max(next.length, 2) * 9}s`);
    viewport.hidden = !next.length;
    hint.hidden = !next.length;
    updateMotion();
  };
  const request = async (init?: RequestInit): Promise<Reply> => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(endpoint, { ...init, redirect: 'follow', credentials: 'omit', cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Không kết nối được sổ lời chúc. Bạn thử lại nhé.');
      const data = await response.json() as Reply;
      if (typeof data.ok !== 'boolean') throw new Error('Phản hồi chưa hợp lệ. Bạn thử lại nhé.');
      if (!data.ok) throw new Error(data.error || 'Chưa lưu được lời chúc. Bạn thử lại nhé.');
      return data;
    } finally { window.clearTimeout(timeout); }
  };
  const refresh = async () => {
    if (!configured || loading || held) return;
    loading = true;
    try {
      const data = await request();
      if (!Array.isArray(data.wishes)) throw new Error('Chưa đọc được sổ lời chúc.');
      const next = data.wishes.filter((wish): wish is Wish => !!wish && typeof wish.id === 'string'
        && typeof wish.name === 'string' && wish.name.trim().length > 0 && wish.name.length <= 80
        && typeof wish.message === 'string' && wish.message.trim().length > 0 && wish.message.length <= 600).slice(0, 100);
      render(next);
      boardState.textContent = next.length ? '' : 'Hãy là người gửi lời chúc đầu tiên cho chúng mình nhé.';
      lastRead = Date.now();
    } catch {
      boardState.textContent = wishes.length ? 'Chưa cập nhật được lời chúc mới. Sẽ thử lại sau.' : 'Chưa tải được lời chúc. Bạn quay lại sau ít giây nhé.';
    } finally { loading = false; }
  };

  open.disabled = false;
  fields.disabled = !configured;
  if (!configured) {
    viewport.hidden = true;
    hint.hidden = true;
    boardState.textContent = 'Sổ lời chúc đang được kết nối. Bạn quay lại sau nhé.';
    status.textContent = 'Chưa thể gửi lời chúc lúc này. Kết nối lưu lời chúc đang được thiết lập.';
  }
  open.addEventListener('click', () => {
    oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    updateMotion();
    if (!fields.disabled) name.focus();
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = oldOverflow;
    held = false;
    updateMotion();
    open.focus({ preventScroll: true });
  });
  viewport.addEventListener('pointerdown', (event) => {
    if (!(event.target as HTMLElement).closest('.wish-paper')) return;
    held = true;
    viewport.setPointerCapture(event.pointerId);
    updateMotion();
  });
  const release = () => { held = false; updateMotion(); };
  viewport.addEventListener('pointerup', release);
  viewport.addEventListener('pointercancel', release);
  viewport.addEventListener('lostpointercapture', release);
  window.addEventListener('blur', release);
  const validate = () => {
    name.setCustomValidity(name.value.trim() ? '' : 'Bạn điền tên của mình nhé.');
    message.setCustomValidity(message.value.trim() ? '' : 'Bạn viết một lời chúc nhé.');
  };
  name.addEventListener('input', validate);
  message.addEventListener('input', validate);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending || !configured) return;
    validate();
    if (!form.reportValidity()) return;
    const guest = name.value.trim();
    const text = message.value.trim();
    if (!pending || pending.name !== guest || pending.message !== text) pending = { id: makeId(), name: guest, message: text };
    const payload = { ...pending, client, website: honey.value };
    sending = true;
    fields.disabled = true;
    submit.textContent = 'Đang gửi…';
    status.textContent = 'Đang lưu lời chúc của bạn…';
    try {
      const result = await request({ method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      if (result.id !== payload.id) throw new Error('Chưa xác nhận được việc lưu. Bạn thử gửi lại nhé.');
      pending = null;
      form.reset();
      status.textContent = '';
      confirmation.textContent = 'Đã nhận lời chúc của bạn. Duy & Ánh cảm ơn bạn thật nhiều!';
      if (dialog.open) dialog.close();
      await refresh();
    } catch (error) {
      status.textContent = error instanceof Error && error.name !== 'AbortError' && error.message !== 'Failed to fetch'
        ? error.message : 'Chưa xác nhận được việc lưu. Nội dung vẫn được giữ; bạn thử gửi lại nhé.';
      if (!dialog.open) confirmation.textContent = 'Chưa xác nhận được việc gửi. Mở “Nhập lời chúc” để thử lại, nội dung vẫn còn.';
    } finally {
      sending = false;
      fields.disabled = false;
      submit.textContent = 'Gửi lời chúc ↗';
    }
  });
  preference.addEventListener('change', updateMotion);
  document.addEventListener('visibilitychange', () => {
    held = false;
    updateMotion();
    if (!document.hidden && inView && Date.now() - lastRead > 60000) void refresh();
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updateMotion();
      if (inView && Date.now() - lastRead > 60000) void refresh();
    }, { rootMargin: '200px 0px' });
    observer.observe(section);
  } else { inView = true; }
  window.setInterval(() => { if (inView && !document.hidden && !dialog.open) void refresh(); }, 60000);
  updateMotion();
  // Load while guests read the invitation, before they reach the wishes board.
  void refresh();
}

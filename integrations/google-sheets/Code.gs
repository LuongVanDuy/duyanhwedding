// Public API for the wedding guestbook. No edit/delete operation is exposed.
const SPREADSHEET_ID = '1otkW3z6Re67vPh2smb1h22gfoRj5_pdqmtyzR1HmAQo';
const SHEET_ID = 0;
const MAX_ROWS = 5000;

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets().find(s => s.getSheetId() === SHEET_ID);
  if (!sheet) throw new Error('Không tìm thấy bảng lời chúc.');
  const headers = sheet.getRange(1, 1, 1, 6).getValues()[0];
  if (headers.join('|') !== 'Mã|Thời gian|Tên|Lời chúc|Hiển thị|Ghi chú') {
    throw new Error('Bảng lời chúc cần giữ nguyên hàng tiêu đề.');
  }
  return sheet;
}

function rows_(sheet) {
  const count = Math.min(Math.max(sheet.getLastRow() - 1, 0), MAX_ROWS);
  return count ? sheet.getRange(2, 1, count, 6).getValues() : [];
}

function visible_(rows) {
  return rows.filter(row => row[4] === true && String(row[2]).trim() && String(row[3]).trim())
    .slice(-100).reverse().map(row => ({ id: String(row[0]), name: String(row[2]).slice(0, 80), message: String(row[3]).slice(0, 600) }));
}

function doGet() {
  try { return json_({ ok: true, wishes: visible_(rows_(sheet_())) }); }
  catch (error) { return json_({ ok: false, error: 'Chưa tải được lời chúc. Bạn thử lại sau nhé.' }); }
}

function clean_(value, max) {
  if (typeof value !== 'string') return '';
  const text = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (!text || text.length > max) return '';
  return text;
}

function cellText_(value) {
  // Sheets must store guest input as text, never formulas.
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function doPost(event) {
  let lock;
  try {
    if (!event || !event.postData || event.postData.contents.length > 8000) {
      return json_({ ok: false, error: 'Lời chúc không hợp lệ.' });
    }
    const data = JSON.parse(event.postData.contents);
    const name = clean_(data.name, 80);
    const message = clean_(data.message, 600);
    const id = clean_(data.id, 100);
    const client = clean_(data.client, 100);
    if (!name || !message || !id || !client || !/^[a-zA-Z0-9_-]+$/.test(id + client) || data.website) {
      return json_({ ok: false, error: 'Bạn nhập tên và lời chúc hợp lệ nhé (tối đa 80 và 600 ký tự).' });
    }
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return json_({ ok: false, error: 'Đang có nhiều lời chúc. Bạn thử lại sau ít giây nhé.' });
    const sheet = sheet_();
    const rows = rows_(sheet);
    // A retry after a lost response never appends a duplicate or re-publishes a hidden row.
    if (rows.some(row => String(row[0]) === id)) return json_({ ok: true, id: id });
    if (sheet.getLastRow() > MAX_ROWS) return json_({ ok: false, error: 'Sổ lời chúc đang tạm ngừng nhận thêm.' });
    const cache = CacheService.getScriptCache();
    if (cache.get('guest-' + client)) return json_({ ok: false, error: 'Bạn chờ 30 giây trước khi gửi thêm lời chúc nhé.' });
    const hour = 'hour-' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMddHH');
    const count = Number(cache.get(hour) || '0');
    if (count >= 200) return json_({ ok: false, error: 'Sổ lời chúc đang bận. Bạn quay lại sau nhé.' });
    sheet.appendRow([id, Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss'), cellText_(name), cellText_(message), true, '']);
    SpreadsheetApp.flush();
    cache.put('guest-' + client, '1', 30);
    cache.put(hour, String(count + 1), 3600);
    // Formatting failure must not turn an already saved message into a failed submission.
    try {
      const row = sheet.getLastRow();
      sheet.getRange(row, 1, 1, 6).setWrap(true).setVerticalAlignment('top');
      sheet.getRange(row, 5).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
    } catch (ignored) {}
    return json_({ ok: true, id: id });
  } catch (error) {
    return json_({ ok: false, error: 'Chưa xác nhận được việc lưu. Bạn giữ nội dung và thử gửi lại nhé.' });
  } finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}

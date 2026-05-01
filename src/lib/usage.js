// 利用回数の管理。
// localStorage と cookie の両方に書き込むことで、片方が消えても
// もう片方が残るようにしている。完全な防御ではない（プライベート
// ブラウズで回避可）が、サーバーIPレート制限と併用して多層防御。

const DAILY_FREE_LIMIT = 1;
const STORAGE_KEY = 'yarikuri:quota:v1';
const COOKIE_KEY = 'yarikuri_quota';

function todayKey() {
  const d = new Date();
  // JST基準で日付を出す（ローカルタイム）
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(
    new RegExp('(^| )' + name + '=([^;]+)')
  );
  return m ? decodeURIComponent(m[2]) : null;
}

function writeCookie(name, value, days = 2) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 86400 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; expires=${expires}; path=/; SameSite=Lax`;
}

function readRaw() {
  // 優先：localStorage、フォールバック：cookie
  try {
    const ls = localStorage.getItem(STORAGE_KEY);
    if (ls) return JSON.parse(ls);
  } catch {}
  try {
    const ck = readCookie(COOKIE_KEY);
    if (ck) return JSON.parse(ck);
  } catch {}
  return null;
}

function writeRaw(obj) {
  const json = JSON.stringify(obj);
  try {
    localStorage.setItem(STORAGE_KEY, json);
  } catch {}
  writeCookie(COOKIE_KEY, json);
}

function freshState() {
  return { date: todayKey(), freeUsed: 0, rewardedTickets: 0 };
}

export function getQuota() {
  const today = todayKey();
  const raw = readRaw();
  if (!raw || raw.date !== today) {
    const fresh = freshState();
    writeRaw(fresh);
    return fresh;
  }
  return {
    date: raw.date,
    freeUsed: Number(raw.freeUsed) || 0,
    rewardedTickets: Number(raw.rewardedTickets) || 0,
  };
}

export function canSearch() {
  const q = getQuota();
  return q.freeUsed < DAILY_FREE_LIMIT || q.rewardedTickets > 0;
}

export function getStatus() {
  const q = getQuota();
  const freeRemaining = Math.max(0, DAILY_FREE_LIMIT - q.freeUsed);
  return {
    freeRemaining,
    rewardedTickets: q.rewardedTickets,
    totalRemaining: freeRemaining + q.rewardedTickets,
    needsReward: freeRemaining === 0 && q.rewardedTickets === 0,
  };
}

// 検索を1回消費する。優先順：無料 → リワードチケット
export function consumeSearch() {
  const q = getQuota();
  if (q.freeUsed < DAILY_FREE_LIMIT) {
    q.freeUsed += 1;
  } else if (q.rewardedTickets > 0) {
    q.rewardedTickets -= 1;
  } else {
    return false;
  }
  writeRaw(q);
  return true;
}

// リワード広告視聴完了で1回分のチケットを付与
export function grantRewardTicket() {
  const q = getQuota();
  q.rewardedTickets += 1;
  writeRaw(q);
  return q.rewardedTickets;
}

export const FREE_LIMIT = DAILY_FREE_LIMIT;

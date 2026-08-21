// 登録不要の匿名利用者ID。
//
// - localStorage と cookie の両方へ書き、片方が消えても復元できるようにする
//   （usage.js のクォータ保持と同じ多層方式）。
// - 最終利用日から RETENTION_DAYS 経過すると失効し、次のアクセスで新規発行される。
//   使い続けている限りは期限が先送りされる（スライド式）。
// - 個人情報は一切含まず、サーバーへ送信もしない。端末内の識別子。

import { newId } from './id';
import { readCookie, writeCookie } from './cookie';

export const RETENTION_DAYS = 180;
export const USER_ID_STORAGE_KEY = 'yarikuri:uid:v1';
export const USER_ID_COOKIE_KEY = 'yarikuri_uid';

const RETENTION_MS = RETENTION_DAYS * 86400 * 1000;

function readRaw() {
  // 優先：localStorage、フォールバック：cookie
  try {
    const ls = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (ls) return JSON.parse(ls);
  } catch {}
  try {
    const ck = readCookie(USER_ID_COOKIE_KEY);
    if (ck) return JSON.parse(ck);
  } catch {}
  return null;
}

function writeRaw(state) {
  const json = JSON.stringify(state);
  try {
    localStorage.setItem(USER_ID_STORAGE_KEY, json);
  } catch (e) {
    console.error('userId save failed:', e);
  }
  writeCookie(USER_ID_COOKIE_KEY, json, RETENTION_DAYS);
}

// 保存済みレコードが「まだ使える」かどうか。
const isLive = (state, now) =>
  typeof state?.id === 'string' &&
  state.id !== '' &&
  typeof state.lastSeenAt === 'number' &&
  now - state.lastSeenAt <= RETENTION_MS;

const issue = (now) => ({ v: 1, id: `u_${newId()}`, issuedAt: now, lastSeenAt: now });

// 有効なIDがあれば期限を先送りして返し、無ければ発行する。
export function getUserId() {
  const now = Date.now();
  const current = readRaw();
  const next = isLive(current, now) ? { ...current, lastSeenAt: now } : issue(now);
  writeRaw(next);
  return next.id;
}

// 表示用。発行も期限の先送りもしない。
export function peekUserId() {
  const current = readRaw();
  if (!isLive(current, Date.now())) return null;
  return {
    id: current.id,
    issuedAt: current.issuedAt,
    lastSeenAt: current.lastSeenAt,
    expiresAt: current.lastSeenAt + RETENTION_MS,
  };
}

// 現在のIDを破棄して新しいIDを発行する。
export function resetUserId() {
  const next = issue(Date.now());
  writeRaw(next);
  return next.id;
}

// js/menu.js

export const MENU_ITEMS = [
  { id: 'coffee', name: 'ブレンドコーヒー', price: 380 },
  { id: 'latte', name: 'カフェラテ', price: 450 },
  { id: 'tea', name: '紅茶', price: 400 },
  { id: 'cake', name: 'チーズケーキ', price: 520 },
];

export function findMenuItem(id) {
  return MENU_ITEMS.find((item) => item.id === id);
}

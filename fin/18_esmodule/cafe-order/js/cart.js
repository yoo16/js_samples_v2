// js/cart.js
import { findMenuItem } from './menu.js';

export function addItem(cart, itemId) {
  const count = cart[itemId] ?? 0;
  return { ...cart, [itemId]: count + 1 };
}

export function removeItem(cart, itemId) {
  const next = { ...cart };
  delete next[itemId];
  return next;
}

export function calcTotal(cart) {
  return Object.entries(cart).reduce((total, [itemId, count]) => {
    const item = findMenuItem(itemId);
    return total + item.price * count;
  }, 0);
}

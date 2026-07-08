// js/ui.js
import { MENU_ITEMS, findMenuItem } from './menu.js';
import { calcTotal } from './cart.js';

export default function render(elements, cart) {
  renderMenu(elements.menuList);
  renderCart(elements.cartList, cart);
  elements.total.textContent = `${calcTotal(cart).toLocaleString()}円`;
}

function renderMenu(menuList) {
  menuList.innerHTML = MENU_ITEMS.map(
    (item) => `
      <li class="flex justify-between items-center">
        <span class="text-gray-800">
          ${item.name}
          <span class="text-sm text-gray-500">${item.price}円</span>
        </span>
        <button
          data-action="add"
          data-id="${item.id}"
          class="bg-amber-600 hover:bg-amber-700 text-white text-sm px-3 py-1 rounded"
        >
          追加
        </button>
      </li>
    `
  ).join('');
}

function renderCart(cartList, cart) {
  const entries = Object.entries(cart);

  if (entries.length === 0) {
    cartList.innerHTML = `
      <li class="text-gray-400 text-center py-4">注文はまだありません</li>
    `;
    return;
  }

  cartList.innerHTML = entries
    .map(([itemId, count]) => {
      const item = findMenuItem(itemId);
      return `
        <li class="flex justify-between items-center bg-amber-50 rounded-lg px-3 py-2">
          <span class="text-gray-800">${item.name} × ${count}</span>
          <span class="flex items-center gap-3">
            <span class="text-gray-600">${item.price * count}円</span>
            <button
              data-action="remove"
              data-id="${itemId}"
              class="text-red-500 hover:text-red-700 text-sm"
            >
              取消
            </button>
          </span>
        </li>
      `;
    })
    .join('');
}

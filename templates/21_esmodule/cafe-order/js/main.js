// js/main.js
import { addItem, removeItem } from './cart.js';
import render from './ui.js';

const elements = {
  menuList: document.querySelector('#menu-list'),
  cartList: document.querySelector('#cart-list'),
  total: document.querySelector('#total'),
};

let cart = {};

function update(nextCart) {
  cart = nextCart;
  render(elements, cart);
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }

  const { action, id } = button.dataset;
  if (action === 'add') {
    update(addItem(cart, id));
  }
  if (action === 'remove') {
    update(removeItem(cart, id));
  }
});

render(elements, cart);

export type CartItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  seller: {
    id: string;
    name: string;
  };
};

export const CART_STORAGE_KEY = "printforge_cart";
export const CART_CHANGED_EVENT = "printforge-cart-changed";

export function readCart() {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}

export function addToCart(item: CartItem) {
  const items = readCart();
  if (items.some((existing) => existing.id === item.id)) {
    return { items, added: false };
  }

  const nextItems = [...items, item];
  writeCart(nextItems);
  return { items: nextItems, added: true };
}

export function removeFromCart(id: string) {
  const nextItems = readCart().filter((item) => item.id !== id);
  writeCart(nextItems);
  return nextItems;
}

export function clearCart() {
  writeCart([]);
}

export type CartItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  quantity: number;
  seller: {
    id: string;
    name: string;
  };
};

export const CART_STORAGE_KEY = "printforge_cart";
export const CART_CHANGED_EVENT = "printforge-cart-changed";

function normalizeCartItem(item: Partial<CartItem>): CartItem | null {
  if (!item.id || !item.name || typeof item.price !== "number" || !item.seller?.id || !item.seller?.name) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    description: item.description || "",
    price: item.price,
    imageUrl: item.imageUrl || "",
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    seller: item.seller,
  };
}

export function readCart() {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeCartItem).filter(Boolean) as CartItem[] : [];
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
  const existing = items.find((cartItem) => cartItem.id === item.id);

  if (existing) {
    const nextItems = items.map((cartItem) =>
      cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + Math.max(1, item.quantity || 1) } : cartItem,
    );
    writeCart(nextItems);
    return { items: nextItems, added: false };
  }

  const nextItems = [...items, { ...item, quantity: Math.max(1, item.quantity || 1) }];
  writeCart(nextItems);
  return { items: nextItems, added: true };
}

export function setCartItemQuantity(id: string, quantity: number) {
  const nextQuantity = Math.max(1, Math.floor(quantity));
  const nextItems = readCart().map((item) => (item.id === id ? { ...item, quantity: nextQuantity } : item));
  writeCart(nextItems);
  return nextItems;
}

export function getCartItemCount() {
  return readCart().reduce((sum, item) => sum + item.quantity, 0);
}

export function removeFromCart(id: string) {
  const nextItems = readCart().filter((item) => item.id !== id);
  writeCart(nextItems);
  return nextItems;
}

export function clearCart() {
  writeCart([]);
}

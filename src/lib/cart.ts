import { useEffect, useState, useCallback, useSyncExternalStore } from "react";

export interface CartItem {
  productId: string;
  name: string;
  priceCents: number;
  currency: string;
  size?: string;
  image?: string;
  quantity: number;
}

const KEY = "kb.cart.v1";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("kb-cart-change"));
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("kb-cart-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("kb-cart-change", handler);
    window.removeEventListener("storage", handler);
  };
}

export function useCart() {
  const items = useSyncExternalStore(subscribe, read, () => []);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  const add = useCallback((item: CartItem) => {
    const current = read();
    const existing = current.find(
      (i) => i.productId === item.productId && i.size === item.size,
    );
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      current.push(item);
    }
    write(current);
  }, []);

  const remove = useCallback((productId: string, size?: string) => {
    write(read().filter((i) => !(i.productId === productId && i.size === size)));
  }, []);

  const updateQty = useCallback((productId: string, size: string | undefined, qty: number) => {
    const next = read()
      .map((i) => (i.productId === productId && i.size === size ? { ...i, quantity: qty } : i))
      .filter((i) => i.quantity > 0);
    write(next);
  }, []);

  const clear = useCallback(() => write([]), []);

  const subtotal = items.reduce((s, i) => s + i.priceCents * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return { items: hydrated ? items : [], add, remove, updateQty, clear, subtotal, count, hydrated };
}

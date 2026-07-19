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

function readFromLocalStorage(): CartItem[] {
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

let cachedCart: CartItem[] = [];

if (typeof window !== "undefined") {
  cachedCart = readFromLocalStorage();
}

function getSnapshot(): CartItem[] {
  return cachedCart;
}

function write(items: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  cachedCart = items;
  window.dispatchEvent(new Event("kb-cart-change"));
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    const latest = readFromLocalStorage();
    if (JSON.stringify(cachedCart) !== JSON.stringify(latest)) {
      cachedCart = latest;
    }
    cb();
  };
  window.addEventListener("kb-cart-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("kb-cart-change", handler);
    window.removeEventListener("storage", handler);
  };
}

const EMPTY_ARRAY: CartItem[] = [];

export function useCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_ARRAY);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const add = useCallback((item: CartItem) => {
    const current = [...getSnapshot()];
    const existing = current.find((i) => i.productId === item.productId && i.size === item.size);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      current.push(item);
    }
    write(current);
  }, []);

  const remove = useCallback((productId: string, size?: string) => {
    write(getSnapshot().filter((i) => !(i.productId === productId && i.size === size)));
  }, []);

  const updateQty = useCallback((productId: string, size: string | undefined, qty: number) => {
    const next = getSnapshot()
      .map((i) => (i.productId === productId && i.size === size ? { ...i, quantity: qty } : i))
      .filter((i) => i.quantity > 0);
    write(next);
  }, []);

  const clear = useCallback(() => write([]), []);

  const subtotal = items.reduce((s, i) => s + i.priceCents * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return { items: hydrated ? items : [], add, remove, updateQty, clear, subtotal, count, hydrated };
}

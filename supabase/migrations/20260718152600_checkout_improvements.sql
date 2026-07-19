-- Drop old stock decrement trigger on payment to avoid double-decrement
drop trigger if exists decrement_stock_after_payment on public.orders;

-- Drop own orders read policy and replace it with a UUID-based public read policy
drop policy if exists "own orders read" on public.orders;
create policy "allow select order by id" on public.orders for select using (auth.uid() = user_id or user_id is null or public.is_admin(auth.uid()));

-- Create atomic place_order_atomic function to check and decrement stock in a transaction
create or replace function public.place_order_atomic(
  _customer_name text,
  _customer_email text,
  _customer_phone text,
  _shipping_address text,
  _shipping_city text,
  _shipping_postal text,
  _shipping_country text,
  _items jsonb,
  _subtotal_cents int,
  _total_cents int,
  _currency text,
  _notes text,
  _user_id uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  item jsonb;
  prod_id uuid;
  qty_ordered int;
  available_qty int;
  prod_name text;
  new_order_id uuid;
begin
  -- Loop through items to validate stock
  for item in select * from jsonb_array_elements(_items) loop
    prod_id := (item->>'productId')::uuid;
    qty_ordered := (item->>'quantity')::int;
    
    -- Select for update to lock product row and prevent race conditions
    select name, quantity into prod_name, available_qty
    from public.products
    where id = prod_id
    for update;
    
    if not found then
      raise exception 'Product not found: %', prod_id;
    end if;
    
    if available_qty < qty_ordered then
      raise exception 'Insufficient stock for %. Only % available.', prod_name, available_qty;
    end if;
  end loop;

  -- Loop again to decrement stock
  for item in select * from jsonb_array_elements(_items) loop
    prod_id := (item->>'productId')::uuid;
    qty_ordered := (item->>'quantity')::int;
    
    update public.products
    set quantity = quantity - qty_ordered
    where id = prod_id;
  end loop;

  -- Insert the order
  insert into public.orders (
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    shipping_city,
    shipping_postal,
    shipping_country,
    items,
    subtotal_cents,
    total_cents,
    currency,
    notes,
    status,
    user_id
  ) values (
    _customer_name,
    _customer_email,
    _customer_phone,
    _shipping_address,
    _shipping_city,
    _shipping_postal,
    _shipping_country,
    _items,
    _subtotal_cents,
    _total_cents,
    _currency,
    _notes,
    'pending',
    _user_id
  )
  returning id into new_order_id;

  return new_order_id;
end;
$$;

-- Grant execute to public roles
grant execute on function public.place_order_atomic(text, text, text, text, text, text, text, jsonb, int, int, text, text, uuid) to anon, authenticated;

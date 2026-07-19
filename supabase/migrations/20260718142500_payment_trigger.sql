-- Add payment_intent_id to orders to map Stripe payment intent / session id
alter table public.orders add column if not exists payment_intent_id text;

-- Create function to decrement product stock when order status becomes 'paid'
create or replace function public.decrement_stock_on_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  prod_id uuid;
  qty_ordered int;
begin
  -- Check if status is transitioning to 'paid'
  if (NEW.status = 'paid' and (OLD.status is null or OLD.status = 'pending')) then
    for item in select * from jsonb_array_elements(NEW.items) loop
      prod_id := (item->>'productId')::uuid;
      qty_ordered := (item->>'quantity')::int;
      
      -- Update product quantity, ensuring we don't go below 0
      update public.products
      set quantity = greatest(0, quantity - qty_ordered)
      where id = prod_id;
    end loop;
  end if;
  return NEW;
end;
$$;

-- Create trigger on orders table
drop trigger if exists decrement_stock_after_payment on public.orders;
create trigger decrement_stock_after_payment
after update of status on public.orders
for each row
execute function public.decrement_stock_on_payment();

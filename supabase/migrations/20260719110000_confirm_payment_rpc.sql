create or replace function public.confirm_order_payment(
  _order_id uuid,
  _payment_intent_id text
)
returns text -- returns 'paid', 'already_paid', or 'not_found'
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
begin
  select status into current_status
  from public.orders
  where id = _order_id;
  
  if not found then
    return 'not_found';
  end if;
  
  if current_status = 'paid' then
    return 'already_paid';
  end if;
  
  update public.orders
  set status = 'paid',
      payment_intent_id = _payment_intent_id
  where id = _order_id;
  
  return 'paid';
end;
$$;

grant execute on function public.confirm_order_payment(uuid, text) to anon, authenticated;

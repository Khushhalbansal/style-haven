create or replace function public.get_order_details_for_notification(_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  order_rec record;
  settings_rec record;
begin
  select * into order_rec from public.orders where id = _order_id;
  if not found then
    return null;
  end if;
  
  select * into settings_rec from public.site_settings where id = 1;
  
  return jsonb_build_object(
    'order', to_jsonb(order_rec),
    'settings', to_jsonb(settings_rec)
  );
end;
$$;

grant execute on function public.get_order_details_for_notification(uuid) to anon, authenticated;

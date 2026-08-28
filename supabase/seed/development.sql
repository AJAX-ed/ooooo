-- Development-only seed. Run explicitly against a local Supabase instance.
-- Never run this file against production.
do $$
begin
  if current_setting('app.environment', true) is distinct from 'development' then
    raise exception 'Refusing development seed: set app.environment to development explicitly';
  end if;
end;
$$;

insert into public.event_config (event_name, event_date, venue, is_active)
values ('CYSCOM x FYI Development Event', current_date + 30, 'Development Venue', true)
on conflict do nothing;

insert into public.participants (registration_number, full_name, email, qr_token_hash)
select
  'DEV-' || lpad(number::text, 4, '0'),
  'Development Participant ' || number,
  'participant-' || number || '@example.test',
  encode(digest('development-qr-token-' || number, 'sha256'), 'hex')
from generate_series(1, 500) as numbers(number)
on conflict (registration_number) do nothing;
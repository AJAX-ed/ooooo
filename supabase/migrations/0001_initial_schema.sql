create extension if not exists pgcrypto;

create table public.event_config (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (length(trim(event_name)) between 1 and 200),
  event_date date,
  venue text check (venue is null or length(trim(venue)) <= 300),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index event_config_one_active_idx on public.event_config (is_active) where is_active;

create table public.volunteers (
  id uuid primary key references auth.users(id) on delete restrict,
  email text not null unique check (length(trim(email)) between 3 and 320),
  name text not null check (length(trim(name)) between 1 and 200),
  role text not null check (role in ('ADMIN', 'VOLUNTEER')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  registration_number text not null unique check (length(trim(registration_number)) between 1 and 100),
  full_name text not null check (length(trim(full_name)) between 1 and 200),
  email text not null check (length(trim(email)) between 3 and 320),
  qr_token_hash text not null unique check (length(qr_token_hash) between 32 and 256),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  team_number integer not null unique check (team_number > 0),
  team_name text not null check (length(trim(team_name)) between 1 and 120),
  created_by uuid not null references public.volunteers(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete restrict,
  added_by uuid not null references public.volunteers(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (team_id, participant_id)
);

create unique index team_members_one_team_per_participant_idx on public.team_members (participant_id);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete restrict,
  checkpoint integer not null check (checkpoint in (1, 2, 3)),
  recorded_by uuid not null references public.volunteers(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  device_id text not null check (length(trim(device_id)) between 1 and 200),
  created_at timestamptz not null default now(),
  unique (participant_id, checkpoint)
);

create table public.sync_operations (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null unique,
  device_id text not null check (length(trim(device_id)) between 1 and 200),
  volunteer_id uuid not null references public.volunteers(id) on delete restrict,
  operation_type text not null check (operation_type in ('CREATE_TEAM', 'ADD_TEAM_MEMBER', 'RECORD_ATTENDANCE')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPLIED', 'CONFLICT', 'FAILED')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.volunteers(id) on delete set null,
  action text not null check (length(trim(action)) between 1 and 100),
  target_type text not null check (length(trim(target_type)) between 1 and 100),
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.pass_deliveries (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references public.participants(id) on delete cascade,
  email text not null check (length(trim(email)) between 3 and 320),
  status text not null default 'PENDING' check (status in ('PENDING', 'SENT', 'FAILED')),
  provider_message_id text,
  attempts integer not null default 0 check (attempts >= 0),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index participants_registration_number_idx on public.participants (registration_number);
create index participants_qr_token_hash_idx on public.participants (qr_token_hash);
create index participants_email_idx on public.participants (lower(email));
create index teams_created_by_idx on public.teams (created_by);
create index team_members_team_id_idx on public.team_members (team_id);
create index team_members_participant_id_idx on public.team_members (participant_id);
create index attendance_participant_checkpoint_idx on public.attendance (participant_id, checkpoint);
create index attendance_checkpoint_idx on public.attendance (checkpoint);
create index sync_operations_status_created_at_idx on public.sync_operations (status, created_at);
create index sync_operations_volunteer_id_idx on public.sync_operations (volunteer_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index pass_deliveries_status_idx on public.pass_deliveries (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger event_config_set_updated_at before update on public.event_config for each row execute function public.set_updated_at();
create trigger volunteers_set_updated_at before update on public.volunteers for each row execute function public.set_updated_at();
create trigger participants_set_updated_at before update on public.participants for each row execute function public.set_updated_at();
create trigger teams_set_updated_at before update on public.teams for each row execute function public.set_updated_at();
create trigger pass_deliveries_set_updated_at before update on public.pass_deliveries for each row execute function public.set_updated_at();
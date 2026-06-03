-- User preferences table
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_pair text default 'XAUUSD',
  active_timeframe text default '1H',
  indicators jsonb default '{}',
  watchlist jsonb default '[]',
  custom_ai_instructions text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_preferences enable row level security;

create policy "Users can manage their own preferences"
  on public.user_preferences
  for all
  using (auth.uid() = user_id);

-- Trade signals table
create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  currency_pair text not null,
  timeframe text not null,
  direction text,
  entry_zone text,
  stop_loss text,
  take_profit text,
  risk_reward_ratio text,
  confidence integer,
  confluence_factors jsonb default '[]',
  reasoning text,
  risk_warning text,
  created_at timestamptz default now()
);

alter table public.signals enable row level security;

create policy "Users can manage their own signals"
  on public.signals
  for all
  using (auth.uid() = user_id);

create index if not exists idx_signals_user_id on public.signals(user_id);
create index if not exists idx_signals_created_at on public.signals(created_at desc);

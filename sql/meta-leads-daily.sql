create table public.moises_meta_leads_daily (
workspace_id uuid not null references public.moises_workspaces(id),
record_date date not null,
leads integer not null check(leads >= 0),
meta_spend numeric(14,2) not null check(meta_spend >= 0),
account_ids text[] not null,
synced_at timestamptz not null,
is_partial boolean not null default false,
source text not null default 'meta_messaging_conversation_started_7d' check(source='meta_messaging_conversation_started_7d'),
primary key(workspace_id,record_date),
check(cardinality(account_ids)>0));
alter table public.moises_meta_leads_daily enable row level security;
revoke all on public.moises_meta_leads_daily from anon,authenticated;
grant select on public.moises_meta_leads_daily to authenticated;
create policy "Members read Meta leads for their operations" on public.moises_meta_leads_daily for select to authenticated using (exists (select 1 from public.moises_workspace_members m where m.workspace_id=moises_meta_leads_daily.workspace_id and m.user_id=(select auth.uid())));
comment on table public.moises_meta_leads_daily is 'Automatic Meta conversations, separate from manual sales and media history. Jaragua includes Escritorio SC and Joinville. Writes use connected management integration only.';

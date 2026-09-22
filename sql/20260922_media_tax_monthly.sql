-- Impostos de anúncios por loja e mês. Os registros diários de mídia permanecem intactos.
create table if not exists public.moises_media_tax_monthly (
  workspace_id uuid not null references public.moises_workspaces(id) on delete cascade,
  month date not null,
  media_excludes_tax boolean not null default false,
  estimated_rate numeric(8,4),
  actual_tax numeric(14,2),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, month),
  constraint tax_month_starts_on_first check (extract(day from month) = 1),
  constraint tax_rate_valid check (estimated_rate between 0 and 100),
  constraint tax_amount_valid check (actual_tax >= 0),
  constraint tax_requires_separate_media check (
    media_excludes_tax or (estimated_rate is null and actual_tax is null)
  )
);

alter table public.moises_media_tax_monthly enable row level security;
revoke all on public.moises_media_tax_monthly from anon;
grant select, insert, update on public.moises_media_tax_monthly to authenticated;

create policy "Members read monthly media taxes"
  on public.moises_media_tax_monthly for select to authenticated
  using (exists (
    select 1 from public.moises_workspace_members m
    where m.workspace_id = moises_media_tax_monthly.workspace_id
      and m.user_id = (select auth.uid())
      and m.role in ('admin', 'viewer')
  ));

create policy "Admins insert monthly media taxes"
  on public.moises_media_tax_monthly for insert to authenticated
  with check (exists (
    select 1 from public.moises_workspace_members m
    where m.workspace_id = moises_media_tax_monthly.workspace_id
      and m.user_id = (select auth.uid()) and m.role = 'admin'
  ));

create policy "Admins update monthly media taxes"
  on public.moises_media_tax_monthly for update to authenticated
  using (exists (
    select 1 from public.moises_workspace_members m
    where m.workspace_id = moises_media_tax_monthly.workspace_id
      and m.user_id = (select auth.uid()) and m.role = 'admin'
  ))
  with check (exists (
    select 1 from public.moises_workspace_members m
    where m.workspace_id = moises_media_tax_monthly.workspace_id
      and m.user_id = (select auth.uid()) and m.role = 'admin'
  ));

create table if not exists public.escrow_installments (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  escrow_record_id uuid null references public.escrow_records(id) on delete set null,
  installment_number integer not null,
  schedule_label text not null,
  trigger_event text null,
  scheduled_pct numeric(5,2) not null default 0,
  scheduled_amount numeric(15,2) not null default 0,
  currency text not null default 'USD',
  status text not null default 'PENDING' check (status in ('PENDING','FUNDED','RELEASED','CANCELLED')),
  funded_by_role text null check (funded_by_role in ('CU','FC')),
  bank_name text null,
  bank_branch text null,
  bank_address text null,
  account_number_masked text null,
  ifsc_swift_code text null,
  deposit_amount numeric(15,2) null,
  deposit_date date null,
  deposit_reference text null,
  proof_document_url text null,
  proof_file_name text null,
  proof_uploaded_at timestamptz null,
  fc_notes text null,
  funded_at timestamptz null,
  funded_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz null,
  created_by uuid null references auth.users(id),
  updated_by uuid null references auth.users(id),
  constraint uq_escrow_installment unique (challenge_id, installment_number),
  constraint chk_escrow_installments_number_positive check (installment_number > 0),
  constraint chk_escrow_installments_scheduled_pct_nonnegative check (scheduled_pct >= 0),
  constraint chk_escrow_installments_scheduled_amount_nonnegative check (scheduled_amount >= 0),
  constraint chk_escrow_installments_deposit_amount_nonnegative check (deposit_amount is null or deposit_amount >= 0)
);

create index if not exists idx_escrow_installments_challenge on public.escrow_installments(challenge_id);
create index if not exists idx_escrow_installments_status on public.escrow_installments(challenge_id, status);
create index if not exists idx_escrow_installments_role on public.escrow_installments(challenge_id, funded_by_role);

alter table public.escrow_installments enable row level security;

drop policy if exists "Challenge members can view escrow installments" on public.escrow_installments;
create policy "Challenge members can view escrow installments"
on public.escrow_installments
for select
to authenticated
using (
  public.has_active_challenge_role(challenge_id, auth.uid())
  or exists (
    select 1
    from public.user_challenge_roles ucr
    where ucr.challenge_id = escrow_installments.challenge_id
      and ucr.user_id = auth.uid()
      and ucr.role_code = 'CR'
      and ucr.is_active = true
  )
);

drop policy if exists "Curators and FC can create escrow installments" on public.escrow_installments;
create policy "Curators and FC can create escrow installments"
on public.escrow_installments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_challenge_roles ucr
    where ucr.challenge_id = escrow_installments.challenge_id
      and ucr.user_id = auth.uid()
      and ucr.role_code in ('CU','FC')
      and ucr.is_active = true
  )
);

drop policy if exists "Curators and FC can update escrow installments" on public.escrow_installments;
create policy "Curators and FC can update escrow installments"
on public.escrow_installments
for update
to authenticated
using (
  exists (
    select 1
    from public.user_challenge_roles ucr
    where ucr.challenge_id = escrow_installments.challenge_id
      and ucr.user_id = auth.uid()
      and ucr.role_code in ('CU','FC')
      and ucr.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.user_challenge_roles ucr
    where ucr.challenge_id = escrow_installments.challenge_id
      and ucr.user_id = auth.uid()
      and ucr.role_code in ('CU','FC')
      and ucr.is_active = true
  )
);

create or replace function public.challenge_escrow_installments_funded(p_challenge_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1
      from public.escrow_installments ei
      where ei.challenge_id = p_challenge_id
    ) then not exists (
      select 1
      from public.escrow_installments ei
      where ei.challenge_id = p_challenge_id
        and ei.status <> 'FUNDED'
    )
    else exists (
      select 1
      from public.escrow_records er
      where er.challenge_id = p_challenge_id
        and er.escrow_status = 'FUNDED'
    )
  end;
$$;

create or replace function public.sync_escrow_record_from_installments(p_challenge_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_scheduled numeric(15,2) := 0;
  v_total_funded numeric(15,2) := 0;
  v_currency text := 'USD';
  v_status text := 'PENDING';
  v_existing_id uuid;
begin
  select
    coalesce(sum(ei.scheduled_amount), 0),
    coalesce(sum(case when ei.status = 'FUNDED' then coalesce(ei.deposit_amount, ei.scheduled_amount) else 0 end), 0),
    coalesce(max(ei.currency), 'USD')
  into v_total_scheduled, v_total_funded, v_currency
  from public.escrow_installments ei
  where ei.challenge_id = p_challenge_id;

  if v_total_funded = 0 then
    v_status := 'PENDING';
  elsif v_total_funded < v_total_scheduled then
    v_status := 'PARTIALLY_FUNDED';
  else
    v_status := 'FUNDED';
  end if;

  select er.id into v_existing_id
  from public.escrow_records er
  where er.challenge_id = p_challenge_id
  limit 1;

  if v_existing_id is null then
    insert into public.escrow_records (
      challenge_id,
      escrow_status,
      deposit_amount,
      released_amount,
      remaining_amount,
      rejection_fee_percentage,
      transaction_log,
      currency,
      created_by,
      updated_by
    ) values (
      p_challenge_id,
      v_status,
      v_total_funded,
      0,
      greatest(v_total_scheduled - v_total_funded, 0),
      0,
      '[]'::jsonb,
      v_currency,
      p_user_id,
      p_user_id
    )
    returning id into v_existing_id;
  else
    update public.escrow_records
       set escrow_status = v_status,
           deposit_amount = v_total_funded,
           remaining_amount = greatest(v_total_scheduled - v_total_funded, 0),
           currency = coalesce(v_currency, currency),
           updated_at = now(),
           updated_by = p_user_id
     where id = v_existing_id;
  end if;

  update public.escrow_installments
     set escrow_record_id = v_existing_id
   where challenge_id = p_challenge_id
     and escrow_record_id is distinct from v_existing_id;
end;
$$;

create or replace function public.complete_curator_compliance(p_challenge_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_challenge          record;
  v_governance         text;
  v_creator_required   boolean;
  v_complete_result    jsonb;
  v_request_result     jsonb;
begin
  select id, current_phase, governance_profile, governance_mode_override, operating_model,
         extended_brief, cu_compliance_mode, lc_compliance_complete,
         fc_compliance_complete, creator_approval_status, created_by
  into v_challenge
  from public.challenges
  where id = p_challenge_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Challenge not found');
  end if;

  if not exists (
    select 1 from public.user_challenge_roles
    where challenge_id = p_challenge_id and user_id = p_user_id
      and role_code = 'CU' and is_active = true
  ) then
    return jsonb_build_object('success', false, 'error', 'Only the assigned Curator can complete compliance');
  end if;

  v_governance := coalesce(v_challenge.governance_mode_override, v_challenge.governance_profile, 'STRUCTURED');
  if v_governance = 'LIGHTWEIGHT' then v_governance := 'QUICK'; end if;
  if v_governance = 'ENTERPRISE' then v_governance := 'CONTROLLED'; end if;

  if v_governance <> 'STRUCTURED' then
    return jsonb_build_object('success', false,
      'error', 'complete_curator_compliance is only valid for STRUCTURED governance');
  end if;

  if not coalesce(v_challenge.cu_compliance_mode, false) then
    return jsonb_build_object('success', false,
      'error', 'Curator compliance mode not enabled — call send_to_legal_review first');
  end if;

  if not public.challenge_escrow_installments_funded(p_challenge_id) then
    return jsonb_build_object('success', false, 'error', 'All escrow installments must be funded before Curator compliance can be completed');
  end if;

  perform public.sync_escrow_record_from_installments(p_challenge_id, p_user_id);

  if v_challenge.lc_compliance_complete = true
     and v_challenge.fc_compliance_complete = true
     and v_challenge.creator_approval_status in ('pending', 'approved') then
    return jsonb_build_object('success', true, 'already_completed', true);
  end if;

  update public.challenges
     set lc_compliance_complete = true,
         fc_compliance_complete = true,
         updated_at = now(),
         updated_by = p_user_id
   where id = p_challenge_id;

  v_creator_required := coalesce(
    (v_challenge.extended_brief ->> 'creator_approval_required')::boolean,
    false
  );

  if v_creator_required then
    begin
      v_request_result := public.request_creator_approval(p_challenge_id, p_user_id);
    exception when others then
      return jsonb_build_object('success', false,
        'error', 'request_creator_approval failed: ' || sqlerrm);
    end;

    insert into public.audit_trail (challenge_id, user_id, action, method, details, created_by)
    values (p_challenge_id, p_user_id, 'CURATOR_COMPLIANCE_COMPLETE', 'rpc',
      jsonb_build_object('next', 'creator_approval_pending'), p_user_id);

    return jsonb_build_object('success', true, 'awaiting', 'creator_approval', 'detail', v_request_result);
  else
    begin
      v_complete_result := public.complete_phase(p_challenge_id, p_user_id);
    exception when others then
      return jsonb_build_object('success', false,
        'error', 'complete_phase failed: ' || sqlerrm);
    end;

    insert into public.audit_trail (challenge_id, user_id, action, method, details, created_by)
    values (p_challenge_id, p_user_id, 'CURATOR_COMPLIANCE_COMPLETE', 'rpc',
      jsonb_build_object('next', 'publication', 'complete_phase', v_complete_result), p_user_id);

    return jsonb_build_object('success', true, 'awaiting', 'publication', 'detail', v_complete_result);
  end if;
end;
$function$;

create or replace function public.complete_financial_review(p_challenge_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_challenge   record;
  v_governance  text;
  v_curator_id  uuid;
begin
  select id, current_phase, governance_profile, governance_mode_override, operating_model,
         lc_compliance_complete, fc_compliance_complete, creator_approval_status
  into v_challenge
  from public.challenges
  where id = p_challenge_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Challenge not found');
  end if;

  if not exists (
    select 1 from public.user_challenge_roles
    where challenge_id = p_challenge_id and user_id = p_user_id
      and role_code = 'FC' and is_active = true
  ) then
    return jsonb_build_object('success', false, 'error', 'Only the assigned Financial Counsel can complete financial review');
  end if;

  v_governance := coalesce(v_challenge.governance_mode_override, v_challenge.governance_profile, 'STRUCTURED');
  if v_governance = 'ENTERPRISE' then v_governance := 'CONTROLLED'; end if;
  if v_governance = 'LIGHTWEIGHT' then v_governance := 'QUICK'; end if;

  if v_governance <> 'CONTROLLED' then
    raise exception 'complete_financial_review is only valid for CONTROLLED governance (got %)', v_governance;
  end if;

  if not public.challenge_escrow_installments_funded(p_challenge_id) then
    return jsonb_build_object('success', false, 'error', 'All escrow installments must be funded before financial review can be completed');
  end if;

  perform public.sync_escrow_record_from_installments(p_challenge_id, p_user_id);

  update public.challenges
     set fc_compliance_complete = true,
         updated_at = now(),
         updated_by = p_user_id
   where id = p_challenge_id;

  if v_challenge.lc_compliance_complete = true then
    update public.challenges
       set creator_approval_status = 'pending_curator_review',
           phase_status = 'AWAITING_CURATOR_PACK_REVIEW',
           updated_at = now(),
           updated_by = p_user_id
     where id = p_challenge_id;

    select user_id into v_curator_id
    from public.user_challenge_roles
    where challenge_id = p_challenge_id and role_code = 'CU' and is_active = true
    limit 1;

    if v_curator_id is not null then
      insert into public.notifications (user_id, type, title, message, deep_link, metadata, created_by)
      values (
        v_curator_id, 'PACK_READY_FOR_REVIEW',
        'Pack ready for your review',
        'Legal and Financial reviews are complete. Review and forward the pack to the Creator.',
        '/cogni/curation/' || p_challenge_id,
        jsonb_build_object('challenge_id', p_challenge_id),
        p_user_id
      );
    end if;

    insert into public.audit_trail (challenge_id, user_id, action, method, details, created_by)
    values (p_challenge_id, p_user_id, 'FINANCIAL_REVIEW_COMPLETE', 'rpc',
      jsonb_build_object('pack_ready', true), p_user_id);

    return jsonb_build_object('success', true, 'awaiting', 'curator_pack_review');
  end if;

  insert into public.audit_trail (challenge_id, user_id, action, method, details, created_by)
  values (p_challenge_id, p_user_id, 'FINANCIAL_REVIEW_COMPLETE', 'rpc',
    jsonb_build_object('awaiting_lc', true), p_user_id);

  return jsonb_build_object('success', true, 'awaiting', 'legal_compliance');
end;
$function$;
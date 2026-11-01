# Project rules

- Every business-rule number lives in `md_mpa_config` (the settings register) and is changed only through the `update_config_param` RPC (Supervisor only, mandatory reason, audited); never hard-code such values — one controlled, audited source keeps the product configurable per CFG-001.
- Challenge-governing settings are copied onto `challenges.config_snapshot` at insert; rules for an existing challenge read the snapshot, not the live register — later setting changes must not alter running challenges.

- Challenge `status` and `current_phase` change only inside server steps (complete_phase, award RPCs); a guard trigger refuses client writes and derives status from phase via `fn_status_for_phase` — one place enforces the ST-24 map and step owners.
- Award decisions go recommend → confirm (different person) or countersign (Senior Admin/Supervisor) through `recommend_award`/`confirm_award`/`return_award`/`countersign_award`; status sets and allowed moves live in `md_status_sets`/`md_status_transitions` — rules stay data-driven and auditable.

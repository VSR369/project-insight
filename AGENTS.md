# Project rules

- Every business-rule number lives in `md_mpa_config` (the settings register) and is changed only through the `update_config_param` RPC (Supervisor only, mandatory reason, audited); never hard-code such values — one controlled, audited source keeps the product configurable per CFG-001.
- Challenge-governing settings are copied onto `challenges.config_snapshot` at insert; rules for an existing challenge read the snapshot, not the live register — later setting changes must not alter running challenges.

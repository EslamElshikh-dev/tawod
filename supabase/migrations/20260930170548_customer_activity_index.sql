-- Keep opportunity deletion and history lookup efficient.
create index tawod_activity_outcome on tawod_crm.activity(outcome_id);

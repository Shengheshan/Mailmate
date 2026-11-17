CREATE TABLE IF NOT EXISTS telemetry_events (
  event_id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  received_at_ms INTEGER NOT NULL,
  app_version TEXT,
  language TEXT,
  model TEXT,
  latency_ms INTEGER,
  http_status INTEGER,
  provider_code TEXT,
  provider_type TEXT,
  provider_message TEXT,
  provider_request_id TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  response_chars INTEGER,
  failure_stage TEXT,
  failure_class TEXT,
  scanned_count INTEGER,
  analyzed_count INTEGER,
  cache_hit_count INTEGER,
  skipped_count INTEGER,
  failed_count INTEGER,
  stopped INTEGER,
  action_total INTEGER,
  action_completed INTEGER
);
CREATE INDEX IF NOT EXISTS idx_events_type_time ON telemetry_events(event_type, received_at_ms);
CREATE INDEX IF NOT EXISTS idx_events_installation_time ON telemetry_events(installation_id, received_at_ms);
CREATE TABLE IF NOT EXISTS installations (
  installation_id TEXT PRIMARY KEY,
  first_seen_at_ms INTEGER NOT NULL,
  last_seen_at_ms INTEGER NOT NULL,
  app_version TEXT,
  last_action_total INTEGER,
  last_action_completed INTEGER
);
CREATE INDEX IF NOT EXISTS idx_installations_last_seen ON installations(last_seen_at_ms);
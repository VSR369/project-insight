-- Extend challenge_attachments: URL support + solver sharing + display metadata
ALTER TABLE challenge_attachments
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'file',
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS url_title TEXT,
  ADD COLUMN IF NOT EXISTS shared_with_solver BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Make file-only columns nullable for URL rows
ALTER TABLE challenge_attachments
  ALTER COLUMN storage_path DROP NOT NULL,
  ALTER COLUMN mime_type DROP NOT NULL,
  ALTER COLUMN file_name DROP NOT NULL;

-- Constraints
ALTER TABLE challenge_attachments
  ADD CONSTRAINT chk_attachment_source_type CHECK (source_type IN ('file', 'url')),
  ADD CONSTRAINT chk_attachment_file_path CHECK (source_type != 'file' OR storage_path IS NOT NULL),
  ADD CONSTRAINT chk_attachment_url CHECK (source_type != 'url' OR source_url IS NOT NULL);

COMMENT ON COLUMN challenge_attachments.source_type IS 'file = uploaded document, url = web link for AI to fetch and read';
COMMENT ON COLUMN challenge_attachments.source_url IS 'URL to fetch content from (when source_type = url)';
COMMENT ON COLUMN challenge_attachments.url_title IS 'Page title (auto-populated from HTML title tag or curator-entered)';
COMMENT ON COLUMN challenge_attachments.shared_with_solver IS 'If true, visible to solvers as reference doc when published. Default: false (AI-only).';
COMMENT ON COLUMN challenge_attachments.display_name IS 'Solver-facing name. Falls back to file_name or url_title.';
COMMENT ON COLUMN challenge_attachments.description IS 'Brief description shown to solvers.';
COMMENT ON COLUMN challenge_attachments.display_order IS 'Sort order for solver-facing reference documents list.';
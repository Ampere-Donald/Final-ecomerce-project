ALTER TABLE product_documentary ADD COLUMN draft_content JSONB;
ALTER TABLE product_documentary ADD COLUMN published_content JSONB;
ALTER TABLE product_documentary ADD COLUMN published_at TIMESTAMPTZ;
ALTER TABLE product_documentary ADD CONSTRAINT documentary_draft_object CHECK (draft_content IS NULL OR jsonb_typeof(draft_content)='object');
ALTER TABLE product_documentary ADD CONSTRAINT documentary_published_object CHECK (published_content IS NULL OR jsonb_typeof(published_content)='object');

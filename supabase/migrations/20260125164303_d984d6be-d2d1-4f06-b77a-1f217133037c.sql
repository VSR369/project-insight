-- Backfill question_order for existing assessment responses that have NULL values
-- Uses created_at ordering as the baseline for historical data
WITH ordered_responses AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY attempt_id 
      ORDER BY created_at ASC
    ) as new_order
  FROM assessment_attempt_responses
  WHERE question_order IS NULL
)
UPDATE assessment_attempt_responses aar
SET question_order = or_cte.new_order
FROM ordered_responses or_cte
WHERE aar.id = or_cte.id;
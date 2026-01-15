-- Delete old streams that are no longer needed (new streams added via import)
DELETE FROM academic_streams 
WHERE id IN (
  'f4d5c5e5-d7ff-44b1-80e9-9ebeeee6f031', -- Computer Engineering
  '4cda743f-1a62-4c74-9581-49f783489d61', -- Mechanical Engineering
  '09b1f52e-294b-43f2-b263-49c70f7cee05', -- Electrical Engineering
  '44c4da47-4a02-4947-b9cb-6fc586526551'  -- Civil Engineering
);
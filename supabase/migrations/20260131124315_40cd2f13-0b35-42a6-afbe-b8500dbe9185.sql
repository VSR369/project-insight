-- Update pulse-media bucket to allow audio/webm MIME type
-- This is required because MediaRecorder in Chrome/Edge records audio as audio/webm;codecs=opus
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/jpeg', 
  'image/png', 
  'image/gif', 
  'image/webp', 
  'video/mp4', 
  'video/webm', 
  'audio/mpeg', 
  'audio/wav', 
  'audio/ogg', 
  'audio/mp4',
  'audio/webm'
]
WHERE id = 'pulse-media';
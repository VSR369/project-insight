-- Update participation modes with full descriptions
UPDATE participation_modes 
SET 
  description = E'You are not currently employed by any organization and operate independently.\nYou will participate in your personal and professional capacity.\nAll recognition, communication, and payments will be made directly to you.\nYou are responsible for your own tax, regulatory, and contractual compliance.\n\nAffiliation: Independent Consultant\nStatus: ✅ Self-Declared',
  updated_at = now()
WHERE code = 'INDEPENDENT';

UPDATE participation_modes 
SET 
  description = E'You wish to join as a recognized solution provider representing your employer.\nYou must inform your Reporting Manager or relevant authority.\nEnsure adherence to your organization''s internal policies.\nAny IP generated will belong to the organization.\nAll payments will be routed to your organization.\n\nAffiliation: Organizational Representative\nStatus: 🟡 Requires Manager Validation',
  updated_at = now()
WHERE code = 'ORG_REP';

UPDATE participation_modes 
SET 
  description = E'You are employed but choose not to represent your organization.\nTake full legal and ethical responsibility for your participation.\nConfirm compliance with your employer''s policies on moonlighting.\nThe platform is not liable for any breach of employment terms.\nAll recognition and payments handled directly with you.\n\nAffiliation: Independent (Self-Accountable)\nStatus: ✅ Self-Declared',
  updated_at = now()
WHERE code = 'SELF_ACCOUNTABLE';
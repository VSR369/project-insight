-- Update existing participation modes with new data
UPDATE participation_modes 
SET 
  name = 'Independent Consultant (Not Employed or Affiliated)',
  description = 'You are not currently employed by any organization and operate independently. You will participate in your personal and professional capacity. All recognition, communication, and payments will be made directly to you. You are responsible for your own tax, regulatory, and contractual compliance. Affiliation: Independent Consultant. Status: ✅ Self-Declared',
  code = 'INDEPENDENT',
  requires_org_info = false,
  display_order = 1,
  updated_at = now()
WHERE id = '3314a2c8-3b1e-45a5-81d1-b77862d7a32a';

UPDATE participation_modes 
SET 
  name = 'Represent Your Organization (Recommended for Employed Professionals)',
  description = 'You wish to join as a recognized solution provider representing your employer. You must inform your Reporting Manager or relevant authority. Ensure adherence to your organization''s internal policies. Any IP generated will belong to the organization. All payments will be routed to your organization. Affiliation: Organizational Representative. Status: 🟡 Requires Manager Validation',
  code = 'ORG_REP',
  requires_org_info = true,
  display_order = 2,
  updated_at = now()
WHERE id = '8e428a0e-146b-4c89-85e6-230fd24d6f75';

UPDATE participation_modes 
SET 
  name = 'Individual (Self-Accountable Participation)',
  description = 'You are employed but choose not to represent your organization. Take full legal and ethical responsibility for your participation. Confirm compliance with your employer''s policies on moonlighting. The platform is not liable for any breach of employment terms. All recognition and payments handled directly with you. Affiliation: Independent (Self-Accountable). Status: ✅ Self-Declared',
  code = 'SELF_ACCOUNTABLE',
  requires_org_info = false,
  display_order = 3,
  updated_at = now()
WHERE id = '64f5470a-6a17-4b12-a779-2fd0ed85b56d';
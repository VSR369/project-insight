
# Plan: Populate Pulse Card Topics

## Overview
Insert sample topics into the `pulse_card_topics` table so they appear in the TopicSelector chips.

## Current State
- The `pulse_card_topics` table is **empty**
- TopicSelector shows "No topics available"

## Proposed Topics
I'll create diverse, general-purpose topics suitable for knowledge sharing:

| Icon | Name | Slug | Description |
|------|------|------|-------------|
| 🧠 | AI & Machine Learning | ai-ml | Artificial intelligence, ML models, and automation |
| 💼 | Business Strategy | business-strategy | Leadership, growth, and business operations |
| 🔧 | DevOps & Cloud | devops-cloud | CI/CD, infrastructure, and cloud platforms |
| 📊 | Data Analytics | data-analytics | Data visualization, insights, and BI tools |
| 🔒 | Cybersecurity | cybersecurity | Security best practices and threat prevention |
| 💻 | Software Engineering | software-engineering | Coding patterns, architecture, and best practices |
| 🎯 | Product Management | product-management | Product strategy, roadmaps, and user research |
| 🎨 | Design & UX | design-ux | User experience, UI design, and accessibility |
| 📱 | Mobile Development | mobile-development | iOS, Android, and cross-platform apps |
| 🌐 | Web Development | web-development | Frontend, backend, and full-stack development |

## SQL Insert Statement
```sql
INSERT INTO pulse_card_topics (name, slug, description, icon, display_order, is_active) VALUES
  ('AI & Machine Learning', 'ai-ml', 'Artificial intelligence, ML models, and automation', '🧠', 1, true),
  ('Business Strategy', 'business-strategy', 'Leadership, growth, and business operations', '💼', 2, true),
  ('DevOps & Cloud', 'devops-cloud', 'CI/CD, infrastructure, and cloud platforms', '🔧', 3, true),
  ('Data Analytics', 'data-analytics', 'Data visualization, insights, and BI tools', '📊', 4, true),
  ('Cybersecurity', 'cybersecurity', 'Security best practices and threat prevention', '🔒', 5, true),
  ('Software Engineering', 'software-engineering', 'Coding patterns, architecture, and best practices', '💻', 6, true),
  ('Product Management', 'product-management', 'Product strategy, roadmaps, and user research', '🎯', 7, true),
  ('Design & UX', 'design-ux', 'User experience, UI design, and accessibility', '🎨', 8, true),
  ('Mobile Development', 'mobile-development', 'iOS, Android, and cross-platform apps', '📱', 9, true),
  ('Web Development', 'web-development', 'Frontend, backend, and full-stack development', '🌐', 10, true);
```

## Implementation
1. Use the insert tool to add 10 topics to `pulse_card_topics`
2. No code changes needed - TopicSelector already fetches from this table

## Expected Result
After insert, the Create Card dialog will show 10 clickable topic chips:

```
┌────────────────────────────────────────────────────────────────┐
│ 🧠 AI & ML   💼 Business   🔧 DevOps   📊 Data Analytics  →   │
│ 🔒 Security  💻 Software   🎯 Product  🎨 Design & UX         │
│ 📱 Mobile    🌐 Web Dev                                        │
└────────────────────────────────────────────────────────────────┘
```

## Files to Modify
None - this is a data-only change using the Supabase insert tool.

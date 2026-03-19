/**
 * TemplateSelector — Card grid for selecting a challenge template.
 * Used as the entry point before the wizard or conversational intake.
 */

import { CHALLENGE_TEMPLATES, type ChallengeTemplate } from '@/lib/challengeTemplates';

interface TemplateSelectorProps {
  onSelect: (template: ChallengeTemplate) => void;
  selectedId?: string;
}

export function TemplateSelector({ onSelect, selectedId }: TemplateSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          What kind of challenge are you creating?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a template to get started faster, or start from scratch.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {CHALLENGE_TEMPLATES.map((template) => {
          const isSelected = selectedId === template.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template)}
              className={`
                relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left
                transition-all duration-150 hover:shadow-md
                ${isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border bg-card hover:border-primary/40'
                }
              `}
            >
              <span className="text-2xl" role="img" aria-label={template.name}>
                {template.emoji}
              </span>
              <div>
                <span className="text-sm font-semibold text-foreground block">
                  {template.name}
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed mt-0.5 block">
                  {template.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * TemplateSelector — Card grid for selecting a challenge template.
 * Used as the entry point before the wizard or conversational intake.
 */

import { CHALLENGE_TEMPLATES, type ChallengeTemplate } from '@/lib/challengeTemplates';

interface TemplateSelectorProps {
  onSelect: (template: ChallengeTemplate) => void;
  selectedId?: string;
  /** When true the grid is read-only — selected card stays highlighted, others are dimmed */
  disabled?: boolean;
}

export function TemplateSelector({ onSelect, selectedId, disabled = false }: TemplateSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {disabled ? 'Challenge Type' : 'What kind of challenge are you creating?'}
        </h2>
        {!disabled && (
          <p className="text-sm text-muted-foreground mt-1">
            Pick a template to get started faster, or start from scratch.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {CHALLENGE_TEMPLATES.map((template) => {
          const isSelected = selectedId === template.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => !disabled && onSelect(template)}
              disabled={disabled}
              className={`
                relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left
                transition-all duration-150
                ${disabled
                  ? isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 cursor-default'
                    : 'border-border bg-card opacity-40 cursor-default'
                  : isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border bg-card hover:border-primary/40 hover:shadow-md'
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

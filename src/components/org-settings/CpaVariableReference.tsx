/**
 * CpaVariableReference — Collapsible reference of template variables.
 */
import { useState } from 'react';
import { ChevronDown, ChevronRight, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CPA_TEMPLATE_VARIABLES } from '@/constants/cpaDefaults.constants';

export function CpaVariableReference() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Code className="h-4 w-4" />
          Template Variable Reference
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-lg border bg-muted/50 p-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {CPA_TEMPLATE_VARIABLES.map(({ variable, description }) => (
              <div key={variable} className="flex items-start gap-2 text-sm">
                <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary">
                  {variable}
                </code>
                <span className="text-muted-foreground">{description}</span>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * LegalDocQuickInserts — Quick-insert buttons for common legal structures.
 */
import type { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { FileSignature, BookOpen, Scale, ListChecks } from 'lucide-react';

interface LegalDocQuickInsertsProps {
  editor: Editor;
}

const RECITAL_HTML = `<p><em>WHEREAS, [Party] [describe condition or background]; and</em></p>`;

const SIGNATURE_HTML = `
<div class="signature-block">
  <div>
    <div class="signature-line">Authorized Signatory — Company</div>
    <p>Name: ____________________</p>
    <p>Title: ____________________</p>
    <p>Date: ____________________</p>
  </div>
  <div>
    <div class="signature-line">Authorized Signatory — User</div>
    <p>Name: ____________________</p>
    <p>Title: ____________________</p>
    <p>Date: ____________________</p>
  </div>
</div>`;

const DEFINITION_HTML = `<p><strong>"[Term]"</strong> means [definition].</p>`;

const CLAUSE_HTML = `<h3>[X.X] [Clause Title]</h3>
<p>[Clause body text describing obligations, rights, or conditions.]</p>
<ol>
  <li>[First sub-clause]</li>
  <li>[Second sub-clause]</li>
</ol>`;

export function LegalDocQuickInserts({ editor }: LegalDocQuickInsertsProps) {
  const insert = (html: string) => editor.chain().focus().insertContent(html).run();

  return (
    <div className="flex items-center gap-1 px-2 pb-2 border-b">
      <span className="text-xs text-muted-foreground mr-1">Insert:</span>
      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => insert(RECITAL_HTML)}>
        <BookOpen className="h-3 w-3 mr-1" /> Recital
      </Button>
      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => insert(DEFINITION_HTML)}>
        <Scale className="h-3 w-3 mr-1" /> Definition
      </Button>
      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => insert(CLAUSE_HTML)}>
        <ListChecks className="h-3 w-3 mr-1" /> Clause
      </Button>
      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => insert(SIGNATURE_HTML)}>
        <FileSignature className="h-3 w-3 mr-1" /> Signature
      </Button>
    </div>
  );
}

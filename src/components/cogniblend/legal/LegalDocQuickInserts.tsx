/**
 * LegalDocQuickInserts — Dropdown of prebuilt legal clause templates.
 * Inserts canonical 2–3 sentence clauses with numbered sub-items at cursor.
 */
import type { Editor } from '@tiptap/react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface LegalDocQuickInsertsProps {
  editor: Editor | null;
}

interface ClauseTemplate {
  key: string;
  label: string;
  html: string;
  modelSpecific?: boolean;
}

const TEMPLATES: ClauseTemplate[] = [
  {
    key: 'definitions',
    label: 'Definitions Section',
    html: `<h2>DEFINITIONS AND INTERPRETATION</h2>
<p>In this Agreement, unless the context otherwise requires:</p>
<ol>
  <li><strong>"Term"</strong> means [definition];</li>
  <li><strong>"Affiliate"</strong> means any entity that directly or indirectly controls, is controlled by, or is under common control with a Party;</li>
  <li><strong>"Confidential Information"</strong> has the meaning given in the Confidentiality clause.</li>
</ol>`,
  },
  {
    key: 'confidentiality',
    label: 'Confidentiality Clause',
    html: `<h2>CONFIDENTIALITY</h2>
<p>Each Party shall keep confidential and shall not, without the prior written consent of the disclosing Party, disclose to any third party any Confidential Information received from the other Party. Confidential Information shall be used solely for the purposes of performing this Agreement and shall be protected with at least the same degree of care as the receiving Party uses for its own confidential information, but in no event less than reasonable care. The obligations under this clause shall survive termination of this Agreement for a period of five (5) years.</p>`,
  },
  {
    key: 'liability',
    label: 'Limitation of Liability',
    html: `<h2>LIMITATION OF LIABILITY</h2>
<p>To the maximum extent permitted by applicable law, neither Party shall be liable to the other for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, revenue, data, or business opportunities, arising out of or in connection with this Agreement. The total aggregate liability of either Party under this Agreement shall not exceed the total fees paid or payable in the twelve (12) months preceding the event giving rise to the claim. Nothing in this clause shall limit liability for fraud, wilful misconduct, or any liability that cannot be excluded by law.</p>`,
  },
  {
    key: 'force_majeure',
    label: 'Force Majeure',
    html: `<h2>FORCE MAJEURE</h2>
<p>Neither Party shall be liable for any failure or delay in the performance of its obligations under this Agreement (other than payment obligations) to the extent such failure or delay is caused by events beyond its reasonable control, including acts of God, war, terrorism, civil unrest, government action, pandemic, fire, flood, earthquake, or failure of public utilities or telecommunications networks. The affected Party shall promptly notify the other Party in writing and shall use reasonable endeavours to mitigate the effects of such event. If the force majeure event continues for more than ninety (90) days, either Party may terminate this Agreement by written notice without further liability.</p>`,
  },
  {
    key: 'severability',
    label: 'Severability',
    html: `<h2>SEVERABILITY</h2>
<p>If any provision of this Agreement is held by a court or other tribunal of competent jurisdiction to be invalid, illegal, or unenforceable, such provision shall be modified to the minimum extent necessary to make it enforceable, or, if such modification is not possible, severed from this Agreement. The remaining provisions of this Agreement shall continue in full force and effect and shall be construed so as to best give effect to the original intent of the Parties.</p>`,
  },
  {
    key: 'governing_law',
    label: 'Governing Law',
    html: `<h2>GOVERNING LAW AND JURISDICTION</h2>
<p>This Agreement and any dispute or claim (including non-contractual disputes or claims) arising out of or in connection with it or its subject matter shall be governed by and construed in accordance with the laws of [Jurisdiction], without regard to its conflict of laws principles. The Parties irrevocably agree that the courts of [Jurisdiction] shall have exclusive jurisdiction to settle any such dispute or claim, save that either Party may seek interim or injunctive relief in any court of competent jurisdiction.</p>`,
  },
  {
    key: 'indemnification',
    label: 'Indemnification',
    html: `<h2>INDEMNIFICATION</h2>
<p>Each Party (the "Indemnifying Party") shall indemnify, defend, and hold harmless the other Party and its Affiliates, officers, directors, employees, and agents (the "Indemnified Parties") from and against any and all claims, losses, damages, liabilities, costs, and expenses (including reasonable legal fees) arising out of or in connection with: (i) any breach by the Indemnifying Party of its obligations, representations, or warranties under this Agreement; (ii) the Indemnifying Party's gross negligence or wilful misconduct; or (iii) any third-party claim alleging that materials provided by the Indemnifying Party infringe any intellectual property right. The Indemnified Party shall promptly notify the Indemnifying Party of any claim and shall provide reasonable cooperation in the defence thereof.</p>`,
  },
  {
    key: 'non_circumvention',
    label: 'Non-Circumvention (AGG)',
    modelSpecific: true,
    html: `<h2>NON-CIRCUMVENTION AND ANTI-DISINTERMEDIATION</h2>
<p>The Solution Provider expressly acknowledges that the Aggregator has invested significant resources in identifying, qualifying, and introducing the Seeking Organization. The Solution Provider shall not, during the term of this Agreement and for a period of twenty-four (24) months following its termination, directly or indirectly: (i) contact, solicit, or transact business with the Seeking Organization or any of its Affiliates in relation to the subject matter of the Challenge, except through the Aggregator's platform; (ii) bypass, circumvent, or attempt to circumvent the Aggregator's role as intermediary; or (iii) induce or encourage the Seeking Organization to terminate or modify its relationship with the Aggregator. Breach of this clause shall entitle the Aggregator to liquidated damages equal to one hundred and fifty percent (150%) of the gross consideration that would otherwise have been payable through the platform, without prejudice to any other remedies.</p>`,
  },
];

export function LegalDocQuickInserts({ editor }: LegalDocQuickInsertsProps) {
  const disabled = !editor;

  const handleInsert = (html: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(html).run();
  };

  const standard = TEMPLATES.filter((t) => !t.modelSpecific);
  const modelSpecific = TEMPLATES.filter((t) => t.modelSpecific);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label="Insert clause"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Plus className="h-4 w-4" />
          <span>Insert Clause</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Standard Clauses</DropdownMenuLabel>
        {standard.map((t) => (
          <DropdownMenuItem key={t.key} onSelect={() => handleInsert(t.html)}>
            {t.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Model-Specific Clauses</DropdownMenuLabel>
        {modelSpecific.map((t) => (
          <DropdownMenuItem key={t.key} onSelect={() => handleInsert(t.html)}>
            {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LegalDocQuickInserts;

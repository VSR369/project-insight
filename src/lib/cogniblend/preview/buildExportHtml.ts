/**
 * buildExportHtml — Construct a self-contained HTML document representing
 * the full Challenge Preview, suitable for client-side PDF/DOCX export.
 *
 * The output is intentionally framework-free: no Tailwind, no CSS variables,
 * no React. Colours and typography are hardcoded so html-docx-js preserves them.
 */

import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { GROUPS, SECTION_MAP } from '@/lib/cogniblend/curationSectionDefs';
import { parseJson, getDeliverableObjects, getExpectedOutcomeObjects, getSubmissionGuidelineObjects } from '@/lib/cogniblend/curationHelpers';
import { resolveGovernanceMode } from '@/lib/governanceMode';
import { getMaturityLabel } from '@/lib/maturityLabels';
import type { ChallengeData, LegalDocDetail, EscrowRecord } from '@/lib/cogniblend/curationTypes';
import type { OrgData, DigestData, PreviewAttachment } from '@/components/cogniblend/preview/usePreviewData';
import exportCss from '@/styles/export-document.css?inline';

interface BuildExportArgs {
  challenge: ChallengeData;
  orgData: OrgData | null;
  legalDetails: LegalDocDetail[];
  escrowRecord: EscrowRecord | null;
  digest: DigestData | null;
  attachments: PreviewAttachment[];
}

const escapeHtml = (s: unknown): string => {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const renderRichText = (raw: string | null | undefined): string => {
  if (!raw || !String(raw).trim()) return '<p class="export-empty">Not provided.</p>';
  const trimmed = String(raw).trim();
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(trimmed);
  const html = looksLikeHtml ? trimmed : marked.parse(trimmed, { async: false }) as string;
  return DOMPurify.sanitize(html);
};

const emptyState = (): string => '<p class="export-empty">Not defined yet.</p>';

const renderBadges = (items: string[]): string =>
  items.map((s) => `<span class="export-badge">${escapeHtml(s)}</span>`).join('');

const renderCard = (title: string, body: string, meta?: string): string =>
  `<div class="export-card">
    <p class="export-card-title">${escapeHtml(title)}</p>
    <div class="export-card-body">${body}</div>
    ${meta ? `<p class="export-card-meta">${escapeHtml(meta)}</p>` : ''}
  </div>`;

/* ---------- Per-section renderers ---------- */

function renderSectionContent(key: string, ch: ChallengeData, legalDetails: LegalDocDetail[], escrow: EscrowRecord | null): string {
  switch (key) {
    case 'problem_statement':
    case 'scope':
    case 'hook':
    case 'context_and_background':
    case 'root_causes':
    case 'affected_stakeholders':
    case 'current_deficiencies':
    case 'preferred_approach':
    case 'approaches_not_of_interest':
    case 'creator_references':
    case 'reference_urls':
    case 'visibility':
    case 'organization_context':
    case 'solver_expertise':
    case 'eligibility': {
      const direct = (ch as unknown as Record<string, unknown>)[key];
      const eb = parseJson<Record<string, unknown>>(ch.extended_brief);
      const fromBrief = eb ? (eb[key] as string | undefined) : undefined;
      return renderRichText((direct as string | undefined) ?? fromBrief ?? '');
    }
    case 'deliverables': {
      const items = getDeliverableObjects(ch) as Array<Record<string, unknown>>;
      if (!items.length) return emptyState();
      return items.map((d, i) => {
        const name = (d.name ?? d.title ?? d.deliverable_name ?? `Deliverable ${i + 1}`) as string;
        const desc = (d.description ?? d.deliverable_description ?? '') as string;
        const ac = d.acceptance_criteria as string | undefined;
        const body = renderRichText(desc) + (ac ? `<p class="export-card-meta"><strong>Acceptance:</strong> ${escapeHtml(ac)}</p>` : '');
        return renderCard(`D${i + 1}. ${name}`, body);
      }).join('');
    }
    case 'submission_guidelines': {
      const items = getSubmissionGuidelineObjects(ch) as Array<Record<string, unknown>>;
      if (!items.length) return renderRichText(ch.description);
      return items.map((d, i) => {
        const name = (d.name ?? d.title ?? `Guideline ${i + 1}`) as string;
        const desc = (d.description ?? '') as string;
        return renderCard(`S${i + 1}. ${name}`, renderRichText(desc));
      }).join('');
    }
    case 'expected_outcomes': {
      const items = getExpectedOutcomeObjects(ch) as Array<Record<string, unknown>>;
      if (!items.length) return emptyState();
      return items.map((d, i) => {
        const name = (d.name ?? d.title ?? `Outcome ${i + 1}`) as string;
        const desc = (d.description ?? '') as string;
        return renderCard(`O${i + 1}. ${name}`, renderRichText(desc));
      }).join('');
    }
    case 'maturity_level': {
      if (!ch.maturity_level) return emptyState();
      return `<p><span class="export-badge export-badge-primary">${escapeHtml(getMaturityLabel(ch.maturity_level))}</span></p>`;
    }
    case 'evaluation_criteria': {
      const raw = parseJson<Record<string, unknown> | unknown[]>(ch.evaluation_criteria);
      const ec = (Array.isArray(raw) ? raw : (raw as Record<string, unknown> | null)?.criteria) as Array<Record<string, unknown>> | undefined;
      if (!ec?.length) return emptyState();
      const rows = ec.map((c, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(c.criterion_name ?? c.name ?? '—')}</td><td style="text-align:right">${escapeHtml(c.weight_percentage ?? c.weight ?? '—')}%</td></tr>`).join('');
      return `<table><thead><tr><th style="width:40px">#</th><th>Criterion</th><th style="width:90px">Weight</th></tr></thead><tbody>${rows}</tbody></table>`;
    }
    case 'reward_structure': {
      const raw = parseJson<Record<string, unknown> | unknown[]>(ch.reward_structure);
      if (!raw) return emptyState();
      if (Array.isArray(raw)) {
        const rows = (raw as Array<Record<string, unknown>>).map((r) => `<tr><td>${escapeHtml(r.tier_name ?? r.rank ?? '—')}</td><td>${escapeHtml(r.description ?? '')}</td><td style="text-align:right">${escapeHtml((ch.currency_code ?? ''))} ${escapeHtml(r.fixed_amount ?? r.percentage_of_pool ?? '—')}</td></tr>`).join('');
        return `<table><thead><tr><th>Tier</th><th>Description</th><th style="width:140px">Amount</th></tr></thead><tbody>${rows}</tbody></table>`;
      }
      const obj = raw as Record<string, unknown>;
      const rows = Object.entries(obj).map(([k, v]) => `<tr><td>${escapeHtml(k.replace(/_/g, ' '))}</td><td>${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : v)}</td></tr>`).join('');
      return `<table><tbody>${rows}</tbody></table>`;
    }
    case 'ip_model': {
      if (!ch.ip_model) return emptyState();
      const labels: Record<string, string> = {
        'IP-EA': 'Exclusive Assignment — All IP transfers to the seeker',
        'IP-NEL': 'Non-Exclusive License — Provider retains ownership',
        'IP-EL': 'Exclusive License — Exclusive license to seeker',
        'IP-JO': 'Joint Ownership',
        'IP-NONE': 'No IP Transfer',
      };
      return `<p><span class="export-badge export-badge-primary">${escapeHtml(labels[ch.ip_model] ?? ch.ip_model)}</span></p>`;
    }
    case 'solution_type': {
      const st = (ch as unknown as Record<string, unknown>).solution_types;
      if (!Array.isArray(st) || !st.length) return emptyState();
      return `<p>${renderBadges(st as string[])}</p>`;
    }
    case 'domain_tags': {
      const tags = parseJson<string[]>(ch.domain_tags);
      if (!Array.isArray(tags) || !tags.length) return emptyState();
      return `<p>${renderBadges(tags)}</p>`;
    }
    case 'solver_audience': {
      const audience = ((ch as unknown as Record<string, unknown>).solver_audience as string) ?? 'ALL';
      const model = (ch.operating_model ?? 'MP') as string;
      if (model !== 'AGG') return '<p>Marketplace model — open to all Solution Providers.</p>';
      const labels: Record<string, string> = {
        ALL: 'All Solution Providers — internal pool and external marketplace.',
        INTERNAL: 'Internal Pool Only — restricted to organization members.',
        EXTERNAL: 'External Marketplace Only — restricted to outside Solution Providers.',
      };
      return `<p>${escapeHtml(labels[audience] ?? audience)}</p>`;
    }
    case 'evaluation_config': {
      const method = ((ch as unknown as Record<string, unknown>).evaluation_method as string) ?? 'SINGLE';
      const count = ((ch as unknown as Record<string, unknown>).evaluator_count as number) ?? 1;
      return `<p>${method === 'DELPHI' ? `Delphi Panel (${count} evaluators)` : 'Single Evaluator'}</p>`;
    }
    case 'creator_legal_instructions': {
      const instr = (ch as unknown as Record<string, unknown>).creator_legal_instructions as string | undefined;
      if (!instr?.trim()) return emptyState();
      return `<div class="export-callout">${renderRichText(instr)}</div>`;
    }
    case 'phase_schedule': {
      const raw = parseJson<unknown[] | Record<string, unknown>>(ch.phase_schedule);
      if (!raw) return emptyState();
      const arr = Array.isArray(raw) ? raw : Object.entries(raw).map(([k, v]) => ({ phase: k, ...(v as Record<string, unknown>) }));
      const rows = (arr as Array<Record<string, unknown>>).map((r) => `<tr><td>${escapeHtml(r.phase ?? r.phase_name ?? '—')}</td><td>${escapeHtml(r.start_date ?? r.starts_at ?? '—')}</td><td>${escapeHtml(r.end_date ?? r.ends_at ?? '—')}</td><td>${escapeHtml(r.duration_days ?? '—')} days</td></tr>`).join('');
      return `<table><thead><tr><th>Phase</th><th>Start</th><th>End</th><th>Duration</th></tr></thead><tbody>${rows}</tbody></table>`;
    }
    case 'complexity': {
      if (ch.complexity_score == null && !ch.complexity_level) return emptyState();
      return `<p><strong>Level:</strong> <span class="export-badge export-badge-primary">${escapeHtml(ch.complexity_level ?? 'N/A')}</span> &nbsp; <strong>Score:</strong> ${escapeHtml(ch.complexity_score ?? 'N/A')}</p>`;
    }
    case 'success_metrics_kpis':
    case 'data_resources_provided': {
      const raw = parseJson<unknown>((ch as unknown as Record<string, import('@/integrations/supabase/types').Json>)[key] ?? null);
      if (!raw) return emptyState();
      if (Array.isArray(raw)) {
        return `<ul>${(raw as unknown[]).map((v) => `<li>${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : v)}</li>`).join('')}</ul>`;
      }
      return renderRichText(typeof raw === 'string' ? raw : JSON.stringify(raw));
    }
    case 'legal_docs': {
      if (!legalDetails.length) return emptyState();
      const rows = legalDetails.map((d) => `<tr><td>${escapeHtml(d.document_name ?? d.document_type)}</td><td>${escapeHtml(d.tier.replace('_', ' '))}</td><td>${escapeHtml(d.lc_status ?? 'pending')}</td></tr>`).join('');
      return `<table><thead><tr><th>Document</th><th>Tier</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
    }
    case 'escrow_funding': {
      const controlled = resolveGovernanceMode(ch.governance_profile) === 'CONTROLLED';
      if (!controlled) return '<p>Escrow not required for this governance mode.</p>';
      if (!escrow) return '<p class="export-empty">No escrow record found.</p>';
      return `<dl class="export-kv">
        <dt>Status</dt><dd>${escapeHtml(escrow.escrow_status)}</dd>
        <dt>Deposit Amount</dt><dd>${escapeHtml(escrow.currency ?? '$')} ${escapeHtml(escrow.deposit_amount?.toLocaleString?.() ?? escrow.deposit_amount)}</dd>
        ${escrow.bank_name ? `<dt>Bank</dt><dd>${escapeHtml(escrow.bank_name)}</dd>` : ''}
        ${escrow.deposit_date ? `<dt>Deposit Date</dt><dd>${escapeHtml(new Date(escrow.deposit_date).toLocaleDateString())}</dd>` : ''}
        ${escrow.deposit_reference ? `<dt>Reference</dt><dd>${escapeHtml(escrow.deposit_reference)}</dd>` : ''}
      </dl>`;
    }
    default: {
      const direct = (ch as unknown as Record<string, unknown>)[key];
      if (typeof direct === 'string') return renderRichText(direct);
      const eb = parseJson<Record<string, unknown>>(ch.extended_brief);
      if (eb && typeof eb[key] === 'string') return renderRichText(eb[key] as string);
      return emptyState();
    }
  }
}

/* ---------- Top-level builder ---------- */

export function buildChallengeExportHtml({ challenge, orgData, legalDetails, escrowRecord, digest }: BuildExportArgs): string {
  const generatedAt = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const orgName = orgData?.organization_name ?? 'Organization';
  const govMode = resolveGovernanceMode(challenge.governance_mode_override ?? challenge.governance_profile) ?? '—';

  const groupsToRender = GROUPS.filter((g) => g.id !== 'organization');

  // Cover
  const cover = `<section class="export-cover">
    <p class="export-cover-eyebrow">Challenge Brief</p>
    <h1 class="export-cover-title">${escapeHtml(challenge.title)}</h1>
    ${challenge.hook ? `<p class="export-cover-hook">${escapeHtml(challenge.hook)}</p>` : ''}
    <dl class="export-cover-meta">
      <div><dt>Prepared by</dt><dd>${escapeHtml(orgName)}</dd></div>
      <div><dt>Date</dt><dd>${escapeHtml(generatedAt)}</dd></div>
      <div><dt>Governance Mode</dt><dd>${escapeHtml(govMode)}</dd></div>
      <div><dt>Operating Model</dt><dd>${escapeHtml(challenge.operating_model ?? '—')}</dd></div>
    </dl>
    <p class="export-cover-footer">Confidential — ${escapeHtml(orgName)}</p>
  </section>`;

  // TOC
  let tocNum = 0;
  const tocItems: string[] = [];
  tocItems.push(`<li><span class="toc-num">${++tocNum}.</span> Organization</li>`);
  groupsToRender.forEach((g) => {
    tocItems.push(`<li><span class="toc-num">${++tocNum}.</span> ${escapeHtml(g.label.replace(/^\d+\.\s*/, ''))}</li>`);
  });
  tocItems.push(`<li><span class="toc-num">${++tocNum}.</span> Context Digest</li>`);
  const toc = `<section class="export-toc"><h2>Table of Contents</h2><ol>${tocItems.join('')}</ol></section>`;

  // Organization group
  const orgSection = `<section class="export-group">
    <h2 class="export-group-header">Organization</h2>
    <div class="export-section">
      <h3 class="export-section-header">Overview</h3>
      <div class="export-section-body">
        <dl class="export-kv">
          <dt>Name</dt><dd>${escapeHtml(orgData?.organization_name ?? '—')}</dd>
          ${orgData?.organization_types?.name ? `<dt>Type</dt><dd>${escapeHtml(orgData.organization_types.name)}</dd>` : ''}
          ${orgData?.tagline ? `<dt>Tagline</dt><dd>${escapeHtml(orgData.tagline)}</dd>` : ''}
          ${orgData?.website_url ? `<dt>Website</dt><dd>${escapeHtml(orgData.website_url)}</dd>` : ''}
        </dl>
        ${orgData?.organization_description ? `<div>${renderRichText(orgData.organization_description)}</div>` : ''}
      </div>
    </div>
  </section>`;

  // Standard groups
  const groupHtml = groupsToRender.map((group) => {
    const sections = group.sectionKeys.map((key) => {
      const def = SECTION_MAP.get(key);
      if (!def) return '';
      const body = renderSectionContent(key, challenge, legalDetails, escrowRecord);
      return `<div class="export-section">
        <h3 class="export-section-header">${escapeHtml(def.label)}${def.attribution ? `<span class="export-section-attribution">${escapeHtml(def.attribution)}</span>` : ''}</h3>
        <div class="export-section-body">${body}</div>
      </div>`;
    }).join('');
    return `<section class="export-group">
      <h2 class="export-group-header">${escapeHtml(group.label.replace(/^\d+\.\s*/, ''))}</h2>
      ${sections}
    </section>`;
  }).join('');

  // Digest
  const digestHtml = `<section class="export-group">
    <h2 class="export-group-header">Context Digest</h2>
    <div class="export-section">
      <h3 class="export-section-header">AI-Synthesized Digest</h3>
      <div class="export-section-body">
        ${digest?.digest_text ? renderRichText(digest.digest_text) : emptyState()}
        ${digest?.source_count ? `<p class="export-card-meta">Synthesized from ${digest.source_count} verified source${digest.source_count === 1 ? '' : 's'}.</p>` : ''}
      </div>
    </div>
  </section>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(challenge.title)}</title>
  <style>${exportCss}</style>
</head>
<body>
  <div class="export-doc">
    ${cover}
    ${toc}
    ${orgSection}
    ${groupHtml}
    ${digestHtml}
  </div>
</body>
</html>`;
}

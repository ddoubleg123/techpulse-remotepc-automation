'use client';

// Diagnostic Knowledge Base — browse Synth's rules, laws, and learned rules.
// All data is read-only from Supabase. No writes happen here.

import { useState, useEffect, useCallback, useMemo } from 'react';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type Rule = {
  id: string;
  rule_number?: string | number | null;
  rule_type?: string | null;
  title?: string | null;
  short_description?: string | null;
  full_content?: string | null;
  category?: string | null;
  related_rules?: string[] | null;
  related_laws?: string[] | null;
  layer?: string | number | null;
};

type Law = {
  id: string;
  law_number?: string | number | null;
  title?: string | null;
  short_description?: string | null;
  full_content?: string | null;
  category?: string | null;
  related_laws?: string[] | null;
};

type LearnedRule = {
  id: string;
  if_condition?: string | null;
  then_action?: string | null;
  rationale?: string | null;
  source_ref?: string | null;
  session_id?: string | null;
  active?: boolean | null;
  created_at?: string | null;
};

type Tab = 'rules' | 'laws' | 'learned';

const navy = '#1B3A6B';
const teal = '#2E75B6';

async function fetchTable<T>(path: string): Promise<T[]> {
  if (!SUPABASE_ANON_KEY) throw new Error('Supabase not configured');
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
  });
  if (!res.ok) throw new Error(`Couldn't load (HTTP ${res.status})`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export default function KnowledgePage() {
  const [tab, setTab] = useState<Tab>('rules');
  const [rules, setRules] = useState<Rule[]>([]);
  const [laws, setLaws] = useState<Law[]>([]);
  const [learned, setLearned] = useState<LearnedRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, l, ln] = await Promise.all([
        fetchTable<Rule>('synth_diagnostic_rules?select=id,rule_number,rule_type,title,short_description,full_content,category,related_rules,related_laws,layer&order=rule_number.asc&limit=500'),
        fetchTable<Law>('synth_diagnostic_laws?select=id,law_number,title,short_description,full_content,category,related_laws&order=law_number.asc&limit=500'),
        fetchTable<LearnedRule>('synth_learned_rules?select=id,if_condition,then_action,rationale,source_ref,session_id,active,created_at&order=created_at.desc&limit=500'),
      ]);
      setRules(r);
      setLaws(l);
      setLearned(ln);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load knowledge base');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derive category options for current tab
  const categories = useMemo(() => {
    const set = new Set<string>();
    const source = tab === 'rules' ? rules : tab === 'laws' ? laws : [];
    source.forEach(item => {
      const c = (item as { category?: string | null }).category;
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [tab, rules, laws]);

  // Filter by query + category
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (haystack: string | null | undefined) =>
      !q || (haystack ? haystack.toLowerCase().includes(q) : false);

    if (tab === 'rules') {
      return rules.filter(r => {
        if (categoryFilter && r.category !== categoryFilter) return false;
        return matches(r.title) || matches(r.short_description) || matches(r.full_content) || matches(String(r.rule_number));
      });
    }
    if (tab === 'laws') {
      return laws.filter(l => {
        if (categoryFilter && l.category !== categoryFilter) return false;
        return matches(l.title) || matches(l.short_description) || matches(l.full_content) || matches(String(l.law_number));
      });
    }
    return learned.filter(ln =>
      matches(ln.if_condition) || matches(ln.then_action) || matches(ln.rationale)
    );
  }, [tab, query, categoryFilter, rules, laws, learned]);

  const tabCounts = { rules: rules.length, laws: laws.length, learned: learned.length };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: navy }}>Knowledge Base</h1>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#888' }}>
          Synth&apos;s diagnostic rules, laws, and learned principles
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid #E8E8E8' }}>
        {([
          { id: 'rules' as const, label: `Rules (${tabCounts.rules})` },
          { id: 'laws' as const, label: `Laws (${tabCounts.laws})` },
          { id: 'learned' as const, label: `Learned (${tabCounts.learned})` },
        ]).map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setCategoryFilter(''); setExpandedId(null); }}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                color: active ? navy : '#888',
                borderBottom: active ? `2px solid ${navy}` : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search + category */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`Search ${tab}...`}
          style={{
            flex: 1, minWidth: 200,
            padding: '8px 14px', borderRadius: 10, border: '1px solid #E0E0E0',
            fontSize: 13, outline: 'none', color: navy,
          }}
        />
        {tab !== 'learned' && categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{
              padding: '8px 14px', borderRadius: 10, border: '1px solid #E0E0E0',
              fontSize: 13, outline: 'none', color: navy, background: 'white',
            }}
          >
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888', fontSize: 14 }}>
          Loading knowledge base...
        </div>
      ) : error ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#E74C3C', fontSize: 14, marginBottom: 12 }}>{error}</p>
          <button
            onClick={load}
            style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${navy}, ${teal})`, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 56, textAlign: 'center', color: '#888' }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: navy }}>
            {query || categoryFilter ? 'No matches' : `No ${tab} yet`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tab === 'rules' && (filtered as Rule[]).map(r => (
            <KnowledgeCard
              key={r.id}
              id={r.id}
              expanded={expandedId === r.id}
              onToggle={() => setExpandedId(prev => prev === r.id ? null : r.id)}
              tag={r.rule_number ? `R${r.rule_number}` : 'Rule'}
              badges={[r.category, r.rule_type, r.layer ? `Layer ${r.layer}` : null].filter(Boolean) as string[]}
              title={r.title || 'Untitled rule'}
              shortDescription={r.short_description}
              fullContent={r.full_content}
              related={[
                ...(r.related_rules || []).map(x => ({ kind: 'rule' as const, ref: x })),
                ...(r.related_laws || []).map(x => ({ kind: 'law' as const, ref: x })),
              ]}
            />
          ))}
          {tab === 'laws' && (filtered as Law[]).map(l => (
            <KnowledgeCard
              key={l.id}
              id={l.id}
              expanded={expandedId === l.id}
              onToggle={() => setExpandedId(prev => prev === l.id ? null : l.id)}
              tag={l.law_number ? `L${l.law_number}` : 'Law'}
              badges={l.category ? [l.category] : []}
              title={l.title || 'Untitled law'}
              shortDescription={l.short_description}
              fullContent={l.full_content}
              related={(l.related_laws || []).map(x => ({ kind: 'law' as const, ref: x }))}
            />
          ))}
          {tab === 'learned' && (filtered as LearnedRule[]).map(ln => (
            <LearnedRuleCard key={ln.id} rule={ln} />
          ))}
        </div>
      )}
    </div>
  );
}

function KnowledgeCard(props: {
  id: string;
  expanded: boolean;
  onToggle: () => void;
  tag: string;
  badges: string[];
  title: string;
  shortDescription?: string | null;
  fullContent?: string | null;
  related: { kind: 'rule' | 'law'; ref: string }[];
}) {
  const { expanded, onToggle, tag, badges, title, shortDescription, fullContent, related } = props;
  return (
    <div
      style={{
        background: 'white', border: '1px solid #E8E8E8', borderRadius: 12,
        padding: '14px 18px', cursor: 'pointer',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
      onClick={onToggle}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#D0D0D0'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E8E8'; }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
        <span style={{
          fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: teal,
          background: '#F0F6FB', padding: '2px 8px', borderRadius: 6, flexShrink: 0,
        }}>{tag}</span>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: navy, flex: 1, minWidth: 0 }}>
          {title}
        </h3>
        <span style={{ fontSize: 11, color: '#AAA', flexShrink: 0 }}>{expanded ? '▾' : '▸'}</span>
      </div>
      {badges.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {badges.map((b, i) => (
            <span key={i} style={{ fontSize: 11, color: '#666', background: '#F4F4F4', padding: '2px 8px', borderRadius: 999 }}>{b}</span>
          ))}
        </div>
      )}
      {shortDescription && (
        <p style={{ margin: '10px 0 0', fontSize: 13, color: '#555', lineHeight: 1.5 }}>
          {shortDescription}
        </p>
      )}
      {expanded && fullContent && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0F0F0' }}>
          <pre style={{
            margin: 0, fontSize: 13, color: '#333', whiteSpace: 'pre-wrap',
            fontFamily: 'inherit', lineHeight: 1.55,
          }}>{fullContent}</pre>
          {related.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#888' }}>Related:</span>
              {related.map((r, i) => (
                <span key={i} style={{
                  fontFamily: 'monospace', fontSize: 11, color: r.kind === 'rule' ? teal : '#7B5BA6',
                  background: r.kind === 'rule' ? '#F0F6FB' : '#F5F0FA', padding: '1px 6px', borderRadius: 4,
                }}>{r.kind === 'rule' ? 'R' : 'L'}{r.ref}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LearnedRuleCard({ rule }: { rule: LearnedRule }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E8E8E8', borderRadius: 12, padding: '14px 18px' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <span style={{
          fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: rule.active ? '#2E7D32' : '#999',
          background: rule.active ? '#E8F5E9' : '#F4F4F4', padding: '2px 8px', borderRadius: 6,
        }}>{rule.active ? 'ACTIVE' : 'INACTIVE'}</span>
        {rule.created_at && (
          <span style={{ fontSize: 11, color: '#888' }}>
            {new Date(rule.created_at).toLocaleDateString()}
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '6px 12px', fontSize: 13 }}>
        <span style={{ color: '#888', fontWeight: 600 }}>IF</span>
        <span style={{ color: '#333' }}>{rule.if_condition || '—'}</span>
        <span style={{ color: '#888', fontWeight: 600 }}>THEN</span>
        <span style={{ color: '#333' }}>{rule.then_action || '—'}</span>
        {rule.rationale && (
          <>
            <span style={{ color: '#888', fontWeight: 600 }}>WHY</span>
            <span style={{ color: '#555', fontSize: 12 }}>{rule.rationale}</span>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const SYNTH_API = 'https://techpulse-api.onrender.com';

interface SharedReport {
  shop_name?: string;
  vehicle?: string;
  vehicle_year?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vin?: string;
  dtc_codes?: string[];
  summary?: string;
  fix?: string;
  confidence?: number;
  created_at?: string;
  pdf_base64?: string;
}

type LoadState = 'loading' | 'ok' | 'notfound' | 'expired' | 'error';

/**
 * Public, read-only report view reached via a tokenized email link (B2).
 * No login. Renders ONE report only — never chat transcript, internal notes,
 * other cases, or app navigation. The token is validated server-side by the
 * Flask API, which returns only this single report.
 */
export default function SharedReportPage() {
  const params = useParams();
  const token = (params?.token as string) || '';
  const [state, setState] = useState<LoadState>('loading');
  const [report, setReport] = useState<SharedReport | null>(null);

  useEffect(() => {
    if (!token) { setState('notfound'); return; }
    let cancelled = false;
    fetch(`${SYNTH_API}/api/shared-report/${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 404) { setState('notfound'); return; }
        if (r.status === 410) { setState('expired'); return; }
        if (!r.ok) { setState('error'); return; }
        const data = await r.json();
        setReport(data);
        setState('ok');
      })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [token]);

  const vehicleLabel =
    report?.vehicle ||
    [report?.vehicle_year, report?.vehicle_make, report?.vehicle_model].filter(Boolean).join(' ') ||
    'Vehicle';

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb', padding: '24px 16px', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif', color: '#1a1a2e' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Brand header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: '#1F5C8C' }}>TechPulse</div>
          <div style={{ fontSize: 13, color: '#888' }}>Diagnostic Report</div>
        </div>

        {state === 'loading' && (
          <Card><p style={{ color: '#666' }}>Loading report…</p></Card>
        )}

        {state === 'notfound' && (
          <Card>
            <h2 style={h2s}>Report not available</h2>
            <p style={{ color: '#666' }}>This link is invalid or the report has been removed. Please contact the shop that sent it.</p>
          </Card>
        )}

        {state === 'expired' && (
          <Card>
            <h2 style={h2s}>This link has expired</h2>
            <p style={{ color: '#666' }}>For your security, shared report links expire after a period of time. Please ask the shop to send a new link.</p>
          </Card>
        )}

        {state === 'error' && (
          <Card>
            <h2 style={h2s}>Something went wrong</h2>
            <p style={{ color: '#666' }}>We couldn’t load this report right now. Please try again shortly.</p>
          </Card>
        )}

        {state === 'ok' && report && (
          <>
            <Card>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                {report.shop_name || 'TechPulse'}{report.created_at ? ` · ${new Date(report.created_at).toLocaleDateString()}` : ''}
              </div>
              <h1 style={{ margin: '0 0 4px', fontSize: 24, color: '#0a1a3a' }}>{vehicleLabel}</h1>
              {report.vin && <div style={{ color: '#666', fontSize: 13 }}>VIN: {report.vin}</div>}

              {Array.isArray(report.dtc_codes) && report.dtc_codes.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <SectionTitle>Fault Codes</SectionTitle>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {report.dtc_codes.map((c) => (
                      <span key={c} style={{ background: '#fff3cd', color: '#7a5b00', padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {report.summary && (
                <div style={{ marginTop: 16 }}>
                  <SectionTitle>Summary</SectionTitle>
                  <p style={{ lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{report.summary}</p>
                </div>
              )}

              {report.fix && (
                <div style={{ marginTop: 16 }}>
                  <SectionTitle>Recommended Repair</SectionTitle>
                  <div style={{ background: '#fff8e1', borderLeft: '3px solid #f0b400', padding: '12px 16px', borderRadius: 4, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{report.fix}</div>
                </div>
              )}

              {typeof report.confidence === 'number' && report.confidence > 0 && (
                <div style={{ marginTop: 16, fontSize: 14, color: '#444' }}>
                  Diagnostic confidence: <strong>{report.confidence}%</strong>
                </div>
              )}
            </Card>

            {report.pdf_base64 && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <a
                  href={`data:application/pdf;base64,${report.pdf_base64}`}
                  download={`TechPulse_Report_${vehicleLabel.replace(/\s+/g, '_')}.pdf`}
                  style={{ display: 'inline-block', background: '#1F5C8C', color: '#fff', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}
                >
                  Download PDF
                </a>
              </div>
            )}
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, color: '#aaa', fontSize: 12 }}>
          Powered by TechPulse · Faster diagnostics. Smarter technicians.
        </div>
      </div>
    </div>
  );
}

const h2s: React.CSSProperties = { margin: '0 0 8px', fontSize: 18, color: '#0a1a3a' };

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: 24 }}>{children}</div>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: '#1F5C8C', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>{children}</div>;
}

'use client';

const DOWNLOAD_URL = 'https://github.com/ddoubleg123/techpulse-remotepc-automation/releases/download/connector-v4/TechPulseConnectorSetup-v4-WithAPI.exe';
const VERSION = 'v4';
const FILE_SIZE = '24 MB';

export default function SyncPage() {
  const navy = '#1B3A6B';
  const teal = '#2E75B6';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800, color: navy }}>TechPulse Connector</h1>
        <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
          Install the Connector on your Windows shop PC. It watches the folders where your diagnostic tools save scan exports and sends those files to TechPulse automatically — no manual uploads needed.
        </p>
      </div>

      {/* Download card */}
      <div style={{ background: `linear-gradient(135deg, ${navy}, ${teal})`, borderRadius: 16, padding: '28px 32px', marginBottom: 20, color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', opacity: 0.75, textTransform: 'uppercase', marginBottom: 4 }}>Windows Installer</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>TechPulse Connector {VERSION}</div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>{FILE_SIZE} &nbsp;&bull;&nbsp; Windows 10 / 11 &nbsp;&bull;&nbsp; 64-bit</div>
          </div>
          <a
            href={DOWNLOAD_URL}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'white', color: navy,
              padding: '13px 24px', borderRadius: 12,
              fontWeight: 700, fontSize: 15, textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Connector
          </a>
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: 'white', border: '1px solid #E0E0E0', borderRadius: 16, padding: '24px', marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: navy }}>How to install</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { n: '1', title: 'Download the installer', desc: 'Click the Download Connector button above to download the official TechPulse Connector for Windows.' },
            { n: '2', title: 'Run the setup', desc: 'Double-click TechPulseConnectorSetup-v4-WithAPI.exe to launch the installer, then follow the on-screen prompts.' },
            { n: '3', title: 'It finds your scanner exports', desc: 'Once installed, the Connector watches the folders where your diagnostic tools save scan exports and syncs those files to your TechPulse account. No manual uploads needed.' },
          ].map(step => (
            <div key={step.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${navy}, ${teal})`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{step.n}</div>
              <div>
                <p style={{ margin: '4px 0 2px', fontWeight: 600, fontSize: 14, color: navy }}>{step.title}</p>
                <p style={{ margin: 0, fontSize: 13, color: '#555', lineHeight: 1.5 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What it finds */}
      <div style={{ background: 'white', border: '1px solid #E0E0E0', borderRadius: 16, padding: '24px', marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: navy }}>What the Connector does</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { icon: '📁', label: 'Reads scanner exports only', desc: 'Accesses the folders where your diagnostic tools save scan files — not the rest of your PC' },
            { icon: '📤', label: 'Sends to TechPulse', desc: 'Uploads those scan files to Synth for AI diagnosis' },
            { icon: '🔄', label: 'Stays in sync', desc: 'Watches those folders for new scan exports as you work' },
            { icon: '🔒', label: 'Your account only', desc: 'Files go directly from your PC to your TechPulse account over an encrypted connection' },
          ].map(item => (
            <div key={item.label} style={{ background: '#F8F9FA', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
              <p style={{ margin: '0 0 3px', fontWeight: 600, fontSize: 13, color: navy }}>{item.label}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#777' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Requirements */}
      <div style={{ background: '#F8F9FA', border: '1px solid #E8E8E8', borderRadius: 12, padding: '16px 20px' }}>
        <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
          <strong style={{ color: navy }}>System requirements:</strong> Windows 10 or 11 (64-bit) &nbsp;&bull;&nbsp; Internet connection &nbsp;&bull;&nbsp; TechPulse account required
        </p>
      </div>

    </div>
  );
}


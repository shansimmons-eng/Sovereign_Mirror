interface ModuleStubProps {
  pillar: number;
  title: string;
  subtitle: string;
  description: string;
}

export function ModuleStub({ pillar, title, subtitle, description }: ModuleStubProps) {
  return (
    <div style={{
      fontFamily: 'monospace',
      color: '#e0e0e0',
      background: '#0a0a0f',
      minHeight: '60vh',
      padding: '2rem',
      borderTop: '1px solid rgba(255,183,0,0.2)',
    }}>
      <div style={{ color: 'rgba(255,183,0,0.5)', fontSize: '0.7rem', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>
        PILLAR {pillar} — CORE MODULE
      </div>
      <h2 style={{ color: '#FFB300', fontSize: '1.4rem', margin: '0 0 0.25rem' }}>{title}</h2>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{subtitle}</div>
      <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '640px', lineHeight: 1.7, fontSize: '0.9rem' }}>
        {description}
      </p>
      <div style={{
        marginTop: '2rem',
        padding: '1rem 1.5rem',
        border: '1px solid rgba(255,183,0,0.15)',
        color: 'rgba(255,255,255,0.3)',
        fontSize: '0.75rem',
        letterSpacing: '0.1em',
      }}>
        INTERACTIVE MODULE IN DEVELOPMENT
      </div>
    </div>
  );
}

import { useHUDStore } from '../../state/stores/hudStore';

export function Background() {
  const sunriseOpacity = useHUDStore((s) => s.sunriseOpacity);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        background: `
          radial-gradient(ellipse 120% 60% at 50% 100%,
            rgba(251, 146, 60, ${sunriseOpacity * 0.4}) 0%,
            rgba(244, 63, 94, ${sunriseOpacity * 0.2}) 40%,
            transparent 70%
          ),
          radial-gradient(ellipse 80% 40% at 50% 100%,
            rgba(244, 63, 94, ${sunriseOpacity * 0.3}) 0%,
            transparent 60%
          ),
          #0F172A
        `,
        transition: 'background 0.5s ease-out',
      }}
    />
  );
}
import { useHUDStore } from '../../state/stores/hudStore';

export function Background() {
  const sunriseOpacity = useHUDStore((s) => s.sunriseOpacity);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        background: `
          radial-gradient(ellipse 120% 60% at 50% 100%,
            rgba(255, 179, 0, ${sunriseOpacity * 0.3}) 0%,
            rgba(255, 179, 0, ${sunriseOpacity * 0.15}) 40%,
            transparent 70%
          ),
          radial-gradient(ellipse 80% 40% at 50% 100%,
            rgba(255, 255, 255, ${sunriseOpacity * 0.1}) 0%,
            transparent 60%
          ),
          #0A0A0A
        `,
        transition: 'background 0.5s ease-out',
      }}
    />
  );
}
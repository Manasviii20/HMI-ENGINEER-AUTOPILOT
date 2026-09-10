import { useMemo } from "react";

/**
 * Purely presentational animated diagram of the physical packaging line —
 * a Packet-Tracer-style visualization of the SAME tag values already shown
 * as numbers elsewhere on the page. It reads props only; it never calls the
 * API and has no effect on any engineering logic.
 */
export interface PlantSceneProps {
  motorRunning: boolean;
  conveyorRunning: boolean;
  speed: number; // RPM, used to vary animation speed
  temperature: number; // C, used to tint the motor
  overload: boolean;
  emergencyStop: boolean;
  productSensor: boolean;
  communication: boolean;
  activeAlarmCount: number;
}

function tempColor(temp: number): string {
  if (temp >= 85) return "#ff4d4f";
  if (temp >= 70) return "#ff7043";
  if (temp >= 45) return "#f5a623";
  return "#2fb3ff";
}

export function PlantScene(props: PlantSceneProps) {
  const {
    motorRunning,
    conveyorRunning,
    speed,
    temperature,
    overload,
    emergencyStop,
    productSensor,
    communication,
    activeAlarmCount,
  } = props;

  const running = motorRunning && conveyorRunning && !emergencyStop;
  const beltPeriod = useMemo(() => {
    // Faster belt animation at higher speed; clamp to a sane range so it
    // never becomes nauseating or freezes entirely.
    const clamped = Math.max(20, Math.min(speed, 120));
    return `${(2.4 - clamped / 100).toFixed(2)}s`;
  }, [speed]);

  const motorColor = overload ? "#ff4d4f" : tempColor(temperature);
  const packages = [0, 1, 2, 3];

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[#0b121a] p-3 overflow-hidden">
      <svg viewBox="0 0 640 220" className="w-full h-auto" role="img" aria-label="Live packaging line diagram">
        <defs>
          <clipPath id="beltClip">
            <rect x="60" y="150" width="420" height="16" rx="3" />
          </clipPath>
          <radialGradient id="motorGrad" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#2a3a4a" />
            <stop offset="100%" stopColor="#111a24" />
          </radialGradient>
        </defs>

        {/* floor */}
        <rect x="0" y="190" width="640" height="30" fill="#0d151f" />
        <line x1="0" y1="190" x2="640" y2="190" stroke="var(--border)" strokeWidth="1" />

        {/* conveyor frame */}
        <rect x="55" y="146" width="430" height="24" rx="5" fill="#16202c" stroke="var(--border)" />
        <rect x="60" y="150" width="420" height="16" rx="3" fill="#0d151f" />
        {/* belt motion chevrons */}
        <g clipPath="url(#beltClip)">
          <g
            className={running ? "anim-belt" : ""}
            style={running ? { animationDuration: beltPeriod } : undefined}
          >
            {Array.from({ length: 30 }).map((_, i) => (
              <path
                key={i}
                d={`M ${i * 20 - 10} 150 l 6 16 l 6 -16`}
                stroke={running ? "#2fb3ff" : "#33465a"}
                strokeWidth="2"
                fill="none"
                opacity={0.6}
              />
            ))}
          </g>
        </g>
        {/* support legs */}
        <rect x="80" y="170" width="8" height="20" fill="#2a3a4a" />
        <rect x="450" y="170" width="8" height="20" fill="#2a3a4a" />

        {/* packages riding the belt */}
        {running &&
          packages.map((i) => (
            <rect
              key={i}
              x="0"
              y="128"
              width="22"
              height="18"
              rx="2"
              fill="#c98a4b"
              stroke="#7a5327"
              style={{
                animation: `plant-package-move ${(4.5 - speed / 40).toFixed(2)}s linear ${i * 1.1}s infinite`,
              }}
            />
          ))}

        {/* product sensor at belt exit */}
        <g transform="translate(470, 120)">
          <rect x="-4" y="0" width="8" height="34" fill="#2a3a4a" />
          <circle
            cx="0"
            cy="0"
            r="6"
            fill={productSensor ? "#35c76a" : "#3a4a5a"}
            className={productSensor && running ? "anim-pulse" : ""}
            style={{ color: "#35c76a" }}
          />
        </g>
        <text x="470" y="112" textAnchor="middle" fontSize="9" fill="var(--text-dim)">
          SENSOR
        </text>

        {/* motor housing */}
        <g transform="translate(40, 158)">
          <circle r="34" fill="url(#motorGrad)" stroke={motorColor} strokeWidth="2.5" />
          <g className={running ? "anim-spin" : overload ? "anim-flicker" : ""}>
            <rect x="-3" y="-26" width="6" height="52" rx="3" fill={motorColor} opacity="0.85" />
            <rect x="-26" y="-3" width="52" height="6" rx="3" fill={motorColor} opacity="0.85" />
            <rect x="-19" y="-19" width="38" height="6" rx="3" fill={motorColor} opacity="0.5" transform="rotate(45)" />
            <rect x="-19" y="-19" width="38" height="6" rx="3" fill={motorColor} opacity="0.5" transform="rotate(-45)" />
          </g>
          <circle r="6" fill={motorColor} />
        </g>
        <text x="40" y="204" textAnchor="middle" fontSize="10" fill="var(--text-dim)" fontWeight={600}>
          MOTOR_01
        </text>
        <text x="40" y="216" textAnchor="middle" fontSize="9" className="mono" fill={motorColor}>
          {speed.toFixed(0)} rpm · {temperature.toFixed(0)}°C
        </text>

        {/* overload warning */}
        {overload && (
          <g transform="translate(40, 108)" className="anim-flicker">
            <path d="M0 -14 L12 10 L-12 10 Z" fill="#ff4d4f" stroke="#7a1010" strokeWidth="1.5" />
            <text x="0" y="6" textAnchor="middle" fontSize="12" fill="#1a0303" fontWeight={700}>
              !
            </text>
          </g>
        )}

        {/* emergency stop button */}
        <g transform="translate(560, 60)">
          <rect x="-30" y="-30" width="60" height="60" rx="8" fill="#16202c" stroke="var(--border)" />
          <circle
            r="20"
            fill={emergencyStop ? "#ff4d4f" : "#7a1010"}
            className={emergencyStop ? "anim-flash" : ""}
            stroke="#3a0808"
            strokeWidth="2"
          />
          <text x="0" y="42" textAnchor="middle" fontSize="9" fill="var(--text-dim)">
            E-STOP
          </text>
        </g>

        {/* comms / signal tower */}
        <g transform="translate(560, 150)">
          <rect x="-3" y="0" width="6" height="30" fill="#2a3a4a" />
          <circle
            cx="0"
            cy="-6"
            r="7"
            fill={communication ? "#35c76a" : "#ff4d4f"}
            className={communication ? "anim-pulse" : "anim-flash"}
          />
          {communication ? (
            <>
              <path d="M -14 -14 A 20 20 0 0 1 14 -14" stroke="#35c76a" strokeWidth="2" fill="none" opacity="0.5" />
              <path d="M -20 -20 A 28 28 0 0 1 20 -20" stroke="#35c76a" strokeWidth="1.5" fill="none" opacity="0.3" />
            </>
          ) : (
            <path d="M -8 -14 L 8 2 M 8 -14 L -8 2" stroke="#ff4d4f" strokeWidth="2" />
          )}
          <text x="0" y="44" textAnchor="middle" fontSize="9" fill="var(--text-dim)">
            PLC COMMS
          </text>
        </g>

        {/* alarm beacon */}
        {activeAlarmCount > 0 && (
          <g transform="translate(40, 100)">
            <circle r="9" fill="#ff7043" className="anim-flash" />
            <path d="M0 -9 L0 -18" stroke="#ff7043" strokeWidth="2" />
          </g>
        )}

        <style>{`
          @keyframes plant-package-move {
            from { transform: translateX(60px); opacity: 0; }
            5% { opacity: 1; }
            95% { opacity: 1; }
            to { transform: translateX(468px); opacity: 0; }
          }
        `}</style>
      </svg>

      <div className="flex items-center justify-between mt-2 text-[10px] text-[var(--text-dim)] px-1">
        <span>Live physical process view — driven by the same tag values shown below</span>
        <span className={`font-semibold ${running ? "text-emerald-400" : "text-[var(--text-dim)]"}`}>
          {emergencyStop ? "E-STOPPED" : running ? "RUNNING" : "STOPPED"}
        </span>
      </div>
    </div>
  );
}

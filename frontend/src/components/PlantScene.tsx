import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/**
 * Interactive topology diagram of the packaging line's control devices --
 * styled like a network/SCADA topology editor (drag devices to rearrange,
 * click one to inspect its live values in a side panel), not a literal
 * animated cartoon of the physical line. Purely presentational: it reads
 * props only, driven by the SAME tag values shown as numbers elsewhere on
 * the page, and never calls the API.
 */
export interface PlantSceneProps {
  motorRunning: boolean;
  conveyorRunning: boolean;
  speed: number;
  temperature: number;
  overload: boolean;
  emergencyStop: boolean;
  productSensor: boolean;
  communication: boolean;
  activeAlarmCount: number;
}

type DeviceType = "plc" | "motor" | "conveyor" | "sensor" | "estop" | "alarms";

interface DeviceDef {
  id: string;
  type: DeviceType;
  label: string;
  tag: string;
}

const DEVICES: DeviceDef[] = [
  { id: "plc", type: "plc", label: "PLC_01", tag: "PLC_Communication" },
  { id: "motor", type: "motor", label: "MOTOR_01", tag: "Motor_01_Speed" },
  { id: "conveyor", type: "conveyor", label: "CONVEYOR_01", tag: "Conveyor_01_Run" },
  { id: "sensor", type: "sensor", label: "PRODUCT_SENSOR", tag: "Product_Sensor" },
  { id: "estop", type: "estop", label: "E_STOP_01", tag: "Emergency_Stop" },
  { id: "alarms", type: "alarms", label: "ALARM_PANEL", tag: "" },
];

const DEFAULT_POS: Record<string, { x: number; y: number }> = {
  plc: { x: 130, y: 230 },
  motor: { x: 410, y: 80 },
  conveyor: { x: 660, y: 80 },
  sensor: { x: 660, y: 230 },
  estop: { x: 410, y: 380 },
  alarms: { x: 660, y: 380 },
};

const LED_OK = "#3aa76d";
const LED_WARN = "#c9891a";
const LED_FAULT = "#d64545";
const LED_OFF = "#556170";
const WIRE = "var(--border)";
const WIRE_ACTIVE = "var(--accent)";

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

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [positions, setPositions] = useState(DEFAULT_POS);
  const [selected, setSelected] = useState<string>("motor");
  const dragState = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const running = motorRunning && conveyorRunning && !emergencyStop;

  function toSvgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function handlePointerDown(id: string, e: ReactPointerEvent<SVGGElement>) {
    e.stopPropagation();
    const p = toSvgPoint(e.clientX, e.clientY);
    const pos = positions[id];
    dragState.current = { id, dx: p.x - pos.x, dy: p.y - pos.y };
    setSelected(id);
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* some pointer ids (synthetic/edge-case events) aren't capturable -- dragging still works via document-level move/up */
    }
  }

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragState.current;
    if (!drag) return;
    const p = toSvgPoint(e.clientX, e.clientY);
    setPositions((prev) => ({
      ...prev,
      [drag.id]: {
        x: Math.max(50, Math.min(750, p.x - drag.dx)),
        y: Math.max(40, Math.min(420, p.y - drag.dy)),
      },
    }));
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  function deviceStatus(type: DeviceType): { color: string; readout: string } {
    switch (type) {
      case "plc":
        return { color: communication ? LED_OK : LED_FAULT, readout: communication ? "LINKED" : "NO LINK" };
      case "motor":
        if (overload) return { color: LED_FAULT, readout: "OVERLOAD" };
        if (!motorRunning) return { color: LED_OFF, readout: "STOPPED" };
        if (temperature >= 85) return { color: LED_FAULT, readout: `${speed.toFixed(0)} RPM` };
        if (temperature >= 70) return { color: LED_WARN, readout: `${speed.toFixed(0)} RPM` };
        return { color: LED_OK, readout: `${speed.toFixed(0)} RPM` };
      case "conveyor":
        return { color: conveyorRunning ? LED_OK : LED_OFF, readout: conveyorRunning ? "MOVING" : "IDLE" };
      case "sensor":
        return { color: productSensor ? LED_OK : LED_OFF, readout: productSensor ? "DETECT" : "CLEAR" };
      case "estop":
        return { color: emergencyStop ? LED_FAULT : LED_OK, readout: emergencyStop ? "PRESSED" : "NORMAL" };
      case "alarms":
        return { color: activeAlarmCount > 0 ? LED_FAULT : LED_OK, readout: `${activeAlarmCount} ACTIVE` };
    }
  }

  function renderIcon(type: DeviceType, color: string) {
    const stroke = "var(--text-dim)";
    switch (type) {
      case "plc":
        return (
          <g>
            <rect x="-22" y="-26" width="44" height="52" rx="3" fill="var(--panel)" stroke={stroke} strokeWidth="1.5" />
            {[-16, -6, 4, 14].map((y) => (
              <rect key={y} x="-16" y={y} width="32" height="6" rx="1" fill="var(--panel-2)" stroke={stroke} strokeWidth="1" />
            ))}
            <circle cx="14" cy="-3" r="2" fill={color} />
          </g>
        );
      case "motor": {
        return (
          <g>
            <circle r="24" fill="var(--panel)" stroke={stroke} strokeWidth="1.5" />
            <text textAnchor="middle" dy="5" fontSize="16" fontWeight={700} fill={stroke}>
              M
            </text>
            <g className={running ? "anim-spin-slow" : ""}>
              <line x1="0" y1="0" x2="0" y2="-24" stroke={color} strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>
        );
      }
      case "conveyor":
        return (
          <g>
            <rect x="-28" y="-10" width="56" height="20" rx="4" fill="var(--panel)" stroke={stroke} strokeWidth="1.5" />
            {[-18, -6, 6, 18].map((x) => (
              <circle key={x} cx={x} cy="0" r="3" fill="var(--panel-2)" stroke={stroke} strokeWidth="1" />
            ))}
            <path
              d="M -30 -16 L 18 -16"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="6 5"
              opacity={conveyorRunning ? 1 : 0.3}
              className={conveyorRunning ? "anim-belt" : ""}
            />
          </g>
        );
      case "sensor":
        return (
          <g>
            <rect x="-10" y="-16" width="20" height="32" rx="2" fill="var(--panel)" stroke={stroke} strokeWidth="1.5" />
            <circle cx="0" cy="0" r="4" fill={color} />
            <path d="M 10 0 L 26 0" stroke={color} strokeWidth="1.5" strokeDasharray={productSensor ? "0" : "3 3"} opacity="0.8" />
          </g>
        );
      case "estop":
        return (
          <g>
            <path
              d="M -18 -7 L -7 -18 L 7 -18 L 18 -7 L 18 7 L 7 18 L -7 18 L -18 7 Z"
              fill="var(--panel)"
              stroke={stroke}
              strokeWidth="1.5"
            />
            <circle r="10" fill={color} className={emergencyStop ? "anim-flash" : ""} />
          </g>
        );
      case "alarms":
        return (
          <g>
            <path d="M -16 14 L 0 -16 L 16 14 Z" fill="var(--panel)" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
            <text textAnchor="middle" y="10" fontSize="11" fontWeight={700} fill={color}>
              {activeAlarmCount}
            </text>
          </g>
        );
    }
  }

  const selectedDevice = DEVICES.find((d) => d.id === selected) ?? DEVICES[1];
  const selectedStatus = deviceStatus(selectedDevice.type);

  return (
    <div className="rounded-lg border border-[var(--border)] overflow-hidden" style={{ background: "var(--panel-2)" }}>
      {/* technical status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)] text-[10px] mono" style={{ background: "var(--panel)" }}>
        <span className="text-[var(--text-dim)]">
          TOPOLOGY VIEW -- click a device to inspect, drag to rearrange
        </span>
        <span className={running ? "text-emerald-400" : emergencyStop ? "text-red-400" : "text-[var(--text-dim)]"}>
          {emergencyStop ? "● E-STOPPED" : running ? "● RUNNING" : "● STOPPED"}
        </span>
      </div>

      <div className="flex flex-col md:flex-row">
        <svg
          ref={svgRef}
          viewBox="0 0 800 460"
          className="w-full md:w-2/3 h-auto touch-none select-none"
          role="img"
          aria-label="Interactive device topology diagram"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* subtle grid */}
          <defs>
            <pattern id="topoGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.4" />
            </pattern>
            <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" fill={WIRE} />
            </marker>
          </defs>
          <rect x="0" y="0" width="800" height="460" fill="url(#topoGrid)" />

          {/* wires: star topology from PLC to every device */}
          {DEVICES.filter((d) => d.id !== "plc").map((d) => {
            const a = positions.plc;
            const b = positions[d.id];
            const isSelected = selected === d.id || selected === "plc";
            return (
              <line
                key={d.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={isSelected ? WIRE_ACTIVE : WIRE}
                strokeWidth={isSelected ? 1.75 : 1.25}
                markerEnd="url(#arrow)"
                className="transition-all duration-200"
              />
            );
          })}

          {/* devices */}
          {DEVICES.map((d) => {
            const pos = positions[d.id];
            const status = deviceStatus(d.type);
            const isSelected = selected === d.id;
            return (
              <g
                key={d.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onPointerDown={(e) => handlePointerDown(d.id, e)}
                style={{ cursor: "grab" }}
                className="transition-opacity duration-150"
              >
                {isSelected && (
                  <circle r="34" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 3" className="anim-spin-slow" opacity="0.6" />
                )}
                {renderIcon(d.type, status.color)}
                <circle cx="18" cy="-18" r="4" fill={status.color} className={status.color === LED_FAULT ? "anim-flash" : status.color === LED_OK ? "anim-pulse" : ""} />
                <text textAnchor="middle" y="42" fontSize="10" fontWeight={600} fill="var(--text)">
                  {d.label}
                </text>
                <text textAnchor="middle" y="54" fontSize="9" className="mono" fill="var(--text-dim)">
                  {status.readout}
                </text>
              </g>
            );
          })}
        </svg>

        {/* inspector panel */}
        <div className="md:w-1/3 border-t md:border-t-0 md:border-l border-[var(--border)] p-3 flex flex-col gap-2" style={{ background: "var(--panel)" }}>
          <div className="flex items-center gap-2">
            <span className="status-dot" style={{ background: selectedStatus.color }} />
            <span className="text-sm font-semibold">{selectedDevice.label}</span>
          </div>
          <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">Device Inspector</div>
          <DeviceProperties device={selectedDevice} props={props} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-xs mono py-1 border-b border-[var(--border)] last:border-b-0">
      <span className="text-[var(--text-dim)]">{label}</span>
      <span className={highlight ? "text-red-400 font-semibold" : ""}>{value}</span>
    </div>
  );
}

function DeviceProperties({ device, props }: { device: DeviceDef; props: PlantSceneProps }) {
  switch (device.type) {
    case "plc":
      return (
        <div className="mt-1">
          <Row label="Communication" value={props.communication ? "CONNECTED" : "LOST"} highlight={!props.communication} />
          <Row label="Bound tag" value="PLC_Communication" />
          <Row label="Active alarms" value={String(props.activeAlarmCount)} highlight={props.activeAlarmCount > 0} />
        </div>
      );
    case "motor":
      return (
        <div className="mt-1">
          <Row label="Running" value={props.motorRunning ? "TRUE" : "FALSE"} />
          <Row label="Speed" value={`${props.speed.toFixed(1)} rpm`} />
          <Row label="Temperature" value={`${props.temperature.toFixed(1)} °C`} highlight={props.temperature >= 85} />
          <Row label="Overload" value={props.overload ? "TRUE" : "FALSE"} highlight={props.overload} />
          <Row label="Bound tags" value="Motor_01_Run/Speed/Temperature" />
        </div>
      );
    case "conveyor":
      return (
        <div className="mt-1">
          <Row label="Running" value={props.conveyorRunning ? "TRUE" : "FALSE"} />
          <Row label="Bound tag" value="Conveyor_01_Run" />
        </div>
      );
    case "sensor":
      return (
        <div className="mt-1">
          <Row label="Product detected" value={props.productSensor ? "TRUE" : "FALSE"} />
          <Row label="Bound tag" value="Product_Sensor" />
        </div>
      );
    case "estop":
      return (
        <div className="mt-1">
          <Row label="Pressed" value={props.emergencyStop ? "TRUE" : "FALSE"} highlight={props.emergencyStop} />
          <Row label="Bound tag" value="Emergency_Stop" />
        </div>
      );
    case "alarms":
      return (
        <div className="mt-1">
          <Row label="Active count" value={String(props.activeAlarmCount)} highlight={props.activeAlarmCount > 0} />
          <Row label="Source" value="live validation against simulator tags" />
        </div>
      );
  }
}

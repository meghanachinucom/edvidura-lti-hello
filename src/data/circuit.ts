export const circuitSettings = {
  voltage: { min: 110, max: 415, step: 1, initial: 230 },
  resistance: { min: 10, max: 200, step: 1, initial: 23 },
  breakerAmps: 16,
};
export type CircuitFault = "overcurrent" | "earth";
export function calculateCircuit(voltage: number, resistance: number, earthed: boolean) {
  const current = voltage / resistance;
  return {
    current,
    power: voltage * current,
    fault: (current > circuitSettings.breakerAmps ? "overcurrent" : !earthed ? "earth" : null) as CircuitFault | null,
  };
}
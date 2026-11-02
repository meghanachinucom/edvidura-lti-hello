import type { Role } from "./people";

/** M1 demo sign-in accounts. Mock only; passwords are not stored (any 1+ characters accepted). */
export interface DemoAccount { name: string; role: Role; username: string }

export const demoAccounts: DemoAccount[] = [
  { name: "Alice Nguyen", role: "learner", username: "riverside_alice" },
  { name: "Priya Shah", role: "instructor", username: "riverside_priya" },
  { name: "Riverside Admin", role: "trainingOfficer", username: "riverside_admin" },
];

/** M1 launch-hub figures. Fixed mock numbers from the brief, independent of other data modules. */
export const learnerHub = { lessonsDone: 2, lessonsTotal: 5, ringPercent: 40 };

export const teacherHub = { attempts: 96, avgScore: "67%", passRate: "62.5%", passMark: "60%" };

export const adminHub = { classes: 3, teachers: 12, students: 96 };

export interface HubClass { code: string; name: string; bound: boolean }
export const adminHubClasses: HubClass[] = [
  { code: "ELE-A", name: "Electrician, Batch A", bound: true },
  { code: "ELE-B", name: "Electrician, Batch B", bound: false },
  { code: "ELE-C", name: "Electrician, Batch C", bound: true },
];

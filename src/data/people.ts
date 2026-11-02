export type Role = "learner" | "instructor" | "trainingOfficer";
export type ClassCode = "ELE-A" | "ELE-B";

export interface Person { id: string; name: string; role: Role; classCode?: ClassCode }

export const meena: Person = { id: "p-meena", name: "Meena Rathod", role: "learner", classCode: "ELE-A" };
export const suresh: Person = { id: "p-suresh", name: "Suresh Iyer", role: "instructor" };
export const farhan: Person = { id: "p-farhan", name: "Farhan Qureshi", role: "instructor" };
export const gurpreet: Person = { id: "p-gurpreet", name: "Gurpreet Kaur", role: "trainingOfficer" };

export const instructors: Person[] = [suresh, farhan];

/** Exactly 8 learners. */
export const learners: Person[] = [
  meena,
  { id: "p-arjun", name: "Arjun Das", role: "learner", classCode: "ELE-A" },
  { id: "p-lakshmi", name: "Lakshmi Reddy", role: "learner", classCode: "ELE-A" },
  { id: "p-imran", name: "Imran Shaikh", role: "learner", classCode: "ELE-A" },
  { id: "p-pooja", name: "Pooja Yadav", role: "learner", classCode: "ELE-B" },
  { id: "p-joseph", name: "Joseph Mathew", role: "learner", classCode: "ELE-B" },
  { id: "p-bikash", name: "Bikash Gogoi", role: "learner", classCode: "ELE-B" },
  { id: "p-sneha", name: "Sneha Patil", role: "learner", classCode: "ELE-B" },
];

/** The signed-in person for each prototype role. */
export const currentUsers: Record<Role, Person> = { learner: meena, instructor: suresh, trainingOfficer: gurpreet };

export const personById = (id: string) => [...learners, ...instructors, gurpreet].find((p) => p.id === id);

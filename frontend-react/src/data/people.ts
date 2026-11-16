export type Role = "learner" | "instructor" | "trainingOfficer";
export type ClassCode = "ELE-A" | "ELE-B";

export interface Person {
  id: string;
  name: string;
  role: Role;
  classCode?: ClassCode;
}

export const alice: Person = {
  id: "p-alice",
  name: "Alice Nguyen",
  role: "learner",
  classCode: "ELE-A",
};
export const priya: Person = { id: "p-priya", name: "Priya Sharma", role: "instructor" };
export const riversideAdmin: Person = {
  id: "p-admin",
  name: "Riverside Admin",
  role: "trainingOfficer",
};

export const meena: Person = {
  id: "p-meena",
  name: "Meena Rathod",
  role: "learner",
  classCode: "ELE-A",
};
export const suresh: Person = { id: "p-suresh", name: "Suresh Iyer", role: "instructor" };
export const farhan: Person = { id: "p-farhan", name: "Farhan Qureshi", role: "instructor" };
export const gurpreet: Person = {
  id: "p-gurpreet",
  name: "Gurpreet Kaur",
  role: "trainingOfficer",
};

export const instructors: Person[] = [priya, suresh, farhan];

/** Exactly 8 learners. */
export const learners: Person[] = [
  alice,
  meena,
  { id: "p-arjun", name: "Arjun Das", role: "learner", classCode: "ELE-A" },
  { id: "p-lakshmi", name: "Lakshmi Reddy", role: "learner", classCode: "ELE-A" },
  { id: "p-imran", name: "Imran Shaikh", role: "learner", classCode: "ELE-A" },
  { id: "p-pooja", name: "Pooja Yadav", role: "learner", classCode: "ELE-B" },
  { id: "p-joseph", name: "Joseph Mathew", role: "learner", classCode: "ELE-B" },
  { id: "p-bikash", name: "Bikash Gogoi", role: "learner", classCode: "ELE-B" },
  { id: "p-sneha", name: "Sneha Patil", role: "learner", classCode: "ELE-B" },
];

/** The signed-in person for each prototype role. Exclusively Riverside Demo accounts. */
export const currentUsers: Record<Role, Person> = {
  learner: alice,
  instructor: priya,
  trainingOfficer: riversideAdmin,
};

export const personById = (id: string) =>
  [...learners, ...instructors, gurpreet, riversideAdmin].find((p) => p.id === id);

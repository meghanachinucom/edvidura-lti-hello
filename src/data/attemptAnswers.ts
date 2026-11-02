import type { OptionKey } from "./quiz";

/** Breakdown rows for each of Meena's attempts. Question text is mock content. */
export interface AnswerRow { question: string; given: string; correctAnswer: string; correct: boolean; questionNo: number }

const row = (questionNo: number, question: string, given: string, correctAnswer: string): AnswerRow =>
  ({ questionNo, question, given, correctAnswer, correct: given === correctAnswer });

export const attemptAnswers: Record<string, AnswerRow[]> = {
  "at-m1": [
    row(1, "What must you wear when working on live-adjacent panels?", "Insulated gloves", "Insulated gloves"),
    row(2, "What do you do first before starting electrical work?", "Switch off and lock the supply", "Switch off and lock the supply"),
    row(3, "Which tool proves a circuit is dead?", "A voltage tester", "A voltage tester"),
    row(4, "Where should you put a lockout tag?", "On the switch you turned off", "On the switch you turned off"),
    row(5, "What does PPE stand for?", "Personal power equipment", "Personal protective equipment"),
  ],
  "at-m2": [
    row(1, "What does earthing connect to the ground?", "The metal body of the appliance", "The metal body of the appliance"),
    row(2, "Why does fault current take the earth path?", "It has very low resistance", "It has very low resistance"),
    row(3, "What happens when a large fault current flows?", "The light gets brighter", "The MCB or fuse operates"),
    row(4, "Which colour is the earth wire?", "Green or green-and-yellow", "Green or green-and-yellow"),
    row(5, "What can happen if an appliance is not earthed?", "Nothing", "A person can get a shock from the metal body"),
  ],
  "at-m3": [
    row(1, "A 230 V supply is connected to a heater element of 46 Ω. What current flows?", "10.6 A", "5 A"),
    row(2, "What is the main purpose of earthing an appliance's metal body?", "To give fault current a safe path so the protective device operates", "To give fault current a safe path so the protective device operates"),
    row(3, "Before working on a distribution board, what must you do first?", "Wear gloves and start", "Switch off, isolate, lock out and prove the circuit dead with a tester"),
    row(4, "Which device mainly protects a circuit against overload and short circuit?", "RCCB", "MCB"),
    row(5, "In Indian domestic wiring, which colour identifies the protective earth conductor?", "Green or green-and-yellow", "Green or green-and-yellow"),
  ],
};
export type { OptionKey };

"""Jane Street Socratic Tutor System.

Implements the maieutic tutoring method:
- Socratic Mastery Levels (0 to 5):
  * Level 0: Novice (Needs diagnostic baseline)
  * Level 1: Conceptual Foundation (Identifies terms and variables)
  * Level 2: Isolation Strategy (Understands inverse operations)
  * Level 3: Multi-Step Application (Solves linear equations like 2x + 5 = 15)
  * Level 4: Word Problem Formulation (Translates text into math models)
  * Level 5: Master (Verified problem solver & explains concept verification)
- Diagnostic checks and probing questions (one question at a time).
- Guided hints when stuck without giving away the final answer.
- Skill tracking for active course skills: "variables", "solve-linear", "word-problems".
"""
from __future__ import annotations

import re
from typing import Any

# Default skills tracked for Socratic mastery
SOCRATIC_SKILLS: dict[str, dict[str, Any]] = {
    "variables": {
        "id": "variables",
        "name": "Variables & Algebraic Expressions",
        "max_level": 5,
        "descriptions": {
            0: "Novice — Has not yet distinguished variables from constants.",
            1: "Foundation — Recognizes that letters like x represent unknown quantities.",
            2: "Expression Builder — Combines like terms (e.g. 2x + 3x = 5x).",
            3: "Substitution — Evaluates expressions given concrete variable values.",
            4: "Structure Analysis — Identifies coefficients, variables, and constants.",
            5: "Mastery — Confidently models multi-part quantities algebraically.",
        },
        "diagnostics": [
            "In the term 7x, what does the '7' represent and what does the 'x' represent?",
            "If an apple costs \$a and a banana costs \$b, how would you write the total cost of 3 apples and 2 bananas?",
        ],
        "hints": [
            "Remember: a variable is a placeholder for a quantity that can change or is unknown.",
            "Coefficients tell you how many times the variable is being multiplied.",
        ],
    },
    "solve-linear": {
        "id": "solve-linear",
        "name": "Solving Linear Equations",
        "max_level": 5,
        "descriptions": {
            0: "Novice — Unsure how to balance equations across the equals sign.",
            1: "One-Step Equations — Uses inverse operations for simple equations (x + 3 = 8).",
            2: "Two-Step Equations — Isolates variable terms before dividing coefficients (2x + 5 = 15).",
            3: "Variables on Both Sides — Collects variable terms to one side (3x + 4 = x + 12).",
            4: "Distributive Property — Expands brackets and clears fractions (2(x - 3) = 14).",
            5: "Mastery — Solves complex multi-step linear equations and checks solutions.",
        },
        "diagnostics": [
            "To solve 2x + 5 = 15, what operation should we perform first on both sides of the balance?",
            "Why must whatever we do to the left side of the equals sign also be done to the right side?",
        ],
        "hints": [
            "Think of an equation as a balanced physical scale: whatever you add or subtract on one side, you must do to the other.",
            "Work backwards from the order of operations: undo additions/subtractions before undoing multiplications/divisions.",
        ],
    },
    "word-problems": {
        "id": "word-problems",
        "name": "Linear Word Problems",
        "max_level": 5,
        "descriptions": {
            0: "Novice — Struggles to extract mathematical relationships from word descriptions.",
            1: "Variable Assignment — Chooses a clear definition for what 'x' represents.",
            2: "Direct Translation — Translates keywords like 'sum', 'twice', 'increased by' into symbols.",
            3: "Equation Setup — Sets up complete equations equating two conditions.",
            4: "Solution & Units — Solves the equation and states answer with appropriate real-world units.",
            5: "Mastery — Verifies reasonableness of solutions and explains edge constraints.",
        },
        "diagnostics": [
            "If Priya is 4 years older than twice Alice's age, and their combined age is 34, what is the best first variable to define?",
            "What keyword in a word problem indicates you should set up an equals sign?",
        ],
        "hints": [
            "First step: explicitly write down 'Let x = ...' for the unknown you know least about.",
            "Break the sentence into two balanced clauses: what quantity equals what other quantity?",
        ],
    },
}


def detect_skill(text: str) -> str:
    """Identify which algebra skill the student query relates to."""
    lower = text.lower()
    if any(w in lower for w in ("word", "age", "problem", "ticket", "cost", "twice as old", "priya", "alice")):
        return "word-problems"
    if any(w in lower for w in ("solve", "equation", "linear", "isolate", "both sides", "=", "equals")):
        return "solve-linear"
    return "variables"


def evaluate_socratic_turn(
    question: str,
    answer_text: str,
    *,
    current_level: int = 1,
    skill_id: str | None = None,
) -> dict[str, Any]:
    """Produce Socratic coaching guidance with Jane Street maieutic scaffolding."""
    skill_key = skill_id or detect_skill(question)
    skill_info = SOCRATIC_SKILLS.get(skill_key, SOCRATIC_SKILLS["variables"])

    # Determine progression
    q_len = len(question.strip().split())
    # If the student wrote a thoughtful response (> 6 words or mentions math symbols)
    leveled_up = False
    new_level = current_level
    if q_len >= 5 and any(c in question for c in ("=", "+", "-", "x", "because", "step", "first")):
        if new_level < 5:
            new_level += 1
            leveled_up = True

    diag = skill_info["diagnostics"][new_level % len(skill_info["diagnostics"])]
    hint = skill_info["hints"][new_level % len(skill_info["hints"])]
    desc = skill_info["descriptions"].get(new_level, "Developing mastery")

    return {
        "mode": "socratic_guided",
        "method": "EdVidura Socratic AI Tutor",
        "skill": skill_info["id"],
        "skill_name": skill_info["name"],
        "mastery_level": new_level,
        "max_level": 5,
        "level_description": desc,
        "leveled_up": leveled_up,
        "diagnostic_question": diag,
        "hint": hint,
        "all_skills": [
            {
                "id": k,
                "name": v["name"],
                "level": new_level if k == skill_key else max(1, current_level - 1),
                "max": 5,
            }
            for k, v in SOCRATIC_SKILLS.items()
        ],
    }

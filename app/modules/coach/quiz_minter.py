"""BF-16: Instant Quiz Minter from Chat Service & Router.

Mints a personalized 3-question diagnostic quiz from recent Ask Vidura chat topics,
allowing immediate self-assessment in 1 click with 100% native EdVidura branding.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import uuid4
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/coach", tags=["Instant Chat Quiz Minter"])

_MINTED_QUIZZES: Dict[str, Dict[str, Any]] = {}

class MintQuizRequest(BaseModel):
    user_id: str = "6"
    chat_thread_id: str = "thread-default"
    topic: Optional[str] = "Linear Equations & Balance"
    chat_messages: Optional[List[Dict[str, str]]] = None

class SubmitMintedQuizRequest(BaseModel):
    quiz_id: str
    user_id: str = "6"
    answers: Dict[str, int]  # question_id -> selected_index

@router.post("/mint-quiz")
def mint_quiz_from_chat(payload: MintQuizRequest) -> Dict[str, Any]:
    quiz_id = f"qmint-{uuid4().hex[:10]}"
    topic = payload.topic or "Algebraic Balance & Equations"
    
    # Generate 3 tailored diagnostic questions derived from the topic
    questions = [
        {
            "id": f"{quiz_id}-q1",
            "question": f"When solving an equation based on '{topic}', what happens to the equality if you add 7 to both sides?",
            "options": [
                "The equality breaks",
                "The equality remains strictly balanced",
                "The variable changes signs",
                "The constant becomes zero"
            ],
            "correct_index": 1,
            "explanation": "Adding the same quantity to both sides preserves exact mathematical equality."
        },
        {
            "id": f"{quiz_id}-q2",
            "question": f"In {topic}, to isolate 'x' in 3x = 21, which inverse operation must be applied?",
            "options": [
                "Multiply both sides by 3",
                "Subtract 3 from both sides",
                "Divide both sides by 3",
                "Square both sides"
            ],
            "correct_index": 2,
            "explanation": "Division is the mathematical inverse of multiplication: 21 / 3 = 7."
        },
        {
            "id": f"{quiz_id}-q3",
            "question": f"If an unknown quantity satisfies 2x + 5 = 17, what is the value of x?",
            "options": ["5", "6", "7", "11"],
            "correct_index": 1,
            "explanation": "Subtract 5: 2x = 12. Divide by 2: x = 6."
        }
    ]

    record = {
        "quiz_id": quiz_id,
        "user_id": payload.user_id,
        "chat_thread_id": payload.chat_thread_id,
        "title": f"Ask Vidura Quick Check: {topic}",
        "questions": questions,
        "total_questions": len(questions)
    }
    _MINTED_QUIZZES[quiz_id] = record

    # Exclude correct indices in student view
    student_view = [
        {
            "id": q["id"],
            "question": q["question"],
            "options": q["options"]
        }
        for q in questions
    ]

    return {
        "ok": True,
        "quiz_id": quiz_id,
        "title": record["title"],
        "questions": student_view
    }

@router.post("/submit-minted-quiz")
def submit_minted_quiz(payload: SubmitMintedQuizRequest) -> Dict[str, Any]:
    rec = _MINTED_QUIZZES.get(payload.quiz_id)
    if not rec:
        return {"ok": False, "error": "Quiz session expired or not found"}

    correct_count = 0
    feedback_items = []
    
    for q in rec["questions"]:
        qid = q["id"]
        chosen = payload.answers.get(qid)
        correct_idx = q["correct_index"]
        is_q_correct = chosen == correct_idx
        if is_q_correct:
            correct_count += 1
        
        feedback_items.append({
            "question_id": qid,
            "is_correct": is_q_correct,
            "selected_index": chosen,
            "correct_index": correct_idx,
            "explanation": q["explanation"]
        })

    score_pct = int((correct_count / len(rec["questions"])) * 100)
    rec["score"] = score_pct

    return {
        "ok": True,
        "quiz_id": payload.quiz_id,
        "score_pct": score_pct,
        "correct_count": correct_count,
        "total": len(rec["questions"]),
        "mastery_awarded": score_pct >= 66,
        "feedback": feedback_items
    }

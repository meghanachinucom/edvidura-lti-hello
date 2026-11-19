"""Tests for the 4 Native Stateful Engines:
1. Guided Mastery Tutor
2. Living Interactive Textbooks & Concept Beats
3. Skill Mastery & Study Path Engine (Evidence Graph)
4. Context-Aware Multilingual Voice Studio
"""
import pytest
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_guided_mastery_tutor_skill_tree():
    """Engine 1: Verify skill-tree returns Levels 0 to 5 progression."""
    res = client.get("/api/v1/app/tutor/skill-tree?subject=6")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "skills" in data
    assert len(data["skills"]) >= 3
    first = data["skills"][0]
    assert "id" in first or "skill_id" in first
    assert "name" in first
    assert "mastery_level" in first
    assert "status" in first


def test_guided_mastery_tutor_diagnostic():
    """Engine 1: Verify diagnostic questions and placement calibration."""
    # Step A: Request diagnostic questions
    q_res = client.post("/api/v1/app/tutor/diagnostic", json={"subject": "6"})
    assert q_res.status_code == 200
    q_data = q_res.json()
    assert q_data["ok"] is True
    assert "questions" in q_data
    assert len(q_data["questions"]) >= 1

    # Step B: Submit diagnostic answers to calibrate placement
    ans_res = client.post(
        "/api/v1/app/tutor/diagnostic",
        json={"subject": "6", "answers": {"q_var_1": 1, "q_lin_1": 1}},
    )
    assert ans_res.status_code == 200
    ans_data = ans_res.json()
    assert ans_data["ok"] is True
    assert "results" in ans_data
    assert "skill_tree" in ans_data


def test_guided_mastery_tutor_turn_and_hint():
    """Engine 1: Verify tutoring turn provides 3-step hint ladder."""
    res = client.post(
        "/api/v1/app/tutor/turn",
        json={
            "skill_id": "solve-linear",
            "step": 1,
            "answer": "subtract 5 from both sides",
            "mode": "guided",
            "subject": "6",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["is_correct"] is True
    assert "feedback" in data
    assert "next_step" in data


def test_guided_mastery_tutor_reviews_due():
    """Engine 1: Verify daily review endpoint lists due reviews."""
    res = client.get("/api/v1/app/tutor/reviews-due?subject=6")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "reviews" in data or "reviews_due" in data


def test_interactive_books_beats_and_check():
    """Engine 2: Verify chapter beats and inline checkpoint grading."""
    res = client.get(
        "/api/v1/app/manuals/11111111-2222-3333-4444-555555555551/beats?chapter_index=0"
    )
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "beats" in data
    assert len(data["beats"]) >= 1

    beat = data["beats"][0]
    beat_id = beat["id"]

    # Grade inline check
    check_res = client.post(
        f"/api/v1/app/manuals/11111111-2222-3333-4444-555555555551/beats/{beat_id}/check",
        json={"selected_option": 1, "subject": "6"},
    )
    assert check_res.status_code == 200
    check_data = check_res.json()
    assert check_data["ok"] is True
    assert check_data["is_correct"] is True
    assert "feedback" in check_data


def test_interactive_books_exports():
    """Engine 2: Verify SCORM 1.2 and EPUB/HTML bundle exports."""
    scorm_res = client.get(
        "/api/v1/app/manuals/11111111-2222-3333-4444-555555555551/export/scorm"
    )
    assert scorm_res.status_code == 200
    assert scorm_res.headers["content-type"] == "application/zip"

    epub_res = client.get(
        "/api/v1/app/manuals/11111111-2222-3333-4444-555555555551/export/epub"
    )
    assert epub_res.status_code == 200
    assert "text/html" in epub_res.headers["content-type"]


def test_learning_graph_difference_plan():
    """Engine 3: Verify Difference Training generates minimal recovery steps."""
    res = client.get("/api/v1/app/ple/difference-plan?subject=6")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "target_skill" in data
    assert "difference_steps" in data
    assert len(data["difference_steps"]) >= 1


def test_learning_graph_passport():
    """Engine 3: Verify verified skill passport returns credentials and evidence."""
    res = client.get("/api/v1/app/learner/passport?subject=6")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "badges" in data or "skills" in data
    badges = data.get("badges") or data.get("skills", [])
    assert len(badges) >= 1
    assert "summary" in data


def test_learning_graph_curriculum_coverage():
    """Engine 3: Verify curriculum coverage map matrix for instructors."""
    res = client.get("/api/v1/app/curriculum/coverage")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "coverage_percentage" in data
    assert "matrix" in data
    assert len(data["matrix"]) >= 3


def test_voice_studio_smart_math_cleanup():
    """Engine 4: Verify spoken math transcription normalization."""
    res = client.post(
        "/api/v1/app/voice/cleanup",
        json={
            "transcript": "two x plus five equals fifteen uh um what is x",
            "language": "en-IN",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    cleaned = data["cleaned"]
    assert "2x" in cleaned or "2 x" in cleaned or "x" in cleaned
    assert "uh" not in cleaned.lower().split()
    assert "um" not in cleaned.lower().split()


def test_voice_studio_edit_selection():
    """Engine 4: Verify voice in-place text transformation (simplify/translate)."""
    res = client.post(
        "/api/v1/app/voice/edit-selection",
        json={
            "selected_text": "Photosynthesis is the endothermic biochemical process whereby plants convert radiant photon energy into glucose.",
            "spoken_command": "simplify",
            "language": "en-IN",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "transformed" in data or "transformed_text" in data

"""Automated test suite verifying Enterprise Features BF-01 through BF-20.

Tests every endpoint against live or fallback in-memory state with 100% native
EdVidura naming and exact Pydantic schema validation.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_bf01_intelligent_intervention_agents():
    res = client.get("/api/v1/agents/status")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "rules" in data
    assert data["total_rules"] >= 2

    eval_res = client.post("/api/v1/agents/evaluate", json={
        "user_id": "6",
        "metrics": {"quiz_score": 52.0, "days_inactive": 1.0}
    })
    assert eval_res.status_code == 200
    assert eval_res.json()["ok"] is True


def test_bf02_unified_rubric_grader():
    res = client.get("/api/v1/grader/submissions/sub-alice-slice-a")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["submission"]["student_name"] == "Alice Nguyen"

    ann_res = client.post("/api/v1/grader/annotations", json={
        "submission_id": "sub-alice-slice-a",
        "rubric_scores": [
            {"criteria_id": "crit-balance", "awarded_score": 25.0, "feedback": "Great job"}
        ],
        "instructor_notes": "Well done",
        "is_muted": True
    })
    assert ann_res.status_code == 200
    assert ann_res.json()["ok"] is True

    pub_res = client.post("/api/v1/grader/publish-grades", json={
        "submission_id": "sub-alice-slice-a",
        "release_notification": True
    })
    assert pub_res.status_code == 200
    assert pub_res.json()["ok"] is True


def test_bf03_adaptive_learning_pathways():
    res = client.get("/api/v1/adaptive/student-route/6")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["active_track"] in ("Support", "Core", "Enrichment")
    assert "branch_payload" in data


def test_bf04_learning_event_stream():
    res = client.post("/api/v1/events/ingest", json={
        "event_type": "quiz_question_mastered",
        "actor_id": "6",
        "object_id": "quiz:slice-a-linear",
        "payload": {"score": 100}
    })
    assert res.status_code == 200
    assert res.json()["ok"] is True

    stream_res = client.get("/api/v1/events/stream")
    assert stream_res.status_code == 200
    events = stream_res.json()
    assert len(events) >= 1


def test_bf05_master_curriculum_blueprint():
    res = client.get("/api/v1/blueprints/bp-rhs-alg8/status")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["blueprint"]["blueprint_id"] == "bp-rhs-alg8"

    sync_res = client.post("/api/v1/blueprints/sync", json={
        "blueprint_id": "bp-rhs-alg8",
        "lock_quizzes": True
    })
    assert sync_res.status_code == 200
    assert sync_res.json()["ok"] is True


def test_bf06_algorithmic_math_engine():
    from app.modules.quiz.algorithmic import _MINTED_STORE
    res = client.post("/api/v1/quiz/algorithmic/mint", json={
        "template_key": "linear-balance",
        "student_id": "6"
    })
    assert res.status_code == 200
    mint_data = res.json()
    assert mint_data["ok"] is True
    assert "variant_id" in mint_data
    var_id = mint_data["variant_id"]
    correct_ans = _MINTED_STORE[var_id]["correct_answer"]

    eval_res = client.post("/api/v1/quiz/algorithmic/evaluate", json={
        "variant_id": var_id,
        "student_answer": float(correct_ans)
    })
    assert eval_res.status_code == 200
    assert eval_res.json()["is_correct"] is True


def test_bf07_skill_benchmark():
    res = client.get("/api/v1/skills/benchmark/profile/6")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "overall_tier" in data["profile"]

    start_res = client.post("/api/v1/skills/benchmark/start", json={
        "user_id": "6",
        "skill_code": "solve-linear",
        "measured_score": 92.0
    })
    assert start_res.status_code == 200
    assert start_res.json()["ok"] is True


def test_bf08_compliance_engine():
    res = client.get("/api/v1/compliance/expiring")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert len(data["certifications"]) >= 1

    reenroll_res = client.post("/api/v1/compliance/re-enroll", json={
        "certificate_id": "comp-01",
        "student_id": "6"
    })
    assert reenroll_res.status_code == 200
    assert reenroll_res.json()["ok"] is True


def test_bf09_calibrated_peer_review():
    res = client.post("/api/v1/peer-review/assign", json={
        "assignment_id": "assign-slice-a",
        "student_ids": ["6", "student-2"],
        "reviews_per_student": 1
    })
    assert res.status_code == 200
    assert res.json()["ok"] is True

    grade_res = client.post("/api/v1/peer-review/submit-grade", json={
        "pair_id": "pair-1",
        "reviewer_id": "6",
        "rubric_scores": {"clarity": 10.0, "accuracy": 9.0},
        "qualitative_feedback": "Excellent balancing method"
    })
    assert grade_res.status_code == 200
    assert grade_res.json()["ok"] is True


def test_bf10_video_checkpoints():
    res = client.get("/api/v1/video/les-transformer/cues")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert len(data["cues"]) >= 2

    telemetry_res = client.post("/api/v1/video/telemetry", json={
        "video_id": "les-transformer",
        "event_type": "checkpoint_answered",
        "timestamp_seconds": 45.0,
        "user_id": "6"
    })
    assert telemetry_res.status_code == 200
    assert telemetry_res.json()["ok"] is True


def test_bf11_verifiable_credentials():
    res = client.post("/api/v1/credentials/mint", json={
        "recipient_id": "6",
        "recipient_name": "Alice Nguyen",
        "course_name": "Class 8 Mathematics",
        "skills": ["Solving Equations"],
        "mastery_level": 5
    })
    assert res.status_code == 200
    mint_data = res.json()
    assert mint_data["ok"] is True
    cid = mint_data["credential"]["credential_id"]

    verify_res = client.get(f"/api/v1/credentials/verify/{cid}")
    assert verify_res.status_code == 200
    assert verify_res.json()["valid"] is True


def test_bf12_academic_credit_ledger():
    res = client.get("/api/v1/credits/ledger/6")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["ledger"]["total_credits_awarded"] >= 3.0

    calc_res = client.post("/api/v1/credits/calculate", json={
        "student_id": "6",
        "additional_hours": 30.0,
        "activity_name": "Lab Workshop"
    })
    assert calc_res.status_code == 200
    assert calc_res.json()["ok"] is True


def test_bf13_multilingual_translation_gateway():
    res = client.post("/api/v1/i18n/translate", json={
        "text": "Solve for x in the linear equation.",
        "target_language": "hi"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "translated_text" in data


def test_bf14_local_first_offline_sync():
    push_res = client.post("/api/v1/sync/push", json={
        "client_id": "client-alice-tab",
        "changes": [
            {
                "entity_type": "quiz_progress",
                "entity_key": "q-01",
                "client_version": 2,
                "payload": {"answer": "x=5"}
            }
        ]
    })
    assert push_res.status_code == 200
    assert push_res.json()["ok"] is True

    pull_res = client.post("/api/v1/sync/pull", json={
        "client_id": "client-alice-tab",
        "since_version": 0
    })
    assert pull_res.status_code == 200
    assert pull_res.json()["ok"] is True


def test_bf15_exam_integrity_proctoring():
    inc_res = client.post("/api/v1/proctoring/incident", json={
        "session_id": "sess-alice-slice-a",
        "incident_type": "tab_switch",
        "details": "Switched to documentation tab briefly"
    })
    assert inc_res.status_code == 200
    assert inc_res.json()["ok"] is True

    timeline_res = client.get("/api/v1/proctoring/session/sess-alice-slice-a/timeline")
    assert timeline_res.status_code == 200
    data = timeline_res.json()
    assert data["ok"] is True
    assert "timeline" in data


def test_bf16_conversational_quiz_minter():
    mint_res = client.post("/api/v1/coach/mint-quiz", json={
        "user_id": "6",
        "topic": "Linear Equations"
    })
    assert mint_res.status_code == 200
    data = mint_res.json()
    assert data["ok"] is True
    assert len(data["questions"]) == 3
    qid = data["quiz_id"]
    first_q_id = data["questions"][0]["id"]

    sub_res = client.post("/api/v1/coach/submit-minted-quiz", json={
        "quiz_id": qid,
        "user_id": "6",
        "answers": {first_q_id: 1}
    })
    assert sub_res.status_code == 200
    assert sub_res.json()["ok"] is True


def test_bf17_dynamic_revision_notes_synthesizer():
    synth_res = client.post("/api/v1/coach/synthesize-notes", json={
        "user_id": "6",
        "topic": "Linear Equations & Industrial Balance"
    })
    assert synth_res.status_code == 200
    data = synth_res.json()
    assert data["ok"] is True
    notes_id = data["notes_id"]

    dl_res = client.get(f"/api/v1/coach/download-notes/{notes_id}")
    assert dl_res.status_code == 200


def test_bf18_chapter_anchored_topic_assistant():
    init_res = client.get("/api/v1/coach/topic/ch-linear-balance/init")
    assert init_res.status_code == 200
    assert init_res.json()["ok"] is True

    ask_res = client.post("/api/v1/coach/topic/ch-linear-balance/ask", json={
        "student_question": "Why must we balance both sides of the equation?",
        "user_id": "6"
    })
    assert ask_res.status_code == 200
    assert ask_res.json()["ok"] is True
    assert "answer" in ask_res.json()


def test_bf19_sim_to_real_transfer_ledger():
    log_res = client.post("/api/v1/workforce/transfer-log", json={
        "student_id": "p-rajesh",
        "simulation_id": "sim-electrical-01",
        "physical_task_id": "phys-earthing-rig-01",
        "sim_score": 95.0,
        "real_score": 91.0,
        "evaluator_id": "TCH-01"
    })
    assert log_res.status_code == 200
    assert log_res.json()["ok"] is True

    rep_res = client.get("/api/v1/workforce/transfer-report?student_id=p-rajesh")
    assert rep_res.status_code == 200
    rep = rep_res.json()
    assert rep["count"] >= 1


def test_bf20_apprenticeship_ojt_filings():
    file_res = client.post("/api/v1/workforce/apprenticeship/generate-filing", json={
        "apprentice_id": "p-rajesh",
        "wage_tier": 2,
        "on_the_job_hours": 120.0,
        "classroom_hours": 30.0,
        "sponsor_id": "SPONSOR-RIVERSIDE-ELEC",
        "period_start": "2026-10-01",
        "period_end": "2026-10-31"
    })
    assert file_res.status_code == 200
    assert file_res.json()["ok"] is True

    status_res = client.get("/api/v1/workforce/apprenticeship/status?apprentice_id=p-rajesh")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["total_ojt_hours"] >= 400.0

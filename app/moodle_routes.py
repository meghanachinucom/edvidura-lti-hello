"""24/7 Cloud Moodle 4.x Course 10 Portal for EdVidura.

Provides an authentic, self-contained Moodle 4.x LMS simulation running
24/7 on Vercel/cloud without requiring a local Docker container.
"""

from __future__ import annotations

import html
from typing import Optional
from fastapi import APIRouter, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse

router = APIRouter(prefix="/moodle", tags=["moodle"])

PERSONAS = {
    "learner": {
        "id": "learner",
        "username": "riverside_alice",
        "name": "Alice Nguyen",
        "role": "Learner · Student",
        "role_badge": "Learner",
        "email": "c01.s01@riverside.test",
        "avatar_bg": "#0284c7",
        "avatar_initials": "AN",
        "course_role": "Student in Class 8",
        "demo_launch_persona": "learner",
    },
    "instructor": {
        "id": "instructor",
        "username": "riverside_priya",
        "name": "Priya Sharma",
        "role": "Teacher · Editing Teacher",
        "role_badge": "Editing Teacher",
        "email": "c8.teacher@riverside.test",
        "avatar_bg": "#7c3aed",
        "avatar_initials": "PS",
        "course_role": "Teacher in Class 8 · Algebra I",
        "demo_launch_persona": "instructor",
    },
    "admin": {
        "id": "admin",
        "username": "riverside_admin",
        "name": "Alex Morgan",
        "role": "Manager · Institutional Admin",
        "role_badge": "Administrator",
        "email": "admin@riverside.test",
        "avatar_bg": "#059669",
        "avatar_initials": "AM",
        "course_role": "School Administrator (ADM-01)",
        "demo_launch_persona": "admin",
    },
}

def _resolve_persona(request: Request, param_persona: Optional[str] = None) -> dict:
    p_key = (param_persona or request.query_params.get("persona") or request.cookies.get("moodle_persona") or "learner").lower()
    if p_key in ("alice", "student", "learner"):
        return PERSONAS["learner"]
    elif p_key in ("priya", "teacher", "instructor"):
        return PERSONAS["instructor"]
    elif p_key in ("alex", "admin", "administrator", "school_admin", "school-admin"):
        return PERSONAS["admin"]
    return PERSONAS["learner"]


@router.get("", response_class=HTMLResponse)
@router.get("/", response_class=HTMLResponse)
async def moodle_root(request: Request):
    return RedirectResponse(url="/moodle/course/view.php?id=10", status_code=302)


@router.get("/login", response_class=HTMLResponse)
async def moodle_login(request: Request, persona: Optional[str] = None):
    active = _resolve_persona(request, persona)
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Riverside High School Moodle LMS — Login</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=3">
  <link rel="alternate icon" href="/favicon.ico?v=3">
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f4f6f9;
      color: #1f2937;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }}
    .moodle-nav {{
      background: #0f2942;
      color: #fff;
      padding: 0.85rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #f59e0b;
    }}
    .moodle-brand {{
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 700;
      font-size: 1.15rem;
      letter-spacing: -0.01em;
    }}
    .moodle-logo-badge {{
      background: #f59e0b;
      color: #0f2942;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 0.95rem;
    }}
    .login-container {{
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }}
    .login-card {{
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 480px;
      overflow: hidden;
    }}
    .card-header {{
      background: #f9fafb;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      text-align: center;
    }}
    .card-header h1 {{
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f2942;
    }}
    .card-header p {{
      font-size: 0.85rem;
      color: #6b7280;
      margin-top: 4px;
    }}
    .card-body {{
      padding: 1.75rem;
    }}
    .persona-section-title {{
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #4b5563;
      margin-bottom: 0.75rem;
    }}
    .persona-button {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0.85rem 1rem;
      margin-bottom: 0.65rem;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: #fff;
      text-decoration: none;
      color: #111827;
      transition: all 0.15s ease-in-out;
    }}
    .persona-button:hover {{
      border-color: #0f2942;
      background: #f8fafc;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }}
    .persona-avatar {{
      width: 38px;
      height: 38px;
      border-radius: 50%;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
      margin-right: 12px;
      flex-shrink: 0;
    }}
    .persona-info {{
      flex: 1;
      text-align: left;
    }}
    .persona-name {{
      font-weight: 700;
      font-size: 0.92rem;
      color: #0f2942;
    }}
    .persona-role {{
      font-size: 0.75rem;
      color: #6b7280;
    }}
    .badge {{
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      background: #e2e8f0;
      color: #334155;
    }}
    .divider {{
      display: flex;
      align-items: center;
      margin: 1.5rem 0;
      color: #9ca3af;
      font-size: 0.8rem;
    }}
    .divider::before, .divider::after {{
      content: '';
      flex: 1;
      border-bottom: 1px solid #e5e7eb;
    }}
    .divider span {{
      padding: 0 0.75rem;
    }}
    .direct-btn {{
      display: block;
      width: 100%;
      text-align: center;
      background: #0f2942;
      color: #fff;
      padding: 0.85rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.95rem;
      text-decoration: none;
      transition: background 0.15s ease-in-out;
    }}
    .direct-btn:hover {{
      background: #1e3a5f;
    }}
    .footer {{
      text-align: center;
      padding: 1.5rem;
      font-size: 0.78rem;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      background: #fff;
    }}
  </style>
</head>
<body>
  <header class="moodle-nav">
    <div class="moodle-brand">
      <div class="moodle-logo-badge">M</div>
      <span>Riverside High School · Moodle LMS</span>
    </div>
    <div style="font-size:0.85rem; color:#cbd5e1;">Moodle 4.x Enterprise Boost</div>
  </header>

  <main class="login-container">
    <div class="login-card">
      <div class="card-header">
        <h1>Welcome to Moodle LMS</h1>
        <p>Riverside High School Academic Portal · IMS Global LTI 1.3</p>
      </div>
      <div class="card-body">
        <p class="persona-section-title">Select Persona to Enter Course 10</p>

        <a href="/moodle/course/view.php?id=10&persona=learner" class="persona-button">
          <div style="display:flex; align-items:center;">
            <div class="persona-avatar" style="background:#0284c7;">AN</div>
            <div class="persona-info">
              <div class="persona-name">Alice Nguyen (riverside_alice)</div>
              <div class="persona-role">Learner · Class 8 · Algebra I</div>
            </div>
          </div>
          <span class="badge" style="background:#e0f2fe; color:#0369a1;">Student</span>
        </a>

        <a href="/moodle/course/view.php?id=10&persona=instructor" class="persona-button">
          <div style="display:flex; align-items:center;">
            <div class="persona-avatar" style="background:#7c3aed;">PS</div>
            <div class="persona-info">
              <div class="persona-name">Priya Sharma (riverside_priya)</div>
              <div class="persona-role">Editing Teacher · Mathematics Dept</div>
            </div>
          </div>
          <span class="badge" style="background:#f3e8ff; color:#7e22ce;">Faculty</span>
        </a>

        <a href="/moodle/course/view.php?id=10&persona=admin" class="persona-button">
          <div style="display:flex; align-items:center;">
            <div class="persona-avatar" style="background:#059669;">AM</div>
            <div class="persona-info">
              <div class="persona-name">Alex Morgan (riverside_admin)</div>
              <div class="persona-role">School Administrator (ADM-01)</div>
            </div>
          </div>
          <span class="badge" style="background:#dcfce7; color:#15803d;">Admin</span>
        </a>

        <div class="divider">
          <span>Direct Launch to EdVidura</span>
        </div>

        <a href="/api/v1/auth/demo-launch?persona={active['demo_launch_persona']}" class="direct-btn">
          Enter as {active['name']} ({active['role_badge']}) &rarr;
        </a>
      </div>
    </div>
  </main>

  <footer class="footer">
    <p>Moodle™ 4.x LMS · Riverside High School LTI 1.3 Tool Gateway · Powered by EdVidura</p>
  </footer>
</body>
</html>
"""
    response = HTMLResponse(content=html_content)
    response.set_cookie("moodle_persona", active["id"], path="/", max_age=86400 * 30)
    return response


@router.get("/course/view.php", response_class=HTMLResponse)
async def moodle_course_view(request: Request, id: Optional[str] = "10", persona: Optional[str] = None, tab: Optional[str] = None):
    active = _resolve_persona(request, persona)
    active_tab = (tab or request.query_params.get("tab") or "course").lower()

    # Active role badge styling
    badge_style = {
        "learner": "background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd;",
        "instructor": "background:#f3e8ff; color:#7e22ce; border:1px solid #e9d5ff;",
        "admin": "background:#dcfce7; color:#15803d; border:1px solid #bbf7d0;",
    }.get(active["id"], "background:#e2e8f0; color:#334155;")

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Course 10: Class 8 · Riverside Algebra I — Moodle LMS</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=3">
  <link rel="alternate icon" href="/favicon.ico?v=3">
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f4f6f9;
      color: #1f2937;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }}
    .moodle-header {{
      background: #0f2942;
      color: #fff;
      border-bottom: 3px solid #f59e0b;
    }}
    .top-bar {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 2rem;
      max-width: 1300px;
      margin: 0 auto;
    }}
    .brand-group {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}
    .moodle-badge {{
      background: #f59e0b;
      color: #0f2942;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 1rem;
    }}
    .brand-title {{
      font-weight: 700;
      font-size: 1.1rem;
    }}
    .user-menu {{
      display: flex;
      align-items: center;
      gap: 14px;
    }}
    .switcher-pill {{
      display: inline-flex;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 3px;
      gap: 2px;
    }}
    .switcher-btn {{
      padding: 4px 10px;
      font-size: 0.72rem;
      font-weight: 600;
      color: #cbd5e1;
      text-decoration: none;
      border-radius: 16px;
      transition: all 0.15s ease;
    }}
    .switcher-btn.active {{
      background: #f59e0b;
      color: #0f2942;
      font-weight: 700;
    }}
    .user-profile {{
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
    }}
    .user-avatar {{
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: {active['avatar_bg']};
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.8rem;
    }}
    .course-subnav {{
      background: #1e3a5f;
      padding: 0 2rem;
    }}
    .subnav-inner {{
      max-width: 1300px;
      margin: 0 auto;
      display: flex;
      gap: 20px;
    }}
    .subnav-link {{
      color: #93c5fd;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.75rem 0.25rem;
      border-bottom: 2px solid transparent;
      transition: all 0.15s ease;
    }}
    .subnav-link:hover, .subnav-link.active {{
      color: #fff;
      border-bottom-color: #f59e0b;
    }}
    .main-content {{
      flex: 1;
      max-width: 1300px;
      width: 100%;
      margin: 0 auto;
      padding: 1.5rem 2rem 3rem;
    }}
    .breadcrumbs {{
      font-size: 0.8rem;
      color: #6b7280;
      margin-bottom: 1.25rem;
      display: flex;
      gap: 6px;
      align-items: center;
    }}
    .breadcrumbs a {{
      color: #2563eb;
      text-decoration: none;
    }}
    .course-title-card {{
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 1.5rem 2rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }}
    .course-title-card h1 {{
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f2942;
    }}
    .course-meta {{
      display: flex;
      gap: 16px;
      font-size: 0.85rem;
      color: #4b5563;
      margin-top: 6px;
      flex-wrap: wrap;
    }}
    .section-card {{
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 1.5rem;
      margin-bottom: 1.25rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }}
    .section-heading {{
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f2942;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 0.5rem;
      margin-bottom: 0.85rem;
    }}
    .activity-card {{
      border: 2px solid #0284c7;
      background: #f0f9ff;
      border-radius: 10px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-top: 0.85rem;
    }}
    .activity-left {{
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }}
    .activity-icon {{
      background: #0284c7;
      color: #fff;
      width: 44px;
      height: 44px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      flex-shrink: 0;
    }}
    .activity-title {{
      font-weight: 800;
      font-size: 1.05rem;
      color: #0f2942;
    }}
    .activity-desc {{
      font-size: 0.82rem;
      color: #334155;
      margin-top: 4px;
      line-height: 1.4;
    }}
    .launch-btn {{
      background: #0f2942;
      color: #fff;
      font-weight: 700;
      font-size: 0.95rem;
      padding: 0.85rem 1.5rem;
      border-radius: 8px;
      text-decoration: none;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 2px solid #0f2942;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.15s ease-in-out;
    }}
    .launch-btn:hover {{
      background: #1e3a5f;
      border-color: #1e3a5f;
      transform: translateY(-1px);
    }}
    .grade-table {{
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
      font-size: 0.85rem;
    }}
    .grade-table th, .grade-table td {{
      padding: 0.75rem 1rem;
      border: 1px solid #e5e7eb;
      text-align: left;
    }}
    .grade-table th {{
      background: #f8fafc;
      color: #334155;
      font-weight: 700;
    }}
    .sync-badge {{
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.72rem;
      font-weight: 700;
      background: #dcfce7;
      color: #166534;
    }}
    .footer {{
      background: #fff;
      border-top: 1px solid #e5e7eb;
      padding: 1.25rem 2rem;
      text-align: center;
      font-size: 0.8rem;
      color: #6b7280;
    }}
  </style>
</head>
<body>
  <header class="moodle-header">
    <div class="top-bar">
      <div class="brand-group">
        <div class="moodle-badge">M</div>
        <div>
          <div class="brand-title">Riverside High School LMS</div>
          <div style="font-size:0.75rem; color:#cbd5e1;">Moodle 4.x IMS Global LTI 1.3 Certified Environment</div>
        </div>
      </div>
      <div class="user-menu">
        <div class="switcher-pill">
          <a href="/moodle/course/view.php?id=10&persona=learner" class="switcher-btn {'active' if active['id'] == 'learner' else ''}">Alice (Student)</a>
          <a href="/moodle/course/view.php?id=10&persona=instructor" class="switcher-btn {'active' if active['id'] == 'instructor' else ''}">Priya (Teacher)</a>
          <a href="/moodle/course/view.php?id=10&persona=admin" class="switcher-btn {'active' if active['id'] == 'admin' else ''}">Alex (Admin)</a>
        </div>
        <div class="user-profile">
          <div class="user-avatar">{active['avatar_initials']}</div>
          <div>
            <div style="font-weight:700;">{active['name']}</div>
            <div style="font-size:0.7rem; color:#93c5fd;">{active['role_badge']}</div>
          </div>
        </div>
        <a href="/moodle/login" style="color:#cbd5e1; font-size:0.8rem; text-decoration:none; margin-left:8px;">Sign out</a>
      </div>
    </div>
    <div class="course-subnav">
      <div class="subnav-inner">
        <a href="/moodle/course/view.php?id=10&tab=course" class="subnav-link {'active' if active_tab != 'grades' else ''}">Course</a>
        <a href="/moodle/course/view.php?id=10&tab=grades" class="subnav-link {'active' if active_tab == 'grades' else ''}">Grades (Grader Report)</a>
        <a href="/school-admin/classes" class="subnav-link">Participants (220)</a>
        <a href="/review" class="subnav-link">Senior Review Gateway</a>
      </div>
    </div>
  </header>

  <main class="main-content">
    <div class="breadcrumbs">
      <a href="/moodle/course/view.php?id=10">Home</a> &rsaquo;
      <a href="/moodle/course/view.php?id=10">My courses</a> &rsaquo;
      <span>Class 8 · Riverside Algebra I (Course 10)</span>
    </div>

    <div class="course-title-card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <h1>Class 8 · Riverside Algebra I</h1>
          <div class="course-meta">
            <span><strong>Course ID:</strong> 10</span>
            <span>&bull;</span>
            <span><strong>Class Code:</strong> RHS-C08</span>
            <span>&bull;</span>
            <span><strong>Lead Teacher:</strong> Priya Sharma (TCH-08)</span>
            <span>&bull;</span>
            <span><strong>Current Moodle User:</strong> <span style="{badge_style} padding:2px 8px; border-radius:9999px; font-weight:700;">{active['name']} ({active['role']})</span></span>
          </div>
        </div>
        <a href="/api/v1/auth/demo-launch?persona={active['demo_launch_persona']}" class="launch-btn" style="background:#0284c7; border-color:#0284c7;">
          <span>Open EdVidura App &rarr;</span>
        </a>
      </div>
    </div>

    <!-- MAIN COURSE CONTENT -->
    <div style="display: {'block' if active_tab != 'grades' else 'none'};">
      <!-- Activity 21 Featured LTI Card -->
      <section class="section-card" style="border:2px solid #0284c7;">
        <h2 class="section-heading" style="color:#0284c7; display:flex; justify-content:space-between; align-items:center;">
          <span>LTI 1.3 Certified Learning Tool</span>
          <span class="sync-badge">IMS Global LTI 1.3</span>
        </h2>
        <div class="activity-card">
          <div class="activity-left">
            <div class="activity-icon">&#128218;</div>
            <div>
              <div class="activity-title">Activity 21 — Open EdVidura (Class 8 · Algebra I)</div>
              <div class="activity-desc">
                Enterprise digital learning platform integrated directly into Moodle Course 10.
                Includes interactive lessons, Class 8 Algebra I study handbook, chapter remediation,
                and real-time AGS gradebook synchronization for Alice Nguyen and all enrolled learners.
              </div>
            </div>
          </div>
          <a href="/api/v1/auth/demo-launch?persona={active['demo_launch_persona']}" class="launch-btn">
            <span>Launch EdVidura LTI 1.3 Tool</span>
            <span>&rarr;</span>
          </a>
        </div>
      </section>

      <!-- Welcome Section -->
      <section class="section-card">
        <h2 class="section-heading">Welcome &amp; Syllabus</h2>
        <p style="font-size:0.9rem; line-height:1.6; color:#374151;">
          Welcome to Class 8 Mathematics · Algebra I. In this course, learners develop foundational algebra skills,
          including understanding variables, solving linear equations, and mastering arithmetic equivalence.
          All reading materials and practice quizzes are delivered through the <strong>EdVidura LTI 1.3 tool</strong>.
        </p>
      </section>

      <!-- Topic 1 -->
      <section class="section-card">
        <h2 class="section-heading">Topic 1: Variables &amp; Expressions</h2>
        <p style="font-size:0.88rem; color:#4b5563; line-height:1.5;">
          Understand that a variable represents an unknown quantity that can vary in expressions.
          Refer to Chapter 2 of the <em>Algebra I study handbook</em> inside EdVidura for guided practice and flashcards.
        </p>
      </section>

      <!-- Topic 2 -->
      <section class="section-card">
        <h2 class="section-heading">Topic 2: Linear Equations</h2>
        <p style="font-size:0.88rem; color:#4b5563; line-height:1.5;">
          Master isolating variables using inverse operations (e.g., <code>2x + 3 = 11 &rarr; x = 4</code>).
          Complete the interactive checkpoint quiz in Activity 21 to automatically update your Moodle gradebook score.
        </p>
      </section>
    </div>

    <!-- GRADES TAB / GRADER REPORT -->
    <div style="display: {'block' if active_tab == 'grades' else 'none'};">
      <section class="section-card">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:0.75rem;">
          <div>
            <h2 style="font-size:1.25rem; font-weight:800; color:#0f2942;">Course 10 Grader Report (AGS Synchronized)</h2>
            <p style="font-size:0.82rem; color:#6b7280; margin-top:2px;">Grades transmitted automatically via IMS Global Assignment and Grade Service (AGS 2.0)</p>
          </div>
          <span class="sync-badge">AGS LineItem Live</span>
        </div>

        <table class="grade-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Student ID</th>
              <th>Email Address</th>
              <th>Activity 21: Riverside Algebra check (Quiz)</th>
              <th>Course Total</th>
              <th>LTI Status</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background:#f0fdf4; font-weight:600;">
              <td>Alice Nguyen</td>
              <td>STU-C01-01</td>
              <td>c01.s01@riverside.test</td>
              <td style="color:#15803d;">3.00 / 3.00 (100.00%)</td>
              <td style="color:#15803d;">100.00%</td>
              <td><span class="sync-badge">AGS Synchronized</span></td>
            </tr>
            <tr>
              <td>Bob Okonkwo</td>
              <td>STU-C01-02</td>
              <td>c01.s02@riverside.test</td>
              <td>2.00 / 3.00 (66.67%)</td>
              <td>66.67%</td>
              <td><span class="sync-badge" style="background:#e0f2fe; color:#0369a1;">Synced</span></td>
            </tr>
            <tr>
              <td>Carol Patel</td>
              <td>STU-C01-03</td>
              <td>c01.s03@riverside.test</td>
              <td>3.00 / 3.00 (100.00%)</td>
              <td>100.00%</td>
              <td><span class="sync-badge" style="background:#e0f2fe; color:#0369a1;">Synced</span></td>
            </tr>
            <tr>
              <td>Diego Santos</td>
              <td>STU-C01-04</td>
              <td>c01.s04@riverside.test</td>
              <td>1.00 / 3.00 (33.33%)</td>
              <td>33.33%</td>
              <td><span class="sync-badge" style="background:#e0f2fe; color:#0369a1;">Synced</span></td>
            </tr>
            <tr>
              <td>Emma Brooks</td>
              <td>STU-C01-05</td>
              <td>c01.s05@riverside.test</td>
              <td>3.00 / 3.00 (100.00%)</td>
              <td>100.00%</td>
              <td><span class="sync-badge" style="background:#e0f2fe; color:#0369a1;">Synced</span></td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:1.5rem; text-align:right;">
          <a href="/moodle/course/view.php?id=10&tab=course" class="launch-btn" style="background:#475569; border-color:#475569;">
            &larr; Return to Course 10
          </a>
        </div>
      </section>
    </div>
  </main>

  <footer class="footer">
    <p>Riverside High School Moodle LMS · Course 10 (Class 8 · Riverside Algebra I) · Integrated with EdVidura LTI 1.3</p>
  </footer>
</body>
</html>
"""
    response = HTMLResponse(content=html_content)
    response.set_cookie("moodle_persona", active["id"], path="/", max_age=86400 * 30)
    return response


@router.get("/grade/report/grader/index.php", response_class=HTMLResponse)
async def moodle_grader_report(request: Request, id: Optional[str] = "10", persona: Optional[str] = None):
    p = persona or request.query_params.get("persona") or ""
    url = f"/moodle/course/view.php?id={id}&tab=grades"
    if p:
        url += f"&persona={p}"
    return RedirectResponse(url=url, status_code=302)

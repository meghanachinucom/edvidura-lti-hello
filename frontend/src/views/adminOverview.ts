/**
 * View 12: Admin Overview & Institutional Governance
 * Supports all 5 administrative tabs: Governance, Teachers, Sections, Roster Vault, LTI 1.3 Keys.
 * Styled with radiant coral (#FF4757), deep midnight navy (#071E2D), emerald (#10B981), sky blue (#0284C7),
 * authentic student and educator photography, 3D tactile buttons, card depth, and active highlights.
 */
import { state, setScreen, setAdminTab, showToast, facultyList, sectionsList, studentsList, lmsConnectionsList, gradePassbackLogsList, AdminTab } from '../state';

export function renderAdminOverview(): string {
  const activeTab: AdminTab = state.adminTab || 'governance';

  return `
    <div class="flex flex-col w-full bg-[#FAFBFC] min-h-[calc(100vh-4rem)]">
      
      <!-- Editorial Sub-Bar / Scope Anchor -->
      <section class="w-full bg-white border-b border-[#E2E8F0] px-4 sm:px-6 lg:px-8 py-3.5">
        <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse"></span>
            <span class="text-[#0F172A] font-bold font-sans uppercase tracking-wider">Institution Enclave Active</span>
            <span class="text-[#CBD5E1]">/</span>
            <span class="text-[#64748B] font-semibold">Riverside Unified High School · ID: RHS-9042</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-[#64748B]">District SIS v4.3 Handshake</span>
            <span class="px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] font-bold border border-[#A7F3D0]">
              0 desyncs
            </span>
          </div>
        </div>
      </section>

      <!-- Admin Tab Switcher Sub-Bar -->
      <section class="w-full bg-[#F1F5F9]/80 border-b border-[#E2E8F0] px-4 sm:px-6 lg:px-8 py-2">
        <div class="max-w-7xl mx-auto flex items-center justify-start gap-2 overflow-x-auto no-scrollbar">
          <button
            class="admin-subtab-btn px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${activeTab === 'governance' ? 'bg-[#071E2D] text-white shadow-md' : 'bg-white text-[#475569] hover:bg-white/90 border border-[#E2E8F0]'}"
            data-target-tab="governance"
            type="button"
          >
            <span class="material-symbols-outlined text-[16px] ${activeTab === 'governance' ? 'text-[#FF4757]' : 'text-[#64748B]'}">domain</span>
            <span>Governance &amp; SIS</span>
          </button>

          <button
            class="admin-subtab-btn px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${activeTab === 'teachers' ? 'bg-[#071E2D] text-white shadow-md' : 'bg-white text-[#475569] hover:bg-white/90 border border-[#E2E8F0]'}"
            data-target-tab="teachers"
            type="button"
          >
            <span class="material-symbols-outlined text-[16px] ${activeTab === 'teachers' ? 'text-[#FF4757]' : 'text-[#64748B]'}">school</span>
            <span>Teachers Directory</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'teachers' ? 'bg-[#FF4757] text-white' : 'bg-[#E2E8F0] text-[#475569]'} font-mono">${facultyList.length}</span>
          </button>

          <button
            class="admin-subtab-btn px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${activeTab === 'sections' ? 'bg-[#071E2D] text-white shadow-md' : 'bg-white text-[#475569] hover:bg-white/90 border border-[#E2E8F0]'}"
            data-target-tab="sections"
            type="button"
          >
            <span class="material-symbols-outlined text-[16px] ${activeTab === 'sections' ? 'text-[#FF4757]' : 'text-[#64748B]'}">class</span>
            <span>Active Sections</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'sections' ? 'bg-[#FF4757] text-white' : 'bg-[#E2E8F0] text-[#475569]'} font-mono">${sectionsList.length}</span>
          </button>

          <button
            class="admin-subtab-btn px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${activeTab === 'roster' ? 'bg-[#071E2D] text-white shadow-md' : 'bg-white text-[#475569] hover:bg-white/90 border border-[#E2E8F0]'}"
            data-target-tab="roster"
            type="button"
          >
            <span class="material-symbols-outlined text-[16px] ${activeTab === 'roster' ? 'text-[#FF4757]' : 'text-[#64748B]'}">groups</span>
            <span>Roster Vault</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'roster' ? 'bg-[#FF4757] text-white' : 'bg-[#E2E8F0] text-[#475569]'} font-mono">${studentsList.length}</span>
          </button>

          <button
            class="admin-subtab-btn px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${activeTab === 'keys' ? 'bg-[#071E2D] text-white shadow-md' : 'bg-white text-[#475569] hover:bg-white/90 border border-[#E2E8F0]'}"
            data-target-tab="keys"
            type="button"
          >
            <span class="material-symbols-outlined text-[16px] ${activeTab === 'keys' ? 'text-[#FF4757]' : 'text-[#64748B]'}">key</span>
            <span>LTI 1.3 Keys</span>
          </button>

          <button
            class="admin-subtab-btn px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${activeTab === 'lms-integrations' ? 'bg-[#071E2D] text-white shadow-md' : 'bg-white text-[#475569] hover:bg-white/90 border border-[#E2E8F0]'}"
            data-target-tab="lms-integrations"
            type="button"
          >
            <span class="material-symbols-outlined text-[16px] ${activeTab === 'lms-integrations' ? 'text-[#FF4757]' : 'text-[#64748B]'}">hub</span>
            <span>LMS Integrations &amp; Passback</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'lms-integrations' ? 'bg-[#FF4757] text-white' : 'bg-[#10B981] text-white'} font-mono">2 Live</span>
          </button>
        </div>
      </section>

      <!-- Render Content based on activeTab -->
      ${renderActiveTabContent(activeTab)}

    </div>
  `;
}

function renderActiveTabContent(tab: AdminTab): string {
  switch (tab) {
    case 'teachers':
      return renderTeachersTab();
    case 'sections':
      return renderSectionsTab();
    case 'roster':
      return renderRosterTab();
    case 'keys':
      return renderKeysTab();
    case 'lms-integrations':
      return renderLmsIntegrationsTab();
    case 'governance':
    default:
      return renderGovernanceTab();
  }
}

// =========================================================================
// TAB 1: GOVERNANCE & SIS
// =========================================================================
function renderGovernanceTab(): string {
  return `
    <!-- COLORFUL HERO BANNER: Administrative Governance -->
    <section class="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-2">
      <div class="max-w-7xl mx-auto">
        <div class="hero-navy-card relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6" style="background-color: #071E2D; background-image: linear-gradient(135deg, #071E2D 0%, #0A2540 50%, #0D2E4A 100%);">
          
          <div class="space-y-3 max-w-2xl">
            <div class="flex items-center gap-2 text-xs font-mono">
              <span class="px-2.5 py-0.5 rounded-full bg-[#FF4757] text-white font-bold text-[10px] uppercase tracking-wider">Admin Console</span>
              <span class="text-gray-400">·</span>
              <span class="text-[#38BDF8] font-bold">District LTI 1.3 Advantage Gateway</span>
              <span class="text-gray-400">·</span>
              <span class="text-white font-bold">Audit Verified</span>
            </div>
            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white font-headline leading-tight">
              Riverside High <span class="text-[#FF4757]">Academic Governance</span>
            </h1>
            <p class="text-xs sm:text-sm text-gray-200 leading-relaxed font-sans">
              Centralized district administration. Manage student records, teacher roster delegations, Moodle 4.3 gradebook handshakes, and student data privacy compliance.
            </p>
          </div>

          <!-- Action Cluster with 3D Buttons -->
          <div class="flex flex-wrap items-center gap-3 shrink-0">
            <button class="admin-quick-nav btn-primary-3d px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md" data-target="teachers" type="button">
              <span class="material-symbols-outlined text-[16px]">school</span>
              <span>Faculty Directory (${facultyList.length})</span>
            </button>
            <button class="admin-quick-nav btn-secondary-3d px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-white/10 hover:bg-white/20 text-white border-white/20" data-target="roster" type="button">
              <span class="material-symbols-outlined text-[16px]">groups</span>
              <span>Scholars (340)</span>
            </button>
          </div>

        </div>
      </div>
    </section>

    <!-- Main School Overview Surface -->
    <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16 flex flex-col gap-6">
      
      <!-- 4 Monumental Metric Cards -->
      <section aria-label="School Metrics" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div class="card-depth-interactive rounded-2xl p-5 bg-white border-l-4 border-l-[#FF4757] flex flex-col justify-between shadow-xs">
          <span class="text-xs uppercase tracking-wider text-[#64748B] font-bold font-mono">Faculty Appointed</span>
          <div class="py-2 flex items-baseline gap-2 font-mono tabular-nums">
            <span class="text-3xl font-bold text-[#0F172A] font-headline">${facultyList.length}</span>
            <span class="text-xs text-[#FF4757] font-semibold">Active Teachers</span>
          </div>
          <p class="text-xs text-[#64748B]">All authenticated via Google Workspace SSO.</p>
        </div>

        <div class="card-depth-interactive rounded-2xl p-5 bg-white border-l-4 border-l-[#10B981] flex flex-col justify-between shadow-xs">
          <span class="text-xs uppercase tracking-wider text-[#64748B] font-bold font-mono">Enrolled Scholars</span>
          <div class="py-2 flex items-baseline gap-2 font-mono tabular-nums">
            <span class="text-3xl font-bold text-[#0F172A] font-headline">340</span>
            <span class="text-xs text-[#10B981] font-semibold">100% Roster Match</span>
          </div>
          <p class="text-xs text-[#64748B]">8 active cohorts across Grade 9 &amp; 10.</p>
        </div>

        <div class="card-depth-interactive rounded-2xl p-5 bg-white border-l-4 border-l-[#0284C7] flex flex-col justify-between shadow-xs">
          <span class="text-xs uppercase tracking-wider text-[#64748B] font-bold font-mono">LTI Handshake Uptime</span>
          <div class="py-2 flex items-baseline gap-2 font-mono tabular-nums">
            <span class="text-3xl font-bold text-[#0284C7] font-headline">99.98%</span>
            <span class="text-xs text-[#0284C7] font-semibold">Zero Desyncs</span>
          </div>
          <p class="text-xs text-[#64748B]">Sub-40ms AGS grade transmission latency.</p>
        </div>

        <div class="card-depth-interactive rounded-2xl p-5 bg-white border-l-4 border-l-[#F59E0B] flex flex-col justify-between shadow-xs">
          <span class="text-xs uppercase tracking-wider text-[#64748B] font-bold font-mono">Privacy Compliance</span>
          <div class="py-2 flex items-baseline gap-2 font-mono tabular-nums">
            <span class="text-3xl font-bold text-[#D97706] font-headline">Certified</span>
            <span class="text-xs text-[#D97706] font-semibold">FERPA / COPPA</span>
          </div>
          <p class="text-xs text-[#64748B]">Data isolated strictly within district partition.</p>
        </div>

      </section>

      <!-- Campus Image and Security Status Row -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        <div class="lg:col-span-7 card-depth-interactive rounded-3xl overflow-hidden bg-white border border-[#E2E8F0] flex flex-col justify-between shadow-xs">
          <div class="relative h-48 sm:h-56 w-full">
            <img
              src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80"
              alt="Riverside High Campus"
              class="w-full h-full object-cover"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
            <div class="absolute bottom-4 left-4 text-white">
              <div class="text-xs font-mono text-[#38BDF8] uppercase tracking-wider font-bold">Academic Year 2025–2026</div>
              <h3 class="text-xl font-bold font-headline">Riverside High STEM Innovation Lab</h3>
            </div>
          </div>

          <div class="p-6 space-y-3">
            <p class="text-xs sm:text-sm text-[#64748B] leading-relaxed">
              The EdVidura platform connects seamlessly to Riverside High's student information system, providing students with interactive Cartesian sandboxes and teachers with automated gradebook telemetry.
            </p>
            <div class="flex items-center gap-3 pt-2">
              <button class="admin-quick-nav btn-primary-3d px-4 py-2 rounded-xl text-xs font-bold cursor-pointer" data-target="sections" type="button">
                View Class Sections →
              </button>
              <button id="admin-export-btn" class="btn-secondary-3d px-4 py-2 rounded-xl text-xs font-bold cursor-pointer" type="button">
                Export District Roster
              </button>
            </div>
          </div>
        </div>

        <!-- LTI Security Credentials Deck -->
        <div class="lg:col-span-5 card-depth-interactive rounded-3xl p-6 bg-gradient-to-br from-[#071E2D] to-[#0D2538] text-white border border-[#1E435E] flex flex-col justify-between gap-4 shadow-xs">
          <div class="space-y-3">
            <div class="flex items-center justify-between border-b border-white/15 pb-2 text-xs font-mono">
              <span class="text-[#FF4757] font-bold">LTI 1.3 Advantage Handshake</span>
              <span class="text-[#10B981] flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-[#10B981] animate-ping"></span>
                <span>Active</span>
              </span>
            </div>

            <div class="space-y-2 text-xs font-mono">
              <div>
                <div class="text-gray-400 text-[10px]">Client ID:</div>
                <div class="text-white font-bold truncate">rhs-edvidura-prod-009842</div>
              </div>
              <div>
                <div class="text-gray-400 text-[10px]">Issuer URL:</div>
                <div class="text-white font-bold truncate">https://moodle.riverside.edu</div>
              </div>
              <div>
                <div class="text-gray-400 text-[10px]">JWKS Keyset Endpoint:</div>
                <div class="text-[#38BDF8] font-bold truncate">https://api.edvidura.org/.well-known/jwks.json</div>
              </div>
            </div>
          </div>

          <div class="space-y-2 pt-2">
            <button id="test-handshake-btn" class="btn-primary-3d w-full py-2.5 rounded-xl text-xs font-bold text-center cursor-pointer" type="button">
              Test Security Handshake
            </button>
            <button class="admin-quick-nav w-full py-2 rounded-xl text-xs font-bold text-[#38BDF8] hover:text-white transition-colors text-center cursor-pointer" data-target="keys" type="button">
              Configure LTI 1.3 Keyset →
            </button>
          </div>
        </div>

      </div>

      <!-- District Audit Log Strip -->
      <section class="card-depth-interactive rounded-3xl p-6 bg-white border border-[#E2E8F0] shadow-xs">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
          <div>
            <h3 class="text-base font-bold text-[#0F172A] font-headline">District Compliance &amp; Security Audit Trail</h3>
            <p class="text-xs text-[#64748B]">Real-time encrypted event stream recorded to immutable district logs.</p>
          </div>
          <span class="text-xs font-mono text-[#059669] font-bold bg-[#ECFDF5] px-2.5 py-1 rounded-full border border-[#A7F3D0]">
            System Verified
          </span>
        </div>

        <div class="space-y-3 font-mono text-xs">
          <div class="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]/70">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-[#10B981] text-[18px]">verified</span>
              <div>
                <span class="font-bold text-[#0F172A]">AGS Grade Passback Sync Complete</span>
                <span class="text-[#64748B] block text-[11px]">340 student scores synced to Moodle Gradebook</span>
              </div>
            </div>
            <span class="text-[#64748B] text-[11px]">8m ago</span>
          </div>

          <div class="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]/70">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-[#0284C7] text-[18px]">lock_reset</span>
              <div>
                <span class="font-bold text-[#0F172A]">RSA-SHA256 Token Keyset Rotation</span>
                <span class="text-[#64748B] block text-[11px]">Public key edvidura-key-2025-a verified by Moodle Gateway</span>
              </div>
            </div>
            <span class="text-[#64748B] text-[11px]">2h ago</span>
          </div>

          <div class="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]/70">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-[#F59E0B] text-[18px]">shield</span>
              <div>
                <span class="font-bold text-[#0F172A]">FERPA Student Privacy Audit Check</span>
                <span class="text-[#64748B] block text-[11px]">Zero PII leakage beyond encrypted district boundary</span>
              </div>
            </div>
            <span class="text-[#64748B] text-[11px]">4h ago</span>
          </div>
        </div>
      </section>

    </div>
  `;
}

// =========================================================================
// TAB 2: TEACHERS (FACULTY DIRECTORY)
// =========================================================================
function renderTeachersTab(): string {
  return `
    <!-- COLORFUL HERO BANNER: Faculty Directory -->
    <section class="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-2">
      <div class="max-w-7xl mx-auto">
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071E2D] via-[#0C2A3F] to-[#14324A] text-white p-6 sm:p-8 shadow-xl border border-[#1E435E] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div class="space-y-3 max-w-2xl">
            <div class="flex items-center gap-2 text-xs font-mono">
              <span class="px-2.5 py-0.5 rounded-full bg-[#10B981] text-white font-bold text-[10px] uppercase tracking-wider">Faculty Console</span>
              <span class="text-gray-300">·</span>
              <span class="text-[#38BDF8]">18 Appointed Educators</span>
              <span class="text-gray-300">·</span>
              <span>100% SSO Linked</span>
            </div>
            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white font-headline leading-tight">
              Riverside High <span class="text-[#FF4757]">Faculty Directory</span>
            </h1>
            <p class="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Explore appointed department instructors, manage course delegations, monitor active student cohorts, and verify Google Workspace SSO federation credentials.
            </p>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex flex-wrap items-center gap-3 shrink-0">
            <button id="add-teacher-btn" class="btn-primary-3d px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md" type="button">
              <span class="material-symbols-outlined text-[16px]">person_add</span>
              <span>Appoint Faculty</span>
            </button>
            <button id="sync-faculty-btn" class="btn-secondary-3d px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-white/10 hover:bg-white/20 text-white border-white/20" type="button">
              <span class="material-symbols-outlined text-[16px]">sync</span>
              <span>Sync with Google SSO</span>
            </button>
          </div>

        </div>
      </div>
    </section>

    <!-- Teachers Surface -->
    <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16 flex flex-col gap-6">
      
      <!-- Filter and Search Toolbar -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div class="relative w-full sm:w-80">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[18px]">search</span>
          <input
            id="faculty-search-input"
            type="text"
            placeholder="Search faculty name, course, or email..."
            class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] focus:bg-white focus:outline-hidden focus:border-[#FF4757] transition-all font-sans"
          />
        </div>

        <div class="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar">
          <button class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#071E2D] text-white">All (${facultyList.length})</button>
          <button class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] transition-colors">Mathematics (5)</button>
          <button class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] transition-colors">STEM &amp; Sciences (2)</button>
          <button class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] transition-colors">Computer Science (1)</button>
        </div>
      </div>

      <!-- Faculty Grid with Authentic Educator Portraits -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" id="faculty-cards-grid">
        ${facultyList
          .map(
            teacher => `
          <div class="card-depth-interactive rounded-2xl bg-white border border-[#E2E8F0] p-5 flex flex-col justify-between gap-4 shadow-xs hover:border-[#FF4757]/40 transition-all">
            <div class="space-y-3">
              <div class="flex items-start gap-3">
                <img
                  src="${teacher.avatarUrl}"
                  alt="${teacher.name}"
                  class="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#FF4757]/30 shadow-sm shrink-0"
                />
                <div class="overflow-hidden">
                  <h3 class="font-bold text-sm text-[#0F172A] font-headline truncate">${teacher.name}</h3>
                  <p class="text-[11px] text-[#FF4757] font-semibold truncate">${teacher.department}</p>
                  <span class="inline-flex items-center gap-1 text-[10px] font-mono text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full mt-1 border border-[#A7F3D0]">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                    Google SSO Linked
                  </span>
                </div>
              </div>

              <div class="text-xs text-[#64748B] space-y-1 pt-1 font-mono">
                <div class="truncate text-[11px]">📧 ${teacher.email}</div>
                <div class="text-[11px]">📞 ${teacher.phone}</div>
              </div>

              <!-- Assigned Courses -->
              <div class="space-y-1.5 pt-2 border-t border-[#F1F5F9]">
                <div class="text-[10px] uppercase font-bold text-[#94A3B8] font-mono">Assigned Curricula:</div>
                <div class="flex flex-wrap gap-1">
                  ${teacher.courses
                    .map(
                      course => `
                    <span class="px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#334155] text-[10px] font-medium border border-[#E2E8F0]">${course}</span>
                  `
                    )
                    .join('')}
                </div>
              </div>
            </div>

            <!-- Footer Stats & Actions -->
            <div class="pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
              <div class="text-xs font-mono">
                <span class="font-bold text-[#0F172A]">${teacher.studentsCount}</span>
                <span class="text-[#94A3B8] text-[10px]"> scholars</span>
              </div>

              <div class="flex items-center gap-1.5">
                <button class="teacher-action-btn px-2.5 py-1.5 rounded-lg bg-[#071E2D] hover:bg-[#122E42] text-white text-[11px] font-bold cursor-pointer transition-colors" data-teacher-id="${teacher.id}" data-action="view-sections">
                  Sections
                </button>
                <button class="teacher-action-btn p-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] cursor-pointer transition-colors" data-teacher-id="${teacher.id}" data-action="email">
                  <span class="material-symbols-outlined text-[16px]">mail</span>
                </button>
              </div>
            </div>

          </div>
        `
          )
          .join('')}
      </div>

    </div>
  `;
}

// =========================================================================
// TAB 3: SECTIONS (COURSE COHORTS)
// =========================================================================
function renderSectionsTab(): string {
  return `
    <!-- COLORFUL HERO BANNER: Class Sections -->
    <section class="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-2">
      <div class="max-w-7xl mx-auto">
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071E2D] via-[#0C2A3F] to-[#122E42] text-white p-6 sm:p-8 shadow-xl border border-[#1E435E] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div class="space-y-3 max-w-2xl">
            <div class="flex items-center gap-2 text-xs font-mono">
              <span class="px-2.5 py-0.5 rounded-full bg-[#0284C7] text-white font-bold text-[10px] uppercase tracking-wider">Cohorts &amp; Schedules</span>
              <span class="text-gray-300">·</span>
              <span class="text-[#38BDF8]">8 Active Sections</span>
              <span class="text-gray-300">·</span>
              <span>340 Total Enrolled</span>
            </div>
            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white font-headline leading-tight">
              Active Course <span class="text-[#FF4757]">Sections &amp; Cohorts</span>
            </h1>
            <p class="text-xs sm:text-sm text-gray-300 leading-relaxed">
              District periods, room allocations, instructor assignments, and live Moodle courseware handshake status.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3 shrink-0">
            <button id="add-section-btn" class="btn-primary-3d px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md" type="button">
              <span class="material-symbols-outlined text-[16px]">add_circle</span>
              <span>New Class Section</span>
            </button>
            <button id="sync-sections-btn" class="btn-secondary-3d px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-white/10 hover:bg-white/20 text-white border-white/20" type="button">
              <span class="material-symbols-outlined text-[16px]">sync</span>
              <span>Sync All to SIS</span>
            </button>
          </div>

        </div>
      </div>
    </section>

    <!-- Sections Grid -->
    <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16 flex flex-col gap-6">
      
      <!-- Metric Highlights Strip -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div class="text-[11px] uppercase font-bold text-[#94A3B8] font-mono">Active Cohorts</div>
          <div class="text-2xl font-bold text-[#0F172A] font-headline mt-1">8 Sections</div>
          <div class="text-xs text-[#10B981] font-semibold mt-0.5">100% Staffed</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div class="text-[11px] uppercase font-bold text-[#94A3B8] font-mono">Total Capacity</div>
          <div class="text-2xl font-bold text-[#0F172A] font-headline mt-1">229 / 240</div>
          <div class="text-xs text-[#0284C7] font-semibold mt-0.5">95.4% Utilization</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div class="text-[11px] uppercase font-bold text-[#94A3B8] font-mono">Average Class Size</div>
          <div class="text-2xl font-bold text-[#0F172A] font-headline mt-1">28.6</div>
          <div class="text-xs text-[#64748B] font-semibold mt-0.5">Optimal Ratio</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div class="text-[11px] uppercase font-bold text-[#94A3B8] font-mono">Moodle Courseware</div>
          <div class="text-2xl font-bold text-[#0F172A] font-headline mt-1">All Synced</div>
          <div class="text-xs text-[#10B981] font-semibold mt-0.5">0 Desync Exceptions</div>
        </div>
      </div>

      <!-- Sections Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        ${sectionsList
          .map(
            sec => `
          <div class="card-depth-interactive rounded-2xl bg-white border border-[#E2E8F0] p-5 flex flex-col justify-between gap-4 shadow-xs hover:border-[#0284C7]/50 transition-all">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1] font-bold text-[10px] font-mono uppercase">
                  ${sec.period}
                </span>
                <span class="text-[11px] font-mono text-[#059669] font-bold flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                  Synced
                </span>
              </div>

              <div>
                <h3 class="font-bold text-base text-[#0F172A] font-headline">${sec.name}</h3>
                <p class="text-xs text-[#64748B] font-mono">${sec.courseCode} · ${sec.room}</p>
              </div>

              <!-- Teacher Info -->
              <div class="flex items-center gap-2.5 pt-1">
                <img
                  src="${sec.teacherAvatar}"
                  alt="${sec.teacherName}"
                  class="w-8 h-8 rounded-full object-cover ring-1 ring-[#CBD5E1]"
                />
                <div class="overflow-hidden">
                  <div class="text-xs font-bold text-[#0F172A] truncate">${sec.teacherName}</div>
                  <div class="text-[10px] text-[#64748B] font-mono truncate">${sec.timeSlot}</div>
                </div>
              </div>

              <!-- Enrolled Gauge -->
              <div class="space-y-1 pt-2 border-t border-[#F1F5F9]">
                <div class="flex items-center justify-between text-xs font-mono">
                  <span class="text-[#64748B]">Enrollment:</span>
                  <span class="font-bold text-[#0F172A]">${sec.enrolled} / ${sec.maxSeats}</span>
                </div>
                <div class="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-[#0284C7] to-[#FF4757] rounded-full" style="width: ${(sec.enrolled / sec.maxSeats) * 100}%"></div>
                </div>
              </div>
            </div>

            <!-- Card Actions -->
            <div class="pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
              <button class="section-action-btn flex-1 py-1.5 rounded-xl bg-[#071E2D] hover:bg-[#122E42] text-white text-xs font-bold text-center cursor-pointer transition-colors" data-section-id="${sec.id}" data-action="gradebook">
                Gradebook
              </button>
              <button class="section-action-btn px-3 py-1.5 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] text-xs font-bold cursor-pointer transition-colors" data-section-id="${sec.id}" data-action="roster">
                Roster
              </button>
            </div>

          </div>
        `
          )
          .join('')}
      </div>

    </div>
  `;
}

// =========================================================================
// TAB 4: ROSTER VAULT (SCHOLARS DIRECTORY)
// =========================================================================
function renderRosterTab(): string {
  return `
    <!-- COLORFUL HERO BANNER: Scholar Roster Vault -->
    <section class="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-2">
      <div class="max-w-7xl mx-auto">
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071E2D] via-[#0C2A3F] to-[#122E42] text-white p-6 sm:p-8 shadow-xl border border-[#1E435E] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div class="space-y-3 max-w-2xl">
            <div class="flex items-center gap-2 text-xs font-mono">
              <span class="px-2.5 py-0.5 rounded-full bg-[#FF4757] text-white font-bold text-[10px] uppercase tracking-wider">FERPA Vault</span>
              <span class="text-gray-300">·</span>
              <span class="text-[#38BDF8]">340 District Scholars</span>
              <span class="text-gray-300">·</span>
              <span>100% Cryptographic Match</span>
            </div>
            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white font-headline leading-tight">
              District Scholar <span class="text-[#FF4757]">Roster Vault</span>
            </h1>
            <p class="text-xs sm:text-sm text-gray-300 leading-relaxed">
              FERPA-certified student master database with cryptographic Moodle LTI 1.3 token identifiers, gradebook submission histories, and guardian contacts.
            </p>
          </div>

          <!-- Actions -->
          <div class="flex flex-wrap items-center gap-3 shrink-0">
            <button id="roster-export-btn" class="btn-primary-3d px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md" type="button">
              <span class="material-symbols-outlined text-[16px]">download</span>
              <span>Export SIS CSV</span>
            </button>
            <button id="roster-sync-all-btn" class="btn-secondary-3d px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-white/10 hover:bg-white/20 text-white border-white/20" type="button">
              <span class="material-symbols-outlined text-[16px]">sync</span>
              <span>Force LTI Handshake</span>
            </button>
          </div>

        </div>
      </div>
    </section>

    <!-- Roster Vault Table -->
    <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16 flex flex-col gap-6">
      
      <!-- Filter and Search Strip -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div class="relative w-full sm:w-80">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[18px]">search</span>
          <input
            id="roster-search-input"
            type="text"
            placeholder="Search scholar name, email, or student ID..."
            class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] focus:bg-white focus:outline-hidden focus:border-[#FF4757] transition-all font-sans"
          />
        </div>

        <div class="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar">
          <button class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#071E2D] text-white">All (${studentsList.length})</button>
          <button class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] transition-colors">Synced (10)</button>
          <button class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] transition-colors">Needs Review (1)</button>
          <button class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] transition-colors">Queued (1)</button>
        </div>
      </div>

      <!-- Scholars Roster Table with Authentic Student Photography -->
      <div class="card-depth-interactive rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-mono uppercase text-[11px]">
              <tr>
                <th class="py-3.5 px-4 font-bold">Scholar Name</th>
                <th class="py-3.5 px-4 font-bold">District Email</th>
                <th class="py-3.5 px-4 font-bold">Attempts</th>
                <th class="py-3.5 px-4 font-bold">Score</th>
                <th class="py-3.5 px-4 font-bold">Moodle Sync</th>
                <th class="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#F1F5F9]" id="roster-table-body">
              ${studentsList
                .map(
                  student => `
                <tr class="hover:bg-[#F8FAFC] transition-colors">
                  <td class="py-3.5 px-4">
                    <div class="flex items-center gap-3">
                      <img
                        src="${student.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}"
                        alt="${student.name}"
                        class="w-9 h-9 rounded-full object-cover ring-1 ring-[#CBD5E1] shrink-0"
                      />
                      <div>
                        <div class="font-bold text-[#0F172A] font-headline">${student.name}</div>
                        <div class="text-[10px] font-mono text-[#94A3B8]">ID: RHS-STU-${student.id.padStart(4, '0')}</div>
                      </div>
                    </div>
                  </td>
                  <td class="py-3.5 px-4 font-mono text-[#475569]">
                    ${student.email}
                  </td>
                  <td class="py-3.5 px-4 font-mono">
                    ${student.attempts} attempt${student.attempts === 1 ? '' : 's'}
                  </td>
                  <td class="py-3.5 px-4 font-mono font-bold">
                    ${student.scorePercent !== null ? `<span class="${student.scorePercent >= 80 ? 'text-[#059669]' : student.scorePercent >= 60 ? 'text-[#D97706]' : 'text-[#DC2626]'}">${student.scorePercent}% (${student.scorePoints})</span>` : '<span class="text-[#94A3B8]">—</span>'}
                  </td>
                  <td class="py-3.5 px-4">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                      student.status === 'synced'
                        ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                        : student.status === 'needs-review'
                        ? 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'
                        : 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                    }">
                      <span class="w-1.5 h-1.5 rounded-full ${student.status === 'synced' ? 'bg-[#10B981]' : student.status === 'needs-review' ? 'bg-[#F59E0B]' : 'bg-[#3B82F6]'}"></span>
                      ${student.syncTime}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-right">
                    <div class="inline-flex items-center gap-1">
                      <button class="student-row-btn px-2.5 py-1 rounded-lg bg-[#071E2D] hover:bg-[#122E42] text-white text-[11px] font-bold cursor-pointer transition-colors" data-student-id="${student.id}" data-action="inspect">
                        Inspect
                      </button>
                      <button class="student-row-btn px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] text-[11px] font-bold cursor-pointer transition-colors" data-student-id="${student.id}" data-action="sync">
                        Sync
                      </button>
                    </div>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

// =========================================================================
// TAB 5: LTI 1.3 KEYS & ENTERPRISE SECURITY
// =========================================================================
function renderKeysTab(): string {
  return `
    <!-- COLORFUL HERO BANNER: LTI 1.3 Key Management -->
    <section class="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-2">
      <div class="max-w-7xl mx-auto">
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071E2D] via-[#0C2A3F] to-[#122E42] text-white p-6 sm:p-8 shadow-xl border border-[#1E435E] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div class="space-y-3 max-w-2xl">
            <div class="flex items-center gap-2 text-xs font-mono">
              <span class="px-2.5 py-0.5 rounded-full bg-[#10B981] text-white font-bold text-[10px] uppercase tracking-wider">Enterprise Cryptography</span>
              <span class="text-gray-300">·</span>
              <span class="text-[#38BDF8]">RSA 2048-bit SHA-256</span>
              <span class="text-gray-300">·</span>
              <span>100% Verified</span>
            </div>
            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white font-headline leading-tight">
              LTI 1.3 Advantage <span class="text-[#FF4757]">Keyset &amp; Handshake</span>
            </h1>
            <p class="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Cryptographic keystore for IMS Global LTI 1.3 Advantage Core. Manage public JWKS endpoints, rotate RSA tokens, and run live round-trip handshakes with Moodle 4.3.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3 shrink-0">
            <button id="live-test-handshake-btn" class="btn-primary-3d px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md" type="button">
              <span class="material-symbols-outlined text-[16px]">verified</span>
              <span>Test Handshake Now</span>
            </button>
            <button id="rotate-keys-btn" class="btn-secondary-3d px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-white/10 hover:bg-white/20 text-white border-white/20" type="button">
              <span class="material-symbols-outlined text-[16px]">lock_reset</span>
              <span>Rotate RSA Keyset</span>
            </button>
          </div>

        </div>
      </div>
    </section>

    <!-- Keys Console Grid -->
    <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16 flex flex-col gap-6">
      
      <!-- Handshake Status Banner -->
      <div id="handshake-status-banner" class="p-4 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-[#10B981] text-white flex items-center justify-center font-bold">
            <span class="material-symbols-outlined text-[20px]">check_circle</span>
          </div>
          <div>
            <div class="text-sm font-bold text-[#065F46] font-headline">LTI 1.3 Handshake Healthy · Round-Trip Latency: 22ms</div>
            <div class="text-xs text-[#047857]">Connected to Riverside High Moodle 4.3 Gateway (moodle.riverside.edu)</div>
          </div>
        </div>
        <button id="test-again-btn" class="px-4 py-1.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold cursor-pointer transition-colors" type="button">
          Re-verify
        </button>
      </div>

      <!-- Key Details & Config Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Left: Registered Credentials -->
        <div class="lg:col-span-7 card-depth-interactive rounded-3xl p-6 bg-white border border-[#E2E8F0] space-y-4 shadow-xs">
          <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <h3 class="font-bold text-base text-[#0F172A] font-headline">Enterprise LTI 1.3 Parameters</h3>
            <span class="text-[10px] font-mono text-[#059669] font-bold bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">Production</span>
          </div>

          <div class="space-y-3 text-xs font-mono">
            <div class="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div class="text-[#64748B] text-[10px] uppercase font-bold">Client ID</div>
              <div class="flex items-center justify-between">
                <span class="font-bold text-[#0F172A]">rhs-edvidura-prod-009842</span>
                <button class="copy-field-btn text-[#0284C7] hover:underline font-bold text-[11px] cursor-pointer" data-copy="rhs-edvidura-prod-009842">Copy</button>
              </div>
            </div>

            <div class="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div class="text-[#64748B] text-[10px] uppercase font-bold">Deployment ID</div>
              <div class="flex items-center justify-between">
                <span class="font-bold text-[#0F172A]">moodle-rhs-dep-4201</span>
                <button class="copy-field-btn text-[#0284C7] hover:underline font-bold text-[11px] cursor-pointer" data-copy="moodle-rhs-dep-4201">Copy</button>
              </div>
            </div>

            <div class="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div class="text-[#64748B] text-[10px] uppercase font-bold">Platform OIDC Auth URL</div>
              <div class="flex items-center justify-between">
                <span class="font-bold text-[#0F172A] truncate pr-2">https://moodle.riverside.edu/mod/lti/auth.php</span>
                <button class="copy-field-btn text-[#0284C7] hover:underline font-bold text-[11px] cursor-pointer shrink-0" data-copy="https://moodle.riverside.edu/mod/lti/auth.php">Copy</button>
              </div>
            </div>

            <div class="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div class="text-[#64748B] text-[10px] uppercase font-bold">Public Keyset (JWKS) URL</div>
              <div class="flex items-center justify-between">
                <span class="font-bold text-[#059669] truncate pr-2">https://api.edvidura.org/.well-known/jwks.json</span>
                <button class="copy-field-btn text-[#0284C7] hover:underline font-bold text-[11px] cursor-pointer shrink-0" data-copy="https://api.edvidura.org/.well-known/jwks.json">Copy</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: JWKS JSON Viewer -->
        <div class="lg:col-span-5 card-depth-interactive rounded-3xl p-6 bg-[#071E2D] text-white border border-[#1E435E] flex flex-col justify-between gap-4 shadow-xs">
          <div class="space-y-2">
            <div class="flex items-center justify-between border-b border-white/15 pb-2 text-xs font-mono">
              <span class="text-[#38BDF8] font-bold">Public JWKS Keyset</span>
              <button id="copy-jwks-btn" class="text-xs text-[#FF4757] hover:underline cursor-pointer font-bold">
                Copy JSON
              </button>
            </div>

            <pre class="bg-[#051522] p-3.5 rounded-xl text-[11px] font-mono text-[#7DD3FC] overflow-x-auto leading-relaxed max-h-64 border border-[#122E42]">
{
  "keys": [
    {
      "kty": "RSA",
      "e": "AQAB",
      "use": "sig",
      "kid": "edvidura-key-2025-a",
      "alg": "RS256",
      "n": "u1N6gqP...RiversideAdvantageKey"
    }
  ]
}</pre>
          </div>

          <div class="space-y-2 pt-2">
            <button id="download-pem-btn" class="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 cursor-pointer transition-colors" type="button">
              Download Public Certificate (.PEM)
            </button>
          </div>
        </div>

      </div>

    </div>
  `;
}

// =========================================================================
// TAB 6: MODULE 3 — LMS INTEGRATIONS, LTI LAUNCH & GRADE PASSBACK
// =========================================================================
function renderLmsIntegrationsTab(): string {
  const activeLms = state.activeLmsPlatform || 'moodle';

  return `
    <!-- COLORFUL HERO BANNER: LMS Integrations & LTI Launch -->
    <section class="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-2">
      <div class="max-w-7xl mx-auto">
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071E2D] via-[#0C2A3F] to-[#122E42] text-white p-6 sm:p-8 shadow-xl border border-[#1E435E] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div class="space-y-3 max-w-2xl">
            <div class="flex items-center gap-2 text-xs font-mono">
              <span class="px-2.5 py-0.5 rounded-full bg-[#10B981] text-white font-bold text-[10px] uppercase tracking-wider">Module 3 Certified</span>
              <span class="text-gray-300">·</span>
              <span class="text-[#38BDF8]">LTI Advantage 1.3 &amp; AGS 2.0</span>
              <span class="text-gray-300">·</span>
              <span>Multi-LMS Broker</span>
            </div>
            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white font-headline leading-tight">
              LMS Connection Management &amp; <span class="text-[#FF4757]">LTI Launch</span>
            </h1>
            <p class="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Bi-directional integration bridge for Moodle 4.3 and Canvas LMS. Configure OIDC authentication, verify assignment grade passback (AGS), inspect signed JWT claims, and simulate district LTI launches.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3 shrink-0">
            <button id="add-lms-provider-btn" class="btn-secondary-3d px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-white/10 hover:bg-white/20 text-white border-white/20" type="button">
              <span class="material-symbols-outlined text-[16px]">add_link</span>
              <span>Register LMS Provider</span>
            </button>
            <button id="test-all-lms-btn" class="btn-primary-3d px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md" type="button">
              <span class="material-symbols-outlined text-[16px]">speed</span>
              <span>Ping All Endpoints</span>
            </button>
          </div>

        </div>
      </div>
    </section>

    <!-- Main LMS Content Body -->
    <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16 flex flex-col gap-8">
      
      <!-- Connection Management Cards (Moodle & Canvas) -->
      <section class="space-y-4">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#0284C7] text-[20px]">hub</span>
            <h3 class="text-base font-bold text-[#0F172A] font-headline">Configured LMS Gateways (${lmsConnectionsList.length} Active)</h3>
          </div>
          <span class="text-xs text-[#10B981] font-mono font-bold">Moodle 4.3 · Canvas · Springwe LTI Ready</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${lmsConnectionsList.map(conn => {
            const isMoodle = conn.platform === 'moodle';
            const isCanvas = conn.platform === 'canvas';
            const iconLetter = isMoodle ? 'M' : isCanvas ? 'C' : 'S';
            const badgeBg = isMoodle ? 'bg-[#FFF0F3] text-[#FF4757]' : isCanvas ? 'bg-[#FFE4E6] text-[#E11D48]' : 'bg-[#EBF4FC] text-[#0284C7]';

            return `
              <div class="card-depth-interactive rounded-3xl p-6 bg-white border border-[#E2E8F0] space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl ${badgeBg} flex items-center justify-center font-bold text-sm font-headline">
                      ${iconLetter}
                    </div>
                    <div>
                      <h4 class="text-sm sm:text-base font-bold text-[#0F172A] truncate max-w-[170px]">${conn.name}</h4>
                      <span class="text-xs text-[#64748B] font-mono">${conn.platform.toUpperCase()} LTI 1.3</span>
                    </div>
                  </div>
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0] flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                    <span>${conn.status.toUpperCase()}</span>
                  </span>
                </div>

                <!-- Parameters Grid -->
                <div class="space-y-2 text-xs font-mono">
                  <div class="flex justify-between items-center bg-[#FAFBFC] p-2 rounded-lg">
                    <span class="text-[#64748B]">Client ID:</span>
                    <span class="font-bold text-[#0F172A] truncate max-w-[140px]">${conn.clientId}</span>
                  </div>
                  <div class="flex justify-between items-center bg-[#FAFBFC] p-2 rounded-lg">
                    <span class="text-[#64748B]">Deployment ID:</span>
                    <span class="font-bold text-[#0F172A]">${conn.deploymentId}</span>
                  </div>
                  <div class="flex justify-between items-center bg-[#FAFBFC] p-2 rounded-lg">
                    <span class="text-[#64748B]">REST Endpoint:</span>
                    <span class="font-bold text-[#0284C7] truncate max-w-[130px]">${conn.endpointUrl}</span>
                  </div>
                  <div class="flex justify-between items-center bg-[#FAFBFC] p-2 rounded-lg">
                    <span class="text-[#64748B]">Ping Latency:</span>
                    <span class="font-bold text-[#10B981]">${conn.latencyMs}ms (&lt;50ms)</span>
                  </div>
                </div>

                <!-- Actions -->
                <div class="pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                  <button class="test-lms-conn-btn flex-1 btn-secondary-3d py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer" data-lms-id="${conn.id}">
                    <span class="material-symbols-outlined text-[14px]">speed</span>
                    <span>Test Handshake</span>
                  </button>
                  <button class="launch-lms-shell-btn btn-primary-3d px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm" data-platform="${conn.platform}">
                    <span class="material-symbols-outlined text-[14px]">launch</span>
                    <span>Launch</span>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- LTI 1.3 Group Services & Group-Based Assignments -->
        <div class="card-depth-interactive rounded-3xl p-6 bg-white border border-[#CBD5E1] space-y-4">
          <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[#0284C7] text-[20px]">group_work</span>
              <div>
                <h3 class="text-base font-bold text-[#0F172A] font-headline">LTI 1.3 Group Services (GS 1.0) &amp; Collaborative Cohorts</h3>
                <span class="text-xs text-[#64748B]">Syncs small-group collaborative breakout rooms directly with LMS group rosters</span>
              </div>
            </div>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0]">
              Synchronized with SIS
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="p-4 rounded-2xl bg-[#FAFBFC] border border-[#E2E8F0] space-y-2">
              <div class="flex items-center justify-between text-xs font-mono">
                <span class="font-bold text-[#0F172A]">Study Circle Alpha</span>
                <span class="text-[#0284C7] font-bold">4 Members</span>
              </div>
              <p class="text-[11px] text-[#64748B]">Focus: Coordinate Geometry &amp; Cartesian Sandboxes (Period 1)</p>
              <div class="text-[10px] font-mono text-[#10B981] font-semibold">Group Assignment: Checkpoint 2 Review Lab</div>
            </div>

            <div class="p-4 rounded-2xl bg-[#FAFBFC] border border-[#E2E8F0] space-y-2">
              <div class="flex items-center justify-between text-xs font-mono">
                <span class="font-bold text-[#0F172A]">Study Circle Beta</span>
                <span class="text-[#0284C7] font-bold">5 Members</span>
              </div>
              <p class="text-[11px] text-[#64748B]">Focus: Standard Form y-isolation Remediation (Period 1)</p>
              <div class="text-[10px] font-mono text-[#D97706] font-semibold">Group Assignment: 5-Min Negative Sign Drill</div>
            </div>

            <div class="p-4 rounded-2xl bg-[#FAFBFC] border border-[#E2E8F0] space-y-2">
              <div class="flex items-center justify-between text-xs font-mono">
                <span class="font-bold text-[#0F172A]">Honors STEM Circle</span>
                <span class="text-[#0284C7] font-bold">3 Members</span>
              </div>
              <p class="text-[11px] text-[#64748B]">Focus: Spatial Vectors &amp; Perpendicular Normal Proofs</p>
              <div class="text-[10px] font-mono text-[#10B981] font-semibold">Group Assignment: WebXR Cartesian 3D Lab</div>
            </div>
          </div>
        </div>

        <!-- LMS Configuration & Documentation Guides (Canvas, Moodle, Springwe) -->
        <div class="card-depth-interactive rounded-3xl p-6 bg-gradient-to-r from-[#F8FAFC] to-white border border-[#CBD5E1] space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[#FF4757] text-[20px]">menu_book</span>
              <h3 class="text-sm font-bold text-[#0F172A] font-headline">LMS Integration Configuration Guides</h3>
            </div>
            <span class="text-xs font-mono text-[#64748B]">LTI Advantage 1.3 Whitepapers</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div class="p-3 bg-white rounded-xl border border-[#E2E8F0] space-y-1">
              <div class="font-bold text-[#0F172A] flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-[#FF4757]"></span>
                <span>Moodle 4.3 Setup</span>
              </div>
              <p class="text-[11px] text-[#64748B] leading-relaxed">Add External Tool via Site Admin &gt; Plugins &gt; LTI. Paste Client ID and Keyset URL.</p>
            </div>
            <div class="p-3 bg-white rounded-xl border border-[#E2E8F0] space-y-1">
              <div class="font-bold text-[#0F172A] flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-[#E11D48]"></span>
                <span>Canvas LMS Setup</span>
              </div>
              <p class="text-[11px] text-[#64748B] leading-relaxed">Admin &gt; Developer Keys &gt; LTI Key. Enter Redirect URI and target link URI.</p>
            </div>
            <div class="p-3 bg-white rounded-xl border border-[#E2E8F0] space-y-1">
              <div class="font-bold text-[#0F172A] flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-[#0284C7]"></span>
                <span>Springwe LMS Setup</span>
              </div>
              <p class="text-[11px] text-[#64748B] leading-relaxed">Integrate via Springwe REST v2 connector with RSA-256 public key verification.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- LTI 1.3 Launch Simulator & Decoded Token Inspector -->
      <section class="card-depth-interactive rounded-3xl p-6 sm:p-7 bg-white border border-[#CBD5E1] space-y-5">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#FF4757] text-[22px]">security</span>
            <div>
              <h3 class="text-base font-bold text-[#0F172A] font-headline">LTI 1.3 Advantage Launch Simulator &amp; Token Inspector</h3>
              <span class="text-xs text-[#64748B]">Verify signed RS256 OpenID Connect (OIDC) JWT claims and AGS endpoints</span>
            </div>
          </div>
          <button id="simulate-launch-btn" class="btn-primary-3d px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md">
            <span class="material-symbols-outlined text-[16px]">play_circle</span>
            <span>Launch Moodle Shell</span>
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <!-- Left Controls (5 cols) -->
          <div class="lg:col-span-5 space-y-3 text-xs">
            <div>
              <label class="block font-bold text-[#0F172A] font-mono mb-1">Target LMS Platform:</label>
              <select id="select-active-lms" class="w-full p-2.5 rounded-xl border border-[#CBD5E1] bg-white font-mono">
                <option value="moodle" ${activeLms === 'moodle' ? 'selected' : ''}>Moodle 4.3 (Riverside High Production)</option>
                <option value="canvas" ${activeLms === 'canvas' ? 'selected' : ''}>Canvas LMS (District Secondary)</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-[#0F172A] font-mono mb-1">Simulated User Persona:</label>
              <select class="w-full p-2.5 rounded-xl border border-[#CBD5E1] bg-white font-mono">
                <option value="student">Learner: Ada Chen (sub: achen-rhs-2026)</option>
                <option value="teacher">Instructor: Dr. Elena Martinez (sub: emartinez-rhs-lead)</option>
                <option value="admin">Administrator: Admin Marcus (sub: admin-district-9042)</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-[#0F172A] font-mono mb-1">Target Context Resource:</label>
              <input type="text" value="https://edvidura.riverside.edu/course/algebra-1/lesson-03" class="w-full p-2.5 rounded-xl border border-[#CBD5E1] bg-[#FAFBFC] font-mono" readonly />
            </div>

            <div class="pt-2">
              <button id="verify-ags-endpoint-btn" class="btn-secondary-3d w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer text-xs">
                <span class="material-symbols-outlined text-[16px] text-[#10B981]">task_alt</span>
                <span>Verify Assignment &amp; Grade Services (AGS) Endpoint</span>
              </button>
            </div>
          </div>

          <!-- Right: Decoded JWT Claims Preview (7 cols) -->
          <div class="lg:col-span-7 space-y-1">
            <span class="text-xs text-[#64748B] font-mono font-bold block">Decoded id_token JWT Header &amp; Payload (RS256):</span>
            <pre class="p-4 rounded-2xl bg-[#071E2D] text-[#38BDF8] font-mono text-[11px] overflow-x-auto leading-relaxed border border-[#1E435E] h-64">${JSON.stringify({
              header: {
                typ: 'JWT',
                alg: 'RS256',
                kid: 'edvidura-key-2026-b'
              },
              payload: {
                iss: activeLms === 'moodle' ? 'https://moodle.riverside.edu' : 'https://canvas.riversidedistrict.instructure.com',
                sub: 'user-rhs-student-9401',
                aud: 'rhs-moodle-lti-client-4091',
                exp: Math.floor(Date.now() / 1000) + 3600,
                iat: Math.floor(Date.now() / 1000),
                nonce: 'nonce-78ad365164a0',
                'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
                'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
                'https://purl.imsglobal.org/spec/lti/claim/roles': [
                  'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'
                ],
                'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint': {
                  scope: ['https://purl.imsglobal.org/spec/lti-ags/scope/score'],
                  lineitems: 'https://moodle.riverside.edu/mod/lti/services.php/1042/lineitems'
                }
              }
            }, null, 2)}</pre>
          </div>
        </div>
      </section>

      <!-- Grade Passback Log & Queue -->
      <section class="card-depth-interactive rounded-3xl bg-white border border-[#E2E8F0] overflow-hidden">
        <div class="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#10B981] text-[20px]">grading</span>
            <h3 class="text-base font-bold text-[#0F172A] font-headline">LTI AGS Automated Grade Passback Log</h3>
          </div>
          <button id="flush-passback-queue-btn" class="btn-secondary-3d px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer">
            <span class="material-symbols-outlined text-[15px]">send</span>
            <span>Flush Queue (${gradePassbackLogsList.filter(l => l.status === 'queued').length})</span>
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs font-mono">
            <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
              <tr>
                <th class="py-3 px-4 font-bold">Timestamp</th>
                <th class="py-3 px-4 font-bold">Target LMS</th>
                <th class="py-3 px-4 font-bold">Student Name</th>
                <th class="py-3 px-4 font-bold">Assignment</th>
                <th class="py-3 px-4 font-bold">Score Passed</th>
                <th class="py-3 px-4 font-bold">HTTP Status</th>
                <th class="py-3 px-4 font-bold">Handshake Verification</th>
                <th class="py-3 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E2E8F0]">
              ${gradePassbackLogsList.map(log => `
                <tr class="hover:bg-[#F8FAFC] transition-colors">
                  <td class="py-3 px-4 text-[#64748B] whitespace-nowrap">${log.timestamp}</td>
                  <td class="py-3 px-4 uppercase font-bold text-[#0F172A]">${log.lms}</td>
                  <td class="py-3 px-4 font-sans font-bold text-[#0F172A]">${log.studentName}</td>
                  <td class="py-3 px-4 text-[#64748B] font-sans">${log.assignmentName}</td>
                  <td class="py-3 px-4 font-bold text-[#0F172A]">${log.scoreGiven} / ${log.scoreMax}</td>
                  <td class="py-3 px-4 font-bold ${log.httpStatus === 200 ? 'text-[#10B981]' : 'text-[#F59E0B]'}">${log.httpStatus}</td>
                  <td class="py-3 px-4 text-[11px] text-[#64748B] max-w-xs truncate">${log.message}</td>
                  <td class="py-3 px-4 text-right">
                    <button class="retry-passback-btn text-xs font-bold text-[#0284C7] hover:underline cursor-pointer" data-log-id="${log.id}">
                      Re-Sync
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  `;
}

// =========================================================================
// EVENT BINDINGS FOR ALL 6 TABS
// =========================================================================
export function bindAdminOverviewEvents(container: HTMLElement): void {
  // Subtab navigation buttons
  container.querySelectorAll('.admin-subtab-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const targetTab = (e.currentTarget as HTMLElement).getAttribute('data-target-tab') as AdminTab;
      if (targetTab) {
        setAdminTab(targetTab);
      }
    });
  });

  // Quick navigation buttons within tabs
  container.querySelectorAll('.admin-quick-nav').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const target = (e.currentTarget as HTMLElement).getAttribute('data-target') as AdminTab;
      if (target) {
        setAdminTab(target);
      }
    });
  });

  // Export Roster Button
  container.querySelector('#admin-export-btn')?.addEventListener('click', () => {
    showToast('Exporting Riverside District Roster CSV (340 records)...', 'download');
  });

  // Test Handshake Button (Governance tab)
  container.querySelector('#test-handshake-btn')?.addEventListener('click', () => {
    showToast('LTI 1.3 RSA-SHA256 Token Handshake Verified (22ms latency)', 'verified');
  });

  // Teacher action buttons
  container.querySelectorAll('.teacher-action-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const action = (e.currentTarget as HTMLElement).getAttribute('data-action');
      const teacherId = (e.currentTarget as HTMLElement).getAttribute('data-teacher-id');
      const teacher = facultyList.find(f => f.id === teacherId);
      if (action === 'view-sections') {
        setAdminTab('sections');
        showToast(`Viewing active sections taught by ${teacher?.name || 'Faculty'}`, 'class');
      } else if (action === 'email') {
        showToast(`Drafted secure SIS communication to ${teacher?.email}`, 'mail');
      }
    });
  });

  // Add Teacher & Sync buttons
  container.querySelector('#add-teacher-btn')?.addEventListener('click', () => {
    showToast('Open Faculty Appointment Dialog: Riverside District Enclave', 'person_add');
  });

  container.querySelector('#sync-faculty-btn')?.addEventListener('click', () => {
    showToast('Synced 18 faculty records with Google Workspace Directory', 'sync');
  });

  // Section action buttons
  container.querySelectorAll('.section-action-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const action = (e.currentTarget as HTMLElement).getAttribute('data-action');
      const secId = (e.currentTarget as HTMLElement).getAttribute('data-section-id');
      const sec = sectionsList.find(s => s.id === secId);
      if (action === 'gradebook') {
        setScreen('teacher-results');
        showToast(`Opening Gradebook for ${sec?.name}`, 'analytics');
      } else if (action === 'roster') {
        setAdminTab('roster');
        showToast(`Filtering roster for ${sec?.name}`, 'groups');
      }
    });
  });

  container.querySelector('#add-section-btn')?.addEventListener('click', () => {
    showToast('Create New Class Section Dialog', 'add_circle');
  });

  container.querySelector('#sync-sections-btn')?.addEventListener('click', () => {
    showToast('Synchronized 8 active sections with Moodle 4.3 SIS', 'sync');
  });

  // Student row buttons
  container.querySelectorAll('.student-row-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const action = (e.currentTarget as HTMLElement).getAttribute('data-action');
      const studentId = (e.currentTarget as HTMLElement).getAttribute('data-student-id');
      const student = studentsList.find(s => s.id === studentId);
      if (action === 'inspect') {
        setScreen('teacher-diagnostics');
        showToast(`Inspecting formative diagnostics for ${student?.name}`, 'visibility');
      } else if (action === 'sync') {
        showToast(`Triggered forced LTI AGS token sync for ${student?.name}`, 'sync');
      }
    });
  });

  container.querySelector('#roster-export-btn')?.addEventListener('click', () => {
    showToast('Exporting FERPA Master Roster CSV (340 records)...', 'download');
  });

  container.querySelector('#roster-sync-all-btn')?.addEventListener('click', () => {
    showToast('Broadcasting LTI AGS token sync for all 340 enrolled scholars', 'sync');
  });

  // LTI Keys tab interactions
  container.querySelector('#live-test-handshake-btn')?.addEventListener('click', () => {
    const banner = container.querySelector('#handshake-status-banner');
    if (banner) {
      banner.classList.add('animate-pulse');
      setTimeout(() => banner.classList.remove('animate-pulse'), 1000);
    }
    showToast('Live Token Handshake: RSA RS256 Validated in 21ms', 'verified');
  });

  container.querySelector('#test-again-btn')?.addEventListener('click', () => {
    showToast('Re-verifying OIDC Handshake with moodle.riverside.edu...', 'sync');
  });

  container.querySelector('#rotate-keys-btn')?.addEventListener('click', () => {
    showToast('Generated new RSA 2048-bit key pair: edvidura-key-2026-b', 'lock_reset');
  });

  container.querySelector('#copy-jwks-btn')?.addEventListener('click', () => {
    showToast('Copied JWKS Keyset JSON to clipboard', 'content_copy');
  });

  container.querySelector('#download-pem-btn')?.addEventListener('click', () => {
    showToast('Downloaded edvidura-public-cert.pem', 'download');
  });

  // Copy field buttons
  container.querySelectorAll('.copy-field-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const val = (e.currentTarget as HTMLElement).getAttribute('data-copy');
      showToast(`Copied: ${val}`, 'content_copy');
    });
  });

  // Search filter for faculty
  const facultyInput = container.querySelector('#faculty-search-input') as HTMLInputElement;
  facultyInput?.addEventListener('input', () => {
    const q = facultyInput.value.toLowerCase().trim();
    const cards = container.querySelectorAll('#faculty-cards-grid > div');
    cards.forEach((card, idx) => {
      const teacher = facultyList[idx];
      if (!teacher) return;
      const match =
        teacher.name.toLowerCase().includes(q) ||
        teacher.department.toLowerCase().includes(q) ||
        teacher.email.toLowerCase().includes(q) ||
        teacher.courses.some(c => c.toLowerCase().includes(q));
      (card as HTMLElement).style.display = match ? 'flex' : 'none';
    });
  });

  // Search filter for scholars roster
  const rosterInput = container.querySelector('#roster-search-input') as HTMLInputElement;
  rosterInput?.addEventListener('input', () => {
    const q = rosterInput.value.toLowerCase().trim();
    const rows = container.querySelectorAll('#roster-table-body > tr');
    rows.forEach((row, idx) => {
      const student = studentsList[idx];
      if (!student) return;
      const match =
        student.name.toLowerCase().includes(q) ||
        student.email.toLowerCase().includes(q) ||
        student.id.toLowerCase().includes(q);
      (row as HTMLElement).style.display = match ? '' : 'none';
    });
  });

  // Module 3: LMS Integrations & LTI Launch handlers
  container.querySelector('#select-active-lms')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value as 'moodle' | 'canvas';
    state.activeLmsPlatform = val;
    setAdminTab('lms-integrations');
  });

  container.querySelector('#add-lms-provider-btn')?.addEventListener('click', () => {
    showToast('Register New LTI 1.3 Advantage Tool Provider Dialog', 'add_link');
  });

  container.querySelector('#test-all-lms-btn')?.addEventListener('click', () => {
    showToast('Ping All Gateways: Moodle 4.3 (34ms) · Canvas LMS (42ms) · 100% Online', 'verified');
  });

  container.querySelectorAll('.test-lms-conn-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-lms-id');
      const conn = lmsConnectionsList.find(c => c.id === id);
      showToast(`OAuth2 Handshake Validated for ${conn?.name} (${conn?.latencyMs}ms)`, 'speed');
    });
  });

  container.querySelectorAll('.launch-lms-shell-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const plat = (e.currentTarget as HTMLElement).getAttribute('data-platform') as any;
      if (plat) state.activeLmsPlatform = plat;
      setScreen('home-shell');
      showToast('Simulating direct LTI 1.3 container launch...', 'launch');
    });
  });

  container.querySelector('#simulate-launch-btn')?.addEventListener('click', () => {
    setScreen('home-shell');
    showToast('Launching into Moodle 4.3 LTI Advantage Runtime', 'launch');
  });

  container.querySelector('#verify-ags-endpoint-btn')?.addEventListener('click', () => {
    showToast('LTI AGS Endpoint Verified: Scope /score granted by district authorization server', 'verified');
  });

  container.querySelector('#flush-passback-queue-btn')?.addEventListener('click', () => {
    showToast('Flushed pending AGS queue: 1 queued score transmitted to Moodle', 'send');
  });

  container.querySelectorAll('.retry-passback-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-log-id');
      showToast(`Forced LTI AGS re-sync for submission #${id}: HTTP 200 OK`, 'sync');
    });
  });
}


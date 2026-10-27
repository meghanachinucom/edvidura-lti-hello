import {
  state,
  setScreen,
  showToast,
  notify,
  ChatMessage,
  ingestedDocsList,
  IngestedDocument
} from '../state';
import { quizQuestions, QuizQuestion } from './quiz';
import { classLabel, displayName, isGovernment, sendCoachQuestion } from '../boot';
import { APP_LANGUAGES, getLocale, setLocale } from '../i18n';
import { listenOnce, speak } from '../voice';

export function renderAskVidura(): string {
  return `
    <div class="flex flex-col w-full bg-[#FAFBFC] flex-1 min-h-[calc(100vh-4rem)] relative">
      
      <!-- Top Scope & Policy Bar -->
      <section class="w-full bg-white border-b border-[#E2E8F0] px-4 sm:px-6 lg:px-8 py-3.5">
        <div class="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2 text-[#0F172A] flex-wrap font-mono tabular-nums">
            <span class="font-bold text-[#FF4757] font-sans flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-[#FF4757] animate-pulse"></span>
              Vidura Socratic SME Node
            </span>
            <span class="text-[#CBD5E1]">/</span>
            <span class="text-[#64748B] font-sans">${classLabel()}</span>
            <span class="text-[#CBD5E1]">/</span>
            <span class="text-[#10B981] font-bold">FERPA &amp; COPPA Protected</span>
          </div>

          <!-- Actions & Controls -->
          <div class="flex items-center gap-3">
            <!-- Knowledge Base & RAG Index Button -->
            <button
              id="open-ingestion-btn"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#071E2D] hover:bg-[#0D2538] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <span class="material-symbols-outlined text-[16px] text-[#FF4757]">folder_shared</span>
              <span>Course Knowledge Base (${ingestedDocsList.length})</span>
            </button>

            <!-- Language Picker (same catalog as header) -->
            <div class="flex items-center gap-1.5 text-xs text-[#64748B]" data-no-i18n>
              <span class="material-symbols-outlined text-[15px]">translate</span>
              <select id="chat-lang-select" data-no-i18n class="bg-[#FAFBFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-xs text-[#0F172A] outline-none cursor-pointer max-w-[14rem]">
                ${APP_LANGUAGES.map(l => `<option value="${l.code}" ${getLocale() === l.code ? 'selected' : ''}>${l.native} · ${l.state}</option>`).join('')}
              </select>
            </div>

            <button id="toggle-citations-btn" class="flex items-center gap-1 text-[#071E2D] hover:text-[#FF4757] text-xs font-bold cursor-pointer transition-colors">
              <span class="material-symbols-outlined text-[16px] text-[#FF4757]">library_books</span>
              <span>${state.citationsOpen ? 'Hide Citations' : 'Show Citations'}</span>
            </button>
          </div>
        </div>
      </section>

      <!-- COLORFUL HERO BANNER: Ask Vidura Socratic Node -->
      <section class="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div class="max-w-5xl mx-auto">
          <div class="hero-navy-card relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6" style="background-color: #071E2D; background-image: linear-gradient(135deg, #071E2D 0%, #0A2540 50%, #0D2E4A 100%);">
            
            <!-- Left Info -->
            <div class="space-y-3 max-w-xl">
              <div class="flex items-center gap-2 text-xs font-mono">
                <span class="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#FF5B6B] to-[#FF4757] text-white font-bold text-[10px] uppercase tracking-wider">SME RAG Chatbot</span>
                <span class="text-gray-400">·</span>
                <span class="text-[#38BDF8] font-bold">Grounded in ${ingestedDocsList.reduce((acc, d) => acc + d.chunkCount, 0)} Vectors</span>
                <span class="text-gray-400">·</span>
                <span class="text-[#10B981] font-bold">Active 24/7</span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-white font-headline leading-tight">
                Ask Vidura: <span class="text-[#FF4757]">Interactive Socratic STEM Guide</span>
              </h1>
              <p class="text-xs sm:text-sm text-gray-200 leading-relaxed font-sans">
                Stuck on a slope quotient or coordinate intersection? Ask Vidura questions in plain language to receive step-by-step mathematical derivations grounded directly in your syllabus and ingested course manuals.
              </p>
            </div>

            <!-- Right Visual: Quick Ingestion Stats -->
            <div class="relative flex flex-col sm:flex-row items-center gap-4 bg-[#0A2540]/90 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/20 shrink-0 shadow-lg">
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=300&q=80"
                alt="Students using AI Math Study Guide"
                class="w-16 h-16 rounded-xl object-cover ring-2 ring-[#FF4757]"
                onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=300&q=80';"
              />
              <div class="flex flex-col text-left">
                <div class="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>RAG Vector Index</span>
                  <span class="px-1.5 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] text-[10px] font-mono font-bold">Live</span>
                </div>
                <div class="text-[11px] text-[#38BDF8] font-mono mt-0.5">3 Documents · 134 Chunks</div>
                <button
                  id="hero-open-kb-btn"
                  class="mt-2 text-[11px] text-[#FF4757] hover:text-[#FF6B7A] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span class="material-symbols-outlined text-[14px]">tune</span>
                  <span>Manage Knowledge Base &amp; Index</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- Main Chat Area -->
      <main class="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col justify-between">
        
        <!-- Messages Stream -->
        <div class="flex flex-col gap-6 mb-8" id="chat-messages-container">
          ${state.chatMessages.map(m => renderChatMessage(m)).join('')}
        </div>

        <!-- Sticky Floating Prompt Box -->
        <div class="sticky bottom-4 z-30 w-full bg-white/95 backdrop-blur-md rounded-3xl border border-[#E2E8F0] shadow-2xl p-4 sm:p-5 flex flex-col gap-3.5">
          
          <!-- Suggested Inquiries Quick Buttons -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar" id="suggestion-chips-bar">
            <span class="text-[#0F172A] uppercase tracking-wider font-bold whitespace-nowrap text-[11px] font-mono mr-1">Suggested Inquiries:</span>
            
            ${
              isGovernment()
                ? `
            <button class="chip-btn px-3.5 py-1.5 rounded-xl bg-[#FFF0F3] hover:bg-[#FFE0E6] text-[#FF4757] border border-[#FFCCD5] whitespace-nowrap transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow-2xs" data-prompt="ధర్మం అంటే ఏమిటి?">
              <span class="material-symbols-outlined text-[15px]">menu_book</span>
              <span>What is dharma?</span>
            </button>
            <button class="chip-btn px-3.5 py-1.5 rounded-xl bg-[#EBF4FC] hover:bg-[#D9EDFB] text-[#0284C7] border border-[#BAE6FD] whitespace-nowrap transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow-2xs" data-prompt="How should we honour parents and teachers?">
              <span class="material-symbols-outlined text-[15px]">family_restroom</span>
              <span>Parents and guru</span>
            </button>
            <button class="chip-btn px-3.5 py-1.5 rounded-xl bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#059669] border border-[#A7F3D0] whitespace-nowrap transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow-2xs" data-prompt="Why should we protect nature?">
              <span class="material-symbols-outlined text-[15px]">park</span>
              <span>Care for nature</span>
            </button>`
                : `
            <button class="chip-btn px-3.5 py-1.5 rounded-xl bg-[#FFF0F3] hover:bg-[#FFE0E6] text-[#FF4757] border border-[#FFCCD5] whitespace-nowrap transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow-2xs" data-prompt="How do I find slope when given two coordinate points?">
              <span class="material-symbols-outlined text-[15px]">ssid_chart</span>
              <span>Find slope from two points</span>
            </button>

            <button class="chip-btn px-3.5 py-1.5 rounded-xl bg-[#EBF4FC] hover:bg-[#D9EDFB] text-[#0284C7] border border-[#BAE6FD] whitespace-nowrap transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow-2xs" data-prompt="Why is the product of perpendicular slopes equal to -1?">
              <span class="material-symbols-outlined text-[15px]">straighten</span>
              <span>Perpendicular slope proof</span>
            </button>

            <button class="chip-btn px-3.5 py-1.5 rounded-xl bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#059669] border border-[#A7F3D0] whitespace-nowrap transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow-2xs" data-prompt="How do I convert standard form 2x - 5y = 20 to slope-intercept?">
              <span class="material-symbols-outlined text-[15px]">calculate</span>
              <span>Convert 2x - 5y = 20</span>
            </button>`
            }
          </div>

          <!-- Input Bar -->
          <div class="flex items-center gap-2 sm:gap-3">
            <button
              id="voice-toggle-btn"
              class="w-11 h-11 rounded-2xl flex items-center justify-center border transition-all cursor-pointer ${
                state.isVoiceRecording
                  ? 'bg-[#FF4757] text-white border-[#E83D4D] animate-pulse shadow-md'
                  : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] border-[#CBD5E1]'
              }"
              title="Voice dictation simulation"
              type="button"
            >
              <span class="material-symbols-outlined text-[20px]">${state.isVoiceRecording ? 'mic' : 'mic_none'}</span>
            </button>

            <input
              id="chat-user-input"
              type="text"
              placeholder="${isGovernment() ? 'Ask about this pravachanam (dharma, parents, nature)…' : 'Ask anything about Algebra I (e.g. slope, intercepts, equation conversion)...'}"
              class="flex-1 min-h-[46px] px-4 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-sm outline-none focus:border-[#FF4757] focus:bg-white transition-all placeholder:text-[#94A3B8]"
            />

            <button
              id="send-chat-btn"
              class="h-11 px-3.5 sm:px-6 rounded-2xl btn-primary-3d text-xs sm:text-sm font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
              type="button"
            >
              <span class="hidden sm:inline">Ask Vidura</span>
              <span class="sm:hidden">Ask</span>
              <span class="material-symbols-outlined text-[16px]">send</span>
            </button>
          </div>

          <div class="flex items-center justify-between text-[11px] text-[#64748B] font-mono px-1">
            <span>Socratic companion guides thinking; does not give direct quiz solutions.</span>
            <span>Grounding: 3 Ingested Syllabi (${ingestedDocsList.reduce((acc, d) => acc + d.chunkCount, 0)} Chunks)</span>
          </div>

        </div>

      </main>

      <!-- ========================================================
           KNOWLEDGE BASE & DOCUMENT INGESTION MODAL / DRAWER
           ======================================================== -->
      ${state.ingestionModalOpen ? renderIngestionModal() : ''}

      <!-- ========================================================
           SOURCE CITATION INSPECTOR MODAL
           ======================================================== -->
      ${state.citationModal.isOpen ? renderCitationModal() : ''}

    </div>
  `;
}

function renderChatMessage(m: ChatMessage): string {
  const isStudent = m.sender === 'student';

  if (isStudent) {
    return `
      <div class="flex items-start gap-3 justify-end">
        <div class="flex flex-col items-end max-w-xl">
          <div class="flex items-center gap-2 mb-1.5 text-xs text-[#64748B] font-mono">
            <span class="font-bold text-[#0F172A] font-sans">${m.author}</span>
            <span>·</span>
            <span>${m.time}</span>
          </div>
          <div class="p-4 sm:p-5 rounded-3xl rounded-tr-none bg-gradient-to-br from-[#071E2D] to-[#0D2538] text-white text-sm shadow-md leading-relaxed border border-[#1E435E]">
            ${m.text}
          </div>
        </div>
        <img
          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
          alt="Ada Chen"
          class="w-10 h-10 rounded-2xl object-cover ring-2 ring-[#FF4757] shadow-sm shrink-0 mt-1"
        />
      </div>
    `;
  }

  // AI Vidura message
  return `
    <div class="flex items-start gap-3.5 justify-start animate-fade-rise">
      <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF5B6B] to-[#FF4757] text-white flex items-center justify-center shrink-0 mt-1 shadow-md font-bold text-xs tracking-wider">
        <span class="material-symbols-outlined text-[22px]">auto_awesome</span>
      </div>

      <div class="flex flex-col items-start max-w-3xl flex-1">
        <div class="flex items-center gap-2 mb-1.5 flex-wrap text-xs font-mono tabular-nums">
          <span class="font-bold text-[#0F172A] font-sans">${m.author}</span>
          <span class="text-[#CBD5E1]">·</span>
          <span class="${m.isRefusal ? 'text-[#D97706]' : 'text-[#FF4757]'} font-semibold">
            ${m.badge || 'Syllabus Verified'}
          </span>
          <span class="text-[#CBD5E1]">·</span>
          <span class="text-[#64748B]">${m.time}</span>
        </div>

        <!-- Message Body Container -->
        <div class="w-full p-5 sm:p-6 rounded-3xl rounded-tl-none bg-white border border-[#E2E8F0] shadow-sm space-y-4">
          
          ${
            m.isRefusal
              ? `
            <div class="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] space-y-1">
              <div class="flex items-center gap-1.5 text-xs font-bold font-mono">
                <span class="material-symbols-outlined text-[18px]">policy</span>
                <span>${m.refusalTitle}</span>
              </div>
              <p class="text-xs sm:text-sm text-[#78350F] leading-relaxed">${m.refusalExplanation}</p>
            </div>
            ${
              m.suggestedInquiries
                ? `
              <div class="space-y-1.5 pt-1">
                <span class="text-xs font-mono uppercase tracking-wider text-[#64748B] font-semibold">Permitted topics to ask:</span>
                <div class="flex flex-col gap-1.5 text-xs">
                  ${m.suggestedInquiries
                    .map(
                      s => `
                    <button class="chip-btn text-left p-3 rounded-xl bg-[#F8FAFC] hover:bg-[#FFF0F3] hover:text-[#FF4757] text-[#0F172A] border border-[#E2E8F0] transition-colors flex items-center justify-between cursor-pointer" data-prompt="${s}">
                      <span>${s}</span>
                      <span class="material-symbols-outlined text-[15px] text-[#FF4757]">arrow_forward</span>
                    </button>
                  `
                    )
                    .join('')}
                </div>
              </div>
            `
                : ''
            }
          `
              : `
            ${m.text ? `<p class="text-[#0F172A] text-sm sm:text-base leading-relaxed">${m.text}</p>` : ''}

            ${
              m.mathBlocks
                ? `
              <div class="space-y-2 pt-1">
                ${m.mathBlocks
                  .map(
                    b => `
                  <div class="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
                    <strong class="text-[#0F172A] font-semibold">Step ${b.step}: ${b.title}</strong>
                    <div class="font-mono text-[#FF4757] font-bold text-sm mt-1.5 bg-white px-3.5 py-2 rounded-xl border border-[#FFCCD5] shadow-2xs">
                      ${b.equation}
                    </div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            `
                : ''
            }

            ${
              m.summaryCallout
                ? `
              <div class="p-3.5 rounded-2xl bg-[#FFF0F3] border border-[#FFCCD5] text-xs text-[#0F172A] font-medium leading-relaxed">
                ${m.summaryCallout}
              </div>
            `
                : ''
            }

            ${
              state.citationsOpen && m.citations
                ? `
              <div class="pt-3 border-t border-[#E2E8F0] space-y-1.5">
                <span class="text-[10px] font-mono uppercase tracking-wider text-[#64748B] font-semibold flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[14px] text-[#FF4757]">verified</span>
                  <span>Ingested Grounding Citations (Click to inspect source text):</span>
                </span>
                <div class="flex flex-wrap gap-2">
                  ${m.citations
                    .map(
                      c => `
                    <button
                      class="citation-inspect-btn text-xs px-3 py-1.5 rounded-xl bg-[#FFF0F3] hover:bg-[#FFE0E6] text-[#FF4757] font-bold flex items-center gap-1.5 border border-[#FFCCD5] cursor-pointer transition-all shadow-2xs hover:scale-102"
                      data-title="${c.label}"
                      data-ref="${c.ref}"
                      data-chapter="Chapter 04: Slope Dynamics &amp; Rate of Change"
                      data-page="${c.ref === 'guide-2-3' ? 42 : 46}"
                      data-standard="CCSS.MATH.HSA.CED.A.2"
                      data-snippet="Definition: The slope m of a non-vertical line passing through points (x₁, y₁) and (x₂, y₂) is the quotient of vertical delta over horizontal delta: m = (y₂ - y₁) / (x₂ - x₁). When m₁ · m₂ = -1, the lines meet at a Euclidean perpendicular angle (90°)."
                    >
                      <span class="material-symbols-outlined text-[15px] text-[#FF4757]">menu_book</span>
                      <span>${c.label}</span>
                      <span class="material-symbols-outlined text-[13px] text-[#94A3B8]">visibility</span>
                    </button>
                  `
                    )
                    .join('')}
                </div>
              </div>
            `
                : ''
            }
          `
          }

        </div>
      </div>
    </div>
  `;
}

/**
 * Knowledge Base & Ingestion Drawer/Modal
 */
function renderIngestionModal(): string {
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071E2D]/60 backdrop-blur-sm animate-fade-in">
      <div class="bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <!-- Header -->
        <div class="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#F8FAFC] to-white">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-[#071E2D] text-white flex items-center justify-center shadow-md">
              <span class="material-symbols-outlined text-[20px] text-[#FF4757]">folder_shared</span>
            </div>
            <div>
              <h2 class="text-lg font-bold text-[#071E2D] font-headline">Course Knowledge Base &amp; SME Ingestion</h2>
              <p class="text-xs text-[#64748B]">Manage textbook PDFs, vector index status, semantic search, and document permissions</p>
            </div>
          </div>
          <button id="close-ingestion-btn" class="w-8 h-8 rounded-full hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] flex items-center justify-center transition-colors cursor-pointer">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 overflow-y-auto space-y-6 flex-1">
          
          <!-- Upload Dropzone -->
          <div class="border-2 border-dashed border-[#CBD5E1] hover:border-[#FF4757] rounded-2xl p-6 bg-[#FAFBFC] hover:bg-[#FFF0F3]/30 transition-all text-center flex flex-col items-center justify-center gap-2 group cursor-pointer" id="dropzone-area">
            <input type="file" id="file-upload-input" class="hidden" accept=".pdf,.docx,.epub,.txt" />
            <div class="w-12 h-12 rounded-2xl bg-white group-hover:bg-[#FFF0F3] text-[#64748B] group-hover:text-[#FF4757] border border-[#E2E8F0] flex items-center justify-center shadow-xs transition-colors">
              <span class="material-symbols-outlined text-[26px]">cloud_upload</span>
            </div>
            <div>
              <p class="text-xs sm:text-sm font-bold text-[#071E2D]">
                Drop syllabus PDF or curriculum documents here, or <span class="text-[#FF4757] underline">browse files</span>
              </p>
              <p class="text-[11px] text-[#64748B] mt-0.5 font-mono">Supports PDF, DOCX, EPUB (Max 50MB) · Auto-chunked via sentence embeddings</p>
            </div>
          </div>

          <!-- Semantic Search Preview Bar -->
          <div class="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0] space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-[#071E2D] flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px] text-[#0284C7]">manage_search</span>
                <span>Semantic Vector Search Inspector</span>
              </span>
              <span class="text-[11px] font-mono text-[#64748B]">Model: text-embedding-004 · 768-dim</span>
            </div>
            <div class="flex gap-2">
              <input
                id="semantic-search-input"
                type="text"
                placeholder="Test semantic similarity (e.g. 'perpendicular slope product' or 'Cartesian intercept')..."
                class="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white border border-[#CBD5E1] text-[#0F172A] outline-none focus:border-[#0284C7]"
              />
              <button
                id="semantic-search-btn"
                class="px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                <span>Search</span>
                <span class="material-symbols-outlined text-[15px]">search</span>
              </button>
            </div>
            <div id="semantic-results-box" class="hidden p-3 rounded-xl bg-white border border-[#BAE6FD] text-xs space-y-1.5">
              <div class="flex items-center justify-between text-[11px] font-mono">
                <span class="text-[#0284C7] font-bold">Top Vector Match (Cosine Sim: 0.962)</span>
                <span class="text-[#64748B]">Chunk #14 · Page 42</span>
              </div>
              <p class="text-[#071E2D] leading-relaxed italic bg-[#F0F9FF] p-2.5 rounded-lg border border-[#E0F2FE]">
                "Theorem 4.2: Two non-vertical lines with slopes m₁ and m₂ are perpendicular if and only if m₁ · m₂ = -1. That is, each slope is the negative reciprocal of the other."
              </p>
            </div>
          </div>

          <!-- Ingested Documents Table -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold text-[#071E2D] uppercase tracking-wider font-mono">
                Ingested Curriculum Documents (${ingestedDocsList.length})
              </h3>
              <span class="text-[11px] text-[#10B981] font-mono font-bold flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                <span>All documents live in RAG context</span>
              </span>
            </div>

            <div class="space-y-3">
              ${ingestedDocsList
                .map(
                  doc => `
                <div class="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#CBD5E1] transition-all">
                  <div class="space-y-1 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="material-symbols-outlined text-[#FF4757] text-[20px]">picture_as_pdf</span>
                      <span class="font-bold text-[#071E2D] text-sm">${doc.title}</span>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        doc.indexingStatus === 'indexed'
                          ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                          : 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'
                      }">
                        ${doc.indexingStatus === 'indexed' ? '● Indexed · Ready' : '◌ Indexing...'}
                      </span>
                    </div>
                    <p class="text-xs text-[#64748B] leading-relaxed">${doc.summary}</p>
                    <div class="flex items-center gap-3 text-[11px] font-mono text-[#94A3B8] pt-1">
                      <span>${doc.filename}</span>
                      <span>·</span>
                      <span>${doc.fileSize}</span>
                      <span>·</span>
                      <span class="text-[#0284C7] font-semibold">${doc.chunkCount} vector chunks</span>
                      <span>·</span>
                      <span>Uploaded ${doc.uploadedAt}</span>
                    </div>
                  </div>

                  <!-- Actions & Permission Selector -->
                  <div class="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                    
                    <!-- Document Permission Selector -->
                    <div class="flex flex-col text-right">
                      <span class="text-[10px] font-mono text-[#64748B] uppercase">Permissions</span>
                      <select
                        class="doc-permission-select text-xs font-bold rounded-lg px-2.5 py-1 bg-[#F8FAFC] border border-[#CBD5E1] text-[#071E2D] outline-none cursor-pointer"
                        data-doc-id="${doc.id}"
                      >
                        <option value="public" ${doc.permission === 'public' ? 'selected' : ''}>Public (All)</option>
                        <option value="students" ${doc.permission === 'students' ? 'selected' : ''}>Enrolled Students</option>
                        <option value="faculty" ${doc.permission === 'faculty' ? 'selected' : ''}>Faculty Only</option>
                      </select>
                    </div>

                    <!-- Generate Quiz from Doc Action -->
                    <button
                      class="gen-quiz-from-doc-btn px-3 py-1.5 rounded-xl bg-[#FFF0F3] hover:bg-[#FFE0E6] text-[#FF4757] text-xs font-bold border border-[#FFCCD5] flex items-center gap-1.5 cursor-pointer transition-colors"
                      data-doc-id="${doc.id}"
                      data-doc-title="${doc.title}"
                      title="Synthesize 5 AI formative questions directly from this syllabus"
                    >
                      <span class="material-symbols-outlined text-[15px]">quiz</span>
                      <span>Generate Quiz</span>
                    </button>

                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
          <span>Embeddings generated with cosine similarity threshold 0.85</span>
          <button id="close-ingestion-footer-btn" class="px-4 py-2 rounded-xl bg-[#071E2D] hover:bg-[#0D2538] text-white font-bold cursor-pointer transition-colors">
            Done
          </button>
        </div>

      </div>
    </div>
  `;
}

/**
 * Citation Inspector Modal
 */
function renderCitationModal(): string {
  const c = state.citationModal;
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071E2D]/60 backdrop-blur-sm animate-fade-in">
      <div class="bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] w-full max-w-xl flex flex-col overflow-hidden">
        
        <!-- Header -->
        <div class="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#FFF0F3] to-white">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-[#FF4757] text-white flex items-center justify-center shadow-md">
              <span class="material-symbols-outlined text-[20px]">menu_book</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-md bg-[#071E2D] text-white text-[10px] font-mono font-bold">Curriculum Grounding</span>
                <span class="text-[11px] font-mono text-[#FF4757] font-bold">${c.standard}</span>
              </div>
              <h2 class="text-base font-bold text-[#071E2D] font-headline mt-0.5">${c.docTitle}</h2>
            </div>
          </div>
          <button id="close-citation-modal-btn" class="w-8 h-8 rounded-full hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] flex items-center justify-center transition-colors cursor-pointer">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between text-xs text-[#64748B] font-mono">
            <span>Location: <strong class="text-[#071E2D] font-bold">${c.chapter}</strong></span>
            <span class="bg-[#F1F5F9] px-2 py-0.5 rounded-md font-bold text-[#071E2D]">Page ${c.page}</span>
          </div>

          <div class="p-4 rounded-2xl bg-[#FAFBFC] border border-[#CBD5E1] relative">
            <div class="absolute -top-3 left-4 px-2 py-0.5 bg-white border border-[#CBD5E1] rounded text-[10px] font-mono text-[#64748B] font-bold uppercase">
              Verbatim Text Excerpt
            </div>
            <p class="text-sm text-[#0F172A] leading-relaxed italic pt-1">
              "${c.snippet}"
            </p>
          </div>

          <div class="p-3.5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center gap-2.5 text-xs text-[#065F46]">
            <span class="material-symbols-outlined text-[18px] text-[#10B981]">verified_user</span>
            <span>Vidura's Socratic answer is mathematically proven and compliant with Common Core high school algebra pacing guidelines.</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between">
          <button id="jump-reader-from-citation-btn" class="px-4 py-2 rounded-xl bg-[#071E2D] hover:bg-[#0D2538] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs">
            <span class="material-symbols-outlined text-[15px]">auto_stories</span>
            <span>Open Handbook to Page ${c.page}</span>
          </button>
          <button id="dismiss-citation-btn" class="px-4 py-2 rounded-xl bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#0F172A] text-xs font-bold cursor-pointer transition-colors">
            Close
          </button>
        </div>

      </div>
    </div>
  `;
}

export function bindAskViduraEvents(container: HTMLElement): void {
  const sendBtn = container.querySelector('#send-chat-btn');
  const inputEl = container.querySelector('#chat-user-input') as HTMLInputElement;

  const handleSend = (text?: string) => {
    const query = text || inputEl?.value.trim();
    if (!query) return;

    if (inputEl) inputEl.value = '';

    // Add user message
    const userMsg: ChatMessage = {
      id: 'm-' + Date.now(),
      sender: 'student',
      author: displayName(),
      time: 'Just now',
      text: query
    };
    state.chatMessages.push(userMsg);

    if (state.connected) {
      const thinkingId = 'b-think-' + Date.now();
      state.chatMessages.push({
        id: thinkingId,
        sender: 'vidura',
        author: 'Vidura Academic Node',
        time: 'Just now',
        text: 'Working from your class syllabus…'
      });
      setScreen('ask-vidura');
      void sendCoachQuestion(query)
        .then(res => {
          state.chatMessages = state.chatMessages.filter(m => m.id !== thinkingId);
          state.chatMessages.push({
            id: 'b-' + Date.now(),
            sender: 'vidura',
            author: 'Vidura Academic Node',
            time: 'Just now',
            badge: res.isRefusal ? undefined : 'Syllabus Verified',
            text: res.text,
            citations: res.citations,
            isRefusal: res.isRefusal,
            refusalTitle: res.refusalTitle,
            refusalExplanation: res.refusalExplanation
          });
          showToast(res.isRefusal ? 'Syllabus guard applied' : 'Vidura answered from class content', 'verified');
          if (!res.isRefusal && res.text) speak(res.text, getLocale());
          setScreen('ask-vidura');
        })
        .catch(err => {
          state.chatMessages = state.chatMessages.filter(m => m.id !== thinkingId);
          showToast(err instanceof Error ? err.message : 'Coach unavailable', 'error');
          setScreen('ask-vidura');
        });
      return;
    }

    // Socratic response logic
    setTimeout(() => {
      let botMsg: ChatMessage;

      if (
        query.toLowerCase().includes('chemistry') ||
        query.toLowerCase().includes('history') ||
        query.toLowerCase().includes('poem') ||
        query.toLowerCase().includes('biology')
      ) {
        botMsg = {
          id: 'b-' + Date.now(),
          sender: 'vidura',
          author: 'Vidura Academic Node',
          time: 'Just now',
          isRefusal: true,
          refusalTitle: 'Riverside High Academic Division · Syllabus Guard Notice',
          refusalExplanation:
            'I am strictly bounded to Riverside High Algebra I (CCSS.MATH.HSA.CED.A.2). Questions outside the syllabus are redirected to your course handbook or homeroom instructor.',
          suggestedInquiries: [
            'How do I calculate the slope m of a line?',
            'What is the difference between slope-intercept and standard form?',
            'How do I find the x-intercept when given 3x + 4y = 12?'
          ]
        };
      } else {
        botMsg = {
          id: 'b-' + Date.now(),
          sender: 'vidura',
          author: 'Vidura Academic Node',
          time: 'Just now',
          badge: 'Syllabus Verified · Algebra I',
          text: `Here is the Socratic decomposition for your inquiry on "${query}":`,
          mathBlocks: [
            {
              step: 1,
              title: 'Identify the Given Coordinates',
              equation: 'P₁(x₁, y₁) = (2, 3), P₂(x₂, y₂) = (6, 11)'
            },
            {
              step: 2,
              title: 'Calculate the Delta Quotient (Rise over Run)',
              equation: 'm = (y₂ - y₁) / (x₂ - x₁) = (11 - 3) / (6 - 2) = 8 / 4 = 2'
            },
            {
              step: 3,
              title: 'Substitute into Slope-Intercept Form',
              equation: 'y = mx + b  ⟹  3 = 2(2) + b  ⟹  b = 3 - 4 = -1'
            }
          ],
          summaryCallout:
            'Canonical Result: The slope is m = 2, and the vertical intercept is (0, -1). The complete linear equation is y = 2x - 1.',
          citations: [
            { label: 'Technical Guide § 2.3 (Slope Quotient)', ref: 'guide-2-3' },
            { label: 'Dr. Martinez Lecture Notes (Slope Traps)', ref: 'doc-2' }
          ]
        };
      }

      state.chatMessages.push(botMsg);
      showToast('Vidura provided Socratic derivation with citations', 'verified');
      setScreen('ask-vidura');
    }, 450);

    setScreen('ask-vidura');
  };

  sendBtn?.addEventListener('click', () => handleSend());
  inputEl?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSend();
  });

  // Suggestion chips
  container.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const prompt = (e.currentTarget as HTMLElement).getAttribute('data-prompt');
      if (prompt) handleSend(prompt);
    });
  });

  // Citations toggle
  container.querySelector('#toggle-citations-btn')?.addEventListener('click', () => {
    state.citationsOpen = !state.citationsOpen;
    setScreen('ask-vidura');
  });

  container.querySelector('#voice-toggle-btn')?.addEventListener('click', () => {
    if (state.isVoiceRecording) {
      state.isVoiceRecording = false;
      notify();
      return;
    }
    state.isVoiceRecording = true;
    notify();
    showToast('Listening…', 'mic');
    const stop = listenOnce(
      getLocale(),
      text => {
        state.isVoiceRecording = false;
        notify();
        handleSend(text);
      },
      () => {
        state.isVoiceRecording = false;
        notify();
      }
    );
    if (!stop) {
      state.isVoiceRecording = false;
      notify();
      showToast('Voice is not available in this browser', 'mic');
    }
  });

  // Language select
  const langSelect = container.querySelector('#chat-lang-select') as HTMLSelectElement;
  langSelect?.addEventListener('change', () => {
    if (langSelect.value) setLocale(langSelect.value, { userPicked: true });
  });

  // Citation inspection buttons
  container.querySelectorAll('.citation-inspect-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const el = e.currentTarget as HTMLElement;
      state.citationModal = {
        isOpen: true,
        docTitle: el.getAttribute('data-title') || 'Algebra I Technical Guide',
        chapter: el.getAttribute('data-chapter') || 'Chapter 04: Slope Dynamics',
        page: parseInt(el.getAttribute('data-page') || '42', 10),
        standard: el.getAttribute('data-standard') || 'CCSS.MATH.HSA.CED.A.2',
        snippet: el.getAttribute('data-snippet') || 'The slope m = delta y / delta x.'
      };
      setScreen('ask-vidura');
    });
  });

  // Citation modal close
  container.querySelector('#close-citation-modal-btn')?.addEventListener('click', () => {
    state.citationModal.isOpen = false;
    setScreen('ask-vidura');
  });
  container.querySelector('#dismiss-citation-btn')?.addEventListener('click', () => {
    state.citationModal.isOpen = false;
    setScreen('ask-vidura');
  });
  container.querySelector('#jump-reader-from-citation-btn')?.addEventListener('click', () => {
    state.citationModal.isOpen = false;
    state.manualActiveChapterId = 'ch4';
    state.manualReadingProgress = 42;
    setScreen('manual-reader');
  });

  // Ingestion Modal open/close
  container.querySelector('#open-ingestion-btn')?.addEventListener('click', () => {
    state.ingestionModalOpen = true;
    setScreen('ask-vidura');
  });
  container.querySelector('#hero-open-kb-btn')?.addEventListener('click', () => {
    state.ingestionModalOpen = true;
    setScreen('ask-vidura');
  });
  container.querySelector('#close-ingestion-btn')?.addEventListener('click', () => {
    state.ingestionModalOpen = false;
    setScreen('ask-vidura');
  });
  container.querySelector('#close-ingestion-footer-btn')?.addEventListener('click', () => {
    state.ingestionModalOpen = false;
    setScreen('ask-vidura');
  });

  // Dropzone file upload simulation
  const dropzoneArea = container.querySelector('#dropzone-area');
  const fileUploadInput = container.querySelector('#file-upload-input') as HTMLInputElement;

  dropzoneArea?.addEventListener('click', () => {
    fileUploadInput?.click();
  });

  fileUploadInput?.addEventListener('change', () => {
    if (fileUploadInput.files && fileUploadInput.files[0]) {
      const file = fileUploadInput.files[0];
      const newDoc: IngestedDocument = {
        id: 'doc-' + Date.now(),
        filename: file.name,
        title: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        chunkCount: 16,
        indexingStatus: 'indexing',
        permission: 'students',
        uploadedAt: 'Just now',
        summary: `Synthesized curriculum vector chunks from ${file.name}.`
      };
      ingestedDocsList.unshift(newDoc);
      showToast(`Ingesting "${file.name}" into RAG index...`, 'cloud_upload');
      setScreen('ask-vidura');

      // Simulate indexing completion
      setTimeout(() => {
        newDoc.indexingStatus = 'indexed';
        showToast(`Document "${file.name}" indexed (${newDoc.chunkCount} vector embeddings ready)`, 'verified');
        setScreen('ask-vidura');
      }, 1500);
    }
  });

  // Semantic Search button
  container.querySelector('#semantic-search-btn')?.addEventListener('click', () => {
    const searchInput = container.querySelector('#semantic-search-input') as HTMLInputElement;
    const resultsBox = container.querySelector('#semantic-results-box');
    if (searchInput && resultsBox) {
      resultsBox.classList.remove('hidden');
      showToast('Semantic similarity search completed (Cosine score: 0.962)', 'search');
    }
  });

  // Document Permission select changes
  container.querySelectorAll('.doc-permission-select').forEach(select => {
    select.addEventListener('change', e => {
      const sel = e.target as HTMLSelectElement;
      const docId = sel.getAttribute('data-doc-id');
      const doc = ingestedDocsList.find(d => d.id === docId);
      if (doc) {
        doc.permission = sel.value as 'public' | 'students' | 'faculty';
        showToast(`Updated permissions for "${doc.title}" to ${sel.value}`, 'lock');
      }
    });
  });

  // Generate Quiz from Document button
  container.querySelectorAll('.gen-quiz-from-doc-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const docId = (e.currentTarget as HTMLElement).getAttribute('data-doc-id');
      const docTitle = (e.currentTarget as HTMLElement).getAttribute('data-doc-title');
      const doc = ingestedDocsList.find(d => d.id === docId);

      // Add a customized formative question to quizQuestions
      const newQ: QuizQuestion = {
        id: 'gen-doc-' + Date.now(),
        num: `0${quizQuestions.length + 1}`,
        type: 'multiple-choice',
        title: 'Parallel Lines Invariant Criteria',
        pts: '2 pts',
        standard: 'CCSS.MATH.HSA.CED.A.2',
        question: `Based on syllabus "${docTitle}": Which condition guarantees that two linear equations define strictly parallel lines in ℝ²?`,
        choices: [
          { key: 'A', text: 'Equal slopes (m₁ = m₂) with distinct y-intercepts (b₁ ≠ b₂)' },
          { key: 'B', text: 'Opposite reciprocal slopes (m₁ · m₂ = -1)' },
          { key: 'C', text: 'Equal y-intercepts with unequal slopes' },
          { key: 'D', text: 'Zero slope and undefined vertical intercept' }
        ],
        correct: 'A'
      };

      quizQuestions.push(newQ);
      state.ingestionModalOpen = false;
      showToast(`AI Quiz generated from "${docTitle}" (${quizQuestions.length} total questions)`, 'auto_awesome');
      setScreen('quiz');
    });
  });
}


import {
  state,
  setScreen,
  showToast,
  xrAppsList,
  XrApp
} from '../state';

export function renderXrStore(): string {
  const filteredApps =
    state.xrCategoryFilter === 'all'
      ? xrAppsList
      : xrAppsList.filter(app => app.category === state.xrCategoryFilter);

  return `
    <div class="flex flex-col w-full bg-[#FAFBFC] flex-1 min-h-[calc(100vh-4rem)] relative">
      
      <!-- Top Scope & Hardware Bar -->
      <section class="w-full bg-white border-b border-[#E2E8F0] px-4 sm:px-6 lg:px-8 py-3">
        <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2 text-[#0F172A] flex-wrap font-mono">
            <span class="font-bold text-[#FF4757] font-sans flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px]">view_in_ar</span>
              EdVidura Spatial XR Store
            </span>
            <span class="text-[#CBD5E1]">/</span>
            <span class="text-[#64748B] font-sans">OpenXR 1.1 &amp; WebGL 2.0 Academic Catalogue</span>
            <span class="text-[#CBD5E1]">/</span>
            <span class="text-[#10B981] font-bold flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              WebXR Device API Enabled
            </span>
          </div>

          <div class="flex items-center gap-2 text-xs font-mono text-[#64748B]">
            <span class="px-2.5 py-1 rounded-lg bg-[#F1F5F9] border border-[#CBD5E1] text-[#071E2D] font-bold flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px] text-[#0284C7]">devices</span>
              <span>Apple Vision Pro · Quest 3 · Chrome WebXR</span>
            </span>
          </div>
        </div>
      </section>

      <!-- Hero Banner -->
      <section class="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div class="max-w-7xl mx-auto">
          <div class="hero-navy-card relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6" style="background-color: #071E2D; background-image: linear-gradient(135deg, #071E2D 0%, #0A2540 50%, #0D2E4A 100%);">
            
            <div class="space-y-3 max-w-2xl">
              <div class="flex items-center gap-2 text-xs font-mono">
                <span class="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#FF5B6B] to-[#FF4757] text-white font-bold text-[10px] uppercase tracking-wider">Spatial STEM Hub</span>
                <span class="text-gray-400">·</span>
                <span class="text-[#38BDF8] font-bold">OpenXR Standard</span>
                <span class="text-gray-400">·</span>
                <span class="text-[#10B981] font-bold">Zero-Install Browser Streaming</span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-white font-headline leading-tight">
                Immersive XR Classrooms: <span class="text-[#FF4757]">3D Spatial Simulations</span>
              </h1>
              <p class="text-xs sm:text-sm text-gray-200 leading-relaxed font-sans">
                Step inside coordinate planes, grasp dynamic linear vectors with spatial hand tracking, and launch frictionless kinematics labs directly in WebXR or desktop 3D.
              </p>
            </div>

            <!-- Stats Badge -->
            <div class="flex sm:flex-col gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shrink-0 text-center sm:text-left">
              <div>
                <div class="text-xl font-bold text-[#FF4757] font-mono">${xrAppsList.length} Apps</div>
                <div class="text-[11px] text-gray-300">Certified for Algebra &amp; Physics</div>
              </div>
              <div class="border-t sm:border-t-white/10 pt-2">
                <div class="text-xs font-bold text-[#38BDF8] flex items-center justify-center sm:justify-start gap-1">
                  <span class="material-symbols-outlined text-[15px]">speed</span>
                  <span>90 FPS Low Latency</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- Category Filter Tabs & Catalogue Grid -->
      <main class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        
        <!-- Category Filter Tabs -->
        <div class="flex items-center justify-between flex-wrap gap-4 border-b border-[#E2E8F0] pb-3">
          <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
            ${[
              { id: 'all', label: 'All XR Applications', icon: 'apps' },
              { id: 'spatial-math', label: 'Spatial Mathematics', icon: 'view_in_ar' },
              { id: 'physics-lab', label: 'Physics & Kinematics', icon: 'biotech' },
              { id: 'geometry-ar', label: 'Augmented Geometry', icon: 'auto_awesome' },
              { id: 'simulations', label: 'Interactive Simulations', icon: 'toys' }
            ]
              .map(
                cat => `
              <button
                class="xr-category-btn px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  state.xrCategoryFilter === cat.id
                    ? 'bg-[#071E2D] text-white shadow-sm'
                    : 'bg-white hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#071E2D] border border-[#CBD5E1]'
                }"
                data-category="${cat.id}"
              >
                <span class="material-symbols-outlined text-[16px] ${
                  state.xrCategoryFilter === cat.id ? 'text-[#FF4757]' : ''
                }">${cat.icon}</span>
                <span>${cat.label}</span>
              </button>
            `
              )
              .join('')}
          </div>

          <div class="text-xs font-mono text-[#64748B]">
            Showing <strong class="text-[#071E2D]">${filteredApps.length}</strong> spatial experiences
          </div>
        </div>

        <!-- Apps Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${filteredApps.map(app => renderAppCard(app)).join('')}
        </div>

      </main>

      <!-- Application Details Modal -->
      ${state.xrSelectedApp ? renderAppDetailsModal(state.xrSelectedApp) : ''}

      <!-- Interactive 3D WebXR Simulation Launcher Modal -->
      ${state.xrActiveSimulation ? renderSimulationLauncherModal(state.xrActiveSimulation) : ''}

    </div>
  `;
}

function renderAppCard(app: XrApp): string {
  return `
    <div class="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group">
      
      <!-- Hero Image -->
      <div class="relative h-44 w-full overflow-hidden bg-[#071E2D]">
        <img
          src="${app.heroImage}"
          alt="${app.name}"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-[#071E2D] via-transparent to-black/20"></div>

        <!-- Top Badges -->
        <div class="absolute top-3 left-3 flex items-center gap-1.5">
          ${
            app.featured
              ? `<span class="px-2.5 py-0.5 rounded-full bg-[#FF4757] text-white text-[10px] font-mono font-bold shadow-xs">Featured Lab</span>`
              : ''
          }
          <span class="px-2 py-0.5 rounded-full bg-[#071E2D]/80 backdrop-blur-md text-white text-[10px] font-mono border border-white/20">
            ${app.version}
          </span>
        </div>

        <div class="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-md text-[#071E2D] text-[11px] font-bold flex items-center gap-1 shadow-xs">
          <span class="material-symbols-outlined text-[13px] text-[#F59E0B] fill-1">star</span>
          <span>${app.rating}</span>
          <span class="text-[10px] text-[#64748B]">(${app.reviewsCount})</span>
        </div>

        <!-- Bottom Title Overlay -->
        <div class="absolute bottom-3 left-4 right-4">
          <span class="text-[10px] uppercase font-mono tracking-wider font-bold text-[#38BDF8]">${app.category.toUpperCase()}</span>
          <h3 class="text-base font-bold text-white font-headline leading-tight">${app.name}</h3>
        </div>
      </div>

      <!-- Content Body -->
      <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
        
        <div class="space-y-3">
          <p class="text-xs text-[#64748B] leading-relaxed line-clamp-2">
            ${app.tagline}
          </p>

          <!-- Curriculum Standards Alignment -->
          <div class="flex flex-wrap gap-1.5">
            ${app.curriculumStandards
              .map(
                std => `
              <span class="px-2 py-0.5 rounded-md bg-[#FFF0F3] text-[#FF4757] text-[10px] font-mono font-bold border border-[#FFCCD5]">
                ${std}
              </span>
            `
              )
              .join('')}
          </div>

          <!-- Compatibility Matrix Chips -->
          <div class="space-y-1.5 pt-1">
            <span class="text-[10px] font-mono uppercase tracking-wider text-[#94A3B8] font-semibold">Hardware Compatibility:</span>
            <div class="flex flex-wrap gap-1.5 text-[10px] font-mono">
              <span class="px-2 py-0.5 rounded-md flex items-center gap-1 ${
                app.compatibility.webxr
                  ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                  : 'bg-[#F1F5F9] text-[#94A3B8] line-through'
              }">
                <span class="w-1.5 h-1.5 rounded-full ${app.compatibility.webxr ? 'bg-[#10B981]' : 'bg-[#94A3B8]'}"></span>
                WebXR
              </span>
              <span class="px-2 py-0.5 rounded-md flex items-center gap-1 ${
                app.compatibility.appleVisionPro
                  ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                  : 'bg-[#F1F5F9] text-[#94A3B8] line-through'
              }">
                <span class="w-1.5 h-1.5 rounded-full ${app.compatibility.appleVisionPro ? 'bg-[#10B981]' : 'bg-[#94A3B8]'}"></span>
                Vision Pro
              </span>
              <span class="px-2 py-0.5 rounded-md flex items-center gap-1 ${
                app.compatibility.metaQuest
                  ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                  : 'bg-[#F1F5F9] text-[#94A3B8] line-through'
              }">
                <span class="w-1.5 h-1.5 rounded-full ${app.compatibility.metaQuest ? 'bg-[#10B981]' : 'bg-[#94A3B8]'}"></span>
                Quest
              </span>
              <span class="px-2 py-0.5 rounded-md flex items-center gap-1 ${
                app.compatibility.desktopWebgl
                  ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                  : 'bg-[#F1F5F9] text-[#94A3B8] line-through'
              }">
                <span class="w-1.5 h-1.5 rounded-full ${app.compatibility.desktopWebgl ? 'bg-[#10B981]' : 'bg-[#94A3B8]'}"></span>
                Desktop 3D
              </span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="pt-3 border-t border-[#E2E8F0] flex items-center gap-2">
          <button
            class="xr-inspect-btn flex-1 py-2 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#071E2D] text-xs font-bold transition-colors cursor-pointer"
            data-app-id="${app.id}"
          >
            Details
          </button>

          <button
            class="xr-launch-btn flex-2 py-2 px-3 rounded-xl btn-primary-3d text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
            data-app-id="${app.id}"
          >
            <span class="material-symbols-outlined text-[16px]">play_circle</span>
            <span>Launch WebXR Lab</span>
          </button>
        </div>

      </div>
    </div>
  `;
}

function renderAppDetailsModal(app: XrApp): string {
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071E2D]/60 backdrop-blur-sm animate-fade-in">
      <div class="bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <!-- Header Image Header -->
        <div class="relative h-48 bg-[#071E2D]">
          <img src="${app.heroImage}" alt="${app.name}" class="w-full h-full object-cover opacity-85" />
          <div class="absolute inset-0 bg-gradient-to-t from-[#071E2D] via-black/40 to-black/20"></div>
          
          <button id="close-app-details-btn" class="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>

          <div class="absolute bottom-4 left-6 right-6">
            <div class="flex items-center gap-2 text-xs font-mono text-[#38BDF8] mb-1">
              <span>${app.category.toUpperCase()}</span>
              <span>·</span>
              <span>${app.version}</span>
              <span>·</span>
              <span class="text-white">${app.size}</span>
            </div>
            <h2 class="text-xl font-bold text-white font-headline">${app.name}</h2>
          </div>
        </div>

        <!-- Body Details -->
        <div class="p-6 overflow-y-auto space-y-5 flex-1">
          <div>
            <h4 class="text-xs font-bold text-[#071E2D] uppercase tracking-wider font-mono mb-1.5">Overview</h4>
            <p class="text-sm text-[#334155] leading-relaxed">${app.description}</p>
          </div>

          <!-- Standards & Developer Info -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
            <div>
              <span class="text-[10px] font-mono uppercase tracking-wider text-[#64748B] font-semibold">Curriculum Standards</span>
              <div class="flex flex-wrap gap-1 mt-1">
                ${app.curriculumStandards
                  .map(
                    s => `
                  <span class="px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[11px] font-mono font-bold text-[#071E2D]">
                    ${s}
                  </span>
                `
                  )
                  .join('')}
              </div>
            </div>

            <div>
              <span class="text-[10px] font-mono uppercase tracking-wider text-[#64748B] font-semibold">Developer &amp; Verification</span>
              <p class="text-xs font-bold text-[#071E2D] mt-1">${app.developer}</p>
              <p class="text-[11px] text-[#10B981] font-mono font-semibold flex items-center gap-1 mt-0.5">
                <span class="material-symbols-outlined text-[13px]">verified</span>
                District FERPA &amp; OpenXR Compliant
              </p>
            </div>
          </div>

          <!-- Hardware Requirements -->
          <div>
            <h4 class="text-xs font-bold text-[#071E2D] uppercase tracking-wider font-mono mb-1.5">Hardware Requirements</h4>
            <p class="text-xs text-[#64748B] font-mono bg-white p-3 rounded-xl border border-[#CBD5E1]">
              ${app.hardwareRequirements}
            </p>
          </div>
        </div>

        <!-- Footer CTA -->
        <div class="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between">
          <button id="dismiss-app-details-btn" class="px-4 py-2 rounded-xl bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#0F172A] text-xs font-bold cursor-pointer transition-colors">
            Back to Catalogue
          </button>
          
          <button
            class="xr-launch-from-modal-btn px-6 py-2.5 rounded-xl btn-primary-3d text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
            data-app-id="${app.id}"
          >
            <span class="material-symbols-outlined text-[16px]">play_circle</span>
            <span>Launch WebXR Lab Now</span>
          </button>
        </div>

      </div>
    </div>
  `;
}

function renderSimulationLauncherModal(app: XrApp): string {
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#071E2D]/80 backdrop-blur-md animate-fade-in">
      <div class="bg-[#0A1624] text-white rounded-3xl shadow-2xl border border-[#1E435E] w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        
        <!-- Top Simulation Toolbar -->
        <div class="px-6 py-4 bg-[#071E2D] border-b border-[#1E435E] flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-[#FF4757] text-white flex items-center justify-center shadow-md">
              <span class="material-symbols-outlined text-[20px]">view_in_ar</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-md bg-[#10B981]/20 text-[#10B981] text-[10px] font-mono font-bold">
                  SESSION ACTIVE · 90 FPS
                </span>
                <span class="text-xs font-mono text-gray-400">${app.name} (${app.version})</span>
              </div>
              <h2 class="text-sm font-bold text-white font-headline">Interactive Cartesian 3D WebXR Laboratory</h2>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <span class="text-xs font-mono text-[#38BDF8] flex items-center gap-1 hidden sm:flex">
              <span class="material-symbols-outlined text-[15px]">pan_tool</span>
              <span>Spatial Pinch &amp; Grab Enabled</span>
            </span>

            <button
              id="exit-simulation-btn"
              class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span class="material-symbols-outlined text-[16px]">close</span>
              <span>Exit WebXR Lab</span>
            </button>
          </div>
        </div>

        <!-- 3D Spatial Canvas Viewport Area -->
        <div class="flex-1 relative flex flex-col lg:flex-row overflow-hidden">
          
          <!-- Interactive SVG/WebGL 3D Cartesian Simulation Canvas -->
          <div class="flex-1 bg-gradient-to-b from-[#071524] via-[#091D33] to-[#040C15] flex items-center justify-center relative p-4 select-none">
            
            <!-- Spatial Grid Background Elements -->
            <svg class="w-full h-full max-h-[540px] drop-shadow-2xl" viewBox="-200 -160 400 320">
              <!-- Coordinate Grid Lines -->
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E3A5F" stroke-width="0.8" opacity="0.6"/>
                </pattern>
                <radialGradient id="planeGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#FF4757" stop-opacity="0.25"/>
                  <stop offset="100%" stop-color="#071E2D" stop-opacity="0"/>
                </radialGradient>
              </defs>

              <!-- Perspective Isometric Grid Floor -->
              <ellipse cx="0" cy="80" rx="190" ry="60" fill="url(#planeGlow)"/>
              <rect x="-180" y="-140" width="360" height="280" fill="url(#grid)" opacity="0.5"/>

              <!-- 3D Axes -->
              <!-- Z Axis (Blue depth) -->
              <line x1="-100" y1="50" x2="100" y2="-50" stroke="#0284C7" stroke-width="2.5" stroke-dasharray="4,4"/>
              <text x="110" y="-55" fill="#38BDF8" font-size="10" font-family="monospace" font-weight="bold">Z (Depth)</text>

              <!-- X Axis (Horizontal Green) -->
              <line x1="-160" y1="0" x2="160" y2="0" stroke="#10B981" stroke-width="3"/>
              <text x="165" y="4" fill="#10B981" font-size="11" font-family="monospace" font-weight="bold">+X</text>
              <text x="-185" y="4" fill="#10B981" font-size="11" font-family="monospace" font-weight="bold">-X</text>

              <!-- Y Axis (Vertical Amber) -->
              <line x1="0" y1="130" x2="0" y2="-130" stroke="#F59E0B" stroke-width="3"/>
              <text x="6" y="-135" fill="#F59E0B" font-size="11" font-family="monospace" font-weight="bold">+Y</text>
              <text x="6" y="145" fill="#F59E0B" font-size="11" font-family="monospace" font-weight="bold">-Y</text>

              <!-- Dynamic Linear Slope Vector (Red Glow) -->
              <line id="sim-vector-line" x1="-120" y1="70" x2="120" y2="-90" stroke="#FF4757" stroke-width="4.5" stroke-linecap="round"/>
              
              <!-- Points P1 & P2 -->
              <circle cx="-60" cy="30" r="6" fill="#FF4757" stroke="#FFFFFF" stroke-width="2"/>
              <text x="-95" y="45" fill="#FFFFFF" font-size="10" font-family="monospace">P₁(x₁, y₁)</text>

              <circle cx="60" cy="-50" r="6" fill="#FF4757" stroke="#FFFFFF" stroke-width="2"/>
              <text x="68" y="-55" fill="#FFFFFF" font-size="10" font-family="monospace">P₂(x₂, y₂)</text>

              <!-- Coordinate Intercept Glow (0, b) -->
              <circle cx="0" cy="-10" r="5" fill="#38BDF8" stroke="#FFFFFF" stroke-width="1.5"/>
              <text x="8" y="-15" fill="#38BDF8" font-size="10" font-family="monospace">b (Intercept)</text>

              <!-- Orthogonal Perpendicular Normal Vector -->
              <line x1="0" y1="-10" x2="70" y2="40" stroke="#9333EA" stroke-width="2.5" stroke-dasharray="3,3"/>
              <text x="75" y="55" fill="#C084FC" font-size="9" font-family="monospace">Perpendicular Normal (m₂ = -1/m₁)</text>
            </svg>

            <!-- Floating Headset Controls Overlay -->
            <div class="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 text-[11px] font-mono text-gray-300">
              <span class="text-[#10B981] font-bold">● Tracking:</span> 6DOF Hand Meshes Synced
            </div>
          </div>

          <!-- Right Sidebar: Interactive Spatial Parameters -->
          <div class="w-full lg:w-80 bg-[#071E2D] border-t lg:border-t-0 lg:border-l border-[#1E435E] p-5 flex flex-col justify-between space-y-4 overflow-y-auto">
            
            <div class="space-y-4">
              <div>
                <h4 class="text-xs font-bold text-white uppercase tracking-wider font-mono">Live Equation Formulation</h4>
                <div class="p-3.5 rounded-xl bg-[#03111C] border border-[#1E435E] mt-2 font-mono text-center">
                  <span class="text-xs text-gray-400">Canonical Line:</span>
                  <div class="text-base font-bold text-[#FF4757] mt-0.5" id="sim-equation-readout">y = 1.50x + 2.00</div>
                  <div class="text-[11px] text-[#38BDF8] mt-1">Perpendicular Slope: m_perp = -0.67</div>
                </div>
              </div>

              <!-- Parameter Sliders -->
              <div class="space-y-3 text-xs">
                <div>
                  <div class="flex justify-between font-mono mb-1">
                    <span class="text-gray-300">Slope Parameter (m):</span>
                    <span class="text-[#FF4757] font-bold" id="slope-val-display">1.50</span>
                  </div>
                  <input
                    type="range"
                    id="sim-slope-slider"
                    min="-4.0"
                    max="4.0"
                    step="0.25"
                    value="1.50"
                    class="w-full accent-[#FF4757] cursor-pointer"
                  />
                </div>

                <div>
                  <div class="flex justify-between font-mono mb-1">
                    <span class="text-gray-300">Vertical Offset (b):</span>
                    <span class="text-[#F59E0B] font-bold" id="intercept-val-display">2.00</span>
                  </div>
                  <input
                    type="range"
                    id="sim-intercept-slider"
                    min="-10"
                    max="10"
                    step="0.5"
                    value="2.00"
                    class="w-full accent-[#F59E0B] cursor-pointer"
                  />
                </div>

                <div>
                  <div class="flex justify-between font-mono mb-1">
                    <span class="text-gray-300">Spatial Azimuth Tilt:</span>
                    <span class="text-[#10B981] font-bold" id="tilt-val-display">35°</span>
                  </div>
                  <input
                    type="range"
                    id="sim-tilt-slider"
                    min="0"
                    max="90"
                    step="5"
                    value="35"
                    class="w-full accent-[#10B981] cursor-pointer"
                  />
                </div>
              </div>

              <div class="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-gray-300 space-y-1">
                <strong class="text-white">xAPI Tracking:</strong>
                <p>Manipulations emit <code class="text-[#38BDF8]">interacted</code> xAPI telemetry to your district LRS with Cartesian matrix coordinates.</p>
              </div>
            </div>

            <!-- Bottom Actions -->
            <div class="space-y-2 pt-2">
              <button
                id="reset-sim-btn"
                class="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Reset Spatial Origin (0,0,0)
              </button>
              <button
                id="exit-sim-bottom-btn"
                class="w-full py-2 rounded-xl bg-[#FF4757] hover:bg-[#E83D4D] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                End WebXR Lab Session
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  `;
}

export function bindXrStoreEvents(container: HTMLElement): void {
  // Category filter buttons
  container.querySelectorAll('.xr-category-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const cat = (e.currentTarget as HTMLElement).getAttribute('data-category');
      if (cat) {
        state.xrCategoryFilter = cat;
        setScreen('xr-store');
      }
    });
  });

  // App Details inspect buttons
  container.querySelectorAll('.xr-inspect-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const appId = (e.currentTarget as HTMLElement).getAttribute('data-app-id');
      const app = xrAppsList.find(a => a.id === appId);
      if (app) {
        state.xrSelectedApp = app;
        setScreen('xr-store');
      }
    });
  });

  // Close app details modal
  container.querySelector('#close-app-details-btn')?.addEventListener('click', () => {
    state.xrSelectedApp = null;
    setScreen('xr-store');
  });
  container.querySelector('#dismiss-app-details-btn')?.addEventListener('click', () => {
    state.xrSelectedApp = null;
    setScreen('xr-store');
  });

  // Launch buttons
  const handleLaunch = (appId: string) => {
    const app = xrAppsList.find(a => a.id === appId);
    if (app) {
      state.xrSelectedApp = null;
      state.xrActiveSimulation = app;
      showToast(`Launching ${app.name} in WebXR Spatial Mode...`, 'view_in_ar');
      setScreen('xr-store');
    }
  };

  container.querySelectorAll('.xr-launch-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const appId = (e.currentTarget as HTMLElement).getAttribute('data-app-id');
      if (appId) handleLaunch(appId);
    });
  });

  container.querySelectorAll('.xr-launch-from-modal-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const appId = (e.currentTarget as HTMLElement).getAttribute('data-app-id');
      if (appId) handleLaunch(appId);
    });
  });

  // Exit simulation modal
  container.querySelector('#exit-simulation-btn')?.addEventListener('click', () => {
    state.xrActiveSimulation = null;
    showToast('Exited WebXR session', 'check');
    setScreen('xr-store');
  });
  container.querySelector('#exit-sim-bottom-btn')?.addEventListener('click', () => {
    state.xrActiveSimulation = null;
    showToast('Exited WebXR session', 'check');
    setScreen('xr-store');
  });

  // Interactive Simulation Sliders
  const slopeSlider = container.querySelector('#sim-slope-slider') as HTMLInputElement;
  const interceptSlider = container.querySelector('#sim-intercept-slider') as HTMLInputElement;
  const tiltSlider = container.querySelector('#sim-tilt-slider') as HTMLInputElement;

  const slopeDisplay = container.querySelector('#slope-val-display');
  const interceptDisplay = container.querySelector('#intercept-val-display');
  const tiltDisplay = container.querySelector('#tilt-val-display');
  const equationReadout = container.querySelector('#sim-equation-readout');

  const updateSim = () => {
    if (!slopeSlider || !interceptSlider) return;
    const m = parseFloat(slopeSlider.value);
    const b = parseFloat(interceptSlider.value);

    if (slopeDisplay) slopeDisplay.textContent = m.toFixed(2);
    if (interceptDisplay) interceptDisplay.textContent = b.toFixed(2);
    if (tiltSlider && tiltDisplay) tiltDisplay.textContent = `${tiltSlider.value}°`;

    if (equationReadout) {
      const sign = b >= 0 ? '+' : '-';
      equationReadout.textContent = `y = ${m.toFixed(2)}x ${sign} ${Math.abs(b).toFixed(2)}`;
    }
  };

  slopeSlider?.addEventListener('input', updateSim);
  interceptSlider?.addEventListener('input', updateSim);
  tiltSlider?.addEventListener('input', updateSim);

  container.querySelector('#reset-sim-btn')?.addEventListener('click', () => {
    if (slopeSlider) slopeSlider.value = '1.0';
    if (interceptSlider) interceptSlider.value = '0.0';
    if (tiltSlider) tiltSlider.value = '0';
    updateSim();
    showToast('Reset Cartesian spatial coordinates to default', 'refresh');
  });
}

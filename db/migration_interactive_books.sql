-- ======================================================================
-- MIGRATION: Living Interactive Textbooks & Concept Reels (Phase 2 Engine)
-- Stores synchronized chapter visual beats, multilingual narration cues,
-- animated diagrams, and inline concept checks for all 5 demo textbooks.
-- ======================================================================

CREATE TABLE IF NOT EXISTS book_chapter_beats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    manual_id TEXT NOT NULL,
    chapter_index INT NOT NULL,
    beat_index INT NOT NULL,
    title TEXT NOT NULL,
    narration_text TEXT NOT NULL,
    narration_translations_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    visual_diagram_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
    highlight_targets JSONB NOT NULL DEFAULT '[]'::jsonb,
    inline_check_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    duration_sec INT NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_book_chapter_beats_manual 
    ON book_chapter_beats (manual_id, chapter_index, beat_index);

-- Seed Rich 3-to-4 Beat Visual Storyboards for all 5 Textbooks
DO $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'riverside' LIMIT 1;
    IF v_tenant_id IS NOT NULL THEN

        -- ============================================================
        -- BOOK 1: Algebra I (de7900fd-488b-4740-bf7e-7a11b3475cd6)
        -- ============================================================
        DELETE FROM book_chapter_beats WHERE manual_id = 'de7900fd-488b-4740-bf7e-7a11b3475cd6';

        -- Beat 0: What is an Equation?
        INSERT INTO book_chapter_beats (
            tenant_id, manual_id, chapter_index, beat_index, title, narration_text,
            narration_translations_json, visual_diagram_spec, inline_check_json, duration_sec
        ) VALUES (
            v_tenant_id, 'de7900fd-488b-4740-bf7e-7a11b3475cd6', 0, 0,
            'The Equal Sign as a Balanced Scale',
            'An equation states that two mathematical expressions represent the exact same quantity. Picture a balanced physical scale: whatever you do to one side, you must do to the other to keep it balanced.',
            '{"hi": "एक समीकरण यह बताता है कि दो गणितीय भाव बिल्कुल समान मात्रा का प्रतिनिधित्व करते हैं। एक संतुलित तराजू की कल्पना करें।", "te": "ఒక సమీకరణం రెండు గణిత సమాసాలు సరిగ్గా ఒకే విలువను సూచిస్తాయని చెబుతుంది. సమతుల్య త్రాసును ఊహించుకోండి."}'::jsonb,
            '{"type": "balance_scale", "left": "2x + 5", "right": "15", "pivot": "center", "balanced": true}'::jsonb,
            '{"question": "Why must an operation be applied to both sides of an equation?", "options": ["To change the variable", "To preserve balance and equality", "To eliminate all numbers", "To double the answer"], "correct": 1, "explanation": "Applying operations equally to both sides ensures the mathematical statement remains true."}'::jsonb,
            30
        );

        -- Beat 1: Isolating the Variable Term
        INSERT INTO book_chapter_beats (
            tenant_id, manual_id, chapter_index, beat_index, title, narration_text,
            narration_translations_json, visual_diagram_spec, inline_check_json, duration_sec
        ) VALUES (
            v_tenant_id, 'de7900fd-488b-4740-bf7e-7a11b3475cd6', 0, 1,
            'Undoing Constant Addition',
            'In 2x + 5 = 15, our first objective is to isolate the variable term 2x. Because 5 is added, we use the inverse operation: subtract 5 from both sides, yielding 2x = 10.',
            '{"hi": "2x + 5 = 15 में, हमारा पहला लक्ष्य 2x पद को अलग करना है। 5 घटाने पर हमें 2x = 10 मिलता है।", "te": "2x + 5 = 15 లో, మొదటి లక్ష్యం 2x పదాన్ని వేరుచేయడం. రెండు వైపులా 5 తీసివేస్తే 2x = 10 అవుతుంది."}'::jsonb,
            '{"type": "step_transformation", "initial": "2x + 5 = 15", "action": "- 5 from both sides", "result": "2x = 10", "highlight": "-5"}'::jsonb,
            '{"question": "What is the inverse operation of adding 5?", "options": ["Adding 5", "Subtracting 5", "Multiplying by 5", "Dividing by 5"], "correct": 1, "explanation": "Subtraction is the inverse of addition."}'::jsonb,
            35
        );

        -- Beat 2: Isolating x
        INSERT INTO book_chapter_beats (
            tenant_id, manual_id, chapter_index, beat_index, title, narration_text,
            narration_translations_json, visual_diagram_spec, inline_check_json, duration_sec
        ) VALUES (
            v_tenant_id, 'de7900fd-488b-4740-bf7e-7a11b3475cd6', 0, 2,
            'Dividing by the Coefficient',
            'Now we have 2x = 10. The coefficient 2 is multiplying x. We divide both sides by 2 to isolate x completely: x = 10 / 2 = 5.',
            '{"hi": "अब हमारे पास 2x = 10 है। 2 से दोनों पक्षों को भाग देने पर: x = 5।", "te": "ఇప్పుడు 2x = 10 ఉంది. రెండు వైపులా 2 తో భాగిస్తే: x = 5 అవుతుంది."}'::jsonb,
            '{"type": "solution_card", "step": "Divide by 2", "equation": "x = 5", "verified": true}'::jsonb,
            '{"question": "If 2x = 10, what is the value of x?", "options": ["2", "5", "8", "20"], "correct": 1, "explanation": "Dividing 10 by 2 gives x = 5."}'::jsonb,
            25
        );

        -- ============================================================
        -- BOOK 2: Physical Science & Electrical Safety
        -- ============================================================
        DELETE FROM book_chapter_beats WHERE manual_id = 'science-class8-physics';

        INSERT INTO book_chapter_beats (
            tenant_id, manual_id, chapter_index, beat_index, title, narration_text,
            narration_translations_json, visual_diagram_spec, inline_check_json, duration_sec
        ) VALUES (
            v_tenant_id, 'science-class8-physics', 0, 0,
            'The Three Wire Color Code',
            'Standard domestic electrical circuits utilize three dedicated conductors: Live (Brown or Red), Neutral (Blue or Black), and Earth (Green with Yellow stripe). The earth wire ensures safety by routing fault current into the ground.',
            '{"hi": "घरेलू विद्युत सर्किट में तीन तार होते हैं: लाइव (लाल/भूरा), न्यूट्रल (नीला/काला) और अर्थ (हरा/पीला)।", "te": "గృహ విద్యుత్ వలయాల్లో మూడు తీగలు ఉంటాయి: లైవ్ (ఎరుపు), న్యూట్రల్ (నలుపు) మరియు ఎర్త్ (ఆకుపచ్చ)."}'::jsonb,
            '{"type": "circuit_wiring", "wires": [{"name": "Live", "color": "#ef4444"}, {"name": "Neutral", "color": "#3b82f6"}, {"name": "Earth", "color": "#22c55e"}]}'::jsonb,
            '{"question": "What is the primary safety purpose of the earth conductor?", "options": ["To power the appliance", "To carry fault current safely into the ground", "To increase voltage", "To store electricity"], "correct": 1, "explanation": "The earth wire diverts dangerous fault currents safely to earth, tripping the breaker."}'::jsonb,
            35
        );

        -- ============================================================
        -- BOOK 3: Indian Railways Safety
        -- ============================================================
        DELETE FROM book_chapter_beats WHERE manual_id = 'railways-safety-ops';

        INSERT INTO book_chapter_beats (
            tenant_id, manual_id, chapter_index, beat_index, title, narration_text,
            narration_translations_json, visual_diagram_spec, inline_check_json, duration_sec
        ) VALUES (
            v_tenant_id, 'railways-safety-ops', 0, 0,
            'Automatic Block Signalling System',
            'Indian Railways operates on the Absolute and Automatic Block signalling systems. High-intensity LED signals protect track segments, preventing train headway conflicts.',
            '{"hi": "भारतीय रेल में स्वचालित ब्लॉक सिग्नलिंग प्रणाली का उपयोग ट्रैक सुरक्षा सुनिश्चित करने के लिए किया जाता है।", "te": "భారతీయ రైల్వేలలో ఆటోమేటిక్ బ్లాక్ సిగ్నలింగ్ వ్యవస్థ ట్రాక్ భద్రతను నిర్ధారిస్తుంది."}'::jsonb,
            '{"type": "railway_signal", "aspects": ["Green: Clear", "Double Yellow: Attention", "Yellow: Caution", "Red: Stop"]}'::jsonb,
            '{"question": "What does a Yellow aspect signal instruct the loco pilot to do?", "options": ["Proceed at maximum speed", "Pass at normal speed", "Proceed with caution, prepare to stop at next signal", "Reverse the train"], "correct": 2, "explanation": "Yellow signifies caution and preparing to stop at the subsequent signal."}'::jsonb,
            30
        );

        -- ============================================================
        -- BOOK 4: Digital Literacy & Cyber Hygiene
        -- ============================================================
        DELETE FROM book_chapter_beats WHERE manual_id = 'digital-literacy-ai';

        INSERT INTO book_chapter_beats (
            tenant_id, manual_id, chapter_index, beat_index, title, narration_text,
            narration_translations_json, visual_diagram_spec, inline_check_json, duration_sec
        ) VALUES (
            v_tenant_id, 'digital-literacy-ai', 0, 0,
            'Password Hygiene and Multi-Factor Authentication',
            'Strong credentials require length, entropy, and independent verification through Multi-Factor Authentication (MFA). Never reuse passwords across academic and financial portals.',
            '{"hi": "मजबूत पासवर्ड और मल्टी-फैक्टर प्रमाणीकरण (MFA) साइबर सुरक्षा की पहली रक्षा पंक्ति हैं।", "te": "బలమైన పాస్‌వర్డ్‌లు మరియు మల్టీ-ఫాక్టర్ ప్రామాణీకరణ (MFA) సైబర్ భద్రతకు అత్యంత అవసరం."}'::jsonb,
            '{"type": "security_shield", "layers": ["Long Passphrase", "Time-based OTP", "Device Biometrics"]}'::jsonb,
            '{"question": "Why is multi-factor authentication (MFA) critical for student portals?", "options": ["It makes logins faster", "It stops unauthorized access even if password is compromised", "It replaces the password entirely", "It reduces network bandwidth"], "correct": 1, "explanation": "MFA ensures an attacker cannot log in with only a stolen password."}'::jsonb,
            30
        );

        -- ============================================================
        -- BOOK 5: Niti, Ethics & Life Values
        -- ============================================================
        DELETE FROM book_chapter_beats WHERE manual_id = 'niti-ethics-values';

        INSERT INTO book_chapter_beats (
            tenant_id, manual_id, chapter_index, beat_index, title, narration_text,
            narration_translations_json, visual_diagram_spec, inline_check_json, duration_sec
        ) VALUES (
            v_tenant_id, 'niti-ethics-values', 0, 0,
            'Vidura Niti: Truth, Duty & Compassion',
            'Ancient Indian ethical discourse in Vidura Niti emphasizes perseverance, intellectual honesty, and treating all fellow learners with dignity and empathy.',
            '{"hi": "विदुर नीति सत्य, कर्तव्यनिष्ठा और करुणा पर जोर देती है।", "te": "విదుర నీతి సత్యం, ధర్మం మరియు కరుణను ప్రతిపాదించింది."}'::jsonb,
            '{"type": "values_pillar", "pillars": ["Satya (Truth)", "Dharma (Righteous Action)", "Karuna (Empathy)"]}'::jsonb,
            '{"question": "What is the core pillar of intellectual honesty in collaborative study?", "options": ["Claiming credit for others work", "Acknowledging sources and helping peers grow", "Studying in isolation", "Memorizing without understanding"], "correct": 1, "explanation": "Intellectual honesty means giving credit and uplifting fellow learners."}'::jsonb,
            30
        );

    END IF;
END $$;

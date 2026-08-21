-- Demo manual sections for Manual ⟷ quiz loop (focus=gradebook-sync, etc.)
-- Apply after migration_manuals.sql when you want seeded headings.
-- Safe to re-run: upserts by fixed UUIDs for Tenant A.

INSERT INTO manuals (id, tenant_id, title, slug, status)
VALUES (
    'b1111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'EdVidura teacher handbook',
    'teacher-handbook',
    'published'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    status = 'published';

INSERT INTO manual_versions (
    id, tenant_id, manual_id, version, body_md, changelog, is_published
)
VALUES (
    'b2222222-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'b1111111-1111-1111-1111-111111111111',
    1,
    E'## LTI launch\n\nMoodle opens EdVidura in a new window with an LTI 1.3 launch. The tool validates the platform and opens a tenant session.\n\n## Tenant isolation\n\nEach school is a tenant. RLS keeps attempts, lessons, and manuals scoped by tenant_id.\n\n## Gradebook sync\n\nScores sync to Moodle via AGS when the launch includes a line item. Practice attempts skip gradebook sync.',
    'Seeded sections for competency deep-links',
    TRUE
)
ON CONFLICT (manual_id, version) DO UPDATE SET
    body_md = EXCLUDED.body_md,
    changelog = EXCLUDED.changelog,
    is_published = TRUE;

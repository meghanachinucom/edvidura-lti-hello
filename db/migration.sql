-- SQL Migration: Add institutions and students tables with tenant ownership & composite student uniqueness

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    institution_code TEXT NOT NULL UNIQUE,
    institution_name TEXT NOT NULL,
    issuer TEXT NOT NULL,
    client_id TEXT NOT NULL,
    deployment_ids TEXT[] NOT NULL DEFAULT ARRAY['1']::TEXT[],
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_code TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_students_institution_student_code UNIQUE (institution_id, student_code)
);

CREATE INDEX IF NOT EXISTS idx_institutions_tenant_id ON institutions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_institutions_code ON institutions (institution_code);
CREATE INDEX IF NOT EXISTS idx_students_institution_id ON students (institution_id);
CREATE INDEX IF NOT EXISTS idx_students_code ON students (student_code);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO edvidura_app;

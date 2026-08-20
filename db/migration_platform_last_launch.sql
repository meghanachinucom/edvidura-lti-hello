-- Add last successful LTI launch timestamp for onboarding "test launch" status.
ALTER TABLE lti_platforms
    ADD COLUMN IF NOT EXISTS last_launch_at TIMESTAMPTZ;

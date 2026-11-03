-- Sellable Lego block ids selected for a tenant (contract / SKU merge).
-- Capabilities remain the runtime gates; enabled_blocks is the sales selection.

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS enabled_blocks JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tenants.enabled_blocks IS
    'Ordered JSON array of block ids from app.modules.tenancy.blocks (SKU selection)';

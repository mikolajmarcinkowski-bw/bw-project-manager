-- Dodaj wartość 'critical' do enumu cr_impact
-- ALTER TYPE ... ADD VALUE jest idempotentne przy IF NOT EXISTS (PG 9.6+)
ALTER TYPE cr_impact ADD VALUE IF NOT EXISTS 'critical';

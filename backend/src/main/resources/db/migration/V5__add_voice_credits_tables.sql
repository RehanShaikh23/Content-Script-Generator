-- ============================================================
-- Migration V5: Add Voice Credits & ElevenLabs Generation Tables
-- Run on Supabase when ready to deploy the voice feature.
-- ============================================================

-- 1. Voice Credit Account — one per user, tracks current balance
CREATE TABLE IF NOT EXISTS voice_credit_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance         INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    total_purchased INTEGER NOT NULL DEFAULT 0,
    total_used      INTEGER NOT NULL DEFAULT 0,
    total_refunded  INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_credit_accounts_user_id
    ON voice_credit_accounts (user_id);

-- 2. Voice Credit Transactions — immutable ledger
CREATE TABLE IF NOT EXISTS voice_credit_transactions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type              VARCHAR(30) NOT NULL,          -- PURCHASE, RESERVATION, DEDUCTION, RELEASE, REFUND, SETTLEMENT
    amount            INTEGER NOT NULL,              -- positive for credits in, negative for credits out
    balance_after     INTEGER NOT NULL,
    idempotency_key   VARCHAR(255) NOT NULL UNIQUE,  -- prevents double processing
    reference_type    VARCHAR(30),                   -- PAYMENT, GENERATION, ADMIN
    reference_id      VARCHAR(255),                  -- payment_id or generation_id
    description       VARCHAR(500),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_credit_txn_user_id
    ON voice_credit_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_voice_credit_txn_idempotency
    ON voice_credit_transactions (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_voice_credit_txn_reference
    ON voice_credit_transactions (reference_type, reference_id);

-- 3. Voice Pack Purchases — tracks each ₹800 purchase
CREATE TABLE IF NOT EXISTS voice_pack_purchases (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_id        VARCHAR(255) NOT NULL UNIQUE,  -- Dodo payment ID, enforces exactly-once
    product_id        VARCHAR(255) NOT NULL,
    amount_paid       INTEGER NOT NULL,              -- in smallest currency unit (paise)
    currency          VARCHAR(10) NOT NULL DEFAULT 'INR',
    credits_granted   INTEGER NOT NULL DEFAULT 10000,
    status            VARCHAR(30) NOT NULL DEFAULT 'COMPLETED', -- COMPLETED, REFUNDED
    webhook_id        VARCHAR(255),
    metadata          TEXT,                           -- JSON metadata from payment
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_pack_purchases_user_id
    ON voice_pack_purchases (user_id);
CREATE INDEX IF NOT EXISTS idx_voice_pack_purchases_payment_id
    ON voice_pack_purchases (payment_id);

-- 4. Voice Generations — tracks each TTS generation job
CREATE TABLE IF NOT EXISTS voice_generations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    script_history_id    UUID REFERENCES script_history(id),
    voice_id             VARCHAR(100) NOT NULL,
    model_id             VARCHAR(100) NOT NULL,
    status               VARCHAR(30) NOT NULL DEFAULT 'PENDING',  -- PENDING, PROCESSING, COMPLETED, FAILED, TIMEOUT
    input_text           TEXT NOT NULL,
    input_char_count     INTEGER NOT NULL,
    estimated_credits    INTEGER NOT NULL DEFAULT 0,
    actual_credits       INTEGER,                    -- set after provider response
    reserved_credits     INTEGER NOT NULL DEFAULT 0,
    idempotency_key      VARCHAR(255) NOT NULL UNIQUE,
    audio_storage_key    VARCHAR(500),               -- local file path or storage key
    audio_content_type   VARCHAR(50) DEFAULT 'audio/mpeg',
    audio_size_bytes     BIGINT,
    audio_duration_ms    BIGINT,
    error_message        VARCHAR(1000),
    provider_request_id  VARCHAR(255),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at         TIMESTAMPTZ,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_generations_user_id
    ON voice_generations (user_id);
CREATE INDEX IF NOT EXISTS idx_voice_generations_status
    ON voice_generations (status);
CREATE INDEX IF NOT EXISTS idx_voice_generations_idempotency
    ON voice_generations (idempotency_key);

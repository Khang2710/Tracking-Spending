-- =============================================================================
-- SUPABASE / POSTGRESQL PRODUCTION DDL & SECURITY SCHEMA
-- Generated based on Supabase Postgres Best Practices Audit
-- =============================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    currency_preference VARCHAR(10) NOT NULL DEFAULT 'VND',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. WALLETS TABLE
CREATE TABLE IF NOT EXISTS wallets (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    amount NUMERIC(14, 2) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'INCOME' or 'OUTCOME'
    category VARCHAR(100) NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE
);

-- 4. SPLIT BILLS TABLE
CREATE TABLE IF NOT EXISTS split_bills (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    total_amount NUMERIC(14, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. BILL PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS bill_participants (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    amount_owed NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    split_bill_id BIGINT NOT NULL REFERENCES split_bills(id) ON DELETE CASCADE
);

-- =============================================================================
-- CRITICAL INDEXES FOR QUERY PERFORMANCE & FOREIGN KEYS (query-missing-indexes)
-- =============================================================================

-- Foreign Key Indexes for fast join & cascade delete performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_bill_participants_split_bill_id ON bill_participants(split_bill_id);

-- Composite Index for fast date range filtering & sorting (TransactionRepository queries)
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_date ON transactions(wallet_id, date DESC);

-- Unique index for user email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) & POLICIES (security-rls)
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_participants ENABLE ROW LEVEL SECURITY;

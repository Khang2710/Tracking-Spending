-- =============================================================================
-- SUPABASE / POSTGRESQL PRODUCTION DDL & RLS SECURITY SCHEMA
-- Application: Spending Tracker (Tracking Spending)
-- Features: Multi-wallet management, Cash Flow Calendar analytics, Savings Goals,
--           Receipt OCR Split Bills, and Multi-currency preference.
-- Guidelines: Aligned with Supabase Postgres Best Practices & Security Standard.
-- =============================================================================

-- Enable extension for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auth_id UUID UNIQUE, -- References auth.users(id) in Supabase Auth
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255),
    name VARCHAR(255) DEFAULT 'User',
    currency_preference VARCHAR(10) NOT NULL DEFAULT 'VND',
    monthly_budget NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- RLS Policies for users (Using TO authenticated + auth.uid() check)
CREATE POLICY "Users can select own record" ON users
    FOR SELECT TO authenticated
    USING (auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text));

CREATE POLICY "Users can update own record" ON users
    FOR UPDATE TO authenticated
    USING (auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text))
    WITH CHECK (auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text));

-- -----------------------------------------------------------------------------
-- 2. WALLETS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    accent VARCHAR(30) NOT NULL DEFAULT '#8B5CF6',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- RLS Policies for wallets
CREATE POLICY "Users can view own wallets" ON wallets
    FOR SELECT TO authenticated
    USING (user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text)));

CREATE POLICY "Users can insert own wallets" ON wallets
    FOR INSERT TO authenticated
    WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text)));

CREATE POLICY "Users can update own wallets" ON wallets
    FOR UPDATE TO authenticated
    USING (user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text)))
    WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text)));

CREATE POLICY "Users can delete own wallets" ON wallets
    FOR DELETE TO authenticated
    USING (user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text)));

-- -----------------------------------------------------------------------------
-- 3. TRANSACTIONS TABLE (Supporting Recent Txs & Cash Flow Calendar)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'outcome', 'INCOME', 'OUTCOME')),
    category VARCHAR(100) NOT NULL DEFAULT 'Others',
    date VARCHAR(50) NOT NULL, -- Format DD-MM-YYYY
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_date ON transactions(wallet_id, created_at DESC);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT TO authenticated
    USING (wallet_id IN (SELECT id FROM wallets WHERE user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text))));

CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT TO authenticated
    WITH CHECK (wallet_id IN (SELECT id FROM wallets WHERE user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text))));

CREATE POLICY "Users can update own transactions" ON transactions
    FOR UPDATE TO authenticated
    USING (wallet_id IN (SELECT id FROM wallets WHERE user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text))))
    WITH CHECK (wallet_id IN (SELECT id FROM wallets WHERE user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text))));

CREATE POLICY "Users can delete own transactions" ON transactions
    FOR DELETE TO authenticated
    USING (wallet_id IN (SELECT id FROM wallets WHERE user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text))));

-- -----------------------------------------------------------------------------
-- 4. SAVINGS GOALS TABLE (Hũ tiết kiệm)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS savings_goals (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    target_amount NUMERIC(14, 2) NOT NULL,
    current_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    deadline VARCHAR(50),
    icon VARCHAR(50) NOT NULL DEFAULT 'PiggyBank',
    color VARCHAR(30) NOT NULL DEFAULT '#C9A45B',
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);

-- RLS Policies for savings_goals
CREATE POLICY "Users can view own savings goals" ON savings_goals
    FOR SELECT TO authenticated
    USING (user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text)));

CREATE POLICY "Users can insert own savings goals" ON savings_goals
    FOR INSERT TO authenticated
    WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text)));

CREATE POLICY "Users can update own savings goals" ON savings_goals
    FOR UPDATE TO authenticated
    USING (user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text)))
    WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text)));

CREATE POLICY "Users can delete own savings goals" ON savings_goals
    FOR DELETE TO authenticated
    USING (user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text)));

-- -----------------------------------------------------------------------------
-- 5. SPLIT BILLS TABLE (Chia tiền & Lịch sử hóa đơn)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS split_bills (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    total_amount NUMERIC(14, 2) NOT NULL,
    payer_name VARCHAR(255) NOT NULL DEFAULT 'Bạn',
    tax_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tip_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    date VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE split_bills ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_split_bills_user_id ON split_bills(user_id);

CREATE POLICY "Users can view own split bills" ON split_bills
    FOR SELECT TO authenticated
    USING (user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text)));

CREATE POLICY "Users can insert own split bills" ON split_bills
    FOR INSERT TO authenticated
    WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text)));

CREATE POLICY "Users can update own split bills" ON split_bills
    FOR UPDATE TO authenticated
    USING (user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text)))
    WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text)));

CREATE POLICY "Users can delete own split bills" ON split_bills
    FOR DELETE TO authenticated
    USING (user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text)));

-- -----------------------------------------------------------------------------
-- 6. BILL PARTICIPANTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bill_participants (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    split_bill_id BIGINT NOT NULL REFERENCES split_bills(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    amount_owed NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    settled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE bill_participants ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_bill_participants_split_bill_id ON bill_participants(split_bill_id);

CREATE POLICY "Users can manage bill participants" ON bill_participants
    FOR ALL TO authenticated
    USING (split_bill_id IN (SELECT id FROM split_bills WHERE user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text))));

-- -----------------------------------------------------------------------------
-- 7. BILL DISHES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bill_dishes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    split_bill_id BIGINT NOT NULL REFERENCES split_bills(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE bill_dishes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_bill_dishes_split_bill_id ON bill_dishes(split_bill_id);

CREATE POLICY "Users can manage bill dishes" ON bill_dishes
    FOR ALL TO authenticated
    USING (split_bill_id IN (SELECT id FROM split_bills WHERE user_id IN (SELECT id FROM users WHERE auth_id = (SELECT auth.uid()) OR id::text = (SELECT auth.uid()::text))));

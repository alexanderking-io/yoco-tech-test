CREATE TABLE registers (
    id UUID PRIMARY KEY,
    status VARCHAR(10) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE charges (
    id UUID PRIMARY KEY,
    register_id UUID NOT NULL REFERENCES registers(id),
    amount_cents BIGINT NOT NULL
        CHECK (amount_cents > 0 AND amount_cents <= 99999999),
    idempotency_key UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_charges_register_id ON charges(register_id);

CREATE TABLE fees (
    id UUID PRIMARY KEY,
    charge_id UUID NOT NULL REFERENCES charges(id) ON DELETE CASCADE,
    fee_type VARCHAR(50) NOT NULL,
    rate_basis_points INTEGER NOT NULL CHECK (rate_basis_points >= 0),
    amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,

    UNIQUE (charge_id, fee_type)
);

CREATE INDEX idx_fees_charge_id ON fees(charge_id);

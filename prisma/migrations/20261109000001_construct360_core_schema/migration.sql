-- ==============================================================================
-- CONSTRUCT360 ENTERPRISE POSTGRESQL SCHEMA MIGRATION
-- Migration Name: 20261109000001_construct360_core_schema
-- Technology: PostgreSQL 15+, PostGIS 3+, Prisma ORM
-- Architecture: Multi-Tenant (Shared-DB, Shared-Schema), RLS-Hardened, Audit-Compliant
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- EXTENSIONS & FOUNDATIONAL CONFIGURATION
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Global trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CLOCK_TIMESTAMP();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Immutable ledger protection function
CREATE OR REPLACE FUNCTION fn_prevent_immutable_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Violation: Immutable ledger records cannot be modified or deleted. Operation: %, Table: %', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- Tenant context helper function for RLS
CREATE OR REPLACE FUNCTION set_tenant_context(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_company_id', p_company_id::TEXT, true);
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- DOMAIN 1: COMPANIES & BRANCHES
-- ------------------------------------------------------------------------------
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    legal_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    tax_id VARCHAR(50), -- e.g. GSTIN / VAT / EIN
    registration_number VARCHAR(100),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    website VARCHAR(255),
    logo_url TEXT,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(30),
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    postal_code VARCHAR(20) NOT NULL,
    is_headquarters BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_branches_company_code UNIQUE (company_id, code)
);

CREATE INDEX idx_branches_company ON branches(company_id);
CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------------------------
-- DOMAIN 2: USERS & AUTHENTICATION
-- ------------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(30) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_email_verified BOOLEAN NOT NULL DEFAULT false,
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret VARCHAR(255),
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

CREATE INDEX idx_users_email ON users(email);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE user_company_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    default_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_user_company UNIQUE (user_id, company_id)
);

CREATE INDEX idx_user_memberships_user ON user_company_memberships(user_id);
CREATE INDEX idx_user_memberships_company ON user_company_memberships(company_id);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_id VARCHAR(255),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(refresh_token_hash);

-- ------------------------------------------------------------------------------
-- DOMAIN 3: ROLES & PERMISSIONS
-- ------------------------------------------------------------------------------
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULL for system-wide root roles
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_roles_company_slug UNIQUE (company_id, slug)
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL, -- e.g. 'ATTENDANCE', 'INVENTORY', 'FINANCE'
    action VARCHAR(100) NOT NULL,   -- e.g. 'CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'
    resource VARCHAR(100) NOT NULL, -- e.g. 'attendance_sessions', 'purchase_orders'
    code VARCHAR(150) NOT NULL UNIQUE, -- e.g. 'attendance:approve', 'inventory:issue'
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    project_id UUID, -- Optional project-scoped role delegation
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_user_role_assignment UNIQUE (company_id, user_id, role_id, project_id)
);

CREATE INDEX idx_user_roles_lookup ON user_roles(company_id, user_id);

-- ------------------------------------------------------------------------------
-- DOMAIN 4: EMPLOYEES (Staff, Engineers, Foremen)
-- ------------------------------------------------------------------------------
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_departments_company_code UNIQUE (company_id, code)
);

CREATE TABLE designations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    title VARCHAR(100) NOT NULL,
    level INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_designations_company_title UNIQUE (company_id, title)
);

CREATE TYPE employee_status AS ENUM ('ACTIVE', 'PROBATION', 'ON_NOTICE', 'TERMINATED', 'RESIGNED');

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL, -- Nullable for employees without login credentials
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    designation_id UUID REFERENCES designations(id) ON DELETE SET NULL,
    reporting_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    employee_code VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(30) NOT NULL,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(30),
    date_of_birth DATE,
    gender VARCHAR(20),
    joining_date DATE NOT NULL,
    exit_date DATE,
    status employee_status NOT NULL DEFAULT 'ACTIVE',
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_employees_company_code UNIQUE (company_id, employee_code)
);

CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_employees_status ON employees(company_id, status);
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------------------------
-- DOMAIN 5: CONTRACTORS
-- ------------------------------------------------------------------------------
CREATE TYPE contractor_type AS ENUM ('GENERAL', 'CIVIL_WORKS', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'REBAR', 'MASONRY', 'LABOUR_SUPPLY');

CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    contractor_code VARCHAR(50) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    contractor_type contractor_type NOT NULL DEFAULT 'LABOUR_SUPPLY',
    contact_person VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(30) NOT NULL,
    tax_id VARCHAR(50), -- GSTIN / PAN
    pan_number VARCHAR(50),
    address TEXT,
    rating NUMERIC(3, 2) DEFAULT 5.00 CHECK (rating >= 0.00 AND rating <= 5.00),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_contractors_company_code UNIQUE (company_id, contractor_code)
);

CREATE INDEX idx_contractors_company ON contractors(company_id);
CREATE TRIGGER trg_contractors_updated_at BEFORE UPDATE ON contractors FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------------------------
-- DOMAIN 6: LABOURERS (Workers, Craftsmen, Daily Wagers)
-- ------------------------------------------------------------------------------
CREATE TYPE labour_skill_level AS ENUM ('UNSKILLED', 'SEMI_SKILLED', 'SKILLED', 'HIGHLY_SKILLED');
CREATE TYPE labour_trade AS ENUM (
    'MASON', 'CARPENTER', 'BAR_BENDER', 'ELECTRICIAN', 
    'PLUMBER', 'PAINTER', 'WELDER', 'SCAFFOLDER', 
    'EQUIPMENT_OPERATOR', 'SURVEY_HELPER', 'GENERAL_HELPER', 'OTHER'
);

CREATE TABLE labourers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL, -- Null if directly engaged daily wager
    labourer_code VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    skill_level labour_skill_level NOT NULL DEFAULT 'UNSKILLED',
    primary_trade labour_trade NOT NULL DEFAULT 'GENERAL_HELPER',
    daily_wage_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (daily_wage_rate >= 0.00),
    overtime_hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (overtime_hourly_rate >= 0.00),
    id_proof_type VARCHAR(50), -- e.g. Aadhaar, Voter ID, National ID
    id_proof_number VARCHAR(100),
    emergency_phone VARCHAR(30),
    photo_url TEXT,
    face_embedding JSONB, -- Stored facial vector for on-site kiosk/mobile biometric match
    biometric_enrolled BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_labourers_company_code UNIQUE (company_id, labourer_code)
);

CREATE INDEX idx_labourers_company ON labourers(company_id);
CREATE INDEX idx_labourers_contractor ON labourers(contractor_id);
CREATE INDEX idx_labourers_trade ON labourers(company_id, primary_trade);
CREATE TRIGGER trg_labourers_updated_at BEFORE UPDATE ON labourers FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------------------------
-- DOMAIN 7: PROJECTS
-- ------------------------------------------------------------------------------
CREATE TYPE project_status AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
    project_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_name VARCHAR(255) NOT NULL,
    contract_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (contract_value >= 0.00),
    budget NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (budget >= 0.00),
    spent_to_date NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (spent_to_date >= 0.00),
    start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    actual_end_date DATE,
    status project_status NOT NULL DEFAULT 'PLANNING',
    total_area_sqft NUMERIC(12, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_projects_company_code UNIQUE (company_id, project_code),
    CONSTRAINT chk_project_dates CHECK (planned_end_date >= start_date)
);

CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_status ON projects(company_id, status);
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------------------------
-- DOMAIN 8: SITES
-- ------------------------------------------------------------------------------
CREATE TYPE site_status AS ENUM ('PREPARATION', 'ACTIVE_CONSTRUCTION', 'FINISHING', 'HANDOVER', 'MAINTENANCE', 'CLOSED');

CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    site_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    site_engineer_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    status site_status NOT NULL DEFAULT 'ACTIVE_CONSTRUCTION',
    latitude NUMERIC(10, 8) NOT NULL,
    longitude NUMERIC(11, 8) NOT NULL,
    -- PostGIS Geodetic Point (SRID 4326)
    location_coordinates GEOGRAPHY(Point, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_sites_project_code UNIQUE (project_id, site_code)
);

CREATE INDEX idx_sites_company ON sites(company_id);
CREATE INDEX idx_sites_project ON sites(project_id);
CREATE INDEX idx_sites_location ON sites USING GIST (location_coordinates);
CREATE TRIGGER trg_sites_updated_at BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Auto populate geography location_coordinates on insert or update
CREATE OR REPLACE FUNCTION trg_populate_site_coordinates()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location_coordinates = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sites_sync_coords 
BEFORE INSERT OR UPDATE OF latitude, longitude ON sites
FOR EACH ROW EXECUTE FUNCTION trg_populate_site_coordinates();

-- ------------------------------------------------------------------------------
-- DOMAIN 9: SITE GEOFENCES (PostGIS Spatial Engine)
-- ------------------------------------------------------------------------------
CREATE TYPE geofence_type AS ENUM ('CIRCULAR', 'POLYGON');

CREATE TABLE site_geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    geofence_type geofence_type NOT NULL DEFAULT 'CIRCULAR',
    -- Center Point for Circular Geofences
    center_latitude NUMERIC(10, 8),
    center_longitude NUMERIC(11, 8),
    center_point GEOGRAPHY(Point, 4326),
    radius_meters NUMERIC(10, 2) CHECK (radius_meters > 0),
    -- Polygon boundary for complex site perimeters
    polygon GEOGRAPHY(Polygon, 4326),
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT chk_geofence_parameters CHECK (
        (geofence_type = 'CIRCULAR' AND radius_meters IS NOT NULL) OR
        (geofence_type = 'POLYGON' AND polygon IS NOT NULL)
    )
);

CREATE INDEX idx_site_geofences_company ON site_geofences(company_id);
CREATE INDEX idx_site_geofences_site ON site_geofences(site_id);
CREATE INDEX idx_site_geofences_center_gist ON site_geofences USING GIST (center_point);
CREATE INDEX idx_site_geofences_polygon_gist ON site_geofences USING GIST (polygon);
CREATE TRIGGER trg_site_geofences_updated_at BEFORE UPDATE ON site_geofences FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------------------------
-- DOMAIN 10: SITE ASSIGNMENTS
-- ------------------------------------------------------------------------------
CREATE TYPE assignee_type AS ENUM ('EMPLOYEE', 'LABOURER', 'CONTRACTOR');

CREATE TABLE site_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    assignee_type assignee_type NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    labourer_id UUID REFERENCES labourers(id) ON DELETE CASCADE,
    contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE,
    role_on_site VARCHAR(100),
    assigned_from DATE NOT NULL,
    assigned_to DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT chk_single_assignee CHECK (
        (assignee_type = 'EMPLOYEE' AND employee_id IS NOT NULL AND labourer_id IS NULL AND contractor_id IS NULL) OR
        (assignee_type = 'LABOURER' AND labourer_id IS NOT NULL AND employee_id IS NULL AND contractor_id IS NULL) OR
        (assignee_type = 'CONTRACTOR' AND contractor_id IS NOT NULL AND employee_id IS NULL AND labourer_id IS NULL)
    )
);

CREATE INDEX idx_site_assignments_lookup ON site_assignments(company_id, site_id, is_active);
CREATE TRIGGER trg_site_assignments_updated_at BEFORE UPDATE ON site_assignments FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------------------------
-- DOMAIN 12: SHIFTS
-- ------------------------------------------------------------------------------
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_period_minutes INT NOT NULL DEFAULT 15,
    break_duration_minutes INT NOT NULL DEFAULT 60,
    half_day_threshold_minutes INT NOT NULL DEFAULT 240, -- 4 hours
    full_day_threshold_minutes INT NOT NULL DEFAULT 480, -- 8 hours
    is_night_shift BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_shifts_company_code UNIQUE (company_id, code)
);

CREATE INDEX idx_shifts_company ON shifts(company_id);
CREATE TRIGGER trg_shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE shift_rosters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
    assignee_type assignee_type NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    labourer_id UUID REFERENCES labourers(id) ON DELETE CASCADE,
    roster_date DATE NOT NULL,
    is_off_day BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_shift_roster_unique UNIQUE (company_id, site_id, roster_date, assignee_type, employee_id, labourer_id)
);

CREATE INDEX idx_shift_rosters_date ON shift_rosters(company_id, site_id, roster_date);

-- ------------------------------------------------------------------------------
-- DOMAIN 11: ATTENDANCE (Precision Spatial & Rollup Architecture)
-- ------------------------------------------------------------------------------
CREATE TYPE attendance_session_status AS ENUM ('PRESENT', 'HALF_DAY', 'ABSENT', 'OVERTIME', 'ON_LEAVE', 'REGULARIZED');
CREATE TYPE attendance_verification_status AS ENUM ('VERIFIED', 'FLAGGED', 'REJECTED', 'REQUIRES_APPROVAL');
CREATE TYPE approval_state AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE attendance_event_type AS ENUM ('CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END', 'SITE_TRANSFER');
CREATE TYPE punch_source AS ENUM ('MOBILE_APP', 'KIOSK_FACIAL', 'BIOMETRIC_DEVICE', 'SUPERVISOR_PORTAL', 'AUTO_CHECKOUT');
CREATE TYPE verification_method AS ENUM ('GEOFENCE_ONLY', 'FACE_RECOGNITION', 'BIOMETRIC_FINGERPRINT', 'QR_CODE_SCAN', 'SUPERVISOR_OVERRIDE');

-- 1. attendance_sessions: Rollup entity per worker per day/shift
CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    worker_type assignee_type NOT NULL, -- EMPLOYEE or LABOURER
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    labourer_id UUID REFERENCES labourers(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    first_clock_in TIMESTAMPTZ,
    last_clock_out TIMESTAMPTZ,
    total_duration_minutes INT NOT NULL DEFAULT 0,
    regular_minutes INT NOT NULL DEFAULT 0,
    overtime_minutes INT NOT NULL DEFAULT 0,
    break_duration_minutes INT NOT NULL DEFAULT 0,
    status attendance_session_status NOT NULL DEFAULT 'ABSENT',
    verification_status attendance_verification_status NOT NULL DEFAULT 'VERIFIED',
    approval_status approval_state NOT NULL DEFAULT 'PENDING',
    approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT chk_attendance_session_worker CHECK (
        (worker_type = 'EMPLOYEE' AND employee_id IS NOT NULL AND labourer_id IS NULL) OR
        (worker_type = 'LABOURER' AND labourer_id IS NOT NULL AND employee_id IS NULL)
    ),
    CONSTRAINT uq_attendance_session UNIQUE (company_id, session_date, worker_type, employee_id, labourer_id)
);

CREATE INDEX idx_att_sessions_company_date ON attendance_sessions(company_id, session_date);
CREATE INDEX idx_att_sessions_site ON attendance_sessions(site_id, session_date);
CREATE INDEX idx_att_sessions_employee ON attendance_sessions(employee_id, session_date);
CREATE INDEX idx_att_sessions_labourer ON attendance_sessions(labourer_id, session_date);
CREATE TRIGGER trg_attendance_sessions_updated_at BEFORE UPDATE ON attendance_sessions FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 2. attendance_events: Immutable atomic punch entries with spatial capture
CREATE TABLE attendance_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    geofence_id UUID REFERENCES site_geofences(id) ON DELETE SET NULL,
    worker_type assignee_type NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    labourer_id UUID REFERENCES labourers(id) ON DELETE CASCADE,
    event_type attendance_event_type NOT NULL,
    event_timestamp TIMESTAMPTZ NOT NULL,
    server_timestamp TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    source punch_source NOT NULL DEFAULT 'MOBILE_APP',
    verification_method verification_method NOT NULL DEFAULT 'GEOFENCE_ONLY',
    verification_result VARCHAR(50) NOT NULL, -- 'PASSED', 'OUTSIDE_GEOFENCE', 'MOCK_DETECTED'
    -- Spatial Preserved Coordinates
    latitude NUMERIC(10, 8) NOT NULL,
    longitude NUMERIC(11, 8) NOT NULL,
    coordinates GEOGRAPHY(Point, 4326),
    gps_accuracy_meters NUMERIC(8, 2) NOT NULL,
    calculated_distance_meters NUMERIC(10, 2) NOT NULL,
    configured_radius_snapshot_meters NUMERIC(10, 2) NOT NULL,
    is_inside_geofence BOOLEAN NOT NULL DEFAULT false,
    is_mock_location BOOLEAN NOT NULL DEFAULT false,
    photo_url TEXT,
    device_id VARCHAR(255),
    device_model VARCHAR(150),
    app_version VARCHAR(50),
    os_version VARCHAR(50),
    ip_address VARCHAR(45),
    battery_level_pct INT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT chk_att_event_worker CHECK (
        (worker_type = 'EMPLOYEE' AND employee_id IS NOT NULL AND labourer_id IS NULL) OR
        (worker_type = 'LABOURER' AND labourer_id IS NOT NULL AND employee_id IS NULL)
    )
);

CREATE INDEX idx_att_events_session ON attendance_events(session_id);
CREATE INDEX idx_att_events_company_time ON attendance_events(company_id, event_timestamp);
CREATE INDEX idx_att_events_site ON attendance_events(site_id, event_timestamp);
CREATE INDEX idx_att_events_coords ON attendance_events USING GIST (coordinates);

-- Auto sync event geography coordinates
CREATE OR REPLACE FUNCTION trg_populate_event_coordinates()
RETURNS TRIGGER AS $$
BEGIN
    NEW.coordinates = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_att_events_sync_coords 
BEFORE INSERT ON attendance_events
FOR EACH ROW EXECUTE FUNCTION trg_populate_event_coordinates();

-- Protect attendance events from tampering
CREATE TRIGGER trg_att_events_immutable 
BEFORE UPDATE OR DELETE ON attendance_events
FOR EACH ROW EXECUTE FUNCTION fn_prevent_immutable_mutation();

-- 3. location_events: High-fidelity telemetry breadcrumbs
CREATE TABLE location_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    attendance_event_id UUID REFERENCES attendance_events(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    worker_type assignee_type NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    labourer_id UUID REFERENCES labourers(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL,
    server_timestamp TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    latitude NUMERIC(10, 8) NOT NULL,
    longitude NUMERIC(11, 8) NOT NULL,
    coordinates GEOGRAPHY(Point, 4326),
    accuracy_meters NUMERIC(8, 2) NOT NULL,
    speed_mps NUMERIC(6, 2),
    heading_degrees NUMERIC(6, 2),
    altitude_meters NUMERIC(8, 2),
    is_mock_location BOOLEAN NOT NULL DEFAULT false,
    wifi_bssid VARCHAR(50),
    battery_percentage INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

CREATE INDEX idx_loc_events_company_time ON location_events(company_id, recorded_at);
CREATE INDEX idx_loc_events_site_time ON location_events(site_id, recorded_at);
CREATE INDEX idx_loc_events_coords ON location_events USING GIST (coordinates);
CREATE INDEX idx_loc_events_brin ON location_events USING BRIN (recorded_at);

CREATE TRIGGER trg_loc_events_sync_coords 
BEFORE INSERT ON location_events
FOR EACH ROW EXECUTE FUNCTION trg_populate_event_coordinates();

-- 4. attendance_corrections: Dispute / regularization requests
CREATE TYPE correction_type AS ENUM ('MISSING_CLOCK_IN', 'MISSING_CLOCK_OUT', 'WRONG_HOURS', 'GEOFENCE_BYPASS_REQUEST', 'DUTY_TRAVEL');

CREATE TABLE attendance_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    correction_type correction_type NOT NULL,
    original_clock_in TIMESTAMPTZ,
    original_clock_out TIMESTAMPTZ,
    requested_clock_in TIMESTAMPTZ NOT NULL,
    requested_clock_out TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    document_attachment_url TEXT,
    status approval_state NOT NULL DEFAULT 'PENDING',
    reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    reviewer_comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

CREATE INDEX idx_att_corrections_company ON attendance_corrections(company_id);
CREATE INDEX idx_att_corrections_session ON attendance_corrections(session_id);
CREATE TRIGGER trg_att_corrections_updated_at BEFORE UPDATE ON attendance_corrections FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 5. attendance_approvals: Multi-level sign-offs
CREATE TABLE attendance_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    correction_id UUID REFERENCES attendance_corrections(id) ON DELETE CASCADE,
    approver_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    approval_tier INT NOT NULL DEFAULT 1, -- 1: Site Supervisor, 2: PM, 3: HR Admin
    status approval_state NOT NULL DEFAULT 'APPROVED',
    comments TEXT,
    ip_address VARCHAR(45),
    digital_signature_hash VARCHAR(255),
    action_timestamp TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

CREATE INDEX idx_att_approvals_session ON attendance_approvals(session_id);
CREATE INDEX idx_att_approvals_correction ON attendance_approvals(correction_id);

-- ------------------------------------------------------------------------------
-- DOMAIN 13: LEAVES
-- ------------------------------------------------------------------------------
CREATE TABLE leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    annual_days_allowed INT NOT NULL DEFAULT 12,
    is_carry_forward BOOLEAN NOT NULL DEFAULT false,
    max_carry_forward_days INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_leave_types_company_code UNIQUE (company_id, code)
);

CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    year INT NOT NULL,
    allocated_days NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    used_days NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    pending_days NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    CONSTRAINT uq_leave_balance UNIQUE (company_id, employee_id, leave_type_id, year)
);

CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count NUMERIC(5, 2) NOT NULL CHECK (days_count > 0),
    reason TEXT NOT NULL,
    status approval_state NOT NULL DEFAULT 'PENDING',
    approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE TRIGGER trg_leave_requests_updated_at BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------------------------
-- DOMAIN 14: PAYROLL
-- ------------------------------------------------------------------------------
CREATE TYPE payroll_cycle AS ENUM ('WEEKLY', 'FORTNIGHTLY', 'MONTHLY');

CREATE TABLE salary_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    employee_id UUID UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
    base_salary NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (base_salary >= 0.00),
    hra NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (hra >= 0.00),
    conveyance_allowance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (conveyance_allowance >= 0.00),
    site_allowance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (site_allowance >= 0.00),
    special_allowance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (special_allowance >= 0.00),
    pf_employee_percent NUMERIC(5, 2) NOT NULL DEFAULT 12.00,
    esi_employee_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.75,
    professional_tax NUMERIC(10, 2) NOT NULL DEFAULT 200.00,
    effective_from DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

CREATE TABLE payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    run_number VARCHAR(50) NOT NULL,
    cycle payroll_cycle NOT NULL DEFAULT 'MONTHLY',
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    total_gross_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_deductions_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_net_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status approval_state NOT NULL DEFAULT 'PENDING',
    processed_by_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_payroll_runs_number UNIQUE (company_id, run_number)
);

CREATE TABLE payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    worker_type assignee_type NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE RESTRICT,
    labourer_id UUID REFERENCES labourers(id) ON DELETE RESTRICT,
    days_present NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    overtime_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    basic_earnings NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    allowances_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    overtime_earnings NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    gross_earnings NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    pf_deduction NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    esi_deduction NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_deduction NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    other_deductions NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    net_payable NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'UNPAID', -- UNPAID, PROCESSED, PAID
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT chk_payslip_worker CHECK (
        (worker_type = 'EMPLOYEE' AND employee_id IS NOT NULL AND labourer_id IS NULL) OR
        (worker_type = 'LABOURER' AND labourer_id IS NOT NULL AND employee_id IS NULL)
    )
);

CREATE INDEX idx_payslips_run ON payslips(payroll_run_id);
CREATE INDEX idx_payslips_employee ON payslips(employee_id);
CREATE INDEX idx_payslips_labourer ON payslips(labourer_id);

-- ------------------------------------------------------------------------------
-- DOMAIN 15: MATERIALS & MASTER CATALOG
-- ------------------------------------------------------------------------------
CREATE TABLE units_of_measure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_uom_company_code UNIQUE (company_id, code)
);

CREATE TABLE material_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    parent_category_id UUID REFERENCES material_categories(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_material_cat_code UNIQUE (company_id, code)
);

CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES material_categories(id) ON DELETE RESTRICT,
    uom_id UUID NOT NULL REFERENCES units_of_measure(id) ON DELETE RESTRICT,
    item_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hsn_sac_code VARCHAR(50),
    standard_rate NUMERIC(15, 4) NOT NULL DEFAULT 0.0000 CHECK (standard_rate >= 0.0000),
    reorder_level NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    min_stock_level NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_materials_company_code UNIQUE (company_id, item_code)
);

CREATE INDEX idx_materials_company ON materials(company_id);
CREATE INDEX idx_materials_category ON materials(category_id);
CREATE TRIGGER trg_materials_updated_at BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------------------------
-- DOMAIN 16: WAREHOUSES & SITE STORES
-- ------------------------------------------------------------------------------
CREATE TYPE warehouse_type AS ENUM ('CENTRAL', 'SITE_STORE', 'LAYDOWN_YARD', 'SCRAP_YARD', 'TRANSIT');

CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    storekeeper_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    warehouse_type warehouse_type NOT NULL DEFAULT 'SITE_STORE',
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_warehouses_company_code UNIQUE (company_id, code)
);

CREATE INDEX idx_warehouses_company ON warehouses(company_id);
CREATE INDEX idx_warehouses_site ON warehouses(site_id);
CREATE TRIGGER trg_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------------------------
-- DOMAIN 17: STOCK TRANSACTIONS (Auditable Double-Entry Ledger)
-- ------------------------------------------------------------------------------
CREATE TYPE stock_transaction_type AS ENUM (
    'RECEIPT_PO',          -- Supplier Inward from GRN
    'ISSUE_PROJECT',       -- Outward consumption to site work
    'TRANSFER_OUT',        -- Transfer dispatched from warehouse
    'TRANSFER_IN',         -- Transfer received at warehouse
    'RETURN_SUPPLIER',     -- Return to vendor
    'RETURN_SITE',         -- Material returned unused from workfront
    'WASTAGE_DAMAGE',      -- Damaged, scrap or lost write-off
    'ADJUSTMENT_PHYSICAL'  -- Physical cycle count reconciliation
);

-- Immutable Ledger
CREATE TABLE stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    transaction_number VARCHAR(50) NOT NULL,
    transaction_type stock_transaction_type NOT NULL,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    source_warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
    destination_warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    quantity NUMERIC(14, 4) NOT NULL CHECK (quantity > 0.0000),
    unit_rate NUMERIC(15, 4) NOT NULL DEFAULT 0.0000 CHECK (unit_rate >= 0.0000),
    total_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_value >= 0.00),
    batch_number VARCHAR(100),
    reference_type VARCHAR(50) NOT NULL, -- 'GRN', 'DISPATCH', 'REQUISITION', 'AUDIT'
    reference_id UUID,
    transacted_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    transacted_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_stock_tx_number UNIQUE (company_id, transaction_number),
    CONSTRAINT chk_stock_warehouse_movement CHECK (
        (transaction_type = 'RECEIPT_PO' AND destination_warehouse_id IS NOT NULL) OR
        (transaction_type = 'ISSUE_PROJECT' AND source_warehouse_id IS NOT NULL) OR
        (transaction_type IN ('TRANSFER_OUT', 'TRANSFER_IN') AND source_warehouse_id IS NOT NULL AND destination_warehouse_id IS NOT NULL) OR
        (transaction_type = 'RETURN_SUPPLIER' AND source_warehouse_id IS NOT NULL) OR
        (transaction_type = 'RETURN_SITE' AND destination_warehouse_id IS NOT NULL) OR
        (transaction_type = 'WASTAGE_DAMAGE' AND source_warehouse_id IS NOT NULL) OR
        (transaction_type = 'ADJUSTMENT_PHYSICAL' AND (source_warehouse_id IS NOT NULL OR destination_warehouse_id IS NOT NULL))
    )
);

CREATE INDEX idx_stock_tx_company_time ON stock_transactions(company_id, transacted_at);
CREATE INDEX idx_stock_tx_material ON stock_transactions(material_id);
CREATE INDEX idx_stock_tx_src_wh ON stock_transactions(source_warehouse_id);
CREATE INDEX idx_stock_tx_dst_wh ON stock_transactions(destination_warehouse_id);

-- Enforce immutability of stock transaction ledger entries
CREATE TRIGGER trg_stock_tx_immutable 
BEFORE UPDATE OR DELETE ON stock_transactions
FOR EACH ROW EXECUTE FUNCTION fn_prevent_immutable_mutation();

-- Materialized Balance Cache (Kept in strict sync via trigger)
CREATE TABLE stock_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    quantity_on_hand NUMERIC(14, 4) NOT NULL DEFAULT 0.0000 CHECK (quantity_on_hand >= 0.0000),
    allocated_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000 CHECK (allocated_quantity >= 0.0000),
    average_unit_cost NUMERIC(15, 4) NOT NULL DEFAULT 0.0000 CHECK (average_unit_cost >= 0.0000),
    last_transaction_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_stock_balances UNIQUE (company_id, warehouse_id, material_id)
);

CREATE INDEX idx_stock_balances_lookup ON stock_balances(company_id, warehouse_id, material_id);

-- Trigger to maintain stock balance cache from the ledger
CREATE OR REPLACE FUNCTION trg_apply_stock_transaction_to_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Deduct from source warehouse
    IF NEW.source_warehouse_id IS NOT NULL THEN
        INSERT INTO stock_balances (company_id, warehouse_id, material_id, quantity_on_hand, average_unit_cost, last_transaction_at)
        VALUES (NEW.company_id, NEW.source_warehouse_id, NEW.material_id, 0.0000, NEW.unit_rate, NEW.transacted_at)
        ON CONFLICT (company_id, warehouse_id, material_id) DO NOTHING;

        UPDATE stock_balances
        SET quantity_on_hand = quantity_on_hand - NEW.quantity,
            last_transaction_at = NEW.transacted_at,
            updated_at = CLOCK_TIMESTAMP()
        WHERE company_id = NEW.company_id 
          AND warehouse_id = NEW.source_warehouse_id 
          AND material_id = NEW.material_id;
    END IF;

    -- Add to destination warehouse
    IF NEW.destination_warehouse_id IS NOT NULL THEN
        INSERT INTO stock_balances (company_id, warehouse_id, material_id, quantity_on_hand, average_unit_cost, last_transaction_at)
        VALUES (NEW.company_id, NEW.destination_warehouse_id, NEW.material_id, NEW.quantity, NEW.unit_rate, NEW.transacted_at)
        ON CONFLICT (company_id, warehouse_id, material_id) DO UPDATE
        SET quantity_on_hand = stock_balances.quantity_on_hand + NEW.quantity,
            average_unit_cost = CASE 
                WHEN (stock_balances.quantity_on_hand + NEW.quantity) > 0 THEN
                    ((stock_balances.quantity_on_hand * stock_balances.average_unit_cost) + (NEW.quantity * NEW.unit_rate)) / (stock_balances.quantity_on_hand + NEW.quantity)
                ELSE NEW.unit_rate
            END,
            last_transaction_at = NEW.transacted_at,
            updated_at = CLOCK_TIMESTAMP();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_tx_sync_balance 
AFTER INSERT ON stock_transactions
FOR EACH ROW EXECUTE FUNCTION trg_apply_stock_transaction_to_balance();

-- ------------------------------------------------------------------------------
-- DOMAIN 18: SUPPLIERS
-- ------------------------------------------------------------------------------
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    supplier_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    tax_id VARCHAR(50), -- GSTIN
    pan_number VARCHAR(50),
    payment_terms_days INT NOT NULL DEFAULT 30,
    credit_limit NUMERIC(15, 2) DEFAULT 0.00,
    rating NUMERIC(3, 2) DEFAULT 5.00 CHECK (rating >= 0.00 AND rating <= 5.00),
    address TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_suppliers_company_code UNIQUE (company_id, supplier_code)
);

CREATE INDEX idx_suppliers_company ON suppliers(company_id);
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------------------------
-- DOMAIN 19: PURCHASE ORDERS (PO)
-- ------------------------------------------------------------------------------
CREATE TYPE po_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED');

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    po_number VARCHAR(50) NOT NULL,
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    subtotal_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal_amount >= 0.00),
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0.00),
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0.00),
    status po_status NOT NULL DEFAULT 'DRAFT',
    delivery_terms TEXT,
    payment_terms TEXT,
    shipping_address TEXT NOT NULL,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_po_company_number UNIQUE (company_id, po_number)
);

CREATE INDEX idx_po_company ON purchase_orders(company_id);
CREATE INDEX idx_po_project ON purchase_orders(project_id);
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    ordered_quantity NUMERIC(14, 4) NOT NULL CHECK (ordered_quantity > 0.0000),
    received_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000 CHECK (received_quantity >= 0.0000),
    unit_price NUMERIC(15, 4) NOT NULL CHECK (unit_price >= 0.0000),
    tax_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (tax_percent >= 0.00),
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0.00),
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0.00),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

CREATE INDEX idx_po_items_order ON purchase_order_items(purchase_order_id);

-- ------------------------------------------------------------------------------
-- DOMAIN 20: PURCHASE RECEIPTS (Goods Receipt Notes - GRN)
-- ------------------------------------------------------------------------------
CREATE TYPE grn_status AS ENUM ('DRAFT', 'INSPECTED', 'ACCEPTED', 'REJECTED');

CREATE TABLE purchase_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    grn_number VARCHAR(50) NOT NULL,
    challan_number VARCHAR(100),
    challan_date DATE,
    vehicle_number VARCHAR(50),
    received_date TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    received_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status grn_status NOT NULL DEFAULT 'DRAFT',
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_grn_company_number UNIQUE (company_id, grn_number)
);

CREATE INDEX idx_grn_company ON purchase_receipts(company_id);
CREATE TRIGGER trg_purchase_receipts_updated_at BEFORE UPDATE ON purchase_receipts FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE purchase_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    purchase_receipt_id UUID NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
    po_item_id UUID NOT NULL REFERENCES purchase_order_items(id) ON DELETE RESTRICT,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    delivered_quantity NUMERIC(14, 4) NOT NULL CHECK (delivered_quantity > 0.0000),
    accepted_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000 CHECK (accepted_quantity >= 0.0000),
    rejected_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000 CHECK (rejected_quantity >= 0.0000),
    rejection_reason TEXT,
    batch_number VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT chk_grn_qty CHECK (accepted_quantity + rejected_quantity <= delivered_quantity)
);

CREATE INDEX idx_grn_items_receipt ON purchase_receipt_items(purchase_receipt_id);

-- ------------------------------------------------------------------------------
-- DOMAIN 21: EXPENSES (Site Petty Cash & Project Claims)
-- ------------------------------------------------------------------------------
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_expense_cat_code UNIQUE (company_id, code)
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
    expense_number VARCHAR(50) NOT NULL,
    claimant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    expense_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0.00),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    description TEXT NOT NULL,
    receipt_document_url TEXT,
    status approval_state NOT NULL DEFAULT 'PENDING',
    approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'UNPAID',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_expenses_company_number UNIQUE (company_id, expense_number)
);

CREATE INDEX idx_expenses_company ON expenses(company_id);
CREATE INDEX idx_expenses_project ON expenses(project_id);
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------------------------
-- DOMAIN 23: INVOICES (Billing, Client RA Bills & Vendor Bills)
-- ------------------------------------------------------------------------------
CREATE TYPE invoice_type AS ENUM ('CLIENT_BILLING', 'VENDOR_INVOICE', 'SUBCONTRACTOR_BILL');

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    invoice_type invoice_type NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
    contractor_id UUID REFERENCES contractors(id) ON DELETE RESTRICT,
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal_amount >= 0.00),
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0.00),
    retention_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (retention_amount >= 0.00),
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0.00),
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0.00),
    balance_due NUMERIC(15, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    status approval_state NOT NULL DEFAULT 'PENDING',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'UNPAID', -- UNPAID, PARTIAL, PAID
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_invoices_number UNIQUE (company_id, invoice_type, invoice_number)
);

CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(14, 4) NOT NULL CHECK (quantity > 0.0000),
    unit_price NUMERIC(15, 4) NOT NULL CHECK (unit_price >= 0.0000),
    tax_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0.00),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

-- ------------------------------------------------------------------------------
-- DOMAIN 22: PAYMENTS (Vouchers & Financial Transactions)
-- ------------------------------------------------------------------------------
CREATE TYPE payment_mode AS ENUM ('BANK_TRANSFER_NEFT', 'RTGS', 'IMPS', 'CHEQUE', 'UPI', 'CASH', 'CREDIT_CARD');
CREATE TYPE payment_direction AS ENUM ('INCOMING', 'OUTGOING');

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    project_id UUID REFERENCES projects(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    payment_number VARCHAR(50) NOT NULL,
    direction payment_direction NOT NULL,
    payment_mode payment_mode NOT NULL,
    payment_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0.00),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    reference_number VARCHAR(100), -- UTR or Cheque Number
    bank_name VARCHAR(150),
    is_reconciled BOOLEAN NOT NULL DEFAULT false,
    reconciled_at TIMESTAMPTZ,
    recorded_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_payments_number UNIQUE (company_id, payment_number)
);

CREATE INDEX idx_payments_company ON payments(company_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);

-- ------------------------------------------------------------------------------
-- DOMAIN 24: EQUIPMENT & ASSETS
-- ------------------------------------------------------------------------------
CREATE TYPE equipment_ownership AS ENUM ('OWNED', 'HIRED', 'LEASED');
CREATE TYPE equipment_status AS ENUM ('AVAILABLE', 'DEPLOYED', 'UNDER_MAINTENANCE', 'BREAKDOWN', 'DECOMMISSIONED');
CREATE TYPE meter_type AS ENUM ('HOURS', 'KILOMETERS');

CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    asset_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'EXCAVATOR', 'CRANE', 'CONCRETE_MIXER', 'GENERATOR'
    make VARCHAR(100),
    model VARCHAR(100),
    manufacturing_year INT,
    serial_number VARCHAR(100),
    ownership equipment_ownership NOT NULL DEFAULT 'OWNED',
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL, -- Hire vendor
    hourly_rate NUMERIC(10, 2) DEFAULT 0.00,
    meter_type meter_type NOT NULL DEFAULT 'HOURS',
    current_meter_reading NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status equipment_status NOT NULL DEFAULT 'AVAILABLE',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_equipment_company_code UNIQUE (company_id, asset_code)
);

CREATE INDEX idx_equipment_company ON equipment(company_id);
CREATE TRIGGER trg_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE equipment_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
    operator_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    start_meter_reading NUMERIC(12, 2) NOT NULL,
    end_meter_reading NUMERIC(12, 2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

CREATE INDEX idx_eq_deployments_lookup ON equipment_deployments(equipment_id, site_id, is_active);

-- ------------------------------------------------------------------------------
-- DOMAIN 25: MAINTENANCE
-- ------------------------------------------------------------------------------
CREATE TYPE maintenance_type AS ENUM ('PREVENTIVE', 'BREAKDOWN', 'INSPECTION');

CREATE TABLE maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    maintenance_type maintenance_type NOT NULL DEFAULT 'PREVENTIVE',
    interval_hours INT,
    interval_days INT,
    last_serviced_at TIMESTAMPTZ,
    next_due_reading NUMERIC(12, 2),
    next_due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

CREATE TABLE maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    maintenance_schedule_id UUID REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
    service_type maintenance_type NOT NULL,
    service_date DATE NOT NULL,
    meter_reading NUMERIC(12, 2) NOT NULL,
    cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (cost >= 0.00),
    downtime_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    performed_by VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    parts_replaced TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

CREATE INDEX idx_maint_logs_equipment ON maintenance_logs(equipment_id);

-- ------------------------------------------------------------------------------
-- DOMAIN 26: TASKS (Work Breakdown Structure - WBS)
-- ------------------------------------------------------------------------------
CREATE TYPE task_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'BLOCKED');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    wbs_code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_lead_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
    planned_start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    actual_start_date DATE,
    actual_end_date DATE,
    progress_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (progress_percentage >= 0.00 AND progress_percentage <= 100.00),
    status task_status NOT NULL DEFAULT 'NOT_STARTED',
    priority task_priority NOT NULL DEFAULT 'MEDIUM',
    estimated_cost NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_tasks_wbs UNIQUE (project_id, wbs_code)
);

CREATE INDEX idx_tasks_company ON tasks(company_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_site ON tasks(site_id);
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    predecessor_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
    dependency_type VARCHAR(10) NOT NULL DEFAULT 'FS', -- FS: Finish-to-Start, SS: Start-to-Start
    lag_days INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_task_deps UNIQUE (task_id, predecessor_task_id)
);

-- ------------------------------------------------------------------------------
-- DOMAIN 27: DAILY PROGRESS REPORTS (DPR)
-- ------------------------------------------------------------------------------
CREATE TABLE daily_progress_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    dpr_number VARCHAR(50) NOT NULL,
    report_date DATE NOT NULL,
    weather_summary VARCHAR(100),
    temperature_celsius NUMERIC(4, 1),
    engineer_in_charge_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    general_summary TEXT NOT NULL,
    obstacles_challenges TEXT,
    safety_observations TEXT,
    status approval_state NOT NULL DEFAULT 'PENDING',
    approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_dpr_company_number UNIQUE (company_id, dpr_number),
    CONSTRAINT uq_dpr_site_date UNIQUE (site_id, report_date)
);

CREATE INDEX idx_dpr_company_date ON daily_progress_reports(company_id, report_date);
CREATE INDEX idx_dpr_site ON daily_progress_reports(site_id, report_date);
CREATE TRIGGER trg_dpr_updated_at BEFORE UPDATE ON daily_progress_reports FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE dpr_work_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dpr_id UUID NOT NULL REFERENCES daily_progress_reports(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    activity_description TEXT NOT NULL,
    location_details VARCHAR(255), -- e.g. 'Grid C4 - 3rd Floor Slab'
    uom_id UUID REFERENCES units_of_measure(id) ON DELETE SET NULL,
    quantity_executed NUMERIC(12, 2) NOT NULL CHECK (quantity_executed >= 0.00),
    remarks TEXT
);

CREATE TABLE dpr_manpower_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dpr_id UUID NOT NULL REFERENCES daily_progress_reports(id) ON DELETE CASCADE,
    contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
    trade labour_trade NOT NULL,
    headcount INT NOT NULL CHECK (headcount > 0),
    working_hours NUMERIC(4, 2) NOT NULL DEFAULT 8.00
);

CREATE TABLE dpr_equipment_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dpr_id UUID NOT NULL REFERENCES daily_progress_reports(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
    operating_hours NUMERIC(5, 2) NOT NULL CHECK (operating_hours >= 0.00),
    idle_hours NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (idle_hours >= 0.00),
    breakdown_hours NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (breakdown_hours >= 0.00),
    work_done_description TEXT
);

-- ------------------------------------------------------------------------------
-- DOMAIN 28: SAFETY INCIDENTS (EHS)
-- ------------------------------------------------------------------------------
CREATE TYPE incident_type AS ENUM ('NEAR_MISS', 'FIRST_AID', 'MEDICAL_TREATMENT', 'LOST_TIME_INJURY', 'FATALITY', 'PROPERTY_DAMAGE', 'ENVIRONMENTAL');
CREATE TYPE severity_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TABLE safety_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    incident_number VARCHAR(50) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    incident_type incident_type NOT NULL,
    severity severity_level NOT NULL,
    location_details VARCHAR(255) NOT NULL,
    reported_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    injured_person_name VARCHAR(150),
    injured_person_type assignee_type,
    description TEXT NOT NULL,
    immediate_actions_taken TEXT NOT NULL,
    root_cause_analysis TEXT,
    corrective_actions_plan TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- OPEN, UNDER_INVESTIGATION, RESOLVED, CLOSED
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_safety_incidents_number UNIQUE (company_id, incident_number)
);

CREATE INDEX idx_safety_company ON safety_incidents(company_id);
CREATE INDEX idx_safety_site ON safety_incidents(site_id);
CREATE TRIGGER trg_safety_updated_at BEFORE UPDATE ON safety_incidents FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------------------------
-- DOMAIN 29: QUALITY INSPECTIONS (QA/QC & Defect Snagging)
-- ------------------------------------------------------------------------------
CREATE TYPE inspection_result AS ENUM ('PASSED', 'FAILED', 'PASSED_WITH_CONDITIONS');

CREATE TABLE quality_inspection_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'CONCRETE_POUR', 'REINFORCEMENT', 'FINISHING'
    checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

CREATE TABLE quality_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    template_id UUID REFERENCES quality_inspection_templates(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    inspection_number VARCHAR(50) NOT NULL,
    inspector_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    inspection_date DATE NOT NULL,
    area_or_grid VARCHAR(255) NOT NULL,
    result inspection_result NOT NULL DEFAULT 'PASSED',
    score_percentage NUMERIC(5, 2),
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_quality_inspections_num UNIQUE (company_id, inspection_number)
);

CREATE TABLE quality_defects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    inspection_id UUID REFERENCES quality_inspections(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    snag_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity severity_level NOT NULL DEFAULT 'MEDIUM',
    contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
    due_date DATE NOT NULL,
    photo_before_url TEXT,
    photo_after_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, RE_INSPECTED, CLOSED
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

CREATE INDEX idx_defects_site ON quality_defects(site_id);

-- ------------------------------------------------------------------------------
-- DOMAIN 30: DOCUMENTS (File Metadata & Drawings Revision Control)
-- ------------------------------------------------------------------------------
CREATE TYPE document_category AS ENUM ('ARCHITECTURAL_DRAWING', 'STRUCTURAL_DRAWING', 'BIM_MODEL', 'CONTRACT', 'PERMIT', 'SAFETY_CERTIFICATE', 'INVOICE_COPY', 'OTHER');

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    category document_category NOT NULL DEFAULT 'OTHER',
    document_code VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    current_version INT NOT NULL DEFAULT 1,
    storage_provider VARCHAR(50) NOT NULL DEFAULT 'S3',
    storage_key TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    uploaded_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_documents_code UNIQUE (company_id, document_code)
);

CREATE INDEX idx_documents_project ON documents(project_id);

CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    storage_key TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    change_summary TEXT,
    uploaded_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_doc_version UNIQUE (document_id, version_number)
);

-- ------------------------------------------------------------------------------
-- DOMAIN 31: NOTIFICATIONS
-- ------------------------------------------------------------------------------
CREATE TYPE notification_channel AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    channel notification_channel NOT NULL DEFAULT 'IN_APP',
    entity_type VARCHAR(100),
    entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);

-- ------------------------------------------------------------------------------
-- DOMAIN 32: APPROVAL WORKFLOWS ENGINE
-- ------------------------------------------------------------------------------
CREATE TABLE approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    target_entity VARCHAR(100) NOT NULL, -- 'PURCHASE_ORDER', 'EXPENSE', 'ATTENDANCE_CORRECTION', 'DPR'
    total_steps INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_approval_workflows_code UNIQUE (company_id, code)
);

CREATE TABLE approval_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    specific_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_approval_workflow_step UNIQUE (workflow_id, step_number)
);

CREATE TABLE approval_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE RESTRICT,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    current_step INT NOT NULL DEFAULT 1,
    status approval_state NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

CREATE TABLE approval_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES approval_instances(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action approval_state NOT NULL, -- APPROVED, REJECTED
    comments TEXT,
    action_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

-- ------------------------------------------------------------------------------
-- DOMAIN 33: AUDIT LOGS (Immutable System-Wide Forensic Trail)
-- ------------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT'
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

CREATE INDEX idx_audit_logs_company_time ON audit_logs(company_id, created_at);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_brin_time ON audit_logs USING BRIN (created_at);

-- Protect audit logs from tampering
CREATE TRIGGER trg_audit_logs_immutable 
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION fn_prevent_immutable_mutation();

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES FOR STRICT TENANT ISOLATION
-- ------------------------------------------------------------------------------

-- Macro / Pattern: Enable and Force RLS on all company-partitioned tables
DO $$
DECLARE
    t text;
    tenant_tables text[] := ARRAY[
        'branches', 'user_company_memberships', 'user_roles', 'roles',
        'departments', 'designations', 'employees', 'contractors', 'labourers',
        'projects', 'sites', 'site_geofences', 'site_assignments', 'shifts', 'shift_rosters',
        'attendance_sessions', 'attendance_events', 'location_events', 'attendance_corrections', 'attendance_approvals',
        'leave_types', 'leave_balances', 'leave_requests', 'salary_structures', 'payroll_runs', 'payslips',
        'units_of_measure', 'material_categories', 'materials', 'warehouses', 'stock_transactions', 'stock_balances',
        'suppliers', 'purchase_orders', 'purchase_order_items', 'purchase_receipts', 'purchase_receipt_items',
        'expense_categories', 'expenses', 'invoices', 'invoice_items', 'payments',
        'equipment', 'equipment_deployments', 'maintenance_schedules', 'maintenance_logs',
        'tasks', 'task_dependencies', 'daily_progress_reports', 'safety_incidents', 'quality_inspections',
        'quality_defects', 'documents', 'notifications', 'approval_workflows', 'approval_instances'
    ];
BEGIN
    FOREACH t IN ARRAY tenant_tables LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
        
        -- Drop existing policy if any
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', t);
        
        -- Create strict tenant isolation policy
        EXECUTE format('
            CREATE POLICY tenant_isolation_policy ON %I
            FOR ALL
            USING (
                company_id = NULLIF(current_setting(''app.current_company_id'', true), '''')::UUID
                OR current_setting(''app.bypass_rls'', true) = ''on''
            )
            WITH CHECK (
                company_id = NULLIF(current_setting(''app.current_company_id'', true), '''')::UUID
                OR current_setting(''app.bypass_rls'', true) = ''on''
            );', t);
    END LOOP;
END $$;

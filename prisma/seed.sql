-- ==============================================================================
-- CONSTRUCT360 ENTERPRISE DEVELOPMENT SEED SCRIPT
-- Populates Realistic Multi-Company, Multi-Project Setup with 350+ Workers,
-- PostGIS Geofences, Double-Entry Inventory Ledger, and Attendance Telemetry
-- ==============================================================================

-- Clean up existing data in reverse dependency order (safe for dev reset)
TRUNCATE TABLE 
    audit_logs, approval_action_logs, approval_instances, approval_steps, approval_workflows,
    notifications, document_versions, documents, quality_defects, quality_inspections,
    quality_inspection_templates, safety_incidents, dpr_equipment_usages, dpr_manpower_counts,
    dpr_work_items, daily_progress_reports, task_dependencies, tasks, maintenance_logs,
    maintenance_schedules, equipment_deployments, equipment, payments, invoice_items, invoices,
    expenses, expense_categories, purchase_receipt_items, purchase_receipts, purchase_order_items,
    purchase_orders, suppliers, stock_balances, stock_transactions, warehouses, materials,
    material_categories, units_of_measure, payslips, payroll_runs, salary_structures,
    leave_requests, leave_balances, leave_types, attendance_approvals, attendance_corrections,
    location_events, attendance_events, attendance_sessions, shift_rosters, shifts,
    site_assignments, site_geofences, sites, projects, labourers, contractors, employees,
    designations, departments, user_roles, role_permissions, permissions, roles,
    user_sessions, user_company_memberships, users, branches, companies
CASCADE;

-- ------------------------------------------------------------------------------
-- 1. COMPANIES & BRANCHES
-- ------------------------------------------------------------------------------
INSERT INTO companies (id, code, legal_name, trade_name, tax_id, registration_number, currency, email, phone, website, timezone)
VALUES 
    ('c0000001-0000-0000-0000-000000000001', 'APEX-INFR', 'Apex Infrastructure Projects Ltd', 'Apex Infra', '29AAACA1234A1Z5', 'CIN-U45200KA2015PLC012345', 'INR', 'admin@apexinfra.com', '+918041234567', 'https://apexinfra.com', 'Asia/Kolkata'),
    ('c0000002-0000-0000-0000-000000000002', 'METRO-BLD', 'Metro Builtcon Private Limited', 'Metro Builtcon', '27AAACM9876M1Z2', 'CIN-U45201MH2018PTC987654', 'INR', 'contact@metrobuiltcon.com', '+912224567890', 'https://metrobuiltcon.com', 'Asia/Kolkata');

INSERT INTO branches (id, company_id, code, name, email, phone, address_line1, city, state, postal_code, is_headquarters)
VALUES 
    ('b0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'BLR-HQ', 'Bangalore Corporate HQ', 'blr@apexinfra.com', '+918041234500', 'Prestige Tech Cloud, Phase 2, Hebbal', 'Bengaluru', 'Karnataka', '560024', true),
    ('b0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'MUM-REG', 'Mumbai Regional Office', 'mum@apexinfra.com', '+912241234500', 'BKC Commercial Hub, Bandra East', 'Mumbai', 'Maharashtra', '400051', false),
    ('b0000003-0000-0000-0000-000000000003', 'c0000002-0000-0000-0000-000000000002', 'HYD-HQ', 'Hyderabad Central Branch', 'hyd@metrobuiltcon.com', '+914041234500', 'HITEC City Phase 3', 'Hyderabad', 'Telangana', '500081', true);

-- ------------------------------------------------------------------------------
-- 2. USERS & AUTHENTICATION
-- ------------------------------------------------------------------------------
-- password_hash is bcrypt hash for 'Construct360#Secure2026'
INSERT INTO users (id, email, phone_number, password_hash, full_name, is_email_verified)
VALUES
    ('u0000001-0000-0000-0000-000000000001', 'superadmin@construct360.internal', '+919876543210', '$2a$12$K1dJgAHzu1fM.PqD63OQ8OQc3s6oVn.hMbmV.G7xT7lq2yWn2j2Kq', 'Antigravity SuperAdmin', true),
    ('u0000002-0000-0000-0000-000000000002', 'rajesh.menon@apexinfra.com', '+919876500001', '$2a$12$K1dJgAHzu1fM.PqD63OQ8OQc3s6oVn.hMbmV.G7xT7lq2yWn2j2Kq', 'Rajesh Menon (VP Operations)', true),
    ('u0000003-0000-0000-0000-000000000003', 'suresh.kumar@apexinfra.com', '+919876500002', '$2a$12$K1dJgAHzu1fM.PqD63OQ8OQc3s6oVn.hMbmV.G7xT7lq2yWn2j2Kq', 'Suresh Kumar (Project Manager)', true),
    ('u0000004-0000-0000-0000-000000000004', 'vikram.singh@apexinfra.com', '+919876500003', '$2a$12$K1dJgAHzu1fM.PqD63OQ8OQc3s6oVn.hMbmV.G7xT7lq2yWn2j2Kq', 'Vikram Singh (Senior Site Engineer)', true),
    ('u0000005-0000-0000-0000-000000000005', 'ananya.deshmukh@apexinfra.com', '+919876500004', '$2a$12$K1dJgAHzu1fM.PqD63OQ8OQc3s6oVn.hMbmV.G7xT7lq2yWn2j2Kq', 'Ananya Deshmukh (Storekeeper)', true),
    ('u0000006-0000-0000-0000-000000000006', 'arun.patil@apexinfra.com', '+919876500005', '$2a$12$K1dJgAHzu1fM.PqD63OQ8OQc3s6oVn.hMbmV.G7xT7lq2yWn2j2Kq', 'Arun Patil (Safety Officer)', true),
    ('u0000007-0000-0000-0000-000000000007', 'priya.nair@apexinfra.com', '+919876500006', '$2a$12$K1dJgAHzu1fM.PqD63OQ8OQc3s6oVn.hMbmV.G7xT7lq2yWn2j2Kq', 'Priya Nair (HR & Payroll Manager)', true);

INSERT INTO user_company_memberships (user_id, company_id, default_branch_id, is_default)
VALUES 
    ('u0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', true),
    ('u0000003-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', true),
    ('u0000004-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', true),
    ('u0000005-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', true),
    ('u0000006-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', true),
    ('u0000007-0000-0000-0000-000000000007', 'c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', true);

-- ------------------------------------------------------------------------------
-- 3. ROLES & PERMISSIONS
-- ------------------------------------------------------------------------------
INSERT INTO roles (id, company_id, name, slug, description, is_system_role)
VALUES 
    ('r0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Company Executive', 'company_admin', 'Full administrative authority across all projects', true),
    ('r0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'Project Manager', 'project_manager', 'Project scope, budget, and site approvals', false),
    ('r0000003-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000003', 'Site Engineer', 'site_engineer', 'Daily progress reports, site attendance, and QA', false),
    ('r0000004-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000004', 'Storekeeper', 'storekeeper', 'Material gate receipts, issues, and audits', false);

INSERT INTO permissions (id, category, action, resource, code, description)
VALUES 
    ('p0000001-0000-0000-0000-000000000001', 'ATTENDANCE', 'APPROVE', 'attendance_sessions', 'attendance:approve', 'Approve daily attendance and overtime'),
    ('p0000002-0000-0000-0000-000000000002', 'INVENTORY', 'ISSUE', 'stock_transactions', 'inventory:issue', 'Issue materials from site store'),
    ('p0000003-0000-0000-0000-000000000003', 'DPR', 'CREATE', 'daily_progress_reports', 'dpr:create', 'Create daily progress report'),
    ('p0000004-0000-0000-0000-000000000004', 'SAFETY', 'REPORT', 'safety_incidents', 'safety:report', 'Log site safety incidents');

INSERT INTO role_permissions (role_id, permission_id)
VALUES 
    ('r0000002-0000-0000-0000-000000000002', 'p0000001-0000-0000-0000-000000000001'),
    ('r0000003-0000-0000-0000-000000000003', 'p0000003-0000-0000-0000-000000000003'),
    ('r0000003-0000-0000-0000-000000000003', 'p0000004-0000-0000-0000-000000000004'),
    ('r0000004-0000-0000-0000-000000000004', 'p0000002-0000-0000-0000-000000000002');

-- ------------------------------------------------------------------------------
-- 4. DEPARTMENTS, DESIGNATIONS & 35 SALARIED EMPLOYEES
-- ------------------------------------------------------------------------------
INSERT INTO departments (id, company_id, code, name)
VALUES 
    ('d0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'CIVIL-ENG', 'Civil Engineering'),
    ('d0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'PROJECT-MGT', 'Project Management'),
    ('d0000003-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'STORES-LOG', 'Stores & Logistics'),
    ('d0000004-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000001', 'SAFETY-EHS', 'Environment, Health & Safety');

INSERT INTO designations (id, company_id, title, level)
VALUES 
    ('g0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Project Manager', 5),
    ('g0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'Senior Site Engineer', 4),
    ('g0000003-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'Junior Site Engineer', 3),
    ('g0000004-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000001', 'Site Foreman', 2),
    ('g0000005-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000001', 'Storekeeper', 2);

-- Insert primary key staff (Employees linked to user accounts)
INSERT INTO employees (id, company_id, branch_id, user_id, department_id, designation_id, employee_code, first_name, last_name, phone, joining_date, status)
VALUES 
    ('e0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'u0000003-0000-0000-0000-000000000003', 'd0000002-0000-0000-0000-000000000002', 'g0000001-0000-0000-0000-000000000001', 'EMP-APEX-001', 'Suresh', 'Kumar', '+919876500002', '2020-01-15', 'ACTIVE'),
    ('e0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'u0000004-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000001', 'g0000002-0000-0000-0000-000000000002', 'EMP-APEX-002', 'Vikram', 'Singh', '+919876500003', '2021-03-10', 'ACTIVE'),
    ('e0000003-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'u0000005-0000-0000-0000-000000000005', 'd0000003-0000-0000-0000-000000000003', 'g0000005-0000-0000-0000-000000000005', 'EMP-APEX-003', 'Ananya', 'Deshmukh', '+919876500004', '2021-06-01', 'ACTIVE'),
    ('e0000004-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'u0000006-0000-0000-0000-000000000006', 'd0000004-0000-0000-0000-000000000004', 'g0000002-0000-0000-0000-000000000002', 'EMP-APEX-004', 'Arun', 'Patil', '+919876500005', '2022-01-20', 'ACTIVE');

-- Insert remaining 31 salaried field staff and supervisors (Total: 35 employees)
INSERT INTO employees (id, company_id, branch_id, department_id, designation_id, employee_code, first_name, last_name, phone, joining_date, status)
SELECT 
    ('e0000000-0000-0000-0000-' || LPAD(i::text, 12, '0'))::UUID,
    'c0000001-0000-0000-0000-000000000001',
    'b0000001-0000-0000-0000-000000000001',
    'd0000001-0000-0000-0000-000000000001',
    CASE WHEN i % 3 = 0 THEN 'g0000003-0000-0000-0000-000000000003'::UUID ELSE 'g0000004-0000-0000-0000-000000000004'::UUID END,
    'EMP-APEX-' || LPAD(i::text, 3, '0'),
    'Supervisor_' || i,
    'Staff_' || i,
    '+919811' || LPAD(i::text, 6, '0'),
    '2023-01-01'::DATE + (i * 5 || ' days')::INTERVAL,
    'ACTIVE'
FROM generate_series(5, 35) AS i;

-- ------------------------------------------------------------------------------
-- 5. CONTRACTORS
-- ------------------------------------------------------------------------------
INSERT INTO contractors (id, company_id, contractor_code, business_name, contractor_type, contact_person, phone, tax_id, rating)
VALUES 
    ('k0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'CONT-REBAR', 'Shree Ram Rebar & Steel Works', 'REBAR', 'Manoj Sharma', '+919822001122', '29AABCS1122M1Z8', 4.80),
    ('k0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'CONT-MASON', 'Southern Formwork & Masonry Contractors', 'MASONRY', 'Gopal Reddy', '+919822003344', '29AABCS3344N1Z2', 4.65),
    ('k0000003-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'CONT-LABOUR', 'Bharat Labour Supply Services', 'LABOUR_SUPPLY', 'Deepak Verma', '+919822005566', '29AABCS5566P1Z4', 4.50);

-- ------------------------------------------------------------------------------
-- 6. 315 LABOURERS (Masons, Carpenters, Bar Benders, Helpers)
-- Initial Workers = 35 Employees + 315 Labourers = 350 Workers
-- ------------------------------------------------------------------------------
INSERT INTO labourers (
    id, company_id, contractor_id, labourer_code, first_name, last_name, 
    phone, skill_level, primary_trade, daily_wage_rate, overtime_hourly_rate, 
    biometric_enrolled, is_active
)
SELECT 
    ('l0000000-0000-0000-0000-' || LPAD(i::text, 12, '0'))::UUID,
    'c0000001-0000-0000-0000-000000000001',
    CASE 
        WHEN i % 3 = 1 THEN 'k0000001-0000-0000-0000-000000000001'::UUID 
        WHEN i % 3 = 2 THEN 'k0000002-0000-0000-0000-000000000002'::UUID 
        ELSE 'k0000003-0000-0000-0000-000000000001'::UUID 
    END,
    'LAB-APEX-' || LPAD(i::text, 4, '0'),
    CASE (i % 8)
        WHEN 0 THEN 'Ramesh'
        WHEN 1 THEN 'Santosh'
        WHEN 2 THEN 'Mahesh'
        WHEN 3 THEN 'Dharmendra'
        WHEN 4 THEN 'Govind'
        WHEN 5 THEN 'Mohan'
        WHEN 6 THEN 'Sunil'
        ELSE 'Ganesh'
    END,
    'Kumar_' || i,
    '+9197' || LPAD(i::text, 8, '0'),
    CASE (i % 4)
        WHEN 0 THEN 'UNSKILLED'::labour_skill_level
        WHEN 1 THEN 'SEMI_SKILLED'::labour_skill_level
        WHEN 2 THEN 'SKILLED'::labour_skill_level
        ELSE 'HIGHLY_SKILLED'::labour_skill_level
    END,
    CASE (i % 6)
        WHEN 0 THEN 'BAR_BENDER'::labour_trade
        WHEN 1 THEN 'MASON'::labour_trade
        WHEN 2 THEN 'CARPENTER'::labour_trade
        WHEN 3 THEN 'ELECTRICIAN'::labour_trade
        WHEN 4 THEN 'SCAFFOLDER'::labour_trade
        ELSE 'GENERAL_HELPER'::labour_trade
    END,
    CASE (i % 4)
        WHEN 0 THEN 650.00
        WHEN 1 THEN 850.00
        WHEN 2 THEN 1050.00
        ELSE 1350.00
    END,
    CASE (i % 4)
        WHEN 0 THEN 120.00
        WHEN 1 THEN 160.00
        WHEN 2 THEN 200.00
        ELSE 250.00
    END,
    true,
    true
FROM generate_series(1, 315) AS i;

-- ------------------------------------------------------------------------------
-- 7. PROJECTS & SITES
-- ------------------------------------------------------------------------------
INSERT INTO projects (
    id, company_id, branch_id, project_code, name, client_name, 
    contract_value, budget, start_date, planned_end_date, status, total_area_sqft
)
VALUES 
    (
        'a0000001-0000-0000-0000-000000000001', 
        'c0000001-0000-0000-0000-000000000001', 
        'b0000001-0000-0000-0000-000000000001', 
        'PRJ-SKYLINE-02', 
        'Skyline Tech Park - Phase 2', 
        'Skyline Developers SEZ Ltd', 
        850000000.00, -- 85 Crores INR
        780000000.00, 
        '2026-01-10', 
        '2028-06-30', 
        'ACTIVE', 
        1250000.00
    ),
    (
        'a0000002-0000-0000-0000-000000000002', 
        'c0000001-0000-0000-0000-000000000001', 
        'b0000001-0000-0000-0000-000000000001', 
        'PRJ-FLYOVER-P4', 
        'Elevated Corridor Package 4', 
        'Bangalore Development Authority (BDA)', 
        420000000.00, 
        390000000.00, 
        '2025-11-01', 
        '2027-03-31', 
        'ACTIVE', 
        450000.00
    );

-- Construction Sites
INSERT INTO sites (
    id, company_id, project_id, site_code, name, site_engineer_id, 
    address_line1, city, state, postal_code, status, latitude, longitude
)
VALUES 
    (
        's0000001-0000-0000-0000-000000000001',
        'c0000001-0000-0000-0000-000000000001',
        'a0000001-0000-0000-0000-000000000001',
        'SITE-SKY-TOWER-A',
        'Skyline Tower A & Basement Podium',
        'e0000002-0000-0000-0000-000000000002',
        'Outer Ring Road, Near Bellandur Flyover',
        'Bengaluru',
        'Karnataka',
        '560103',
        'ACTIVE_CONSTRUCTION',
        12.93524200,
        77.69460200
    ),
    (
        's0000002-0000-0000-0000-000000000002',
        'c0000001-0000-0000-0000-000000000001',
        'a0000001-0000-0000-0000-000000000001',
        'SITE-SKY-CLUBHOUSE',
        'Skyline Central Amenity Hub & Clubhouse',
        'e0000002-0000-0000-0000-000000000002',
        'Outer Ring Road, Bellandur East Gate',
        'Bengaluru',
        'Karnataka',
        '560103',
        'ACTIVE_CONSTRUCTION',
        12.93650000,
        77.69580000
    );

-- ------------------------------------------------------------------------------
-- 8. POSTGIS GEOFENCES (Circular & Polygon Boundaries)
-- ------------------------------------------------------------------------------
-- Circular Geofence: 150-meter radius around Tower A site center
INSERT INTO site_geofences (
    id, company_id, site_id, name, geofence_type, 
    center_latitude, center_longitude, center_point, radius_meters, is_active
)
VALUES (
    'g0000001-0000-0000-0000-000000000001',
    'c0000001-0000-0000-0000-000000000001',
    's0000001-0000-0000-0000-000000000001',
    'Tower A Main Gate Circular Perimeter (150m)',
    'CIRCULAR',
    12.93524200,
    77.69460200,
    ST_SetSRID(ST_MakePoint(77.69460200, 12.93524200), 4326)::geography,
    150.00,
    true
);

-- Polygon Geofence: 5-point perimeter enclosing the entire construction boundary
INSERT INTO site_geofences (
    id, company_id, site_id, name, geofence_type, 
    polygon, is_active
)
VALUES (
    'g0000002-0000-0000-0000-000000000002',
    'c0000001-0000-0000-0000-000000000001',
    's0000001-0000-0000-0000-000000000001',
    'Tower A Plot Cadastral Boundary (Polygon)',
    'POLYGON',
    ST_GeogFromText('SRID=4326;POLYGON((77.693500 12.934500, 77.696000 12.934500, 77.696200 12.936000, 77.693800 12.936200, 77.693500 12.934500))'),
    true
);

-- ------------------------------------------------------------------------------
-- 9. SHIFTS
-- ------------------------------------------------------------------------------
INSERT INTO shifts (id, company_id, code, name, start_time, end_time, grace_period_minutes, break_duration_minutes)
VALUES 
    ('h0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'GEN-DAY', 'General Day Shift', '08:00:00', '17:00:00', 15, 60),
    ('h0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'NIGHT-POUR', 'Night Concrete Pour Shift', '20:00:00', '05:00:00', 15, 60);

-- Assign Staff and Labourers to Site 1
INSERT INTO site_assignments (company_id, site_id, assignee_type, employee_id, role_on_site, assigned_from)
VALUES 
    ('c0000001-0000-0000-0000-000000000001', 's0000001-0000-0000-0000-000000000001', 'EMPLOYEE', 'e0000002-0000-0000-0000-000000000002', 'Site In-Charge', '2026-01-15'),
    ('c0000001-0000-0000-0000-000000000001', 's0000001-0000-0000-0000-000000000001', 'EMPLOYEE', 'e0000003-0000-0000-0000-000000000003', 'Site Store Manager', '2026-01-15');

INSERT INTO site_assignments (company_id, site_id, assignee_type, labourer_id, assigned_from)
SELECT 
    'c0000001-0000-0000-0000-000000000001',
    's0000001-0000-0000-0000-000000000001',
    'LABOURER',
    id,
    '2026-01-15'
FROM labourers LIMIT 200;

-- ------------------------------------------------------------------------------
-- 10. ATTENDANCE SESSIONS, EVENTS & TELEMETRY
-- Preserving worker, company, project, site, coordinates, distance, accuracy, snapshot
-- ------------------------------------------------------------------------------
-- Sample Session for Site Engineer Vikram Singh
INSERT INTO attendance_sessions (
    id, company_id, project_id, site_id, shift_id, worker_type, employee_id, 
    session_date, first_clock_in, last_clock_out, total_duration_minutes, regular_minutes, 
    overtime_minutes, status, verification_status, approval_status
)
VALUES (
    't0000001-0000-0000-0000-000000000001',
    'c0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000001',
    's0000001-0000-0000-0000-000000000001',
    'h0000001-0000-0000-0000-000000000001',
    'EMPLOYEE',
    'e0000002-0000-0000-0000-000000000002',
    '2026-11-09',
    '2026-11-09 07:55:00+05:30',
    '2026-11-09 17:10:00+05:30',
    555,
    480,
    75,
    'PRESENT',
    'VERIFIED',
    'APPROVED'
);

-- Clock In Punch Event (Spatial verification PASSED: 34.2 meters from site center)
INSERT INTO attendance_events (
    id, company_id, session_id, project_id, site_id, geofence_id, 
    worker_type, employee_id, event_type, event_timestamp, source, 
    verification_method, verification_result, latitude, longitude, 
    gps_accuracy_meters, calculated_distance_meters, configured_radius_snapshot_meters, 
    is_inside_geofence, is_mock_location, device_id, device_model
)
VALUES (
    'v0000001-0000-0000-0000-000000000001',
    'c0000001-0000-0000-0000-000000000001',
    't0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000001',
    's0000001-0000-0000-0000-000000000001',
    'g0000001-0000-0000-0000-000000000001',
    'EMPLOYEE',
    'e0000002-0000-0000-0000-000000000002',
    'CLOCK_IN',
    '2026-11-09 07:55:12+05:30',
    'MOBILE_APP',
    'FACE_RECOGNITION',
    'PASSED',
    12.93540000,
    77.69480000,
    8.50,
    34.20,
    150.00,
    true,
    false,
    'IMEI-864920194829103',
    'Samsung Galaxy S24 Ultra'
);

-- Clock Out Punch Event
INSERT INTO attendance_events (
    id, company_id, session_id, project_id, site_id, geofence_id, 
    worker_type, employee_id, event_type, event_timestamp, source, 
    verification_method, verification_result, latitude, longitude, 
    gps_accuracy_meters, calculated_distance_meters, configured_radius_snapshot_meters, 
    is_inside_geofence, is_mock_location, device_id, device_model
)
VALUES (
    'v0000002-0000-0000-0000-000000000002',
    'c0000001-0000-0000-0000-000000000001',
    't0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000001',
    's0000001-0000-0000-0000-000000000001',
    'g0000001-0000-0000-0000-000000000001',
    'EMPLOYEE',
    'e0000002-0000-0000-0000-000000000002',
    'CLOCK_OUT',
    '2026-11-09 17:10:45+05:30',
    'MOBILE_APP',
    'GEOFENCE_ONLY',
    'PASSED',
    12.93530000,
    77.69470000,
    9.10,
    18.50,
    150.00,
    true,
    false,
    'IMEI-864920194829103',
    'Samsung Galaxy S24 Ultra'
);

-- High-Fidelity Location Telemetry Breadcrumb
INSERT INTO location_events (
    company_id, attendance_event_id, project_id, site_id, worker_type, 
    employee_id, recorded_at, latitude, longitude, accuracy_meters, battery_percentage
)
VALUES (
    'c0000001-0000-0000-0000-000000000001',
    'v0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000001',
    's0000001-0000-0000-0000-000000000001',
    'EMPLOYEE',
    'e0000002-0000-0000-0000-000000000002',
    '2026-11-09 07:55:12+05:30',
    12.93540000,
    77.69480000,
    8.50,
    88
);

-- Attendance Approval record
INSERT INTO attendance_approvals (
    company_id, session_id, approver_user_id, approval_tier, status, comments
)
VALUES (
    'c0000001-0000-0000-0000-000000000001',
    't0000001-0000-0000-0000-000000000001',
    'u0000003-0000-0000-0000-000000000003',
    1,
    'APPROVED',
    'Verified on-site pour schedule completion.'
);

-- ------------------------------------------------------------------------------
-- 11. MATERIALS, WAREHOUSES & AUDITABLE STOCK LEDGER
-- ------------------------------------------------------------------------------
INSERT INTO units_of_measure (id, company_id, code, name, symbol)
VALUES 
    ('u0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'BAG', 'Bag (50 Kg)', 'BAG'),
    ('u0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'MT', 'Metric Tonne', 'MT'),
    ('u0000003-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'CUM', 'Cubic Metre', 'm3'),
    ('u0000004-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000001', 'NOS', 'Numbers / Pieces', 'NOS');

INSERT INTO material_categories (id, company_id, code, name)
VALUES 
    ('m0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'CEMENT', 'Cement & Bindings'),
    ('m0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'STEEL-TMT', 'Reinforcement Rebar'),
    ('m0000003-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'RMC-CONC', 'Ready Mix Concrete');

INSERT INTO materials (id, company_id, category_id, uom_id, item_code, name, standard_rate, min_stock_level, reorder_level)
VALUES 
    ('i0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'm0000001-0000-0000-0000-000000000001', 'u0000001-0000-0000-0000-000000000001', 'MAT-CEM-OPC53', 'Ultratech OPC 53 Grade Cement', 385.0000, 200.0000, 500.0000),
    ('i0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'm0000002-0000-0000-0000-000000000002', 'u0000002-0000-0000-0000-000000000002', 'MAT-STL-TMT16', 'Tata Tiscon 16mm Fe500D TMT Bar', 62500.0000, 15.0000, 30.0000),
    ('i0000003-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'm0000003-0000-0000-0000-000000000003', 'u0000003-0000-0000-0000-000000000003', 'MAT-CONC-M35', 'Design Mix Concrete M35 Pumpable', 4800.0000, 0.0000, 50.0000);

INSERT INTO warehouses (id, company_id, project_id, site_id, storekeeper_id, code, name, warehouse_type)
VALUES 
    ('w0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 's0000001-0000-0000-0000-000000000001', 'e0000003-0000-0000-0000-000000000003', 'WH-SKY-MAIN', 'Skyline Tower Site Central Yard', 'SITE_STORE'),
    ('w0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 's0000001-0000-0000-0000-000000000001', 'e0000003-0000-0000-0000-000000000003', 'WH-SKY-STEELYARD', 'Tower A Rebar Fabrication Laydown', 'LAYDOWN_YARD');

-- Double-Entry Stock Ledger Transactions: Inward Receipts
INSERT INTO stock_transactions (
    company_id, transaction_number, transaction_type, material_id, destination_warehouse_id, 
    project_id, site_id, quantity, unit_rate, total_value, reference_type, transacted_by_id
)
VALUES 
    (
        'c0000001-0000-0000-0000-000000000001', 
        'TX-GRN-2026-0001', 
        'RECEIPT_PO', 
        'i0000001-0000-0000-0000-000000000001', 
        'w0000001-0000-0000-0000-000000000001', 
        'a0000001-0000-0000-0000-000000000001', 
        's0000001-0000-0000-0000-000000000001', 
        1000.0000, -- 1000 bags
        380.0000, 
        380000.00, 
        'GRN', 
        'u0000005-0000-0000-0000-000000000005'
    ),
    (
        'c0000001-0000-0000-0000-000000000001', 
        'TX-GRN-2026-0002', 
        'RECEIPT_PO', 
        'i0000002-0000-0000-0000-000000000002', 
        'w0000002-0000-0000-0000-000000000002', 
        'a0000001-0000-0000-0000-000000000001', 
        's0000001-0000-0000-0000-000000000001', 
        50.0000, -- 50 MT Rebar
        62000.0000, 
        3100000.00, 
        'GRN', 
        'u0000005-0000-0000-0000-000000000005'
    );

-- Consumption Issue from Warehouse to Workfront
INSERT INTO stock_transactions (
    company_id, transaction_number, transaction_type, material_id, source_warehouse_id, 
    project_id, site_id, quantity, unit_rate, total_value, reference_type, transacted_by_id
)
VALUES (
    'c0000001-0000-0000-0000-000000000001', 
    'TX-ISS-2026-0001', 
    'ISSUE_PROJECT', 
    'i0000001-0000-0000-0000-000000000001', 
    'w0000001-0000-0000-0000-000000000001', 
    'a0000001-0000-0000-0000-000000000001', 
    's0000001-0000-0000-0000-000000000001', 
    150.0000, -- 150 bags issued for columns
    380.0000, 
    57000.00, 
    'REQUISITION', 
    'u0000005-0000-0000-0000-000000000005'
);

-- ------------------------------------------------------------------------------
-- 12. SUPPLIERS & PROCUREMENT
-- ------------------------------------------------------------------------------
INSERT INTO suppliers (id, company_id, supplier_code, name, contact_person, email, phone, tax_id, payment_terms_days, address)
VALUES 
    ('j0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'SUP-ULTRATECH', 'UltraTech Cement Limited', 'Rajan Shinde', 'rajan.shinde@adityabirla.com', '+918025556677', '29AAACU0123U1Z8', 45, 'Industrial Area, Peenya, Bengaluru'),
    ('j0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'SUP-TATASTEEL', 'Tata Steel Distribution Centre', 'Kunal Sen', 'kunal.sen@tatasteel.com', '+918025558899', '29AAACT9876T1Z5', 30, 'Whitefield Logistics Park, Bengaluru');

-- ------------------------------------------------------------------------------
-- 13. EQUIPMENT & MACHINERY
-- ------------------------------------------------------------------------------
INSERT INTO equipment (id, company_id, asset_code, name, category, make, model, current_meter_reading, status)
VALUES 
    ('q0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'EQ-TOWERCRANE-01', 'Potain MC 85B Tower Crane 5T', 'CRANE', 'Manitowoc Potain', 'MC 85B', 1420.50, 'DEPLOYED'),
    ('q0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'EQ-EXCAVATOR-01', 'JCB JS205 Heavy Excavator 20T', 'EXCAVATOR', 'JCB India', 'JS205', 2890.00, 'DEPLOYED');

INSERT INTO equipment_deployments (company_id, equipment_id, project_id, site_id, start_date, start_meter_reading)
VALUES (
    'c0000001-0000-0000-0000-000000000001',
    'q0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000001',
    's0000001-0000-0000-0000-000000000001',
    '2026-02-01',
    1200.00
);

-- ------------------------------------------------------------------------------
-- 14. TASKS & WORK BREAKDOWN STRUCTURE (WBS)
-- ------------------------------------------------------------------------------
INSERT INTO tasks (
    id, company_id, project_id, site_id, wbs_code, name, planned_start_date, 
    planned_end_date, progress_percentage, status, priority, estimated_cost
)
VALUES 
    (
        'k0000001-0000-0000-0000-000000000001',
        'c0000001-0000-0000-0000-000000000001',
        'a0000001-0000-0000-0000-000000000001',
        's0000001-0000-0000-0000-000000000001',
        'WBS-1.0-SUBSTRUCTURE',
        'Substructure & Foundation Works',
        '2026-01-15',
        '2026-06-30',
        72.50,
        'IN_PROGRESS',
        'CRITICAL',
        45000000.00
    ),
    (
        'k0000002-0000-0000-0000-000000000002',
        'c0000001-0000-0000-0000-000000000001',
        'a0000001-0000-0000-0000-000000000001',
        's0000001-0000-0000-0000-000000000001',
        'WBS-1.1-RAFT-POUR',
        'Tower A Raft Concrete Pouring (M35)',
        '2026-02-01',
        '2026-03-15',
        100.00,
        'COMPLETED',
        'HIGH',
        18500000.00
    );

-- ------------------------------------------------------------------------------
-- 15. DAILY PROGRESS REPORT (DPR)
-- ------------------------------------------------------------------------------
INSERT INTO daily_progress_reports (
    id, company_id, project_id, site_id, dpr_number, report_date, 
    weather_summary, temperature_celsius, engineer_in_charge_id, general_summary, status
)
VALUES (
    'd0000001-0000-0000-0000-000000000001',
    'c0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000001',
    's0000001-0000-0000-0000-000000000001',
    'DPR-SKY-2026-11-09',
    '2026-11-09',
    'Clear and Sunny',
    28.5,
    'e0000002-0000-0000-0000-000000000002',
    'Completed casting of 12 numbers C1 to C12 podium columns up to +3.60m level. Rebar binding in progress for basement retention wall.',
    'APPROVED'
);

INSERT INTO dpr_manpower_counts (dpr_id, contractor_id, trade, headcount, working_hours)
VALUES 
    ('d0000001-0000-0000-0000-000000000001', 'k0000001-0000-0000-0000-000000000001', 'BAR_BENDER', 45, 8.00),
    ('d0000001-0000-0000-0000-000000000001', 'k0000002-0000-0000-0000-000000000002', 'CARPENTER', 38, 8.00),
    ('d0000001-0000-0000-0000-000000000001', 'k0000002-0000-0000-0000-000000000002', 'MASON', 24, 8.00),
    ('d0000001-0000-0000-0000-000000000001', 'k0000003-0000-0000-0000-000000000001', 'GENERAL_HELPER', 70, 8.00);

-- ------------------------------------------------------------------------------
-- 16. SAFETY INCIDENTS & QUALITY INSPECTIONS
-- ------------------------------------------------------------------------------
INSERT INTO safety_incidents (
    company_id, project_id, site_id, incident_number, occurred_at, 
    incident_type, severity, location_details, reported_by_id, 
    description, immediate_actions_taken, status
)
VALUES (
    'c0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000001',
    's0000001-0000-0000-0000-000000000001',
    'INC-SKY-2026-001',
    '2026-11-08 14:15:00+05:30',
    'NEAR_MISS',
    'LOW',
    'Tower A - Grid B4 Excavation Pit',
    'u0000006-0000-0000-0000-000000000006',
    'Loose trench side soil sloughed off near access ladder during excavator movement. No injuries sustained.',
    'Immediate stop-work on excavator swing radius. Installed trench edge timber shoring barriers.',
    'RESOLVED'
);

INSERT INTO quality_inspections (
    company_id, project_id, site_id, inspection_number, inspector_id, 
    inspection_date, area_or_grid, result, score_percentage, comments
)
VALUES (
    'c0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000001',
    's0000001-0000-0000-0000-000000000001',
    'QC-SKY-2026-0045',
    'e0000002-0000-0000-0000-000000000002',
    '2026-11-09',
    'Podium Slab Grid D-E/4-6 Rebar Cover',
    'PASSED',
    96.50,
    'Reinforcement spacing, cover blocks (50mm), and lap lengths verified against approved structural drawing REV-03.'
);

-- ------------------------------------------------------------------------------
-- 17. AUDIT LOG (Immutable Trail Verification)
-- ------------------------------------------------------------------------------
INSERT INTO audit_logs (
    company_id, actor_user_id, action, table_name, record_id, 
    new_data, ip_address, user_agent
)
VALUES (
    'c0000001-0000-0000-0000-000000000001',
    'u0000003-0000-0000-0000-000000000003',
    'APPROVE',
    'attendance_sessions',
    't0000001-0000-0000-0000-000000000001',
    '{"status": "APPROVED", "session_id": "t0000001-0000-0000-0000-000000000001"}'::jsonb,
    '192.168.1.104',
    'Construct360 Mobile Web / Chrome Android 14'
);

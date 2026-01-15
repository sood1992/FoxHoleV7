-- FOXHOLE Enterprise OS Database Schema
-- MySQL 5.7 Compatible

SET FOREIGN_KEY_CHECKS = 0;

-- Users table
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    phone VARCHAR(20),
    role ENUM('admin', 'pm', 'employee') NOT NULL DEFAULT 'employee',
    designation VARCHAR(100),
    department VARCHAR(100),
    hourly_cost DECIMAL(10,2) DEFAULT 0.00,
    weekly_capacity_hours INT DEFAULT 40,
    is_active BOOLEAN DEFAULT TRUE,
    xp_total INT DEFAULT 0,
    current_level INT DEFAULT 1,
    current_streak_days INT DEFAULT 0,
    last_task_completed_date DATE,
    show_level_publicly BOOLEAN DEFAULT TRUE,
    appear_on_leaderboard BOOLEAN DEFAULT TRUE,
    show_badges BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role),
    INDEX idx_users_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User preferences
DROP TABLE IF EXISTS user_preferences;
CREATE TABLE user_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    weekly_digest BOOLEAN DEFAULT TRUE,
    dark_mode BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Refresh tokens for JWT
DROP TABLE IF EXISTS refresh_tokens;
CREATE TABLE refresh_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_refresh_token (token),
    INDEX idx_refresh_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Projects table
DROP TABLE IF EXISTS projects;
CREATE TABLE projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) UNIQUE,
    client_name VARCHAR(255),
    description TEXT,
    status ENUM('planning', 'active', 'on_hold', 'completed', 'archived') DEFAULT 'planning',
    workflow_template ENUM('video', 'photography', 'design', 'custom') DEFAULT 'custom',
    budget DECIMAL(12,2) DEFAULT 0.00,
    hourly_rate DECIMAL(10,2) DEFAULT 0.00,
    start_date DATE,
    due_date DATE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_projects_status (status),
    INDEX idx_projects_due (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project members (access control)
DROP TABLE IF EXISTS project_members;
CREATE TABLE project_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('owner', 'manager', 'member', 'viewer') DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_project_member (project_id, user_id),
    INDEX idx_project_members_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kanban columns (per project)
DROP TABLE IF EXISTS kanban_columns;
CREATE TABLE kanban_columns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    color VARCHAR(7) DEFAULT '#7367F0',
    is_done_column BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_kanban_columns_project (project_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tasks table
DROP TABLE IF EXISTS tasks;
CREATE TABLE tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    column_id INT NOT NULL,
    parent_task_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    complexity ENUM('trivial', 'simple', 'medium', 'complex', 'epic') DEFAULT 'medium',
    status ENUM('blocked', 'ready', 'in_progress', 'review', 'complete') DEFAULT 'ready',
    owner_id INT,
    estimated_hours DECIMAL(5,2) DEFAULT 0.00,
    actual_hours DECIMAL(5,2) DEFAULT 0.00,
    start_date DATE,
    due_date DATE,
    completed_at TIMESTAMP NULL,
    position INT DEFAULT 0,
    is_self_created BOOLEAN DEFAULT FALSE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (column_id) REFERENCES kanban_columns(id),
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_tasks_project (project_id),
    INDEX idx_tasks_owner (owner_id),
    INDEX idx_tasks_status (status),
    INDEX idx_tasks_due (due_date),
    INDEX idx_tasks_column (column_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Task contributors (multi-person collaboration)
DROP TABLE IF EXISTS task_contributors;
CREATE TABLE task_contributors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    role_name VARCHAR(100),
    estimated_hours DECIMAL(5,2) DEFAULT 0.00,
    status ENUM('not_started', 'in_progress', 'complete') DEFAULT 'not_started',
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_task_contributor (task_id, user_id),
    INDEX idx_task_contributors_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Task dependencies
DROP TABLE IF EXISTS task_dependencies;
CREATE TABLE task_dependencies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    predecessor_id INT NOT NULL,
    successor_id INT NOT NULL,
    dependency_type ENUM('FS', 'SS', 'FF', 'SF') DEFAULT 'FS',
    lag_hours INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (predecessor_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (successor_id) REFERENCES tasks(id) ON DELETE CASCADE,
    UNIQUE KEY unique_dependency (predecessor_id, successor_id),
    INDEX idx_deps_predecessor (predecessor_id),
    INDEX idx_deps_successor (successor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Time entries
DROP TABLE IF EXISTS time_entries;
CREATE TABLE time_entries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    hours DECIMAL(5,2) NOT NULL,
    notes TEXT,
    is_billable BOOLEAN DEFAULT TRUE,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    INDEX idx_time_entries_user_date (user_id, date),
    INDEX idx_time_entries_task (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Active timers
DROP TABLE IF EXISTS active_timers;
CREATE TABLE active_timers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    task_id INT NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comments
DROP TABLE IF EXISTS comments;
CREATE TABLE comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    INDEX idx_comments_task (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attachments (polymorphic)
DROP TABLE IF EXISTS attachments;
CREATE TABLE attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    attachable_type ENUM('task', 'project', 'comment', 'review') NOT NULL,
    attachable_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT DEFAULT 0,
    file_type VARCHAR(50),
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_attachments_entity (attachable_type, attachable_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Client review portals
DROP TABLE IF EXISTS review_portals;
CREATE TABLE review_portals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL,
    unique_token VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    allow_download BOOLEAN DEFAULT FALSE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_review_portals_token (unique_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Review versions
DROP TABLE IF EXISTS review_versions;
CREATE TABLE review_versions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    portal_id INT NOT NULL,
    version_number INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    notes TEXT,
    status ENUM('pending', 'approved', 'revision_requested') DEFAULT 'pending',
    approved_at TIMESTAMP NULL,
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (portal_id) REFERENCES review_portals(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_review_versions_portal (portal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Review comments (client feedback)
DROP TABLE IF EXISTS review_comments;
CREATE TABLE review_comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    version_id INT NOT NULL,
    client_name VARCHAR(100),
    client_email VARCHAR(255),
    content TEXT NOT NULL,
    timestamp_ms INT,
    timestamp_end_ms INT,
    position_x DECIMAL(5,2),
    position_y DECIMAL(5,2),
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (version_id) REFERENCES review_versions(id) ON DELETE CASCADE,
    INDEX idx_review_comments_version (version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shoots (production calendar)
DROP TABLE IF EXISTS shoots;
CREATE TABLE shoots (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    shoot_date DATE NOT NULL,
    call_time TIME,
    end_time TIME,
    location_name VARCHAR(255),
    location_address TEXT,
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_shoots_date (shoot_date),
    INDEX idx_shoots_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shoot crew assignments
DROP TABLE IF EXISTS shoot_crew;
CREATE TABLE shoot_crew (
    id INT PRIMARY KEY AUTO_INCREMENT,
    shoot_id INT NOT NULL,
    user_id INT,
    external_name VARCHAR(100),
    external_phone VARCHAR(20),
    role_name VARCHAR(100) NOT NULL,
    call_time TIME,
    status ENUM('pending', 'confirmed', 'declined') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shoot_id) REFERENCES shoots(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_shoot_crew_shoot (shoot_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shoot equipment
DROP TABLE IF EXISTS shoot_equipment;
CREATE TABLE shoot_equipment (
    id INT PRIMARY KEY AUTO_INCREMENT,
    shoot_id INT NOT NULL,
    equipment_name VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shoot_id) REFERENCES shoots(id) ON DELETE CASCADE,
    INDEX idx_shoot_equipment_shoot (shoot_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Badges definition
DROP TABLE IF EXISTS badges;
CREATE TABLE badges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    category ENUM('skill', 'consistency', 'milestone', 'rare') NOT NULL,
    criteria_type VARCHAR(50),
    criteria_value INT,
    xp_reward INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User badges (earned)
DROP TABLE IF EXISTS user_badges;
CREATE TABLE user_badges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_badge (user_id, badge_id),
    INDEX idx_user_badges_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- XP transactions (audit log)
DROP TABLE IF EXISTS xp_transactions;
CREATE TABLE xp_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    amount INT NOT NULL,
    source VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    reference_type VARCHAR(50),
    reference_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_xp_transactions_user (user_id),
    INDEX idx_xp_transactions_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    reference_type VARCHAR(50),
    reference_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    sent_via_whatsapp BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id, is_read, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity log (audit trail)
DROP TABLE IF EXISTS activity_log;
CREATE TABLE activity_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    old_value JSON,
    new_value JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_activity_entity (entity_type, entity_id),
    INDEX idx_activity_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

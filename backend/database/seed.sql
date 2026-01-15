-- FOXHOLE Seed Data
-- Sample data for Neofox Media creative agency

-- Password for all users: "password123" (bcrypt hash)
INSERT INTO users (email, password_hash, name, phone, role, designation, hourly_cost, weekly_capacity_hours) VALUES
('admin@neofoxmedia.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Rishabh Sharma', '+919876543210', 'admin', 'Creative Director', 150.00, 40),
('pm@neofoxmedia.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Priya Verma', '+919876543211', 'pm', 'Project Manager', 100.00, 40),
('arun@neofoxmedia.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Arun Kumar', '+919876543212', 'employee', 'Senior Video Editor', 80.00, 40),
('vikram@neofoxmedia.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Vikram Singh', '+919876543213', 'employee', 'Videographer', 70.00, 40),
('neha@neofoxmedia.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Neha Patel', '+919876543214', 'employee', 'Photographer', 65.00, 40),
('raj@neofoxmedia.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Raj Malhotra', '+919876543215', 'employee', 'Graphic Designer', 60.00, 40),
('anita@neofoxmedia.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Anita Desai', '+919876543216', 'employee', 'Colorist', 75.00, 40),
('amit@neofoxmedia.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Amit Joshi', '+919876543217', 'pm', 'Senior PM', 90.00, 40);

-- Update XP for some users
UPDATE users SET xp_total = 2450, current_level = 23, current_streak_days = 12 WHERE email = 'arun@neofoxmedia.com';
UPDATE users SET xp_total = 1800, current_level = 18, current_streak_days = 5 WHERE email = 'vikram@neofoxmedia.com';
UPDATE users SET xp_total = 3200, current_level = 28, current_streak_days = 20 WHERE email = 'priya@neofoxmedia.com';

-- Sample Projects
INSERT INTO projects (name, code, client_name, description, status, workflow_template, budget, hourly_rate, start_date, due_date, created_by) VALUES
('Hyundai Q1 Brand Campaign', 'HYN-2026-001', 'Hyundai India', 'Brand film and social media content for Q1 2026 campaign launch', 'active', 'video', 500000.00, 2500.00, '2026-01-01', '2026-03-31', 1),
('PWC Corporate Videos', 'PWC-2026-001', 'PWC India', 'Corporate interview series and office culture documentation', 'active', 'video', 300000.00, 2000.00, '2026-01-05', '2026-02-28', 1),
('Startup India Photoshoot', 'SUI-2026-001', 'Startup India', 'Team photos and office space photography for annual report', 'active', 'photography', 150000.00, 1500.00, '2026-01-10', '2026-01-25', 2),
('Restaurant Menu Redesign', 'REST-2026-001', 'The Grand Delhi', 'Complete menu redesign with food photography', 'planning', 'design', 200000.00, 1800.00, '2026-02-01', '2026-03-15', 2),
('Tech Conference Coverage', 'TECH-2025-012', 'TechCon India', 'Full event coverage including keynotes and interviews', 'completed', 'video', 400000.00, 2200.00, '2025-11-01', '2025-12-15', 1);

-- Project members
INSERT INTO project_members (project_id, user_id, role) VALUES
(1, 1, 'owner'), (1, 2, 'manager'), (1, 3, 'member'), (1, 4, 'member'), (1, 7, 'member'),
(2, 1, 'owner'), (2, 8, 'manager'), (2, 3, 'member'), (2, 4, 'member'),
(3, 2, 'owner'), (3, 5, 'member'), (3, 6, 'member'),
(4, 2, 'owner'), (4, 5, 'member'), (4, 6, 'member'),
(5, 1, 'owner'), (5, 2, 'manager'), (5, 3, 'member'), (5, 4, 'member');

-- Kanban columns for Video Production template (Project 1 - Hyundai)
INSERT INTO kanban_columns (project_id, name, position, color, is_done_column) VALUES
(1, 'Brief', 0, '#7367F0', FALSE),
(1, 'Script', 1, '#9E95F5', FALSE),
(1, 'Storyboard', 2, '#00CFE8', FALSE),
(1, 'Shoot', 3, '#FF9F43', FALSE),
(1, 'Rough Cut', 4, '#28C76F', FALSE),
(1, 'Color & Sound', 5, '#7367F0', FALSE),
(1, 'Client Review', 6, '#FF9F43', FALSE),
(1, 'Revisions', 7, '#EA5455', FALSE),
(1, 'Delivered', 8, '#28C76F', TRUE);

-- Kanban columns for Project 2 - PWC
INSERT INTO kanban_columns (project_id, name, position, color, is_done_column) VALUES
(2, 'Backlog', 0, '#7367F0', FALSE),
(2, 'To Do', 1, '#9E95F5', FALSE),
(2, 'In Progress', 2, '#00CFE8', FALSE),
(2, 'Review', 3, '#FF9F43', FALSE),
(2, 'Done', 4, '#28C76F', TRUE);

-- Kanban columns for Photography (Project 3)
INSERT INTO kanban_columns (project_id, name, position, color, is_done_column) VALUES
(3, 'Brief', 0, '#7367F0', FALSE),
(3, 'Shoot', 1, '#FF9F43', FALSE),
(3, 'Cull', 2, '#00CFE8', FALSE),
(3, 'Edit', 3, '#9E95F5', FALSE),
(3, 'Retouch', 4, '#7367F0', FALSE),
(3, 'Delivered', 5, '#28C76F', TRUE);

-- Kanban columns for Design (Project 4)
INSERT INTO kanban_columns (project_id, name, position, color, is_done_column) VALUES
(4, 'Brief', 0, '#7367F0', FALSE),
(4, 'Research', 1, '#9E95F5', FALSE),
(4, 'Concept', 2, '#00CFE8', FALSE),
(4, 'Design', 3, '#FF9F43', FALSE),
(4, 'Review', 4, '#7367F0', FALSE),
(4, 'Delivered', 5, '#28C76F', TRUE);

-- Sample Tasks for Hyundai Project
INSERT INTO tasks (project_id, column_id, title, description, priority, complexity, status, owner_id, estimated_hours, start_date, due_date, created_by, position) VALUES
(1, 1, 'Client Kickoff Meeting', 'Initial briefing with Hyundai marketing team', 'high', 'simple', 'complete', 2, 2.00, '2026-01-02', '2026-01-02', 1, 0),
(1, 1, 'Creative Brief Document', 'Document all requirements and deliverables', 'high', 'medium', 'complete', 2, 4.00, '2026-01-03', '2026-01-05', 1, 1),
(1, 2, 'Script - Hero Film', 'Write script for main 60-second brand film', 'urgent', 'complex', 'complete', 1, 8.00, '2026-01-06', '2026-01-10', 1, 0),
(1, 3, 'Storyboard - Hero Film', 'Visual storyboard for hero film', 'high', 'medium', 'in_progress', 6, 6.00, '2026-01-11', '2026-01-13', 2, 0),
(1, 4, 'Hero Film Shoot Day 1', 'Factory floor sequences', 'urgent', 'complex', 'ready', 4, 10.00, '2026-01-15', '2026-01-15', 2, 0),
(1, 4, 'Hero Film Shoot Day 2', 'Driving sequences', 'urgent', 'complex', 'blocked', 4, 10.00, '2026-01-16', '2026-01-16', 2, 1),
(1, 5, 'Rough Cut - Hero Film', 'First assembly edit', 'high', 'complex', 'blocked', 3, 16.00, '2026-01-18', '2026-01-22', 2, 0),
(1, 6, 'Color Grade - Hero Film', 'Professional color grading', 'medium', 'medium', 'blocked', 7, 8.00, '2026-01-23', '2026-01-25', 2, 0),
(1, 6, 'Sound Design - Hero Film', 'Audio mix and sound effects', 'medium', 'medium', 'blocked', 3, 6.00, '2026-01-23', '2026-01-25', 2, 1);

-- Sample Tasks for PWC Project
INSERT INTO tasks (project_id, column_id, title, description, priority, complexity, status, owner_id, estimated_hours, start_date, due_date, created_by, position) VALUES
(2, 10, 'Interview - CEO', 'CEO leadership interview', 'high', 'medium', 'ready', 4, 4.00, '2026-01-20', '2026-01-20', 8, 0),
(2, 11, 'Interview - CFO', 'CFO financial insights interview', 'medium', 'medium', 'ready', 4, 4.00, '2026-01-21', '2026-01-21', 8, 0),
(2, 12, 'Edit - CEO Interview', 'Edit CEO interview footage', 'high', 'medium', 'in_progress', 3, 8.00, '2026-01-22', '2026-01-24', 8, 0),
(2, 13, 'Review - CEO Interview', 'Client review of CEO interview', 'medium', 'simple', 'blocked', 8, 2.00, '2026-01-25', '2026-01-26', 8, 0);

-- Sample Tasks for Photography Project
INSERT INTO tasks (project_id, column_id, title, description, priority, complexity, status, owner_id, estimated_hours, start_date, due_date, created_by, position) VALUES
(3, 15, 'Shoot - Team Photos', 'Individual and group team photos', 'high', 'medium', 'complete', 5, 6.00, '2026-01-12', '2026-01-12', 2, 0),
(3, 17, 'Cull - Team Photos', 'Select best photos from shoot', 'medium', 'simple', 'in_progress', 5, 3.00, '2026-01-13', '2026-01-13', 2, 0),
(3, 18, 'Edit - Team Photos', 'Basic editing and color correction', 'medium', 'medium', 'blocked', 5, 8.00, '2026-01-14', '2026-01-16', 2, 0),
(3, 19, 'Retouch - Executive Portraits', 'High-end retouching for C-suite', 'high', 'complex', 'blocked', 5, 10.00, '2026-01-17', '2026-01-20', 2, 0);

-- Task Dependencies
INSERT INTO task_dependencies (predecessor_id, successor_id, dependency_type) VALUES
(1, 2, 'FS'),  -- Kickoff -> Brief
(2, 3, 'FS'),  -- Brief -> Script
(3, 4, 'FS'),  -- Script -> Storyboard
(4, 5, 'FS'),  -- Storyboard -> Shoot Day 1
(5, 6, 'FS'),  -- Shoot Day 1 -> Shoot Day 2
(6, 7, 'FS'),  -- Shoot Day 2 -> Rough Cut
(7, 8, 'FS'),  -- Rough Cut -> Color Grade
(7, 9, 'FS'),  -- Rough Cut -> Sound Design
(12, 13, 'FS'), -- Edit CEO -> Review CEO
(15, 16, 'FS'), -- Shoot Team -> Cull
(16, 17, 'FS'), -- Cull -> Edit
(17, 18, 'FS'); -- Edit -> Retouch

-- Task Contributors
INSERT INTO task_contributors (task_id, user_id, role_name, estimated_hours, status) VALUES
(7, 3, 'Lead Editor', 12.00, 'not_started'),
(7, 7, 'Colorist', 4.00, 'not_started'),
(8, 7, 'Lead Colorist', 8.00, 'not_started'),
(9, 3, 'Sound Designer', 6.00, 'not_started');

-- Time Entries
INSERT INTO time_entries (task_id, user_id, date, hours, notes, is_billable, is_approved) VALUES
(1, 2, '2026-01-02', 2.00, 'Client kickoff meeting with marketing team', TRUE, TRUE),
(2, 2, '2026-01-03', 2.50, 'Initial brief documentation', TRUE, TRUE),
(2, 2, '2026-01-04', 1.50, 'Finalized creative brief', TRUE, TRUE),
(3, 1, '2026-01-06', 3.00, 'Script draft v1', TRUE, TRUE),
(3, 1, '2026-01-07', 2.50, 'Script revisions', TRUE, TRUE),
(3, 1, '2026-01-08', 2.50, 'Final script approved', TRUE, TRUE),
(4, 6, '2026-01-11', 3.00, 'Storyboard sketches', TRUE, FALSE),
(4, 6, '2026-01-12', 2.00, 'Storyboard refinements', TRUE, FALSE),
(12, 3, '2026-01-13', 4.00, 'CEO interview edit - first pass', TRUE, FALSE),
(15, 5, '2026-01-12', 6.00, 'Team photoshoot completed', TRUE, TRUE);

-- Badges
INSERT INTO badges (code, name, description, icon, category, criteria_type, criteria_value, xp_reward) VALUES
('first_blood', 'First Blood', 'Complete your first task', '🎯', 'milestone', 'tasks_completed', 1, 50),
('quick_draw', 'Quick Draw', 'Complete 25 tasks on the same day they were assigned', '⚡', 'skill', 'same_day_complete', 25, 100),
('pixel_perfect', 'Pixel Perfect', '10 designs approved first try', '🎨', 'skill', 'first_approval', 10, 150),
('frame_master', 'Frame Master', '50 video projects completed', '🎬', 'skill', 'video_projects', 50, 200),
('client_whisperer', 'Client Whisperer', '5 projects with excellent feedback', '💬', 'skill', 'excellent_feedback', 5, 150),
('early_bird', 'Early Bird', 'Log time before 9 AM for 10 days', '🌅', 'consistency', 'early_logs', 10, 75),
('week_warrior', 'Week Warrior', '7-day completion streak', '🔥', 'consistency', 'streak_days', 7, 100),
('month_master', 'Month Master', '30-day completion streak', '📅', 'consistency', 'streak_days', 30, 300),
('century_club', 'Century Club', 'Complete 100 tasks', '💯', 'milestone', 'tasks_completed', 100, 250),
('level_10', 'Level 10', 'Reach level 10', '⭐', 'milestone', 'level_reached', 10, 100),
('year_one', 'Year One', 'Active for 365 days', '🎂', 'milestone', 'days_active', 365, 500),
('night_owl', 'Night Owl', 'Delivered critical task overnight', '🦉', 'rare', 'overnight_delivery', 1, 150),
('firefighter', 'Firefighter', 'Saved a project from disaster', '🚒', 'rare', 'project_saved', 1, 200),
('mentor', 'Mentor', 'Helped onboard 3 new team members', '🎓', 'rare', 'mentored', 3, 175);

-- User Badges (some earned)
INSERT INTO user_badges (user_id, badge_id) VALUES
(3, 1), (3, 7), (3, 9),  -- Arun: first_blood, week_warrior, century_club
(4, 1), (4, 7),           -- Vikram: first_blood, week_warrior
(5, 1), (5, 3),           -- Neha: first_blood, pixel_perfect
(6, 1), (6, 3);           -- Raj: first_blood, pixel_perfect

-- XP Transactions (sample)
INSERT INTO xp_transactions (user_id, amount, reason, reference_type, reference_id) VALUES
(3, 50, 'Completed: Client Kickoff Meeting', 'task', 1),
(3, 30, 'Completed: Creative Brief Document', 'task', 2),
(3, 75, 'Week Warrior badge earned', 'badge', 7),
(4, 50, 'Completed first task', 'task', 5),
(5, 30, 'Completed: Team Photos Shoot', 'task', 15);

-- Notifications
INSERT INTO notifications (user_id, type, title, content, reference_type, reference_id, is_read) VALUES
(3, 'task_assigned', 'New Task Assigned', 'You have been assigned "Rough Cut - Hero Film"', 'task', 7, FALSE),
(4, 'task_unblocked', 'Task Unlocked', '"Hero Film Shoot Day 2" is now ready to start', 'task', 6, FALSE),
(7, 'task_assigned', 'New Task Assigned', 'You have been assigned "Color Grade - Hero Film"', 'task', 8, FALSE),
(5, 'task_due_soon', 'Task Due Soon', '"Cull - Team Photos" is due tomorrow', 'task', 16, TRUE),
(3, 'level_up', 'Level Up!', 'Congratulations! You reached Level 23', 'user', 3, TRUE);

-- Shoots (Production Calendar)
INSERT INTO shoots (project_id, title, shoot_date, call_time, end_time, location_name, location_address, notes, created_by) VALUES
(1, 'Hyundai Hero Film - Day 1', '2026-01-15', '06:00:00', '18:00:00', 'Hyundai Factory Floor', 'Plot 42, Industrial Area, Gurgaon, Haryana', 'Factory floor and assembly line sequences. Client contact: Rahul (9876XXXXXX)', 2),
(1, 'Hyundai Hero Film - Day 2', '2026-01-16', '07:00:00', '19:00:00', 'Driving Track', 'Buddh International Circuit, Greater Noida', 'Driving sequences and exterior shots', 2),
(2, 'PWC Office Shoot', '2026-01-20', '09:00:00', '17:00:00', 'PWC Office', 'Building 10, Cyber City, Gurgaon', 'CEO and CFO interviews, b-roll of office', 8);

-- Shoot Crew
INSERT INTO shoot_crew (shoot_id, user_id, role_name, call_time, status) VALUES
(1, 1, 'Director', '06:00:00', 'confirmed'),
(1, 4, 'DOP', '05:30:00', 'confirmed'),
(1, 3, 'Camera Assistant', '05:30:00', 'pending'),
(1, NULL, 'Sound Recordist', '06:00:00', 'confirmed'),
(2, 1, 'Director', '07:00:00', 'confirmed'),
(2, 4, 'DOP', '06:30:00', 'confirmed'),
(3, 4, 'Videographer', '09:00:00', 'confirmed'),
(3, 3, 'Editor (On-site)', '09:00:00', 'pending');

-- Update external crew
UPDATE shoot_crew SET external_name = 'Suresh Kumar', external_phone = '+919998887776' WHERE id = 4;

-- Shoot Equipment
INSERT INTO shoot_equipment (shoot_id, equipment_name, quantity, notes) VALUES
(1, 'Sony FX6', 2, 'Main cameras'),
(1, 'DJI RS3 Pro Gimbal', 1, NULL),
(1, 'Aputure 600D', 3, 'Key lights'),
(1, 'Wireless Lav Kit', 2, NULL),
(2, 'Sony FX6', 2, NULL),
(2, 'Drone - DJI Mavic 3', 1, 'For aerial shots'),
(2, 'Car Mount Rig', 1, 'For driving shots'),
(3, 'Sony FX3', 1, 'Compact setup for interviews'),
(3, 'LED Panel', 2, 'Interview lighting');

-- Review Portals (sample)
INSERT INTO review_portals (task_id, unique_token, is_active, allow_download, created_by) VALUES
(7, 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz', TRUE, FALSE, 2);

-- Review Versions
INSERT INTO review_versions (portal_id, version_number, file_path, file_type, notes, status, uploaded_by) VALUES
(1, 1, '/uploads/reviews/hyundai-rough-cut-v1.mp4', 'video/mp4', 'Initial rough cut assembly', 'revision_requested', 3),
(1, 2, '/uploads/reviews/hyundai-rough-cut-v2.mp4', 'video/mp4', 'Addressed pacing feedback', 'pending', 3);

-- Review Comments
INSERT INTO review_comments (version_id, client_name, client_email, content, timestamp_ms, is_resolved) VALUES
(1, 'Rahul Sharma', 'rahul@hyundai.com', 'Can we make the logo bigger at the end?', 58000, TRUE),
(1, 'Rahul Sharma', 'rahul@hyundai.com', 'The pacing feels a bit slow in this section', 23000, TRUE),
(2, 'Rahul Sharma', 'rahul@hyundai.com', 'Much better! Just one small tweak on the color here', 45000, FALSE);

-- Activity Log (sample entries)
INSERT INTO activity_log (user_id, action, entity_type, entity_id, new_value, ip_address) VALUES
(1, 'create', 'project', 1, '{"name": "Hyundai Q1 Brand Campaign"}', '192.168.1.1'),
(2, 'create', 'task', 1, '{"title": "Client Kickoff Meeting"}', '192.168.1.2'),
(2, 'update', 'task', 1, '{"status": "complete"}', '192.168.1.2'),
(3, 'create', 'time_entry', 1, '{"hours": 2.00, "task_id": 1}', '192.168.1.3');

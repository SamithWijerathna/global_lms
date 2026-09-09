-- Clean Tenant Database Schema for CloudWave LMS
-- Contains DDL for all LMS tenant tables without sample/dummy data

CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL UNIQUE,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `user_email` varchar(191) NOT NULL UNIQUE,
  `user_password` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'admin',
  `permission_id` int DEFAULT 1,
  `theme_preference` varchar(50) DEFAULT 'light',
  `profile_photo` varchar(255) DEFAULT NULL,
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bank_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL UNIQUE,
  `bank_name` varchar(100) NOT NULL,
  `account_name` varchar(150) NOT NULL,
  `account_number` varchar(50) NOT NULL,
  `branch_name` varchar(100) DEFAULT NULL,
  `account_type` varchar(50) DEFAULT 'savings',
  `instructions` text DEFAULT NULL,
  `qr_image_url` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `display_order` int DEFAULT 0,
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_code` varchar(50) NOT NULL UNIQUE,
  `batch_name` varchar(150) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `class_list` (
  `id` int NOT NULL AUTO_INCREMENT,
  `class_id` varchar(50) DEFAULT NULL UNIQUE,
  `class_title` varchar(150) DEFAULT NULL,
  `class_description` text DEFAULT NULL,
  `class_price` varchar(50) DEFAULT NULL,
  `class_type` varchar(50) DEFAULT NULL,
  `renew_type` varchar(50) DEFAULT NULL,
  `batch` varchar(50) DEFAULT NULL,
  `class_code` varchar(50) DEFAULT NULL,
  `class_imageurl` varchar(255) DEFAULT NULL,
  `display_order` int DEFAULT 0,
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `class_material_list` (
  `id` int NOT NULL AUTO_INCREMENT,
  `material_id` varchar(50) DEFAULT NULL,
  `material_description` text DEFAULT NULL,
  `material_imageurl` text DEFAULT NULL,
  `material_title` varchar(255) DEFAULT NULL,
  `material_type` varchar(50) DEFAULT NULL,
  `material_video_url` text DEFAULT NULL,
  `material_pdf_url` text DEFAULT NULL,
  `material_link` text DEFAULT NULL,
  `class_id` varchar(50) DEFAULT NULL,
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `downloadable` varchar(50) DEFAULT NULL,
  `view_count_enabled` tinyint DEFAULT '0',
  `view_limit` int DEFAULT NULL,
  `expire_hours` varchar(20) DEFAULT NULL,
  `display_order` int DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `class_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type_code` varchar(50) NOT NULL UNIQUE,
  `type_name` varchar(150) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `email_otps` (
  `email` varchar(255) NOT NULL,
  `otp` varchar(6) NOT NULL,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `token` varchar(6) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_uuid` varchar(255) DEFAULT NULL,
  `student_uuid` varchar(255) DEFAULT NULL,
  `amount` int DEFAULT NULL,
  `item_type` varchar(50) DEFAULT NULL,
  `item_id` varchar(50) DEFAULT NULL,
  `bank` varchar(50) DEFAULT NULL,
  `transaction_proof` varchar(250) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) DEFAULT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quiz_list` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quiz_id` varchar(20) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `batch` varchar(20) NOT NULL,
  `expire_date` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quiz_id` (`quiz_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quiz_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quiz_id` varchar(20) NOT NULL,
  `question_text` text NOT NULL,
  `options` json NOT NULL,
  `correct_answer` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `quiz_id` (`quiz_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quizzes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL UNIQUE,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `is_timed` tinyint(1) DEFAULT '1',
  `default_duration` int DEFAULT '30',
  `allow_toggle_timing` tinyint(1) DEFAULT '1',
  `min_duration` int DEFAULT '10',
  `max_duration` int DEFAULT '60',
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL UNIQUE,
  `quiz_uuid` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL,
  `question_text` text NOT NULL,
  `explanation` text DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `points` double DEFAULT '5',
  `positive_points` double DEFAULT '1',
  `negative_points` double DEFAULT '1',
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_quiz_uuid` (`quiz_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `question_options` (
  `id` int NOT NULL AUTO_INCREMENT,
  `question_uuid` varchar(255) NOT NULL,
  `letter` varchar(10) NOT NULL,
  `text` text,
  `image_url` varchar(255) DEFAULT NULL,
  `is_correct` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_question_uuid` (`question_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `question_statements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `question_uuid` varchar(255) NOT NULL,
  `index` int NOT NULL,
  `text` text,
  `is_correct` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_question_uuid` (`question_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quiz_attempts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL UNIQUE,
  `quiz_uuid` varchar(255) NOT NULL,
  `student_uuid` varchar(255) NOT NULL,
  `score` double NOT NULL DEFAULT '0',
  `total_points` double NOT NULL DEFAULT '0',
  `total_possible` double NOT NULL DEFAULT '0',
  `time_taken` int DEFAULT NULL,
  `answers_json` longtext DEFAULT NULL,
  `answers` longtext DEFAULT NULL,
  `completed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_student_quiz` (`student_uuid`, `quiz_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `student_quiz_attempts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_uuid` varchar(150) NOT NULL,
  `quiz_id` varchar(20) NOT NULL,
  `answers` json NOT NULL,
  `score` decimal(5,2) NOT NULL,
  `attempted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_attempt` (`student_uuid`,`quiz_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `students_marks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_uuid` varchar(150) DEFAULT NULL,
  `paper_id` varchar(50) DEFAULT NULL,
  `mark_a` double DEFAULT NULL,
  `mark_b` double DEFAULT NULL,
  `update_at` date DEFAULT NULL,
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `studypack_list` (
  `id` int NOT NULL AUTO_INCREMENT,
  `studypack_id` varchar(50) DEFAULT NULL,
  `studypack_description` varchar(150) DEFAULT NULL,
  `studypack_imageurl` varchar(150) DEFAULT NULL,
  `studypack_title` varchar(150) DEFAULT NULL,
  `studypack_type` varchar(50) DEFAULT NULL,
  `studypack_code` varchar(50) DEFAULT NULL,
  `batch` varchar(50) DEFAULT NULL,
  `price` int DEFAULT NULL,
  `display_order` int DEFAULT 0,
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `studypack_material_list` (
  `id` int NOT NULL AUTO_INCREMENT,
  `material_id` varchar(50) DEFAULT NULL,
  `material_description` text DEFAULT NULL,
  `material_title` varchar(255) DEFAULT NULL,
  `material_imageurl` text DEFAULT NULL,
  `material_type` varchar(50) DEFAULT NULL,
  `material_video_url` text DEFAULT NULL,
  `material_pdf_url` text DEFAULT NULL,
  `material_link` text DEFAULT NULL,
  `studypack_id` varchar(50) DEFAULT NULL,
  `display_order` int DEFAULT 0,
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `paper_predefine` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paper_id` varchar(50) DEFAULT NULL,
  `paper_name` varchar(255) NOT NULL,
  `paper_cover_image` varchar(255) DEFAULT NULL,
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key` varchar(100) NOT NULL PRIMARY KEY,
  `setting_value` text NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_last_login` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_uuid` varchar(100) NOT NULL,
  `device_name` varchar(255) DEFAULT NULL,
  `ip_address` varchar(100) DEFAULT NULL,
  `last_login` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_uuid` (`user_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(150) DEFAULT NULL,
  `student_id` varchar(150) DEFAULT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `user_email` varchar(150) DEFAULT NULL,
  `user_address` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `birthday` date DEFAULT NULL,
  `id_number` varchar(20) DEFAULT NULL,
  `batch` varchar(20) DEFAULT NULL,
  `user_password` varchar(255) DEFAULT NULL,
  `gid` varchar(150) DEFAULT NULL,
  `profile_url` varchar(255) DEFAULT NULL,
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `setup_token` varchar(36) DEFAULT NULL,
  `token_expiry` datetime DEFAULT NULL,
  `profile_completed` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_uuid` (`uuid`),
  UNIQUE KEY `idx_users_email` (`user_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `video_views` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_uuid` varchar(36) NOT NULL,
  `material_id` varchar(255) NOT NULL,
  `view_count` int DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_material` (`user_uuid`,`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Essential System Lookups (Permissions & Class Types)

INSERT INTO `permission` (`id`, `role_name`, `data`) VALUES
(1, 'developer', '{\"class\": 15, \"config\": 15, \"student\": 15, \"studypack\": 15}'),
(2, 'admin', '{\"class\": 15, \"config\": 15, \"student\": 15, \"studypack\": 15}'),
(3, 'teacher', '{\"class\": 15, \"config\": 0, \"student\": 7, \"studypack\": 7}'),
(4, 'accountant', '{\"class\": 0, \"config\": 0, \"student\": 7, \"studypack\": 0}')
ON DUPLICATE KEY UPDATE `role_name` = VALUES(`role_name`), `data` = VALUES(`data`);

INSERT INTO `class_types` (`type_code`, `type_name`, `description`) VALUES
('theory', 'Theory', 'Theory Class'),
('revision', 'Revision', 'Revision Class'),
('physical', 'Paper', 'Paper Class'),
('revision+paper', 'Revision + Paper', 'Combined Revision & Paper Class'),
('other', 'Other', 'Other Special Class')
ON DUPLICATE KEY UPDATE `type_name` = VALUES(`type_name`), `description` = VALUES(`description`);

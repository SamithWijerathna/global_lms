CREATE DATABASE IF NOT EXISTS `cloudwave_lms`;
USE `cloudwave_lms`;
-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Dec 27, 2025 at 04:02 PM
-- Server version: 9.1.0
-- PHP Version: 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `cloudwave_lms`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_users`
--

DROP TABLE IF EXISTS `admin_users`;
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) DEFAULT NULL,
  `first_name` varchar(150) NOT NULL,
  `last_name` varchar(150) NOT NULL,
  `user_email` varchar(150) NOT NULL,
  `user_password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  `permission_id` int DEFAULT NULL,
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `admin_users`
--

INSERT INTO `admin_users` (`id`, `uuid`, `first_name`, `last_name`, `user_email`, `user_password`, `role`, `permission_id`, `create_at`) VALUES
(2, '1b9d30f8-898d-46f0-b218-9dcbfbc2c3f6', 'Samith', 'Wijerathna', '0wsamithaw0@gmail.com', '$2b$10$1k1e93QirRWApUjcqA7bY.g2rpVvIu12Ks9MAjYeqKoMAbLr2Gvy.', 'developer', 2, '2025-10-05 08:23:28'),
(3, 'd8843282-3d06-4dc4-ad2f-5449332a3bd5', 'Sachin', 'Tharuka', 'sachintharuka2004@gmail.com', '$2b$10$zIani2VaDt5guj1Ztrs5wOlBYvfbD/b.JztXgNrBvt2NEZ6PXm6di', 'admin', 2, '2025-11-02 04:36:53');

-- --------------------------------------------------------

--
-- Table structure for table `class_list`
--

DROP TABLE IF EXISTS `class_list`;
CREATE TABLE IF NOT EXISTS `class_list` (
  `id` int NOT NULL AUTO_INCREMENT,
  `class_id` varchar(150) DEFAULT NULL,
  `class_description` varchar(150) DEFAULT NULL,
  `class_imageurl` varchar(150) DEFAULT NULL,
  `class_title` varchar(150) DEFAULT NULL,
  `class_price` int DEFAULT NULL,
  `class_type` varchar(50) DEFAULT NULL,
  `renew_type` varchar(50) DEFAULT NULL,
  `class_code` varchar(50) DEFAULT NULL,
  `batch` varchar(50) DEFAULT NULL,
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `class_list`
--

INSERT INTO `class_list` (`id`, `class_id`, `class_description`, `class_imageurl`, `class_title`, `class_price`, `class_type`, `renew_type`, `class_code`, `batch`, `create_at`) VALUES
(9, 'CL0009', 'November Class', '/uploads/CL0009.png', '2026 REVISION ONLY', 3500, 'theory', '30days', 'R01', '2026AL', '2025-12-22 18:09:34'),
(10, 'CL0010', 'Get a discount of 1500 by joining both paper and revision', '/uploads/classes/CL0010.png', '2026 REVISION + PAPERDR', 5500, 'revision+paper', '30days', '', '2026AL', '2025-12-23 21:14:14');

-- --------------------------------------------------------

--
-- Table structure for table `class_material_list`
--

DROP TABLE IF EXISTS `class_material_list`;
CREATE TABLE IF NOT EXISTS `class_material_list` (
  `id` int NOT NULL AUTO_INCREMENT,
  `material_id` varchar(50) DEFAULT NULL,
  `material_description` varchar(150) DEFAULT NULL,
  `material_imageurl` varchar(150) DEFAULT NULL,
  `material_title` varchar(150) DEFAULT NULL,
  `material_type` varchar(150) DEFAULT NULL,
  `material_video_url` varchar(150) DEFAULT NULL,
  `material_pdf_url` varchar(150) DEFAULT NULL,
  `material_link` varchar(150) DEFAULT NULL,
  `class_id` varchar(50) DEFAULT NULL,
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `downloadable` varchar(50) DEFAULT NULL,
  `view_count_enabled` tinyint DEFAULT '0',
  `view_limit` int DEFAULT NULL,
  `expire_hours` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `class_material_list`
--

INSERT INTO `class_material_list` (`id`, `material_id`, `material_description`, `material_imageurl`, `material_title`, `material_type`, `material_video_url`, `material_pdf_url`, `material_link`, `class_id`, `create_at`, `downloadable`, `view_count_enabled`, `view_limit`, `expire_hours`) VALUES
(19, 'MTMJJGSAN3', 'Chapter 1 -Introduction ', '/uploads/materials/MTMJJGSAMU.png', 'Chapter 1 -Introduction Description', 'video', '/uploads/materials/MTMJJGSAN3_video.mp4', NULL, NULL, 'CL0009', '2025-12-26 12:10:53', '0', 1, 10, '51'),
(20, 'MTMJJGSAN3', 'Chapter 1 -Introduction ', '/uploads/materials/MTMJJGSAMU.png', 'Chapter 1 -Introduction Description', 'video', '/uploads/materials/MTMJJGSAN3_video.mp4', NULL, NULL, 'CL0010', '2025-12-26 12:10:53', '0', 1, 10, '51');

-- --------------------------------------------------------

--
-- Table structure for table `email_otps`
--

DROP TABLE IF EXISTS `email_otps`;
CREATE TABLE IF NOT EXISTS `email_otps` (
  `email` varchar(255) NOT NULL,
  `otp` varchar(6) NOT NULL,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `email_otps`
--

INSERT INTO `email_otps` (`email`, `otp`, `expires_at`) VALUES
('antoniogomezJe@gmail.com', '375126', '2025-11-08 21:05:10'),
('haridaran.vk@icloud.com', '176753', '2025-11-08 13:12:39'),
('inzamamulhaq96130@gmail.com', '107800', '2025-11-04 15:35:45'),
('maryamraashid123@gmail.com', '130940', '2025-11-03 12:49:00'),
('naleemzz077@gmail.com', '878354', '2025-11-04 12:26:18'),
('rchem.Haridaran@gmail.com', '228570', '2025-11-08 13:09:10'),
('rinazmansoor981@gmail.com', '653137', '2025-11-02 16:34:55'),
('sanasfathimasaadiya14@gmail.com', '812624', '2025-11-02 09:04:25');

-- --------------------------------------------------------

--
-- Table structure for table `paper_predefine`
--

DROP TABLE IF EXISTS `paper_predefine`;
CREATE TABLE IF NOT EXISTS `paper_predefine` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paper_id` varchar(50) DEFAULT NULL,
  `paper_name` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `paper_predefine`
--

INSERT INTO `paper_predefine` (`id`, `paper_id`, `paper_name`) VALUES
(3, 'PP_0003', 'MAIN EXAM 01'),
(4, 'PP_0004', 'Test-dont-remove');

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

DROP TABLE IF EXISTS `password_resets`;
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `token` varchar(6) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
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
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`id`, `payment_uuid`, `student_uuid`, `amount`, `item_type`, `item_id`, `bank`, `transaction_proof`, `status`, `approved_at`, `created_at`) VALUES
(9, 'cebfb8f4-281f-458b-b3c1-bf8b0c2c5ba9', '6bcdbbc3-4b57-44b4-aa90-a681fbe0379e', 3500, 'class', 'CL0007', 'commercial', 'uploads/receipts/cebfb8f4-281f-458b-b3c1-bf8b0c2c5ba9.jpg', 'approved', '2025-11-02 06:08:41', '2025-11-02 06:08:16'),
(10, '622c8cf2-1d27-4c79-80f6-f1a53cd83576', 'fa07de75-6c18-47d1-ad64-84179b7cecf5', 3500, 'class', 'CL0007', 'commercial', 'uploads/receipts/622c8cf2-1d27-4c79-80f6-f1a53cd83576.jpg', 'approved', '2025-11-02 16:57:40', '2025-11-02 15:40:46'),
(11, '7881b79b-fd49-4374-82cc-93bdfa3f1b96', '141eae13-304c-4431-81ff-bbce2ded88b3', 3500, 'class', 'CL0007', 'commercial', 'uploads/receipts/7881b79b-fd49-4374-82cc-93bdfa3f1b96.png', 'approved', '2025-11-02 16:57:43', '2025-11-02 16:41:24'),
(12, '9244c222-c84a-4a83-805c-93d987d3f0cc', '0c72713e-34b4-4a6f-bd13-6b8e0139a278', 3500, 'class', 'CL0007', 'commercial', 'uploads/receipts/9244c222-c84a-4a83-805c-93d987d3f0cc.jpg', 'approved', '2025-11-04 17:23:12', '2025-11-04 06:55:20'),
(13, 'e45332ee-c71b-4f3e-8c9c-eaceac099eca', '471213a5-ff99-472f-887b-4de172cf8cdf', 3500, 'class', 'CL0007', 'commercial', 'uploads/receipts/e45332ee-c71b-4f3e-8c9c-eaceac099eca.jpg', 'approved', '2025-11-05 17:44:37', '2025-11-05 02:42:49'),
(14, '61b54935-6838-4c2d-b02e-3bf84ba34875', '28c131a9-b19c-4241-a333-f05987fc404b', 3500, 'class', 'CL0007', 'commercial', 'uploads/receipts/61b54935-6838-4c2d-b02e-3bf84ba34875.pdf', 'approved', '2025-11-05 17:44:39', '2025-11-05 07:56:05'),
(15, 'a552de41-e73c-4eb0-8ff5-ed79ca5509e3', '3b532ee2-ae39-4b54-87b9-81ceb7ccc438', 3500, 'class', 'CL0007', 'commercial', 'uploads/receipts/a552de41-e73c-4eb0-8ff5-ed79ca5509e3.jpg', 'approved', '2025-11-05 17:44:41', '2025-11-05 10:22:31'),
(16, '843e579e-b0be-49f5-bc17-ae29758a03f0', '3b532ee2-ae39-4b54-87b9-81ceb7ccc438', 3500, 'class', 'CL0007', 'commercial', 'uploads/receipts/843e579e-b0be-49f5-bc17-ae29758a03f0.jpg', 'approved', '2025-11-05 17:44:42', '2025-11-05 10:23:19'),
(18, '4c2ceaf9-0e34-42b1-b938-26a226321c48', '471213a5-ff99-472f-887b-4de172cf8cdf', 3500, 'class', 'CL0008', 'commercial', 'uploads/receipts/4c2ceaf9-0e34-42b1-b938-26a226321c48.jpg', 'reject', '2025-11-08 11:03:37', '2025-11-08 07:40:06'),
(19, '178d50cd-4ece-4928-9339-1295471efccc', '471213a5-ff99-472f-887b-4de172cf8cdf', 3500, 'class', 'CL0008', 'commercial', 'uploads/receipts/178d50cd-4ece-4928-9339-1295471efccc.jpg', 'reject', '2025-11-08 11:08:25', '2025-11-08 07:42:22'),
(20, 'a134da6a-a05d-4bb6-a698-15d2f49e6d60', '4915ac8e-6fbf-4e3b-ba57-f9a819b29788', 3500, 'class', 'CL0007', 'commercial', 'uploads/receipts/a134da6a-a05d-4bb6-a698-15d2f49e6d60.jpg', 'approved', '2025-11-08 16:41:34', '2025-11-08 15:57:30'),
(21, 'f07ddb94-da70-4add-b136-c0ef0721c84b', '4915ac8e-6fbf-4e3b-ba57-f9a819b29788', 3500, 'class', 'CL0007', 'commercial', 'uploads/receipts/f07ddb94-da70-4add-b136-c0ef0721c84b.jpg', 'reject', '2025-11-08 16:41:58', '2025-11-08 16:06:51'),
(22, '68b13c8d-401d-495f-9b16-177f443bc737', '4915ac8e-6fbf-4e3b-ba57-f9a819b29788', 3500, 'class', 'CL0007', 'commercial', 'uploads/receipts/68b13c8d-401d-495f-9b16-177f443bc737.jpg', 'reject', '2025-11-08 16:41:38', '2025-11-08 16:29:43'),
(23, 'd00861c0-35a0-47cf-bd01-85fe95fd1075', '4915ac8e-6fbf-4e3b-ba57-f9a819b29788', 3500, 'class', 'CL0007', 'commercial', 'uploads/receipts/d00861c0-35a0-47cf-bd01-85fe95fd1075.jpg', 'reject', '2025-11-08 16:41:40', '2025-11-08 16:32:27'),
(24, '31a66d39-2509-436e-b7f0-4641d9977ab8', '09d38ff7-eead-4495-932b-5368422e98f8', 3500, 'class', 'CL0007', 'commercial', 'uploads/receipts/31a66d39-2509-436e-b7f0-4641d9977ab8.png', 'approved', '2025-11-12 18:30:20', '2025-11-12 18:17:52'),
(25, '5f63af4d-4eca-42de-b85a-eac5682fbbf3', '3a513c4c-a9bc-494b-93dc-b8a35184b9a3', 3500, 'class', 'CL0007', 'commercial', 'uploads/receipts/5f63af4d-4eca-42de-b85a-eac5682fbbf3.png', 'approved', '2025-11-28 04:25:27', '2025-11-28 04:16:04'),
(26, 'fd198a21-bdf4-4c5f-9c66-5fb628b40b1a', '3a513c4c-a9bc-494b-93dc-b8a35184b9a3', 3500, 'class', 'CL0008', 'commercial', 'uploads/receipts/fd198a21-bdf4-4c5f-9c66-5fb628b40b1a.jpg', 'reject', '2025-12-06 15:46:37', '2025-12-06 15:16:30'),
(27, 'c88fd5a4-39ae-49db-a038-d96571b02281', '3a513c4c-a9bc-494b-93dc-b8a35184b9a3', 3500, 'class', 'CL0008', 'commercial', 'uploads/receipts/c88fd5a4-39ae-49db-a038-d96571b02281.jpg', 'approved', '2025-12-18 04:34:35', '2025-12-18 04:34:14');

-- --------------------------------------------------------

--
-- Table structure for table `permission`
--

DROP TABLE IF EXISTS `permission`;
CREATE TABLE IF NOT EXISTS `permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) DEFAULT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`id`)
) ;

--
-- Dumping data for table `permission`
--

INSERT INTO `permission` (`id`, `role_name`, `data`) VALUES
(1, 'developer', '{\"class\": 7, \"config\": 15, \"student\": 15, \"studypack\": 15}'),
(2, 'admin', '{\"class\": 15, \"config\": 15, \"student\": 15, \"studypack\": 15}');

-- --------------------------------------------------------

--
-- Table structure for table `quiz_list`
--

DROP TABLE IF EXISTS `quiz_list`;
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
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quiz_questions`
--

DROP TABLE IF EXISTS `quiz_questions`;
CREATE TABLE IF NOT EXISTS `quiz_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quiz_id` varchar(20) NOT NULL,
  `question_text` text NOT NULL,
  `options` json NOT NULL,
  `correct_answer` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `quiz_id` (`quiz_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `students_marks`
--

DROP TABLE IF EXISTS `students_marks`;
CREATE TABLE IF NOT EXISTS `students_marks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_uuid` varchar(150) DEFAULT NULL,
  `paper_id` varchar(50) DEFAULT NULL,
  `mark_a` double DEFAULT NULL,
  `mark_b` double DEFAULT NULL,
  `update_at` date DEFAULT NULL,
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `students_marks`
--

INSERT INTO `students_marks` (`id`, `student_uuid`, `paper_id`, `mark_a`, `mark_b`, `update_at`, `create_at`) VALUES
(1, '471213a5-ff99-472f-887b-4de172cf8cdf', 'PP_0003', 24, 27, NULL, '2025-11-08 13:51:43'),
(2, '09d38ff7-eead-4495-932b-5368422e98f8', 'PP_0003', 15, 11, NULL, '2025-11-08 13:57:46'),
(3, '6bcdbbc3-4b57-44b4-aa90-a681fbe0379e', 'PP_0003', 1, 1, NULL, '2025-11-08 13:58:37'),
(4, '59380df4-1249-46c4-8ec9-418820bfe34f', 'PP_0003', 9, 19, NULL, '2025-11-08 13:59:32'),
(5, '367a8148-ec37-4858-841b-41652ab24d1a', 'PP_0003', 18, 2, NULL, '2025-11-08 14:00:05'),
(6, '141eae13-304c-4431-81ff-bbce2ded88b3', 'PP_0003', 18, 34, NULL, '2025-11-08 14:12:18'),
(7, '0c72713e-34b4-4a6f-bd13-6b8e0139a278', 'PP_0003', 21, 23, NULL, '2025-11-08 14:16:53'),
(8, 'fa07de75-6c18-47d1-ad64-84179b7cecf5', 'PP_0003', 27, 25, NULL, '2025-11-08 14:20:29'),
(9, '3b532ee2-ae39-4b54-87b9-81ceb7ccc438', 'PP_0003', 18, 11, NULL, '2025-11-08 14:25:59');

-- --------------------------------------------------------

--
-- Table structure for table `student_quiz_attempts`
--

DROP TABLE IF EXISTS `student_quiz_attempts`;
CREATE TABLE IF NOT EXISTS `student_quiz_attempts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_uuid` varchar(150) NOT NULL,
  `quiz_id` varchar(20) NOT NULL,
  `answers` json NOT NULL,
  `score` decimal(5,2) NOT NULL,
  `attempted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_attempt` (`student_uuid`,`quiz_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `studypack_list`
--

DROP TABLE IF EXISTS `studypack_list`;
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
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `studypack_list`
--

INSERT INTO `studypack_list` (`id`, `studypack_id`, `studypack_description`, `studypack_imageurl`, `studypack_title`, `studypack_type`, `studypack_code`, `batch`, `price`, `create_at`) VALUES
(3, 'ST_0001', 'dfgdfg', NULL, 'gdfg', 'paper', '2sfsdf', NULL, 234234, '2025-11-28 07:03:56');

-- --------------------------------------------------------

--
-- Table structure for table `studypack_material_list`
--

DROP TABLE IF EXISTS `studypack_material_list`;
CREATE TABLE IF NOT EXISTS `studypack_material_list` (
  `id` int NOT NULL AUTO_INCREMENT,
  `material_id` varchar(50) DEFAULT NULL,
  `material_description` varchar(150) DEFAULT NULL,
  `material_title` varchar(150) DEFAULT NULL,
  `material_imageurl` varchar(150) DEFAULT NULL,
  `material_type` varchar(50) DEFAULT NULL,
  `material_video_url` varchar(150) DEFAULT NULL,
  `material_pdf_url` varchar(150) DEFAULT NULL,
  `material_link` varchar(150) DEFAULT NULL,
  `studypack_id` varchar(50) DEFAULT NULL,
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `uuid`, `student_id`, `first_name`, `last_name`, `user_email`, `user_address`, `phone`, `birthday`, `id_number`, `batch`, `user_password`, `gid`, `profile_url`, `create_at`, `setup_token`, `token_expiry`, `profile_completed`) VALUES
(11, '3a513c4c-a9bc-494b-93dc-b8a35184b9a3', 'SD0001', 'Samith', 'Wijerathna', '0wsamithaw0@gmail.com', 'No 205, kandy Road, kadugannawa.', '0714861117', '2004-05-12', '20041331785', '2027AL', '$2b$10$zcfOs0c95LpJhicM8C/JHuHhY7IwSh2MJo//NDLcXtgtJAV7MuvSa', NULL, '/uploads/profile/SD0001.jpg', '2025-11-02 06:06:46', NULL, NULL, 0),
(12, '6bcdbbc3-4b57-44b4-aa90-a681fbe0379e', 'SD0002', 'Tharuka', 'Rajapaksha', 'sachintharuka2004@gmail.com', 'Rajapaksha Niwasa Galkotuwa Doluwa Menikdiwela', '0773363347', '2004-05-19', '200414000328', '2027AL', '$2b$10$PlZJQZnvLCDpi4jmWS.6guhZVgKV3lYCV3S/2bpol8aaayeg60Gba', NULL, '/uploads/profile/SD0002.jpg', '2025-11-02 06:07:02', NULL, NULL, 0),
(13, '54b4c235-731b-4ca9-b90c-cb11af67eed2', 'SD0003', 'Damidu ', 'Herath ', 'damiduherath@gmail.com', 'Gotham ', '0777777777', '2025-11-02', '12w334445555555', '2027AL', '$2b$10$8gkG63KCvif.t4Te2UYgK.JMxuTU.pUmt3mWT.iUHN3jgcsAB.tey', NULL, NULL, '2025-11-02 06:07:50', NULL, NULL, 0),
(14, '5c956f67-c034-42ee-85cc-9439830909b4', 'SD0004', 'Minnah', 'Badurdeen ', 'fminnah4@gmail.com', '40,17/03, Metro Homes, Glenni street, Colombo 02', '0741817055', '2006-09-17', '200676103487', '2026AL', '$2b$10$Eo445Tby1RV/okSvvWHDbu3RxTcjgri.7GpFK/GRlpq7iYoejHX1e', NULL, NULL, '2025-11-02 08:22:48', NULL, NULL, 0),
(15, '0c72713e-34b4-4a6f-bd13-6b8e0139a278', 'SD0005', 'Samha ', 'Fairoos ', 'fsamha70@gmail.com', '58 /1 ajmeer road sarikkamulla panadura ', '0764141445', '2007-11-28', '200783304555', '2027AL', '$2b$10$TxVRWGRapQ8fk93OidUGQO.l4/sLIRBxBLP8L78Z984SzD.m5tR7.', NULL, NULL, '2025-11-02 10:40:23', NULL, NULL, 0),
(16, '28c131a9-b19c-4241-a333-f05987fc404b', 'SD0006', 'Thiviyadharshani', 'Gnanasegaran', 'thiviyadharshanignanasegeran@gmail.com', '77/9, pittakanda road ,kandy', '0740673331', '2008-10-14', '20087880398', '2027AL', '$2b$10$d9vLiEnNTzritOos7ABLOuZnaYjrSGyhDSsCOSIbQ2Tqz485nKXDK', NULL, '/uploads/profile/SD0006.jpg', '2025-11-02 13:53:58', NULL, NULL, 0),
(17, 'fa07de75-6c18-47d1-ad64-84179b7cecf5', 'SD0007', 'Vaishnavi ', 'Jegaruban ', 'jvaish16@gmail.com', 'B2/4 Govt Flats, Hospital Road, Dehiwala ', '0776196033', '2005-08-16', '200572903166', '2027AL', '$2b$10$4NnIb06BDFjQ9k5izkdfpuzwrkwYmW8CdmMjit5vWTD7uaqSKV3XW', NULL, NULL, '2025-11-02 15:34:50', NULL, NULL, 0),
(18, '141eae13-304c-4431-81ff-bbce2ded88b3', 'SD0008', 'fathima', 'Zahraa', 'fathimazahraa10@gmail.com', '99/3 palewella ,gampola', '0740644559', '2008-10-22', '200879604774', '2027AL', '$2b$10$XoIBKPtfj6OLaJ72UgyhKuKem1a840T/gJdDTqPMbW6OJ8TdBCWPm', NULL, NULL, '2025-11-02 16:35:48', NULL, NULL, 0),
(19, '367a8148-ec37-4858-841b-41652ab24d1a', 'SD0009', 'Rushdhi', 'Ramzy', 'rushdhiramzy@gmail.com', '17/Dehiyange,Muruthalawa', '0778071990', '2008-03-24', '200808403700', '2027AL', '$2b$10$qCHGDxzQirL8MAjFkOO0Mem3stbva5cOiJM2Utf7rdxqcB37VC7S6', NULL, NULL, '2025-11-02 16:45:26', NULL, NULL, 0),
(20, '3b532ee2-ae39-4b54-87b9-81ceb7ccc438', 'SD0010', 'Risindu ', 'Methsitha ', 'risindumethsitha3@gmail.com', '116/4 Mahawatta Road, Wewalduwa, Kelaniya', '0724067233', '2008-09-03', '200824704728', '2027AL', '$2b$10$TNo5eJsvxqADeroY1nw3ae3QxmNtex584FDv8DhqPvtUj.aIszX8O', NULL, NULL, '2025-11-02 18:34:46', NULL, NULL, 0),
(21, 'f35ddc2b-7f8d-45af-931d-7c6d3efb4a95', 'SD0011', 'Sajith', 'Siddique', 'sjthsiddique@gmail.com', 'Sammanthurai 03', '0766053611', '2007-11-10', '200731504125', '2027AL', '$2b$10$mfiGg1r2NvUHJGFs81ZbXeciCuSxkU2kp7T2b5xfbmp7Ctt7WvwqO', NULL, NULL, '2025-11-03 02:18:34', NULL, NULL, 0),
(22, '058f5a9b-e302-4414-a244-c4b256a9a0f6', 'SD0012', 'Salma', 'Isham', 'salmaisham028@gmail.com', '6/1, Galkandha Road, Hinguloya, Mawanella ', '0758069125', '2006-05-28', '200664901477', '2025AL', '$2b$10$eLxdzWQoTRP4LhqU4R1sGulByPpEGNYoZ.BmbfiuGED8B4X0fiQ4q', NULL, '/uploads/profile/SD0012.jpg', '2025-11-03 04:35:00', NULL, NULL, 0),
(23, '471213a5-ff99-472f-887b-4de172cf8cdf', 'SD0013', 'Shafa', 'Fawzy', 'mohamedfowsy9@gmail.com', '45/B rattota Road matale ', '0764252813', '2008-05-25', '200864601876', '2027AL', '$2b$10$WneOk2XYjqngx6a4uobQfuFfLCfcplZI0.t2.tXg63HMkNLqw8ofi', NULL, NULL, '2025-11-04 14:54:55', NULL, NULL, 0),
(24, '45e5baae-3a42-4226-8e35-7e1d27baed29', 'SD0014', 'Sandanaki ', 'Perera', 'sandanakiperera@gmail.com', '3/247,Walagama, Muruthalawa. ', '0779008167', '2005-05-30', '200565101151 ', '2026AL', '$2b$10$qSRRp/8kLn86nYGm3hhfRe1IZaLIIKfSqfXcSvndTmO9h2sNJtQsu', NULL, NULL, '2025-11-04 17:21:14', NULL, NULL, 0),
(25, '09d38ff7-eead-4495-932b-5368422e98f8', 'SD0015', 'Ifaza', 'Sulfer', 'drifazasulfer@gmail.com', 'Lucky Industries,Iriyagolla,Dehiowita', '0772414349', '2008-02-02', '200853303254', '2027AL', '$2b$10$.zmfgU5wS3aJWH5dC3YaXOkKay9qujtpoOV/mkZKJOG9GYDu8clWe', NULL, NULL, '2025-11-05 10:22:42', NULL, NULL, 0),
(27, '845c9a4c-038d-4447-9fc9-9d70243964b9', 'SD0016', 'Samith', 'Wijerathna', '0wsamithaw0@gmail.com', 'No 205, kandy Road, kadugannawa.', '0714861117', NULL, '200413301785', '2026AL', '$2b$10$Bz23mpSqX018d5U66/Rn2.7ZWNNfn7G.G9p.fyiVyIs1tF5cTRB2W', NULL, NULL, '2025-11-06 21:04:06', NULL, NULL, 1),
(28, '59380df4-1249-46c4-8ec9-418820bfe34f', 'SD0017', 'Ali', 'Nawas ', '123000.comm@gmail.com', '306/2 Matala road Akurana ', '0723945140', '2025-04-01', '200809203088', '2027AL', '$2b$10$8p3hDhfD1RG6KPRXU0E6DutzsQak6T2uACgNmMtiDERj0kXc9JgVa', NULL, NULL, '2025-11-08 07:36:19', NULL, NULL, 0),
(29, '4915ac8e-6fbf-4e3b-ba57-f9a819b29788', 'SD0018', 'Antanio ', 'Gomez', 'antaniogomez12@gmail.com', 'No 154,156 Colombo Rd,Hatton', '0718555980', '2025-12-01', '200833604195', '2027AL', '$2b$10$Uwy2qPa2U3bTfC/VjysfCeN4N2TrI2bh/SEAYesd5lf9MbBAbgaT.', NULL, '/uploads/profile/SD0018.jpg', '2025-11-08 15:31:11', NULL, NULL, 0),
(30, '1d44ec3c-38ad-463b-94b4-17910b22f4dd', 'SD0019', 'Haridaran ', 'Vk', 'vk286014@gmail.com', 'No.184/2 peradeniya road, Kandy', '0759232149', '2008-05-18', '20081045', '2027AL', '$2b$10$3nHUtKgzFHTNEuhuk7tL/OC/jnkk35z1VJUwjrAyLl6Mwfj6.3Cqq', NULL, '/uploads/profile/SD0019.jpg', '2025-11-08 16:51:39', NULL, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `user_last_login`
--

DROP TABLE IF EXISTS `user_last_login`;
CREATE TABLE IF NOT EXISTS `user_last_login` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_uuid` varchar(100) NOT NULL,
  `device_name` varchar(255) DEFAULT NULL,
  `ip_address` varchar(100) DEFAULT NULL,
  `last_login` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_uuid` (`user_uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `video_views`
--

DROP TABLE IF EXISTS `video_views`;
CREATE TABLE IF NOT EXISTS `video_views` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_uuid` varchar(36) NOT NULL,
  `material_id` varchar(255) NOT NULL,
  `view_count` int DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_material` (`user_uuid`,`material_id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `video_views`
--

INSERT INTO `video_views` (`id`, `user_uuid`, `material_id`, `view_count`, `updated_at`) VALUES
(7, '6bcdbbc3-4b57-44b4-aa90-a681fbe0379e', 'MT0004', 1, '2025-11-13 03:37:49'),
(8, '09d38ff7-eead-4495-932b-5368422e98f8', 'MT0004', 3, '2025-11-15 08:41:55'),
(10, 'fa07de75-6c18-47d1-ad64-84179b7cecf5', 'MT0004', 1, '2025-11-13 08:11:04'),
(11, '471213a5-ff99-472f-887b-4de172cf8cdf', 'MT0004', 3, '2025-11-14 10:14:36'),
(14, '3b532ee2-ae39-4b54-87b9-81ceb7ccc438', 'MT0004', 1, '2025-11-15 06:32:27'),
(16, '141eae13-304c-4431-81ff-bbce2ded88b3', 'MT0004', 1, '2025-11-15 12:43:19'),
(17, '0c72713e-34b4-4a6f-bd13-6b8e0139a278', 'MT0004', 1, '2025-11-16 04:59:23');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: May 14, 2026 at 09:58 AM
-- Server version: 8.0.45-0ubuntu0.24.04.1
-- PHP Version: 8.2.29

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `nodeProject`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` int NOT NULL,
  `userName` varchar(18) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `roleId` int DEFAULT NULL,
  `status` enum('active','inactive','deleted') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'active',
  `isDeleted` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `admins`
--
-- Master admin: single row with userName = 'admin' and roleId NULL (full access in app).
-- Sub-admins: any other userName with roleId -> roles / rolePermissions for module access.

INSERT INTO `admins` (`id`, `userName`, `password`, `email`, `phone`, `roleId`, `status`, `isDeleted`, `createdAt`, `updatedAt`) VALUES
(1, 'admin', '$2b$10$iNUIh5Qw250nCOZ0x5m63OFmOB9Ifoj/GKZbdoox3EFHjH3E.uNMC', 'vanshstudy13@gmail.com', '9876543210', NULL, 'active', 0, '2026-03-14 09:27:54', NULL),
(13, 'test', '$2b$10$rDEhj1hrWZGq7.2GZFO4fOlsbuywyB/nKrqK.WaQCjBsLAX2UrCQO', 'test@test.com', '1234567890', 7, 'active', 0, '2026-03-18 05:07:37', '2026-04-17 08:06:22'),
(14, 'test2', '$2b$10$MCTIX11EQMcmcXx3ExCK7.02nT1cSI3m/H8uXlpUdGoi2iumy9Y6u', 'test2@test.com', '1234567890', NULL, 'active', 0, '2026-03-18 05:09:34', NULL),
(15, 'test3', '$2b$10$WRhiEd2UAr2emei1CSo.QuILx35.XC.NhDALBMPdO9FRNNIImbPii', 'test3@test.com', '1234567890', NULL, 'active', 0, '2026-03-18 05:10:57', NULL),
(16, 'test4', '$2b$10$P1fsAnecfSbLMPJ1brIs8eG3q7Va5zXj09WWl6y6i/saA2LTHD5ZC', 'test4@test.com', '1234567890', NULL, 'active', 0, '2026-03-18 05:13:14', NULL),
(17, 'test5', '$2b$10$Mj.BB.FcIeop0av1NMoJq.20ZWln4WqPJy8WDrF4rGPR589A7qLoK', 'test5@test.com', '1234567890', NULL, 'active', 0, '2026-03-18 05:28:22', NULL),
(18, 'test6', '$2b$10$cqt9D1cFGe6WJG2.siyq5ORnEFOz7ReDNgGRLsxfTmh4pDnCTU0Wm', 'test6@test.com', '9879879870', NULL, 'active', 0, '2026-03-18 10:32:56', NULL),
(19, 'Vansh13', '$2b$10$ygUzLzgFV1X/KfH6Y1IcPuu6KHi90TSQbURMPMvI3EZrYyACXNKP2', 'vanshapa@gmail.com', '1234567890', 5, 'active', 0, '2026-03-19 05:31:45', '2026-04-15 14:34:13'),
(21, 'Vansh131', '$2b$10$ASfwVN5sUg2Hq3.cuFf5cufZbZAuH//H2mepXQwA5kZ0OI.lx6.Qe', 'vanshapalEdit@test.com', '9898989898', 7, 'deleted', 1, '2026-03-19 05:35:23', '2026-05-08 07:38:25'),
(22, 'test7', '$2b$10$H6kfLoogHc96RWFsn1CfuOgLw/vmnrT9uRgXVa5dZDEhNN5daOZLW', 'test7@test.com', '9898989898', NULL, 'active', 0, '2026-03-25 11:24:53', NULL),
(23, 'test8', '$2b$10$xfp5GCD7qxk.EB4xL8YzCu780Wet4T9/wU9w8G8X9dPm06iygA75G', 'test8@test.com', '6544566541', NULL, 'active', 0, '2026-03-25 11:52:08', NULL),
(24, 'subadmin1', '$2b$10$Ha4z.bIkmdr0O68VJOWkievXFzd43YdxlNs7blWp4a.p2HtaMqxxC', 'subadmin0903@gmail.com', '9499763087', NULL, 'active', 0, '2026-03-28 03:19:08', NULL),
(25, 'abc', '$2b$10$alzg.yRyNaLlpnKr4yvY2u6ge2gPNZvE/n3rP6lLfGl4EljoJsk.G', 'vanshapanchal2@gmail.com', '1234567890', 12, 'active', 0, '2026-04-04 03:39:34', '2026-05-02 03:09:21'),
(26, 'test10', '$2b$10$cfMQCQ1IT.9D.nVDuDYs8ePWZ3dRwjViOr/DUlsuNvZQHBAAyhih6', 'test10@test.com', '1231231313', NULL, 'active', 0, '2026-04-10 05:37:50', NULL),
(27, 'peter2', '$2b$10$2k4nc/9PN/hn9BvzzsSntOinU4TkKZj63KOAgWlEpCjjD7r.B3Tn6', 'peter2@test.com', '1231231313', 12, 'active', 0, '2026-04-11 06:15:14', '2026-05-02 03:35:06'),
(28, 'test13', '$2b$10$4EW.jFUXtEOOeUHGajB28ecHVcPGl5ISriv6kjzataHxyQ1O28FaK', 'test13@test.com', '1234567890', 5, 'active', 0, '2026-04-11 06:34:57', NULL),
(29, 'ps1', '$2b$10$nXg8rLxer2bQPVtnC6jg0udMyOWkYtEJZeXoHJY8kEGOONAo4zXxG', 'ps1@gmail.com', '1234567890', 10, 'active', 0, '2026-04-23 16:29:45', '2026-05-01 05:36:21'),
(30, 'peter3', '$2b$10$I3vCGQUvNsxRqBIeLShcoOzsOvQmP373VTTP0MDSP851kLs3RH27K', 'peter3@test.com', '1234567890', 10, 'active', 0, '2026-05-02 07:09:56', '2026-05-02 07:15:06'),
(31, 'vortex', '$2b$10$YE/PA5ke78wvpY33JPeWeupq1SjEg.kZPuhARvFFxB7hkJuzzDQGG', 'vortex@test.com', '1234567890', 10, 'active', 0, '2026-05-06 08:35:44', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `adminToken`
--

CREATE TABLE `adminToken` (
  `id` int NOT NULL,
  `adminId` int NOT NULL,
  `token` text NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `adminToken`
--

INSERT INTO `adminToken` (`id`, `adminId`, `token`, `createdAt`) VALUES
(411, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlck5hbWUiOiJhZG1pbiIsImVtYWlsIjoidmFuc2hzdHVkeTEzQGdtYWlsLmNvbSIsInBob25lIjoiOTg3NjU0MzIxMCIsInJvbGVJZCI6bnVsbCwicm9sZU5hbWUiOm51bGwsInBlcm1pc3Npb25zIjp7fSwicm9sZSI6Ik1BU1RFUl9BRE1JTiIsImlhdCI6MTc3ODc0MzczOSwiZXhwIjoxNzc4NzQ3MzM5fQ.E72QQzcANCU8OdXzvM25zvEimt7E3MjRTEbi_it9XsI', '2026-05-14 12:58:59');

-- --------------------------------------------------------

--
-- Table structure for table `modules`
--

CREATE TABLE `modules` (
  `id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `isDeleted` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `modules`
--

INSERT INTO `modules` (`id`, `name`, `status`, `isDeleted`, `createdAt`, `updatedAt`) VALUES
(6, 'User', 'active', 0, '2026-04-13 07:58:17', '2026-04-18 04:18:55'),
(9, 'tickets', 'active', 0, '2026-04-18 11:21:40', '2026-04-18 12:54:55');

-- --------------------------------------------------------

--
-- Table structure for table `notificationReads`
--

CREATE TABLE `notificationReads` (
  `notificationId` int NOT NULL,
  `userId` int NOT NULL,
  `readAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `notificationReads`
--

INSERT INTO `notificationReads` (`notificationId`, `userId`, `readAt`) VALUES
(1, 13, '2026-05-14 11:15:06'),
(1, 32, '2026-05-13 11:44:07'),
(1, 35, '2026-05-13 11:43:58'),
(2, 13, '2026-05-14 11:15:06'),
(2, 32, '2026-05-13 12:21:23'),
(2, 35, '2026-05-13 12:03:02');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `body` text NOT NULL,
  `sentBy` varchar(100) NOT NULL DEFAULT 'MasterAdmin',
  `sentAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `title`, `body`, `sentBy`, `sentAt`) VALUES
(1, 'Notification', 'Send a one-way announcement', 'admin', '2026-05-13 11:43:19'),
(2, 'Hii', 'What\'s up', 'admin', '2026-05-13 11:59:06'),
(4, 'Notification', 'all connected users', 'admin', '2026-05-14 13:00:25');

-- --------------------------------------------------------

--
-- Table structure for table `rolePermissions`
--

CREATE TABLE `rolePermissions` (
  `id` int NOT NULL,
  `roleId` int NOT NULL,
  `moduleId` int NOT NULL,
  `canView` tinyint(1) DEFAULT '0',
  `canAdd` tinyint(1) DEFAULT '0',
  `canEdit` tinyint(1) DEFAULT '0',
  `canDelete` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `rolePermissions`
--

INSERT INTO `rolePermissions` (`id`, `roleId`, `moduleId`, `canView`, `canAdd`, `canEdit`, `canDelete`) VALUES
(73, 9, 6, 1, 0, 0, 1),
(74, 8, 6, 1, 0, 1, 0),
(86, 5, 6, 1, 1, 1, 1),
(99, 7, 6, 1, 1, 0, 0),
(105, 12, 9, 1, 0, 1, 0),
(106, 10, 9, 1, 0, 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `isDeleted` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `description`, `status`, `isDeleted`, `createdAt`, `updatedAt`) VALUES
(5, 'userAll', 'user', 'active', 0, '2026-04-11 13:27:18', '2026-04-18 04:14:37'),
(7, 'userAdd', 'User - Add', 'active', 0, '2026-04-16 06:05:35', '2026-04-20 05:38:04'),
(8, 'userEdit', 'User - Edit', 'active', 0, '2026-04-17 08:05:04', '2026-04-17 08:05:42'),
(9, 'userDelete', 'User - Delete', 'active', 0, '2026-04-17 08:05:33', '2026-04-17 08:05:33'),
(10, 'ticket - view', 'ticket - view', 'active', 0, '2026-04-18 11:22:28', '2026-05-06 08:38:43'),
(12, 'ticket - edit', 'ticket - edit', 'active', 0, '2026-05-01 05:09:03', '2026-05-06 08:38:31');

-- --------------------------------------------------------

--
-- Table structure for table `ticketMessages`
--

CREATE TABLE `ticketMessages` (
  `id` int NOT NULL,
  `ticketId` int NOT NULL,
  `senderId` int NOT NULL,
  `senderType` varchar(50) NOT NULL,
  `message` text NOT NULL,
  `file` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `ticketMessages`
--

INSERT INTO `ticketMessages` (`id`, `ticketId`, `senderId`, `senderType`, `message`, `file`, `createdAt`) VALUES
(1, 1, 14, 'user', 'solved', 'uploads/tickets/1/messages/att_1776485103309_8914.png', '2026-04-18 04:05:03'),
(2, 2, 1, 'admin', 'Admin Reply', NULL, '2026-04-23 16:15:37'),
(3, 2, 32, 'user', 'Customer Reply to', NULL, '2026-04-23 16:16:34'),
(4, 2, 29, 'admin', 'hohoza', NULL, '2026-04-23 16:31:43'),
(5, 2, 32, 'user', 'User reply then save status : userReply\r\nUser reply then save status : userReply', NULL, '2026-04-28 04:13:56'),
(6, 2, 1, 'admin', 'Admin reply then save status : adminReply', NULL, '2026-04-28 04:14:41'),
(7, 2, 32, 'user', 'ok i will see', NULL, '2026-04-28 04:16:51'),
(8, 2, 1, 'admin', 'hiii', NULL, '2026-04-28 04:41:38'),
(9, 2, 32, 'user', 'hii', NULL, '2026-04-28 04:42:13'),
(10, 2, 1, 'admin', 'aaa', 'uploads/tickets/2/messages/att_1777351642487_16987.png', '2026-04-28 04:47:22'),
(11, 2, 32, 'user', 'jjjh', NULL, '2026-04-29 04:49:41'),
(12, 2, 1, 'admin', 'ohk', NULL, '2026-04-29 05:44:41'),
(13, 2, 32, 'user', 'User Reply', NULL, '2026-04-29 06:59:25'),
(14, 2, 1, 'admin', 'admin', NULL, '2026-04-30 04:39:39'),
(15, 2, 1, 'admin', 'ffgf', NULL, '2026-04-30 04:47:03'),
(16, 4, 32, 'user', 'Hii', NULL, '2026-04-30 05:39:49'),
(17, 3, 32, 'user', 'Hello Admin,\r\n   I have query, you can help me.', NULL, '2026-04-30 05:40:47'),
(18, 2, 32, 'user', 'just Test', NULL, '2026-04-30 05:41:12'),
(19, 4, 1, 'admin', 'Hii', NULL, '2026-04-30 05:41:47'),
(20, 3, 1, 'admin', 'Yes sure ask me.', NULL, '2026-04-30 05:42:13'),
(21, 2, 1, 'admin', 'ohk', NULL, '2026-04-30 05:42:35'),
(22, 3, 1, 'admin', 'Now', NULL, '2026-04-30 05:59:24'),
(23, 3, 32, 'user', 'ohk', NULL, '2026-04-30 06:00:25'),
(24, 4, 1, 'admin', 'ff', NULL, '2026-04-30 06:03:35'),
(25, 4, 1, 'admin', 'Soo', NULL, '2026-04-30 06:04:06'),
(26, 4, 32, 'user', 'hii ohk', NULL, '2026-04-30 06:14:51'),
(27, 3, 1, 'admin', 'hii', NULL, '2026-04-30 11:39:01'),
(28, 4, 1, 'admin', 'hii', NULL, '2026-04-30 11:39:10'),
(29, 3, 29, 'admin', 'ohk', NULL, '2026-05-01 05:11:26'),
(30, 4, 29, 'admin', 'ggg', NULL, '2026-05-01 05:35:47'),
(31, 3, 32, 'user', 'gfjg', NULL, '2026-05-02 07:29:22'),
(32, 3, 1, 'admin', 'hii', NULL, '2026-05-02 07:29:41'),
(33, 3, 1, 'admin', 'bnbn', NULL, '2026-05-02 07:30:09'),
(34, 3, 1, 'admin', 'thank you', NULL, '2026-05-02 07:31:39'),
(35, 4, 32, 'user', 'hii', NULL, '2026-05-03 06:29:58'),
(36, 4, 1, 'admin', 'I received your message', NULL, '2026-05-03 06:30:56'),
(37, 4, 32, 'user', 'ohk', NULL, '2026-05-03 06:36:08'),
(38, 4, 1, 'admin', 'send me', NULL, '2026-05-03 06:36:35'),
(39, 4, 32, 'user', 'i will ended', NULL, '2026-05-04 11:48:36'),
(40, 4, 1, 'admin', 'ok i will close', NULL, '2026-05-04 11:49:15'),
(41, 4, 32, 'user', 'gjg', NULL, '2026-05-05 04:52:56'),
(42, 4, 32, 'user', 'hii', NULL, '2026-05-06 05:46:42'),
(43, 4, 1, 'admin', 'hii', NULL, '2026-05-06 05:47:13'),
(44, 6, 38, 'user', 'Still facing the issue', NULL, '2026-05-08 06:21:41'),
(45, 7, 1, 'admin', 'hii', NULL, '2026-05-10 06:57:02'),
(46, 7, 1, 'admin', 'hoo', NULL, '2026-05-11 11:14:15'),
(47, 7, 1, 'admin', 'hii', NULL, '2026-05-11 11:18:45'),
(48, 7, 32, 'user', 'Hii', NULL, '2026-05-11 11:19:55'),
(49, 7, 32, 'user', 'th', NULL, '2026-05-11 11:28:08'),
(50, 7, 32, 'user', 'g', NULL, '2026-05-11 11:28:19'),
(51, 7, 1, 'admin', 'h', NULL, '2026-05-12 05:10:08'),
(52, 7, 1, 'admin', 'ohk', NULL, '2026-05-12 05:10:28'),
(53, 7, 32, 'user', 'h', NULL, '2026-05-12 05:10:45'),
(54, 7, 32, 'user', 'hmm', NULL, '2026-05-12 05:11:14'),
(55, 7, 1, 'admin', 'ok', NULL, '2026-05-12 05:12:29'),
(56, 7, 1, 'admin', 'hii', NULL, '2026-05-12 05:49:45'),
(57, 7, 1, 'admin', 'ikk', NULL, '2026-05-12 05:49:55'),
(58, 7, 32, 'user', 'h', NULL, '2026-05-12 05:50:16'),
(59, 7, 32, 'user', 'fg', NULL, '2026-05-12 05:50:33'),
(60, 7, 32, 'user', 'hii', NULL, '2026-05-12 06:12:32'),
(61, 7, 32, 'user', 'hii', NULL, '2026-05-12 06:13:15'),
(62, 7, 1, 'admin', 'oo', NULL, '2026-05-12 06:13:28'),
(63, 7, 1, 'admin', 'okk', NULL, '2026-05-12 06:13:41'),
(64, 5, 1, 'admin', 'hii', NULL, '2026-05-12 06:18:59'),
(65, 5, 32, 'user', 'hii', NULL, '2026-05-12 06:20:08'),
(66, 5, 32, 'user', 'joo', NULL, '2026-05-12 06:28:34'),
(67, 5, 1, 'admin', 'hii', NULL, '2026-05-12 10:42:56'),
(68, 5, 1, 'admin', 'GII', NULL, '2026-05-12 10:45:13'),
(69, 5, 32, 'user', 'OHKK', NULL, '2026-05-12 10:45:30'),
(70, 5, 32, 'user', 'ff', NULL, '2026-05-12 10:45:46');

-- --------------------------------------------------------

--
-- Table structure for table `tickets`
--

CREATE TABLE `tickets` (
  `id` int NOT NULL,
  `userId` int NOT NULL,
  `subject` varchar(255) NOT NULL,
  `description` text,
  `file` varchar(255) DEFAULT NULL,
  `status` enum('open','adminReply','userReply','closed') NOT NULL DEFAULT 'open',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `tickets`
--

INSERT INTO `tickets` (`id`, `userId`, `subject`, `description`, `file`, `status`, `createdAt`, `updatedAt`) VALUES
(1, 14, 'Test', 'Testing ticket module', 'uploads/tickets/1/att_1776485067826_63979.png', 'closed', '2026-04-18 04:04:27', '2026-05-06 05:46:22'),
(2, 32, '23-04-2026 ticket', '23-04-2026 ticket', NULL, 'closed', '2026-04-23 16:10:48', '2026-04-30 06:28:26'),
(3, 32, 'Testing', 'Testing for bedge', NULL, 'closed', '2026-04-30 05:36:29', '2026-05-02 07:31:51'),
(4, 32, 'Test', 'Testing Test', NULL, 'closed', '2026-04-30 05:37:22', '2026-05-06 05:47:25'),
(5, 32, 'HIi', 'Welcome new ticket', NULL, 'open', '2026-05-08 04:25:36', '2026-05-14 05:42:19'),
(6, 38, 'Issue with login', 'I cannot log in to my account', NULL, 'closed', '2026-05-08 06:18:20', '2026-05-08 06:23:03'),
(7, 32, 'socket test', 'socket test', NULL, 'open', '2026-05-10 06:56:30', '2026-05-12 06:18:45');

-- --------------------------------------------------------

--
-- Table structure for table `userOtp`
--

CREATE TABLE `userOtp` (
  `id` int NOT NULL,
  `userId` int NOT NULL,
  `otp` varchar(6) NOT NULL,
  `expiresAt` datetime NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `firstName` varchar(11) NOT NULL,
  `lastName` varchar(11) NOT NULL,
  `userName` varchar(15) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(15) NOT NULL,
  `status` enum('active','pending','inactive','deleted') NOT NULL DEFAULT 'pending',
  `gender` enum('male','female','other') DEFAULT NULL,
  `profilePicture` varchar(255) DEFAULT NULL,
  `email` varchar(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `firstName`, `lastName`, `userName`, `password`, `phone`, `status`, `gender`, `profilePicture`, `email`, `isDeleted`, `createdAt`, `updatedAt`) VALUES
(12, 'peter', 'peter', 'peter1', '$2b$10$YpfW/G7Ti96wqodsyL/cauDNQpnI0zkiaVaQx.Y9.AfP/wHMxcGWy', '9898989898', 'deleted', NULL, NULL, 'peterpeter@test.com', 1, '2026-03-14 06:14:51', '2026-04-28 04:58:06'),
(13, 'Vansh', 'Panchal', 'Vansh13', '$2b$10$EWTtdOc34FLGtmu5hJqnNOXskYYnhK5TzS3RKxCoPqtdWtQFk.mn.', '9639639630', 'active', 'male', 'uploads/13/user_1774943424631_9314.png', 'vanshapanchal@gmail.com', 0, '2026-03-14 06:17:28', '2026-04-09 11:45:29'),
(14, 'Vansh', 'Panchal', 'Vansh', '$2b$10$KMEZwd5tEdNqnbhEtmj9heR0gZkoW2sutIqyaMUzl1ZgLuSrEhe8K', '9517538529', 'active', 'male', 'uploads/14/user_1776060947980_20837.png', 'vanshapanchal1@gmail.com', 1, '2026-03-14 06:24:37', '2026-04-13 06:15:47'),
(15, 'test1', 'test1', 'test1', '$2b$10$0FUd4hCDSq2giky/yQyTjexQL8jrFq4KqWA8QqXYz91y6T1Q5YPNO', '7897897890', 'deleted', NULL, NULL, 'test1@test.com', 1, '2026-03-17 05:35:29', NULL),
(16, 'test2', 'test2', 'test2', '$2b$10$IlAmC81hf9Nqg6gd1AXcAeOs2YbZejsA91KaLzl1A/6aOfB8WWnju', '7897897890', 'deleted', NULL, NULL, 'test2@test.com', 1, '2026-03-17 05:36:35', '2026-03-31 04:15:53'),
(17, 'test3', 'test3', 'test3', '$2b$10$bibWh6kYaqY0meeUSPcmdexeXO3T32lMO0UZOISTw/AH1vTzsOISW', '7897897890', 'pending', NULL, NULL, 'test3@test.com', 0, '2026-03-17 07:31:52', NULL),
(18, 'test4', 'test4', 'test4', '$2b$10$dkCmlkoNlF10tyrU.rvaR.GG2s3e53RBhHN58RLVg6dyD6lLFgCtG', '7897897890', 'active', NULL, NULL, 'test4@test.com', 0, '2026-03-17 07:50:54', '2026-03-30 05:18:23'),
(19, 'test5', 'test5', 'test5', '$2b$10$529oFcf7CXuq472Cy1kzR.96n.k5PvDJ3fRieBk/e594FFy8ZDbDW', '7897897890', 'pending', NULL, NULL, 'test5@test.com', 0, '2026-03-18 05:27:11', NULL),
(20, 'Test', 'test', 'test6', '$2b$10$6knwb.uIL1ny6t454GztMOUEv3Y1xdlzIaPI84uZizx86Hf.Hh8Xu', '7897897832', 'active', 'male', NULL, 'test6@test.com', 0, '2026-03-18 07:38:40', '2026-04-17 03:44:39'),
(21, 'Test7', 'test7', 'test7', '$2b$10$IzRuyVGYzvdRgqDJtcbZUOqVPoAq/PrzMCWuo4EJZoqmNZYKoXvNS', '7897897832', 'pending', 'male', '', 'test7@test.com', 0, '2026-03-18 08:55:04', '2026-03-18 09:00:13'),
(22, 'test', 'test', 'test8', '$2b$10$vgme2O0zsq8r3g9MTzqVXOWOSjaIJU9FtlzOTIdGMj.Dh1R7bk1q6', '7987897897', 'active', 'male', '', 'test8@test.com', 0, '2026-03-18 09:53:35', '2026-04-13 11:54:10'),
(23, 'test', 'test', 'test9', '$2b$10$4HSDWPez/KsQvdQ38tpsg.1YwrH7xNPePsX1pbQiXwpno8EgYC5bm', '7987897897', 'pending', 'male', '', 'test9@test.com', 0, '2026-03-18 09:55:24', '2026-04-06 06:05:42'),
(24, 'test', 'test', 'test10', '$2b$10$QVEZ2SB9kOl4iTN5dqxzQOGgbuCe0I9DBM8gNuMHqck8VBA7RvcoO', '7987897897', 'inactive', 'female', '', 'test10@test.com', 0, '2026-03-18 09:59:13', '2026-05-02 03:37:54'),
(25, 'test', 'test', 'test12', '$2b$10$krIJueorfaVurZ/RV/JEmOaG2Lm8KEgBF0m4H/mYkIoh7ztScqGEy', '1237723784', 'inactive', 'male', '', 'test12@test.com', 0, '2026-03-19 05:38:37', '2026-03-31 04:40:11'),
(26, 'edit ', 'SDF', 'rudra', '$2b$10$5u3yCeUx7eKnAJi8h9MHWulQvOXt1EBAxllZm.T50ckP3g.SWqlvC', '1234567890', 'active', 'female', NULL, 'rudra@gmail.com', 0, '2026-03-20 04:36:10', '2026-05-06 08:33:26'),
(27, 'Rudra', 'Panchal', 'Rudra0', '$2b$10$1/JBcXzcZg21kpdFuyEyeupLwEAKi25JbUhdb/.NXS8hLeT0aEnOi', '1234567890', 'deleted', 'female', '', 'rudrampanchal@gmail.com', 1, '2026-03-28 03:10:50', '2026-04-13 05:49:59'),
(28, 'Van', 'Panchal', 'panchal', '$2b$10$KA3uMEzuQlwECsIuoFe8F.NTsa4e0tKNI0ZnbF7YhCaCDYxDviOhu', '9878569879', 'active', 'male', '', 'vansh1309@yahoo.com', 0, '2026-03-30 06:33:43', '2026-03-31 10:47:54'),
(29, 'ABC', 'abcd', 'abc', '$2b$10$/OpLxzao1ER0qqtZ1jAfJeqOPkteJ3iocgvkTvN58jUlZWFr8DR2q', '1237723784', 'active', 'male', '', 'vansh13092006@gmail.com', 0, '2026-04-01 05:24:32', '2026-04-15 14:44:54'),
(30, 'Vansh12', 'Panc', 'Vansh12', '$2b$10$P9xiuLDA2iH7qtrO8HSNW.lW.G7w4owEM2Takihl5G9If9Oze/WI2', '1231231231', 'deleted', 'male', NULL, 'Vansh12@gmail.com', 1, '2026-04-16 06:29:59', '2026-04-23 15:56:56'),
(32, 'Vansh', 'Panchal', 'Vansh12', '$2b$10$rR6WcpntYOuLn7lPrC/ryuYvBflYxExWH35Bi668oXyHIb402gWXK', '9499763087', 'active', 'male', NULL, 'Vansh12@gmail.com', 0, '2026-04-23 15:59:12', '2026-04-23 16:00:02'),
(33, 'peter', 'peter', 'peter1', '$2b$10$NoLgMGCU/i84CGlA1XgRz.kgXIDFxLqY0yjld6.PfMmsUJZ6rj9eu', '1231231230', 'inactive', 'male', NULL, 'peterpeter@gmail.com', 0, '2026-04-28 05:00:16', '2026-05-06 05:41:14'),
(34, 'test1', 'test1', 'test1', '$2b$10$X8L4PaTCV/39Xcm1S1UP3.iQe87o5D21CfE1rdAIfht2oLGkWWNaK', '1231231230', 'inactive', 'female', NULL, 'test1@test.com', 0, '2026-04-28 05:22:35', '2026-05-02 03:38:02'),
(35, 'Vansh', 'Panchal', 'Vansh', '$2b$10$1xlAl.oU0q5W78Lvj.ZPReAw4q.7OVNYfEXcmv99c/kGkMLmmKhte', '1231231230', 'active', 'male', NULL, 'vanshapanchal1@gmail.com', 0, '2026-04-28 08:08:14', '2026-05-01 11:17:12'),
(36, 'peter4', 'peter3', 'peter4', '$2b$10$1OasFvb5da.tmnGgdCl5f.23oqfwLWzVqeleuIMQ/HxJF9vlZ4xcO', '1231231231', 'active', 'male', NULL, 'peter4@test.com', 0, '2026-05-02 07:11:12', '2026-05-03 06:22:42'),
(37, 'vortex', 'vortex', 'vortex', '$2b$10$31swl1Ctpg9AJUsMYApUduY2WZ/ks62qZ5iMBjdRQSIGcQ5MkPPZC', '1234567654', 'active', 'male', NULL, 'vortex@gmail.com', 0, '2026-05-06 08:40:04', '2026-05-06 09:59:01'),
(38, 'Reeb-Edit', 'reebs', 'reeb', '$2b$10$mjbir5907VbC25YBmULFju4IY/AfIYwoXifsD4.aQnPR22QU5gUYK', '9876543210', 'deleted', 'male', 'uploads/38/user_1778218634518_65182.png', 'reeb-user@test.com', 1, '2026-05-08 05:29:09', '2026-05-08 07:14:46');

-- --------------------------------------------------------

--
-- Table structure for table `userToken`
--

CREATE TABLE `userToken` (
  `id` int NOT NULL,
  `userId` int NOT NULL,
  `token` text NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD KEY `roleId` (`roleId`),
  ADD KEY `idx_admins_userName` (`userName`),
  ADD KEY `idx_admins_email` (`email`),
  ADD KEY `idx_admins_isDeleted` (`isDeleted`);

--
-- Indexes for table `adminToken`
--
ALTER TABLE `adminToken`
  ADD PRIMARY KEY (`id`),
  ADD KEY `adminId` (`adminId`),
  ADD KEY `idx_adminToken_token` (`token`(191));

--
-- Indexes for table `modules`
--
ALTER TABLE `modules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_modules_isDeleted` (`isDeleted`),
  ADD KEY `idx_modules_status` (`status`);

--
-- Indexes for table `notificationReads`
--
ALTER TABLE `notificationReads`
  ADD PRIMARY KEY (`notificationId`,`userId`),
  ADD KEY `idx_nr_userId` (`userId`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `rolePermissions`
--
ALTER TABLE `rolePermissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_role_module` (`roleId`,`moduleId`),
  ADD KEY `moduleId` (`moduleId`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_roles_isDeleted` (`isDeleted`);

--
-- Indexes for table `ticketMessages`
--
ALTER TABLE `ticketMessages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ticketId` (`ticketId`);

--
-- Indexes for table `tickets`
--
ALTER TABLE `tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`);

--
-- Indexes for table `userOtp`
--
ALTER TABLE `userOtp`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_userId` (`userId`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_users_status` (`status`),
  ADD KEY `idx_users_username` (`userName`),
  ADD KEY `idx_users_isDeleted` (`isDeleted`),
  ADD KEY `idx_users_email` (`email`);

--
-- Indexes for table `userToken`
--
ALTER TABLE `userToken`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`),
  ADD KEY `idx_userToken_token` (`token`(191));

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `adminToken`
--
ALTER TABLE `adminToken`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=412;

--
-- AUTO_INCREMENT for table `modules`
--
ALTER TABLE `modules`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `rolePermissions`
--
ALTER TABLE `rolePermissions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=107;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `ticketMessages`
--
ALTER TABLE `ticketMessages`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=73;

--
-- AUTO_INCREMENT for table `tickets`
--
ALTER TABLE `tickets`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `userOtp`
--
ALTER TABLE `userOtp`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `userToken`
--
ALTER TABLE `userToken`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=194;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admins`
--
ALTER TABLE `admins`
  ADD CONSTRAINT `admins_ibfk_1` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `adminToken`
--
ALTER TABLE `adminToken`
  ADD CONSTRAINT `adminToken_ibfk_1` FOREIGN KEY (`adminId`) REFERENCES `admins` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notificationReads`
--
ALTER TABLE `notificationReads`
  ADD CONSTRAINT `notificationReads_ibfk_1` FOREIGN KEY (`notificationId`) REFERENCES `notifications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notificationReads_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `rolePermissions`
--
ALTER TABLE `rolePermissions`
  ADD CONSTRAINT `rolePermissions_ibfk_1` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `rolePermissions_ibfk_2` FOREIGN KEY (`moduleId`) REFERENCES `modules` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `ticketMessages`
--
ALTER TABLE `ticketMessages`
  ADD CONSTRAINT `ticketMessages_ibfk_1` FOREIGN KEY (`ticketId`) REFERENCES `tickets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tickets`
--
ALTER TABLE `tickets`
  ADD CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `userOtp`
--
ALTER TABLE `userOtp`
  ADD CONSTRAINT `fk_userOtp_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `userToken`
--
ALTER TABLE `userToken`
  ADD CONSTRAINT `userToken_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

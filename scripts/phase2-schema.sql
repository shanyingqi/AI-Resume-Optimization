-- Phase 2 additive migrations (safe to re-run with skip-on-error script)

ALTER TABLE `users` ADD COLUMN `onboarding_completed` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `users` ADD COLUMN `password_reset_token` VARCHAR(191) NULL;
ALTER TABLE `users` ADD COLUMN `password_reset_expires` DATETIME(3) NULL;

CREATE TABLE IF NOT EXISTS `resume_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL DEFAULT '我的主简历',
    `content` LONGTEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `resume_profiles_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `resume_versions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'manual',
    `history_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `resume_versions_history_id_key`(`history_id`),
    INDEX `resume_versions_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `job_applications` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `company` VARCHAR(191) NULL,
    `job_description` LONGTEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `resume_version_id` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX `job_applications_user_id_updated_at_idx`(`user_id`, `updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `optimization_history` ADD COLUMN `title` VARCHAR(191) NULL;
ALTER TABLE `optimization_history` ADD COLUMN `deleted_at` DATETIME(3) NULL;
ALTER TABLE `optimization_history` ADD COLUMN `project_id` VARCHAR(191) NULL;
CREATE INDEX `optimization_history_user_id_deleted_at_idx` ON `optimization_history`(`user_id`, `deleted_at`);
CREATE INDEX `optimization_history_project_id_idx` ON `optimization_history`(`project_id`);

ALTER TABLE `chat_sessions` ADD COLUMN `history_id` VARCHAR(191) NULL;
ALTER TABLE `chat_sessions` ADD COLUMN `project_id` VARCHAR(191) NULL;
CREATE INDEX `chat_sessions_project_id_idx` ON `chat_sessions`(`project_id`);

CREATE TABLE IF NOT EXISTS `usage_events` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `usage_events_user_id_action_created_at_idx`(`user_id`, `action`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `resume_profiles` ADD CONSTRAINT `resume_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `resume_versions` ADD CONSTRAINT `resume_versions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `resume_versions` ADD CONSTRAINT `resume_versions_history_id_fkey` FOREIGN KEY (`history_id`) REFERENCES `optimization_history`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `job_applications` ADD CONSTRAINT `job_applications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `optimization_history` ADD CONSTRAINT `optimization_history_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `job_applications`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `job_applications`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `usage_events` ADD CONSTRAINT `usage_events_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

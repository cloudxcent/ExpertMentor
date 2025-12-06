/*
  # Create Notifications Table

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key) - Unique notification ID
      - `user_id` (text, foreign key) - User receiving the notification
      - `type` (text) - Type of notification (session_request, message, review, session_complete, etc.)
      - `title` (text) - Notification title
      - `message` (text) - Notification message content
      - `data` (jsonb) - Additional data (expert_id, session_id, etc.)
      - `is_read` (boolean) - Whether notification has been read
      - `created_at` (timestamptz) - Timestamp of notification

  2. Security
    - Enable RLS on notifications table
    - Add policy for users to read their own notifications
    - Add policy for users to update their own notifications (mark as read)
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('session_request', 'session_accepted', 'session_completed', 'message', 'review', 'payment')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = current_user);

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = current_user)
  WITH CHECK (user_id = current_user);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

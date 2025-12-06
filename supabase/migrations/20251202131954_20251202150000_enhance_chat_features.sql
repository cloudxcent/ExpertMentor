/*
  # Enhance Chat Features
  
  ## Summary
  This migration enhances the chat system with support for:
  - Message type tracking (user, expert, auto_welcome, auto_60sec, auto_2min)
  - Last activity tracking for sessions
  - Chat session type categorization (active, history)
  
  ## Changes Made
  
  ### 1. Chat Sessions Table Updates
  - Add `last_activity_at` column to track when the session was last active
  - Add `chat_type` column to categorize sessions as 'active' or 'history'
  - Add index on last_activity_at for efficient querying
  
  ### 2. Chat Messages Table Updates
  - Add `message_type` column to distinguish between user messages, expert messages, and auto-responses
  - Add `auto_response_trigger` column to track what triggered automated messages
  - Add index on message_type for filtering
  
  ### 3. Improved Query Performance
  - Indexes added for commonly queried columns
  - Better support for loading chat history
  
  ## Security
  - All existing RLS policies remain unchanged
  - New columns follow existing security patterns
*/

-- Add new columns to chat_sessions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_sessions' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE chat_sessions 
    ADD COLUMN last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_sessions' AND column_name = 'chat_type'
  ) THEN
    ALTER TABLE chat_sessions 
    ADD COLUMN chat_type TEXT DEFAULT 'active' CHECK (chat_type IN ('active', 'history'));
  END IF;
END $$;

-- Add new columns to chat_messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'message_type'
  ) THEN
    ALTER TABLE chat_messages 
    ADD COLUMN message_type TEXT DEFAULT 'user' CHECK (message_type IN ('user', 'expert', 'auto_welcome', 'auto_60sec', 'auto_2min'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'auto_response_trigger'
  ) THEN
    ALTER TABLE chat_messages 
    ADD COLUMN auto_response_trigger TEXT;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_activity 
  ON chat_sessions(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_chat_type 
  ON chat_sessions(chat_type);

CREATE INDEX IF NOT EXISTS idx_chat_messages_message_type 
  ON chat_messages(message_type);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created 
  ON chat_messages(session_id, created_at);

-- Create function to automatically update last_activity_at on new messages
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions 
  SET last_activity_at = NEW.created_at
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_activity_at on new messages
DROP TRIGGER IF EXISTS trigger_update_session_activity ON chat_messages;
CREATE TRIGGER trigger_update_session_activity
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();

-- Update existing sessions with last_activity_at based on their latest message
UPDATE chat_sessions cs
SET last_activity_at = (
  SELECT MAX(cm.created_at)
  FROM chat_messages cm
  WHERE cm.session_id = cs.id
)
WHERE last_activity_at IS NULL OR last_activity_at = created_at;

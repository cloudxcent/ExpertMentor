/*
  # Create Chat Messages and Sessions Tables

  1. New Tables
    - `chat_sessions`
      - `id` (text, primary key)
      - `client_id` (text, references profiles)
      - `expert_id` (text, references profiles)
      - `status` (text: active, ended)
      - `started_at` (timestamptz)
      - `ended_at` (timestamptz)
      - `last_message_at` (timestamptz)
      - `total_messages` (integer)
    
    - `chat_messages`
      - `id` (text, primary key)
      - `session_id` (text, references chat_sessions)
      - `sender_id` (text, references profiles)
      - `receiver_id` (text, references profiles)
      - `message` (text)
      - `is_read` (boolean)
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on both tables
    - Users can only see their own messages
    
  3. Indexes
    - Performance optimization
*/

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id text REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  expert_id text REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  started_at timestamptz DEFAULT now() NOT NULL,
  ended_at timestamptz,
  last_message_at timestamptz DEFAULT now(),
  total_messages integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id text REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_id text REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id text REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat sessions policies
CREATE POLICY "Users can view their own chat sessions"
  ON chat_sessions FOR SELECT
  TO authenticated
  USING (auth.uid()::text = client_id OR auth.uid()::text = expert_id);

CREATE POLICY "Users can create chat sessions"
  ON chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = client_id);

CREATE POLICY "Users can update their own chat sessions"
  ON chat_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = client_id OR auth.uid()::text = expert_id)
  WITH CHECK (auth.uid()::text = client_id OR auth.uid()::text = expert_id);

-- Chat messages policies
CREATE POLICY "Users can view their own messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);

CREATE POLICY "Users can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = sender_id);

CREATE POLICY "Users can update their own messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id)
  WITH CHECK (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_client ON chat_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_expert ON chat_sessions(expert_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- Function to update chat session on new message
CREATE OR REPLACE FUNCTION update_chat_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions
  SET 
    last_message_at = NEW.created_at,
    total_messages = total_messages + 1,
    updated_at = NEW.created_at
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_update_chat_session ON chat_messages;
CREATE TRIGGER trigger_update_chat_session
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_session_on_message();
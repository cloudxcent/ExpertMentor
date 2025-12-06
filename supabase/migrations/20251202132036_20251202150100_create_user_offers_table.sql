/*
  # Create User Offers Table
  
  ## Summary
  This migration creates a table to manage special offers and promotions for users.
  
  ## New Tables
  
  ### `user_offers`
  - `id` (uuid, primary key) - Unique offer identifier
  - `user_id` (text, foreign key) - References profiles table
  - `offer_type` (text) - Type of offer (welcome, referral, weekend, loyalty, etc.)
  - `offer_title` (text) - Display title for the offer
  - `offer_description` (text) - Detailed description
  - `discount_amount` (decimal) - Monetary discount value
  - `discount_percentage` (integer) - Percentage discount value
  - `valid_until` (timestamp) - Expiration date/time
  - `is_redeemed` (boolean) - Whether offer has been used
  - `redeemed_at` (timestamp) - When offer was redeemed
  - `created_at` (timestamp) - When offer was created
  - `updated_at` (timestamp) - Last update time
  
  ## Security
  - Enable RLS on user_offers table
  - Users can view their own offers
  - Users can update redemption status of their own offers
  - Only system/admin can create new offers
*/

-- Create user_offers table
CREATE TABLE IF NOT EXISTS user_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  offer_type TEXT NOT NULL,
  offer_title TEXT NOT NULL,
  offer_description TEXT,
  discount_amount DECIMAL(10,2),
  discount_percentage INTEGER,
  valid_until TIMESTAMP WITH TIME ZONE,
  is_redeemed BOOLEAN DEFAULT FALSE,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_offers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own offers"
  ON user_offers
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own offer redemption"
  ON user_offers
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_offers_user_id 
  ON user_offers(user_id);

CREATE INDEX IF NOT EXISTS idx_user_offers_redeemed 
  ON user_offers(is_redeemed);

CREATE INDEX IF NOT EXISTS idx_user_offers_valid_until 
  ON user_offers(valid_until);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_user_offers_updated_at ON user_offers;
CREATE TRIGGER trigger_user_offers_updated_at
  BEFORE UPDATE ON user_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_user_offers_updated_at();

-- Insert default welcome offers for existing users
INSERT INTO user_offers (user_id, offer_type, offer_title, offer_description, discount_amount)
SELECT 
  id,
  'welcome',
  'Welcome Offer',
  'First 2 minutes of chat FREE with any expert',
  0
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM user_offers 
  WHERE user_offers.user_id = profiles.id 
  AND user_offers.offer_type = 'welcome'
)
ON CONFLICT DO NOTHING;

/*
  # Add Duplicate Email Prevention Function

  1. New Functions
    - `check_duplicate_email`: Validates no duplicate emails exist before insert/update
    
  2. Purpose
    - Prevents duplicate email entries at database level
    - Returns helpful error message if duplicate detected
    - Works as trigger before insert/update operations
*/

-- Create function to check for duplicate emails
CREATE OR REPLACE FUNCTION check_duplicate_email()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE email = NEW.email 
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'This email is already associated with another account';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check before insert or update
DROP TRIGGER IF EXISTS check_duplicate_email_trigger ON profiles;
CREATE TRIGGER check_duplicate_email_trigger
  BEFORE INSERT OR UPDATE OF email ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_email();
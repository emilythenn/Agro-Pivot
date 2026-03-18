-- Auto-confirm auth users so email confirmation is not required before login
-- This aligns with app requirement: immediate login after signup.

-- Backfill existing unconfirmed users
UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- Auto-confirm every new user at insert time
CREATE OR REPLACE FUNCTION public.auto_confirm_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, NOW());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_confirm_auth_user_trigger ON auth.users;
CREATE TRIGGER auto_confirm_auth_user_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_auth_user();

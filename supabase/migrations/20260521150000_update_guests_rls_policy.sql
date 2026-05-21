-- Create a function to fetch hello@studiogvb.com's guests bypassing RLS (read-only)
CREATE OR REPLACE FUNCTION public.get_mock_guests()
RETURNS SETOF public.guests
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.guests
  WHERE user_id = '4903bd39-e54f-42e4-b679-2af5d128bb8f'
  ORDER BY created_at DESC;
END;
$$;

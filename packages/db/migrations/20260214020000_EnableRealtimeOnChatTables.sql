-- Enable Supabase Realtime on feedback_message and feedback_thread.
-- Uses IF NOT EXISTS-style guard so it is safe to re-run.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'feedback_message'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback_message;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'feedback_thread'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback_thread;
  END IF;
END $$;
-- Compliance additions
--
-- cancellation_logs.consented_at — when the user ticked "I authorise SubShield
--   to send this request on my behalf". Evidence of authority for each letter.
-- profiles.renewal_reminder_for — the current_period_end we last sent a
--   yearly-renewal reminder for, so each renewal gets exactly one reminder.

alter table public.cancellation_logs add column consented_at timestamp with time zone;

alter table public.profiles add column renewal_reminder_for timestamp with time zone;

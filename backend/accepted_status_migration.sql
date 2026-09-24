-- P1-07: papers are accepted before they are published, so the author can be asked to pay
-- the article processing charge after acceptance (as the Author Guidelines state).
--
-- Additive only: adds one enum value, changes no rows. Safe to re-run.

alter type paper_status add value if not exists 'accepted';

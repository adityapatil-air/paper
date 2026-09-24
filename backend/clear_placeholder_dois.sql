-- P1-08: remove DOIs the old publish code generated with the DOI Handbook's example prefix.
-- These never resolved. Real DOIs can be entered when publishing.
--
-- Changes only rows whose DOI starts with 10.1000/example. Review the SELECT first.

select id, title, doi from public.papers where doi like '10.1000/example.%';

update public.papers set doi = null where doi like '10.1000/example.%';

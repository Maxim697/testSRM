-- CRM platform — seed data (P2P payment processing, India)
-- Run this in the Supabase SQL Editor AFTER 0001_initial_schema.sql.
--
-- PREREQUISITE — create 4 auth users first (Authentication -> Users -> Add user,
-- same way you created the first one). Turn on "Auto Confirm User" for each.
-- Any password works, nobody needs to remember these — they're just seed accounts.
--
--   manager2@p2pcrm.local   (any password)
--   manager3@p2pcrm.local   (any password)
--   lead1@p2pcrm.local      (any password)
--   admin1@p2pcrm.local     (any password)
--
-- Your existing user (id 351475c2-7ac4-4531-aee5-1bff1b7474ad) is left
-- completely untouched — it becomes the 3rd manager in this seed simply by
-- already owning a third of the traders below. Its profile row (name, role)
-- is never inserted or updated by this script.
--
-- If any of the 4 emails above don't exist yet, the "_seed_people" step
-- fails fast with a clear "null value in column id" error naming the slot —
-- go create that user and re-run.

-- ==========================================================================
-- resolve the 5 people once, by email, so the rest of the script just
-- references a slot name instead of repeating subqueries everywhere
-- ==========================================================================
create temporary table _seed_people (
  slot text primary key,
  id uuid not null
);

insert into _seed_people (slot, id) values
  ('manager1', '351475c2-7ac4-4531-aee5-1bff1b7474ad'),
  ('manager2', (select id from auth.users where email = 'manager2@p2pcrm.local')),
  ('manager3', (select id from auth.users where email = 'manager3@p2pcrm.local')),
  ('lead1', (select id from auth.users where email = 'lead1@p2pcrm.local')),
  ('admin1', (select id from auth.users where email = 'admin1@p2pcrm.local'));

-- ==========================================================================
-- profiles — the 4 new people (manager1 / your existing account is skipped
-- entirely, per instructions)
-- ==========================================================================
insert into public.profiles (id, full_name, telegram, role)
values
  ((select id from _seed_people where slot = 'manager2'), 'Олексій Мельник', '@manager_02', 'manager'),
  ((select id from _seed_people where slot = 'manager3'), 'Дмитро Ткаченко', '@manager_03', 'manager'),
  ((select id from _seed_people where slot = 'lead1'), 'Марина Коваленко', '@lead_01', 'lead'),
  ((select id from _seed_people where slot = 'admin1'), 'Сергій Бондаренко', '@admin_01', 'admin')
on conflict (id) do update set
  full_name = excluded.full_name,
  telegram = excluded.telegram,
  role = excluded.role;

-- ==========================================================================
-- traders (18): 3 gold / 8 silver / 7 bronze, 8 green / 7 amber / 3 red,
-- split evenly across the 3 managers
-- ==========================================================================
insert into public.traders
  (id, code, tier, deposit, manager_id, status, score, score_delta, last_active, cr, sla_in, sla_out, turnover_week, turnover_delta, settlement)
values
  ('bcf91662-3210-4fb0-b5fd-c4cc75cd7ab3', 'RE[P2P] Rajesh Kumar', 'gold', 5800, (select id from _seed_people where slot = 'manager1'), 'green', 71, 9, current_date - 0, 74, '6:15:00', '19:40:00', 2250000, 18, 2070000),
  ('26d4a7f4-20e9-4438-bdd6-df827043de9a', 'G[P2P] Amit Sharma', 'silver', 4200, (select id from _seed_people where slot = 'manager1'), 'green', 61, 12, current_date - 1, 66, '8:20:00', '21:00:00', 980000, 32, 833000),
  ('5a1985d4-6ec2-4730-a47b-49ed213225cd', 'M[P2P] Priya Singh', 'gold', 5400, (select id from _seed_people where slot = 'manager2'), 'green', 68, 5, current_date - 0, 71, '7:05:00', '20:10:00', 1850000, 9, 1665000),
  ('e2789360-a469-4324-ae01-f440c3103b92', 'RE[P2P] Vikram Patel', 'silver', 3900, (select id from _seed_people where slot = 'manager2'), 'green', 58, 4, current_date - 1, 63, '7:40:00', '20:35:00', 820000, 11, 713000),
  ('415c2602-9c66-41b6-ab9c-ac423c44f0d6', 'G[P2P] Sunita Reddy', 'silver', 4600, (select id from _seed_people where slot = 'manager3'), 'amber', 48, -6, current_date - 2, 61, '8:00:00', '20:50:00', 690000, -14, 593000),
  ('73737dc2-16e6-4441-993c-29ebfeb50185', 'M[P2P] Arjun Nair', 'bronze', 2100, (select id from _seed_people where slot = 'manager1'), 'red', 31, -9, current_date - 5, 52, '9:45:00', '22:40:00', 95000, -25, 74000),
  ('79b65cf1-bfb1-4dd8-ae18-93a12e0d915f', 'RE[P2P] Deepak Joshi', 'silver', 4000, (select id from _seed_people where slot = 'manager2'), 'amber', 45, -10, current_date - 1, 59, '6:45:00', '19:30:00', 540000, -22, 454000),
  ('4002d8a2-da1c-4942-befa-c0b12a00b678', 'G[P2P] Kavita Iyer', 'bronze', 2400, (select id from _seed_people where slot = 'manager3'), 'amber', 39, -4, current_date - 2, 55, '6:20:00', '19:05:00', 180000, -10, 148000),
  ('dfa4da4e-dc67-4947-9365-71051758946e', 'M[P2P] Manoj Gupta', 'silver', 3700, (select id from _seed_people where slot = 'manager1'), 'amber', 42, 3, current_date - 0, 57, '7:55:00', '20:40:00', 470000, 8, 400000),
  ('e054923c-c53c-477c-8104-5ac5494ab08d', 'RE[P2P] Anjali Rao', 'silver', 3600, (select id from _seed_people where slot = 'manager2'), 'green', 57, 2, current_date - 1, 62, '6:33:00', '19:18:00', 760000, 6, 631000),
  ('d09f8663-c97d-49e8-b62c-c7cd968b32d8', 'G[P2P] Suresh Menon', 'gold', 5100, (select id from _seed_people where slot = 'manager3'), 'green', 65, -3, current_date - 0, 69, '6:50:00', '19:25:00', 1600000, -5, 1408000),
  ('23d59f90-142d-4f0d-bc2a-cbdb74768a0a', 'M[P2P] Pooja Verma', 'bronze', 2800, (select id from _seed_people where slot = 'manager1'), 'amber', 44, 7, current_date - 2, 56, '8:10:00', '21:15:00', 210000, 19, 174000),
  ('6f4a8dac-40fa-4017-84f5-69f107b1f8d0', 'RE[P2P] Ravi Shankar', 'silver', 4400, (select id from _seed_people where slot = 'manager2'), 'amber', 50, -18, current_date - 4, 64, '9:30:00', '22:20:00', 390000, -45, 293000),
  ('b0e77d40-90a8-4f9b-9c29-247d4d9d8890', 'G[P2P] Neha Kapoor', 'bronze', 2000, (select id from _seed_people where slot = 'manager3'), 'red', 28, -14, current_date - 8, 51, '6:05:00', '19:00:00', 62000, -60, 47000),
  ('afa75f94-ff07-4ee7-ad0c-aa513da66e48', 'M[P2P] Sanjay Mehta', 'bronze', 2200, (select id from _seed_people where slot = 'manager1'), 'amber', 37, -2, current_date - 1, 53, '7:25:00', '20:20:00', 150000, -6, 120000),
  ('d2625487-1535-474b-b2c2-866b428fdc65', 'RE[P2P] Divya Pillai', 'bronze', 2300, (select id from _seed_people where slot = 'manager2'), 'red', 33, -18, current_date - 11, 54, '8:35:00', '21:30:00', 71000, -89, 46000),
  ('5d13674d-c368-49d8-bc29-26aa4d71afd5', 'G[P2P] Ashok Yadav', 'silver', 3300, (select id from _seed_people where slot = 'manager3'), 'green', 55, 44, current_date - 2, 60, '9:10:00', '22:05:00', 610000, 2700, 427000),
  ('ebfd836d-27ce-449e-8d23-ed09e62661c9', 'M[P2P] Meera Chawla', 'bronze', 2600, (select id from _seed_people where slot = 'manager1'), 'green', 56, 15, current_date - 1, 58, '7:15:00', '20:00:00', 260000, 40, 208000);

-- ==========================================================================
-- trader_weekly — 12 weeks per trader; the most recent week (offset 0)
-- matches the trader's current row exactly, and the previous week (offset 7)
-- backs out from score_delta above. Weeks in between interpolate a
-- consistent trend (decline or growth) with light week-to-week noise.
-- ==========================================================================
insert into public.trader_weekly (trader_id, week_start, score, cr, turnover, status)
values
  ('bcf91662-3210-4fb0-b5fd-c4cc75cd7ab3', date_trunc('week', current_date)::date - 77, 48, 50, 1521000, 'amber'),
  ('bcf91662-3210-4fb0-b5fd-c4cc75cd7ab3', date_trunc('week', current_date)::date - 70, 52, 54.2, 1648000, 'amber'),
  ('bcf91662-3210-4fb0-b5fd-c4cc75cd7ab3', date_trunc('week', current_date)::date - 63, 50, 52.1, 1585000, 'amber'),
  ('bcf91662-3210-4fb0-b5fd-c4cc75cd7ab3', date_trunc('week', current_date)::date - 56, 49, 51.1, 1553000, 'amber'),
  ('bcf91662-3210-4fb0-b5fd-c4cc75cd7ab3', date_trunc('week', current_date)::date - 49, 55, 57.3, 1743000, 'green'),
  ('bcf91662-3210-4fb0-b5fd-c4cc75cd7ab3', date_trunc('week', current_date)::date - 42, 57, 59.4, 1806000, 'green'),
  ('bcf91662-3210-4fb0-b5fd-c4cc75cd7ab3', date_trunc('week', current_date)::date - 35, 54, 56.3, 1711000, 'amber'),
  ('bcf91662-3210-4fb0-b5fd-c4cc75cd7ab3', date_trunc('week', current_date)::date - 28, 56, 58.4, 1775000, 'green'),
  ('bcf91662-3210-4fb0-b5fd-c4cc75cd7ab3', date_trunc('week', current_date)::date - 21, 62, 64.6, 1965000, 'green'),
  ('bcf91662-3210-4fb0-b5fd-c4cc75cd7ab3', date_trunc('week', current_date)::date - 14, 62, 64.6, 1965000, 'green'),
  ('bcf91662-3210-4fb0-b5fd-c4cc75cd7ab3', date_trunc('week', current_date)::date - 7, 62, 64.6, 1965000, 'green'),
  ('bcf91662-3210-4fb0-b5fd-c4cc75cd7ab3', date_trunc('week', current_date)::date - 0, 71, 74, 2250000, 'green'),
  ('26d4a7f4-20e9-4438-bdd6-df827043de9a', date_trunc('week', current_date)::date - 77, 35, 37.9, 562000, 'amber'),
  ('26d4a7f4-20e9-4438-bdd6-df827043de9a', date_trunc('week', current_date)::date - 70, 37, 40, 594000, 'amber'),
  ('26d4a7f4-20e9-4438-bdd6-df827043de9a', date_trunc('week', current_date)::date - 63, 33, 35.7, 530000, 'red'),
  ('26d4a7f4-20e9-4438-bdd6-df827043de9a', date_trunc('week', current_date)::date - 56, 37, 40, 594000, 'amber'),
  ('26d4a7f4-20e9-4438-bdd6-df827043de9a', date_trunc('week', current_date)::date - 49, 42, 45.4, 675000, 'amber'),
  ('26d4a7f4-20e9-4438-bdd6-df827043de9a', date_trunc('week', current_date)::date - 42, 41, 44.4, 659000, 'amber'),
  ('26d4a7f4-20e9-4438-bdd6-df827043de9a', date_trunc('week', current_date)::date - 35, 40, 43.3, 643000, 'amber'),
  ('26d4a7f4-20e9-4438-bdd6-df827043de9a', date_trunc('week', current_date)::date - 28, 45, 48.7, 723000, 'amber'),
  ('26d4a7f4-20e9-4438-bdd6-df827043de9a', date_trunc('week', current_date)::date - 21, 49, 53, 787000, 'amber'),
  ('26d4a7f4-20e9-4438-bdd6-df827043de9a', date_trunc('week', current_date)::date - 14, 46, 49.8, 739000, 'amber'),
  ('26d4a7f4-20e9-4438-bdd6-df827043de9a', date_trunc('week', current_date)::date - 7, 49, 53, 787000, 'amber'),
  ('26d4a7f4-20e9-4438-bdd6-df827043de9a', date_trunc('week', current_date)::date - 0, 61, 66, 980000, 'green'),
  ('5a1985d4-6ec2-4730-a47b-49ed213225cd', date_trunc('week', current_date)::date - 77, 55, 57.4, 1496000, 'green'),
  ('5a1985d4-6ec2-4730-a47b-49ed213225cd', date_trunc('week', current_date)::date - 70, 52, 54.3, 1415000, 'amber'),
  ('5a1985d4-6ec2-4730-a47b-49ed213225cd', date_trunc('week', current_date)::date - 63, 51, 53.3, 1388000, 'amber'),
  ('5a1985d4-6ec2-4730-a47b-49ed213225cd', date_trunc('week', current_date)::date - 56, 57, 59.5, 1551000, 'green'),
  ('5a1985d4-6ec2-4730-a47b-49ed213225cd', date_trunc('week', current_date)::date - 49, 58, 60.6, 1578000, 'green'),
  ('5a1985d4-6ec2-4730-a47b-49ed213225cd', date_trunc('week', current_date)::date - 42, 56, 58.5, 1524000, 'green'),
  ('5a1985d4-6ec2-4730-a47b-49ed213225cd', date_trunc('week', current_date)::date - 35, 57, 59.5, 1551000, 'green'),
  ('5a1985d4-6ec2-4730-a47b-49ed213225cd', date_trunc('week', current_date)::date - 28, 63, 65.8, 1714000, 'green'),
  ('5a1985d4-6ec2-4730-a47b-49ed213225cd', date_trunc('week', current_date)::date - 21, 62, 64.7, 1687000, 'green'),
  ('5a1985d4-6ec2-4730-a47b-49ed213225cd', date_trunc('week', current_date)::date - 14, 59, 61.6, 1605000, 'green'),
  ('5a1985d4-6ec2-4730-a47b-49ed213225cd', date_trunc('week', current_date)::date - 7, 63, 65.8, 1714000, 'green'),
  ('5a1985d4-6ec2-4730-a47b-49ed213225cd', date_trunc('week', current_date)::date - 0, 68, 71, 1850000, 'green'),
  ('e2789360-a469-4324-ae01-f440c3103b92', date_trunc('week', current_date)::date - 77, 46, 50, 650000, 'amber'),
  ('e2789360-a469-4324-ae01-f440c3103b92', date_trunc('week', current_date)::date - 70, 43, 46.7, 608000, 'amber'),
  ('e2789360-a469-4324-ae01-f440c3103b92', date_trunc('week', current_date)::date - 63, 46, 50, 650000, 'amber'),
  ('e2789360-a469-4324-ae01-f440c3103b92', date_trunc('week', current_date)::date - 56, 51, 55.4, 721000, 'amber'),
  ('e2789360-a469-4324-ae01-f440c3103b92', date_trunc('week', current_date)::date - 49, 49, 53.2, 693000, 'amber'),
  ('e2789360-a469-4324-ae01-f440c3103b92', date_trunc('week', current_date)::date - 42, 47, 51.1, 664000, 'amber'),
  ('e2789360-a469-4324-ae01-f440c3103b92', date_trunc('week', current_date)::date - 35, 51, 55.4, 721000, 'amber'),
  ('e2789360-a469-4324-ae01-f440c3103b92', date_trunc('week', current_date)::date - 28, 54, 58.7, 763000, 'amber'),
  ('e2789360-a469-4324-ae01-f440c3103b92', date_trunc('week', current_date)::date - 21, 50, 54.3, 707000, 'amber'),
  ('e2789360-a469-4324-ae01-f440c3103b92', date_trunc('week', current_date)::date - 14, 51, 55.4, 721000, 'amber'),
  ('e2789360-a469-4324-ae01-f440c3103b92', date_trunc('week', current_date)::date - 7, 54, 58.7, 763000, 'amber'),
  ('e2789360-a469-4324-ae01-f440c3103b92', date_trunc('week', current_date)::date - 0, 58, 63, 820000, 'green'),
  ('415c2602-9c66-41b6-ab9c-ac423c44f0d6', date_trunc('week', current_date)::date - 77, 62, 78.8, 891000, 'green'),
  ('415c2602-9c66-41b6-ab9c-ac423c44f0d6', date_trunc('week', current_date)::date - 70, 60, 76.3, 863000, 'green'),
  ('415c2602-9c66-41b6-ab9c-ac423c44f0d6', date_trunc('week', current_date)::date - 63, 63, 80.1, 906000, 'green'),
  ('415c2602-9c66-41b6-ab9c-ac423c44f0d6', date_trunc('week', current_date)::date - 56, 62, 78.8, 891000, 'green'),
  ('415c2602-9c66-41b6-ab9c-ac423c44f0d6', date_trunc('week', current_date)::date - 49, 57, 72.4, 819000, 'green'),
  ('415c2602-9c66-41b6-ab9c-ac423c44f0d6', date_trunc('week', current_date)::date - 42, 58, 73.7, 834000, 'green'),
  ('415c2602-9c66-41b6-ab9c-ac423c44f0d6', date_trunc('week', current_date)::date - 35, 61, 77.5, 877000, 'green'),
  ('415c2602-9c66-41b6-ab9c-ac423c44f0d6', date_trunc('week', current_date)::date - 28, 58, 73.7, 834000, 'green'),
  ('415c2602-9c66-41b6-ab9c-ac423c44f0d6', date_trunc('week', current_date)::date - 21, 53, 67.4, 762000, 'amber'),
  ('415c2602-9c66-41b6-ab9c-ac423c44f0d6', date_trunc('week', current_date)::date - 14, 55, 69.9, 791000, 'green'),
  ('415c2602-9c66-41b6-ab9c-ac423c44f0d6', date_trunc('week', current_date)::date - 7, 54, 68.6, 776000, 'amber'),
  ('415c2602-9c66-41b6-ab9c-ac423c44f0d6', date_trunc('week', current_date)::date - 0, 48, 61, 690000, 'amber'),
  ('73737dc2-16e6-4441-993c-29ebfeb50185', date_trunc('week', current_date)::date - 77, 45, 75.5, 138000, 'amber'),
  ('73737dc2-16e6-4441-993c-29ebfeb50185', date_trunc('week', current_date)::date - 70, 47, 78.8, 144000, 'amber'),
  ('73737dc2-16e6-4441-993c-29ebfeb50185', date_trunc('week', current_date)::date - 63, 49, 82.2, 150000, 'amber'),
  ('73737dc2-16e6-4441-993c-29ebfeb50185', date_trunc('week', current_date)::date - 56, 45, 75.5, 138000, 'amber'),
  ('73737dc2-16e6-4441-993c-29ebfeb50185', date_trunc('week', current_date)::date - 49, 42, 70.5, 129000, 'amber'),
  ('73737dc2-16e6-4441-993c-29ebfeb50185', date_trunc('week', current_date)::date - 42, 45, 75.5, 138000, 'amber'),
  ('73737dc2-16e6-4441-993c-29ebfeb50185', date_trunc('week', current_date)::date - 35, 46, 77.2, 141000, 'amber'),
  ('73737dc2-16e6-4441-993c-29ebfeb50185', date_trunc('week', current_date)::date - 28, 40, 67.1, 123000, 'amber'),
  ('73737dc2-16e6-4441-993c-29ebfeb50185', date_trunc('week', current_date)::date - 21, 40, 67.1, 123000, 'amber'),
  ('73737dc2-16e6-4441-993c-29ebfeb50185', date_trunc('week', current_date)::date - 14, 43, 72.1, 132000, 'amber'),
  ('73737dc2-16e6-4441-993c-29ebfeb50185', date_trunc('week', current_date)::date - 7, 40, 67.1, 123000, 'amber'),
  ('73737dc2-16e6-4441-993c-29ebfeb50185', date_trunc('week', current_date)::date - 0, 31, 52, 95000, 'red'),
  ('79b65cf1-bfb1-4dd8-ae18-93a12e0d915f', date_trunc('week', current_date)::date - 77, 64, 83.9, 768000, 'green'),
  ('79b65cf1-bfb1-4dd8-ae18-93a12e0d915f', date_trunc('week', current_date)::date - 70, 67, 85, 804000, 'green'),
  ('79b65cf1-bfb1-4dd8-ae18-93a12e0d915f', date_trunc('week', current_date)::date - 63, 66, 85, 792000, 'green'),
  ('79b65cf1-bfb1-4dd8-ae18-93a12e0d915f', date_trunc('week', current_date)::date - 56, 60, 78.7, 720000, 'green'),
  ('79b65cf1-bfb1-4dd8-ae18-93a12e0d915f', date_trunc('week', current_date)::date - 49, 61, 80, 732000, 'green'),
  ('79b65cf1-bfb1-4dd8-ae18-93a12e0d915f', date_trunc('week', current_date)::date - 42, 64, 83.9, 768000, 'green'),
  ('79b65cf1-bfb1-4dd8-ae18-93a12e0d915f', date_trunc('week', current_date)::date - 35, 59, 77.4, 708000, 'green'),
  ('79b65cf1-bfb1-4dd8-ae18-93a12e0d915f', date_trunc('week', current_date)::date - 28, 55, 72.1, 660000, 'green'),
  ('79b65cf1-bfb1-4dd8-ae18-93a12e0d915f', date_trunc('week', current_date)::date - 21, 57, 74.7, 684000, 'green'),
  ('79b65cf1-bfb1-4dd8-ae18-93a12e0d915f', date_trunc('week', current_date)::date - 14, 59, 77.4, 708000, 'green'),
  ('79b65cf1-bfb1-4dd8-ae18-93a12e0d915f', date_trunc('week', current_date)::date - 7, 55, 72.1, 660000, 'green'),
  ('79b65cf1-bfb1-4dd8-ae18-93a12e0d915f', date_trunc('week', current_date)::date - 0, 45, 59, 540000, 'amber'),
  ('4002d8a2-da1c-4942-befa-c0b12a00b678', date_trunc('week', current_date)::date - 77, 50, 70.5, 231000, 'amber'),
  ('4002d8a2-da1c-4942-befa-c0b12a00b678', date_trunc('week', current_date)::date - 70, 52, 73.3, 240000, 'amber'),
  ('4002d8a2-da1c-4942-befa-c0b12a00b678', date_trunc('week', current_date)::date - 63, 48, 67.7, 222000, 'amber'),
  ('4002d8a2-da1c-4942-befa-c0b12a00b678', date_trunc('week', current_date)::date - 56, 45, 63.5, 208000, 'amber'),
  ('4002d8a2-da1c-4942-befa-c0b12a00b678', date_trunc('week', current_date)::date - 49, 49, 69.1, 226000, 'amber'),
  ('4002d8a2-da1c-4942-befa-c0b12a00b678', date_trunc('week', current_date)::date - 42, 49, 69.1, 226000, 'amber'),
  ('4002d8a2-da1c-4942-befa-c0b12a00b678', date_trunc('week', current_date)::date - 35, 44, 62.1, 203000, 'amber'),
  ('4002d8a2-da1c-4942-befa-c0b12a00b678', date_trunc('week', current_date)::date - 28, 43, 60.6, 198000, 'amber'),
  ('4002d8a2-da1c-4942-befa-c0b12a00b678', date_trunc('week', current_date)::date - 21, 47, 66.3, 217000, 'amber'),
  ('4002d8a2-da1c-4942-befa-c0b12a00b678', date_trunc('week', current_date)::date - 14, 45, 63.5, 208000, 'amber'),
  ('4002d8a2-da1c-4942-befa-c0b12a00b678', date_trunc('week', current_date)::date - 7, 43, 60.6, 198000, 'amber'),
  ('4002d8a2-da1c-4942-befa-c0b12a00b678', date_trunc('week', current_date)::date - 0, 39, 55, 180000, 'amber'),
  ('dfa4da4e-dc67-4947-9365-71051758946e', date_trunc('week', current_date)::date - 77, 35, 47.5, 392000, 'amber'),
  ('dfa4da4e-dc67-4947-9365-71051758946e', date_trunc('week', current_date)::date - 70, 36, 48.9, 403000, 'amber'),
  ('dfa4da4e-dc67-4947-9365-71051758946e', date_trunc('week', current_date)::date - 63, 31, 42.1, 347000, 'red'),
  ('dfa4da4e-dc67-4947-9365-71051758946e', date_trunc('week', current_date)::date - 56, 34, 46.1, 380000, 'red'),
  ('dfa4da4e-dc67-4947-9365-71051758946e', date_trunc('week', current_date)::date - 49, 38, 51.6, 425000, 'amber'),
  ('dfa4da4e-dc67-4947-9365-71051758946e', date_trunc('week', current_date)::date - 42, 36, 48.9, 403000, 'amber'),
  ('dfa4da4e-dc67-4947-9365-71051758946e', date_trunc('week', current_date)::date - 35, 34, 46.1, 380000, 'red'),
  ('dfa4da4e-dc67-4947-9365-71051758946e', date_trunc('week', current_date)::date - 28, 38, 51.6, 425000, 'amber'),
  ('dfa4da4e-dc67-4947-9365-71051758946e', date_trunc('week', current_date)::date - 21, 41, 55.6, 459000, 'amber'),
  ('dfa4da4e-dc67-4947-9365-71051758946e', date_trunc('week', current_date)::date - 14, 37, 50.2, 414000, 'amber'),
  ('dfa4da4e-dc67-4947-9365-71051758946e', date_trunc('week', current_date)::date - 7, 39, 52.9, 436000, 'amber'),
  ('dfa4da4e-dc67-4947-9365-71051758946e', date_trunc('week', current_date)::date - 0, 42, 57, 470000, 'amber'),
  ('e054923c-c53c-477c-8104-5ac5494ab08d', date_trunc('week', current_date)::date - 77, 53, 57.6, 707000, 'amber'),
  ('e054923c-c53c-477c-8104-5ac5494ab08d', date_trunc('week', current_date)::date - 70, 50, 54.4, 667000, 'amber'),
  ('e054923c-c53c-477c-8104-5ac5494ab08d', date_trunc('week', current_date)::date - 63, 48, 52.2, 640000, 'amber'),
  ('e054923c-c53c-477c-8104-5ac5494ab08d', date_trunc('week', current_date)::date - 56, 54, 58.7, 720000, 'amber'),
  ('e054923c-c53c-477c-8104-5ac5494ab08d', date_trunc('week', current_date)::date - 49, 54, 58.7, 720000, 'amber'),
  ('e054923c-c53c-477c-8104-5ac5494ab08d', date_trunc('week', current_date)::date - 42, 51, 55.5, 680000, 'amber'),
  ('e054923c-c53c-477c-8104-5ac5494ab08d', date_trunc('week', current_date)::date - 35, 51, 55.5, 680000, 'amber'),
  ('e054923c-c53c-477c-8104-5ac5494ab08d', date_trunc('week', current_date)::date - 28, 57, 62, 760000, 'green'),
  ('e054923c-c53c-477c-8104-5ac5494ab08d', date_trunc('week', current_date)::date - 21, 55, 59.8, 733000, 'green'),
  ('e054923c-c53c-477c-8104-5ac5494ab08d', date_trunc('week', current_date)::date - 14, 52, 56.6, 693000, 'amber'),
  ('e054923c-c53c-477c-8104-5ac5494ab08d', date_trunc('week', current_date)::date - 7, 55, 59.8, 733000, 'green'),
  ('e054923c-c53c-477c-8104-5ac5494ab08d', date_trunc('week', current_date)::date - 0, 57, 62, 760000, 'green'),
  ('d09f8663-c97d-49e8-b62c-c7cd968b32d8', date_trunc('week', current_date)::date - 77, 71, 75.4, 1748000, 'green'),
  ('d09f8663-c97d-49e8-b62c-c7cd968b32d8', date_trunc('week', current_date)::date - 70, 67, 71.1, 1649000, 'green'),
  ('d09f8663-c97d-49e8-b62c-c7cd968b32d8', date_trunc('week', current_date)::date - 63, 70, 74.3, 1723000, 'green'),
  ('d09f8663-c97d-49e8-b62c-c7cd968b32d8', date_trunc('week', current_date)::date - 56, 72, 76.4, 1772000, 'green'),
  ('d09f8663-c97d-49e8-b62c-c7cd968b32d8', date_trunc('week', current_date)::date - 49, 69, 73.2, 1698000, 'green'),
  ('d09f8663-c97d-49e8-b62c-c7cd968b32d8', date_trunc('week', current_date)::date - 42, 66, 70.1, 1625000, 'green'),
  ('d09f8663-c97d-49e8-b62c-c7cd968b32d8', date_trunc('week', current_date)::date - 35, 70, 74.3, 1723000, 'green'),
  ('d09f8663-c97d-49e8-b62c-c7cd968b32d8', date_trunc('week', current_date)::date - 28, 72, 76.4, 1772000, 'green'),
  ('d09f8663-c97d-49e8-b62c-c7cd968b32d8', date_trunc('week', current_date)::date - 21, 66, 70.1, 1625000, 'green'),
  ('d09f8663-c97d-49e8-b62c-c7cd968b32d8', date_trunc('week', current_date)::date - 14, 66, 70.1, 1625000, 'green'),
  ('d09f8663-c97d-49e8-b62c-c7cd968b32d8', date_trunc('week', current_date)::date - 7, 68, 72.2, 1674000, 'green'),
  ('d09f8663-c97d-49e8-b62c-c7cd968b32d8', date_trunc('week', current_date)::date - 0, 65, 69, 1600000, 'green'),
  ('23d59f90-142d-4f0d-bc2a-cbdb74768a0a', date_trunc('week', current_date)::date - 77, 27, 35, 129000, 'red'),
  ('23d59f90-142d-4f0d-bc2a-cbdb74768a0a', date_trunc('week', current_date)::date - 70, 27, 35, 129000, 'red'),
  ('23d59f90-142d-4f0d-bc2a-cbdb74768a0a', date_trunc('week', current_date)::date - 63, 32, 40.7, 153000, 'red'),
  ('23d59f90-142d-4f0d-bc2a-cbdb74768a0a', date_trunc('week', current_date)::date - 56, 33, 42, 158000, 'red'),
  ('23d59f90-142d-4f0d-bc2a-cbdb74768a0a', date_trunc('week', current_date)::date - 49, 29, 36.9, 138000, 'red'),
  ('23d59f90-142d-4f0d-bc2a-cbdb74768a0a', date_trunc('week', current_date)::date - 42, 32, 40.7, 153000, 'red'),
  ('23d59f90-142d-4f0d-bc2a-cbdb74768a0a', date_trunc('week', current_date)::date - 35, 36, 45.8, 172000, 'amber'),
  ('23d59f90-142d-4f0d-bc2a-cbdb74768a0a', date_trunc('week', current_date)::date - 28, 35, 44.5, 167000, 'amber'),
  ('23d59f90-142d-4f0d-bc2a-cbdb74768a0a', date_trunc('week', current_date)::date - 21, 32, 40.7, 153000, 'red'),
  ('23d59f90-142d-4f0d-bc2a-cbdb74768a0a', date_trunc('week', current_date)::date - 14, 36, 45.8, 172000, 'amber'),
  ('23d59f90-142d-4f0d-bc2a-cbdb74768a0a', date_trunc('week', current_date)::date - 7, 37, 47.1, 177000, 'amber'),
  ('23d59f90-142d-4f0d-bc2a-cbdb74768a0a', date_trunc('week', current_date)::date - 0, 44, 56, 210000, 'amber'),
  ('6f4a8dac-40fa-4017-84f5-69f107b1f8d0', date_trunc('week', current_date)::date - 77, 69, 85, 538000, 'green'),
  ('6f4a8dac-40fa-4017-84f5-69f107b1f8d0', date_trunc('week', current_date)::date - 70, 72, 85, 562000, 'green'),
  ('6f4a8dac-40fa-4017-84f5-69f107b1f8d0', date_trunc('week', current_date)::date - 63, 74, 85, 577000, 'green'),
  ('6f4a8dac-40fa-4017-84f5-69f107b1f8d0', date_trunc('week', current_date)::date - 56, 70, 85, 546000, 'green'),
  ('6f4a8dac-40fa-4017-84f5-69f107b1f8d0', date_trunc('week', current_date)::date - 49, 67, 85, 523000, 'green'),
  ('6f4a8dac-40fa-4017-84f5-69f107b1f8d0', date_trunc('week', current_date)::date - 42, 71, 85, 554000, 'green'),
  ('6f4a8dac-40fa-4017-84f5-69f107b1f8d0', date_trunc('week', current_date)::date - 35, 73, 85, 569000, 'green'),
  ('6f4a8dac-40fa-4017-84f5-69f107b1f8d0', date_trunc('week', current_date)::date - 28, 67, 85, 523000, 'green'),
  ('6f4a8dac-40fa-4017-84f5-69f107b1f8d0', date_trunc('week', current_date)::date - 21, 67, 85, 523000, 'green'),
  ('6f4a8dac-40fa-4017-84f5-69f107b1f8d0', date_trunc('week', current_date)::date - 14, 70, 85, 546000, 'green'),
  ('6f4a8dac-40fa-4017-84f5-69f107b1f8d0', date_trunc('week', current_date)::date - 7, 68, 85, 530000, 'green'),
  ('6f4a8dac-40fa-4017-84f5-69f107b1f8d0', date_trunc('week', current_date)::date - 0, 50, 64, 390000, 'amber'),
  ('b0e77d40-90a8-4f9b-9c29-247d4d9d8890', date_trunc('week', current_date)::date - 77, 53, 85, 117000, 'amber'),
  ('b0e77d40-90a8-4f9b-9c29-247d4d9d8890', date_trunc('week', current_date)::date - 70, 56, 85, 124000, 'green'),
  ('b0e77d40-90a8-4f9b-9c29-247d4d9d8890', date_trunc('week', current_date)::date - 63, 54, 85, 120000, 'amber'),
  ('b0e77d40-90a8-4f9b-9c29-247d4d9d8890', date_trunc('week', current_date)::date - 56, 48, 85, 106000, 'amber'),
  ('b0e77d40-90a8-4f9b-9c29-247d4d9d8890', date_trunc('week', current_date)::date - 49, 49, 85, 109000, 'amber'),
  ('b0e77d40-90a8-4f9b-9c29-247d4d9d8890', date_trunc('week', current_date)::date - 42, 52, 85, 115000, 'amber'),
  ('b0e77d40-90a8-4f9b-9c29-247d4d9d8890', date_trunc('week', current_date)::date - 35, 47, 85, 104000, 'amber'),
  ('b0e77d40-90a8-4f9b-9c29-247d4d9d8890', date_trunc('week', current_date)::date - 28, 43, 78.3, 95000, 'amber'),
  ('b0e77d40-90a8-4f9b-9c29-247d4d9d8890', date_trunc('week', current_date)::date - 21, 45, 82, 100000, 'amber'),
  ('b0e77d40-90a8-4f9b-9c29-247d4d9d8890', date_trunc('week', current_date)::date - 14, 46, 83.8, 102000, 'amber'),
  ('b0e77d40-90a8-4f9b-9c29-247d4d9d8890', date_trunc('week', current_date)::date - 7, 42, 76.5, 93000, 'amber'),
  ('b0e77d40-90a8-4f9b-9c29-247d4d9d8890', date_trunc('week', current_date)::date - 0, 28, 51, 62000, 'red'),
  ('afa75f94-ff07-4ee7-ad0c-aa513da66e48', date_trunc('week', current_date)::date - 77, 44, 63, 178000, 'amber'),
  ('afa75f94-ff07-4ee7-ad0c-aa513da66e48', date_trunc('week', current_date)::date - 70, 47, 67.3, 191000, 'amber'),
  ('afa75f94-ff07-4ee7-ad0c-aa513da66e48', date_trunc('week', current_date)::date - 63, 42, 60.2, 170000, 'amber'),
  ('afa75f94-ff07-4ee7-ad0c-aa513da66e48', date_trunc('week', current_date)::date - 56, 40, 57.3, 162000, 'amber'),
  ('afa75f94-ff07-4ee7-ad0c-aa513da66e48', date_trunc('week', current_date)::date - 49, 44, 63, 178000, 'amber'),
  ('afa75f94-ff07-4ee7-ad0c-aa513da66e48', date_trunc('week', current_date)::date - 42, 44, 63, 178000, 'amber'),
  ('afa75f94-ff07-4ee7-ad0c-aa513da66e48', date_trunc('week', current_date)::date - 35, 39, 55.9, 158000, 'amber'),
  ('afa75f94-ff07-4ee7-ad0c-aa513da66e48', date_trunc('week', current_date)::date - 28, 39, 55.9, 158000, 'amber'),
  ('afa75f94-ff07-4ee7-ad0c-aa513da66e48', date_trunc('week', current_date)::date - 21, 43, 61.6, 174000, 'amber'),
  ('afa75f94-ff07-4ee7-ad0c-aa513da66e48', date_trunc('week', current_date)::date - 14, 41, 58.7, 166000, 'amber'),
  ('afa75f94-ff07-4ee7-ad0c-aa513da66e48', date_trunc('week', current_date)::date - 7, 39, 55.9, 158000, 'amber'),
  ('afa75f94-ff07-4ee7-ad0c-aa513da66e48', date_trunc('week', current_date)::date - 0, 37, 53, 150000, 'amber'),
  ('d2625487-1535-474b-b2c2-866b428fdc65', date_trunc('week', current_date)::date - 77, 62, 85, 133000, 'green'),
  ('d2625487-1535-474b-b2c2-866b428fdc65', date_trunc('week', current_date)::date - 70, 60, 85, 129000, 'green'),
  ('d2625487-1535-474b-b2c2-866b428fdc65', date_trunc('week', current_date)::date - 63, 55, 85, 118000, 'green'),
  ('d2625487-1535-474b-b2c2-866b428fdc65', date_trunc('week', current_date)::date - 56, 56, 85, 120000, 'green'),
  ('d2625487-1535-474b-b2c2-866b428fdc65', date_trunc('week', current_date)::date - 49, 59, 85, 127000, 'green'),
  ('d2625487-1535-474b-b2c2-866b428fdc65', date_trunc('week', current_date)::date - 42, 56, 85, 120000, 'green'),
  ('d2625487-1535-474b-b2c2-866b428fdc65', date_trunc('week', current_date)::date - 35, 52, 85, 112000, 'amber'),
  ('d2625487-1535-474b-b2c2-866b428fdc65', date_trunc('week', current_date)::date - 28, 55, 85, 118000, 'green'),
  ('d2625487-1535-474b-b2c2-866b428fdc65', date_trunc('week', current_date)::date - 21, 56, 85, 120000, 'green'),
  ('d2625487-1535-474b-b2c2-866b428fdc65', date_trunc('week', current_date)::date - 14, 50, 81.8, 108000, 'amber'),
  ('d2625487-1535-474b-b2c2-866b428fdc65', date_trunc('week', current_date)::date - 7, 51, 83.5, 110000, 'amber'),
  ('d2625487-1535-474b-b2c2-866b428fdc65', date_trunc('week', current_date)::date - 0, 33, 54, 71000, 'red'),
  ('5d13674d-c368-49d8-bc29-26aa4d71afd5', date_trunc('week', current_date)::date - 77, 18, 35, 200000, 'red'),
  ('5d13674d-c368-49d8-bc29-26aa4d71afd5', date_trunc('week', current_date)::date - 70, 15, 35, 166000, 'red'),
  ('5d13674d-c368-49d8-bc29-26aa4d71afd5', date_trunc('week', current_date)::date - 63, 15, 35, 166000, 'red'),
  ('5d13674d-c368-49d8-bc29-26aa4d71afd5', date_trunc('week', current_date)::date - 56, 16, 35, 177000, 'red'),
  ('5d13674d-c368-49d8-bc29-26aa4d71afd5', date_trunc('week', current_date)::date - 49, 15, 35, 166000, 'red'),
  ('5d13674d-c368-49d8-bc29-26aa4d71afd5', date_trunc('week', current_date)::date - 42, 15, 35, 166000, 'red'),
  ('5d13674d-c368-49d8-bc29-26aa4d71afd5', date_trunc('week', current_date)::date - 35, 15, 35, 166000, 'red'),
  ('5d13674d-c368-49d8-bc29-26aa4d71afd5', date_trunc('week', current_date)::date - 28, 15, 35, 166000, 'red'),
  ('5d13674d-c368-49d8-bc29-26aa4d71afd5', date_trunc('week', current_date)::date - 21, 15, 35, 166000, 'red'),
  ('5d13674d-c368-49d8-bc29-26aa4d71afd5', date_trunc('week', current_date)::date - 14, 15, 35, 166000, 'red'),
  ('5d13674d-c368-49d8-bc29-26aa4d71afd5', date_trunc('week', current_date)::date - 7, 11, 35, 122000, 'red'),
  ('5d13674d-c368-49d8-bc29-26aa4d71afd5', date_trunc('week', current_date)::date - 0, 55, 60, 610000, 'green'),
  ('ebfd836d-27ce-449e-8d23-ed09e62661c9', date_trunc('week', current_date)::date - 77, 26, 35, 121000, 'red'),
  ('ebfd836d-27ce-449e-8d23-ed09e62661c9', date_trunc('week', current_date)::date - 70, 24, 35, 111000, 'red'),
  ('ebfd836d-27ce-449e-8d23-ed09e62661c9', date_trunc('week', current_date)::date - 63, 28, 35, 130000, 'red'),
  ('ebfd836d-27ce-449e-8d23-ed09e62661c9', date_trunc('week', current_date)::date - 56, 33, 35, 153000, 'red'),
  ('ebfd836d-27ce-449e-8d23-ed09e62661c9', date_trunc('week', current_date)::date - 49, 31, 35, 144000, 'red'),
  ('ebfd836d-27ce-449e-8d23-ed09e62661c9', date_trunc('week', current_date)::date - 42, 30, 35, 139000, 'red'),
  ('ebfd836d-27ce-449e-8d23-ed09e62661c9', date_trunc('week', current_date)::date - 35, 36, 37.3, 167000, 'amber'),
  ('ebfd836d-27ce-449e-8d23-ed09e62661c9', date_trunc('week', current_date)::date - 28, 39, 40.4, 181000, 'amber'),
  ('ebfd836d-27ce-449e-8d23-ed09e62661c9', date_trunc('week', current_date)::date - 21, 36, 37.3, 167000, 'amber'),
  ('ebfd836d-27ce-449e-8d23-ed09e62661c9', date_trunc('week', current_date)::date - 14, 37, 38.3, 172000, 'amber'),
  ('ebfd836d-27ce-449e-8d23-ed09e62661c9', date_trunc('week', current_date)::date - 7, 41, 42.5, 190000, 'amber'),
  ('ebfd836d-27ce-449e-8d23-ed09e62661c9', date_trunc('week', current_date)::date - 0, 56, 58, 260000, 'green');

-- ==========================================================================
-- tasks (12): 3 overdue, rest split between in_progress and done
-- ==========================================================================
insert into public.tasks (title, kind, trader_id, assignee_id, due_date, status)
values
  ('Проробити форвардери на виплати', 'daily', '5d13674d-c368-49d8-bc29-26aa4d71afd5', (select id from _seed_people where slot = 'manager3'), current_date - 3, 'done'),
  ('Перевірити виписки', 'weekly', '79b65cf1-bfb1-4dd8-ae18-93a12e0d915f', (select id from _seed_people where slot = 'manager2'), current_date + 2, 'in_progress'),
  ('Підняти CR по команді на 5пп', 'monthly', null, (select id from _seed_people where slot = 'manager1'), current_date + 20, 'in_progress'),
  ('Підключити 2 нові банки для виплат', 'monthly', null, (select id from _seed_people where slot = 'lead1'), current_date + 25, 'in_progress'),
  ('Повернути в роботу', 'daily', 'd2625487-1535-474b-b2c2-866b428fdc65', (select id from _seed_people where slot = 'manager2'), current_date - 2, 'overdue'),
  ('Працювати над дисципліною виписок', 'weekly', '6f4a8dac-40fa-4017-84f5-69f107b1f8d0', (select id from _seed_people where slot = 'manager2'), current_date + 3, 'in_progress'),
  ('Перевірити виписки', 'daily', 'b0e77d40-90a8-4f9b-9c29-247d4d9d8890', (select id from _seed_people where slot = 'manager3'), current_date - 4, 'overdue'),
  ('Повернути в роботу', 'daily', '73737dc2-16e6-4441-993c-29ebfeb50185', (select id from _seed_people where slot = 'manager1'), current_date - 1, 'overdue'),
  ('Проробити форвардери на виплати', 'weekly', '415c2602-9c66-41b6-ab9c-ac423c44f0d6', (select id from _seed_people where slot = 'manager3'), current_date - 5, 'done'),
  ('Підняти CR по команді на 5пп', 'monthly', null, (select id from _seed_people where slot = 'manager2'), current_date + 15, 'in_progress'),
  ('Перевірити виписки', 'weekly', '4002d8a2-da1c-4942-befa-c0b12a00b678', (select id from _seed_people where slot = 'manager3'), current_date - 6, 'done'),
  ('Працювати над дисципліною виписок', 'weekly', null, (select id from _seed_people where slot = 'lead1'), current_date - 2, 'done');

-- ==========================================================================
-- interactions (40): notes / calls / status changes / closed tasks,
-- spread across the last 3 weeks
-- ==========================================================================
insert into public.interactions (trader_id, author_id, kind, body, created_at)
values
  ('415c2602-9c66-41b6-ab9c-ac423c44f0d6', (select id from _seed_people where slot = 'manager3'), 'call', 'дзвонив, обіцяв вийти на зміну завтра', now() - interval '1 days'),
  ('73737dc2-16e6-4441-993c-29ebfeb50185', (select id from _seed_people where slot = 'manager1'), 'note', 'не виходить на зв''язок третій день', now() - interval '2 days'),
  ('73737dc2-16e6-4441-993c-29ebfeb50185', (select id from _seed_people where slot = 'manager1'), 'call', 'не піднімає слухавку, спробуємо через телеграм', now() - interval '4 days'),
  ('73737dc2-16e6-4441-993c-29ebfeb50185', (select id from _seed_people where slot = 'manager1'), 'status_change', 'статус змінено на red через відсутність активності', now() - interval '5 days'),
  ('79b65cf1-bfb1-4dd8-ae18-93a12e0d915f', (select id from _seed_people where slot = 'manager2'), 'note', 'виписки подає нерегулярно, попередили про наслідки', now() - interval '1 days'),
  ('79b65cf1-bfb1-4dd8-ae18-93a12e0d915f', (select id from _seed_people where slot = 'manager2'), 'call', 'телефонував, домовились про графік на наступний тиждень', now() - interval '6 days'),
  ('4002d8a2-da1c-4942-befa-c0b12a00b678', (select id from _seed_people where slot = 'manager3'), 'note', 'виписки подає нерегулярно, попередили про наслідки', now() - interval '3 days'),
  ('4002d8a2-da1c-4942-befa-c0b12a00b678', (select id from _seed_people where slot = 'manager3'), 'task_closed', 'закрив задачу «перевірити виписки»', now() - interval '6 days'),
  ('dfa4da4e-dc67-4947-9365-71051758946e', (select id from _seed_people where slot = 'manager1'), 'note', 'пояснив падіння обороту сезонним фактором', now() - interval '2 days'),
  ('e054923c-c53c-477c-8104-5ac5494ab08d', (select id from _seed_people where slot = 'manager2'), 'note', 'показав хороші результати цього тижня, відмітили в чаті команди', now() - interval '8 days'),
  ('d09f8663-c97d-49e8-b62c-c7cd968b32d8', (select id from _seed_people where slot = 'manager3'), 'note', 'показав хороші результати цього тижня, відмітили в чаті команди', now() - interval '9 days'),
  ('23d59f90-142d-4f0d-bc2a-cbdb74768a0a', (select id from _seed_people where slot = 'manager1'), 'call', 'зателефонував сам, уточнював по новому банку', now() - interval '3 days'),
  ('6f4a8dac-40fa-4017-84f5-69f107b1f8d0', (select id from _seed_people where slot = 'manager2'), 'note', 'просить додатковий гейт, бо старий часто лежить', now() - interval '1 days'),
  ('6f4a8dac-40fa-4017-84f5-69f107b1f8d0', (select id from _seed_people where slot = 'manager2'), 'call', 'не піднімає слухавку, спробуємо через телеграм', now() - interval '2 days'),
  ('6f4a8dac-40fa-4017-84f5-69f107b1f8d0', (select id from _seed_people where slot = 'manager2'), 'status_change', 'статус змінено на amber, потрібен контроль щотижня', now() - interval '5 days'),
  ('b0e77d40-90a8-4f9b-9c29-247d4d9d8890', (select id from _seed_people where slot = 'manager3'), 'note', 'не виходить на зв''язок третій день', now() - interval '1 days'),
  ('b0e77d40-90a8-4f9b-9c29-247d4d9d8890', (select id from _seed_people where slot = 'manager3'), 'call', 'не піднімає слухавку, спробуємо через телеграм', now() - interval '3 days'),
  ('b0e77d40-90a8-4f9b-9c29-247d4d9d8890', (select id from _seed_people where slot = 'manager3'), 'status_change', 'статус змінено на red через відсутність активності', now() - interval '7 days'),
  ('afa75f94-ff07-4ee7-ad0c-aa513da66e48', (select id from _seed_people where slot = 'manager1'), 'note', 'поскаржився на низьку конверсію нового банку', now() - interval '4 days'),
  ('d2625487-1535-474b-b2c2-866b428fdc65', (select id from _seed_people where slot = 'manager2'), 'note', 'не виходить на зв''язок третій день', now() - interval '1 days'),
  ('d2625487-1535-474b-b2c2-866b428fdc65', (select id from _seed_people where slot = 'manager2'), 'call', 'не піднімає слухавку, спробуємо через телеграм', now() - interval '2 days'),
  ('d2625487-1535-474b-b2c2-866b428fdc65', (select id from _seed_people where slot = 'manager2'), 'note', 'скаржиться на затримки в банку, ескалювали в підтримку', now() - interval '10 days'),
  ('d2625487-1535-474b-b2c2-866b428fdc65', (select id from _seed_people where slot = 'manager2'), 'status_change', 'статус змінено на red через відсутність активності', now() - interval '11 days'),
  ('5d13674d-c368-49d8-bc29-26aa4d71afd5', (select id from _seed_people where slot = 'manager3'), 'call', 'провели дзвінок щодо форвардерів, погодився підключити', now() - interval '2 days'),
  ('5d13674d-c368-49d8-bc29-26aa4d71afd5', (select id from _seed_people where slot = 'manager3'), 'note', 'пояснив вплив рейтингу на трафік, погодився включити форвардери', now() - interval '3 days'),
  ('5d13674d-c368-49d8-bc29-26aa4d71afd5', (select id from _seed_people where slot = 'manager3'), 'task_closed', 'закрив задачу «проробити форвардери на виплати»', now() - interval '2 days'),
  ('5d13674d-c368-49d8-bc29-26aa4d71afd5', (select id from _seed_people where slot = 'manager3'), 'status_change', 'переведено з bronze на silver за результатами тижня', now() - interval '12 days'),
  ('bcf91662-3210-4fb0-b5fd-c4cc75cd7ab3', (select id from _seed_people where slot = 'manager1'), 'note', 'показав хороші результати цього тижня, відмітили в чаті команди', now() - interval '5 days'),
  ('bcf91662-3210-4fb0-b5fd-c4cc75cd7ab3', (select id from _seed_people where slot = 'manager1'), 'call', 'коротка розмова, підтвердив готовність працювати за нових умов', now() - interval '10 days'),
  ('26d4a7f4-20e9-4438-bdd6-df827043de9a', (select id from _seed_people where slot = 'manager1'), 'note', 'запросив підвищення ліміту, розглядаємо разом з лідом', now() - interval '6 days'),
  ('5a1985d4-6ec2-4730-a47b-49ed213225cd', (select id from _seed_people where slot = 'manager2'), 'call', 'додзвонились з другої спроби, все ок', now() - interval '4 days'),
  ('e2789360-a469-4324-ae01-f440c3103b92', (select id from _seed_people where slot = 'manager2'), 'note', 'просив відстрочку по виплатах, узгодили новий графік', now() - interval '7 days'),
  ('ebfd836d-27ce-449e-8d23-ed09e62661c9', (select id from _seed_people where slot = 'manager1'), 'note', 'показав хороші результати цього тижня, відмітили в чаті команди', now() - interval '3 days'),
  ('ebfd836d-27ce-449e-8d23-ed09e62661c9', (select id from _seed_people where slot = 'manager1'), 'task_closed', 'закрив задачу «працювати над дисципліною виписок»', now() - interval '4 days'),
  ('415c2602-9c66-41b6-ab9c-ac423c44f0d6', (select id from _seed_people where slot = 'manager3'), 'note', 'скаржиться на затримки в банку, ескалювали в підтримку', now() - interval '9 days'),
  ('79b65cf1-bfb1-4dd8-ae18-93a12e0d915f', (select id from _seed_people where slot = 'manager2'), 'status_change', 'статус змінено на amber, потрібен контроль щотижня', now() - interval '13 days'),
  ('e054923c-c53c-477c-8104-5ac5494ab08d', (select id from _seed_people where slot = 'manager2'), 'call', 'зателефонував сам, уточнював по новому банку', now() - interval '14 days'),
  ('23d59f90-142d-4f0d-bc2a-cbdb74768a0a', (select id from _seed_people where slot = 'manager1'), 'note', 'виписки подає нерегулярно, попередили про наслідки', now() - interval '15 days'),
  ('dfa4da4e-dc67-4947-9365-71051758946e', (select id from _seed_people where slot = 'manager1'), 'call', 'телефонував, домовились про графік на наступний тиждень', now() - interval '16 days'),
  ('d09f8663-c97d-49e8-b62c-c7cd968b32d8', (select id from _seed_people where slot = 'manager3'), 'call', 'коротка розмова, підтвердив готовність працювати за нових умов', now() - interval '17 days');

-- ==========================================================================
-- news (4), all from the team lead
-- ==========================================================================
insert into public.news (author_id, title, body)
values
  (
    (select id from _seed_people where slot = 'lead1'),
    'Тимчасове відключення Airtel',
    'Через нестабільні шлюзи тимчасово відключаємо прийом з Airtel. Форвардери, що йдуть через цей канал, будуть повертатись — попередьте трейдерів заздалегідь, щоб не скаржились на відхилення.'
  ),
  (
    (select id from _seed_people where slot = 'lead1'),
    'Національне свято в Індії — просідання трафіку',
    'Найближчими днями в Індії національне свято, очікуємо помітне просідання трафіку по всій команді. Це нормально, в KPI за цей тиждень буде враховано.'
  ),
  (
    (select id from _seed_people where slot = 'lead1'),
    'Підключили новий банк',
    'З сьогодні доступний новий банк для прийому та виплат. Додайте його трейдерам з високим оборотом в першу чергу — це має підняти CR тим, хто зараз впирається в ліміти.'
  ),
  (
    (select id from _seed_people where slot = 'lead1'),
    'Змінили правила завантаження виписок',
    'Виписки тепер приймаємо тільки у форматі PDF з видимим номером рахунку на кожній сторінці. Старий формат з 1 числа наступного місяця приймати не будемо — попередьте свою команду завчасно.'
  );

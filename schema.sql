-- ========================================================
-- 我的學習紀錄 (My Learning Records) - Supabase 資料庫建置指令
-- 說明：請直接複製本檔案的全部內容，至 Supabase 控制台的 SQL Editor 中執行 (Run)。
-- ========================================================

-- 1. 建立學習紀錄資料表 (learning_logs)
create table if not exists public.learning_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid() not null,
  log_date date not null default current_date,
  topic text not null,
  minutes integer not null check (minutes > 0),
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 若資料表已存在，自動補齊缺少欄位
alter table public.learning_logs add column if not exists log_date date default current_date;
alter table public.learning_logs add column if not exists topic text;
alter table public.learning_logs add column if not exists minutes integer;
alter table public.learning_logs add column if not exists note text;

-- 2. 針對 user_id 與 log_date 建立索引以提升查詢效能
create index if not exists idx_learning_logs_user_id on public.learning_logs(user_id);
create index if not exists idx_learning_logs_date on public.learning_logs(log_date desc);
create index if not exists idx_learning_logs_created_at on public.learning_logs(created_at desc);

-- 3. 授予已登入身分存取權限
grant all on table public.learning_logs to authenticated;
grant all on table public.learning_logs to service_role;

-- 4. 啟用資料列安全機制 (Row Level Security, RLS)
alter table public.learning_logs enable row level security;

-- 5. 清理可能存在的舊政策 (避免重複執行時報錯)
drop policy if exists "使用者僅能查看自己的學習紀錄" on public.learning_logs;
drop policy if exists "使用者僅能新增自己的學習紀錄" on public.learning_logs;
drop policy if exists "使用者僅能更新自己的學習紀錄" on public.learning_logs;
drop policy if exists "使用者僅能刪除自己的學習紀錄" on public.learning_logs;

-- 6. 建立 RLS 存取控制政策：僅允許已登入 (authenticated) 的使用者存取與操作自己的紀錄

-- [查詢 SELECT]：使用者只能讀取 user_id 與自己 UID 相符的紀錄
create policy "使用者僅能查看自己的學習紀錄"
  on public.learning_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

-- [新增 INSERT]：使用者只能新增 user_id 為自己 UID 的紀錄
create policy "使用者僅能新增自己的學習紀錄"
  on public.learning_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- [更新 UPDATE]：使用者只能更新屬於自己的紀錄
create policy "使用者僅能更新自己的學習紀錄"
  on public.learning_logs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- [刪除 DELETE]：使用者只能刪除屬於自己的紀錄
create policy "使用者僅能刪除自己的學習紀錄"
  on public.learning_logs
  for delete
  to authenticated
  using (auth.uid() = user_id);

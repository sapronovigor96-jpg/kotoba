-- Котоба Сампо: профили и прогресс. Вставить целиком в Supabase → SQL Editor → Run.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.kotoba_profiles (
  name text primary key check (name in ('igor','masha')),
  pin_hash text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
-- прямой доступ закрыт: без политик RLS таблицу нельзя читать и менять по публичному ключу
alter table public.kotoba_profiles enable row level security;

-- вход: при первом входе PIN запоминается, дальше проверяется
create or replace function public.kotoba_login(p_name text, p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r public.kotoba_profiles;
begin
  if p_name not in ('igor','masha') then raise exception 'unknown profile'; end if;
  if length(coalesce(p_pin,'')) < 4 then raise exception 'pin too short'; end if;
  select * into r from public.kotoba_profiles where name = p_name;
  if not found then
    insert into public.kotoba_profiles(name, pin_hash) values (p_name, crypt(p_pin, gen_salt('bf'))) returning * into r;
  elsif r.pin_hash <> crypt(p_pin, r.pin_hash) then
    perform pg_sleep(1);
    raise exception 'wrong pin';
  end if;
  return jsonb_build_object('data', r.data, 'updated_at', r.updated_at);
end $$;

-- сохранение прогресса
create or replace function public.kotoba_save(p_name text, p_pin text, p_data jsonb)
returns timestamptz language plpgsql security definer set search_path = public, extensions as $$
declare r public.kotoba_profiles; t timestamptz := now();
begin
  select * into r from public.kotoba_profiles where name = p_name;
  if not found or r.pin_hash <> crypt(p_pin, r.pin_hash) then raise exception 'wrong pin'; end if;
  if octet_length(p_data::text) > 5000000 then raise exception 'too big'; end if;
  update public.kotoba_profiles set data = p_data, updated_at = t where name = p_name;
  return t;
end $$;

revoke all on function public.kotoba_login(text,text) from public;
revoke all on function public.kotoba_save(text,text,jsonb) from public;
grant execute on function public.kotoba_login(text,text) to anon;
grant execute on function public.kotoba_save(text,text,jsonb) to anon;

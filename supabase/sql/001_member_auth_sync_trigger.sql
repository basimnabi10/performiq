-- Links a newly-activated Supabase auth user to the pre-existing Member row
-- created by the invite flow (actions/members.ts calls
-- supabaseAdmin.auth.admin.inviteUserByEmail AFTER creating the Member with
-- status='invited'). Run once via the Supabase SQL editor or CLI — this is
-- not managed by Prisma migrations since Prisma cannot touch the `auth`
-- schema.
create or replace function public.handle_auth_user_created()
returns trigger as $$
begin
  update public."Member"
  set "authUserId" = new.id,
      status = 'active'
  where email = new.email
    and "authUserId" is null;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_auth_user_created();

-- Rendimiento del chat + aviso en tiempo real de matches nuevos.
--
-- 1) Las políticas de messages llamaban a is_conversation_participant() POR CADA FILA
--    (abrir un chat de 200 mensajes = 200 llamadas, cada una con joins). Ahora se calcula
--    una sola vez por consulta el conjunto de conversaciones del usuario.
-- 2) matches se publica en Realtime: el alumno recibe el match apenas el profesor acepta
--    (para mostrar la animación). RLS limita los eventos a los participantes.

-- Conversaciones del usuario actual (sin las que tienen un bloqueo de por medio).
create function public.my_conversation_ids()
returns setof bigint
language sql stable security definer set search_path = '' as $$
  select c.id
  from public.conversations c
  join public.matches m on m.id = c.match_id
  where (select auth.uid()) in (m.user_one_id, m.user_two_id)
    and not public.is_blocked_with(
      case when m.user_one_id = (select auth.uid()) then m.user_two_id else m.user_one_id end
    );
$$;

revoke execute on function public.my_conversation_ids() from public, anon;
grant execute on function public.my_conversation_ids() to authenticated;

-- "x in (select f())" se evalúa una vez por consulta (hashed subplan), no una vez por fila.
drop policy "messages: ver de mis conversaciones" on public.messages;
create policy "messages: ver de mis conversaciones" on public.messages for select to authenticated
  using (conversation_id in (select public.my_conversation_ids()));

drop policy "messages: enviar en mis conversaciones" on public.messages;
create policy "messages: enviar en mis conversaciones" on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and conversation_id in (select public.my_conversation_ids())
  );

drop policy "messages: marcar leídos los recibidos" on public.messages;
create policy "messages: marcar leídos los recibidos" on public.messages for update to authenticated
  using (sender_id <> (select auth.uid()) and conversation_id in (select public.my_conversation_ids()))
  with check (sender_id <> (select auth.uid()) and conversation_id in (select public.my_conversation_ids()));

drop policy "conversations: ver propias" on public.conversations;
create policy "conversations: ver propias" on public.conversations for select to authenticated
  using (id in (select public.my_conversation_ids()));

alter publication supabase_realtime add table public.matches;

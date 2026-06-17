-- Indexes to speed up conversation and message pagination queries
create index if not exists idx_conversations_updated_at_desc
  on conversations(updated_at desc);

create index if not exists idx_conversation_participants_user_conversation
  on conversation_participants(user_id, conversation_id);

create index if not exists idx_messages_conversation_created_at_desc
  on messages(conversation_id, created_at desc);

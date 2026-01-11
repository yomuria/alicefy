// frontend/SocialService.js
import { createClient } from "@supabase/supabase-js";

// Используем тот же клиент, что и в App.jsx
export const SocialService = {
  // Регистрация/Обновление пользователя при входе
  async initUser(userId, username = "User", avatar = "") {
    const { error } = await supabase.from("users").upsert({
      id: userId,
      username: username,
      avatar_url: avatar,
      last_seen: new Date(),
    });
  },

  // Поиск пользователей
  async searchUsers(query, currentUserId) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .ilike("username", `%${query}%`)
      .neq("id", currentUserId)
      .limit(10);
    return data || [];
  },

  // Отправить запрос в друзья
  async addFriend(currentUserId, targetUserId) {
    return await supabase.from("friendships").insert({
      requester_id: currentUserId,
      receiver_id: targetUserId,
      status: "pending",
    });
  },

  // Получить список друзей
  async getFriends(userId) {
    // Упрощенный запрос: ищем принятые заявки
    const { data } = await supabase
      .from("friendships")
      .select("*, requester:users!requester_id(*), receiver:users!receiver_id(*)")
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("status", "accepted");

    // Форматируем данные, чтобы получить "собеседника"
    return data.map((f) => {
      const isRequester = f.requester_id === userId;
      return isRequester ? f.receiver : f.requester;
    });
  },

  // Отправить сообщение (текст или трек)
  async sendMessage(senderId, receiverId, content, type = "text", trackData = null) {
    return await supabase.from("messages").insert({
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      type,
      track_data: trackData,
    });
  },
  
  // Поставить реакцию (обновляем JSONB поле)
  async reactToMessage(msgId, userId, emoji) {
     // Сначала получаем текущие реакции, потом обновляем (упрощенно)
     // В реальном проекте лучше использовать RPC функцию SQL для атомарности
     const { data } = await supabase.from('messages').select('reactions').eq('id', msgId).single();
     const newReactions = { ...data.reactions, [userId]: emoji };
     
     await supabase.from('messages').update({ reactions: newReactions }).eq('id', msgId);
  }
};
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../login/AuthProvider";
import {
  Send,
  Paperclip,
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
  Smile,
} from "lucide-react";

const Chat = () => {
  const { contactId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationSound, setNotificationSound] = useState(null);

  // Add this useEffect for notification setup
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if (Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        setNotificationsEnabled(permission === "granted");
      } else {
        setNotificationsEnabled(true);
      }

      if ("Notification" in window && "sound" in Notification.prototype) {
        // Modern browsers with notification sound support
      } else {
        try {
          const sound = new Audio(
            "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLHPR7tF/NgIbWbvq54VGCBNP4vLceUQNDUDt+OV8TBIMOvb8432AXBQFHwABA4BvXxj6CQgOf5hpGOcVFhJ7p2UZ1CAiKnypdxrMKik8eHN1H6AvN05tbhsnk1ZSfZRqG3ZVVFZ1nWsUWHhcRJaHYhoSomlezq97FC3EhGd+rYIXKNOVgXaofBItxYxmhJt5GjjDiWWWnXsVR72JabWWdxJRwpBwf5iFDm8WAwIBr5N2HHoVCgSXlHMfjyIcHIeachWJLDZEeJ9gE3Q7WG1tsUkPxTUzWhUBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB"
          );
          setNotificationSound(sound);
        } catch (err) {
          console.error("Could not create audio element:", err);
        }
      }
    };

    requestNotificationPermission();
  }, []);

  // Fetch contact details
  useEffect(() => {
    if (!user || !contactId) return;

    const fetchContact = async () => {
      try {
        // First, try to fetch by contact_user_id (the actual user being contacted)
        let { data, error } = await supabase
          .from("contacts")
          .select("*")
          .eq("contact_user_id", contactId)
          .eq("user_id", user.id)
          .maybeSingle();

        // If not found, try by the id field
        if (!data && !error) {
          const result = await supabase
            .from("contacts")
            .select("*")
            .eq("id", contactId)
            .eq("user_id", user.id)
            .maybeSingle();

          data = result.data;
          error = result.error;
        }

        // If still not found, try fetching the user directly from users table
        if (!data && !error) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", contactId)
            .maybeSingle();

          if (userData) {
            // Create a contact object from user data
            data = {
              id: userData.id,
              contact_user_id: userData.id,
              user_id: user.id,
              name: userData.username || userData.email,
              username: userData.username,
              profile_image_url: userData.profile_image_url,
              email: userData.email,
            };
          } else {
            error = userError;
          }
        }

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        if (!data) {
          console.error("Contact not found or access denied");
          navigate("/chats");
          return;
        }

        console.log("Fetched contact:", data);
        setContact(data);
      } catch (error) {
        console.error("Error fetching contact:", error);
        navigate("/chats");
      }
    };
    fetchContact();
  }, [contactId, user, navigate]);

  // Fetch messages
  useEffect(() => {
    if (!user || !contact) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(`sender_id.eq.${user.id},sender_id.eq.${contact.contact_user_id}`)
          .or(
            `receiver_id.eq.${user.id},receiver_id.eq.${contact.contact_user_id}`
          )
          .order("created_at", { ascending: true });

        if (error) throw error;

        const filteredMessages = data.filter(
          (msg) =>
            (msg.sender_id === user.id &&
              msg.receiver_id === contact.contact_user_id) ||
            (msg.sender_id === contact.contact_user_id &&
              msg.receiver_id === user.id)
        );

        const unreadMessages = filteredMessages.filter(
          (msg) => msg.receiver_id === user.id && !msg.is_read
        );

        if (unreadMessages.length > 0) {
          await supabase
            .from("messages")
            .update({ is_read: true })
            .in(
              "id",
              unreadMessages.map((msg) => msg.id)
            );
        }

        setMessages(filteredMessages || []);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    const typingSubscription = supabase
      .channel(`typing-${user.id}-${contact.contact_user_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_status",
          filter: `user_id=eq.${contact.contact_user_id}`,
        },
        (payload) => {
          console.log("Typing status update:", payload);
          if (payload.new && payload.new.chat_with_user_id === user.id) {
            setIsTyping(payload.new.is_typing);
          }
        }
      )
      .subscribe();

    const messageSubscription = supabase
      .channel(`messages-${user.id}-${contact.contact_user_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Received new message:", payload.new);

          if (payload.new.sender_id === contact.contact_user_id) {
            setMessages((prevMessages) => {
              const messageExists = prevMessages.some(
                (msg) => msg.id === payload.new.id
              );
              if (messageExists) return prevMessages;
              return [...prevMessages, payload.new];
            });

            if (document.hidden && notificationsEnabled) {
              if (notificationSound) {
                notificationSound
                  .play()
                  .catch((e) => console.log("Error playing sound:", e));
              }

              try {
                new Notification(`New message from ${contact.name}`, {
                  body: payload.new.content,
                  icon: contact.profile_image_url || "/default-avatar.png",
                  silent: false,
                });
              } catch (err) {
                console.error("Notification error:", err);
              }
            }

            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", payload.new.id)
              .then(({ error }) => {
                if (error)
                  console.error("Error marking message as read:", error);
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
      supabase.removeChannel(typingSubscription);
    };
  }, [user, contact, notificationSound, notificationsEnabled]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !contact) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          receiver_id: contact.contact_user_id,
          content: newMessage,
          is_read: false,
        })
        .select();

      if (error) throw error;

      console.log("New message data:", data[0]);

      setMessages((prev) => [...prev, data[0]]);

      await updateChatSession(newMessage);

      updateTypingStatus(false);

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const updateChatSession = async (lastMessage) => {
    try {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .or(
          `user1_id.eq.${contact.contact_user_id},user2_id.eq.${contact.contact_user_id}`
        );

      if (error) {
        console.error("Error checking chat session:", error);
        return;
      }

      const relevantSession = data
        ? data.find(
            (session) =>
              (session.user1_id === user.id &&
                session.user2_id === contact.contact_user_id) ||
              (session.user1_id === contact.contact_user_id &&
                session.user2_id === user.id)
          )
        : null;

      const sessionData = {
        last_message: lastMessage,
        last_message_time: new Date().toISOString(),
        is_active: true,
      };

      if (relevantSession) {
        const { error: updateError } = await supabase
          .from("chat_sessions")
          .update(sessionData)
          .eq("id", relevantSession.id);

        if (updateError) {
          console.error("Error updating chat session:", updateError);
        }
      } else {
        const { error: insertError } = await supabase
          .from("chat_sessions")
          .insert({
            id: crypto.randomUUID(),
            user1_id: user.id,
            user2_id: contact.contact_user_id,
            ...sessionData,
          });

        if (insertError) {
          console.error("Error creating chat session:", insertError);
        }
      }
    } catch (error) {
      console.error("Error updating chat session:", error);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    updateTypingStatus(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
  };

  const updateTypingStatus = async (isTyping) => {
    if (!contact || !user) return;

    try {
      const { data: existingRecords, error: fetchError } = await supabase
        .from("typing_status")
        .select("*")
        .eq("user_id", user.id)
        .eq("chat_with_user_id", contact.contact_user_id);

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error fetching typing status:", fetchError);
        return;
      }

      if (existingRecords && existingRecords.length > 1) {
        const keepId = existingRecords[0].id;
        const idsToDelete = existingRecords
          .filter((record, index) => index > 0)
          .map((record) => record.id);

        if (idsToDelete.length > 0) {
          await supabase.from("typing_status").delete().in("id", idsToDelete);
        }

        const { error: updateError } = await supabase
          .from("typing_status")
          .update({
            is_typing: isTyping,
            last_updated: new Date().toISOString(),
          })
          .eq("id", keepId);

        if (updateError)
          console.error("Error updating typing status:", updateError);
      } else if (existingRecords && existingRecords.length === 1) {
        const { error: updateError } = await supabase
          .from("typing_status")
          .update({
            is_typing: isTyping,
            last_updated: new Date().toISOString(),
          })
          .eq("id", existingRecords[0].id);

        if (updateError)
          console.error("Error updating typing status:", updateError);
      } else {
        const { error: insertError } = await supabase
          .from("typing_status")
          .insert({
            id: crypto.randomUUID(),
            user_id: user.id,
            chat_with_user_id: contact.contact_user_id,
            is_typing: isTyping,
            last_updated: new Date().toISOString(),
          });

        if (insertError) {
          console.error("Error inserting typing status:", insertError);
        }
      }
    } catch (error) {
      console.error("Error updating typing status:", error);
    }
  };

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 flex-1">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 mt-4">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#efeae2] flex-1">
      {/* Chat Header - WhatsApp Style */}
      <div className="bg-[#f0f2f5] shadow-sm border-b border-gray-200 mt-16">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => navigate("/messages")}
            className="mr-3 p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>

          <div
            className="flex items-center flex-1 cursor-pointer"
            onClick={() => navigate(`/contacts/${contactId}`)}
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-300">
                {contact.profile_image_url ? (
                  <img
                    src={contact.profile_image_url}
                    alt={contact.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white bg-teal-600 font-semibold">
                    {contact.name ? contact.name.charAt(0).toUpperCase() : "?"}
                  </div>
                )}
              </div>
            </div>

            <div className="ml-3">
              <div className="font-semibold text-gray-900 text-base">
                {contact.name}
              </div>
              <div className="text-xs text-gray-500">
                {isTyping ? (
                  <span className="text-teal-600 font-medium">typing...</span>
                ) : (
                  contact.username && `@${contact.username}`
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <Video className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <Phone className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Messages - WhatsApp Background Pattern */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%23d9d9d9' fill-opacity='0.05'/%3E%3C/svg%3E")`,
          backgroundColor: "#efeae2",
        }}
      >
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="bg-white rounded-full p-6 shadow-md mb-4">
              <svg
                className="w-16 h-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-gray-600 text-lg">No messages yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Say hello to start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => {
              const isMyMessage = message.sender_id === user.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${
                    isMyMessage ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`relative max-w-xs md:max-w-md px-3 py-2 rounded-lg shadow ${
                      isMyMessage
                        ? "bg-[#d9fdd3] rounded-br-none"
                        : "bg-white rounded-bl-none"
                    }`}
                  >
                    <p className="text-gray-800 text-sm leading-relaxed break-words">
                      {message.content}
                    </p>
                    <div className="flex items-center justify-end mt-1 space-x-1">
                      <span className="text-[10px] text-gray-500">
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isMyMessage && (
                        <span className="inline-flex">
                          {message.is_read ? (
                            <svg
                              className="w-4 h-4 text-blue-500"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm-7.75 7.75L6.8 11.3l-1.4 1.4 4.85 4.85 10.35-10.35-1.4-1.4-8.95 8.95z" />
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4 text-gray-400"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input - WhatsApp Style */}
      <div className="bg-[#f0f2f5] px-4 py-3">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <button
            type="button"
            className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors mb-1"
          >
            <Smile className="w-6 h-6" />
          </button>

          <button
            type="button"
            className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors mb-1"
          >
            <Paperclip className="w-6 h-6" />
          </button>

          <div className="flex-1 bg-white rounded-full shadow-sm">
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder="Type a message"
              className="w-full px-5 py-3 bg-transparent text-gray-800 focus:outline-none text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={!newMessage.trim()}
            className={`p-3 rounded-full transition-all shadow-md mb-1 ${
              newMessage.trim()
                ? "bg-teal-600 hover:bg-teal-700 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;

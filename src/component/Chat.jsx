import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../login/AuthProvider";

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
    // Request notification permission
    const requestNotificationPermission = async () => {
      if (Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        setNotificationsEnabled(permission === "granted");
      } else {
        setNotificationsEnabled(true);
      }

      // Use default system notification sound
      if ("Notification" in window && "sound" in Notification.prototype) {
        // Modern browsers with notification sound support
        // No need to set a custom sound
      } else {
        // Fallback for browsers that need a sound object
        try {
          // Create a short beep sound as fallback
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
        const { data, error } = await supabase
          .from("contacts")
          .select("*")
          .eq("id", contactId)
          .eq("user_id", user.id)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            // Contact not found or doesn't belong to this user
            console.error("Contact not found or access denied");
            navigate("/chats"); // Redirect to chats list
            return;
          }
          throw error;
        }

        setContact(data);
      } catch (error) {
        console.error("Error fetching contact:", error);
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

        // Fetch messages between current user and contact
        // Using filter patterns that work with Supabase's PostgREST API
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(`sender_id.eq.${user.id},sender_id.eq.${contact.contact_user_id}`)
          .or(
            `receiver_id.eq.${user.id},receiver_id.eq.${contact.contact_user_id}`
          )
          .order("created_at", { ascending: true });

        if (error) throw error;

        // Filter to only include messages between these two users
        const filteredMessages = data.filter(
          (msg) =>
            (msg.sender_id === user.id &&
              msg.receiver_id === contact.contact_user_id) ||
            (msg.sender_id === contact.contact_user_id &&
              msg.receiver_id === user.id)
        );

        // Mark unread messages as read
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
          event: "*", // Listen for all events (INSERT, UPDATE, DELETE)
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

    // Message subscription for realtime updates
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

          // Check if this is a message from our current contact
          if (payload.new.sender_id === contact.contact_user_id) {
            // Add message to state with a callback to ensure we get the latest state
            setMessages((prevMessages) => {
              // Check if this message is already in our list to avoid duplicates
              const messageExists = prevMessages.some(
                (msg) => msg.id === payload.new.id
              );
              if (messageExists) return prevMessages;
              return [...prevMessages, payload.new];
            });

            // Play notification sound if available and page is not visible
            if (document.hidden && notificationsEnabled) {
              if (notificationSound) {
                notificationSound
                  .play()
                  .catch((e) => console.log("Error playing sound:", e));
              }

              // Show notification
              try {
                new Notification(`New message from ${contact.name}`, {
                  body: payload.new.content,
                  icon: contact.profile_image_url || "/default-avatar.png",
                  // Modern browsers will use device sound
                  silent: false, // Allow system sound
                });
              } catch (err) {
                console.error("Notification error:", err);
              }
            }

            // Mark as read
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle sending message
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !contact) return;

    try {
      // Insert new message
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

      // Add the new message to the state
      setMessages((prev) => [...prev, data[0]]);

      // Update chat session
      await updateChatSession(newMessage);

      // Update typing status to false
      updateTypingStatus(false);

      // Clear input
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // FIXED: Update the updateChatSession function
  const updateChatSession = async (lastMessage) => {
    try {
      // Check if session exists - Using filter parameters properly
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

      // Filter out sessions that don't involve both users
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
        // Update existing session
        const { error: updateError } = await supabase
          .from("chat_sessions")
          .update(sessionData)
          .eq("id", relevantSession.id);

        if (updateError) {
          console.error("Error updating chat session:", updateError);
        }
      } else {
        // Create new session with a generated UUID
        const { error: insertError } = await supabase
          .from("chat_sessions")
          .insert({
            id: crypto.randomUUID(), // Generate a UUID for the id field
            user1_id: user.id,
            user2_id: contact.contact_user_id,
            ...sessionData,
          });

        if (insertError) {
          console.error("Error creating chat session:", insertError);
          console.log("Error details:", {
            code: insertError.code,
            details: insertError.details,
            message: insertError.message,
          });
        }
      }
    } catch (error) {
      console.error("Error updating chat session:", error);
    }
  };

  // Handle typing status
  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    // Update typing status
    updateTypingStatus(true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
  };

  // Update typing status in database
  const updateTypingStatus = async (isTyping) => {
    if (!contact || !user) return;

    try {
      // First check if records exist - using regular select instead of maybeSingle to handle multiple rows
      const { data: existingRecords, error: fetchError } = await supabase
        .from("typing_status")
        .select("*")
        .eq("user_id", user.id)
        .eq("chat_with_user_id", contact.contact_user_id);

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error fetching typing status:", fetchError);
        return;
      }

      // If we have existing records but multiple rows, clean them up
      if (existingRecords && existingRecords.length > 1) {
        // Delete all but the first record to clean up duplicates
        const keepId = existingRecords[0].id;
        const idsToDelete = existingRecords
          .filter((record, index) => index > 0)
          .map((record) => record.id);

        if (idsToDelete.length > 0) {
          await supabase.from("typing_status").delete().in("id", idsToDelete);
        }

        // Update the remaining record
        const { error: updateError } = await supabase
          .from("typing_status")
          .update({
            is_typing: isTyping,
            last_updated: new Date().toISOString(),
          })
          .eq("id", keepId);

        if (updateError)
          console.error("Error updating typing status:", updateError);
      }
      // Single record exists
      else if (existingRecords && existingRecords.length === 1) {
        // Update existing record
        const { error: updateError } = await supabase
          .from("typing_status")
          .update({
            is_typing: isTyping,
            last_updated: new Date().toISOString(),
          })
          .eq("id", existingRecords[0].id);

        if (updateError)
          console.error("Error updating typing status:", updateError);
      }
      // No records exist
      else {
        // Create new record with a generated UUID
        const { error: insertError } = await supabase
          .from("typing_status")
          .insert({
            id: crypto.randomUUID(), // Generate a UUID for the id field
            user_id: user.id,
            chat_with_user_id: contact.contact_user_id,
            is_typing: isTyping,
            last_updated: new Date().toISOString(),
          });

        if (insertError) {
          console.error("Error inserting typing status:", insertError);
          console.log("Error details:", {
            code: insertError.code,
            details: insertError.details,
            message: insertError.message,
          });
        }
      }
    } catch (error) {
      console.error("Error updating typing status:", error);
    }
  };

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 flex-1">
        <p className="text-white">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className=" flex flex-col h-screen bg-gray-900 flex-1">
      {/* Chat Header */}
      <div
        className="bg-gray-800 p-4 flex items-center border-b border-gray-700 mt-[4rem] cursor-pointer"
        onClick={() => navigate(`/contacts/${contactId}`)}
      >
        <button className="mr-4 hover:bg-gray-700 p-2 rounded-full transition-colors duration-200">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 mr-3">
          {contact.profile_image_url ? (
            <img
              src={contact.profile_image_url}
              alt={contact.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              {contact.name ? contact.name.charAt(0).toUpperCase() : "?"}
            </div>
          )}
        </div>

        <div>
          <div className="font-medium text-white">{contact.name}</div>
          <div className="text-sm text-gray-400">
            {isTyping ? (
              <span className="text-blue-400">typing...</span>
            ) : (
              contact.username && `@${contact.username}`
            )}
          </div>
        </div>

        <div className="ml-auto flex">
          <button className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </button>
          <button className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="sidebar  flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center p-4">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg
              className="w-16 h-16 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p>No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMyMessage = message.sender_id === user.id;
            return (
              <div
                key={message.id}
                className={`flex ${
                  isMyMessage ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
                    isMyMessage
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-200"
                  }`}
                >
                  <p>{message.content}</p>
                  <div
                    className={`text-xs mt-1 ${
                      isMyMessage ? "text-blue-300" : "text-gray-400"
                    }`}
                  >
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {isMyMessage && (
                      <span className="ml-2">
                        {message.is_read ? (
                          // Double check mark for read messages
                          <svg
                            className="w-6 h-6 inline text-blue-300"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm-7.75 7.75L6.8 11.3l-1.4 1.4 4.85 4.85 10.35-10.35-1.4-1.4-8.95 8.95z" />
                          </svg>
                        ) : (
                          // Single check mark for sent but unread messages
                          <svg
                            className="w-6 h-6 inline text-blue-300"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
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
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form
        onSubmit={handleSendMessage}
        className="bg-gray-800 p-4 border-t border-gray-700"
      >
        <div className="flex items-center">
          <button
            type="button"
            className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200 text-gray-400"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700 border border-gray-600 rounded-full px-4 py-2 mx-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className={`p-2 rounded-full transition-colors duration-200 cursor-pointer ${
              newMessage.trim()
                ? "bg-blue-600 hover:bg-blue-500 text-white"
                : "bg-gray-700 text-gray-500"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;

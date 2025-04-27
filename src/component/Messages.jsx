import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { useNavigate, Routes, Route } from "react-router-dom";
import { useAuth } from "../login/AuthProvider";

// Navigation Components
const NavbarChatIcon = ({ unreadCount }) => {
  const navigate = useNavigate();

  return (
    <div
      className="relative cursor-pointer"
      onClick={() => navigate("/messages")}
    >
      <svg
        className="w-6 h-6 text-gray-300 hover:text-white transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>

      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </div>
      )}
    </div>
  );
};

// Main Messages Container
const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("chats");
  const [unreadCounts, setUnreadCounts] = useState({
    total: 0,
    byContact: {},
  });
  const [recentChats, setRecentChats] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  // In Messages.jsx, add this with your other state variables
  const [activeFilter, setActiveFilter] = useState("all"); // Options: "all", "favorites", "blocked"

  useEffect(() => {
    if (!user) return;

    const fetchAllData = async () => {
      try {
        setLoading(true);
        await fetchContacts();
        await fetchUnreadCounts();
        await fetchRecentChats();
      } catch (error) {
        console.error("Error loading messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();

    // Real-time subscription for new messages
    const messagesSubscription = supabase
      .channel("new-message-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          // Update counts and refresh chats
          fetchUnreadCounts();
          fetchRecentChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesSubscription);
    };
  }, [user]);

  const fetchUnreadCounts = async () => {
    try {
      // First get all unread messages
      const { data, error } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      // Count messages by sender manually
      const byContact = {};
      let total = 0;

      data.forEach(({ sender_id }) => {
        byContact[sender_id] = (byContact[sender_id] || 0) + 1;
        total++;
      });

      setUnreadCounts({ total, byContact });
    } catch (error) {
      console.error("Error fetching unread counts:", error);
    }
  };

  const fetchRecentChats = async () => {
    try {
      // First get all contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id);

      if (contactsError) throw contactsError;
      if (!contactsData || contactsData.length === 0) {
        setRecentChats([]);
        return;
      }

      // Then get the last message for each contact
      const chatsWithMessages = await Promise.all(
        contactsData.map(async (contact) => {
          // Get the last message in this conversation
          const { data: messages } = await supabase
            .from("messages")
            .select("*")
            .or(
              `and(sender_id.eq.${user.id},receiver_id.eq.${contact.contact_user_id}),and(sender_id.eq.${contact.contact_user_id},receiver_id.eq.${user.id})`
            )
            .order("created_at", { ascending: false })
            .limit(1);

          const lastMessage = messages?.[0]; // Get first message or undefined

          // Get unread count for this contact
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact" })
            .eq("sender_id", contact.contact_user_id)
            .eq("receiver_id", user.id)
            .eq("is_read", false);

          return {
            contact,
            last_message: lastMessage?.content || "No messages yet",
            last_message_time: lastMessage?.created_at || contact.created_at,
            unreadCount: count || 0,
          };
        })
      );

      // Sort by last message time (newest first)
      chatsWithMessages.sort(
        (a, b) => new Date(b.last_message_time) - new Date(a.last_message_time)
      );

      setRecentChats(chatsWithMessages);
    } catch (error) {
      console.error("Error fetching recent chats:", error);
      setRecentChats([]);
    }
  };
  const fetchContacts = async (userId) => {
    try {
      setLoading(true);
      console.log("Fetching contacts for user:", userId); // Debug log

      let query = supabase.from("contacts").select("*").eq("user_id", userId);

      // Apply filters
      if (activeFilter === "favorites") {
        query = query.eq("is_favorite", true);
      } else if (activeFilter === "blocked") {
        query = query.eq("is_blocked", true);
      }

      const { data, error } = await query.order("name");

      console.log("Contacts data:", data); // Debug log
      console.log("Error:", error); // Debug log

      if (error) {
        console.error("Error fetching contacts:", error);
      } else {
        setContacts(data || []);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChatSelect = (contactId) => {
    navigate(`/chat/${contactId}`);
  };
  const handleContactSelect = (contactId) => {
    navigate(`/contacts/${contactId}`);
  };

  const renderChatList = () => (
    <div className="space-y-1">
      {recentChats.map((chat) => (
        <div
          key={chat.contact.id}
          className="flex items-center p-3 hover:bg-gray-800 rounded cursor-pointer"
          // In renderChatList()
          onClick={() => handleChatSelect(chat.contact.id)}
        >
          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-700 mr-3">
            {chat.contact.profile_image_url ? (
              <img
                src={chat.contact.profile_image_url}
                alt={chat.contact.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                {chat.contact.name.charAt(0).toUpperCase()}
              </div>
            )}
            {chat.unreadCount > 0 && (
              <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center border-2 border-gray-900">
                {chat.unreadCount}
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex justify-between">
              <span className="font-medium text-white">
                {chat.contact.name}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(chat.last_message_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <p
                className={`text-sm truncate ${
                  chat.unreadCount > 0
                    ? "text-white font-medium"
                    : "text-gray-400"
                }`}
              >
                {chat.last_message}
              </p>
            </div>
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex justify-center p-6">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );

  const renderContactsList = () => (
    <div className="space-y-1">
      {contacts.map((contact) => (
        <div
          key={contact.id}
          className="flex items-center p-3 hover:bg-gray-800 rounded cursor-pointer"
          onClick={() => handleContactSelect(contact.id)}
        >
          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-700 mr-3">
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
            {contact.unreadCount > 0 && (
              <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center border-2 border-gray-900">
                {contact.unreadCount}
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex justify-between">
              <span className="font-medium text-white">{contact.name}</span>
            </div>
            <div className="flex justify-between">
              <p className="text-sm text-gray-400">
                {contact.username
                  ? `@${contact.username}`
                  : contact.phone || ""}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleChatSelect(contact.id);
                }}
                className="p-1 text-gray-500 hover:text-blue-400 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}

      {contacts.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p>No contacts found</p>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
            Add a new contact
          </button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center p-6">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Messages</h1>
          <div className="flex space-x-2">
            <button className="p-2 rounded-full hover:bg-gray-700">
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
            <button className="p-2 rounded-full hover:bg-gray-700">
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
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex mt-4 border-b border-gray-700">
          <button
            className={`py-2 px-4 ${
              activeView === "chats"
                ? "text-blue-500 border-b-2 border-blue-500"
                : "text-gray-400"
            }`}
            onClick={() => setActiveView("chats")}
          >
            Chats
            {unreadCounts.total > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                {unreadCounts.total}
              </span>
            )}
          </button>
          <button
            className={`py-2 px-4 ${
              activeView === "contacts"
                ? "text-blue-500 border-b-2 border-blue-500"
                : "text-gray-400"
            }`}
            onClick={() => setActiveView("contacts")}
          >
            Contacts
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {activeView === "chats" ? renderChatList() : renderContactsList()}
      </div>
    </div>
  );
};

export default Messages;

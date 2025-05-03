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
    if (!user) {
      console.log("No user found, cannot fetch messages");
      return;
    }

    console.log("Messages component mounted with user:", user.id);

    const fetchAllData = async () => {
      try {
        setLoading(true);
        console.log("Starting to fetch all data...");

        // Direct query to check if there are any messages at all
        const { data: messageCheck, error: messageCheckError } = await supabase
          .from("messages")
          .select("id")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .limit(1);

        if (messageCheckError) {
          console.error("Error checking for messages:", messageCheckError);
        } else {
          console.log("Message check result:", messageCheck);
        }

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
          console.log("New message received:", payload);
          // Update counts and refresh chats
          fetchUnreadCounts();
          fetchRecentChats();
        }
      )
      .subscribe();

    // Also listen for message reads
    const messageReadSubscription = supabase
      .channel("message-read-notifications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Message read status changed:", payload);
          fetchRecentChats();
        }
      )
      .subscribe();

    console.log("Supabase subscriptions set up");

    return () => {
      console.log("Cleaning up subscriptions");
      supabase.removeChannel(messagesSubscription);
      supabase.removeChannel(messageReadSubscription);
    };
  }, [user]);

  const fetchUnreadCounts = async () => {
    if (!user) return;

    try {
      console.log("Fetching unread counts for user:", user.id);

      // First get all unread messages
      const { data, error } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      console.log("Unread messages data:", data);

      // Count messages by sender manually
      const byContact = {};
      let total = 0;

      data.forEach(({ sender_id }) => {
        byContact[sender_id] = (byContact[sender_id] || 0) + 1;
        total++;
      });

      setUnreadCounts({ total, byContact });
      console.log("Updated unread counts:", { total, byContact });
    } catch (error) {
      console.error("Error fetching unread counts:", error);
    }
  };

  const fetchRecentChats = async () => {
    if (!user) return;

    try {
      console.log("Fetching recent chats for user:", user.id);

      // First try to find all conversations where there are messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("sender_id, receiver_id")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (messagesError) {
        console.error("Error fetching message partners:", messagesError);
        throw messagesError;
      }

      console.log("Message partners data:", messagesData);

      // Extract unique conversation partners
      const conversationPartnerIds = new Set();
      messagesData.forEach((msg) => {
        if (msg.sender_id === user.id) {
          conversationPartnerIds.add(msg.receiver_id);
        } else {
          conversationPartnerIds.add(msg.sender_id);
        }
      });

      console.log(
        "Conversation partner IDs:",
        Array.from(conversationPartnerIds)
      );

      if (conversationPartnerIds.size === 0) {
        // Fallback to contacts if no messages found
        const { data: contactsData, error: contactsError } = await supabase
          .from("contacts")
          .select("*")
          .eq("user_id", user.id);

        if (contactsError) throw contactsError;

        console.log("Contacts data for chats (fallback):", contactsData);

        if (!contactsData || contactsData.length === 0) {
          console.log("No contacts found, setting empty recent chats");
          setRecentChats([]);
          return;
        }

        // Process contacts without messages
        const emptyChats = contactsData.map((contact) => ({
          contact,
          last_message: "No messages yet",
          last_message_time: contact.created_at,
          unreadCount: 0,
        }));

        setRecentChats(emptyChats);
        return;
      }

      // Now fetch contact details for all conversation partners
      const { data: contactsData, error: contactsError } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .in("contact_user_id", Array.from(conversationPartnerIds));

      if (contactsError) {
        console.error(
          "Error fetching contacts for conversation partners:",
          contactsError
        );
        throw contactsError;
      }

      console.log("Contacts data for conversation partners:", contactsData);

      // For any conversation partners that aren't in contacts, we need to fetch their profiles
      const contactUserIds = new Set(
        contactsData.map((c) => c.contact_user_id)
      );
      const missingPartnerIds = Array.from(conversationPartnerIds).filter(
        (id) => !contactUserIds.has(id)
      );

      console.log("Missing partner IDs not in contacts:", missingPartnerIds);

      // Fetch profiles for missing partners
      let nonContactProfiles = [];
      if (missingPartnerIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", missingPartnerIds);

        if (profilesError) {
          console.error(
            "Error fetching profiles for missing partners:",
            profilesError
          );
        } else {
          console.log("Profiles for missing partners:", profilesData);

          // Convert profiles to contact-like objects
          nonContactProfiles = profilesData.map((profile) => ({
            id: `temp-${profile.user_id}`, // Temporary ID for the UI
            user_id: user.id,
            contact_user_id: profile.user_id,
            name: profile.name || "Unknown User",
            username: profile.username,
            profile_image_url: profile.profile_image_url,
            is_temp: true, // Flag to indicate this is not a saved contact
          }));
        }
      }

      // Combine contacts and non-contact profiles
      const allContacts = [...contactsData, ...nonContactProfiles];

      // Then get the last message for each contact/profile
      const chatsWithMessages = await Promise.all(
        allContacts.map(async (contact) => {
          // Get the last message in this conversation
          const { data: messages, error: msgError } = await supabase
            .from("messages")
            .select("*")
            .or(
              `and(sender_id.eq.${user.id},receiver_id.eq.${contact.contact_user_id}),and(sender_id.eq.${contact.contact_user_id},receiver_id.eq.${user.id})`
            )
            .order("created_at", { ascending: false })
            .limit(1);

          if (msgError) {
            console.error(
              `Error fetching messages for contact ${contact.name}:`,
              msgError
            );
          }

          console.log(`Messages for contact ${contact.name}:`, messages);

          const lastMessage = messages?.[0]; // Get first message or undefined

          // Get unread count for this contact
          const { count, error: countError } = await supabase
            .from("messages")
            .select("*", { count: "exact" })
            .eq("sender_id", contact.contact_user_id)
            .eq("receiver_id", user.id)
            .eq("is_read", false);

          if (countError) {
            console.error(
              `Error getting unread count for contact ${contact.name}:`,
              countError
            );
          }

          console.log(`Unread count for ${contact.name}:`, count);

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

      console.log("Setting recent chats:", chatsWithMessages);
      setRecentChats(chatsWithMessages);
    } catch (error) {
      console.error("Error fetching recent chats:", error);
      setRecentChats([]);
    }
  };

  const fetchContacts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Use the user ID from the auth context instead of a parameter
      console.log("Fetching contacts for user:", user.id); // Debug log

      let query = supabase.from("contacts").select("*").eq("user_id", user.id);

      // Apply filters
      if (activeFilter === "favorites") {
        query = query.eq("is_favorite", true);
      } else if (activeFilter === "blocked") {
        query = query.eq("is_blocked", true);
      }

      const { data, error } = await query.order("name");

      console.log("Contacts data:", data); // Debug log

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

  const handleChatSelect = (contact) => {
    // Use contact_user_id instead of contact record id
    navigate(`/chat/${contact.contact_user_id}`);
  };

  const handleContactSelect = (contactId) => {
    navigate(`/contacts/${contactId}`);
  };

  const renderChatList = () => (
    <div className="space-y-1">
      {recentChats.length === 0 && !loading && (
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p>No chats found</p>
          <button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
            onClick={() => setActiveView("contacts")}
          >
            Start a new chat
          </button>
        </div>
      )}

      {recentChats.map((chat) => (
        <div
          key={chat.contact.id}
          className="flex items-center p-3 hover:bg-gray-800 rounded cursor-pointer"
          onClick={() => handleChatSelect(chat.contact)}
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
              {chat.contact.is_temp && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddTempContact(chat.contact);
                  }}
                  className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded ml-2"
                >
                  Add
                </button>
              )}
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
  // Add this function to your Messages component
  const handleAddTempContact = async (tempContact) => {
    try {
      // Insert the temporary contact into the contacts table
      const { data, error } = await supabase.from("contacts").insert({
        user_id: user.id,
        contact_user_id: tempContact.contact_user_id,
        name: tempContact.name,
        username: tempContact.username,
        email: tempContact.email,
        phone: tempContact.phone,
        profile_image_url: tempContact.profile_image_url,
        is_favorite: false,
        is_blocked: false,
      });

      if (error) throw error;

      // Refresh chat list
      await fetchRecentChats();

      // Show success message (you can implement this)
      console.log("Contact added successfully");
    } catch (error) {
      console.error("Error adding contact:", error);
      // Show error message (you can implement this)
    }
  };
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
            {unreadCounts.byContact[contact.contact_user_id] > 0 && (
              <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center border-2 border-gray-900">
                {unreadCounts.byContact[contact.contact_user_id]}
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
                  handleChatSelect(contact);
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

  // Add filter controls for contacts
  const renderFilters = () => {
    if (activeView !== "contacts") return null;

    return (
      <div className="flex space-x-2 px-4 py-2">
        <button
          className={`px-3 py-1 rounded-full text-sm ${
            activeFilter === "all"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300"
          }`}
          onClick={() => {
            setActiveFilter("all");
            fetchContacts();
          }}
        >
          All
        </button>
        <button
          className={`px-3 py-1 rounded-full text-sm ${
            activeFilter === "favorites"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300"
          }`}
          onClick={() => {
            setActiveFilter("favorites");
            fetchContacts();
          }}
        >
          Favorites
        </button>
        <button
          className={`px-3 py-1 rounded-full text-sm ${
            activeFilter === "blocked"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300"
          }`}
          onClick={() => {
            setActiveFilter("blocked");
            fetchContacts();
          }}
        >
          Blocked
        </button>
      </div>
    );
  };

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

        {renderFilters()}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {activeView === "chats" ? renderChatList() : renderContactsList()}
      </div>
    </div>
  );
};

export default Messages;

import { useState, useEffect } from "react";
import { supabase } from "../../supabase"; // Adjust the import path as needed
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../login/AuthProvider";

// Main Contacts Component - Wraps the contact list and details
const Contacts = () => {
  const { contactId } = useParams();
  const [selectedContactId, setSelectedContactId] = useState(contactId);
  const { user } = useAuth(); // Use the auth context
  const navigate = useNavigate();
  const location = useLocation();

  // Effect to update selectedContactId when the URL param changes
  useEffect(() => {
    if (contactId) {
      setSelectedContactId(contactId);
    }
  }, [contactId]);

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      // Save current location to redirect back after login
      navigate("/login", { state: { from: location.pathname } });
    }
  }, [user, navigate, location]);

  // If no user, show loading or return null
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <p className="text-white">Checking authentication...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-900">
      <ContactList
        onSelectContact={setSelectedContactId}
        userId={user?.id}
        selectedContactId={selectedContactId}
      />
      {selectedContactId ? (
        <ContactDetails contactId={selectedContactId} userId={user?.id} />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-400">
          <p>Select a contact to view details</p>
        </div>
      )}
    </div>
  );
};

// ContactList Component - Shows the list of contacts on the left side
const ContactList = ({ onSelectContact, userId, selectedContactId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [contactsWithMessages, setContactsWithMessages] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddContactModal, setShowAddContactModal] = useState(false);

  useEffect(() => {
    // Only fetch contacts if userId is valid
    if (userId && typeof userId === "string") {
      fetchContacts(userId);
    }
  }, [userId, activeFilter]);

  useEffect(() => {
    // Only setup subscription if userId is valid and contacts are loaded
    if (userId && typeof userId === "string" && contacts.length > 0) {
      fetchRecentMessages();

      // Setup subscription for new messages
      const subscription = supabase
        .channel("new-messages")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${userId}`,
          },
          (payload) => {
            // Update messages count
            fetchRecentMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [contacts, userId]);

  const fetchContacts = async (userId) => {
    // Validate userId again for safety
    if (!userId || typeof userId !== "string") {
      console.error("Invalid userId provided to fetchContacts");
      setLoading(false);
      return;
    }

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

  const fetchRecentMessages = async () => {
    // Validate userId again for safety
    if (!userId || typeof userId !== "string") {
      console.error("Invalid userId provided to fetchRecentMessages");
      return;
    }

    try {
      // Fetch unread messages count - using a different approach
      const { data: unreadData } = await supabase
        .from("messages")
        .select("*")
        .eq("receiver_id", userId)
        .eq("is_read", false);

      // Process the data manually instead of using group
      const unreadCounts = {};
      if (unreadData) {
        unreadData.forEach((message) => {
          if (!unreadCounts[message.sender_id]) {
            unreadCounts[message.sender_id] = 0;
          }
          unreadCounts[message.sender_id]++;
        });
      }

      // Fetch most recent message for each contact
      const { data: recentMessages } = await supabase
        .from("chat_sessions")
        .select("user1_id, user2_id, last_message, last_message_time")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order("last_message_time", { ascending: false });

      // Create a map of contact_user_id to message data
      const messageMap = new Map();

      // Set unread counts from our manual count
      Object.keys(unreadCounts).forEach((senderId) => {
        messageMap.set(senderId, {
          unreadCount: unreadCounts[senderId],
        });
      });

      if (recentMessages) {
        recentMessages.forEach((session) => {
          const contactUserId =
            session.user1_id === userId ? session.user2_id : session.user1_id;

          const existingData = messageMap.get(contactUserId) || {};
          messageMap.set(contactUserId, {
            ...existingData,
            lastMessage: session.last_message,
            lastMessageTime: session.last_message_time,
          });
        });
      }

      // Map to contacts
      const enhancedContacts = contacts.map((contact) => {
        const messageData = messageMap.get(contact.contact_user_id) || {};
        return {
          ...contact,
          unreadCount: messageData.unreadCount || 0,
          lastMessage: messageData.lastMessage || "",
          lastMessageTime: messageData.lastMessageTime,
        };
      });

      // Sort by last message time (if available)
      enhancedContacts.sort((a, b) => {
        if (a.lastMessageTime && b.lastMessageTime) {
          return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
        }
        if (a.lastMessageTime) return -1;
        if (b.lastMessageTime) return 1;
        return 0;
      });

      setContactsWithMessages(enhancedContacts);
    } catch (error) {
      console.error("Error fetching message data:", error);
    }
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSelectContact = (contactId) => {
    onSelectContact(contactId);
    navigate(`/contacts/${contactId}`, { replace: true });
  };

  const handleChatClick = (contactId) => {
    navigate(`/chat/${contactId}`);
  };

  const filteredContacts = contactsWithMessages.filter(
    (contact) =>
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone?.includes(searchTerm)
  );

  return (
    <div className="bg-gray-900 h-screen overflow-y-auto w-full md:w-[360px] border-r border-gray-800 mt-[80px]">
      <div className="flex items-center justify-between p-4">
        <h1 className="text-xl font-bold text-white">Contacts</h1>
        <span className="text-gray-400 text-sm">
          {contacts.length} Contacts
        </span>
        <button
          onClick={() => setShowAddContactModal(true)}
          className="p-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="flex space-x-1 px-4 mb-4">
        <button
          onClick={() => handleFilterChange("all")}
          className={`px-3 py-1 rounded text-sm ${
            activeFilter === "all"
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-300"
          }`}
        >
          All
        </button>
        <button
          onClick={() => handleFilterChange("favorites")}
          className={`px-3 py-1 rounded text-sm ${
            activeFilter === "favorites"
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-300"
          }`}
        >
          Favorites
        </button>
        <button
          onClick={() => handleFilterChange("blocked")}
          className={`px-3 py-1 rounded text-sm ${
            activeFilter === "blocked"
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-300"
          }`}
        >
          Blocked
        </button>
      </div>

      <div className="px-4 mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search contact / chat"
            className="w-full bg-gray-800 text-white py-2 pl-8 pr-4 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={searchTerm}
            onChange={handleSearch}
          />
          <svg
            className="absolute left-2 top-2.5 h-4 w-4 text-gray-400"
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
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-4">
          <p className="text-gray-400">Loading contacts...</p>
        </div>
      ) : (
        <div className="px-2">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400">No contacts found</p>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className={`flex items-center p-2 hover:bg-gray-800 rounded cursor-pointer mb-1 ${
                  selectedContactId === contact.id ? "bg-gray-800" : ""
                }`}
                onClick={() => handleSelectContact(contact.id)}
              >
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-700 mr-3">
                  {contact.profile_image_url ? (
                    <img
                      src={contact.profile_image_url}
                      alt={contact.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      {contact.name
                        ? contact.name.charAt(0).toUpperCase()
                        : "?"}
                    </div>
                  )}
                  {contact.unreadCount > 0 && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center border-2 border-gray-900">
                      {contact.unreadCount}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-medium text-white">
                      {contact.name}
                    </span>
                    {contact.lastMessageTime && (
                      <span className="text-xs text-gray-500">
                        {new Date(contact.lastMessageTime).toLocaleTimeString(
                          [],
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-sm text-gray-400 truncate">
                      {contact.lastMessage || "No messages yet"}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChatClick(contact.id);
                      }}
                      className="ml-2 p-1 text-gray-500 hover:text-blue-400 transition-colors"
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
            ))
          )}
        </div>
      )}
      {showAddContactModal && (
        <AddContactModal
          onClose={() => setShowAddContactModal(false)}
          userId={userId}
          onContactAdded={() => fetchContacts(userId)}
        />
      )}
    </div>
  );
};

// AddContactModal Component - For searching and adding new contacts
const AddContactModal = ({ onClose, userId, onContactAdded }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    try {
      setSearching(true);
      setMessage("");

      // Search by username, email or phone
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, name, username, email, phone, profile_image_url")
        .or(
          `username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
        )
        .neq("user_id", userId) // Don't include the current user
        .limit(10);

      if (error) {
        throw error;
      }

      // Check which results are already contacts
      if (data && data.length > 0) {
        const existingContacts = await supabase
          .from("contacts")
          .select("contact_user_id")
          .eq("user_id", userId)
          .in(
            "contact_user_id",
            data.map((profile) => profile.user_id)
          );

        const existingContactIds = existingContacts.data
          ? existingContacts.data.map((c) => c.contact_user_id)
          : [];

        // Mark existing contacts
        const resultsWithStatus = data.map((profile) => ({
          ...profile,
          isContact: existingContactIds.includes(profile.user_id),
        }));

        setSearchResults(resultsWithStatus);
      } else {
        setSearchResults([]);
        setMessage("No users found matching your search.");
      }
    } catch (error) {
      console.error("Error searching for users:", error);
      setMessage("An error occurred while searching. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const addContact = async (profile) => {
    try {
      // Create new contact
      const { error } = await supabase.from("contacts").insert({
        user_id: userId,
        contact_user_id: profile.user_id,
        name: profile.name,
        username: profile.username,
        email: profile.email,
        phone: profile.phone,
        profile_image_url: profile.profile_image_url,
        is_favorite: false,
        is_blocked: false,
      });

      if (error) throw error;

      // Update search results to show this contact has been added
      setSearchResults(
        searchResults.map((result) =>
          result.user_id === profile.user_id
            ? { ...result, isContact: true }
            : result
        )
      );

      // Callback to refresh contact list
      onContactAdded();
    } catch (error) {
      console.error("Error adding contact:", error);
      setMessage("Failed to add contact. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-white">Search by Name</h2>

        <div className="mb-6">
          <div className="flex space-x-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search contact"
              className="w-full bg-gray-700 text-white px-4 py-2 rounded"
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          {message && <p className="mt-2 text-sm text-gray-400">{message}</p>}
        </div>

        <div className="max-h-64 overflow-y-auto">
          {searchResults.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center p-3 border-b border-gray-700"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 mr-3">
                {profile.profile_image_url ? (
                  <img
                    src={profile.profile_image_url}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    {profile.name ? profile.name.charAt(0).toUpperCase() : "?"}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <p className="font-medium text-white">{profile.name}</p>
                <p className="text-sm text-gray-400">
                  {profile.username && `@${profile.username}`}
                </p>
              </div>

              {profile.isContact ? (
                <span className="text-green-500 text-sm">Added</span>
              ) : (
                <button
                  onClick={() => addContact(profile)}
                  className="ml-2 p-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ContactDetails Component - Shows details of a selected contact
const ContactDetails = ({ contactId, userId }) => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  useEffect(() => {
    // Only fetch contact details if both contactId and userId are valid
    if (
      contactId &&
      userId &&
      typeof userId === "string" &&
      typeof contactId === "string"
    ) {
      fetchContactDetails(contactId);
    } else {
      // Set loading to false if we can't fetch
      setLoading(false);
    }
  }, [contactId, userId]);

  const fetchContactDetails = async (id) => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      setContact(data);
    } catch (error) {
      console.error("Error fetching contact details:", error);
    } finally {
      setLoading(false);
    }
  };
  const toggleFavorite = async () => {
    try {
      const { error } = await supabase
        .from("contacts")
        .update({ is_favorite: !contact.is_favorite })
        .eq("id", contactId);

      if (error) throw error;

      // Update local state
      setContact({ ...contact, is_favorite: !contact.is_favorite });
    } catch (error) {
      console.error("Error updating favorite status:", error);
    }
    console.log("Toggle favorite for", contact.name);
    setShowActionMenu(false);
  };

  const toggleBlocked = async () => {
    try {
      const { error } = await supabase
        .from("contacts")
        .update({ is_blocked: !contact.is_blocked })
        .eq("id", contactId);

      if (error) throw error;

      // Update local state
      setContact({ ...contact, is_blocked: !contact.is_blocked });
      setShowActionMenu(false);
    } catch (error) {
      console.error("Error updating block status:", error);
    }
  };

  const deleteContact = async () => {
    if (window.confirm("Are you sure you want to delete this contact?")) {
      try {
        const { error } = await supabase
          .from("contacts")
          .delete()
          .eq("id", contactId);

        if (error) throw error;

        // Navigate back to contacts list
        navigate("/contacts");
      } catch (error) {
        console.error("Error deleting contact:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 flex-1">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-blue-400 mt-4 font-medium">
            Loading contact details...
          </p>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 flex-1">
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg max-w-md text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-white text-xl mt-4 font-semibold">
            Contact not found
          </p>
          <p className="text-gray-400 mt-2">
            The contact you're looking for doesn't exist or was deleted.
          </p>
          <button
            onClick={() => navigate("/contacts")}
            className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 text-white font-medium"
          >
            Back to Contacts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar bg-gradient-to-br from-gray-900 to-gray-950 text-white min-h-screen overflow-y-auto flex-1">
      <div className="relative">
        {/* Cover Image with improved gradient */}
        <div className="h-64 bg-gradient-to-r from-blue-900 via-indigo-800 to-purple-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMjIiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0aDN2M2gtM3pNMzYgNDBoM3YzaC0zek00MiAzMmgzdjNoLTN6TTQyIDM5aDN2M2gtM3pNNDggMzRoM3YzaC0zek00OCA0MGgzdjNoLTN6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
        </div>

        {/* Back Button */}
        <button
          onClick={() => navigate("/contacts")}
          className="absolute top-6 left-6 bg-gray-900 bg-opacity-50 hover:bg-opacity-70 backdrop-blur-sm p-2 rounded-full transition-all duration-200 transform hover:scale-105"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Profile Image */}
        <div className="absolute left-8 bottom-0 transform translate-y-1/2">
          <div className="h-32 w-32 rounded-full overflow-hidden ring-4 ring-gray-900 bg-gradient-to-br from-gray-800 to-gray-700 shadow-xl">
            {contact.profile_image_url ? (
              <img
                src={contact.profile_image_url}
                alt={contact.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold bg-gradient-to-br from-blue-600 to-purple-700">
                {contact.name ? contact.name.charAt(0).toUpperCase() : "?"}
              </div>
            )}
          </div>

          {/* Favorite Indicator */}
          {contact.is_favorite && (
            <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1 border-2 border-gray-900">
              <svg
                className="w-4 h-4 text-gray-900"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute right-8 bottom-4 flex space-x-3">
          <button className="w-10 h-10 rounded-full bg-green-600 hover:bg-green-500 flex items-center justify-center shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-green-500/20">
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
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </button>
          <button className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-blue-500/20">
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
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
          <button
            className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center shadow-lg transform transition-all duration-200 hover:scale-105"
            onClick={() => setShowActionMenu(!showActionMenu)}
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
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>

          {/* Action Menu with animation */}
          {showActionMenu && (
            <div className="absolute right-0 top-12 w-52 bg-gray-800 rounded-xl shadow-xl overflow-hidden z-10 border border-gray-700 animate-fadeIn">
              <button
                onClick={toggleFavorite}
                className="w-full px-4 py-3 text-left hover:bg-gray-700 flex items-center transition-colors duration-200"
              >
                {contact.is_favorite ? (
                  <>
                    <svg
                      className="w-5 h-5 mr-3 text-yellow-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>Remove from Favorites</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                    <span>Add to Favorites</span>
                  </>
                )}
              </button>
              <div className="border-b border-gray-700 opacity-50 mx-3"></div>
              <button
                onClick={toggleBlocked}
                className="w-full px-4 py-3 text-left hover:bg-gray-700 flex items-center transition-colors duration-200"
              >
                {contact.is_blocked ? (
                  <>
                    <svg
                      className="w-5 h-5 mr-3 text-red-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Unblock Contact</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                    <span>Block Contact</span>
                  </>
                )}
              </button>
              <div className="border-b border-gray-700 opacity-50 mx-3"></div>
              <button
                onClick={deleteContact}
                className="w-full px-4 py-3 text-left hover:bg-red-900 hover:bg-opacity-40 text-red-400 hover:text-red-300 flex items-center transition-colors duration-200"
              >
                <svg
                  className="w-5 h-5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span>Delete Contact</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-20 px-8 pb-12 max-w-4xl mx-auto">
        <div className="flex items-center">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            {contact.name}
          </h1>
          {/* Status Badge */}
          {contact.is_blocked && (
            <div className="ml-4">
              <span className="bg-red-900 text-red-300 px-3 py-1 rounded-full text-xs font-medium shadow-inner">
                Blocked
              </span>
            </div>
          )}
        </div>

        {contact.username && (
          <p className="text-gray-400">@{contact.username}</p>
        )}

        {/* Content Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info Card */}
          <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-700 hover:border-gray-600 transition-colors duration-300">
            <div className="flex items-center mb-4">
              <svg
                className="w-5 h-5 text-blue-400 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <h2 className="text-xl font-bold text-blue-400">Basic Info</h2>
            </div>

            <div className="space-y-4">
              <div className="flex">
                <div className="w-24 text-gray-500 font-medium">Email:</div>
                <div className="flex-1 text-gray-200 font-medium">
                  {contact.email || "N/A"}
                </div>
              </div>

              <div className="flex">
                <div className="w-24 text-gray-500 font-medium">Phone:</div>
                <div className="flex-1 text-gray-200 font-medium">
                  {contact.phone || "N/A"}
                </div>
              </div>

              {contact.company && (
                <div className="flex">
                  <div className="w-24 text-gray-500 font-medium">Company:</div>
                  <div className="flex-1 text-gray-200 font-medium">
                    {contact.company}
                  </div>
                </div>
              )}

              {contact.role && (
                <div className="flex">
                  <div className="w-24 text-gray-500 font-medium">Role:</div>
                  <div className="flex-1 text-gray-200 font-medium">
                    {contact.role}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Communication Card */}
          <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-700 hover:border-gray-600 transition-colors duration-300">
            <div className="flex items-center mb-4">
              <svg
                className="w-5 h-5 text-purple-400 mr-2"
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
              <h2 className="text-xl font-bold text-purple-400">
                Communication
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <button className="flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-blue-500/20 font-medium">
                <svg
                  className="w-5 h-5 mr-2"
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
                Message
              </button>
              <button className="flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-500 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-green-500/20 font-medium">
                <svg
                  className="w-5 h-5 mr-2"
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
                Call
              </button>
              <button className="flex items-center justify-center px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-purple-500/20 font-medium">
                <svg
                  className="w-5 h-5 mr-2"
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
                Video
              </button>
              <button className="flex items-center justify-center px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors duration-200 shadow-lg font-medium">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Schedule
              </button>
            </div>
          </div>

          {/* Recent Activity Card - Optional but adds more content */}
          <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-700 hover:border-gray-600 transition-colors duration-300 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-teal-400 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h2 className="text-xl font-bold text-teal-400">
                  Recent Activity
                </h2>
              </div>

              <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200">
                View All
              </button>
            </div>

            <div className="space-y-4 mt-2">
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
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
                </div>
                <div className="ml-4">
                  <p className="text-gray-300">Last message exchange</p>
                  <p className="text-gray-500 text-sm">2 days ago</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
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
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-gray-300">Last video call</p>
                  <p className="text-gray-500 text-sm">3 weeks ago</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {contact.notes && (
            <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-700 hover:border-gray-600 transition-colors duration-300 md:col-span-2">
              <div className="flex items-center mb-4">
                <svg
                  className="w-5 h-5 text-yellow-400 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <h2 className="text-xl font-bold text-yellow-400">Notes</h2>
              </div>
              <div className="prose prose-invert max-w-none text-gray-300">
                <p>{contact.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Contacts;

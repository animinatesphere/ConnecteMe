import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../login/AuthProvider";

// Main Contacts Component - Wraps the contact list and details
const Contacts = () => {
  const { contactId } = useParams();
  const [selectedContactId, setSelectedContactId] = useState(contactId);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showPendingRequests, setShowPendingRequests] = useState(false);

  // Effect to update selectedContactId when the URL param changes
  useEffect(() => {
    if (contactId) {
      setSelectedContactId(contactId);
    }
  }, [contactId]);

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
    } else {
      fetchPendingRequests(user.id);
    }
  }, [user, navigate, location]);

  // 1. Fetch pending contact requests with proper relationship
  const fetchPendingRequests = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("contact_requests")
        .select(
          `
        id,
        message,
        created_at,
        sender_id,
        profiles!contact_requests_sender_id_fkey (
          user_id,
          name,
          username,
          email,
          phone,
          profile_image_url
        )
      `
        )
        .eq("receiver_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  };

  // 2. Send a contact request
  const sendContactRequest = async (senderId, receiverId, message) => {
    try {
      const { data, error } = await supabase.from("contact_requests").insert([
        {
          sender_id: senderId,
          receiver_id: receiverId,
          message: message,
          status: "pending",
        },
      ]);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error sending contact request:", error);
      return { success: false, error };
    }
  };

  // 3. Update a contact request status
  const updateContactRequestStatus = async (requestId, status) => {
    try {
      const { data, error } = await supabase
        .from("contact_requests")
        .update({ status: status, updated_at: new Date() })
        .eq("id", requestId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error(`Error updating contact request to ${status}:`, error);
      return { success: false, error };
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <p className="text-white">Checking authentication...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-900">
      {showPendingRequests ? (
        <PendingRequestsList
          pendingRequests={pendingRequests}
          userId={user?.id}
          onClose={() => setShowPendingRequests(false)}
          onRequestProcessed={() => fetchPendingRequests(user?.id)}
        />
      ) : (
        <ContactList
          onSelectContact={setSelectedContactId}
          userId={user?.id}
          selectedContactId={selectedContactId}
          pendingRequestsCount={pendingRequests.length}
          onShowPendingRequests={() => setShowPendingRequests(true)}
        />
      )}

      {selectedContactId && !showPendingRequests ? (
        <ContactDetails contactId={selectedContactId} userId={user?.id} />
      ) : (
        !showPendingRequests && (
          <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-400">
            <p>Select a contact to view details</p>
          </div>
        )
      )}
    </div>
  );
};

// Pending Requests List Component
const PendingRequestsList = ({
  pendingRequests,
  userId,
  onClose,
  onRequestProcessed,
}) => {
  const [processingIds, setProcessingIds] = useState({});

  const handleAccept = async (requestId, senderProfile) => {
    try {
      setProcessingIds((prev) => ({ ...prev, [requestId]: "accepting" }));

      // 1. Create a new contact entry
      const { error: contactError } = await supabase.from("contacts").insert({
        user_id: userId,
        contact_user_id: senderProfile.user_id,
        name: senderProfile.name,
        username: senderProfile.username,
        email: senderProfile.email,
        phone: senderProfile.phone,
        profile_image_url: senderProfile.profile_image_url,
        is_favorite: false,
        is_blocked: false,
      });

      if (contactError) throw contactError;

      // 2. Update the request status
      const { error: requestError } = await supabase
        .from("contact_requests")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (requestError) throw requestError;

      onRequestProcessed();
    } catch (error) {
      console.error("Error accepting contact request:", error);
    } finally {
      setProcessingIds((prev) => ({ ...prev, [requestId]: null }));
    }
  };

  const handleReject = async (requestId) => {
    try {
      setProcessingIds((prev) => ({ ...prev, [requestId]: "rejecting" }));

      const { error } = await supabase
        .from("contact_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      onRequestProcessed();
    } catch (error) {
      console.error("Error rejecting contact request:", error);
    } finally {
      setProcessingIds((prev) => ({ ...prev, [requestId]: null }));
    }
  };

  return (
    <div className="bg-gray-900 h-screen overflow-y-auto w-full md:w-[360px] border-r border-gray-800 mt-[80px]">
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onClose}
          className="p-2 rounded hover:bg-gray-800 text-gray-400"
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
        <h1 className="text-xl font-bold text-white">Contact Requests</h1>
        <span className="text-gray-400 text-sm">
          {pendingRequests.length} Pending
        </span>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 p-4">
          <svg
            className="w-16 h-16 text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          <p className="text-gray-400 text-center">
            No pending contact requests
          </p>
        </div>
      ) : (
        <div className="px-2">
          {pendingRequests.map((request) => (
            <div
              key={request.id}
              className="bg-gray-800 rounded-lg mb-3 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700 mr-3">
                    {request.profiles.profile_image_url ? (
                      <img
                        src={request.profiles.profile_image_url}
                        alt={request.profiles.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        {request.profiles.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-white">
                      {request.profiles.name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {request.profiles.username &&
                        `@${request.profiles.username}`}
                    </p>
                  </div>
                </div>

                {request.message && (
                  <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                    <p className="text-gray-300 text-sm">{request.message}</p>
                  </div>
                )}

                <div className="mt-4 flex items-center text-xs text-gray-500">
                  <svg
                    className="w-4 h-4 mr-1"
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
                  <span>
                    {new Date(request.created_at).toLocaleDateString()} at{" "}
                    {new Date(request.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => handleAccept(request.id, request.profiles)}
                    disabled={processingIds[request.id]}
                    className={`flex-1 py-2 rounded-lg font-medium ${
                      processingIds[request.id] === "accepting"
                        ? "bg-green-700 opacity-70"
                        : "bg-green-600 hover:bg-green-500"
                    } transition-colors duration-200`}
                  >
                    {processingIds[request.id] === "accepting"
                      ? "Accepting..."
                      : "Accept"}
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    disabled={processingIds[request.id]}
                    className={`flex-1 py-2 rounded-lg font-medium ${
                      processingIds[request.id] === "rejecting"
                        ? "bg-red-700 opacity-70"
                        : "bg-red-600 hover:bg-red-500"
                    } transition-colors duration-200`}
                  >
                    {processingIds[request.id] === "rejecting"
                      ? "Rejecting..."
                      : "Reject"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ContactList Component
const ContactList = ({
  onSelectContact,
  userId,
  selectedContactId,
  pendingRequestsCount = 0,
  onShowPendingRequests,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [contactsWithMessages, setContactsWithMessages] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddContactModal, setShowAddContactModal] = useState(false);

  useEffect(() => {
    if (userId && typeof userId === "string") {
      fetchContacts(userId);
    }
  }, [userId, activeFilter]);

  useEffect(() => {
    if (userId && typeof userId === "string" && contacts.length > 0) {
      fetchRecentMessages();

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
          () => fetchRecentMessages()
        )
        .subscribe();

      return () => supabase.removeChannel(subscription);
    }
  }, [contacts, userId]);

  const fetchContacts = async (userId) => {
    if (!userId || typeof userId !== "string") {
      console.error("Invalid userId provided to fetchContacts");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase.from("contacts").select("*").eq("user_id", userId);

      if (activeFilter === "favorites") query = query.eq("is_favorite", true);
      else if (activeFilter === "blocked") query = query.eq("is_blocked", true);

      const { data, error } = await query.order("name");

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentMessages = async () => {
    if (!userId || typeof userId !== "string") return;

    try {
      const { data: unreadData } = await supabase
        .from("messages")
        .select("*")
        .eq("receiver_id", userId)
        .eq("is_read", false);

      const unreadCounts = {};
      if (unreadData) {
        unreadData.forEach((message) => {
          unreadCounts[message.sender_id] =
            (unreadCounts[message.sender_id] || 0) + 1;
        });
      }

      const { data: recentMessages } = await supabase
        .from("chat_sessions")
        .select("user1_id, user2_id, last_message, last_message_time")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order("last_message_time", { ascending: false });

      const messageMap = new Map();
      Object.keys(unreadCounts).forEach((senderId) => {
        messageMap.set(senderId, { unreadCount: unreadCounts[senderId] });
      });

      if (recentMessages) {
        recentMessages.forEach((session) => {
          const contactUserId =
            session.user1_id === userId ? session.user2_id : session.user1_id;
          messageMap.set(contactUserId, {
            ...(messageMap.get(contactUserId) || {}),
            lastMessage: session.last_message,
            lastMessageTime: session.last_message_time,
          });
        });
      }

      const enhancedContacts = contacts.map((contact) => ({
        ...contact,
        ...(messageMap.get(contact.contact_user_id) || {}),
        unreadCount: messageMap.get(contact.contact_user_id)?.unreadCount || 0,
        lastMessage: messageMap.get(contact.contact_user_id)?.lastMessage || "",
        lastMessageTime: messageMap.get(contact.contact_user_id)
          ?.lastMessageTime,
      }));

      enhancedContacts.sort((a, b) => {
        if (a.lastMessageTime && b.lastMessageTime) {
          return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
        }
        return a.lastMessageTime ? -1 : b.lastMessageTime ? 1 : 0;
      });

      setContactsWithMessages(enhancedContacts);
    } catch (error) {
      console.error("Error fetching message data:", error);
    }
  };

  const handleFilterChange = (filter) => setActiveFilter(filter);
  const handleSearch = (e) => setSearchTerm(e.target.value);

  const handleSelectContact = (contactId) => {
    onSelectContact(contactId);
    navigate(`/contacts/${contactId}`, { replace: true });
  };

  const handleChatClick = (contactId) => navigate(`/chat/${contactId}`);

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
        <div className="flex">
          {pendingRequestsCount > 0 && (
            <button
              onClick={onShowPendingRequests}
              className="p-1 mr-2 rounded-full bg-orange-600 hover:bg-orange-700 text-white relative"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
              </svg>
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendingRequestsCount}
              </span>
            </button>
          )}
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
                      {contact.name?.charAt(0).toUpperCase() || "?"}
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
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
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

const AddContactModal = ({ onClose, userId, onContactAdded }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [requestStatus, setRequestStatus] = useState({});

  // Search for users
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setMessage("Please enter a search term");
      return;
    }

    try {
      setSearching(true);
      setMessage("");

      // Search for users by name
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .ilike("name", `%${searchTerm}%`)
        .neq("user_id", userId)
        .limit(10);

      if (profilesError) throw profilesError;

      // Check if users are already contacts
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("contact_user_id")
        .eq("user_id", userId);

      const contactIds = contactsData?.map((c) => c.contact_user_id) || [];

      // Check if there are any pending requests
      const { data: requestsData } = await supabase
        .from("contact_requests")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

      const results = profilesData.map((profile) => {
        // Check if this profile is already a contact
        const isContact = contactIds.includes(profile.user_id);

        // Check if there's a pending request
        let requestStatus = null;
        if (requestsData) {
          const outgoingRequest = requestsData.find(
            (req) =>
              req.sender_id === userId && req.receiver_id === profile.user_id
          );

          const incomingRequest = requestsData.find(
            (req) =>
              req.sender_id === profile.user_id && req.receiver_id === userId
          );

          if (outgoingRequest) {
            requestStatus = {
              id: outgoingRequest.id,
              status: outgoingRequest.status,
              direction: "outgoing",
            };
          } else if (incomingRequest) {
            requestStatus = {
              id: incomingRequest.id,
              status: incomingRequest.status,
              direction: "incoming",
            };
          }
        }

        return {
          ...profile,
          isContact,
          requestStatus,
        };
      });

      setSearchResults(results);

      if (results.length === 0) {
        setMessage("No users found matching your search");
      }
    } catch (error) {
      console.error("Error searching for users:", error);
      setMessage("An error occurred while searching");
    } finally {
      setSearching(false);
    }
  };

  // Send a contact request
  const sendContactRequest = async (profile) => {
    if (!profile || !profile.user_id) return;

    try {
      setRequestStatus((prev) => ({
        ...prev,
        [profile.user_id]: "sending",
      }));

      const { error } = await supabase.from("contact_requests").insert({
        sender_id: userId,
        receiver_id: profile.user_id,
        message: contactMessage.trim(),
        status: "pending",
      });

      if (error) throw error;

      // Update the search results to show request sent
      setSearchResults((prev) =>
        prev.map((p) => {
          if (p.user_id === profile.user_id) {
            return {
              ...p,
              requestStatus: {
                status: "pending",
                direction: "outgoing",
              },
            };
          }
          return p;
        })
      );

      setSelectedUser(null);
      setContactMessage("");
      setMessage("Contact request sent successfully");
    } catch (error) {
      console.error("Error sending contact request:", error);
      setMessage("Failed to send contact request");
    } finally {
      setRequestStatus((prev) => ({
        ...prev,
        [profile.user_id]: null,
      }));
    }
  };

  // Cancel a pending contact request
  const cancelContactRequest = async (profile) => {
    if (!profile?.requestStatus?.id) return;

    try {
      setRequestStatus((prev) => ({
        ...prev,
        [profile.user_id]: "cancelling",
      }));

      const { error } = await supabase
        .from("contact_requests")
        .delete()
        .eq("id", profile.requestStatus.id);

      if (error) throw error;

      // Update the search results
      setSearchResults((prev) =>
        prev.map((p) => {
          if (p.user_id === profile.user_id) {
            return {
              ...p,
              requestStatus: null,
            };
          }
          return p;
        })
      );

      setMessage("Contact request cancelled");
    } catch (error) {
      console.error("Error cancelling contact request:", error);
      setMessage("Failed to cancel request");
    } finally {
      setRequestStatus((prev) => ({
        ...prev,
        [profile.user_id]: null,
      }));
    }
  };

  // Accept a contact request
  const acceptContactRequest = async (profile) => {
    if (!profile?.requestStatus?.id) return;

    try {
      setRequestStatus((prev) => ({
        ...prev,
        [profile.user_id]: "accepting",
      }));

      // 1. Create a new contact entry
      const { error: contactError } = await supabase.from("contacts").insert({
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

      if (contactError) throw contactError;

      // 2. Update the request status
      const { error: requestError } = await supabase
        .from("contact_requests")
        .update({ status: "accepted" })
        .eq("id", profile.requestStatus.id);

      if (requestError) throw requestError;

      // Update UI
      setSearchResults((prev) =>
        prev.map((p) => {
          if (p.user_id === profile.user_id) {
            return {
              ...p,
              isContact: true,
              requestStatus: {
                ...p.requestStatus,
                status: "accepted",
              },
            };
          }
          return p;
        })
      );

      setMessage("Contact request accepted");
      onContactAdded(); // Refresh contacts list
    } catch (error) {
      console.error("Error accepting contact request:", error);
      setMessage("Failed to accept request");
    } finally {
      setRequestStatus((prev) => ({
        ...prev,
        [profile.user_id]: null,
      }));
    }
  };

  // Reject a contact request
  const rejectContactRequest = async (profile) => {
    if (!profile?.requestStatus?.id) return;

    try {
      setRequestStatus((prev) => ({
        ...prev,
        [profile.user_id]: "rejecting",
      }));

      const { error } = await supabase
        .from("contact_requests")
        .update({ status: "rejected" })
        .eq("id", profile.requestStatus.id);

      if (error) throw error;

      // Update UI
      setSearchResults((prev) =>
        prev.map((p) => {
          if (p.user_id === profile.user_id) {
            return {
              ...p,
              requestStatus: {
                ...p.requestStatus,
                status: "rejected",
              },
            };
          }
          return p;
        })
      );

      setMessage("Contact request rejected");
    } catch (error) {
      console.error("Error rejecting contact request:", error);
      setMessage("Failed to reject request");
    } finally {
      setRequestStatus((prev) => ({
        ...prev,
        [profile.user_id]: null,
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        {!selectedUser ? (
          <>
            <h2 className="text-xl font-bold mb-4 text-white">
              Search by Name
            </h2>

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

              {message && (
                <p className="mt-2 text-sm text-gray-400">{message}</p>
              )}
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
                        {profile.name?.charAt(0).toUpperCase() || "?"}
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
                    <span className="text-green-500 text-sm">Contact</span>
                  ) : profile.requestStatus ? (
                    <div className="flex flex-col items-end">
                      <span
                        className={`text-xs ${
                          profile.requestStatus.status === "pending"
                            ? profile.requestStatus.direction === "outgoing"
                              ? "text-yellow-500"
                              : "text-blue-500"
                            : profile.requestStatus.status === "accepted"
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {profile.requestStatus.status === "pending"
                          ? profile.requestStatus.direction === "outgoing"
                            ? "Request Sent"
                            : "Request Received"
                          : profile.requestStatus.status}
                      </span>
                      {profile.requestStatus.direction === "incoming" &&
                        profile.requestStatus.status === "pending" && (
                          <div className="flex space-x-1 mt-1">
                            <button
                              onClick={() => acceptContactRequest(profile)}
                              disabled={requestStatus[profile.user_id]}
                              className="text-xs bg-green-600 hover:bg-green-500 px-2 py-1 rounded"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => rejectContactRequest(profile)}
                              disabled={requestStatus[profile.user_id]}
                              className="text-xs bg-red-600 hover:bg-red-500 px-2 py-1 rounded"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      {profile.requestStatus.direction === "outgoing" &&
                        profile.requestStatus.status === "pending" && (
                          <button
                            onClick={() => cancelContactRequest(profile)}
                            disabled={requestStatus[profile.user_id]}
                            className="text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded mt-1"
                          >
                            Cancel
                          </button>
                        )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedUser(profile)}
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
          </>
        ) : (
          <>
            <div className="flex items-center mb-4">
              <button
                onClick={() => setSelectedUser(null)}
                className="mr-2 p-1 rounded hover:bg-gray-700"
              >
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
              <h2 className="text-xl font-bold text-white">
                Send Contact Request
              </h2>
            </div>

            <div className="flex items-center mb-6">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700 mr-3">
                {selectedUser.profile_image_url ? (
                  <img
                    src={selectedUser.profile_image_url}
                    alt={selectedUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    {selectedUser.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium text-white">{selectedUser.name}</p>
                <p className="text-sm text-gray-400">
                  {selectedUser.username && `@${selectedUser.username}`}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label
                htmlFor="message"
                className="block text-sm text-gray-400 mb-1"
              >
                Optional Message
              </label>
              <textarea
                id="message"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Write a short message..."
                className="w-full bg-gray-700 text-white px-4 py-2 rounded h-24 resize-none"
              ></textarea>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => sendContactRequest(selectedUser)}
                disabled={requestStatus[selectedUser?.user_id] === "sending"}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
              >
                {requestStatus[selectedUser?.user_id] === "sending"
                  ? "Sending..."
                  : "Send Request"}
              </button>
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end">
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

// ContactDetails Component
const ContactDetails = ({ contactId, userId }) => {
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (contactId) {
      fetchContactDetails(contactId);
    }
  }, [contactId]);

  const fetchContactDetails = async (id) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      setContact(data);
    } catch (error) {
      console.error("Error fetching contact details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!contact) return;

    try {
      setIsUpdating(true);

      const { error } = await supabase
        .from("contacts")
        .update({ is_favorite: !contact.is_favorite })
        .eq("id", contact.id);

      if (error) throw error;

      setContact({ ...contact, is_favorite: !contact.is_favorite });
      setStatusMessage(
        contact.is_favorite
          ? "Contact removed from favorites"
          : "Contact added to favorites"
      );

      setTimeout(() => setStatusMessage(""), 3000);
    } catch (error) {
      console.error("Error toggling favorite status:", error);
      setStatusMessage("Failed to update favorite status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!contact) return;

    try {
      setIsUpdating(true);

      const { error } = await supabase
        .from("contacts")
        .update({ is_blocked: !contact.is_blocked })
        .eq("id", contact.id);

      if (error) throw error;

      setContact({ ...contact, is_blocked: !contact.is_blocked });
      setStatusMessage(
        contact.is_blocked ? "Contact unblocked" : "Contact blocked"
      );

      setShowBlockConfirm(false);
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (error) {
      console.error("Error toggling block status:", error);
      setStatusMessage("Failed to update block status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!contact) return;

    try {
      setIsUpdating(true);

      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contact.id);

      if (error) throw error;

      setShowDeleteConfirm(false);
      setStatusMessage("Contact deleted successfully");

      setTimeout(() => {
        navigate("/contacts");
      }, 2000);
    } catch (error) {
      console.error("Error deleting contact:", error);
      setStatusMessage("Failed to delete contact");
      setIsUpdating(false);
    }
  };

  const handleStartChat = () => {
    navigate(`/chat/${contactId}`);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <p className="text-gray-400">Loading contact details...</p>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <p className="text-gray-400">Contact not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-900 overflow-y-auto mt-[80px]">
      {/* Status message */}
      {statusMessage && (
        <div className="fixed top-20 right-4 bg-gray-800 text-white px-4 py-2 rounded shadow-lg">
          {statusMessage}
        </div>
      )}

      {/* Contact header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-700 mr-6">
            {contact.profile_image_url ? (
              <img
                src={contact.profile_image_url}
                alt={contact.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl">
                {contact.name?.charAt(0).toUpperCase() || "?"}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              {contact.name}
            </h1>
            {contact.username && (
              <p className="text-gray-400 mb-1">@{contact.username}</p>
            )}

            <div className="flex space-x-2 mt-2">
              <button
                onClick={handleStartChat}
                className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              >
                <svg
                  className="w-4 h-4 mr-1"
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

              <button
                onClick={handleToggleFavorite}
                disabled={isUpdating}
                className={`flex items-center px-3 py-1 rounded text-sm ${
                  contact.is_favorite
                    ? "bg-yellow-600 hover:bg-yellow-700"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill={contact.is_favorite ? "currentColor" : "none"}
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
                {contact.is_favorite ? "Favorited" : "Favorite"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Contact Information
        </h2>

        <div className="space-y-4">
          {contact.email && (
            <div className="flex items-start">
              <div className="w-10 flex-shrink-0 flex items-center justify-center mt-1">
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Email</p>
                <p className="text-white">{contact.email}</p>
              </div>
            </div>
          )}

          {contact.phone && (
            <div className="flex items-start">
              <div className="w-10 flex-shrink-0 flex items-center justify-center mt-1">
                <svg
                  className="w-5 h-5 text-gray-500"
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
              </div>
              <div>
                <p className="text-gray-400 text-sm">Phone</p>
                <p className="text-white">{contact.phone}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-10 pt-6 border-t border-gray-800">
          <h2 className="text-xl font-semibold text-white mb-4">Actions</h2>

          <div className="space-y-3">
            <button
              onClick={() => setShowBlockConfirm(true)}
              className="flex items-center px-4 py-2 w-full text-left rounded hover:bg-gray-800"
            >
              <svg
                className={`w-5 h-5 mr-3 ${
                  contact.is_blocked ? "text-red-500" : "text-gray-500"
                }`}
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
              <span
                className={contact.is_blocked ? "text-red-500" : "text-white"}
              >
                {contact.is_blocked ? "Unblock Contact" : "Block Contact"}
              </span>
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center px-4 py-2 w-full text-left rounded hover:bg-gray-800"
            >
              <svg
                className="w-5 h-5 mr-3 text-red-500"
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
              <span className="text-red-500">Delete Contact</span>
            </button>
          </div>
        </div>
      </div>

      {/* Block confirmation modal */}
      {showBlockConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              {contact.is_blocked ? "Unblock Contact?" : "Block Contact?"}
            </h3>
            <p className="text-gray-300 mb-6">
              {contact.is_blocked
                ? `Are you sure you want to unblock ${contact.name}? They will be able to contact you again.`
                : `Are you sure you want to block ${contact.name}? They won't be able to contact you until you unblock them.`}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowBlockConfirm(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleBlock}
                disabled={isUpdating}
                className={`px-4 py-2 rounded ${
                  contact.is_blocked
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isUpdating
                  ? "Processing..."
                  : contact.is_blocked
                  ? "Yes, Unblock"
                  : "Yes, Block"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              Delete Contact?
            </h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete {contact.name} from your contacts?
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteContact}
                disabled={isUpdating}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
              >
                {isUpdating ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;

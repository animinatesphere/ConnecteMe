// src/pages/Dashboard.jsx
import { useAuth } from "../login/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeChat, setActiveChat] = useState(null);

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  // Sample chat data to mimic the template
  const chats = [
    {
      id: 1,
      name: "Jasmine Thomp",
      lastMessage: "Incoming Video Call",
      time: "45 min",
      active: true,
      avatar: "https://i.pravatar.cc/150?img=5",
    },
    {
      id: 2,
      name: "Konstantin Frank",
      lastMessage: "But I'm Open To Other Ideas Too If You Had...",
      time: "1 days",
      avatar: "https://i.pravatar.cc/150?img=8",
    },
    {
      id: 3,
      name: "Mathias Devos",
      lastMessage: "https://www.envato.com/atomic-power...",
      time: "2 days",
      avatar: "https://i.pravatar.cc/150?img=12",
    },
    {
      id: 4,
      name: "Marie George",
      lastMessage: "Maybe We Can Sneak In Some Energy Drif...",
      time: "2 days",
      avatar: "https://i.pravatar.cc/150?img=9",
    },
    {
      id: 5,
      name: "Phillip Burke",
      lastMessage: "Just A Few More Weeks Though, We Can G...",
      time: "2 days",
      avatar: "https://i.pravatar.cc/150?img=3",
    },
    {
      id: 6,
      name: "Romy Schulte",
      lastMessage: "Media Received",
      time: "2 days",
      avatar: "https://i.pravatar.cc/150?img=4",
    },
    {
      id: 7,
      name: "Frances Arnold",
      lastMessage: "Scouts Honor! Thanks A Million.",
      time: "2 days",
      avatar: "https://i.pravatar.cc/150?img=6",
    },
    {
      id: 8,
      name: "Nina Dubois",
      lastMessage: "https://www.envato.com/atomic-power-p...",
      time: "2 days",
      avatar: "https://i.pravatar.cc/150?img=7",
    },
    {
      id: 9,
      name: "Albert Henderson",
      lastMessage: "I Could Definitely Go For Some Chips, Salta...",
      time: "2 days",
      avatar: "https://i.pravatar.cc/150?img=11",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left Sidebar */}
      <div className="w-16 bg-gray-800 flex flex-col items-center py-4 border-r border-gray-700">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <button className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
        <button className="w-10 h-10 text-gray-400 hover:bg-gray-700 rounded-full flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </button>
        <button className="w-10 h-10 text-gray-400 hover:bg-gray-700 rounded-full flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <button className="w-10 h-10 text-gray-400 hover:bg-gray-700 rounded-full flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
        </button>
        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center"
          >
            <img
              src="https://i.pravatar.cc/150?img=1"
              alt="Profile"
              className="w-10 h-10 rounded-full"
            />
          </button>
        </div>
      </div>

      {/* Chat List Sidebar */}
      <div className="w-72 bg-gray-800 border-r border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold">Chats</h1>
            <div className="flex space-x-2">
              <button className="p-1.5 bg-gray-700 text-gray-400 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
              <button className="p-1.5 bg-gray-700 text-gray-400 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search contact / chat"
              className="w-full bg-gray-700 text-gray-200 pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 absolute left-3 top-2.5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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

        <div className="overflow-y-auto h-[calc(100vh-86px)]">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`flex items-start p-3 border-b border-gray-700 hover:bg-gray-700 cursor-pointer ${
                activeChat === chat.id ? "bg-gray-700" : ""
              }`}
              onClick={() => setActiveChat(chat.id)}
            >
              <div className="relative mr-3">
                <img
                  src={chat.avatar}
                  alt={chat.name}
                  className="w-10 h-10 rounded-full"
                />
                {chat.active && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-semibold truncate">
                    {chat.name}
                  </h2>
                  <span className="text-xs text-gray-400">{chat.time}</span>
                </div>
                <p className="text-xs text-gray-400 truncate">
                  {chat.lastMessage}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-900">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <div className="flex items-center">
                <img
                  src={chats.find((c) => c.id === activeChat)?.avatar}
                  alt="Profile"
                  className="w-10 h-10 rounded-full mr-3"
                />
                <div>
                  <h2 className="font-semibold">
                    {chats.find((c) => c.id === activeChat)?.name}
                  </h2>
                  <span className="text-xs text-green-500">Active</span>
                </div>
              </div>
              <div className="flex space-x-3">
                <button className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </button>
                <button className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
                <button className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
                <button className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16m-7 6h7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
              {/* Sample messages */}
              <div className="flex justify-start mb-4">
                <img
                  src={chats.find((c) => c.id === activeChat)?.avatar}
                  alt="Profile"
                  className="w-8 h-8 rounded-full mr-2"
                />
                <div className="bg-gray-800 rounded-lg p-3 max-w-xs">
                  <p className="text-sm">
                    https://www.envato.com/atomic-power-plant-engine/
                  </p>
                </div>
              </div>
              <div className="flex justify-start mb-4">
                <img
                  src={chats.find((c) => c.id === activeChat)?.avatar}
                  alt="Profile"
                  className="w-8 h-8 rounded-full mr-2"
                />
                <div className="bg-gray-800 rounded-lg p-3 max-w-xs">
                  <p className="text-sm">I hope these article helps.</p>
                </div>
              </div>
              <div className="flex justify-end mb-4">
                <div className="bg-blue-600 rounded-lg p-3 max-w-xs ml-auto">
                  <p className="text-sm">
                    Do you know which App or feature it will require to set up.
                  </p>
                </div>
              </div>
              <div className="flex justify-center mb-4">
                <div className="bg-gray-800 rounded-lg p-2 text-xs text-gray-400">
                  Aug 22, 2022, 3:05 PM
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 max-w-xs mb-4 ml-auto">
                <div className="flex items-center justify-between">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium">Audio Call</p>
                    <p className="text-xs text-gray-400 text-right">3:25 PM</p>
                  </div>
                </div>
              </div>
              <div className="bg-red-500 rounded-lg p-3 max-w-xs mb-4 ml-auto">
                <div className="flex items-center justify-between">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium">Missed Audio Call</p>
                    <p className="text-xs text-white text-right">3:29 PM</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 max-w-xs mb-4 ml-auto">
                <div className="flex items-center justify-between">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium">Video Call</p>
                    <p className="text-xs text-gray-400 text-right">3:29 PM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="p-3 border-t border-gray-700">
              <div className="flex items-center">
                <button className="p-2 text-gray-400 rounded-full hover:bg-gray-700 mr-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-700 text-gray-200 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="p-2 text-gray-400 rounded-full hover:bg-gray-700 ml-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                </button>
                <button className="p-2 bg-blue-600 rounded-full ml-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
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
            </div>
          </>
        ) : (
          // Welcome screen when no chat is selected
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-center max-w-md">
              <h2 className="text-2xl font-bold mb-2">
                Welcome to your Dashboard, {user?.email}
              </h2>
              <p className="text-gray-400 mb-6">
                Select a conversation to start chatting or create a new one!
              </p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Start a new conversation
              </button>
              <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                <p className="text-sm">
                  This is a protected route - only authenticated users can see
                  this page.
                </p>
                <button
                  onClick={handleLogout}
                  className="mt-4 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar (User Profile) */}
      {activeChat && (
        <div className="w-64 bg-gray-800 border-l border-gray-700">
          <div className="p-6 text-center border-b border-gray-700">
            <img
              src={chats.find((c) => c.id === activeChat)?.avatar}
              alt="Profile"
              className="w-20 h-20 rounded-full mx-auto mb-3"
            />
            <h2 className="text-lg font-semibold">
              {chats.find((c) => c.id === activeChat)?.name}
            </h2>
            <p className="text-xs text-green-500">Active Now</p>

            <div className="flex justify-center mt-4 space-x-3">
              <button className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>
              <button className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </button>
              <button className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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

          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Options</h3>
              <button className="text-blue-500 text-sm">Customize</button>
            </div>

            <div className="mb-6">
              <p className="text-xs text-gray-400 mb-2">CHANGE THEME</p>
              <div className="flex space-x-2">
                <button className="w-8 h-8 rounded-full bg-gray-200 border-2 border-blue-500"></button>
                <button className="w-8 h-8 rounded-full bg-gray-600"></button>
                <button className="w-8 h-8 rounded-full bg-green-500"></button>
                <button className="w-8 h-8 rounded-full bg-red-500"></button>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-2">CHANGE BACKGROUND</p>
              <div className="grid grid-cols-3 gap-2">
                <button className="w-full h-16 rounded-lg bg-blue-200 overflow-hidden">
                  <img
                    src="/api/placeholder/100/100"
                    alt="Theme"
                    className="w-full h-full object-cover"
                  />
                </button>
                <button className="w-full h-16 rounded-lg bg-orange-200 overflow-hidden">
                  <img
                    src="/api/placeholder/100/100"
                    alt="Theme"
                    className="w-full h-full object-cover"
                  />
                </button>
                <button className="w-full h-16 rounded-lg bg-pink-200 overflow-hidden">
                  <img
                    src="/api/placeholder/100/100"
                    alt="Theme"
                    className="w-full h-full object-cover"
                  />
                </button>
                <button className="w-full h-16 rounded-lg bg-yellow-200 overflow-hidden">
                  <img
                    src="/api/placeholder/100/100"
                    alt="Theme"
                    className="w-full h-full object-cover"
                  />
                </button>
                <button className="w-full h-16 rounded-lg bg-gray-200 overflow-hidden">
                  <img
                    src="/api/placeholder/100/100"
                    alt="Theme"
                    className="w-full h-full object-cover"
                  />
                </button>
                <button className="w-full h-16 rounded-lg bg-purple-200 overflow-hidden">
                  <img
                    src="/api/placeholder/100/100"
                    alt="Theme"
                    className="w-full h-full object-cover"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

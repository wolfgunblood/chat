import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Search,
  Paperclip,
  ArrowUp,
  Image,
  Video,
  FileText,
  Mic,
  Smile,
  SendHorizontal,
  CircleDot,
  Dot,
} from "lucide-react";
import io from "socket.io-client";
import { AvatarFallback, AvatarImage } from "./components/ui/avatar";

const socket = io("http://localhost:8000");

export default function Hero() {
  const [sessionId, setSessionId] = useState(null);
  const [username, setUsername] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [recipientSessionId, setRecipientSessionId] = useState("");
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const [notifications, setNotifications] = useState({});
  const [uploading, setUploading] = useState(false);
  const [lastMessages, setLastMessages] = useState({});
  const [currentUser, setCurrentUser] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const handleReconnect = useCallback(() => {
    const storedSessionId = localStorage.getItem("sessionId");
    const storedUsername = localStorage.getItem("username");
    if (storedSessionId && storedUsername) {
      socket.emit("reconnect", storedSessionId, (response) => {
        if (response.success) {
          setSessionId(storedSessionId);
          setUsername(storedUsername);
        } else {
          localStorage.removeItem("sessionId");
          localStorage.removeItem("username");
          setSessionId(null);
          setUsername("");
        }
      });
    }
  }, []);

  const handleLogin = useCallback(() => {
    if (username.trim()) {
      socket.emit("login", username, (response) => {
        if (response.success) {
          setCurrentUser(response);
          localStorage.setItem("sessionId", response.sessionId);
          localStorage.setItem("username", username);
          setSessionId(response.sessionId);
          setError("");
        } else {
          setError(response.message);
        }
      });
    }
  }, [username]);

  const sendMessage = useCallback(() => {
    if (input.trim() && recipientSessionId) {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          from: sessionId,
          to: recipientSessionId,
          message: input,
          mediaType: "",
          mediaUrl: "",
        },
      ]);
      setLastMessages((prev) => ({
        ...prev,
        [recipientSessionId]: input,
      }));
      socket.emit("privateMessage", {
        from: sessionId,
        to: recipientSessionId,
        message: input,
        mediaType: "",
        mediaUrl: "",
      });
      setInput("");
      setTyping(false);
      socket.emit("typing", { to: recipientSessionId, typing: false });
    }
  }, [input, recipientSessionId, sessionId]);

  const handleUserListUpdate = useCallback(
    (userList) => {
      setUsers(userList.filter((user) => user.sessionId !== sessionId));
    },
    [sessionId]
  );

  const handleReceiveMessage = useCallback(
    ({ from, to, message, mediaType, mediaUrl }) => {
      if (to === sessionId) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { from, to, message, mediaType, mediaUrl },
        ]);
        const otherUserId = from === sessionId ? to : from;
        setLastMessages((prev) => ({
          ...prev,
          [otherUserId]:
            message ||
            `${
              mediaType.charAt(0).toUpperCase() + mediaType.slice(1)
            } received`,
        }));
        if (from !== recipientSessionId) {
          // Increment unread message count for this user
          setNotifications((prevNotifications) => ({
            ...prevNotifications,
            [from]: (prevNotifications[from] || 0) + 1,
          }));
        }
      }
    },
    [recipientSessionId, sessionId]
  );

  const handleTyping = useCallback(({ username, typing }) => {
    setIsTyping(typing);
    setTypingUser(username || "Someone");
  }, []);
  // const handleTyping = useCallback(
  //   ({ username, typing, sessionId: typingSessionId }) => {
  //     if (recipientSessionId === typingSessionId) {
  //       setIsTyping(typing);
  //       setTypingUser(username || "Someone");
  //     } else {
  //       setIsTyping(false);
  //     }
  //   },
  //   [recipientSessionId]
  // );

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!typing && recipientSessionId) {
      setTyping(true);
      socket.emit("typing", { to: recipientSessionId, typing: true });
    }
    if (e.target.value === "") {
      setTyping(false);
      socket.emit("typing", { to: recipientSessionId, typing: false });
    }
  };

  const handleUserClick = (userSessionId) => {
    setRecipientSessionId(userSessionId);
    // Clear notification count for the selected user
    setNotifications((prevNotifications) => {
      const updatedNotifications = { ...prevNotifications };
      delete updatedNotifications[userSessionId];
      return updatedNotifications;
    });
  };

  useEffect(() => {
    handleReconnect();
  }, [handleReconnect]);

  useEffect(() => {
    socket.on("updateUserList", handleUserListUpdate);
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("display", handleTyping);

    return () => {
      socket.off("updateUserList", handleUserListUpdate);
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("display", handleTyping);
    };
  }, [handleUserListUpdate, handleReceiveMessage, handleTyping]);

  const filteredMessages = messages.filter(
    (message) =>
      (message.from === sessionId && message.to === recipientSessionId) ||
      (message.from === recipientSessionId && message.to === sessionId)
  );

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (file && recipientSessionId) {
      const formData = new FormData();
      const mediaType = file.type.startsWith("image/") ? "image" : "video";
      formData.append("file", file);
      formData.append("sessionId", recipientSessionId);
      formData.append("mediaType", mediaType);

      setUploading(true);

      fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then(({ fileUrl }) => {
          const mediaType = file.type.startsWith("image/") ? "image" : "video";
          socket.emit("privateMessage", {
            from: sessionId,
            to: recipientSessionId,
            mediaType,
            mediaUrl: fileUrl,
          });
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              from: sessionId,
              to: recipientSessionId,
              mediaType: mediaType,
              mediaUrl: fileUrl,
            },
          ]);
          setLastMessages((prev) => ({
            ...prev,
            [recipientSessionId]: `${
              mediaType.charAt(0).toUpperCase() + mediaType.slice(1)
            } sent`,
          }));
        })
        .finally(() => setUploading(false));
    }
  };

  const filteredUsers = users
    .filter((user) => {
      if (activeTab === "unread") {
        return notifications[user.sessionId];
      }
      return true;
    })
    .filter((user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const ChatBubble = ({ message }) => {
    console.log(message);
    const isImage = message.mediaType === "image";
    const isVideo = message.mediaType === "video";
    return (
      <div
        className={`flex ${
          message.from === sessionId ? "justify-end" : "items-start"
        } mb-4`}
      >
        {!(message.from === sessionId) && (
          <Avatar>
            <AvatarImage
              src={
                users.find((user) => user.sessionId === recipientSessionId)
                  ?.picture
              }
              alt={
                users.find((user) => user.sessionId === recipientSessionId)
                  ?.username
              }
            />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        )}
        <div
          className={`flex flex-col max-w-[50%] ${
            message.from === sessionId ? "items-end" : "items-start"
          }`}
        >
          <span className="text-sm font-semibold mb-1">
            {message.from === sessionId
              ? "You"
              : users.find((user) => user.sessionId === message.from)
                  ?.username || "Someone"}
          </span>
          <div
            className={`rounded-lg p-3  ${
              message.from === sessionId
                ? "bg-orange-500 text-white"
                : "bg-gray-200 text-black"
            }`}
          >
            {message.message && <p className="text-sm">{message.message}</p>}
            {isImage && (
              <img
                src={message.mediaUrl}
                alt="Shared content"
                className="mt-2 max-w-full rounded"
              />
            )}
            {isVideo && (
              <video controls className="mt-2 max-w-full rounded">
                <source src={message.fileUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="w-full max-w-sm bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-center mb-4">Login</h2>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            className="w-full border border-gray-300 rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <input
            type="password"
            // value={username}
            // onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter password"
            className="w-full border border-gray-300 rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-orange-500 text-white rounded-lg px-4 py-2 focus:outline-none hover:bg-orange-600"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  // console.log(users);
  console.log(lastMessages);
  // console.log(input);
  // console.log(messages);

  return (
    <div className="flex h-screen bg-white">
      {/* Left sidebar */}
      <div className="w-1/3 border-r flex flex-col">
        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="search"
              placeholder="Search"
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Tabs
            defaultValue="all"
            className="mb-4"
            onValueChange={(value) => setActiveTab(value)}
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger
                value="all"
                className={`text-xs ${
                  activeTab === "all"
                    ? "text-orange-500 border-b-2 border-orange-500"
                    : ""
                }`}
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className={`text-xs ${
                  activeTab === "unread"
                    ? "text-orange-500 border-b-2 border-orange-500"
                    : ""
                }`}
              >
                Unread
              </TabsTrigger>
              <TabsTrigger
                value="archived"
                className={`text-xs ${
                  activeTab === "archived"
                    ? "text-orange-500 border-b-2 border-orange-500"
                    : ""
                }`}
              >
                Archived
              </TabsTrigger>
              <TabsTrigger
                value="blocked"
                className={`text-xs ${
                  activeTab === "blocked"
                    ? "text-orange-500 border-b-2 border-orange-500"
                    : ""
                }`}
              >
                Blocked
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <ScrollArea className="flex flex-col">
          {filteredUsers.map((user, index) => (
            <div
              key={index}
              onClick={() => handleUserClick(user.sessionId)}
              className={`flex items-center p-4 hover:bg-gray-100 cursor-pointer ${
                user.online ? "" : ""
              }`}
            >
              <Avatar>
                <AvatarImage src={user.picture} alt={user.name} />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>{" "}
              <div className="flex-1 min-w-0 ml-4">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-sm font-semibold truncate">
                    {user.username}
                  </h3>
                </div>
                {/* <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p> */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {lastMessages[user.sessionId] && (
                      <span className="text-xs">
                        {user.username}
                        {":"}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 truncate w-40">
                      {lastMessages[user.sessionId]}
                    </span>
                  </div>
                  {notifications[user.sessionId] && (
                    <span className="bg-red-400 text-white rounded-md px-2 py-1 text-xs">
                      {notifications[user.sessionId]}
                    </span>
                  )}
                </div>
                {/* <span
                  className={`w-3 h-3 rounded-full ${
                    user.online ? "bg-green-500" : "bg-red-500"
                  }`}
                ></span> */}
                <p className="text-xs text-gray-500">
                  {lastMessages[user.sessionId]?.message ||
                    (lastMessages[user.sessionId]?.mediaType === "image"
                      ? "Image sent"
                      : lastMessages[user.sessionId]?.mediaType === "video"
                      ? "Video sent"
                      : "")}
                </p>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Kristine typing status */}
        <div className="border-b p-4">
          <div className="flex items-center">
            <Avatar>
              <AvatarImage
                src={
                  users.find((user) => user.sessionId === recipientSessionId)
                    ?.picture
                }
                alt={
                  users.find((user) => user.sessionId === recipientSessionId)
                    ?.username
                }
              />
            </Avatar>{" "}
            {/* {user && <CircleDot stroke={user?.online ? "green" : "red"} />} */}
            <div className="ml-2">
              {recipientSessionId && (
                <span className="flex items-center">
                  <h2 className="font-bold text-xl">
                    {
                      users.find(
                        (user) => user.sessionId === recipientSessionId
                      )?.username
                    }
                  </h2>
                  <Dot
                    size={42}
                    className={`${
                      users.find(
                        (user) => user.sessionId === recipientSessionId
                      )?.online
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  />
                </span>
              )}

              {isTyping && <p className="text-sm text-gray-500">Typing...</p>}
            </div>
          </div>
        </div>

        {/* Chat messages */}
        <ScrollArea className="flex-1 p-4">
          {filteredMessages.map((message, index) => (
            <ChatBubble key={index} message={message} />
          ))}
        </ScrollArea>

        {/* Input area */}
        <div className="border-t p-4">
          <div className="relative flex items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 absolute left-2"
                >
                  <Smile className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                className="w-80 h-64 p-0"
              >
                <div className="p-4">
                  <h2 className="text-lg font-semibold mb-2">Emojis</h2>
                  <ScrollArea className="h-48">
                    <div className="grid grid-cols-8 gap-2">
                      {/* Placeholder emojis */}
                      {[...Array(64)].map((_, i) => (
                        <div
                          key={i}
                          className="text-2xl cursor-pointer hover:bg-gray-100 rounded p-1"
                        >
                          😀
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
            <Input
              placeholder="Type your message here"
              className="pl-12 pr-20"
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <div className="absolute right-2 flex items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40">
                  <div className="flex flex-col space-y-2">
                    <Button variant="ghost" size="sm" className="justify-start">
                      <label className="flex items-center cursor-pointer">
                        <Image className="mr-2 h-4 w-4" />
                        <span>Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleMediaUpload}
                        />
                      </label>
                    </Button>
                    <Button variant="ghost" size="sm" className="justify-start">
                      <label className="flex items-center cursor-pointer">
                        <Video className="mr-2 h-4 w-4" />
                        <span>Video</span>
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={handleMediaUpload}
                        />
                      </label>
                    </Button>
                    {/* <Button variant="ghost" size="sm" className="justify-start">
                      <FileText className="mr-2 h-4 w-4" />
                      Document
                    </Button>
                    <Button variant="ghost" size="sm" className="justify-start">
                      <Mic className="mr-2 h-4 w-4" />
                      Audio
                    </Button> */}
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                onClick={sendMessage}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <SendHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getRequest, postRequest, baseUrl, socketUrl } from '../utils/services';
import { io } from 'socket.io-client';

const Chat = () => {
    const { user } = useContext(AuthContext);

    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersError, setUsersError] = useState(null);

    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedChat, setSelectedChat] = useState(null);
    const [chatError, setChatError] = useState(null);

    const [userChatMap, setUserChatMap] = useState({}); // userId -> chatId
    const [chatNotifications, setChatNotifications] = useState({}); // chatId -> count

    const [messages, setMessages] = useState([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [messagesError, setMessagesError] = useState(null);

    const [text, setText] = useState('');
    const [sendLoading, setSendLoading] = useState(false);
    const [sendError, setSendError] = useState(null);

    const socketRef = useRef(null);
    const selectedChatRef = useRef(null);

    // Group creation
    const [groupName, setGroupName] = useState('');
    const [groupMembersInput, setGroupMembersInput] = useState('');
    const [groupChats, setGroupChats] = useState([]);
    const [createGroupLoading, setCreateGroupLoading] = useState(false);
    const [createGroupError, setCreateGroupError] = useState(null);

    // Load all users (sidebar)
    useEffect(() => {
        const fetchUsers = async () => {
            setUsersLoading(true);
            setUsersError(null);
            const res = await getRequest(`${baseUrl}/users`);
            setUsersLoading(false);
            if (res.error) return setUsersError(res.message);
            const filtered = Array.isArray(res) ? res.filter((u) => u._id !== user?._id) : [];
            setUsers(filtered);
        };
        fetchUsers();
    }, [user]);

    // Keep selectedChat ref in sync for socket handlers
    useEffect(() => {
        selectedChatRef.current = selectedChat;
    }, [selectedChat]);

    // Socket connection
    useEffect(() => {
        if (!user?._id) return;
        const socket = io(socketUrl, { transports: ['websocket'] });
        socketRef.current = socket;
        socket.emit('setup', user._id);

        socket.on('message:receive', ({ chatId, message, chat }) => {
            // If viewing this chat, append; otherwise bump notification
            if (selectedChatRef.current?._id === chatId) {
                setMessages((prev) => {
                    const exists = prev.find((m) => m._id === message._id);
                    return exists ? prev : [...prev, message];
                });
                setChatNotifications((prev) => ({ ...prev, [chatId]: 0 }));
            } else {
                setChatNotifications((prev) => ({ ...prev, [chatId]: (prev[chatId] || 0) + 1 }));
            }

            if (chat?.isGroup) {
                setGroupChats((prev) => {
                    if (prev.some((c) => c._id === chat._id)) return prev;
                    return [...prev, chat];
                });
            }
        });

        socket.on('group:created', (chat) => {
            if (!chat?.members?.includes(user._id)) return;
            setGroupChats((prev) => {
                if (prev.some((c) => c._id === chat._id)) return prev;
                return [...prev, chat];
            });
            setChatNotifications((prev) => ({ ...prev, [chat._id]: 0 }));
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    // Load chats (including groups) for this user; keep refreshed so newly-added members see groups
    useEffect(() => {
        let interval;
        const fetchChats = async () => {
            if (!user?._id) return;
            const res = await getRequest(`${baseUrl}/chats/${user._id}`);
            if (res?.error || !Array.isArray(res)) return;
            const groups = res.filter((c) => c.isGroup);
            setGroupChats(groups);
            // Map direct chats to user ids for notifications
            const direct = res.filter((c) => !c.isGroup);
            const directMap = {};
            direct.forEach((c) => {
                const other = (c.members || []).find((m) => m !== user?._id);
                if (other) directMap[other] = c._id;
            });
            setUserChatMap((prev) => ({ ...prev, ...directMap }));
        };

        fetchChats();
        interval = setInterval(fetchChats, 5000);
        return () => clearInterval(interval);
    }, [user]);

    const loadMessages = useCallback(async (chatId, { resetSeen } = {}) => {
        if (!chatId) return;
        setMessagesLoading(true);
        setMessagesError(null);
        const res = await getRequest(`${baseUrl}/messages/${chatId}`);
        setMessagesLoading(false);
        if (res.error) return setMessagesError(res.message);
        setMessages(res);
        if (resetSeen) {
            setChatNotifications((prev) => ({ ...prev, [chatId]: 0 }));
        }
    }, []);

    const openConversation = useCallback(async (otherUser) => {
        if (!user?._id) return;
        setSelectedUser(otherUser);
        setChatError(null);
        setMessages([]);
        setSelectedChat(null);

        // Try to find existing chat
        const existing = await getRequest(`${baseUrl}/chats/find/${user._id}/${otherUser._id}`);
        if (existing?.error) {
            return setChatError(existing.message);
        }

        let chat = existing;

        // If no chat exists, create one
        if (!chat?._id) {
            const created = await postRequest(`${baseUrl}/chats`, {
                firstId: user._id,
                secondId: otherUser._id
            });
            if (created?.error) {
                return setChatError(created.message);
            }
            chat = created;
        }

        setSelectedChat(chat);
        setUserChatMap((prev) => ({ ...prev, [otherUser._id]: chat._id }));
        setChatNotifications((prev) => ({ ...prev, [chat._id]: 0 }));
        loadMessages(chat._id, { resetSeen: true });
        socketRef.current?.emit('joinChat', chat._id);
    }, [user, loadMessages]);

    const handleSelectGroup = (chat) => {
        setSelectedUser(null);
        setSelectedChat(chat);
        setChatError(null);
        setChatNotifications((prev) => ({ ...prev, [chat._id]: 0 }));
        loadMessages(chat._id, { resetSeen: true });
        socketRef.current?.emit('joinChat', chat._id);
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        setCreateGroupLoading(true);
        setCreateGroupError(null);

        // Accept comma-separated emails or IDs and resolve them to user IDs
        const rawMembers = groupMembersInput
            .split(',')
            .map((m) => m.trim())
            .filter(Boolean);

        const resolvedIds = [];
        rawMembers.forEach((entry) => {
            const match = users.find(
                (u) => u._id === entry || u.email?.toLowerCase() === entry.toLowerCase()
            );
            if (match) resolvedIds.push(match._id);
        });

        const missing = rawMembers.filter(
            (entry) => !users.some((u) => u._id === entry || u.email?.toLowerCase() === entry.toLowerCase())
        );

        if (missing.length > 0) {
            setCreateGroupLoading(false);
            return setCreateGroupError(`Not found: ${missing.join(', ')}`);
        }

        // ensure current user is included
        if (user?._id && !resolvedIds.includes(user._id)) {
            resolvedIds.push(user._id);
        }

        if (resolvedIds.length < 2) {
            setCreateGroupLoading(false);
            return setCreateGroupError('Add at least 2 members');
        }

        const res = await postRequest(`${baseUrl}/chats/group`, {
            memberIds: resolvedIds,
            name: groupName.trim()
        });

        setCreateGroupLoading(false);

        if (res.error) {
            return setCreateGroupError(res.message);
        }

        setGroupChats((prev) => [...prev, res]);
        setGroupName('');
        setGroupMembersInput('');
        handleSelectGroup(res);
        socketRef.current?.emit('group:created', res);
    };

    // Poll for new messages on the open chat
    useEffect(() => {
        if (!selectedChat?._id) return;
        const interval = setInterval(async () => {
            const res = await getRequest(`${baseUrl}/messages/${selectedChat._id}`);
            if (res?.error || !Array.isArray(res)) return;

            setMessages((prev) => {
                const prevLen = prev.length;
                const newLen = res.length;
                if (newLen <= prevLen) return prev;
                const incoming = res.slice(prevLen);
                const fromOthers = incoming.filter((m) => m.senderId !== user?._id).length;
                if (fromOthers > 0) {
                    // Set to the number of new incoming messages (do not accumulate multiples)
                    setChatNotifications((prevMap) => ({
                        ...prevMap,
                        [selectedChat._id]: fromOthers,
                    }));
                }
                return res;
            });
        }, 4000);

        return () => clearInterval(interval);
    }, [selectedChat, user]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!selectedChat?._id || !text.trim()) return;
        setSendLoading(true);
        setSendError(null);
        const res = await postRequest(`${baseUrl}/messages`, {
            chatId: selectedChat._id,
            senderId: user._id,
            text: text.trim()
        });
        setSendLoading(false);
        if (res.error) return setSendError(res.message);
        setMessages((prev) => [...prev, res]);
        setText('');

        const recipients = (selectedChat.members || []).filter((m) => m !== user._id);
        socketRef.current?.emit('message:send', {
            chatId: selectedChat._id,
            message: res,
            recipients,
            chat: selectedChat
        });
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px', height: '80vh' }}>
            <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, overflowY: 'auto' }}>
                <h5 style={{ marginBottom: 12 }}>Users</h5>
                {usersLoading && <div>Loading users...</div>}
                {usersError && <div style={{ color: 'red' }}>{usersError}</div>}
                {!usersLoading && !usersError && users.length === 0 && <div>No other users found.</div>}

                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {users.map((u) => (
                        <li
                            key={u._id}
                            onClick={() => openConversation(u)}
                            style={{
                                padding: '10px 12px',
                                borderRadius: 6,
                                marginBottom: 8,
                                cursor: 'pointer',
                                background: selectedUser?._id === u._id ? '#eef2ff' : '#f8f9fa',
                                border: '1px solid #eee'
                            }}
                        >
                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>{u.name || 'Unnamed'}</span>
                                {chatNotifications[userChatMap[u._id]] > 0 && (
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: 12,
                                        background: '#f59e0b',
                                        color: '#000',
                                        fontSize: 12,
                                        fontWeight: 700
                                    }}>
                                        ({chatNotifications[userChatMap[u._id]]})
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: 12, color: '#666' }}>{u.email}</div>
                        </li>
                    ))}
                </ul>

                <hr />
                <h5 style={{ marginBottom: 8 }}>Groups</h5>
                <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    <input
                        type="text"
                        placeholder="Group name"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Member emails or IDs (comma separated)"
                        value={groupMembersInput}
                        onChange={(e) => setGroupMembersInput(e.target.value)}
                    />
                    <button type="submit" disabled={createGroupLoading}>
                        {createGroupLoading ? 'Creating group...' : 'Create group'}
                    </button>
                    {createGroupError && <div style={{ color: 'red' }}>{createGroupError}</div>}
                </form>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {groupChats.map((g) => (
                        <li
                            key={g._id}
                            onClick={() => handleSelectGroup(g)}
                            style={{
                                padding: '10px 12px',
                                borderRadius: 6,
                                marginBottom: 8,
                                cursor: 'pointer',
                                background: selectedChat?._id === g._id ? '#eef2ff' : '#f8f9fa',
                                border: '1px solid #eee'
                            }}
                        >
                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>{g.name || 'Group'}</span>
                                {chatNotifications[g._id] > 0 && (
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: 12,
                                        background: '#f59e0b',
                                        color: '#000',
                                        fontSize: 12,
                                        fontWeight: 700
                                    }}>
                                        ({chatNotifications[g._id]})
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: 12, color: '#666' }}>{(g.members || []).length} members</div>
                        </li>
                    ))}
                    {groupChats.length === 0 && <li style={{ color: '#777' }}>No groups yet.</li>}
                </ul>
            </div>

            <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column' }}>
                {selectedUser || (selectedChat && selectedChat.isGroup) ? (
                    <>
                        <div style={{ marginBottom: 8, fontWeight: 600 }}>
                            {selectedChat?.isGroup
                                ? `Group: ${selectedChat.name || 'Group'}`
                                : `Chat with ${selectedUser?.name || selectedUser?.email}`}
                        </div>
                        {chatError && <div style={{ color: 'red', marginBottom: 8 }}>{chatError}</div>}
                        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #eee', borderRadius: 6, padding: 8, marginBottom: 8 }}>
                            {selectedChat && messagesLoading && <div>Loading messages...</div>}
                            {selectedChat && messagesError && <div style={{ color: 'red' }}>{messagesError}</div>}
                            {selectedChat && !messagesLoading && !messagesError && messages.length === 0 && <div>No messages yet.</div>}
                            {messages.map((m) => (
                                <div key={m._id} style={{ marginBottom: 6 }}>
                                    <div style={{ fontSize: 12, color: '#666' }}>{m.senderId === user._id ? 'You' : selectedChat?.isGroup ? m.senderId : selectedUser?.name || m.senderId}</div>
                                    <div style={{ padding: '6px 8px', background: m.senderId === user._id ? '#dbeafe' : '#f1f3f5', borderRadius: 6 }}>{m.text}</div>
                                </div>
                            ))}
                            {!selectedChat && <div style={{ color: '#777' }}>Select a user to start chatting.</div>}
                        </div>
                        <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="text"
                                placeholder="Type a message"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                style={{ flex: 1 }}
                                disabled={!selectedChat}
                            />
                            <button type="submit" disabled={sendLoading || !selectedChat}>
                                {sendLoading ? 'Sending...' : 'Send'}
                            </button>
                        </form>
                        {sendError && <div style={{ color: 'red', marginTop: 6 }}>{sendError}</div>}
                    </>
                ) : (
                    <div style={{ color: '#777' }}>Select a user from the sidebar to start chatting.</div>
                )}
            </div>
        </div>
    );
};
 
export default Chat;
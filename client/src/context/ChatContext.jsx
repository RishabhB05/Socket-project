import { createContext, useState, useEffect } from "react";
import { baseUrl, getRequest } from "../utils/services";

export const ChatContext = createContext(null);
export const ChatContextProvider = ({ user, children }) => {
    const [userChats, setUserChats] = useState([]);
    const [isUserChatsLoading, setIsUserChatsLoading] = useState(false);
    const [userChatsError, setUserChatsError] = useState(null);

    useEffect(() => {
        const fetchUserChats = async () => {
            if (!user?._id) return;
            setIsUserChatsLoading(true);
            setUserChatsError(null);

            const response = await getRequest(`${baseUrl}/chats/${user._id}`);
            setIsUserChatsLoading(false);

            if (response.error) {
                return setUserChatsError(response.message);
            }
            setUserChats(response);
        };

        fetchUserChats();
    }, [user]);

    return (
        <ChatContext.Provider value={{ userChats, setUserChats, isUserChatsLoading, userChatsError }}>
            {children}
        </ChatContext.Provider>
    );
};
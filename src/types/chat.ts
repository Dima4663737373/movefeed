export interface Message {
    id: string;
    sender: string;
    receiver: string;
    content: string;
    timestamp: number;
    read: boolean;
}

export interface Conversation {
    contact: string;
    lastMessage: Message;
}

export interface Profile {
    displayName?: string;
    avatar?: string;
}

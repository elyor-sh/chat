export interface Message {
  id: string;
  content: string;
  sender: User;
  timestamp: Date;
  attachments?: Attachment[];
  deliveryStatus: DeliveryStatus;
  quotedMessage?: Message;
  formattedContent?: FormattedContent;
}

export interface User {
  id: string;
  name: string;
  role: 'client' | 'employee';
  avatar?: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'document';
  url: string;
  name: string;
  size: number;
}

export type DeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error';

export interface FormattedContent {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  links?: Array<{ text: string; url: string }>;
  markers?: string[];
}

export interface ChatRoom {
  id: string;
  participants: User[];
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
} 
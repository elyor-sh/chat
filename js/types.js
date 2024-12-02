export class User {
    constructor(id, name, role, avatar = null) {
        this.id = id;
        this.name = name;
        this.role = role;
        this.avatar = avatar;
    }
}

export class Message {
    constructor(id, content, sender, timestamp, attachments = [], deliveryStatus = 'sending', quotedMessage = null) {
        this.id = id;
        this.content = content;
        this.sender = sender;
        this.timestamp = timestamp;
        this.attachments = attachments;
        this.deliveryStatus = deliveryStatus;
        this.quotedMessage = quotedMessage;
    }
}

export class Attachment {
    constructor(id, type, url, name, size) {
        this.id = id;
        this.type = type;
        this.url = url;
        this.name = name;
        this.size = size;
    }
}

export const DeliveryStatus = {
    SENDING: 'sending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    ERROR: 'error'
}; 
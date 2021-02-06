import WAWebJS = require( "whatsapp-web.js" );

export interface messageType extends WhatsappMessage {
    reply: ( arg0: string ) => void;
    downloadMedia?: () => WAWebJS.MessageMedia
    getChat: () => Promise<WAWebJS.Chat>
}

export interface WhatsappMessage {
    mediaKey: string,
    id: {
      fromMe: boolean,
      remote: string,
      id: string,
      _serialized: string
    },
    ack: number,
    hasMedia: boolean,
    body: string,
    type: 'video' | 'image'| 'chat' | 'ppt' | 'sticker' | 'document',
    timestamp: number,
    from: string,
    to: string,
    author: string,
    isForwarded: boolean,
    isStatus: boolean,
    isStarred: boolean,
    broadcast: boolean,
    fromMe: boolean,
    hasQuotedMsg: boolean,
    location: undefined | string,
    vCards: [],
    mentionedIds: [],
    links: []
  
}



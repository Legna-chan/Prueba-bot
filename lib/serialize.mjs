import { jidNormalizedUser } from "@whiskeysockets/baileys";

/**
 * Aqui vamos a definir la estructura que tendra nuestro mensaje, esto es muy importante y complicado, ten cuidado al modificar esto.
 * @param {import("@whiskeysockets/baileys").proto.IWebMessageInfo} msg
 * @param {import("@whiskeysockets/baileys").WASocket} wss
 */
export default function serialize(msg, wss) {
    const m = {};
    m.message = msg.message;
    if (!m.message) return null;
    m.text = "";
    m.mimeType = "";
    /**
     * @type {import("@whiskeysockets/baileys").MessageType}
     */
    m.type = Object.keys(m.message).find((type) => type !== "senderKeyDistributionMessage" && type !== "messageContextInfo");
    m.key = msg.key;
    m.fromMe = m.key.fromMe;
    m.pushName = msg.pushName || msg.verifiedBizName;
    m.chat = m.key.remoteJid;
    m.sender = m.key.fromMe ? jidNormalizedUser(wss.user.id) : m.key.participant || m.key.remoteJid;
    m.isGroup = /@g\.us/.test(m.chat);
    m.isNewsletter = /@newsletter$/.test(m.chat);
    /**
     * @type {import("@whiskeysockets/baileys").proto.ContextInfo}
     */
    const contextInfo = m.message[m.type]?.contextInfo;
    const quotedMessage = contextInfo?.quotedMessage || null;
    m.mentionedJid = contextInfo?.mentionedJid || [];
    if (!!m.message.conversation) {
        m.text = m.message.conversation;
        m.mimeType = "text/plain";
    } else if (!!m.message.extendedTextMessage) {
        m.text = m.message.extendedTextMessage.text || "";
        m.mimeType = "text/plain";
    } else if (!!m.message.imageMessage) {
        m.text = m.message.imageMessage.caption || "";
        m.mimeType = m.message.imageMessage.mimetype;
    } else if (!!m.message.videoMessage) {
        m.text = m.message.videoMessage.caption || "";
        m.mimeType = m.message.videoMessage.mimetype;
    } else if (!!m.message.documentMessage) {
        m.text = m.message.documentMessage.caption || "";
        m.mimeType = m.message.documentMessage.mimetype;
    } else if (!!m.message.documentWithCaptionMessage?.message?.documentMessage) {
        m.text = m.message.documentWithCaptionMessage.message.documentMessage.caption || "";
        m.mimeType = m.message.documentWithCaptionMessage.message.documentMessage.mimetype;
    } else if (!!m.message.locationMessage) {
        m.text = m.message.locationMessage.comment || "";
        m.mimeType = "text/plain";
    } else if (!!m.message.viewOnceMessage?.message?.imageMessage) {
        m.text = m.message.viewOnceMessage.message.imageMessage.caption || "";
        m.mimeType = m.message.viewOnceMessage.message.imageMessage.mimetype;
    } else if (!!m.message.viewOnceMessage?.message?.videoMessage) {
        m.text = m.message.viewOnceMessage.message.videoMessage.caption || "";
        m.mimeType = m.message.viewOnceMessage.message.videoMessage.mimetype;
    } else if (!!m.message.viewOnceMessageV2?.message?.imageMessage) {
        m.text = m.message.viewOnceMessageV2.message.imageMessage.caption || "";
        m.mimeType = m.message.viewOnceMessageV2.message.imageMessage.mimetype;
    } else if (!!m.message.viewOnceMessageV2?.message?.videoMessage) {
        m.text = m.message.viewOnceMessageV2.message.videoMessage.caption || "";
        m.mimeType = m.message.viewOnceMessageV2.message.videoMessage.mimetype;
    } else if (!!m.message.viewOnceMessageV2Extension?.message?.audioMessage) {
        m.mimeType = m.message.viewOnceMessageV2Extension.message.audioMessage.mimetype;
    }
    if (!!quotedMessage) {
        m.quoted = {};
        m.quoted.message = quotedMessage;
        m.quoted.text = "";
        m.quoted.mimeType = "";
        /**
         * @type {import("@whiskeysockets/baileys").MessageType}
         */
        m.quoted.type = Object.keys(quotedMessage).find((type) => type !== "senderKeyDistributionMessage" && type !== "messageContextInfo");
        m.quoted.key = {
            remoteJid: contextInfo.remoteJid || m.chat || m.sender,
            participant: contextInfo.participant,
            fromMe: contextInfo.participant === jidNormalizedUser(wss.user.id),
            id: contextInfo.stanzaId,
        };
        m.quoted.fromMe = contextInfo.participant === jidNormalizedUser(wss.user.id);
        m.quoted.pushName = "";
        m.quoted.chat = contextInfo.remoteJid || m.chat || m.sender;
        m.quoted.sender = contextInfo.participant;
        m.quoted.isGroup = /@s\.us$/.test(m.quoted.chat);
        m.quoted.isNewsletter = /@newsletter$/.test(m.quoted.chat);
        m.quoted.mentionedJid = [];
        if (!!quotedMessage.conversation) {
            m.quoted.text = quotedMessage.conversation;
            m.quoted.mimeType = "text/plain";
        } else if (!!quotedMessage.extendedTextMessage) {
            m.quoted.text = quotedMessage.extendedTextMessage.text || "";
            m.quoted.mentionedJid = quotedMessage.extendedTextMessage.contextInfo?.mentionedJid || [];
            m.quoted.mimeType = "text/plain";
        } else if (!!quotedMessage.viewOnceMessageV2?.message?.imageMessage) {
            m.quoted.text = quotedMessage.viewOnceMessageV2.message.imageMessage.caption || "";
            m.quoted.mentionedJid = quotedMessage.viewOnceMessageV2.message.imageMessage.contextInfo?.mentionedJid || [];
            m.quoted.mimeType = quotedMessage.viewOnceMessageV2.message.imageMessage.mimetype;
        } else if (quotedMessage?.viewOnceMessageV2?.message?.videoMessage) {
            m.quoted.text = quotedMessage.viewOnceMessageV2.message.videoMessage.caption || "";
            m.quoted.mentionedJid = quotedMessage.viewOnceMessageV2.message.videoMessage.contextInfo?.mentionedJid || [];
            m.quoted.mimeType = quotedMessage.viewOnceMessageV2.message.videoMessage.mimetype;
        } else if (quotedMessage?.viewOnceMessageV2Extension?.message?.audioMessage) {
            m.quoted.mimeType = quotedMessage.viewOnceMessageV2Extension.message.audioMessage.mimetype;
        } else if (quotedMessage?.imageMessage) {
            m.quoted.text = quotedMessage.imageMessage.caption || "";
            m.quoted.mentionedJid = quotedMessage.imageMessage.contextInfo?.mentionedJid || [];
            m.quoted.mimeType = quotedMessage.imageMessage.mimetype;
        } else if (quotedMessage?.videoMessage) {
            m.quoted.text = quotedMessage.videoMessage.caption || "";
            m.quoted.mentionedJid = quotedMessage.videoMessage.contextInfo?.mentionedJid || [];
            m.quoted.mimeType = quotedMessage.videoMessage.mimetype;
        } else if (quotedMessage?.documentMessage) {
            m.quoted.text = quotedMessage.documentMessage.caption || "";
            m.quoted.mentionedJid = quotedMessage.documentMessage.contextInfo?.mentionedJid || [];
            m.quoted.mimeType = quotedMessage.documentMessage.mimetype;
        } else if (quotedMessage?.documentWithCaptionMessage?.message?.documentMessage) {
            m.quoted.text = quotedMessage.documentWithCaptionMessage.message.documentMessage.caption || "";
            m.quoted.mentionedJid = quotedMessage.documentWithCaptionMessage.message.documentMessage.contextInfo?.mentionedJid || [];
            m.quoted.mimeType = quotedMessage.documentWithCaptionMessage.message.documentMessage.mimetype;
        } else if (quotedMessage?.audioMessage) {
            m.quoted.mimeType = quotedMessage.audioMessage.mimetype;
        } else if (quotedMessage?.stickerMessage) {
            m.quoted.mimeType = quotedMessage.stickerMessage.mimetype;
        }
    }
    return m;
}
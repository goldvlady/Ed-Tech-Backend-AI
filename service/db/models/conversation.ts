const { DataTypes, Op } = require('sequelize');
import { Languages } from 'src/types';
import sequelize from '../../sequelize';
import Log from './conversationLog';
import Document from './document';

const Conversation = sequelize.define(
  'Conversations',
  {
    id: {
      primaryKey: true,
      allowNull: false,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    topic: {
      type: DataTypes.STRING,
      allowNull: true
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: true
    },
    level: {
      type: DataTypes.STRING,
      allowNull: true
    },
    language: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'English'
    },

    reference: {
      type: DataTypes.ENUM('student', 'document', 'note'),
      allowNull: false,
      default: 'document'
    },
    referenceId: {
      type: DataTypes.STRING,
      allowNull: false
    }
  },
  {
    timestamps: true,
    paranoid: true
  }
);

export const getDocumentHistory = async (studentId: string) => {
  // Fetch user documents
  const userDocuments = await Document.findAll({
    where: {
      referenceId: studentId
    }
  });

  // Extract document IDs from the user documents
  const documentIds = userDocuments.map((doc: any) => doc.documentId);

  // Fetch conversations where reference includes document IDs
  const chattedDocuments = await Conversation.findAll({
    where: {
      referenceId: {
        [Op.in]: documentIds // Assuming Sequelize and use of the Op.in operator
      },
      reference: 'document'
    }
  });

  const chatReferenceIds = chattedDocuments.map(
    (conversation: any) => conversation.referenceId
  );

  const documentsWithConversations = userDocuments.filter((doc: any) =>
    chatReferenceIds.includes(doc.documentId)
  );

  return documentsWithConversations;
};

export const getTextNoteHistory = async (noteIds: string[]) => {
  // Fetch conversations where reference includes note IDs
  const chattedNotes = await Conversation.findAll({
    where: {
      referenceId: {
        [Op.in]: noteIds // Assuming Sequelize and use of the Op.in operator
      },
      reference: 'note'
    }
  });

  return chattedNotes.map((conversation: any) => conversation.referenceId);
};

export const getChatConversations = async ({
  referenceId,
  reference
}: {
  referenceId: string;
  reference: string;
}) => {
  const chats = await Conversation.findAll({
    where: {
      referenceId,
      reference
    },
    include: [
      {
        model: Log
      }
    ]
  });

  return chats;
};

export const getChatConversationId = async (
  {
    referenceId,
    reference,
    topic,
    subject,
    level
  }: {
    referenceId: string;
    reference: string;
    topic?: string; // Adding the optional parameters
    subject?: string;
    level?: string;
  },
  createNew = true
) => {
  let convoId = await Conversation.findOne({
    where: {
      referenceId,
      reference
    }
  });

  if (!convoId && createNew) {
    convoId = await Conversation.create({
      reference,
      referenceId,
      topic,
      subject,
      level
    }); // Including the new values in create method
  }

  return convoId?.id;
};

export const createNewConversation = async ({
  referenceId,
  reference,
  title,
  topic,
  subject,
  level,
  language
}: {
  reference: string;
  referenceId: string;
  title?: string;
  topic?: string; // Adding the optional parameters
  subject?: string;
  level?: string;
  language: Languages;
}) => {
  const newChat = await Conversation.create({
    reference,
    referenceId,
    title,
    topic,
    subject,
    level,
    language
  }); // Including the new values in create method
  return newChat;
};

/**
 * Check if a chat has a title.
 *
 * @param {string} conversationId - The UUID of the conversation.
 * @returns {Promise<boolean>} - True if the chat has a title, otherwise false.
 */
export const chatHasTitle = async (
  conversationId: string
): Promise<boolean> => {
  const chat = await Conversation.findByPk(conversationId);
  return !!chat && !!chat.title;
};

/**
 * Store a title for a chat.
 *
 * @param {string} conversationId - The UUID of the conversation.
 * @param {string} title - The title to store for the chat.
 * @returns {Promise<Conversation>} - The updated chat instance.
 */
export const storeChatTitle = async (
  conversationId: string,
  title: string
): Promise<typeof Conversation> => {
  const chat = await Conversation.findByPk(conversationId);
  if (!chat) {
    throw new Error('Chat not found');
  }

  chat.title = title;
  await chat.save();

  return chat;
};

/**
 * Delete a specific conversation by its UUID.
 *
 * @param {string} conversationId - The UUID of the conversation to be deleted.
 * @returns {Promise<void>} - A promise that resolves when the deletion is complete.
 */
export const deleteConversation = async (
  conversationId: string
): Promise<void> => {
  const result = await Conversation.destroy({
    where: {
      id: conversationId
    }
  });

  if (result === 0) {
    throw new Error('Conversation not found and could not be deleted');
  }
};

export default Conversation;

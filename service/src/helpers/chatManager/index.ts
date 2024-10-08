import { PromptTemplate } from '@langchain/core/prompts';
import { ConversationChain } from 'langchain/chains';
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import { summarizeNotePrompt } from '../promptTemplates';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { HumanChatMessage, AIChatMessage } from 'langchain/schema';
import paginatedFind from '../pagination';
import ChatLog from '../../../db/models/conversationLog';
import config from '../../../config/index';

class ChatManager {
  private socket: any;
  public event: string;
  public systemPrompt: string;
  public studentId: string;
  public conversationId: string;
  private chatHistory: any[] = [];
  private apikey: string = '';
  private modelName: string = '';

  constructor(
    socket: any,
    event: string,
    systemPrompt: string,
    studentId: string,
    conversationId: string
  ) {
    this.socket = socket;
    this.event = event;
    this.systemPrompt = systemPrompt;
    this.studentId = studentId;
    this.conversationId = conversationId;
    const { apikey, model } = config.openai as any;
    this.apikey = apikey as string;
    this.modelName = model as string;
  }

  private socketAiModel(socket: any, event: string, model?: string) {
    return new ChatOpenAI({
      openAIApiKey: this.apikey,
      modelName: model || this.modelName,
      streaming: true,
      callbacks: [
        {
          handleLLMNewToken(token: any) {
            socket.emit(`${event} start`, token);
          }
        }
      ]
    });
  }

  public async loadChats() {
    const chats = await paginatedFind(
      ChatLog,
      {
        studentId: this.studentId,
        conversationId: this.conversationId
      },
      { limit: 10 }
    );

    chats.map((chat: any) => {
      this.chatHistory.push(new AIChatMessage(chat.content));

      if (chat.role === 'assistant') {
      } else if (chat.role === 'user') {
        this.chatHistory.push(new HumanChatMessage(chat.content));
      }
    });
  }

  public addChat(chat: any) {
    this.chatHistory.push(chat);
  }

  public setSystemPrompt(prompt: string) {
    this.systemPrompt = prompt;
  }

  public summarizeText(text: string) {
    const model = new ChatOpenAI({
      openAIApiKey: this.apikey,
      modelName: this.modelName
    });

    const basePrompt = `${summarizeNotePrompt} is the text to summarize:${text} Ignore all history and summarize this text. YOUR RESPONSE SHOULD BE ONLY ABOUT THE SUMMARY, NOTHING ABOUT YOUR PRESENT STATE OR CONSTRAINTS, DO NOT TALK ABOUT YOURSELF`;

    const chain = new ConversationChain({
      llm: model
    });

    return chain.call({ input: basePrompt });
  }

  async loadModel() {
    const model = this.socketAiModel(this.socket, this.event);
    const memory = new BufferMemory({
      chatHistory: new ChatMessageHistory(this.chatHistory)
    });

    const prompt = new PromptTemplate({
      template: this.systemPrompt,
      inputVariables: ['history', 'input']
    });

    const chain = new ConversationChain({
      llm: model,
      memory,
      prompt
    });

    // Added this line to return pastMessages as well for conditional checks
    const pastMessages = this.chatHistory;

    return { chain, model, prompt, pastMessages };
  }
}

export default ChatManager;

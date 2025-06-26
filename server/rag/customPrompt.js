import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from '@langchain/core/prompts';
import { HUMAN_PROMPT, SYSTEM_PROMPT } from '../../constants/constants';


export const systemPrompt = SystemMessagePromptTemplate.fromTemplate(SYSTEM_PROMPT);
export const humanPrompt = HumanMessagePromptTemplate.fromTemplate(HUMAN_PROMPT);

export function GetChatPrompt() {

    const chatPrompt = ChatPromptTemplate.fromMessages([
        systemPrompt,
        humanPrompt
    ]);

    return chatPrompt;
}
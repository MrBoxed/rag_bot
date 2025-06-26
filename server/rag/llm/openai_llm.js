import { OpenAI as LCOpenAI } from "@langchain/openai";
import { OpenAI } from 'openai';


// ::MODELS :: gpt-4.1  :: leave it blank
// THROWING ERROR :: GPT-4.1 is a chat
// export const LangChainOpneAIClient = new LCOpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
//     model: 'gpt-4.1'
// });

export function OpenAiClient() {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}
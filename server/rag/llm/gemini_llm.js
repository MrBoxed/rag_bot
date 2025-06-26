import { ChatGoogleGenerativeAI } from '@langchain/google-genai';


// :: MODELS: gemini-pro 
export function GeminiLLM_Model() {

    return new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY,
        model: 'gemini-2.0-flash'
    });
}
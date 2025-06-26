import { OpenAIEmbeddings } from "@langchain/openai";

export function OpenAi_Embeddings() {

    return new OpenAIEmbeddings({
        model: 'text-embedding-3-small',
        apiKey: process.env.OPENAI_API_KEY
    });
}
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

export function GoogleEmbeddings() {

    return new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY,
        model: 'embedding-001',
    })

} 
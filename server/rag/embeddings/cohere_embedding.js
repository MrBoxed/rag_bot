import { CohereEmbeddings } from "@langchain/cohere";

export function Cohere_Embedding() {
    return (new CohereEmbeddings({
        apiKey: process.env.COHERE_API_KEY,
        model: "embed-english-v3.0",
    }))
};

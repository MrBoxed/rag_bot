import { Worker } from "bullmq";
// import { OpenAIEmbeddings } from "@langchain/openai";
import { CohereEmbeddings } from "@langchain/cohere"
import { QdrantVectorStore } from "@langchain/qdrant";
import { QdrantClient } from "@qdrant/js-client-rest"
import { Document } from "@langchain/core/documents";

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import { config } from "dotenv";

config()

const worker = new Worker(
    'file-upload-queue',
    async (job) => {
        console.log(`JOB: ${job.data}`);

        const data = JSON.parse(job.data);
        console.log(data);

        // Load the PDF
        const loader = new PDFLoader(data.path);
        const docs = await loader.load();

        console.log(docs);

        // const client = new QdrantClient({ url: process.env.QDRANT_URL || "http://localhost:6333" });

        // Embedding Model : COHERE
        const embeddings = new CohereEmbeddings({
            apiKey: process.env.COHERE_API_KEY,
            model: "embed-english-v3.0",
        });


        const vectorStore = await QdrantVectorStore.fromExistingCollection(
            embeddings,
            {
                url: process.env.QDRANT_URL || 'http://localhost:6333',
                collectionName: "lawMaster",
            });


        await vectorStore.addDocuments(docs);
        console.log("Document added to vector store");

    },
    {
        concurrency: 100, connection: {
            host: "localhost",
            port: '6379',

        }
    }
)
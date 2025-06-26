const { Worker } = require("bullmq");
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { COLLECTION_NAME, QUEUE_NAME } = require("../constants/constants");
const { CohereEmbeddings } = require("@langchain/cohere");
const { QdrantVectorStore } = require("@langchain/qdrant");

require("dotenv").config();

const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
        try {
            console.log(`JOB: ${job.data}`);

            const data = JSON.parse(job.data);

            // Load the PDF
            const loader = new PDFLoader(data.path);
            const docs = await loader.load();
            console.log("File loaded");

            // Embedding Model: COHERE
            const embeddings = new CohereEmbeddings({
                apiKey: process.env.COHERE_API_KEY,
                model: "embed-english-v3.0",
            });
            console.log("Embedding");

            const vectorStore = await QdrantVectorStore.fromExistingCollection(
                embeddings,
                {
                    url: process.env.QDRANT_URL || "http://localhost:6333",
                    collectionName: COLLECTION_NAME,
                }
            );

            if (!vectorStore) {
                console.error("Qdrant vector store error");
                return;
            }

            await vectorStore.addDocuments(docs);
            console.log("Document added to vector store");
        } catch (err) {
            console.error("Worker error:", err);
        }
    },
    {
        concurrency: 10,
        lockDuration: 60000, // 60 seconds
        connection: {
            host: "localhost",
            port: 6379,
        },
    }
);

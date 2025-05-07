import express from 'express'
import cors from 'cors'
import multer from 'multer';
import { Queue } from 'bullmq';
import { QdrantVectorStore } from '@langchain/qdrant';
import { config } from 'dotenv';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenAI } from "@google/genai";
import { CohereEmbeddings } from "@langchain/cohere"

import { SelfQueryRetriever } from "langchain/retrievers/self_query";
import { QdrantTranslator } from "@langchain/community/structured_query/qdrant";

config();

const PORT = process.env.SERVER_PORT || 8000;
const app = express();
app.use(cors({ origin: ['http://localhost'] }));

const queue = new Queue('file-upload-queue', {
    connection: {
        host: "localhost",
        port: '6379',

    }
});

// ::: CONFIGUING MULTER ::::
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}_${file.originalname}`);
    }
})
const upload = multer({ storage: storage });



// ::: ROUTES :::
app.get('/', (req, res) => {
    return res.json({ status: "Working" });
});

app.get('/chat', async (req, res) => {

    const userQuery = "What are my rights during an arrest?";

    // Embedding Model : COHERE
    const embeddings = new CohereEmbeddings({
        apiKey: process.env.COHERE_API_KEY,
        model: "embed-english-v3.0",
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
        url: process.env.QDRANT_URL,
        collectionName: "lawMaster"
    })

    const ret = vectorStore.asRetriever({
        k: 2,
    });

    const result = await ret.invoke(userQuery);

    const SYSTEM_PROMPT = `You are a legal assistant AI specialized in Indian criminal law. Your job is to assist users by answering their legal questions based on accurate, up-to-date information from the Indian Penal Code (IPC), the Code of Criminal Procedure (CrPC), landmark Supreme Court and High Court judgments, and other authoritative Indian legal sources.

When generating answers:

Use plain, accessible English while preserving legal accuracy.

Clearly mention relevant sections (e.g., "Section 302 of IPC") when applicable.

If a user's query is ambiguous, ask clarifying questions before answering.

Rely only on information retrieved from verified legal databases or documents.

Avoid speculation or personal opinions. If a legal interpretation may vary, present multiple perspectives neutrally.

When referring to case law, include case names and citation if available (e.g., “State of Maharashtra v. Salman Khan, AIR 2003 SC 1234”).

If the retrieved documents do not contain enough information, respond with “I don’t have enough legal information on this matter right now,” and suggest consulting a human lawyer.

Your tone should be respectful, professional, and impartial. Do not provide legal advice or suggest legal strategy. Instead, present legal information and precedents that can help the user understand their rights or obligations.

    Context: ${JSON.stringify(result)}
`;


    const geminiLLm = new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY,
        model: "gemini-2.0-flash",
        temperature: 0
    });

    const selfQueryRetriever = SelfQueryRetriever.fromLLM({
        llm: geminiLLm,
        vectorStore: vectorStore,
        documentContents: SYSTEM_PROMPT,
        structuredQueryTranslator: new QdrantTranslator(),
    })
    const chatResponse = await selfQueryRetriever.invoke(userQuery)

    // const gemini = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
    // const chatResponse = await gemini.models.generateContent({
    //     model: "gemini-2.0-flash",
    //     contents: userQuery,
    //     config: {
    //         systemInstruction: SYSTEM_PROMPT
    //     },
    // });


    return res.json({
        message: chatResponse
        // docs: result
    });

});

app.post("/upload/pdf", upload.single('pdf'), async (req, res) => {

    await queue.add(
        "file-ready",
        JSON.stringify({
            filename: req.file.originalname,
            destination: req.file.destination,
            path: req.file.path,
        }))

    return res.json({ message: 'File uploaded' });
})

app.listen(PORT, () => { console.log(`Server running at port: ${PORT}`) });
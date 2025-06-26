import express, { json } from 'express'
import cors from 'cors'
import multer from 'multer';
import { Queue } from 'bullmq';
import { QdrantVectorStore } from '@langchain/qdrant';
import { config } from 'dotenv';
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

import { CohereEmbeddings } from "@langchain/cohere"

import { OpenAI } from 'openai';
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from '@langchain/core/prompts';
import { COLLECTION_NAME, HUMAN_PROMPT, SYSTEM_PROMPT } from './config/constants.js';

import { RunnableSequence } from '@langchain/core/runnables';
config();

const PORT = process.env.SERVER_PORT || 8000;
const app = express();
app.use(cors());
// origin: ['http://localhost:3000', 'http://localhost:8000'] 
// }));

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

    // const userQuery = "What are my rights during an arrest?";
    const userQuery = req.query.message;

    // return res.json({ query: userQuery, message: (`this is message for ${userQuery.message}`) });

    try {

        // :::: GOOGLE GEMINI ::::

        // creating the llm instance
        const llm = new ChatGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_API_KEY,
            model: 'gemini-2.0-flash'
        });

        // setting up the embedding model

        // NOT USING BECAUSE :: USE SAME EMBEDDING USED AT THE TIME OF SAVING :::
        //const embeddings = new GoogleGenerativeAIEmbeddings({
        //    apiKey: process.env.GOOGLE_API_KEY,  
        //})

        // const embeddings = new CohereEmbeddings({
        //     apiKey: process.env.COHERE_API_KEY,
        //     model: "embed-english-v3.0",
        // });

        // Creating the vector store
        const qdrantVectorStore = await QdrantVectorStore.fromExistingCollection(
            embeddings,
            {
                url: process.env.QDRANT_URL || 'http://localhost:6333',
                collectionName: COLLECTION_NAME || 'lawMaster',
            }
        );

        // Setup System + Human Prompts
        const systemPrompt = SystemMessagePromptTemplate.fromTemplate(SYSTEM_PROMPT);
        const humanPrompt = HumanMessagePromptTemplate.fromTemplate(HUMAN_PROMPT);

        const chatPrompt = ChatPromptTemplate.fromMessages([
            systemPrompt,
            humanPrompt
        ]);


        // Setting the RAG chain

        const retrived = qdrantVectorStore.asRetriever();

        const ragChain = RunnableSequence.from([
            {
                context: async (input) => {
                    const docs = await retrived.getRelevantDocuments(input.question);
                    return docs.map(doc => doc.pageContent).join('\n');
                },
                question: (input) => input?.question
            },
            chatPrompt,
            llm,
        ])

        const response = await ragChain.invoke({ question: userQuery });
        if (response) {
            return res.status(200).json({ message: response.content });
        }
        // :::: END GOOGLE GEMINI ::::


        // Embedding Model : COHERE
        const embeddings = new CohereEmbeddings({
            apiKey: process.env.COHERE_API_KEY,
            model: "embed-english-v3.0",
        });
        console.log("embedding");


        const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
            url: process.env.QDRANT_URL,
            collectionName: "lawMaster",
        })
        console.log("vector store");

        const ret = vectorStore.asRetriever({
            k: 2,
        });

        const result = await ret.invoke(userQuery);
        console.log(result);

        // const geminiLLm = new ChatGoogleGenerativeAI({
        //     apiKey: process.env.GOOGLE_API_KEY,
        //     model: "gemini-2.0-flash",
        //     temperature: 0
        // });

        // const selfQueryRetriever = SelfQueryRetriever.fromLLM({
        //     llm: geminiLLm,
        //     vectorStore: vectorStore,
        //     attributeInfo: [],
        //     documentContents: result,
        //     structuredQueryTranslator: new QdrantTranslator(),
        // })
        // const chatResponse = await selfQueryRetriever.invoke(userQuery)

        // const geminiSystemPrompt = SYSTEM_PROMPT;
        // const mainContext = [userQuery, result];
        // { role: 'user', content: userQuery },
        // { role: 'system', context: result }];

        // const gemini = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
        // const chatResponse = await gemini.models.generateContent({
        //     model: "gemini-2.0-flash",
        //     contents: mainContext,
        //     config: {
        //         systemInstruction: SYSTEM_PROMPT
        //     },
        // });

        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const chatResponse = await client.chat.completions.create({
            model: "gpt-4.1",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userQuery }
            ]
        })

        // return res.json({
        //     message: chatResponse,
        //     //prompt: SYSTEM_PROMPT,
        //     docs: result
        // });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Interal server error ", error: err });
    }
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
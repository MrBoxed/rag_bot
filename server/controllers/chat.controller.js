const { Request, Response } = require("express");
const { GetChatPrompt } = require("../rag/customPrompt");
const GetVectorStore = require("../rag/vectorStore/qdrant_vectorStore");
const { RunnableSequence } = require("@langchain/core/runnables");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { LLM_CHOICE, SYSTEM_PROMPT } = require("../../constants/constants");
const { LLMS } = require("../rag/ragEnum");
const { OpenAiClient } = require("../rag/llm/openai_llm");
const { GeminiLLM_Model } = require("../rag/llm/gemini_llm");

async function GET_ChatRequestHandler(req, res) {
    const userQuery = req.query.message;

    if (!userQuery) {
        res.status(400).json({
            message: "Input query not found",
        });
        return;
    }

    if (typeof userQuery !== "string") {
        res.status(400).json({ message: "Expected string" });
        return;
    }

    try {
        const customPrompt = GetChatPrompt();

        const vectorStore = await GetVectorStore();

        const vsRetrival = vectorStore?.asRetriever();

        if (!vsRetrival || !customPrompt) {
            throw new Error("Some values: null or undefined");
        }

        if (LLM_CHOICE == LLMS.GEMINI) {
            const llmModel = GeminiLLM_Model();

            const ragChain = RunnableSequence.from([
                {
                    context: async (input) => {
                        const docs = await vsRetrival.invoke(input.question);
                        return docs.map((doc) => doc.pageContent).join("\n");
                    },
                    question: (input) => input.question ?? input,
                },
                customPrompt,
                llmModel.bind({}),
            ]);

            const response = await ragChain.invoke({ question: userQuery });
            res.status(200).json({ message: response.content });
        } else if (LLM_CHOICE == LLMS.OPENAI) {
            const client = OpenAiClient();

            if (!userQuery || typeof userQuery !== "string") {
                res.status(400).json({ message: "Expected query string" });
                return;
            }

            const query = typeof userQuery == "string" ? userQuery : "";

            const chatResponse = await client.chat.completions.create({
                model: "o3-mini",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: query },
                ],
            });

            res.status(200).json({
                message: chatResponse,
            });
        } else {
            throw new Error("LLM OPTION: NOT AVAILABLE");
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal server error", error: err });
    }
}

async function POST_ChatRequestHandler(req, res) {
    const userQuery = req.params.message;

    if (!userQuery) {
        res.status(400).json({
            message: "Input query not found",
        });
        return;
    }

    if (typeof userQuery !== "string") {
        res.status(400).json({ message: "Expected string" });
        return;
    }

    try {
        const customPrompt = GetChatPrompt();

        const vectorStore = await GetVectorStore();

        const vsRetrival = vectorStore?.asRetriever();

        if (!vsRetrival || !customPrompt) {
            throw new Error("Some values: null or undefined");
        }

        const vectorData = await vsRetrival.invoke(userQuery);

        if (LLM_CHOICE == LLMS.GEMINI) {
            const llmModel = GeminiLLM_Model();

            const ragChain = RunnableSequence.from([
                {
                    context: (input) => vectorData.map((doc) => doc.pageContent).join("\n"),
                    question: (input) => input?.question,
                },
                customPrompt,
                llmModel,
            ]);

            const response = await ragChain.invoke({ question: userQuery });
            if (response) {
                res.status(200).json({ message: response });
            }
        } else if (LLM_CHOICE == LLMS.OPENAI) {
            const client = OpenAiClient();

            const chatResponse = await client.chat.completions.create({
                model: "gpt-4.1",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: userQuery },
                ],
            });

            res.status(200).json({
                message: chatResponse,
            });
        } else {
            throw new Error("LLM OPTION: NOT AVAILABLE");
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal server error", error: err });
    }
}

module.exports = {
    GET_ChatRequestHandler,
    POST_ChatRequestHandler,
};

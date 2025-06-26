import { QdrantVectorStore } from "@langchain/qdrant";
import { EMBEDDING_CHOICE, COLLECTION_NAME } from "../../../constants/constants"
import { EMBEDDINGS } from "../ragEnum";
import { Cohere_Embedding } from "../embeddings/cohere_embedding";
import { OpenAi_Embeddings } from "../embeddings/openai_embedding";
import { CohereEmbeddings } from "@langchain/cohere";


async function GetVectorStore() {

    const embedding: CohereEmbeddings = Cohere_Embedding();

    if (!embedding) {
        console.log("ERROR:qdrant_VectorStore embedding NULL");
        return;
    }

    const store = await QdrantVectorStore.fromExistingCollection(
        embedding, {
        url: process.env.QDRANT_URL,
        collectionName: COLLECTION_NAME,
    });

    return store;
}

export default GetVectorStore;



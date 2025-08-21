// New imports for modern langchain
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getOpenAiApiKey } from "./openaiApiKey";
import { getLLMProviderSettings } from "./providerSettings";
import { WHISPER_LANG_MAP } from "../config/lang";

export async function getSummary(content: string[]) {
  const settings = await getLLMProviderSettings();

  // Decide model implementation
  let model: any;
  if (settings.provider === "ollama") {
    // Minimal wrapper replicating LLM interface used (invoke returning { content })
    const ollamaModel = settings.ollamaModel || "llama3.1";
    const baseUrl = (settings.ollamaBaseUrl || "http://localhost:11434").replace(/\/$/, "");

    model = {
      async invoke(promptObj: any) {
        const input = typeof promptObj === "string" ? promptObj : promptObj?.text || promptObj?.input || JSON.stringify(promptObj);
        const body = {
          model: ollamaModel,
          prompt: input,
          stream: false,
        } as any;

        console.log("Ollama request:", { baseUrl, model: ollamaModel, inputLength: input.length });

        const res = await fetch(`${baseUrl}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        
        console.log("Ollama response status:", res.status, res.statusText);
        
        if (!res.ok) {
          const errorText = await res.text().catch(() => "Unknown error");
          console.error("Ollama error:", errorText);
          throw new Error(`Ollama request failed (${res.status}): ${errorText}`);
        }
        const json = await res.json();
        console.log("Ollama response JSON:", json);
        const response = json.response ?? json.message ?? "";
        console.log("Extracted response:", response);
        return { content: response };
      },
      pipe(next: any) {
        return {
          async invoke(values: any) {
            const r = await model.invoke(values);
            return next(r);
          },
        };
      },
    };
  } else {
    const openAIApiKey = await getOpenAiApiKey();
    if (!openAIApiKey) {
      throw new Error("OpenAI API key is required");
    }
    model = new ChatOpenAI({
      modelName: "gpt-4o", // Use a stronger model if possible
      openAIApiKey,
      temperature: 0.2,
      timeout: 120_000,
    });
  }

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 3000,
    chunkOverlap: 200,
  });

  const contentFull = content.join("\n");

  const chunks = await textSplitter.splitText(contentFull);
  const docs = chunks.map((text: string) => ({ pageContent: text }));

  const detected = await chrome.i18n.detectLanguage(contentFull);
  const langCode = detected.languages?.[0]?.language?.toLowerCase();
  const lang = WHISPER_LANG_MAP.get(langCode) ?? "English";

  // Better prompt templates
  const mapPrompt = PromptTemplate.fromTemplate(`
You are assisting in summarizing a meeting. Summarize the following part of a meeting transcript in ${lang}:

Instructions:
- Focus on main points, key discussions, and important actions mentioned.
- Be concise but capture important ideas.
- Bullet points preferred.
- Ignore small talk or irrelevant conversation.

Meeting Segment:
------------
{text}
------------

  `);

  const combinePrompt = PromptTemplate.fromTemplate(`
You are an expert meeting assistant. Create a professional, organized summary of the full meeting based on these partial summaries in ${lang}.

Instructions:
- Group information into three sections: Topics Discussed, Key Decisions, Action Items.
- Keep the language formal and easy to read.
- Bullet points for each section.
- If specific speakers are mentioned in the partial summaries, retain attribution (e.g., \"Anna suggested...\").
- Focus on outcomes and next steps. Ignore small talk.

Partial Summaries:
------------
{text}
------------

  `);

  // Build pipeline manually
  const mapChain = mapPrompt
    .pipe(model)
    .pipe(async (res: any) => {
      console.log("Map chain response:", res);
      const result = (res.content as string).trim();
      console.log("Map chain extracted content:", result);
      return result;
    });

  const combineChain = combinePrompt
    .pipe(model)
    .pipe(async (res: any) => {
      console.log("Combine chain response:", res);
      const result = (res.content as string).trim();
      console.log("Combine chain extracted content:", result);
      return result;
    });

  const summarizationChain = RunnableSequence.from([
    async (
      docs: {
        pageContent: string;
      }[],
    ) => {
      console.log("Processing docs:", docs.length, "chunks");
      const mapped = await Promise.all(
        docs.map((doc) => mapChain.invoke({ text: doc.pageContent })),
      );
      console.log("Mapped results:", mapped);
      const joined = mapped.join("\n\n");
      console.log("Joined text for combine chain:", joined);
      return { text: joined };
    },
    combineChain,
  ]);

  console.log("Starting summarization chain...");
  const finalSummary = await summarizationChain.invoke(docs);
  console.log("Final summary result:", finalSummary);

  return finalSummary;
}

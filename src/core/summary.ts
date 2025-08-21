// Simplified summary implementation for Ollama
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getOpenAiApiKey } from "./openaiApiKey";
import { getLLMProviderSettings } from "./providerSettings";
import { WHISPER_LANG_MAP } from "../config/lang";

export async function getSummary(content: string[]) {
  const settings = await getLLMProviderSettings();
  const mode = settings.summaryMode || "meeting";

  if (settings.provider === "ollama") {
    // Simplified Ollama implementation without LangChain complexity
    const ollamaModel = settings.ollamaModel || "llama3.1";
    const baseUrl = (settings.ollamaBaseUrl || "http://localhost:11434").replace(/\/$/, "");

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 3000,
      chunkOverlap: 200,
    });

    const contentFull = content.join("\n");
    const chunks = await textSplitter.splitText(contentFull);

    const detected = await chrome.i18n.detectLanguage(contentFull);
    const langCode = detected.languages?.[0]?.language?.toLowerCase();
    const lang = WHISPER_LANG_MAP.get(langCode) ?? "English";

    const callOllama = async (prompt: string): Promise<string> => {
      console.log("Ollama direct call with prompt length:", prompt.length);
      
      const body = {
        model: ollamaModel,
        prompt: prompt,
        stream: false,
      };

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
      console.log("Ollama response length:", json.response?.length || 0);
      const response = json.response ?? json.message ?? "";
      return response.trim();
    };

    // Process chunks in parallel
    const summaries = await Promise.all(
      chunks.map(async (chunk) => {
        const mapPrompt =
          mode === "study"
            ? `You are assisting a student in studying lecture notes. Summarize the following part of a lecture transcript in ${lang}:

Instructions:
- Capture all major points and explanations.
- Highlight key concepts and definitions.
- Bullet points preferred.
- Include anything important that was said.

Lecture Segment:
------------
${chunk}
------------`
            : `You are assisting in summarizing a meeting. Summarize the following part of a meeting transcript in ${lang}:

Instructions:
- Focus on main points, key discussions, and important actions mentioned.
- Be concise but capture important ideas.
- Bullet points preferred.
- Ignore small talk or irrelevant conversation.

Meeting Segment:
------------
${chunk}
------------`;

        const summary = await callOllama(mapPrompt);
        console.log("Chunk summary generated:", summary.substring(0, 100) + "...");
        return summary;
      }),
    );

    // Combine summaries if there are multiple chunks
    if (summaries.length === 1) {
      return summaries[0];
    } else {
      const combinePrompt =
        mode === "study"
          ? `You are an expert study assistant. Create a clear, organized study summary of the lecture based on these partial summaries in ${lang}.

Instructions:
- Provide a concise yet complete overview.
- Organize information by topics.
- Highlight key points and important details.
- Include any critical explanations.

Partial Summaries:
------------
${summaries.join("\n\n")}
------------`
          : `You are an expert meeting assistant. Create a professional, organized summary of the full meeting based on these partial summaries in ${lang}.

Instructions:
- Create a comprehensive yet concise summary
- Organize information logically
- Focus on outcomes and next steps. Ignore small talk.

Partial Summaries:
------------
${summaries.join("\n\n")}
------------`;

      const finalSummary = await callOllama(combinePrompt);
      console.log("Final combined summary:", finalSummary);
      return finalSummary;
    }
  } else {
    // OpenAI implementation (existing code)
    const openAIApiKey = await getOpenAiApiKey();
    if (!openAIApiKey) {
      throw new Error("OpenAI API key is required");
    }
    
    const model = new ChatOpenAI({
      modelName: "gpt-4o",
      openAIApiKey,
      temperature: 0.2,
      timeout: 120_000,
    });

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

    const mapPromptTemplate =
      mode === "study"
        ? `You are assisting a student in studying lecture notes. Summarize the following part of a lecture transcript in ${lang}:

Instructions:
- Capture all major points and explanations.
- Highlight key concepts and definitions.
- Bullet points preferred.
- Include anything important that was said.

Lecture Segment:
------------
{text}
------------`
        : `You are assisting in summarizing a meeting. Summarize the following part of a meeting transcript in ${lang}:

Instructions:
- Focus on main points, key discussions, and important actions mentioned.
- Be concise but capture important ideas.
- Bullet points preferred.
- Ignore small talk or irrelevant conversation.

Meeting Segment:
------------
{text}
------------`;

    const combinePromptTemplate =
      mode === "study"
        ? `You are an expert study assistant. Create a clear, organized study summary of the lecture based on these partial summaries in ${lang}.

Instructions:
- Provide a concise yet complete overview.
- Organize information by topics.
- Highlight key points and important details.
- Include any critical explanations.

Partial Summaries:
------------
{text}
------------`
        : `You are an expert meeting assistant. Create a professional, organized summary of the full meeting based on these partial summaries in ${lang}.

Instructions:
- Create a comprehensive yet concise summary
- Organize information logically
- Focus on outcomes and next steps. Ignore small talk.

Partial Summaries:
------------
{text}
------------`;

    const mapPrompt = PromptTemplate.fromTemplate(mapPromptTemplate);
    const combinePrompt = PromptTemplate.fromTemplate(combinePromptTemplate);

    const mapChain = mapPrompt.pipe(model).pipe(async (res: any) => (res.content as string).trim());
    const combineChain = combinePrompt.pipe(model).pipe(async (res: any) => (res.content as string).trim());

    const summarizationChain = RunnableSequence.from([
      async (docs: { pageContent: string }[]) => {
        const mapped = await Promise.all(
          docs.map((doc) => mapChain.invoke({ text: doc.pageContent })),
        );
        const joined = mapped.join("\n\n");
        return { text: joined };
      },
      combineChain,
    ]);

    const finalSummary = await summarizationChain.invoke(docs);
    return finalSummary;
  }
}

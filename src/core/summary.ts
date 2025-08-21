// Simplified summary implementation for Ollama
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getOpenAiApiKey } from "./openaiApiKey";
import { getLLMProviderSettings, LLMProviderSettings } from "./providerSettings";
import { WHISPER_LANG_MAP } from "../config/lang";

export async function getSummary(content: string[], screenshots: string[] = []) {
  const settings = await getLLMProviderSettings();
  const screenshotDescriptions = await describeScreenshots(screenshots, settings);

  if (settings.provider === "ollama") {
    // Simplified Ollama implementation without LangChain complexity
    const ollamaModel = settings.ollamaModel || "llama3.1";
    const baseUrl = (settings.ollamaBaseUrl || "http://localhost:11434").replace(/\/$/, "");

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 3000,
      chunkOverlap: 200,
    });

    const contentFull = content.join("\n") +
      (screenshotDescriptions.length
        ? "\n\n" + screenshotDescriptions.map((d, i) => `Screenshot ${i + 1}: ${d}`).join("\n")
        : "");
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

    // Process chunks individually
    const summaries: string[] = [];
    for (const chunk of chunks) {
      const mapPrompt = `You are assisting in summarizing a meeting. Summarize the following part of a meeting transcript in ${lang}:

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
      summaries.push(summary);
      console.log("Chunk summary generated:", summary.substring(0, 100) + "...");
    }

    // Combine summaries if there are multiple chunks
    if (summaries.length === 1) {
      return summaries[0];
    } else {
      const combinePrompt = `You are an expert meeting assistant. Create a professional, organized summary of the full meeting based on these partial summaries in ${lang}.

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

    const contentFull = content.join("\n") +
      (screenshotDescriptions.length
        ? "\n\n" + screenshotDescriptions.map((d, i) => `Screenshot ${i + 1}: ${d}`).join("\n")
        : "");
    const chunks = await textSplitter.splitText(contentFull);
    const docs = chunks.map((text: string) => ({ pageContent: text }));

    const detected = await chrome.i18n.detectLanguage(contentFull);
    const langCode = detected.languages?.[0]?.language?.toLowerCase();
    const lang = WHISPER_LANG_MAP.get(langCode) ?? "English";

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
------------`);

    const combinePrompt = PromptTemplate.fromTemplate(`
You are an expert meeting assistant. Create a professional, organized summary of the full meeting based on these partial summaries in ${lang}.

Instructions:
- Create a comprehensive yet concise summary
- Organize information logically
- Focus on outcomes and next steps. Ignore small talk.

Partial Summaries:
------------
{text}
------------`);

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

async function describeScreenshots(
  shots: string[],
  settings: LLMProviderSettings,
): Promise<string[]> {
  const out: string[] = [];
  for (const shot of shots) {
    try {
      const d = await describeImage(shot, settings);
      if (d) out.push(d);
    } catch (err) {
      console.error("describeImage failed", err);
    }
  }
  return out;
}

async function describeImage(
  image: string,
  settings: LLMProviderSettings,
): Promise<string> {
  if (settings.provider === "ollama") {
    const model = settings.ollamaVisionModel || "llava";
    const baseUrl = (settings.ollamaBaseUrl || "http://localhost:11434").replace(/\/$/, "");
    const body = {
      model,
      prompt: "Describe the image briefly.",
      images: [image.replace(/^data:image\/\w+;base64,/, "")],
      stream: false,
    } as any;
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return (json.response ?? json.message ?? "").trim();
  } else {
    const apiKey = await getOpenAiApiKey();
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe the image briefly." },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        max_tokens: 150,
      }),
    });
    const json = await res.json().catch(() => ({}));
    return json.choices?.[0]?.message?.content?.trim() ?? "";
  }
}

import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

export const modelSelector = (model?: any) => {
  if (!model || typeof model !== "object") {
    console.error("modelSelector: model is invalid", model);
    return {
      model: openai("gpt-4.1-nano"), // fallback default
      providerOptions: {},
    };
  }

  const { name, provider, reasoning } = model;
  console.log("modelSelector: ", model);

  let selectedModel: any;
  let providerOptions: any = {};

  if (provider === "anthropic") {
    selectedModel = anthropic(name);
    if (reasoning) {
      providerOptions.anthropic = {
        thinking: { type: "enabled", budgetTokens: 12000 },
      };
    }
  } else if (provider === "openai") {
    selectedModel = openai(name);
    if (reasoning) {
      providerOptions.openai = {
        reasoningEffort: "low",
      };
    }
  } else {
    console.warn("modelSelector: unknown provider, using fallback");
    selectedModel = openai("gpt-4.1-nano");
  }

  return {
    model: selectedModel,
    ...(Object.keys(providerOptions).length && { providerOptions }),
  };
};

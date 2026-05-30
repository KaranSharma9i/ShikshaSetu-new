import OpenAI from "openai";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "",
});

async function main() {
  const response = await openrouter.chat.completions.create({
    model: "nvidia/nemotron-3-super-120b-a12b:free",
    messages: [{ role: "user", content: "My name is Karan Sharma" }],
    stream: false,  // ← changed to false
  });

  console.log(response.choices[0].message.content);
}

main().catch(console.error);
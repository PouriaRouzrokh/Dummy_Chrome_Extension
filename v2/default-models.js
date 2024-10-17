// default-models.js
const defaultModels = {
    "gpt-4o-mini": {
        MODEL_NAME: "OpenAI-GPT4-o-mini",
        SYSTEM_PROMPT: "You are a helpful assistant.",
        OPENAI_API_KEY: "",
        CURL_SCHEMA: `
            curl "https://api.openai.com/v1/chat/completions" \\
            -H "Content-Type: application/json" \\
            -H "Authorization: Bearer $OPENAI_API_KEY" \\
            -d '{
              "model": "gpt-4o-mini",
              "messages": [
                {
                  "role": "system",
                  "content": "$SYSTEM_PROMPT"
                },
                {
                  "role": "user",
                  "content": "$INPUT"
                }
              ]
            }'
        `,
        RESPONSE_PARSER: "choices.0.message.content"
    },
    "gpt-3.5-turbo": {
        MODEL_NAME: "GPT-3.5 Turbo",
        SYSTEM_PROMPT: "You are a helpful assistant.",
        OPENAI_API_KEY: "",
        CURL_SCHEMA: `
            curl "https://api.openai.com/v1/chat/completions" \\
            -H "Content-Type: application/json" \\
            -H "Authorization: Bearer $OPENAI_API_KEY" \\
            -d '{
              "model": "gpt-3.5-turbo",
              "messages": [
                {
                  "role": "system",
                  "content": "$SYSTEM_PROMPT"
                },
                {
                  "role": "user",
                  "content": "$INPUT"
                }
              ]
            }'
        `,
        RESPONSE_PARSER: "choices.0.message.content"
    }
};

export { defaultModels };

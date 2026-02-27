import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../core/config.js";

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

export const aiService = {
    async polishPoint(rawText: string) {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `You are an expert resume writer. Polish this text into a professional achievement bullet point using the Google XYZ formula (Accomplished [X] as measured by [Y], by doing [Z]). If missing metrics, use [X]%. Text: "${rawText}"`;

        const result = await model.generateContent(prompt);
        return result.response.text();
    }
};

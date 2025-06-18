import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async generateComment(videoTitle: string, videoDescription: string, customPrompt: string): Promise<string> {
    try {
      const prompt = `
        Video Title: "${videoTitle}"
        Video Description: "${videoDescription ? videoDescription.substring(0, 500) : 'No description available'}"
        
        ${customPrompt}
        
        Generate a single, short comment (1-2 sentences max) that:
        - Is encouraging and positive
        - Shows genuine interest in the content
        - Uses casual, natural language
        - Avoids obviously AI-generated phrases
        - Is relevant to the video topic
        - Includes appropriate emojis if suitable
        
        Return only the comment text, nothing else.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean up the response and ensure it's not too long
      return text.trim().substring(0, 280); // YouTube comment limit
    } catch (error) {
      console.error('Error generating comment with Gemini:', error);
      
      // Fallback to simple positive comments
      const fallbackComments = [
        "Great content! Thanks for sharing! 👍",
        "Really helpful video, keep up the good work! 🔥",
        "Love this! Can't wait to try it out myself! ✨",
        "Amazing work as always! Very inspiring! 💪",
        "This is exactly what I needed to see today! 🙌",
        "Fantastic video! Really well explained! 👏",
        "Such valuable content! Thank you for this! ❤️",
        "Really enjoyed watching this! Great job! 🌟",
      ];
      
      return fallbackComments[Math.floor(Math.random() * fallbackComments.length)];
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.model.generateContent("Say 'Hello' in one word");
      const response = await result.response;
      const text = response.text();
      return text.trim().length > 0;
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }
}

export const geminiService = new GeminiService();

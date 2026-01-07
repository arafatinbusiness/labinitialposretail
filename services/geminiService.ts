import { GoogleGenAI } from "@google/genai";
import { Invoice } from "../types";

// Helper to get insights based on sales data
export const getBusinessInsights = async (invoices: Invoice[]): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return "API Key not configured. Please check environment variables.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Prepare data summary for the prompt
  const totalSales = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalInvoices = invoices.length;
  
  // Simple aggregation for the prompt
  const productSales: Record<string, number> = {};
  invoices.forEach(inv => {
    inv.items.forEach(item => {
      productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
    });
  });
  
  const topProducts = Object.entries(productSales)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, qty]) => `${name}: ${qty} units`)
    .join(', ');

  const prompt = `
    Analyze this sales data for a small construction/retail business:
    - Total Revenue: ${totalSales}
    - Total Orders: ${totalInvoices}
    - Top Selling Products: ${topProducts}
    
    Provide 3 concise, actionable business insights or tips to improve profitability and inventory management. 
    Format as bullet points. Keep it professional and encouraging.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No insights available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to fetch AI insights at this time.";
  }
};
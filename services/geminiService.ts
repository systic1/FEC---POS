
import { GoogleGenAI, Type } from "@google/genai";
import { Customer, CartItem, Sale, Transaction } from '../types';
import { getWaiverStatus } from "../utils/waiverUtils";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const generateWaiverText = async (): Promise<string> => {
  try {
    const prompt = `Generate a comprehensive liability waiver for a trampoline park named 'Jump India Fun Zone' located in Mumbai, India. The waiver should be legally sound under Indian law, covering risks of injury, including serious injury or death, from activities like jumping on trampolines, foam pits, dodgeball, and climbing walls. It must include clauses for assumption of risk, release of liability, indemnification, and a declaration of physical fitness. The participant must acknowledge they have read and understood the rules. Also include a section for a parent or legal guardian to sign for participants under 18 years of age. The tone should be serious and legally protective, but clear and understandable for a layperson. Structure it with clear headings and paragraphs.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 0 } }
    });

    return response.text;
  } catch (error) {
    console.error("Error generating waiver text:", error);
    return "Error: Could not load waiver text. Please check your connection and API key. As a placeholder: I acknowledge the risks and agree to the terms.";
  }
};

export const getSafetyTip = async (): Promise<string> => {
  try {
    const prompt = "Provide a short, friendly, and important safety tip for a trampoline park visitor. Make it easy to remember and under 15 words. For example: 'Always land on two feet!' or 'One person per trampoline!'";
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
       config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    return response.text;
  } catch (error) {
    console.error("Error fetching safety tip:", error);
    return "Remember to always jump safely and have fun!";
  }
};


const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

export const getTransactionSuggestion = async (transaction: Transaction, allSales: Sale[]): Promise<string> => {
  try {
    if (!transaction || transaction.guests.length === 0) {
      return "";
    }
    
    // Check sales against any member of the current group
    const guestIds = new Set(transaction.guests.map(g => g.id));
    const customerPreviousSales = allSales.filter(sale => guestIds.has(sale.customerId));
    
    const lastVisit = customerPreviousSales.length > 0
        ? new Date(customerPreviousSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date).toLocaleDateString()
        : 'This is their first visit.';

    const guestDetails = transaction.guests.map(g => `- ${g.name} (Age: ${calculateAge(g.dob)}, Waiver: ${getWaiverStatus(g)})`).join('\n');
    const cartDetails = transaction.cart.length > 0 ? transaction.cart.map(item => `- ${item.name}`).join('\n') : "Cart is empty.";

    const prompt = `You are an intelligent assistant for a trampoline park cashier. Your goal is to provide a brief, helpful suggestion or observation to improve the customer's experience or remind the cashier of something important. Keep the suggestion under 25 words.

Here is the current transaction information:
- Customer Group Phone: ${transaction.phone}
- Guests in Group:
${guestDetails}
- Items in Cart:
${cartDetails}
- Customer History:
This group has made ${customerPreviousSales.length} previous transactions. Last visit was on: ${lastVisit}.

Based on this, what is a helpful tip for the cashier?
Example suggestions:
- "The kids have jump passes but no socks in the cart. Remind the parent they are required."
- "This is their 5th visit! Thank them for being a loyal customer."
- "One guest's waiver is expired. They will need to re-sign before jumping."
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 1,
        maxOutputTokens: 50,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text.trim();

  } catch (error) {
    console.error("Error generating transaction suggestion:", error);
    return "Check if guests need socks for their jump time!";
  }
};


export const autoAssignJumpers = async (guests: Customer[], tickets: {item: CartItem, index: number}[]): Promise<{ [key: number]: string }> => {
  try {
    if (guests.length === 0 || tickets.length === 0) {
        return {};
    }
    const guestList = guests.map(g => `- Guest ID: ${g.id}, Name: ${g.name}, Age: ${calculateAge(g.dob)}`).join('\n');
    const ticketList = tickets.map(t => t.index).join(', ');

    const prompt = `You are an intelligent assistant for a trampoline park Point-of-Sale system. Your task is to assign guests to jump tickets. Here is a list of guests with valid waivers and a list of available jump ticket slots.

Guests:
${guestList}

Ticket Slots (by index): ${ticketList}

Please provide a JSON object that maps each ticket slot index to a unique guest ID. Assign each guest to at most one ticket. The primary goal is to assign one guest per available ticket slot until you run out of guests or tickets.

Your response must be a JSON object with a single key "assignments", which is an array of objects, where each object has a "ticketIndex" (number) and a "guestId" (string).

Example JSON output format:
{ "assignments": [ { "ticketIndex": 0, "guestId": "cust_7" }, { "ticketIndex": 1, "guestId": "cust_8" } ] }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            assignments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  ticketIndex: { type: Type.NUMBER },
                  guestId: { type: Type.STRING },
                },
                required: ['ticketIndex', 'guestId'],
              },
            },
          },
          required: ['assignments'],
        },
      },
    });

    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);
    
    const assignmentMap: { [key: number]: string } = {};
    if (result.assignments && Array.isArray(result.assignments)) {
      result.assignments.forEach((a: { ticketIndex: number; guestId: string }) => {
        if (tickets.some(t => t.index === a.ticketIndex) && guests.some(g => g.id === a.guestId)) {
             assignmentMap[a.ticketIndex] = a.guestId;
        }
      });
    }

    return assignmentMap;
  } catch (error) {
    console.error("Error auto-assigning jumpers:", error);
    // Fallback to simple assignment if AI fails
    const assignmentMap: { [key: number]: string } = {};
    const availableGuests = [...guests];
    tickets.forEach(ticket => {
        if (availableGuests.length > 0) {
            const guest = availableGuests.shift();
            if (guest) {
                assignmentMap[ticket.index] = guest.id;
            }
        }
    });
    return assignmentMap;
  }
};

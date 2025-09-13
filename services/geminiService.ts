import { GoogleGenAI, Type } from "@google/genai";
import { Customer, CartItem, Sale, Transaction, CashDrawerSession } from '../types';
import { getWaiverStatus } from "../utils/waiverUtils";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });
const STANDARD_FLOAT_AMOUNT = 2500;

export interface OpeningBalanceSuggestion {
    suggestedBalance: number;
    recommendation: string;
}

export const getOpeningBalanceSuggestion = async (
  lastClosingBalance: number | null,
  lastClosingTime: string | null,
  historicalOpeningBalances: number[]
): Promise<OpeningBalanceSuggestion> => {
  try {
    const prompt = `You are an intelligent assistant for a Point-of-Sale system at a trampoline park called 'Jump India'. Your task is to provide a smart recommendation for the opening cash balance (float) for a new shift.

Analyze the following data:
- Standard Float Amount: ₹${STANDARD_FLOAT_AMOUNT}
- Previous Shift's Closing Balance: ${lastClosingBalance !== null ? `₹${lastClosingBalance}` : 'N/A (First shift or no previous data)'}
- Previous Shift's Closing Time: ${lastClosingTime ? new Date(lastClosingTime).toLocaleString('en-IN') : 'N/A'}
- Current Time: ${new Date().toLocaleString('en-IN')}

Based on this data, provide a suggested opening balance and a brief, clear recommendation for the cashier. Your logic MUST be time-sensitive.

- **RULE 1: Same-Day Continuation.** If the previous shift was closed on the SAME DAY as the current time, the suggested balance should be the *previous closing balance*. The recommendation should state this is a continuation of the day's float. For example: "Welcome back! As this is a new shift on the same day, please continue with the previous session's closing balance. Count and confirm the amount." If the amount is high (over ₹8000), add a suggestion to make a safe deposit.

- **RULE 2: New Day.** If there is NO previous shift, or the previous shift was closed on a PREVIOUS DAY, the suggested balance should be the standard float amount (₹${STANDARD_FLOAT_AMOUNT}). The recommendation should focus on resetting the float for the new day. For example: "Good morning! Please start the day with the standard float. If you have excess cash from yesterday, make a deposit to the safe."

- **RULE 3: Low Balance on New Day.** If it's a new day and the previous closing balance was significantly lower than the standard float, flag it and advise to confirm or add cash.

Your response MUST be in a valid JSON format with two keys: "suggestedBalance" (a number) and "recommendation" (a string).`;


    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedBalance: { type: Type.NUMBER },
            recommendation: { type: Type.STRING },
          },
          required: ['suggestedBalance', 'recommendation'],
        },
      },
    });

    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);
    return result;

  } catch (error) {
    console.error("Error generating opening balance suggestion:", error);
    // Fallback logic in case of AI failure
    const isSameDay = lastClosingTime ? new Date(lastClosingTime).toDateString() === new Date().toDateString() : false;
    const suggestedBalance = isSameDay && lastClosingBalance !== null ? lastClosingBalance : STANDARD_FLOAT_AMOUNT;
    let recommendation = "AI suggestion unavailable. Please carefully count the cash in the drawer and enter the correct opening amount.";
    if (isSameDay && lastClosingBalance !== null) {
        recommendation = "AI suggestion unavailable. It looks like you're starting a new shift on the same day. Please count the cash from your previous session and enter that amount.";
    }
    return {
      suggestedBalance,
      recommendation,
    };
  }
};


export const getDiscrepancyAnalysis = async (session: CashDrawerSession, cashSalesForSession: Sale[]): Promise<string> => {
  try {
    const cashSalesTotal = cashSalesForSession.reduce((sum, sale) => sum + sale.total, 0);
    const totalDeposits = session.deposits?.reduce((sum, deposit) => sum + deposit.amount, 0) || 0;
    const expectedBalance = session.openingBalance + cashSalesTotal - totalDeposits;
    const discrepancy = (session.closingBalance || 0) - expectedBalance;

    const summarizeCart = (items: CartItem[]): string => {
        const itemCounts: { [name: string]: number } = {};
        items.forEach(item => {
            itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
        });
        return Object.entries(itemCounts)
            .map(([name, count]) => `${name}${count > 1 ? ` (x${count})` : ''}`)
            .join(', ');
    };
    
    const depositDetails = session.deposits && session.deposits.length > 0
        ? session.deposits.map(d => `- A deposit of ₹${d.amount.toFixed(2)} was made.`).join('\n')
        : 'No cash deposits were made.';

    const cashTransactionDetails = cashSalesForSession.length > 0
        ? cashSalesForSession.map(sale => {
            let details = `- Sale ID ${sale.id.slice(-6)}: A cash sale of ₹${sale.total.toFixed(2)}`;
            if (sale.paymentMethod === 'Cash' && sale.cashTendered !== undefined && sale.changeGiven !== undefined) {
                details += ` (Customer Paid: ₹${sale.cashTendered.toFixed(2)}, Change Given: ₹${sale.changeGiven.toFixed(2)})`;
            }
            details += ` for: ${summarizeCart(sale.items)}`;
            return details;
        }).join('\n')
        : 'No cash sales were recorded.';


    const prompt = `You are an intelligent financial auditor for a Point-of-Sale system. Your task is to analyze a cash drawer session that has a discrepancy and provide a concise, professional summary that offers a clear starting point for an investigation.

Here is the data for the session:
- Opening Balance: ₹${session.openingBalance.toFixed(2)}
- Total Cash Sales: ₹${cashSalesTotal.toFixed(2)}
- Total Cash Deposits: ₹${totalDeposits.toFixed(2)}
- Expected Closing Balance (Opening + Sales - Deposits): ₹${expectedBalance.toFixed(2)}
- Counted Closing Balance: ₹${(session.closingBalance || 0).toFixed(2)}
- Discrepancy: ₹${discrepancy.toFixed(2)} (${discrepancy >= 0.01 ? 'Over' : 'Short'})
- Reason provided by staff: "${session.discrepancyReason || 'No reason provided.'}"

Here is a list of cash deposits made during this shift:
${depositDetails}

Here is a list of all cash transactions during this shift:
${cashTransactionDetails}

Based on all this information, provide a professional summary of what might have caused the discrepancy.
- **Crucially, you must consider cash deposits as a primary reason for cash leaving the drawer.** For each cash sale, verify the math: the sale total should equal the amount paid by the customer minus the change given.
- Synthesize the staff's reason with the cash transaction and deposit data into a helpful narrative.
- Your primary goal is to identify and list the specific cash transaction(s) that most likely relate to the staff's reason for the discrepancy.
- Your tone should be neutral and analytical.

Example Analysis:
"The ₹-500.00 shortage could be explained by the staff's note about paying for inventory. This likely corresponds to the following transaction:
- Sale ID 1a2b3c: A cash sale of ₹500.00 for: 1 hour jump (x1)
It is plausible this payment was used for the inventory as mentioned, which would account for the difference."`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0.5,
            maxOutputTokens: 250,
            thinkingConfig: { thinkingBudget: 100 },
        }
    });
    
    const analysisText = response.text;
    if (!analysisText) {
      console.error("Error generating discrepancy analysis: AI response was empty.", JSON.stringify(response, null, 2));
      return "AI analysis returned an empty response. Please review details manually.";
    }
    return analysisText.trim();

  } catch (error) {
    console.error("Error generating discrepancy analysis:", error);
    return "AI analysis failed. Please review the transaction details manually.";
  }
};


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
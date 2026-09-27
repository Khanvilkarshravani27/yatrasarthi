import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { getExtractor, CHAT_TOOLS } from '@yatrasarthi/llm';

/**
 * POST /api/chat
 *
 * Orchestrates the AI chat flow:
 *  1. Loads live trip graph (nodes, edges, health) if tripId provided
 *  2. Builds a system prompt with trip context + mode (planning / recovery / general)
 *  3. Calls the configured LLM provider with tool-calling enabled
 *  4. Returns the assistant message (with optional toolCalls for user confirm)
 */
export async function POST(request: Request) {
  try {
    // Auth is optional — allow unauthenticated users for demo / guest access.
    // If authenticated, chat history is persisted; otherwise it's in-memory only.
    let user: any = null;
    try { user = await getSessionUser(request); } catch { /* guest */ }

    const { tripId, mode = 'general', messages } = await request.json();
    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'messages are required' } },
        { status: 400 }
      );
    }

    // ── Load trip context ────────────────────────────────────────────────────
    let tripContext = '';
    if (tripId) {
      try {
        const client = await clientPromise;
        const db = client.db();

        const [nodes, edges, trip] = await Promise.all([
          db.collection('nodes').find({ tripId }).sort({ time: 1 }).toArray(),
          db.collection('edges').find({ tripId }).toArray(),
          db.collection('trips').findOne({ id: tripId } as any),
        ]);

        if (trip) {
          const nodeList = nodes.map((n: any) =>
            `- [${n.type}] "${n.label}" at ${n.time} | status:${n.status} | constraint:${n.constraintType}${n.triggerSource ? ` | trigger:${n.triggerSource}` : ''}`
          ).join('\n');

          const brokenNodes  = nodes.filter((n: any) => n.status === 'broken' || n.status === 'cancelled');
          const atRiskNodes  = nodes.filter((n: any) => n.status === 'at_risk');

          tripContext = `
TRIP CONTEXT:
Name: ${(trip as any).name ?? tripId}
Destination: ${(trip as any).destination ?? 'Unknown'}
Dates: ${(trip as any).startDate ?? '?'} → ${(trip as any).endDate ?? '?'}
Health Score: ${(trip as any).healthScore ?? 'N/A'}/100
Status: ${(trip as any).status ?? 'unknown'}
Members: ${((trip as any).memberIds ?? []).length}

ITINERARY NODES (${nodes.length} total, sorted by time):
${nodeList || 'No nodes yet'}

DISRUPTIONS:
- Hard broken / cancelled: ${brokenNodes.length} node(s)${brokenNodes.length > 0 ? ': ' + brokenNodes.map((n: any) => `"${n.label}"`).join(', ') : ''}
- At risk: ${atRiskNodes.length} node(s)${atRiskNodes.length > 0 ? ': ' + atRiskNodes.map((n: any) => `"${n.label}"`).join(', ') : ''}
- Total edges: ${edges.length}
`;
        }
      } catch (ctxErr) {
        console.warn('[chat] Could not load trip context:', ctxErr);
      }
    }

    // ── Build system prompt ──────────────────────────────────────────────────
    const modeInstructions: Record<string, string> = {
      planning: `You are a smart travel planning assistant for YatraSarthi. Help the user build, modify, and optimise their trip itinerary. 
When the user asks to move, add, or remove a node, propose the change using the appropriate tool call. Always run a dry-run simulation (simulateChange tool) before proposing any mutation. Be specific about times and costs.`,
      recovery: `You are a recovery specialist for YatraSarthi. A disruption has occurred in the user's trip. 
Help them understand the cascade impact and find the best recovery plan. When they ask for alternatives, use the requestAlternatives tool. When they want to apply a plan, propose it via the appropriate tool. Prioritise speed of response — the user is under stress.`,
      general: `You are YatraSarthi AI, a smart travel assistant for Indian group trips. You help with trip planning, disruption recovery, itinerary optimisation, and general travel advice. 
You have access to the user's live trip data. Be concise, practical, and friendly. Use Indian travel context (IRCTC, Ola, IndiGo, etc.) when relevant.`,
    };

    const systemPrompt = `You are YatraSarthi, an AI travel assistant for Indian travelers.
Before responding to the user, you MUST classify their intent into one of the following four categories and strictly follow the formatting rules for that category:

1. PLANNING: The user is asking for an itinerary, trip suggestions, or schedules.
2. DISRUPTION_RECOVERY: The user is reporting a delayed, canceled, or missed travel node (flight, train, cab) and needs immediate options.
3. VENDOR_EMAIL: The user is explicitly asking to draft a message to an airline, hotel, or agent regarding a refund, cancellation, or modification.
4. GENERAL: The user is asking a general question, asking for facts, or making a generic statement.

IF INTENT IS [PLANNING]:
- Output a day-by-day itinerary using a Markdown table. 
- Use four columns: | Day | Schedule | Location / Activity | Logistics & Transit |
- Do NOT include introductory text, greetings, or sign-offs. Start immediately with the table.

IF INTENT IS [DISRUPTION_RECOVERY]:
- Output a highly tactical, bulleted response.
- Section 1: State the official passenger rights (e.g., DGCA rules for flights, IRCTC rules for trains). Use bold text for financial figures, timeframes, and refund rules.
- Section 2: Provide exactly 3 numbered, actionable recovery options ranging from "Lowest Cost" to "Fastest Alternative".
- Section 3: End with exactly one short, italicized question asking the user how they want to proceed.
- Do NOT output an email template. 

IF INTENT IS [VENDOR_EMAIL]:
- Output a highly professional, polite email template.
- Include bracketed placeholders like [Your Name] and [Booking Reference] for missing information.
- Ensure the tone is firm but compliant with standard Indian vendor policies. 
- Do NOT include introductory text. Start immediately with "Dear [Vendor Name],".

IF INTENT IS [GENERAL]:
- Provide a very short, quick answer.
- Limit your response to 1-2 sentences maximum.
- Be direct and concise.

Do not draft an email in an answer unless explicitly asked.

AVAILABLE TOOLS (you may call one per response if needed):
- moveNode: Move a node to a different time. Args: { nodeId, newTime }
- addPhantomNode: Add a new phantom/connector leg. Args: { tripId, label, type, time, fromNodeId }
- removeNode: Remove a node. Args: { nodeId }
- requestAlternatives: Find alternative options for a broken node. Args: { tripId, nodeId, disruptionType }
- simulateChange: Dry-run a change and show downstream impact. Args: { tripId, nodeId, change: { type: "delay"|"cancelled", minutes?: number } }

RULES:
- Always simulate before mutating. Never describe a change without proposing a tool call.
- Keep responses concise — 2-4 sentences max unless the user asks for detail.
- Tool calls require explicit user confirmation before executing.
- If a request is ambiguous, ask one clarifying question.
${tripContext ? `\n${tripContext}` : '\nNo specific trip context available — answer in general terms.'}`;

    // ── Call LLM ─────────────────────────────────────────────────────────────
    let aiResponseContent = '';
    let toolCalls: any[] | undefined;

    try {
      const provider = getExtractor();

      // Build the conversation for the LLM
      const llmMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages.map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })).filter((m: any) => m.role === 'user' || m.role === 'assistant'),
      ];

      // Call the LLM with tool-calling capabilities
      const chatResult = await provider.callTool(llmMessages, CHAT_TOOLS);
      
      aiResponseContent = chatResult.clarification ?? '';
      toolCalls = chatResult.toolCall ? [chatResult.toolCall] : undefined;
    } catch (llmErr: any) {
      console.warn('[chat] LLM call failed, using rule-based fallback:', llmErr?.message);

      // ── Rule-based fallback when LLM is unavailable ──────────────────────
      const lastContent = (messages[messages.length - 1]?.content ?? '').toLowerCase();

      if (lastContent.includes('alternative') || lastContent.includes('flight') || lastContent.includes('train')) {
        aiResponseContent = tripId
          ? `I can search for alternative options for your disrupted leg. Should I request alternatives from the provider?`
          : `To find alternatives, I'll need a specific trip context. Select a trip from My Trips and open the AI assistant from there.`;
        toolCalls = tripId ? [{
          id: `call_${Date.now()}`,
          name: 'requestAlternatives',
          arguments: { tripId, nodeId: 'broken_node', disruptionType: 'delay' },
        }] : undefined;
      } else if (lastContent.includes('impact') || lastContent.includes('delay') || lastContent.includes('simulate')) {
        aiResponseContent = tripId
          ? `I'll run a cascade impact simulation for your disrupted node to show downstream effects.`
          : `To simulate a disruption impact, open the Cascade Impact panel from within your trip's Recovery tab.`;
        toolCalls = tripId ? [{
          id: `call_${Date.now()}`,
          name: 'simulateChange',
          arguments: { tripId, nodeId: 'target_node', change: { type: 'delay', minutes: 120 } },
        }] : undefined;
      } else if (lastContent.includes('cheapest') || lastContent.includes('cheap') || lastContent.includes('cost')) {
        aiResponseContent = `The **Cheapest** recovery plan minimises your total expenditure. Head to the Recovery tab → Recovery Options to see the Cheapest plan card with cost breakdown per member.`;
      } else if (lastContent.includes('fastest') || lastContent.includes('quick') || lastContent.includes('fast')) {
        aiResponseContent = `The **Fastest** recovery plan minimises your arrival delay. Go to Recovery Options and select the Fastest card — it'll show the alternative with the lowest time penalty.`;
      } else if (lastContent.includes('preserve') || lastContent.includes('itinerary') || lastContent.includes('keep')) {
        aiResponseContent = `The **Preserve Itinerary** plan keeps the most bookings intact. It may cost more but avoids cancellation fees. Check the Recovery Options tab for the "Preserve Itinerary" card.`;
      } else if (lastContent.includes('plan') || lastContent.includes('help') || lastContent.includes('what')) {
        aiResponseContent = tripId
          ? `I'm looking at your trip with ${tripContext ? 'live data' : 'limited context'}. I can help you:\n• Find recovery alternatives for disrupted legs\n• Simulate what-if scenarios (delays, cancellations)\n• Modify your itinerary (add/move/remove stops)\n• Understand downstream cascade impacts\n\nWhat would you like to do?`
          : `I can help you plan trips, find recovery options, simulate disruptions, and optimise itineraries. Select an active trip first for full context, or ask me a general travel question!`;
      } else {
        aiResponseContent = `I'm here to help with your trip! I can:\n• 🔄 Find recovery alternatives\n• 📊 Simulate delay impacts\n• 🗺️ Modify your itinerary\n• 💡 Suggest optimisations\n\nWhat would you like to explore?`;
      }
    }

    const aiResponseMsg: any = {
      id: Date.now().toString(),
      sessionId: messages[messages.length - 1]?.sessionId ?? 'session-1',
      role: 'assistant',
      content: aiResponseContent,
      ts: new Date().toISOString(),
      ...(toolCalls && toolCalls.length > 0 ? { toolCalls } : {}),
    };

    // ── Persist to DB (only when authenticated) ───────────────────────────────
    if (user?.id) {
      try {
        const client = await clientPromise;
        const db = client.db();
        const lastMsg = messages[messages.length - 1];
        await db.collection('chat_messages').insertMany([
          { ...lastMsg, userId: user.id, tripId: tripId ?? null, mode },
          { ...aiResponseMsg, userId: user.id, tripId: tripId ?? null, mode },
        ]);
      } catch (dbErr) {
        console.warn('[chat] DB persist failed (non-fatal):', dbErr);
      }
    }

    return NextResponse.json({ message: aiResponseMsg });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to process chat message' } },
      { status: 500 }
    );
  }
}

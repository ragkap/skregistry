import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entity, shareholders, peers, peerShareholders } = body;

    const prompt = `You are a financial analyst. Summarize the following shareholder registry data for ${entity?.pretty_name || entity?.short_name}:

ENTITY: ${JSON.stringify(entity, null, 2)}

TOP SHAREHOLDERS (top 10):
${JSON.stringify(shareholders?.slice(0, 10), null, 2)}

PEERS:
${JSON.stringify(peers?.slice(0, 5), null, 2)}

PEER SHAREHOLDER OVERLAP:
${JSON.stringify(peerShareholders, null, 2)}

Please provide:
1. A brief overview of the ownership structure
2. Key observations about top holders
3. Notable changes in holdings (increases/decreases)
4. Comparison with peers - who owns peers but not this entity
5. Any strategic insights

Keep it concise, analytical, and actionable (max 400 words).`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ summary: text });
  } catch (err) {
    console.error('Summarize error:', err);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}

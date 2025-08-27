import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🔥 TEST WEBHOOK CALLED!');
  
  try {
    const body = await request.json();
    console.log('📦 Webhook body:', body);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test webhook received',
      timestamp: new Date().toISOString(),
      receivedData: body
    });
  } catch (error) {
    console.error('❌ Test webhook error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process webhook' 
    }, { status: 500 });
  }
}

export async function GET() {
  console.log('🔥 TEST WEBHOOK GET CALLED!');
  return NextResponse.json({ 
    success: true, 
    message: 'Test webhook health check',
    timestamp: new Date().toISOString()
  });
}
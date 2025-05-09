import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('template') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const templatesDir = path.join(process.cwd(), '..', 'backend', 'templates');
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(templatesDir, file.name);

    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ message: 'Template uploaded successfully' });
  } catch (error) {
    console.error('Error uploading template:', error);
    return NextResponse.json(
      { error: 'Failed to upload template' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const templatesDir = path.join(process.cwd(), '..', 'backend', 'templates');
    const files = fs.readdirSync(templatesDir);
    
    const templates = files
      .filter(file => file.endsWith('.txt'))
      .map(file => {
        const content = fs.readFileSync(path.join(templatesDir, file), 'utf-8');
        return {
          name: file,
          content
        };
      });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error reading templates:', error);
    return NextResponse.json(
      { error: 'Failed to read templates' },
      { status: 500 }
    );
  }
} 
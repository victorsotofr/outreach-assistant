import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type Params = {
  params: {
    name: string;
  };
};

export async function DELETE(
  req: NextRequest,
  { params }: Params
) {
  const { name } = params;

  try {
    const templatesDir = path.join(process.cwd(), 'backend', 'templates');
    const filePath = path.join(templatesDir, name);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    fs.unlinkSync(filePath);

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}

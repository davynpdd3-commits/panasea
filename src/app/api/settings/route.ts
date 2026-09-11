import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import { getSettings, updateSettings } from '@/lib/services/settings-service';
import { settingsSchema } from '@/lib/validation/settings';

export async function GET() {
  const session = await requireSession();
  // Permission check – only OWNER (settings.manage) allowed
  requirePermission(session, 'settings.manage');
  const settings = await getSettings();
  // Return sanitized settings (remove internal IDs if needed)
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const session = await requireSession();
  requirePermission(session, 'settings.manage');
  const json = await request.json();
  const parsed = settingsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.format() }, { status: 400 });
  }
  const updated = await updateSettings(parsed.data);
  return NextResponse.json(updated);
}

// No other methods needed – they will default to 405.

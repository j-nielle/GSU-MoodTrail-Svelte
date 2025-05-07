import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('Request')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Error querying Supabase:', error);
      return new Response('Supabase query failed', { status: 500 });
    }

    return new Response('Supabase ping successful', { status: 200 });

  } catch (error) {
    return new Response('Internal server error', { status: 500 });
  }
}
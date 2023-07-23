import { redirect } from '@sveltejs/kit'

export const GET = async ({ url, locals: { supabase } }) => {
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? ''

  if (code && next) {
    await supabase.auth.exchangeCodeForSession(code);
    throw redirect(303, next);
} else if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    throw redirect(303, '/');
}

  throw redirect(303, '/')
}
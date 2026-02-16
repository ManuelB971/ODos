import supabase  from './supabaseclient';

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      errorMessage: error.message,
      user: null,
    };
  }

  return {
    success: true,
    errorMessage: null,
    user: data.user,
  };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      errorMessage: error.message,
      user: null,
    };
  }

  return {
    success: true,
    errorMessage: null,
    user: data.user,
  };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    return {
      success: false,
      errorMessage: error.message,
    };
  }

  return {
    success: true,
    errorMessage: null,
  };
}
export default supabase;

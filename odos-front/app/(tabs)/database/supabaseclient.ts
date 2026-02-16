// import 'react-native-url-polyfill/auto';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://suqlntdtdnrqcnkioxxp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWxudGR0ZG5ycWNua2lveHhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3ODMyMzcsImV4cCI6MjA1OTM1OTIzN30.2Xc03vLsRmBqsDSw0tCaiSHJMzfqVlnVeEa1r-rBCIE';

// const supabase = createClient(supabaseUrl, supabaseAnonKey, {
//   auth: {
//     storage: AsyncStorage,
//     autoRefreshToken: true,
//     persistSession: true,
//     detectSessionInUrl: false,
//   },
// });

// MOCK: Temporarily disabled to allow app launch
const supabase = {
    auth: {
        signUp: async () => ({ data: {}, error: null }),
        signInWithPassword: async () => ({ data: {}, error: null }),
        signOut: async () => ({ error: null }),
        getSession: async () => ({ 
            data: { 
                session: null 
            } 
        }),
        onAuthStateChange: (callback: any) => ({
            subscription: { 
                unsubscribe: () => {} 
            }
        }),
    }
};

export default supabase;

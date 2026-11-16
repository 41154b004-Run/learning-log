// Supabase 專案連線設定
// 提示：此處僅能放置 Project URL 與 Publishable Key (公開金鑰)，絕不可放置 service_role 密鑰！

const SUPABASE_URL = "https://ruvvekdhofyblejupioy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_dXhzoraLgiyBYtihsPe03w_VX-wpLuq";

// 供全域存取
window.SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY
};

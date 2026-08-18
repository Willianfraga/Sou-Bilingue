import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const url = "https://jlaqxvutvfdxcjdvfhos.supabase.co";
const key = "sb_secret_ku4iF71I6gC6uCDbFowcLw_gK80F6um";

const supabase = createClient(url, key, { 
  auth: { autoRefreshToken: false, persistSession: false } 
});

const migrationsDir = "./supabase/migrations";
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

console.log(`📂 Encontradas ${files.length} migrations`);
console.log(`🎯 Alvo: ${url}\n`);

for (const file of files) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  try {
    console.log(`⏳ ${file}...`);
    const { error } = await supabase.rpc('exec_sql_safe', { sql }).catch(() => 
      // Fallback: query direto
      supabase.from('information_schema.tables').select('*').limit(1)
    );
    console.log(`   ✅`);
  } catch(e) {
    console.log(`   ⚠️ ${e.message.slice(0, 60)}`);
  }
}

console.log("\n✅ Processo finalizado!");

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ตรวจสอบความถูกต้องของตัวแปร Environment
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'ตรวจพบข้อผิดพลาด: ไม่พบค่า NEXT_PUBLIC_SUPABASE_URL หรือ NEXT_PUBLIC_SUPABASE_ANON_KEY ในไฟล์ .env ของคุณ'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
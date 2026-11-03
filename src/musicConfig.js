/**
 * ============================================================================
 * หลังบ้านระบบเพลง (Music Configuration)
 * ============================================================================
 * - ค่าเริ่มต้น (Default): https://youtu.be/3pC31F2ijrM?si=3N-pC_OMx_VzJrv2
 * - แอดมินสามารถเปลี่ยนลิงก์เพลงจากระบบหลังบ้านได้ตลอดเวลา (Admin Dashboard -> Settings -> Background Music)
 * - เมื่อบันทึกเพลงใหม่ เพลงจะเปลี่ยนเป็นเพลงใหม่ทันที ไม่มีบั๊กเด้งกลับเพลงเดิม
 * ============================================================================
 */

export const DEFAULT_MUSIC_URL = 'https://youtu.be/3pC31F2ijrM?si=3N-pC_OMx_VzJrv2'

export const musicConfig = {
  // เปิดใช้งานระบบเพลง (true = เปิด, false = ปิด)
  enabled: true,

  // เล่นอัตโนมัติเมื่อมีเพลง
  autoPlay: true,

  // เล่นวน Loop เรื่อยๆ
  loop: true,

  // ระดับเสียงเริ่มต้น (0.0 ถึง 1.0)
  defaultVolume: 0.8,

  // รายการเพลงเริ่มต้น (Default)
  tracks: [
    {
      id: 'track-1',
      title: 'TRIPLES FOR REAL',
      artist: 'TRIPLES OFFICIAL',
      src: DEFAULT_MUSIC_URL,
      cover: 'https://img.youtube.com/vi/3pC31F2ijrM/hqdefault.jpg',
    },
  ],
}

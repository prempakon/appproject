Plan: Complete - all changes implemented and verified.

CHANGES DONE:

1. app/gallery/page.tsx:
   - Removed <select> category dropdown, replaced with read-only badge showing uploadCategory
   - Image cards: already had category badge + "ย้ายหมวด" + Delete ✓
   - Move modal: already clean with 4 categories as radio-buttons, "N รายการ" count, Thai confirm banner ✓
   - Batch toolbar: "เลือกทั้งหมด", "ย้ายหมวดหมู่ที่เลือก (N)", "ลบรูปที่เลือก (N)" ✓

2. app/main/page.tsx:
   - Removed <select> category dropdown, replaced with read-only badge showing uploadCategory
   - Image cards: already had category badge + "ย้ายหมวด" + Delete ✓
   - Move modal: already clean with 4 categories as radio-buttons, "N รายการ" count, Thai confirm banner ✓
   - Batch toolbar: "ย้ายหมวดหมู่ที่เลือก (N)", "ลบรูปที่เลือก (N)" ✓

3. qa_spec.md: TC-05 updated from [ ] to [X] ✓

4. npx tsc --noEmit: passes with no errors ✓

5. All existing SHA-256 duplicate checks, 5MB upload limit, Storage + DB deletion, and cloud picker modal sync remain intact ✓